// ============================================
// Unified Crop Health Detection — Single Entry Point
// /farmer/detect  (disease + pest + uncertain)
// ============================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera, Upload, ArrowRight, ArrowLeft, AlertTriangle, Check,
  Search, Leaf, FileText, Info, ShieldAlert, Clipboard,
  Thermometer, Globe, Sprout, TrendingUp, TrendingDown, Minus,
  Save, Send, Home, RotateCcw, X, CheckCircle, XCircle, Bug, HelpCircle,
  FlaskConical, Eye, BarChart2, Activity,
} from 'lucide-react';
import { Button, RiskBadge, SeverityBadge, ConfidenceBadge, Modal, useToast } from '../../components/ui';
import { getLiveCoordinates } from '../../data/liveWeatherService';
import {
  analyzeImage,
  generateAssessment,
  generateActions,
  saveDetectionReport,
  sendToExpert,
  cropCatalog,
  growthStageOptions,
  getAnalysisStages,
  EXPERT_THRESHOLD,
  buildAIIdentification,
} from '../../data/detectionService';
import {
  calculateCropHealthRiskCached,
  toRiskAssessment,
  type CropHealthRiskResult,
} from '../../data/cropHealthRiskEngine';
import {
  analyzePest,
  getPestAnalysisStages,
  PEST_EXPERT_THRESHOLD,
} from '../../data/pestDetectionService';
import {
  routeProblem,
  getRoutingStage,
  problemTypeLabels,
  problemTypeColor,
} from '../../data/problemRouter';
import type {
  CropDetectionInput,
  DetectionResult,
  ContextualAssessment,
  RecommendedAction,
  RiskLevel,
  AnalysisStage,
  ProblemType,
  PestIdentification,
  AIIdentification,
} from '../../types';
import './DetectPage.css';

// ---------- Constants ----------
const STEPS = ['Crop Info', 'Upload Image', 'AI Analysis', 'Results'];

const riskColorMap: Record<RiskLevel, string> = {
  low: 'var(--color-success)',
  moderate: 'var(--color-warning)',
  high: 'var(--color-danger)',
  critical: '#991b1b',
};

const riskBgMap: Record<RiskLevel, string> = {
  low: '#dcfce7',
  moderate: '#fef9c3',
  high: '#fee2e2',
  critical: '#fecaca',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Problem type options for the farmer's selector
type ProblemHint = 'disease' | 'pest' | 'not-sure';

const problemHints: Array<{ value: ProblemHint; label: string; desc: string; icon: React.ReactNode }> = [
  {
    value: 'disease',
    label: 'Plant / Leaf Problem',
    desc: 'Spots, blight, rust, mold, wilting, yellowing',
    icon: <Leaf size={20} />,
  },
  {
    value: 'pest',
    label: 'Pest / Insect',
    desc: 'Insects, worms, holes in leaves, sticky residue',
    icon: <Bug size={20} />,
  },
  {
    value: 'not-sure',
    label: 'Not Sure',
    desc: 'Let the AI decide what the problem is',
    icon: <HelpCircle size={20} />,
  },
];

// =============================================
// MAIN COMPONENT
// =============================================
export function DetectPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [input, setInput] = useState<CropDetectionInput>({
    cropType: '',
    cropVariety: '',
    growthStage: '',
    location: 'Khanna Block, Ludhiana, Punjab',
    symptomsDescription: '',
    imageFile: null,
    imagePreview: null,
  });
  const [problemHint, setProblemHint] = useState<ProblemHint | ''>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Upload state
  const [dragActive, setDragActive] = useState(false);

  // Auto-detect live farm coordinates
  useEffect(() => {
    getLiveCoordinates().then(loc => {
      if (loc && loc.locality) {
        setInput(prev => ({
          ...prev,
          location: `${loc.locality}, ${loc.state}`,
        }));
      }
    });
  }, []);

  // Analysis state
  const [stages, setStages] = useState<AnalysisStage[]>(getAnalysisStages());
  const [analyzing, setAnalyzing] = useState(false);
  const [routingPhase, setRoutingPhase] = useState<'routing' | 'analyzing' | null>(null);
  const [routedProblemType, setRoutedProblemType] = useState<ProblemType | null>(null);
  const [routerReason, setRouterReason] = useState('');

  // Unified result state — disease path
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [assessment, setAssessment] = useState<ContextualAssessment | null>(null);
  const [actions, setActions] = useState<RecommendedAction | null>(null);
  // Unified result state — pest path
  const [pestResult, setPestResult] = useState<PestIdentification | null>(null);
  // Unified identification (from either path)
  const [unifiedId, setUnifiedId] = useState<AIIdentification | PestIdentification | null>(null);
  // Risk Engine result — single source of truth for BOTH disease and pest risk
  const [riskEngineResult, setRiskEngineResult] = useState<CropHealthRiskResult | null>(null);
  const [riskEngineLoading, setRiskEngineLoading] = useState(false);
  const [riskEngineError, setRiskEngineError] = useState(false);
  // Uncertain path
  const [isUncertain, setIsUncertain] = useState(false);

  // Save/Export state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedReportId, setSavedReportId] = useState('');
  const [sendingToExpert, setSendingToExpert] = useState(false);
  const [sentToExpert, setSentToExpert] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // =============================================
  // HANDLERS
  // =============================================

  const updateField = (field: keyof CropDetectionInput, value: string) => {
    setInput(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // --- Image Handling ---
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormErrors(prev => ({ ...prev, image: 'Please upload an image file (JPG, PNG)' }));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFormErrors(prev => ({ ...prev, image: 'Image must be less than 10MB' }));
      return;
    }
    setFormErrors(prev => { const n = { ...prev }; delete n.image; return n; });
    const reader = new FileReader();
    reader.onloadend = () => {
      setInput(prev => ({ ...prev, imageFile: file, imagePreview: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setInput(prev => ({ ...prev, imageFile: null, imagePreview: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const replaceImage = () => {
    clearImage();
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  // --- Validation ---
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 0) {
      if (!input.cropType) errors.cropType = 'Please select a crop type';
      if (!input.growthStage) errors.growthStage = 'Please select a growth stage';
      if (!input.location.trim()) errors.location = 'Location is required';
    }

    if (step === 1) {
      if (!input.imageFile) errors.image = 'Please upload a crop image';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- Navigation ---
  const nextStep = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 1) {
      setCurrentStep(2);
      startUnifiedAnalysis();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  // =============================================
  // UNIFIED AI PIPELINE
  // =============================================

  const startUnifiedAnalysis = async () => {
    setAnalyzing(true);
    setIsUncertain(false);
    setRoutedProblemType(null);
    setPestResult(null);
    setResult(null);
    setAssessment(null);
    setActions(null);
    setUnifiedId(null);
    setRiskEngineResult(null);
    setRiskEngineError(false);

    try {
      // ── STEP 1: AI Problem Router ──────────────────────────────
      setRoutingPhase('routing');
      setStages([{ ...getRoutingStage(), status: 'running' }]);

      const routerOutput = await routeProblem({
        cropType: input.cropType,
        symptomsDescription: input.symptomsDescription,
        imagePreview: input.imagePreview,
      });

      // Override router with farmer's explicit hint
      let finalProblemType: ProblemType = routerOutput.problemType;
      if (problemHint === 'disease') finalProblemType = 'disease';
      else if (problemHint === 'pest') finalProblemType = 'pest';

      setRoutedProblemType(finalProblemType);
      setRouterReason(routerOutput.reason);
      setStages([{ ...getRoutingStage(), status: 'complete' }]);

      await new Promise(r => setTimeout(r, 400));

      // ── STEP 2: Dispatch to appropriate AI model ───────────────
      setRoutingPhase('analyzing');

      if (finalProblemType === 'uncertain') {
        setIsUncertain(true);
        await new Promise(r => setTimeout(r, 800));
        setAnalyzing(false);
        setCurrentStep(3);
        return;
      }

      let aiPrediction = '';
      let aiSeverity: 'mild' | 'moderate' | 'severe' | 'critical' = 'moderate';
      let aiConfidence = 0;
      let pestCategory: string | undefined;

      if (finalProblemType === 'pest') {
        // ── PEST MODEL ─────────────────────────────────────────
        const pestStages = getPestAnalysisStages();
        setStages(pestStages);
        const pestId = await analyzePest(input, setStages);
        setPestResult(pestId);
        setUnifiedId(pestId);
        aiPrediction = pestId.prediction;
        aiSeverity = pestId.severity as typeof aiSeverity;
        aiConfidence = pestId.confidence;
        pestCategory = pestId.pestCategory;

      } else {
        // ── DISEASE MODEL ───────────────────────────────────────
        const diseaseStages = getAnalysisStages();
        setStages(diseaseStages);
        const detectionResult = await analyzeImage(input, setStages);
        setResult(detectionResult);
        const assessmentResult = generateAssessment(detectionResult);
        setAssessment(assessmentResult);
        const actionsResult = generateActions(detectionResult);
        setActions(actionsResult);
        setUnifiedId(buildAIIdentification(detectionResult));
        aiPrediction = detectionResult.prediction;
        aiSeverity = detectionResult.severity as typeof aiSeverity;
        aiConfidence = detectionResult.confidence;
      }

      // ── STEP 3: Unified Risk Engine ────────────────────────────
      // Risk is computed AFTER AI identification.
      // It does NOT use aiConfidence — it uses context: weather, reports, history, growth stage.
      setRiskEngineLoading(true);
      try {
        const riskResult = await calculateCropHealthRiskCached({
          problemType: finalProblemType,
          prediction: aiPrediction,
          severity: aiSeverity,
          aiConfidence,             // stored for display; NOT used in risk math
          cropType: input.cropType,
          cropVariety: input.cropVariety,
          growthStage: input.growthStage || 'vegetative',
          location: input.location,
          pestCategory,
        });
        setRiskEngineResult(riskResult);
      } catch {
        setRiskEngineError(true);
        // Don't block result display — show AI result with risk fallback
      } finally {
        setRiskEngineLoading(false);
      }

      await new Promise(r => setTimeout(r, 400));
      setAnalyzing(false);
      setCurrentStep(3);
    } catch {
      setAnalyzing(false);
      addToast('Analysis failed. Please try again.', 'error');
      setCurrentStep(1);
    }
  };

  // --- Save (disease only — pest uses same report format) ---
  const handleSave = async () => {
    setSaving(true);
    try {
      let savedResult: DetectionResult;
      const riskLevelToSave = riskEngineResult?.riskLevel ?? assessment?.overallRisk ?? 'moderate';

      if (result) {
        savedResult = { ...result, riskLevel: riskLevelToSave };
      } else if (pestResult) {
        savedResult = {
          id: `PEST-${Date.now()}`,
          cropType: input.cropType,
          cropVariety: input.cropVariety,
          growthStage: input.growthStage || 'vegetative',
          location: input.location,
          prediction: pestResult.prediction,
          scientificName: pestResult.scientificName,
          confidence: pestResult.confidence,
          confidenceLevel: pestResult.confidenceLevel,
          severity: pestResult.severity,
          riskLevel: riskLevelToSave,
          symptoms: pestResult.symptoms,
          description: pestResult.description,
          imagePreview: input.imagePreview || '',
          analyzedAt: pestResult.analyzedAt,
        };
      } else {
        return;
      }

      // Build ContextualAssessment from risk engine result or fall back to legacy assessment
      const legacyAssessment: ContextualAssessment = riskEngineResult
        ? toRiskAssessment(riskEngineResult) as unknown as ContextualAssessment
        : assessment ?? {
            overallRisk: 'moderate' as RiskLevel,
            riskPercentage: 50,
            riskFactors: [],
            weatherContribution: '',
            regionalContext: '',
            growthStageImpact: '',
          };
      const mockAssessment: ContextualAssessment = riskEngineResult
        ? {
            overallRisk: riskEngineResult.riskLevel,
            riskPercentage: riskEngineResult.riskScore,
            riskFactors: riskEngineResult.contributingFactors.map(f => ({
              factor: f.factor,
              impact: f.impact,
              detail: f.detail,
            })),
            weatherContribution: riskEngineResult.weatherSummary,
            regionalContext: riskEngineResult.regionalSummary,
            growthStageImpact: riskEngineResult.growthStageSummary,
          }
        : assessment ?? legacyAssessment;

      const mockActions: RecommendedAction = actions || {
        whatIsHappening: pestResult?.description || '',
        whatToInspect: pestResult?.symptoms.slice(0, 3) || [],
        immediateActions: ['Monitor pest population daily', 'Install pheromone traps', 'Contact your agriculture officer'],
        managementSuggestions: ['Follow IPM guidelines', 'Use approved bio-control agents'],
        expertRecommendation: `AI model identified ${pestResult?.prediction} with ${((pestResult?.confidence || 0) * 100).toFixed(0)}% confidence. Consult your agriculture officer for management advice.`,
      };

      const report = await saveDetectionReport({
        farmerId: 'F001',
        result: savedResult,
        assessment: mockAssessment,
        actions: mockActions,
        status: 'pending',
        sentToExpert: false,
      });
      setSavedReportId(report.id);
      setSaved(true);
      setSaveModalOpen(true);
      addToast('Report saved successfully!', 'success');
    } catch {
      addToast('Failed to save report. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendToExpert = async () => {
    if (!savedReportId && !saved) {
      await handleSave();
    }
    setSendingToExpert(true);
    try {
      const resp = await sendToExpert(savedReportId || `RPT-${Date.now()}`);
      if (resp.success) {
        setSentToExpert(true);
        addToast('Report sent to expert for verification!', 'success');
      }
    } catch {
      addToast('Failed to send to expert. Please try again.', 'error');
    } finally {
      setSendingToExpert(false);
    }
  };

  const startNew = () => {
    setCurrentStep(0);
    setInput({
      cropType: '', cropVariety: '', growthStage: '',
      location: 'Khanna Block, Ludhiana, Punjab',
      symptomsDescription: '', imageFile: null, imagePreview: null,
    });
    setProblemHint('');
    setFormErrors({});
    setResult(null);
    setAssessment(null);
    setActions(null);
    setPestResult(null);
    setUnifiedId(null);
    setRiskEngineResult(null);
    setRiskEngineError(false);
    setRoutedProblemType(null);
    setRouterReason('');
    setIsUncertain(false);
    setSaved(false);
    setSavedReportId('');
    setSentToExpert(false);
    setStages(getAnalysisStages());
    setRoutingPhase(null);
  };

  // Derived values — riskEngineResult is the single source of truth for risk
  const selectedCrop = cropCatalog.find(c => c.name === input.cropType);
  const displayedRiskLevel = riskEngineResult?.riskLevel ?? result?.riskLevel ?? 'moderate';
  const displayedRiskScore  = riskEngineResult?.riskScore ?? assessment?.riskPercentage ?? 50;
  const displayedConfidence = unifiedId?.confidence ?? result?.confidence ?? 0;
  const isPestPath = routedProblemType === 'pest';
  const isLowConfidence = displayedConfidence < (isPestPath ? PEST_EXPERT_THRESHOLD : EXPERT_THRESHOLD);
  const displayedFactors = riskEngineResult?.contributingFactors ?? assessment?.riskFactors ?? [];
  const displayedWeather = riskEngineResult?.weatherSummary ?? assessment?.weatherContribution ?? '';
  const displayedRegional = riskEngineResult?.regionalSummary ?? assessment?.regionalContext ?? '';
  const displayedGrowth   = riskEngineResult?.growthStageSummary ?? assessment?.growthStageImpact ?? '';

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className="detect-page">
      {/* Step Progress */}
      <StepProgress current={currentStep} steps={STEPS} />

      {/* ── STEP 0: Crop Info + Problem Type ──────────────────── */}
      {currentStep === 0 && (
        <div className="detect-card">
          <h2 className="detect-card__title"><Leaf size={22} /> Crop Health Scan</h2>
          <p className="detect-card__subtitle">Tell us about your crop and what you're seeing. This helps route to the right AI model.</p>

          <div className="detect-form">
            {/* Problem Type Selector */}
            <div className="form-group">
              <label className="form-group__label">What kind of problem are you seeing? <span style={{ fontWeight: 400, color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)' }}>(optional — AI will decide if unsure)</span></label>
              <div className="problem-hint-grid">
                {problemHints.map(ph => (
                  <button
                    key={ph.value}
                    type="button"
                    className={`problem-hint-btn ${problemHint === ph.value ? 'problem-hint-btn--active' : ''}`}
                    onClick={() => setProblemHint(prev => prev === ph.value ? '' : ph.value)}
                  >
                    <span className="problem-hint-btn__icon">{ph.icon}</span>
                    <span className="problem-hint-btn__label">{ph.label}</span>
                    <span className="problem-hint-btn__desc">{ph.desc}</span>
                    {problemHint === ph.value && <CheckCircle size={14} className="problem-hint-btn__check" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="detect-form__row">
              <div className="form-group">
                <label className="form-group__label form-group__label--required">Crop Type</label>
                <select
                  className={`form-select ${formErrors.cropType ? 'form-select--error' : ''}`}
                  value={input.cropType}
                  onChange={e => updateField('cropType', e.target.value)}
                >
                  <option value="">Select crop...</option>
                  {cropCatalog.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {formErrors.cropType && <span className="form-error"><XCircle size={12} /> {formErrors.cropType}</span>}
              </div>

              <div className="form-group">
                <label className="form-group__label">Crop Variety</label>
                <select
                  className="form-select"
                  value={input.cropVariety}
                  onChange={e => updateField('cropVariety', e.target.value)}
                  disabled={!input.cropType}
                >
                  <option value="">Select variety (optional)...</option>
                  {selectedCrop?.varieties.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <span className="form-group__hint">Optional — helps narrow diagnosis</span>
              </div>
            </div>

            <div className="detect-form__row">
              <div className="form-group">
                <label className="form-group__label form-group__label--required">Growth Stage</label>
                <select
                  className={`form-select ${formErrors.growthStage ? 'form-select--error' : ''}`}
                  value={input.growthStage}
                  onChange={e => updateField('growthStage', e.target.value)}
                >
                  <option value="">Select stage...</option>
                  {growthStageOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {formErrors.growthStage && <span className="form-error"><XCircle size={12} /> {formErrors.growthStage}</span>}
              </div>

              <div className="form-group">
                <label className="form-group__label form-group__label--required">Location</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className={`form-input ${formErrors.location ? 'form-input--error' : ''}`}
                    value={input.location}
                    onChange={e => updateField('location', e.target.value)}
                    placeholder="Village, District, State"
                  />
                </div>
                {formErrors.location && <span className="form-error"><XCircle size={12} /> {formErrors.location}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-group__label">Symptoms Description</label>
              <textarea
                className="form-textarea"
                value={input.symptomsDescription}
                onChange={e => updateField('symptomsDescription', e.target.value)}
                placeholder="Describe what you see (optional). E.g., 'dark spots on lower leaves, some yellowing...'"
                rows={3}
              />
              <span className="form-group__hint">Optional — describe visible symptoms. Helps the AI Router pick the right model.</span>
            </div>
          </div>

          <div className="detect-actions">
            <Link to="/farmer">
              <Button variant="ghost" icon={<ArrowLeft size={16} />}>Back to Dashboard</Button>
            </Link>
            <Button variant="primary" size="lg" onClick={nextStep} icon={<ArrowRight size={16} />}>
              Next: Upload Image
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Image Upload ────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="detect-card">
          <h2 className="detect-card__title"><Camera size={22} /> Upload Crop Image</h2>
          <p className="detect-card__subtitle">
            Upload a clear photo of the affected crop, leaf, or plant part. Good lighting helps accuracy.
          </p>

          {!input.imagePreview ? (
            <div
              className={`upload-zone ${dragActive ? 'upload-zone--drag' : ''} ${formErrors.image ? 'upload-zone--error' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={44} strokeWidth={1.5} />
              <h3 className="upload-zone__title">Drop your crop image here</h3>
              <p className="upload-zone__text">or click to select a file</p>
              <div className="upload-zone__btns">
                <Button variant="primary" icon={<Upload size={16} />} onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  Choose File
                </Button>
                {/* Camera button — uses separate input with capture="environment" for mobile */}
                <Button variant="outline" icon={<Camera size={16} />} onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                  Take Photo
                </Button>
              </div>
              <p className="upload-zone__limits">JPG or PNG · Max 10MB · Best in natural sunlight</p>

              {/* File picker (no capture) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="sr-only"
              />
              {/* Camera capture — triggers native camera on mobile */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="sr-only"
              />
            </div>
          ) : (
            <div className="upload-preview-card">
              <div className="upload-preview-card__img-wrap">
                <img src={input.imagePreview} alt="Crop preview" className="upload-preview-card__img" />
                <div className="upload-preview-card__overlay">
                  <Button variant="outline" size="sm" onClick={replaceImage} icon={<RotateCcw size={14} />}>
                    Replace
                  </Button>
                  <Button variant="danger" size="sm" onClick={clearImage} icon={<X size={14} />}>
                    Remove
                  </Button>
                </div>
              </div>
              <div className="upload-preview-card__info">
                <div className="upload-preview-card__meta">
                  <span className="upload-preview-card__name">{input.imageFile?.name}</span>
                  <span className="upload-preview-card__size">
                    {input.imageFile && (input.imageFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
              </div>
            </div>
          )}

          {formErrors.image && (
            <p className="form-error mt-2"><XCircle size={14} /> {formErrors.image}</p>
          )}

          {/* Farmer's problem hint summary */}
          {problemHint && (
            <div className="hint-summary">
              <Info size={13} />
              <span>You indicated: <strong>{problemHints.find(p => p.value === problemHint)?.label}</strong> — the AI Router will prioritise the {problemHint === 'not-sure' ? 'most likely' : problemHint} model.</span>
            </div>
          )}

          <div className="detect-actions">
            <Button variant="ghost" onClick={prevStep} icon={<ArrowLeft size={16} />}>
              Back
            </Button>
            <Button variant="primary" size="lg" onClick={nextStep} icon={<Search size={16} />}>
              Analyse Image
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: AI Analysis Progress ────────────────────────── */}
      {currentStep === 2 && (
        <div className="detect-card">
          <div className="analysis-container">
            <div className="analysis-container__icon">
              {routingPhase === 'routing' ? <Search size={36} /> : isPestPath ? <Bug size={36} /> : <Search size={36} />}
            </div>
            <h2 className="analysis-container__title">
              {routingPhase === 'routing' ? 'Routing to AI Model' : isPestPath ? 'Pest AI Analysis' : 'Disease AI Analysis'}
            </h2>
            <p className="analysis-container__subtitle">
              {routingPhase === 'routing'
                ? `Determining the type of problem in your ${input.cropType} image...`
                : `Our AI is examining your ${input.cropType} image. This takes a few seconds.`}
            </p>

            {/* Router result pill */}
            {routedProblemType && routedProblemType !== 'uncertain' && (
              <div className="router-result-pill" style={{ borderColor: problemTypeColor[routedProblemType] }}>
                <span style={{ color: problemTypeColor[routedProblemType], fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                  {routedProblemType === 'pest' ? '🐛' : '🦠'} {problemTypeLabels[routedProblemType]}
                </span>
                <span style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-xs)' }}>{routerReason}</span>
              </div>
            )}

            <div className="analysis-stages">
              {stages.map((stage, i) => (
                <div key={stage.id}>
                  <div className={`analysis-stage analysis-stage--${stage.status}`}>
                    <div className="analysis-stage__indicator">
                      {stage.status === 'complete' ? (
                        <Check size={16} />
                      ) : stage.status === 'running' ? (
                        <Search size={14} />
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)' }}>{i + 1}</span>
                      )}
                    </div>
                    <div className="analysis-stage__content">
                      <div className="analysis-stage__label">{stage.label}</div>
                      <div className="analysis-stage__desc">{stage.description}</div>
                    </div>
                  </div>
                  {i < stages.length - 1 && (
                    <div className={`analysis-stage__line ${stage.status === 'complete' ? 'analysis-stage__line--done' : ''}`} />
                  )}
                </div>
              ))}
            </div>

            <p className="analysis-disclaimer">
              <Info size={13} />
              {isPestPath
                ? '🧪 Prototype: Pest predictions are mock inferences. No trained pest model is currently deployed.'
                : 'This is a prototype AI prediction, not a certified laboratory diagnosis.'}
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 3: Unified Results ──────────────────────────────── */}
      {currentStep === 3 && (
        <div className="result-layout">

          {/* ── UNCERTAIN path ──────────────────────────────────── */}
          {isUncertain && (
            <>
              <div className="uncertain-banner">
                <div className="uncertain-banner__icon"><HelpCircle size={32} /></div>
                <div className="uncertain-banner__content">
                  <h2>Expert Verification Recommended</h2>
                  <p>The AI Router could not confidently classify the problem as a disease or pest from the image and symptom description. An agricultural expert should inspect your crop for an accurate diagnosis.</p>
                  <p className="uncertain-banner__reason"><Eye size={13} /> Router analysis: {routerReason}</p>
                </div>
              </div>

              <div className="detect-card">
                <h3 style={{ marginBottom: 'var(--space-3)' }}>What you should do now:</h3>
                <ol style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingLeft: 'var(--space-5)' }}>
                  <li>Take more detailed photographs from multiple angles</li>
                  <li>Note the percentage of plants affected and how long symptoms have been present</li>
                  <li>Describe your observations in the symptoms field and try again</li>
                  <li>Contact your agriculture officer or call the Kisan Call Centre (1800-180-1551)</li>
                </ol>

                <div className="detect-actions" style={{ marginTop: 'var(--space-6)' }}>
                  <Button variant="ghost" onClick={startNew} icon={<RotateCcw size={16} />}>New Analysis</Button>
                  <Button
                    variant="primary"
                    onClick={handleSendToExpert}
                    loading={sendingToExpert}
                    disabled={sentToExpert}
                    icon={sentToExpert ? <Check size={16} /> : <Send size={16} />}
                  >
                    {sentToExpert ? 'Sent to Expert' : 'Send to Expert'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── DISEASE / PEST result ────────────────────────────── */}
          {!isUncertain && (result || pestResult) && (unifiedId || result) && (
            <>
              {/* Low Confidence Banner */}
              {isLowConfidence && (
                <div className="low-confidence-banner">
                  <div className="low-confidence-banner__icon">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="low-confidence-banner__content">
                    <h3>Expert Verification Recommended</h3>
                    <p>
                      AI confidence for this prediction is {(displayedConfidence * 100).toFixed(0)}%, below the recommended {(isPestPath ? PEST_EXPERT_THRESHOLD : EXPERT_THRESHOLD) * 100}% threshold.
                      We strongly recommend sending this report to an expert for verification.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleSendToExpert}
                    loading={sendingToExpert}
                    disabled={sentToExpert}
                    icon={sentToExpert ? <Check size={16} /> : <Send size={16} />}
                  >
                    {sentToExpert ? 'Sent' : 'Send to Expert'}
                  </Button>
                </div>
              )}

              {/* ── UNIFIED RESULT CARD ──────────────────────────── */}
              <div className="detect-card">
                {/* Problem Type Badge */}
                <div className="problem-type-header" style={{ borderLeftColor: routedProblemType ? problemTypeColor[routedProblemType] : 'var(--color-primary-500)' }}>
                  <span
                    className="problem-type-badge"
                    style={{
                      background: routedProblemType ? `${problemTypeColor[routedProblemType]}18` : 'var(--color-primary-50)',
                      color: routedProblemType ? problemTypeColor[routedProblemType] : 'var(--color-primary-700)',
                      border: `1px solid ${routedProblemType ? problemTypeColor[routedProblemType] : 'var(--color-primary-300)'}30`,
                    }}
                  >
                    {routedProblemType === 'pest' ? <Bug size={13} /> : <Leaf size={13} />}
                    Problem Type: {routedProblemType ? problemTypeLabels[routedProblemType].toUpperCase() : 'DISEASE'}
                  </span>
                  {isPestPath && (
                    <span className="prototype-badge">
                      <FlaskConical size={11} /> PROTOTYPE · Mock Pest Inference
                    </span>
                  )}
                </div>

                <div className="result-header">
                  {(result?.imagePreview || input.imagePreview) && (
                    <img src={result?.imagePreview || input.imagePreview || ''} alt="Analysed crop" className="result-header__image" />
                  )}
                  <div className="result-header__content">
                    <span className="result-header__badge">
                      <Search size={12} /> AI Detection Result
                    </span>
                    <h2 className="result-header__prediction">
                      {isPestPath ? '' : 'Possible '}{(pestResult?.prediction ?? result?.prediction ?? '')}
                    </h2>
                    <p className="result-header__scientific">
                      {pestResult?.scientificName ?? result?.scientificName ?? ''}
                    </p>

                    {/* ── UNIFIED METRICS DISPLAY ──────────────────────
                        AI Confidence ≠ Risk Score — they are separate values.
                        AI Confidence = how certain the MODEL is.
                        Risk Score    = how serious the situation is (context-based).
                    ─────────────────────────────────────────────────── */}
                    <div className="unified-metrics">
                      {/* Metric 1: AI Confidence */}
                      <div className="unified-metric">
                        <span className="unified-metric__label">AI Confidence</span>
                        <span className="unified-metric__value unified-metric__value--confidence">
                          {(displayedConfidence * 100).toFixed(0)}%
                        </span>
                        <span className="unified-metric__note">Model certainty</span>
                      </div>
                      {/* Divider */}
                      <div className="unified-metric__divider" aria-hidden="true">≠</div>
                      {/* Metric 2: Risk Score */}
                      <div className="unified-metric">
                        <span className="unified-metric__label">Risk Score</span>
                        <span
                          className="unified-metric__value"
                          style={{ color: riskColorMap[displayedRiskLevel] }}
                        >
                          {displayedRiskScore}/100
                        </span>
                        <span className="unified-metric__note">Context severity</span>
                      </div>
                    </div>

                    {/* Standard badges */}
                    <div className="result-header__badges">
                      <ConfidenceBadge value={displayedConfidence} />
                      <SeverityBadge severity={pestResult?.severity ?? result?.severity ?? 'moderate'} />
                      <RiskBadge level={displayedRiskLevel} />
                      {pestResult?.lifeStage && (
                        <span className="pest-life-badge"><Bug size={11} /> {pestResult.lifeStage}</span>
                      )}
                    </div>

                    {/* Pest-specific info */}
                    {isPestPath && pestResult && (
                      <div className="pest-info-row">
                        {pestResult.infestedArea && (
                          <span className="pest-info-chip">📐 Area: {pestResult.infestedArea}</span>
                        )}
                        {pestResult.economicThreshold && (
                          <span className="pest-info-chip">⚖️ ET: {pestResult.economicThreshold}</span>
                        )}
                        <span className="pest-info-chip">🔬 Category: {pestResult.pestCategory}</span>
                      </div>
                    )}

                    <div className="result-header__disclaimer">
                      <Info size={14} />
                      <span>
                        {isPestPath
                          ? '🧪 Prototype pest prediction using mock inference — not a certified diagnosis. Consult your agriculture officer before taking any pest management action.'
                          : 'This is a prototype AI prediction, not a guaranteed diagnosis. Confirm with a qualified agriculture expert before treatment decisions.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Confidence Ring + Symptoms ──────────────────── */}
              <div className="detect-card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
                  <div className="confidence-ring">
                    <ConfidenceRing value={displayedConfidence} riskLevel={displayedRiskLevel} />
                    <div className="confidence-ring__info">
                      <h4>AI Confidence: {(displayedConfidence * 100).toFixed(0)}%</h4>
                      <p>
                        {displayedConfidence >= 0.9
                          ? 'High confidence — prediction is likely reliable but should still be verified for treatment decisions.'
                          : displayedConfidence >= 0.7
                            ? 'Moderate confidence — consider expert verification for confirmation.'
                            : 'Low confidence — expert verification is strongly recommended before taking action.'}
                      </p>
                      <p className="confidence-ring__note">
                        <strong>Note:</strong> AI Confidence ≠ Risk Score. Confidence is how certain the model is; Risk is how serious the situation is in your field context.
                      </p>
                    </div>
                  </div>

                  <div className="symptoms-card">
                    <h3><AlertTriangle size={16} /> {isPestPath ? 'Detected Pest Signs' : 'Detected Symptoms'}</h3>
                    <ul>
                      {(pestResult?.symptoms ?? result?.symptoms ?? []).map((s, i) => (
                        <li key={i}><AlertTriangle size={13} /> {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="result-description mt-4">
                  {pestResult?.description ?? result?.description ?? ''}
                </div>
              </div>

              {/* ── Contextual Risk Assessment (Unified Risk Engine) ──
                  Risk is computed by the Crop Health Risk Engine.
                  Inputs: weather · field reports · history · growth stage · regional
                  NOT from AI confidence — they are completely separate values.
              ──────────────────────────────────────────────────────── */}
              <div className="assessment-section">
                <h3 className="assessment-section__title">
                  <ShieldAlert size={20} />
                  {isPestPath ? 'Infestation Risk Assessment' : 'Disease Risk Assessment'}
                  <span className="risk-engine-note">
                    <Activity size={10} /> Unified Risk Engine · AI Confidence ≠ Risk Score
                  </span>
                </h3>

                {/* Risk Engine Loading State */}
                {riskEngineLoading && (
                  <div className="risk-engine-loading">
                    <div className="risk-engine-loading__spinner" />
                    <span>Risk engine computing contextual risk from weather, nearby reports, and regional data...</span>
                  </div>
                )}

                {/* Risk Engine Error Fallback */}
                {riskEngineError && !riskEngineLoading && (
                  <div className="risk-engine-fallback">
                    <Info size={14} />
                    <span>Risk context data unavailable. Showing basic risk level derived from AI severity only. Please check your connection.</span>
                  </div>
                )}

                {/* Main Risk Display */}
                <div
                  className="overall-risk"
                  style={{ backgroundColor: riskBgMap[displayedRiskLevel], color: riskColorMap[displayedRiskLevel] }}
                >
                  <span className="overall-risk__label">
                    {isPestPath ? 'Infestation Risk' : 'Disease Risk'}
                  </span>
                  <div className="overall-risk__top-row">
                    <span className="overall-risk__value">{displayedRiskLevel.toUpperCase()}</span>
                    {riskEngineResult && (
                      <span className={`risk-trend-badge risk-trend-badge--${riskEngineResult.trend}`}>
                        {riskEngineResult.trend === 'increasing' ? <TrendingUp size={12} /> :
                         riskEngineResult.trend === 'decreasing' ? <TrendingDown size={12} /> :
                         <Minus size={12} />}
                        {riskEngineResult.trend.charAt(0).toUpperCase() + riskEngineResult.trend.slice(1)}
                      </span>
                    )}
                  </div>
                  <div className="overall-risk__bar">
                    <div className="overall-risk__bar-fill" style={{ width: `${displayedRiskScore}%` }} />
                  </div>
                  <span className="overall-risk__score">Risk Score: {displayedRiskScore}/100</span>

                  {/* Engine explanation */}
                  {riskEngineResult?.explanation && (
                    <p className="overall-risk__explanation">{riskEngineResult.explanation}</p>
                  )}
                </div>

                {/* Category Breakdown (new from Unified Risk Engine) */}
                {riskEngineResult?.categoryBreakdown && (
                  <div className="risk-category-breakdown">
                    <h4 className="risk-category-breakdown__title">
                      <BarChart2 size={14} /> Risk Factor Breakdown
                    </h4>
                    <div className="risk-category-bars">
                      {Object.entries(riskEngineResult.categoryBreakdown).map(([cat, score]) => (
                        <div className="risk-cat-bar" key={cat}>
                          <span className="risk-cat-bar__label">{
                            { weather: '🌦 Weather', fieldReports: '📍 Nearby Reports', history: '📅 History',
                              growthStage: '🌱 Growth Stage', regional: '🗺 Regional', seasonal: '📆 Seasonal' }[cat] ?? cat
                          }</span>
                          <div className="risk-cat-bar__track">
                            <div
                              className="risk-cat-bar__fill"
                              style={{
                                width: `${score}%`,
                                background: score > 60 ? riskColorMap.high : score > 35 ? riskColorMap.moderate : riskColorMap.low,
                              }}
                            />
                          </div>
                          <span className="risk-cat-bar__score">{score}</span>
                        </div>
                      ))}
                    </div>
                    {/* Nearby report count + regional activity stats */}
                    <div className="risk-stats-row">
                      <div className="risk-stat">
                        <span className="risk-stat__value">{riskEngineResult.nearbyReportCount}</span>
                        <span className="risk-stat__label">Nearby Reports</span>
                      </div>
                      <div className="risk-stat">
                        <span className="risk-stat__value" style={{
                          color: riskEngineResult.regionalActivity === 'very-high' ? riskColorMap.critical :
                                 riskEngineResult.regionalActivity === 'high' ? riskColorMap.high :
                                 riskEngineResult.regionalActivity === 'moderate' ? riskColorMap.moderate : riskColorMap.low
                        }}>{riskEngineResult.regionalActivity.replace('-', ' ').toUpperCase()}</span>
                        <span className="risk-stat__label">Regional Activity</span>
                      </div>
                      <div className="risk-stat">
                        <span className="risk-stat__value" style={{ color: riskColorMap[displayedRiskLevel] }}>
                          {riskEngineResult.riskEmoji} {riskEngineResult.riskLabel}
                        </span>
                        <span className="risk-stat__label">Risk Level</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contributing Factors */}
                <div className="risk-factors">
                  {displayedFactors.map((rf, i) => (
                    <div className="risk-factor" key={i}>
                      <div className={`risk-factor__icon risk-factor__icon--${rf.impact}`}>
                        {rf.impact === 'negative' ? <TrendingUp size={14} /> :
                          rf.impact === 'positive' ? <TrendingDown size={14} /> :
                            <Minus size={14} />}
                      </div>
                      <div className="risk-factor__text">
                        <h4>{rf.factor}</h4>
                        <p>{rf.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="context-cards">
                  <div className="context-card">
                    <h4><Thermometer size={13} /> Weather</h4>
                    <p>{displayedWeather}</p>
                  </div>
                  <div className="context-card">
                    <h4><Globe size={13} /> Regional</h4>
                    <p>{displayedRegional}</p>
                  </div>
                  <div className="context-card">
                    <h4><Sprout size={13} /> Growth Stage</h4>
                    <p>{displayedGrowth}</p>
                  </div>
                </div>
              </div>


              {/* ── Recommended Actions ──────────────────────────── */}
              {actions && (
                <div className="actions-section">
                  <h3 className="actions-section__title">
                    <Clipboard size={20} /> Recommended Actions
                  </h3>

                  <div className="action-block">
                    <h4>📋 What is happening?</h4>
                    <p>{actions.whatIsHappening}</p>
                  </div>

                  <div className="action-block">
                    <h4>🔍 What should you inspect?</h4>
                    <ol>{actions.whatToInspect.map((item, i) => <li key={i}>{item}</li>)}</ol>
                  </div>

                  <div className="action-block">
                    <h4>⚡ Immediate Actions</h4>
                    <ol>{actions.immediateActions.map((item, i) => <li key={i}>{item}</li>)}</ol>
                  </div>

                  <div className="action-block">
                    <h4>🌱 Integrated Management Suggestions</h4>
                    <ul>{actions.managementSuggestions.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  </div>

                  <div className="action-block action-block--expert">
                    <h4>👨‍🔬 When to contact an expert?</h4>
                    <p>{actions.expertRecommendation}</p>
                  </div>
                </div>
              )}

              {/* Pest actions (when no disease actions) */}
              {isPestPath && !actions && pestResult && (
                <div className="actions-section">
                  <h3 className="actions-section__title"><Clipboard size={20} /> Recommended IPM Actions</h3>
                  <div className="action-block">
                    <h4>📋 What is happening?</h4>
                    <p>{pestResult.description}</p>
                  </div>
                  <div className="action-block">
                    <h4>⚡ Immediate Actions</h4>
                    <ol>
                      <li>Monitor pest population and compare with economic threshold: <strong>{pestResult.economicThreshold}</strong></li>
                      <li>Install pheromone/sticky traps immediately for population monitoring</li>
                      <li>Remove heavily infested plant parts to reduce pest load</li>
                      <li>Encourage natural predators — avoid broad-spectrum insecticides</li>
                      <li>Contact your agriculture officer for approved IPM treatment options</li>
                    </ol>
                  </div>
                  <div className="action-block action-block--expert">
                    <h4>👨‍🔬 When to contact an expert?</h4>
                    <p>Contact your agriculture officer or call the Kisan Call Centre (1800-180-1551) if pest population exceeds the economic threshold, or if the infestation spreads rapidly across the field.</p>
                  </div>
                </div>
              )}

              {/* Bottom Actions Bar */}
              <div className="result-actions-bar">
                <div className="result-actions-bar__left">
                  <Button variant="ghost" onClick={startNew} icon={<RotateCcw size={16} />}>
                    New Analysis
                  </Button>
                  <Link to="/farmer">
                    <Button variant="ghost" icon={<Home size={16} />}>Dashboard</Button>
                  </Link>
                </div>
                <div className="result-actions-bar__right">
                  {isLowConfidence && !sentToExpert && (
                    <Button
                      variant="outline"
                      onClick={handleSendToExpert}
                      loading={sendingToExpert}
                      icon={<Send size={16} />}
                    >
                      Send to Expert
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSave}
                    loading={saving}
                    disabled={saved}
                    icon={saved ? <Check size={16} /> : <Save size={16} />}
                  >
                    {saved ? 'Report Saved' : 'Save Report'}
                  </Button>
                </div>
              </div>

              {/* Save Success Modal */}
              <Modal
                isOpen={saveModalOpen}
                onClose={() => setSaveModalOpen(false)}
                title="Report Saved"
                size="sm"
              >
                <div className="save-success">
                  <div className="save-success__icon">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="save-success__title">Report Saved Successfully</h3>
                  <p className="save-success__id">Report ID: {savedReportId}</p>
                  <p className="text-sm text-muted mb-4">
                    Your report has been saved and is now visible to agriculture officers in your region.
                    You will receive notifications about any follow-up actions.
                  </p>
                  <div className="save-success__actions">
                    <Link to="/farmer/reports">
                      <Button variant="outline" icon={<FileText size={16} />}>View Reports</Button>
                    </Link>
                    <Button
                      variant="primary"
                      onClick={() => { setSaveModalOpen(false); startNew(); }}
                      icon={<RotateCcw size={16} />}
                    >
                      New Analysis
                    </Button>
                  </div>
                </div>
              </Modal>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// SUB-COMPONENTS
// =============================================

function StepProgress({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="detect-steps">
      {steps.map((label, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
          <div className={`detect-step ${i === current ? 'detect-step--active' : i < current ? 'detect-step--done' : ''}`}>
            <span className="detect-step__num">
              {i < current ? <Check size={14} /> : i + 1}
            </span>
            <span>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`detect-step__connector ${i < current ? 'detect-step__connector--done' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ConfidenceRing({ value, riskLevel }: { value: number; riskLevel: RiskLevel }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - value * circumference;

  return (
    <div className="confidence-ring__visual">
      <svg className="confidence-ring__svg" width="72" height="72" viewBox="0 0 72 72">
        <circle className="confidence-ring__bg" cx="36" cy="36" r={radius} />
        <circle
          className="confidence-ring__fill"
          cx="36" cy="36" r={radius}
          stroke={riskColorMap[riskLevel]}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="confidence-ring__value" style={{ color: riskColorMap[riskLevel] }}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

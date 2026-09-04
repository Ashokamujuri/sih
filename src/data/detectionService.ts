// ============================================
// CropShield AI – Mock Detection Service
// This service simulates the AI analysis pipeline.
// REPLACE with real ML/API service in production.
// ============================================
import type {
  AnalysisStage,
  DetectionResult,
  ContextualAssessment,
  RecommendedAction,
  DetectionReport,
  CropDetectionInput,
} from '../types';

// ---------- Analysis Stages ----------
export function getAnalysisStages(): AnalysisStage[] {
  return [
    {
      id: 'quality',
      label: 'Image Quality Check',
      description: 'Verifying image clarity, lighting, and crop visibility',
      status: 'pending',
      durationMs: 1200,
    },
    {
      id: 'symptoms',
      label: 'Visual Symptom Analysis',
      description: 'Identifying abnormal patterns, lesions, discoloration',
      status: 'pending',
      durationMs: 2000,
    },
    {
      id: 'classify',
      label: 'Disease Classification',
      description: 'Matching symptoms against disease database',
      status: 'pending',
      durationMs: 1800,
    },
    {
      id: 'confidence',
      label: 'Confidence Estimation',
      description: 'Calculating prediction reliability score',
      status: 'pending',
      durationMs: 1000,
    },
    {
      id: 'context',
      label: 'Risk Contextualization',
      description: 'Combining weather, region, and growth stage data',
      status: 'pending',
      durationMs: 1500,
    },
  ];
}

// ---------- Mock Detection Database ----------
interface MockDetectionEntry {
  prediction: string;
  scientificName: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  symptoms: string[];
  description: string;
}

const mockDetectionDB: Record<string, MockDetectionEntry[]> = {
  Tomato: [
    {
      prediction: 'Early Blight',
      scientificName: 'Alternaria solani',
      confidence: 0.91,
      severity: 'moderate',
      riskLevel: 'high',
      symptoms: [
        'Dark brown concentric rings on lower leaves (target-board pattern)',
        'Yellow halo surrounding the lesions',
        'Lesions starting from older/lower leaves',
        'Premature leaf drop in severe cases',
      ],
      description: 'Early Blight is a common fungal disease of tomato caused by Alternaria solani. It typically starts on older leaves and progresses upward. The characteristic target-shaped lesions with concentric rings are a key diagnostic feature. Under favourable conditions (warm, humid), the disease can spread rapidly and significantly reduce yield.',
    },
    {
      prediction: 'Late Blight',
      scientificName: 'Phytophthora infestans',
      confidence: 0.95,
      severity: 'critical',
      riskLevel: 'critical',
      symptoms: [
        'Large, water-soaked dark lesions on leaves',
        'White fuzzy growth on the underside of leaves',
        'Rapid browning and wilting',
        'Dark, firm rot on fruits',
      ],
      description: 'Late Blight is a devastating oomycete disease that can destroy an entire tomato crop within days under cool, wet conditions. It requires immediate action.',
    },
  ],
  Rice: [
    {
      prediction: 'Bacterial Leaf Blight',
      scientificName: 'Xanthomonas oryzae pv. oryzae',
      confidence: 0.84,
      severity: 'moderate',
      riskLevel: 'moderate',
      symptoms: [
        'Water-soaked lesions on leaf margins',
        'Yellow to white streaks along the leaf',
        'Wilting and drying of leaves from the tip',
        'Bacterial ooze visible in morning',
      ],
      description: 'Bacterial Leaf Blight (BLB) is one of the most serious rice diseases. It is spread by wind, rain, and contaminated irrigation water. Warm and humid conditions favour disease development.',
    },
  ],
  Cotton: [
    {
      prediction: 'Bollworm Infestation',
      scientificName: 'Helicoverpa armigera',
      confidence: 0.87,
      severity: 'severe',
      riskLevel: 'high',
      symptoms: [
        'Circular bore holes on bolls',
        'Frass (insect excrement) on plant surface',
        'Premature boll opening and shedding',
        'Damaged squares and flowers',
      ],
      description: 'Cotton bollworm is one of the most destructive pests of cotton in India. Larvae bore into bolls and feed on developing seeds, causing significant yield loss.',
    },
  ],
  Chilli: [
    {
      prediction: 'Leaf Curl Virus',
      scientificName: 'Chilli leaf curl virus (ChiLCV)',
      confidence: 0.78,
      severity: 'moderate',
      riskLevel: 'moderate',
      symptoms: [
        'Upward curling of leaves',
        'Thickening and puckering of leaves',
        'Stunted plant growth',
        'Reduced fruit set',
      ],
      description: 'Chilli leaf curl virus is transmitted by whiteflies (Bemisia tabaci). Affected plants show characteristic leaf curling, stunting, and reduced yield. Management focuses on vector control.',
    },
  ],
  Wheat: [
    {
      prediction: 'Yellow Rust',
      scientificName: 'Puccinia striiformis f.sp. tritici',
      confidence: 0.92,
      severity: 'moderate',
      riskLevel: 'high',
      symptoms: [
        'Yellow-orange pustules arranged in stripes along leaf veins',
        'Reduced tillering and grain filling',
        'Premature senescence of leaves',
        'Yellow powdery spores on fingers when rubbed',
      ],
      description: 'Yellow Rust (Stripe Rust) is a major fungal disease of wheat in North India. Cool, moist conditions favour the disease. It can reduce yield by 40–100% if left untreated.',
    },
  ],
};

// Default fallback
const fallbackDetection: MockDetectionEntry = {
  prediction: 'Unidentified Symptoms',
  scientificName: 'Further analysis required',
  confidence: 0.42,
  severity: 'mild',
  riskLevel: 'moderate',
  symptoms: [
    'Abnormal leaf appearance detected',
    'Pattern does not match common diseases with high confidence',
    'Multiple possible conditions identified',
  ],
  description: 'The AI system detected abnormal symptoms but was unable to classify them with sufficient confidence. Expert verification is strongly recommended for accurate diagnosis.',
};

// ---------- Confidence Level Helper ----------
function getConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' | 'very-high' {
  if (confidence >= 0.9) return 'very-high';
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

// =============================================
// PUBLIC API — Replace these with real ML calls
// =============================================

/**
 * Simulates AI analysis of a crop image.
 * In production, this sends the image to an ML model endpoint.
 */
export async function analyzeImage(
  input: CropDetectionInput,
  onStageUpdate: (stages: AnalysisStage[]) => void
): Promise<DetectionResult> {
  const stages = getAnalysisStages();

  // Run through each analysis stage with realistic delays
  for (let i = 0; i < stages.length; i++) {
    stages[i].status = 'running';
    onStageUpdate([...stages]);

    await new Promise(resolve => setTimeout(resolve, stages[i].durationMs));

    stages[i].status = 'complete';
    onStageUpdate([...stages]);

    // Small pause between stages
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Select result based on crop type
  const entries = mockDetectionDB[input.cropType];
  const entry = entries
    ? entries[Math.floor(Math.random() * entries.length)]
    : fallbackDetection;

  // For Tomato, always return Early Blight for consistency in demo
  const detectionEntry = input.cropType === 'Tomato' ? mockDetectionDB.Tomato[0] : entry;

  const result: DetectionResult = {
    id: `DET-${Date.now()}`,
    cropType: input.cropType,
    cropVariety: input.cropVariety,
    growthStage: input.growthStage || 'vegetative',
    location: input.location,
    prediction: detectionEntry.prediction,
    scientificName: detectionEntry.scientificName,
    confidence: detectionEntry.confidence,
    confidenceLevel: getConfidenceLevel(detectionEntry.confidence),
    severity: detectionEntry.severity,
    riskLevel: detectionEntry.riskLevel,
    symptoms: detectionEntry.symptoms,
    description: detectionEntry.description,
    imagePreview: input.imagePreview || '',
    analyzedAt: new Date().toISOString(),
  };

  return result;
}

/**
 * Generates contextual assessment by combining AI result with
 * weather, regional, and crop data.
 */
export function generateAssessment(result: DetectionResult): ContextualAssessment {
  const riskFactors = [
    {
      factor: 'AI Detection Confidence',
      impact: result.confidence >= 0.8 ? 'negative' as const : 'neutral' as const,
      detail: `${(result.confidence * 100).toFixed(0)}% confidence – ${result.confidence >= 0.8 ? 'high confidence detection supports risk elevation' : 'moderate confidence – expert review may help'}`,
    },
    {
      factor: 'Weather Conditions',
      impact: 'negative' as const,
      detail: 'Current humidity (78%) and temperature (32°C) create favourable conditions for fungal and bacterial growth',
    },
    {
      factor: 'Growth Stage',
      impact: result.growthStage === 'fruiting' || result.growthStage === 'flowering' ? 'negative' as const : 'neutral' as const,
      detail: `Crop is in ${result.growthStage} stage – ${result.growthStage === 'fruiting' || result.growthStage === 'flowering' ? 'highly susceptible to yield loss' : 'moderate vulnerability at this stage'}`,
    },
    {
      factor: 'Regional Reports',
      impact: 'negative' as const,
      detail: '4 similar cases reported within 10 km in the last 7 days',
    },
    {
      factor: 'Recent Rainfall',
      impact: 'negative' as const,
      detail: '12mm rainfall in last 24 hours – leaf wetness promotes infection spread',
    },
    {
      factor: 'Crop Variety Resistance',
      impact: 'neutral' as const,
      detail: `${result.cropVariety || 'Selected variety'} has moderate built-in resistance`,
    },
  ];

  const riskScores: Record<string, number> = {
    low: 25,
    moderate: 50,
    high: 75,
    critical: 92,
  };

  return {
    overallRisk: result.riskLevel,
    riskPercentage: riskScores[result.riskLevel] || 60,
    riskFactors,
    weatherContribution: 'High humidity and warm temperatures significantly increase the risk of disease spread. Rain forecast for the next 48 hours may worsen conditions.',
    regionalContext: 'Multiple farms in your district have reported similar symptoms. The disease appears to be spreading in the region.',
    growthStageImpact: `Your crop is in the ${result.growthStage} stage, which is ${result.growthStage === 'fruiting' || result.growthStage === 'flowering' ? 'a critical period where disease can cause significant yield loss' : 'a stage with moderate vulnerability to this type of disease'}.`,
  };
}

/**
 * Generates recommended actions based on detection result.
 * IMPORTANT: Does not prescribe pesticides automatically.
 */
export function generateActions(result: DetectionResult): RecommendedAction {
  const actionDB: Record<string, RecommendedAction> = {
    'Early Blight': {
      whatIsHappening: `Your tomato crop shows signs consistent with Early Blight (${result.scientificName}). This fungal disease attacks lower/older leaves first and moves upward. Under current weather conditions, it can spread rapidly and reduce yield by 50–80% if left unmanaged.`,
      whatToInspect: [
        'Check the lower and older leaves for dark brown spots with ring patterns',
        'Examine the stems near the soil line for dark lesions',
        'Look at nearby plants to check if the disease is spreading',
        'Inspect fruit for dark, leathery spots near the stem end',
      ],
      immediateActions: [
        'Remove and destroy heavily infected leaves (do not compost them)',
        'Improve air circulation by pruning excess foliage',
        'Avoid overhead irrigation — use drip irrigation if available',
        'Keep the base of plants dry and free from debris',
        'Apply mulch to prevent soil splash onto leaves',
      ],
      managementSuggestions: [
        'Consult your local agriculture officer about approved fungicide options such as Mancozeb 75% WP or Chlorothalonil',
        'Consider bio-control agents like Trichoderma viride as a preventive measure',
        'Practice crop rotation — avoid planting tomato or potato in the same field next season',
        'Select resistant varieties for future planting cycles',
        'Maintain field hygiene by removing crop residues after harvest',
      ],
      expertRecommendation: 'Contact your agriculture officer or call the Kisan Call Centre (1800-180-1551) if the disease has spread to more than 20% of plants, or if you need help with proper fungicide application rates.',
    },
    'Late Blight': {
      whatIsHappening: `Your tomato crop shows signs consistent with Late Blight (${result.scientificName}). This is a severe disease that can destroy your entire crop within days. Immediate action is essential.`,
      whatToInspect: [
        'Check all parts of the plant — leaves, stems, and fruits',
        'Look for large dark water-soaked lesions',
        'Check undersides of leaves for white fuzzy growth (sporangia)',
        'Inspect neighbouring plots — this disease spreads very quickly',
      ],
      immediateActions: [
        'Contact your agriculture officer IMMEDIATELY',
        'Remove and destroy (burn) all severely infected plants',
        'Do NOT compost infected plant material',
        'Avoid working in the field during wet conditions to prevent spread',
        'Isolate the affected area if possible',
      ],
      managementSuggestions: [
        'Seek expert guidance for approved systemic fungicide application',
        'Improve drainage in the field to reduce standing water',
        'Avoid planting tomato and potato crops close together',
        'Monitor remaining healthy plants daily for new symptoms',
      ],
      expertRecommendation: 'URGENT: Contact your agriculture officer immediately. Late Blight is a quarantine-level disease that requires coordinated response across the region.',
    },
  };

  const defaultActions: RecommendedAction = {
    whatIsHappening: `Your ${result.cropType} crop shows symptoms that the AI system has identified as possibly being ${result.prediction} (${result.scientificName}). This assessment is based on visual pattern matching and should be confirmed by an expert.`,
    whatToInspect: [
      'Carefully examine the affected areas identified in the image',
      'Check nearby plants for similar symptoms',
      'Note whether symptoms are spreading or stable',
      'Photograph additional affected areas for comparison',
    ],
    immediateActions: [
      'Mark the affected plants for monitoring',
      'Avoid handling healthy plants after touching affected ones',
      'Maintain proper field hygiene',
      'Monitor the spread pattern over the next 2–3 days',
    ],
    managementSuggestions: [
      'Consult your local agriculture officer for targeted management advice',
      'Consider sending additional samples for laboratory confirmation',
      'Follow integrated pest management (IPM) practices',
      'Maintain proper spacing and ventilation in the crop',
    ],
    expertRecommendation: `Since this is an AI-based preliminary assessment with ${(result.confidence * 100).toFixed(0)}% confidence, we recommend consulting your agriculture officer for confirmation and specific treatment guidance.`,
  };

  return actionDB[result.prediction] || defaultActions;
}

/**
 * Saves a detection report. In production, this would POST to an API.
 */
export async function saveDetectionReport(
  report: Omit<DetectionReport, 'id' | 'savedAt'>
): Promise<DetectionReport> {
  await new Promise(resolve => setTimeout(resolve, 800));

  const saved: DetectionReport = {
    ...report,
    id: `RPT-${Date.now()}`,
    savedAt: new Date().toISOString(),
  };

  // In production: POST /api/reports
  console.log('[CropShield] Report saved:', saved.id);
  return saved;
}

/**
 * Sends a report to expert for verification.
 * In production, this would trigger a notification to the expert panel.
 */
export async function sendToExpert(reportId: string): Promise<{ success: boolean; message: string }> {
  await new Promise(resolve => setTimeout(resolve, 600));

  // In production: POST /api/reports/:id/send-to-expert
  console.log('[CropShield] Report sent to expert:', reportId);
  return {
    success: true,
    message: 'Your report has been sent to a verified agriculture expert for review. You will receive a notification once the expert has reviewed it.',
  };
}

// ---------- Crop Catalog ----------
export const cropCatalog = [
  { name: 'Tomato', varieties: ['Arka Rakshak', 'Pusa Ruby', 'Pusa Early Dwarf', 'Arka Vikas'] },
  { name: 'Rice', varieties: ['Pusa Basmati 1121', 'IR-64', 'Samba Mahsuri', 'MTU-7029'] },
  { name: 'Cotton', varieties: ['BT Cotton', 'Suraj', 'Ankur 651', 'DCH-32'] },
  { name: 'Chilli', varieties: ['Byadagi', 'Pusa Jwala', 'Kashmiri', 'Guntur Sannam'] },
  { name: 'Wheat', varieties: ['HD-3226', 'HD-2967', 'PBW-550', 'WH-1105'] },
  { name: 'Groundnut', varieties: ['TMV-2', 'JL-24', 'TAG-24', 'ICGV-91114'] },
  { name: 'Sugarcane', varieties: ['CoS 767', 'Co 238', 'CoJ 64', 'CoS 88230'] },
  { name: 'Maize', varieties: ['DHM-117', 'HQPM-1', 'Vivek-9', 'Shaktiman'] },
];

export const growthStageOptions = [
  { value: 'seedling', label: 'Seedling / Nursery' },
  { value: 'vegetative', label: 'Vegetative Growth' },
  { value: 'tillering', label: 'Tillering (cereals)' },
  { value: 'flowering', label: 'Flowering' },
  { value: 'fruiting', label: 'Fruiting / Pod Formation' },
  { value: 'boll-formation', label: 'Boll Formation (cotton)' },
  { value: 'ripening', label: 'Ripening / Maturity' },
  { value: 'harvest-ready', label: 'Harvest Ready' },
];

/** Configurable confidence threshold — below this, expert review is recommended */
export const EXPERT_THRESHOLD = 0.70;

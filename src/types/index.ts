// ============================================
// CropShield AI – Type Definitions
// ============================================

export type UserRole = 'farmer' | 'officer' | 'expert' | 'public';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  avatar?: string;
  region?: string;
  language: string;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type Severity = 'mild' | 'moderate' | 'severe' | 'critical';
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very-high';
export type AlertStatus = 'new' | 'acknowledged' | 'resolved' | 'expired';
export type ReportStatus = 'pending' | 'verified' | 'rejected' | 'corrected';
export type CropHealth = 'healthy' | 'at-risk' | 'infected' | 'critical';
export type VerificationStatus = 'pending' | 'confirmed' | 'rejected' | 'corrected';

export interface CropInfo {
  id: string;
  name: string;
  variety: string;
  plantingDate: string;
  area: string;
  location: string;
  health: CropHealth;
  riskLevel: RiskLevel;
  lastChecked: string;
  imageUrl?: string;
}

export interface DiseaseDetection {
  id: string;
  cropId: string;
  diseaseName: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  severity: Severity;
  detectedDate: string;
  imageUrl: string;
  symptoms: string[];
  recommendations: string[];
  status: ReportStatus;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'weather' | 'disease' | 'pest' | 'advisory' | 'system';
  riskLevel: RiskLevel;
  status: AlertStatus;
  createdAt: string;
  expiresAt?: string;
  region?: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  condition: string;
  icon: string;
  forecast: WeatherForecast[];
}

export interface WeatherForecast {
  date: string;
  tempHigh: number;
  tempLow: number;
  humidity: number;
  rainfall: number;
  condition: string;
}

export interface Advisory {
  id: string;
  title: string;
  content: string;
  category: 'disease' | 'pest' | 'weather' | 'general' | 'fertilizer' | 'irrigation';
  severity: Severity;
  cropType: string;
  issuedDate: string;
  validUntil: string;
  issuedBy: string;
}

export interface Report {
  id: string;
  farmerId: string;
  farmerName: string;
  cropName: string;
  diseaseName: string;
  location: string;
  region: string;
  status: ReportStatus;
  confidence: number;
  submittedDate: string;
  imageUrl: string;
  severity: Severity;
  notes?: string;
}

export interface VerificationCase {
  id: string;
  reportId: string;
  farmerName: string;
  cropName: string;
  diseaseName: string;
  aiPrediction: string;
  confidence: number;
  location: string;
  region: string;
  imageUrl: string;
  weatherSummary: string;
  cropDetails: string;
  submittedDate: string;
  status: VerificationStatus;
  expertNotes?: string;
  expertId?: string;
}

export interface RegionalStat {
  region: string;
  totalFarms: number;
  activeCases: number;
  riskLevel: RiskLevel;
  topDisease: string;
  trend: 'improving' | 'stable' | 'worsening';
}

export interface TrendData {
  month: string;
  cases: number;
  resolved: number;
  newAlerts: number;
}

export interface StatCardData {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: string;
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

// ============================================
// Farmer-Specific Types
// ============================================

export type GrowthStage =
  | 'seedling'
  | 'vegetative'
  | 'flowering'
  | 'fruiting'
  | 'ripening'
  | 'harvest-ready'
  | 'tillering'
  | 'boll-formation';

export type RiskTrend = 'rising' | 'stable' | 'falling';

export interface FarmerCropRisk {
  id: string;
  cropName: string;
  variety: string;
  growthStage: GrowthStage;
  riskLevel: RiskLevel;
  riskTrend: RiskTrend;
  lastInspection: string;
  area: string;
  topThreat: string;
  riskPercentage: number;
  emoji: string;
}

export interface EarlyWarning {
  id: string;
  title: string;
  location: string;
  riskLevel: RiskLevel;
  reasons: string[];
  actionText: string;
  affectedCrop: string;
  issuedAt: string;
  expiresAt: string;
}

export interface FarmerAdvisory {
  id: string;
  cropName: string;
  whatIsHappening: string;
  riskExplanation: string;
  whatShouldIDo: string[];
  whenToContactExpert: string;
  severity: Severity;
  issuedBy: string;
  issuedDate: string;
}

export interface FarmerReport {
  id: string;
  date: string;
  cropName: string;
  prediction: string;
  confidence: number;
  severity: Severity;
  status: ReportStatus;
  expertVerified: boolean;
  expertNote?: string;
}

export interface RegionalRiskSummary {
  riskLevel: RiskLevel;
  riskPercentage: number;
  explanation: string;
  topThreats: string[];
  lastUpdated: string;
}

export interface WeatherDiseaseInsight {
  message: string;
  riskLevel: RiskLevel;
  factors: string[];
}

// ============================================
// AI Detection Workflow Types
// ============================================

export interface CropDetectionInput {
  cropType: string;
  cropVariety?: string;
  growthStage: GrowthStage | '';
  location: string;
  symptomsDescription?: string;
  imageFile: File | null;
  imagePreview: string | null;
}

export type AnalysisStageStatus = 'pending' | 'running' | 'complete' | 'error';

export interface AnalysisStage {
  id: string;
  label: string;
  description: string;
  status: AnalysisStageStatus;
  durationMs: number;
}

export interface DetectionResult {
  id: string;
  cropType: string;
  cropVariety?: string;
  growthStage: string;
  location: string;
  prediction: string;
  scientificName: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  severity: Severity;
  riskLevel: RiskLevel;
  symptoms: string[];
  description: string;
  imagePreview: string;
  analyzedAt: string;
}

export interface RiskFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  detail: string;
}

export interface ContextualAssessment {
  overallRisk: RiskLevel;
  riskPercentage: number;
  riskFactors: RiskFactor[];
  weatherContribution: string;
  regionalContext: string;
  growthStageImpact: string;
}

export interface RecommendedAction {
  whatIsHappening: string;
  whatToInspect: string[];
  immediateActions: string[];
  managementSuggestions: string[];
  expertRecommendation: string;
}

export interface DetectionReport {
  id: string;
  farmerId: string;
  result: DetectionResult;
  assessment: ContextualAssessment;
  actions: RecommendedAction;
  status: ReportStatus;
  savedAt: string;
  sentToExpert: boolean;
}

// ============================================
// Unified Scan Pipeline Types
// ============================================
// These types define the refactored unified flow:
// SCAN → ROUTE → MODEL → AI IDENTIFICATION → RISK ENGINE → ALERT/ADVISORY
//
// KEY RULE: aiConfidence and riskScore are completely separate values.
//   aiConfidence = How certain the MODEL is about its identification (0–1)
//   riskScore    = How serious the crop-health risk is given context (0–100)
// ============================================

/** The type of agricultural problem detected by the AI router */
export type ProblemType = 'disease' | 'pest' | 'uncertain';

/**
 * Pure AI model output — contains ONLY what the model determined.
 * Does NOT contain risk score. Risk is calculated separately by the Risk Engine.
 */
export interface AIIdentification {
  problemType: ProblemType;
  prediction: string;           // e.g. "Early Blight", "Fall Armyworm"
  scientificName: string;       // e.g. "Alternaria solani"
  /** Model certainty: 0.0 to 1.0 — purely how confident the AI model is */
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  severity: Severity;           // Visual/observed severity from image
  symptoms: string[];
  description: string;
  imagePreview: string;
  analyzedAt: string;
}

/**
 * Pest-specific model output (extends AIIdentification).
 * Extension point — add more pest fields here without touching disease logic.
 */
export interface PestIdentification extends AIIdentification {
  problemType: 'pest';
  pestCategory: 'insect' | 'mite' | 'nematode' | 'rodent' | 'bird' | 'other';
  /** Estimated % of field/crop area infested */
  infestedArea?: string;
  /** Economic threshold description (e.g. "2 larvae/plant") */
  economicThreshold?: string;
  /** Life stage of the pest (e.g. "2nd instar larva") */
  lifeStage?: string;
}

/**
 * A single risk driver that contributes to the overall risk score.
 * Used in both the legacy ContextualAssessment and the new RiskAssessment.
 */
export interface RiskFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  detail: string;
}

/**
 * Risk Assessment — computed by the Common Risk Engine.
 * Completely independent of AI confidence.
 * Input: location, weather, nearby reports, growth stage, history, seasonal context.
 * Output: a contextual risk score 0–100.
 */
export interface RiskAssessment {
  /** 0–100 — crop health risk severity in this farmer's context. NOT the AI confidence. */
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  weatherContribution: string;
  regionalContext: string;
  growthStageImpact: string;
}

/**
 * The complete result of one crop health scan.
 * Clearly separates AI identification from contextual risk assessment.
 */
export interface UnifiedScanResult {
  id: string;
  cropType: string;
  cropVariety?: string;
  growthStage: string;
  location: string;
  problemType: ProblemType;
  /**
   * AI model output — confidence only, no risk score.
   * Use aiIdentification.confidence for "how certain the model is".
   */
  aiIdentification: AIIdentification | PestIdentification;
  /**
   * Contextual risk assessment — riskScore only, no model confidence.
   * Use riskAssessment.riskScore for "how serious the situation is".
   */
  riskAssessment: RiskAssessment;
  imagePreview: string;
  analyzedAt: string;
}

/** Input for the AI problem router */
export interface RouterInput {
  cropType: string;
  symptomsDescription?: string;
  /** Image data URI or null */
  imagePreview: string | null;
}

/** Output of the AI problem router */
export interface RouterOutput {
  problemType: ProblemType;
  /** Confidence of the router's own classification (e.g. 0.82 → "this is a pest problem") */
  routerConfidence: number;
  reason: string;
}

// ============================================
// Regional Risk Prediction Engine Types
// ============================================

export type RiskTrendDirection = 'increasing' | 'stable' | 'decreasing';

export interface ContributingFactor {
  id: string;
  category: 'weather' | 'disease-history' | 'field-reports' | 'growth-stage' | 'regional' | 'seasonal';
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 0–1, how much this contributes to overall risk
  detail: string;
  icon?: string;
}

export interface WeatherConditions {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  condition: string;
  dewPoint: number;
  leafWetnessDuration: number; // hours of leaf wetness
  soilMoisture: number; // %
}

export interface HistoricalRiskPoint {
  date: string;
  riskScore: number;
  riskLevel: RiskLevel;
  label?: string;
}

export interface NearbyReport {
  id: string;
  distance: string; // e.g., "2.3 km"
  crop: string;
  disease: string;
  severity: Severity;
  date: string;
  status: ReportStatus;
  village: string;
}

export interface CropSpecificRisk {
  cropName: string;
  variety: string;
  growthStage: GrowthStage;
  riskLevel: RiskLevel;
  riskScore: number;
  topThreat: string;
  vulnerabilities: string[];
  growthStageRiskNote: string;
}

export interface RegionalRiskResult {
  riskLevel: RiskLevel;
  riskScore: number; // 0–100
  crop: string;
  location: {
    village: string;
    block: string;
    district: string;
    state: string;
  };
  contributingFactors: ContributingFactor[];
  trend: RiskTrendDirection;
  trendHistory: HistoricalRiskPoint[];
  explanation: string;
  lastUpdated: string;
  weather: WeatherConditions;
  nearbyReports: NearbyReport[];
  cropSpecificRisks: CropSpecificRisk[];
  recommendedActions: string[];
  alertLevel: string; // human-readable
}

export interface RiskEngineInput {
  location: {
    village: string;
    block: string;
    district: string;
    state: string;
    lat?: number;
    lon?: number;
  };
  cropType?: string;
  growthStage?: GrowthStage;
  farmerId?: string;
}

// ============================================
// Early Warning & Alert System Types
// ============================================

export type AlertType =
  | 'regional-risk-increase'
  | 'disease-hotspot'
  | 'high-disease-probability'
  | 'follow-up-required'
  | 'expert-verification-result'
  | 'condition-worsening'
  | 'condition-improving';

export type AlertChannel = 'in-app' | 'sms' | 'voice-ivr' | 'push';
export type AlertReadStatus = 'unread' | 'read' | 'archived';

export interface CropAlert {
  id: string;
  title: string;
  message: string;
  crop: string;
  location: string;
  riskLevel: RiskLevel;
  alertType: AlertType;
  reasons: string[];
  createdAt: string;
  expiresAt?: string;
  status: AlertStatus;
  readStatus: AlertReadStatus;
  recommendedActions: string[];
  targetAudience: 'farmer' | 'officer' | 'all';
  channels: AlertChannel[];
  relatedReportIds?: string[];
  emoji?: string;
}

export interface NotificationItem {
  id: string;
  alertId?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'alert';
  channel: AlertChannel;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
  crop?: string;
  riskLevel?: RiskLevel;
}

export interface SMSPreview {
  id: string;
  to: string;
  from: string;
  body: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'failed';
  alertId: string;
}

export interface IVRConcept {
  id: string;
  phoneNumber: string;
  language: string;
  script: string[];
  status: 'scheduled' | 'called' | 'answered' | 'missed';
  scheduledAt: string;
  alertId: string;
}

// ============================================
// Advisory System Types
// ============================================

export type AdvisoryPriority = 'routine' | 'important' | 'urgent' | 'critical';
export type AdvisorySource = 'ai-detection' | 'risk-engine' | 'alert-system' | 'expert' | 'weather' | 'manual';
export type AdvisoryStatus = 'active' | 'completed' | 'expired' | 'superseded';

export interface MonitoringInstruction {
  task: string;
  frequency: string;
  duration: string;
  whatToLookFor: string;
}

export interface CropAdvisory {
  id: string;
  title: string;
  crop: string;
  location: string;
  riskLevel: RiskLevel;
  priority: AdvisoryPriority;
  source: AdvisorySource;
  status: AdvisoryStatus;

  /** Whether this advisory addresses a disease, pest, or uncertain problem */
  problemType?: 'disease' | 'pest' | 'uncertain';

  // Core content
  whatIsHappening: string;
  whyRiskExists: string[];
  whatToInspect: string[];
  immediateActions: string[];
  monitoringInstructions: MonitoringInstruction[];
  integratedManagement: string[];
  escalationCondition: string;

  // Metadata
  issuedAt: string;
  validUntil: string;
  issuedBy: string;
  relatedAlertId?: string;
  relatedReportId?: string;
  detectionId?: string;
  emoji?: string;

  // Safety
  safetyDisclaimer: string;
}


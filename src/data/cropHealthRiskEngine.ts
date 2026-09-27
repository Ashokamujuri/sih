// ============================================
// CropShield AI – Unified Crop Health Risk Engine
// ============================================
//
// PURPOSE:
//   Single reusable service that computes crop health risk for BOTH
//   disease and pest identification results through the same engine.
//
// ARCHITECTURE (API-ready):
//   CropHealthRiskInput
//     ↓
//   [Weather Provider]  [History Provider]  [Reports Provider]  [Regional Provider]
//     ↓                       ↓                   ↓                    ↓
//                        calculateCropHealthRisk()
//     ↓
//   CropHealthRiskResult { riskScore, riskLevel, contributingFactors, trend, explanation }
//
// KEY RULE (strictly enforced):
//   AI Confidence ≠ Risk Score
//   ─────────────────────────────────────────────────────────────────
//   aiConfidence = 0.0–1.0 = how certain the MODEL is about its ID
//   riskScore    = 0–100   = how serious the situation is in context
//
// The risk engine READS the AI identification for context (problem type,
// severity, prediction name) but NEVER uses aiConfidence as a risk input.
//
// SECURITY:
//   All API keys are consumed server-side only.
//   Frontend calls go through /api/* proxy endpoints.
//   No secret keys are exposed in the bundle.
//
// ============================================

import type {
  ProblemType,
  RiskLevel,
  RiskFactor,
} from '../types';

import {
  getLiveCoordinates,
  fetchLiveWeatherByCoords,
  getLiveWeatherConditions,
} from './liveWeatherService';

import type { WeatherConditions } from '../types';

// ============================================
// PUBLIC INPUT / OUTPUT TYPES
// ============================================

/** The AI identification result passed in from either the disease or pest model. */
export interface CropHealthRiskInput {
  /** Which AI model produced the identification */
  problemType: ProblemType;

  // --- AI identification (read-only context; NOT used as risk driver) ---
  /** What the AI model identified (e.g. "Early Blight", "Whitefly") */
  prediction: string;
  /** Observed visual severity from the image */
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  /**
   * AI model certainty (0.0–1.0).
   * IMPORTANT: This is NEVER used to compute risk score.
   * It is stored for display/logging only.
   */
  aiConfidence: number;

  // --- Agronomic context (the actual risk inputs) ---
  cropType: string;
  cropVariety?: string;
  growthStage: string;
  location: string;

  // --- Optional pest-specific fields ---
  /** For pests: economic threshold description */
  economicThreshold?: string;
  /** For pests: pest category */
  pestCategory?: string;
}

/** A single contributing factor explaining part of the risk score */
export interface RiskContributingFactor {
  id: string;
  category: 'weather' | 'field-reports' | 'history' | 'growth-stage' | 'regional' | 'seasonal' | 'ai-context';
  factor: string;
  impact: 'negative' | 'positive' | 'neutral';
  /**
   * Weight used in the composite score (0.0–1.0).
   * Negative factors drive riskScore up; positive factors drive it down.
   */
  weight: number;
  detail: string;
  /** Score contribution from this factor (0–100 range) */
  scoreContribution: number;
}

export type RiskTrendDirection = 'increasing' | 'stable' | 'decreasing';

/** Complete risk assessment result from the unified engine */
export interface CropHealthRiskResult {
  /** 0–100: how serious the crop health risk is.  DIFFERENT from aiConfidence. */
  riskScore: number;
  /** Derived from riskScore using standard thresholds */
  riskLevel: RiskLevel;
  /** Trend direction based on recent history */
  trend: RiskTrendDirection;
  /** Human-readable paragraph explaining the risk */
  explanation: string;
  /** All factors contributing to the risk score, sorted by weight desc */
  contributingFactors: RiskContributingFactor[];
  /** Summary of each category's sub-score */
  categoryBreakdown: {
    weather: number;
    fieldReports: number;
    history: number;
    growthStage: number;
    regional: number;
    seasonal: number;
  };
  /** Contextual narrative strings for the UI */
  weatherSummary: string;
  regionalSummary: string;
  growthStageSummary: string;
  /** When the engine produced this result */
  computedAt: string;
  /** Total number of nearby reports found */
  nearbyReportCount: number;
  /** Regional activity description */
  regionalActivity: 'low' | 'moderate' | 'high' | 'very-high';
  /** For the Farmer Dashboard crop risk card */
  riskLabel: string;
  riskEmoji: string;
}

// ============================================
// RISK THRESHOLDS (shared with riskEngine.ts)
// ============================================

const RISK_THRESHOLDS = {
  low:      { min: 0,  max: 30 },
  moderate: { min: 31, max: 55 },
  high:     { min: 56, max: 79 },
  critical: { min: 80, max: 100 },
};

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.critical.min) return 'critical';
  if (score >= RISK_THRESHOLDS.high.min) return 'high';
  if (score >= RISK_THRESHOLDS.moderate.min) return 'moderate';
  return 'low';
}

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ============================================
// CATEGORY WEIGHTS
// These define how much each contextual factor
// contributes to the final composite risk score.
// NOTE: AI confidence is NOT in this list.
// ============================================

const WEIGHTS = {
  weather:      0.30,  // Real-time weather: humidity, temp, rainfall, leaf wetness
  fieldReports: 0.22,  // Nearby verified field reports and spread pattern
  history:      0.18,  // Historical outbreak frequency + recurrence probability
  growthStage:  0.16,  // Vulnerability at current crop growth stage
  regional:     0.08,  // Regional agro-climatic pressure
  seasonal:     0.06,  // Seasonal disease/pest pressure calendar
} as const;

// ============================================
// PEST-SPECIFIC RISK MODIFIERS
// ============================================

/** Adjustment to base score based on pest category */
const PEST_CATEGORY_RISK: Record<string, number> = {
  insect: 0,
  mite: -5,        // Often localised
  nematode: -8,    // Slower spreading
  rodent: -10,
  bird: -12,
  other: 0,
};

/** Additional risk for pests at economic-threshold-exceeding stages */
const HIGH_RISK_GROWTH_STAGES_PEST = ['fruiting', 'flowering', 'boll-formation', 'ripening'];

// ============================================
// MOCK DATA PROVIDERS
// (Replace each with real API call in production)
// All provider functions are isolated — swap one without touching others.
// ============================================

/**
 * PROVIDER 1: Weather
 * Production: GET /api/weather?lat={lat}&lng={lng}
 * Keys stored server-side only. Frontend receives formatted WeatherConditions.
 */
async function fetchWeatherConditions(): Promise<{
  conditions: WeatherConditions;
  summary: string;
}> {
  try {
    const coords = await getLiveCoordinates();
    const live = await fetchLiveWeatherByCoords(coords.latitude, coords.longitude);
    const conditions = getLiveWeatherConditions(live);
    const summary = `${Math.round(live.temperature)}°C · ${live.humidity}% humidity · ${live.condition}`;
    return { conditions, summary };
  } catch {
    // Graceful fallback — no error surfaced to user
    return {
      conditions: {
        temperature: 31,
        humidity: 78,
        rainfall: 14,
        windSpeed: 12,
        condition: 'Partly Cloudy',
        dewPoint: 24,
        leafWetnessDuration: 7,
        soilMoisture: 68,
      },
      summary: '31°C · 78% humidity · Partly Cloudy (estimated)',
    };
  }
}

/**
 * PROVIDER 2: Nearby Field Reports
 * Production: GET /api/reports/nearby?location={loc}&crop={crop}&days=14&radius_km=10
 */
async function fetchNearbyFieldReports(input: CropHealthRiskInput): Promise<{
  count: number;
  verifiedCount: number;
  severeCount: number;
  closestKm: number;
  activity: 'low' | 'moderate' | 'high' | 'very-high';
  reports: Array<{ distance: string; severity: string; status: string; date: string }>;
}> {
  await delay(150);

  // Mock: Return data seeded by crop + problem type for realism
  const isPest = input.problemType === 'pest';

  const baseReports = isPest ? [
    { distance: '1.5 km', severity: 'moderate', status: 'verified', date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0] },
    { distance: '3.2 km', severity: 'severe',   status: 'verified', date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0] },
    { distance: '5.0 km', severity: 'moderate', status: 'pending',  date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0] },
  ] : [
    { distance: '1.2 km', severity: 'moderate', status: 'verified', date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0] },
    { distance: '2.8 km', severity: 'severe',   status: 'verified', date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0] },
    { distance: '4.1 km', severity: 'moderate', status: 'verified', date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0] },
    { distance: '5.5 km', severity: 'mild',     status: 'pending',  date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0] },
  ];

  const verified = baseReports.filter(r => r.status === 'verified').length;
  const severe = baseReports.filter(r => r.severity === 'severe' || r.severity === 'critical').length;
  const count = baseReports.length;
  const closest = parseFloat(baseReports[0]?.distance ?? '999');

  let activity: 'low' | 'moderate' | 'high' | 'very-high' = 'low';
  if (count >= 4 && verified >= 3) activity = 'very-high';
  else if (count >= 3) activity = 'high';
  else if (count >= 1) activity = 'moderate';

  return { count, verifiedCount: verified, severeCount: severe, closestKm: closest, activity, reports: baseReports };
}

/**
 * PROVIDER 3: Historical Data
 * Production: GET /api/history?crop={crop}&location={loc}&problem={disease|pest}
 */
async function fetchHistoricalData(input: CropHealthRiskInput): Promise<{
  outbreakCount: number;
  recurrenceProbability: number;  // 0.0–1.0
  lastOutbreakDaysAgo: number;
  trend: RiskTrendDirection;
}> {
  await delay(100);

  const isPest = input.problemType === 'pest';

  // Mock: different baselines for disease vs pest history
  return {
    outbreakCount: isPest ? 5 : 7,
    recurrenceProbability: isPest ? 0.58 : 0.65,
    lastOutbreakDaysAgo: isPest ? 21 : 14,
    trend: 'increasing',
  };
}

/**
 * PROVIDER 4: Regional Activity
 * Production: GET /api/regional?state={state}&district={district}&season={kharif|rabi}
 */
async function fetchRegionalData(): Promise<{
  activityLevel: 'low' | 'moderate' | 'high';
  description: string;
  baseScore: number;
  trendScore: number;
}> {
  await delay(80);

  return {
    activityLevel: 'high',
    description: 'Punjab Kharif season — elevated disease and pest pressure. Intensive mono-cropping and high humidity create regional susceptibility.',
    baseScore: 62,
    trendScore: 68,
  };
}

// ============================================
// RISK CALCULATORS (one per category)
// ============================================

/** Weather risk calculator — same epidemiological model for disease and pest */
function calcWeatherRisk(
  w: WeatherConditions,
  problemType: ProblemType
): { score: number; factors: RiskContributingFactor[] } {
  const factors: RiskContributingFactor[] = [];
  let score = 0;

  // Humidity
  if (w.humidity > 85) {
    const contrib = problemType === 'pest' ? 22 : 28;  // pests slightly less affected by humidity
    score += contrib;
    factors.push({
      id: 'w-humidity', category: 'weather', factor: 'Very High Humidity',
      impact: 'negative', weight: 0.28, scoreContribution: contrib,
      detail: `Humidity at ${w.humidity}% — significantly above the 70% threshold. ${
        problemType === 'pest'
          ? 'High humidity reduces pest natural-enemy activity and promotes fungal pest pathogens.'
          : 'Spore germination rate increases dramatically above 80% RH.'
      }`,
    });
  } else if (w.humidity > 70) {
    const contrib = 18;
    score += contrib;
    factors.push({
      id: 'w-humidity', category: 'weather', factor: 'High Humidity',
      impact: 'negative', weight: 0.18, scoreContribution: contrib,
      detail: `Humidity at ${w.humidity}% — above the 70% risk threshold for ${problemType === 'pest' ? 'pest population buildup' : 'fungal disease development'}.`,
    });
  } else {
    score += 4;
    factors.push({
      id: 'w-humidity', category: 'weather', factor: 'Moderate Humidity',
      impact: 'positive', weight: 0.04, scoreContribution: 4,
      detail: `Humidity at ${w.humidity}% — within safe range. Lower risk for ${problemType === 'pest' ? 'most pest outbreaks' : 'most crop diseases'}.`,
    });
  }

  // Temperature
  if (w.temperature >= 24 && w.temperature <= 34) {
    const contrib = problemType === 'pest' ? 22 : 18;  // warm temps strongly favour insect pests
    score += contrib;
    factors.push({
      id: 'w-temp', category: 'weather', factor: 'Favourable Temperature',
      impact: 'negative', weight: 0.22, scoreContribution: contrib,
      detail: `Temperature at ${w.temperature}°C — ${
        problemType === 'pest'
          ? 'ideal range (24–34°C) for most agricultural pest reproduction cycles.'
          : 'within the 24–32°C range ideal for fungal pathogens like Alternaria and Puccinia.'
      }`,
    });
  } else {
    score += 4;
    factors.push({
      id: 'w-temp', category: 'weather', factor: 'Temperature Outside Risk Range',
      impact: 'positive', weight: 0.04, scoreContribution: 4,
      detail: `Temperature at ${w.temperature}°C — outside optimal range for most ${problemType === 'pest' ? 'pest development' : 'pathogens'}.`,
    });
  }

  // Leaf wetness (critical for disease; less so for pests)
  if (problemType !== 'pest' && w.leafWetnessDuration > 6) {
    const contrib = 22;
    score += contrib;
    factors.push({
      id: 'w-wetness', category: 'weather', factor: 'Extended Leaf Wetness',
      impact: 'negative', weight: 0.22, scoreContribution: contrib,
      detail: `Leaf wetness for ${w.leafWetnessDuration} hours — exceeds the 6-hour threshold for fungal infection establishment. Spores require sustained moisture to penetrate leaf tissue.`,
    });
  }

  // Rainfall
  if (w.rainfall > 10) {
    const contrib = problemType === 'pest' ? 10 : 14;
    score += contrib;
    factors.push({
      id: 'w-rain', category: 'weather', factor: 'Recent Rainfall',
      impact: 'negative', weight: 0.14, scoreContribution: contrib,
      detail: `${w.rainfall}mm rainfall — ${
        problemType === 'pest'
          ? 'can disrupt pest natural enemies; standing water may promote certain pest breeding conditions.'
          : 'moisture on leaves and soil splash accelerate spore dispersal to neighbouring plants.'
      }`,
    });
  }

  // Wind (spore dispersal for disease; migratory pest movement)
  if (w.windSpeed > 15) {
    const contrib = 8;
    score += contrib;
    factors.push({
      id: 'w-wind', category: 'weather', factor: 'Moderate Wind',
      impact: 'negative', weight: 0.08, scoreContribution: contrib,
      detail: `Wind at ${w.windSpeed} km/h — ${
        problemType === 'pest'
          ? 'can carry winged pests (aphids, whiteflies) from neighbouring fields.'
          : 'can carry fungal spores to neighbouring fields within 5–10 km.'
      }`,
    });
  }

  return { score: Math.min(score, 100), factors };
}

/** Field reports risk calculator */
function calcFieldReportsRisk(
  reports: Awaited<ReturnType<typeof fetchNearbyFieldReports>>,
  problemType: ProblemType
): { score: number; factors: RiskContributingFactor[] } {
  const factors: RiskContributingFactor[] = [];
  let score = Math.min(reports.count * 8, 48);

  if (reports.count >= 3) {
    const contrib = 24;
    score += contrib;
    factors.push({
      id: 'r-cluster', category: 'field-reports', factor: 'Multiple Nearby Cases',
      impact: 'negative', weight: 0.24, scoreContribution: contrib,
      detail: `${reports.count} ${problemType === 'pest' ? 'pest infestation' : 'disease'} reports within 10 km. Cluster pattern indicates active regional spread.`,
    });
  } else if (reports.count > 0) {
    factors.push({
      id: 'r-some', category: 'field-reports', factor: 'Some Nearby Reports',
      impact: 'negative', weight: 0.12, scoreContribution: 12,
      detail: `${reports.count} reports detected within the area — monitor closely for spread.`,
    });
  }

  if (reports.verifiedCount >= 2) {
    factors.push({
      id: 'r-verified', category: 'field-reports', factor: 'Expert-Verified Cases',
      impact: 'negative', weight: 0.18, scoreContribution: 18,
      detail: `${reports.verifiedCount} expert-verified ${problemType === 'pest' ? 'pest infestation' : 'disease'} cases in your region confirm active presence. Nearest: ${reports.closestKm} km.`,
    });
  }

  if (reports.severeCount > 0) {
    const contrib = 14;
    score += contrib;
    factors.push({
      id: 'r-severe', category: 'field-reports', factor: 'Severe Cases Reported Nearby',
      impact: 'negative', weight: 0.14, scoreContribution: contrib,
      detail: `${reports.severeCount} severe ${problemType === 'pest' ? 'infestation' : 'disease'} case(s) — ${problemType === 'pest' ? 'population above economic threshold detected' : 'disease may have progressed beyond early stages'}.`,
    });
  }

  return { score: Math.min(score, 100), factors };
}

/** Historical data risk calculator */
function calcHistoryRisk(
  history: Awaited<ReturnType<typeof fetchHistoricalData>>,
  problemType: ProblemType
): { score: number; factors: RiskContributingFactor[] } {
  const factors: RiskContributingFactor[] = [];
  let score = Math.round(history.recurrenceProbability * 55);

  if (history.outbreakCount >= 5) {
    const contrib = 18;
    score += contrib;
    factors.push({
      id: 'h-outbreaks', category: 'history', factor: `Frequent Historical ${problemType === 'pest' ? 'Infestations' : 'Outbreaks'}`,
      impact: 'negative', weight: 0.18, scoreContribution: contrib,
      detail: `${history.outbreakCount} ${problemType === 'pest' ? 'pest infestation' : 'disease outbreak'} events in the past 2 years indicate persistent pressure in this area.`,
    });
  }

  if (history.recurrenceProbability > 0.5) {
    factors.push({
      id: 'h-recurrence', category: 'history', factor: 'High Recurrence Probability',
      impact: 'negative', weight: 0.22, scoreContribution: Math.round(history.recurrenceProbability * 22),
      detail: `${Math.round(history.recurrenceProbability * 100)}% recurrence probability based on seasonal ${problemType === 'pest' ? 'pest' : 'disease'} cycles and crop-host patterns.`,
    });
  }

  if (history.lastOutbreakDaysAgo < 30) {
    factors.push({
      id: 'h-recent', category: 'history', factor: 'Recent Previous Outbreak',
      impact: 'negative', weight: 0.15, scoreContribution: 15,
      detail: `Last ${problemType === 'pest' ? 'infestation' : 'outbreak'} was ${history.lastOutbreakDaysAgo} days ago — residual ${problemType === 'pest' ? 'pest population or eggs' : 'inoculum'} may still be present in the field.`,
    });
    score += 15;
  }

  return { score: Math.min(score, 100), factors };
}

/** Growth stage risk calculator — different vulnerability windows for disease vs pest */
function calcGrowthStageRisk(
  growthStage: string,
  problemType: ProblemType,
  cropType: string
): { score: number; factors: RiskContributingFactor[] } {
  const HIGH_RISK_DISEASE = ['fruiting', 'flowering', 'ripening'];
  const MEDIUM_RISK_DISEASE = ['vegetative', 'tillering', 'boll-formation'];
  const HIGH_RISK_PEST = HIGH_RISK_GROWTH_STAGES_PEST;

  let score = 35; // Baseline
  let impact: 'negative' | 'neutral' | 'positive' = 'neutral';
  let stageNote = '';

  if (problemType === 'pest') {
    if (HIGH_RISK_PEST.includes(growthStage)) {
      score = 78;
      impact = 'negative';
      stageNote = `${cropType} in ${growthStage} stage — critical period. Pest damage during ${growthStage} causes maximum yield loss. Economic threshold action is urgent.`;
    } else if (growthStage === 'vegetative' || growthStage === 'tillering') {
      score = 45;
      impact = 'neutral';
      stageNote = `${cropType} in ${growthStage} stage — moderate vulnerability. Some pest damage is recoverable at this stage, but population buildup must be prevented.`;
    } else {
      score = 28;
      impact = 'positive';
      stageNote = `${cropType} in ${growthStage} stage — lower direct yield risk from pest damage at this stage.`;
    }
  } else {
    // Disease path
    if (HIGH_RISK_DISEASE.includes(growthStage)) {
      score = 75;
      impact = 'negative';
      stageNote = `${cropType} in ${growthStage} stage — highly susceptible period. The plant diverts energy to reproduction, weakening foliar defenses against pathogens.`;
    } else if (MEDIUM_RISK_DISEASE.includes(growthStage)) {
      score = 48;
      impact = 'neutral';
      stageNote = `${cropType} in ${growthStage} stage — moderate vulnerability. Rapid canopy growth can trap moisture and create favourable conditions for disease spread.`;
    } else {
      score = 25;
      impact = 'positive';
      stageNote = `${cropType} in ${growthStage} stage — lower vulnerability at this growth stage.`;
    }
  }

  return {
    score,
    factors: [{
      id: 'g-stage', category: 'growth-stage',
      factor: `${cropType} in ${formatStage(growthStage)} Stage`,
      impact, weight: score / 100, scoreContribution: score,
      detail: stageNote,
    }],
  };
}

function formatStage(stage: string): string {
  const map: Record<string, string> = {
    seedling: 'Seedling', vegetative: 'Vegetative', flowering: 'Flowering',
    fruiting: 'Fruiting', ripening: 'Ripening', 'harvest-ready': 'Harvest Ready',
    tillering: 'Tillering', 'boll-formation': 'Boll Formation',
  };
  return map[stage] || stage.charAt(0).toUpperCase() + stage.slice(1);
}

// ============================================
// TREND DETECTION
// ============================================

function determineTrend(
  history: Awaited<ReturnType<typeof fetchHistoricalData>>,
  reports: Awaited<ReturnType<typeof fetchNearbyFieldReports>>
): RiskTrendDirection {
  // Increasing if: outbreak was recent AND regional activity is high AND reports are growing
  if (history.lastOutbreakDaysAgo < 14 && reports.activity === 'very-high') return 'increasing';
  if (reports.count >= 3 && reports.verifiedCount >= 2) return 'increasing';
  if (history.lastOutbreakDaysAgo > 60 && reports.count <= 1) return 'decreasing';
  return 'stable';
}

// ============================================
// EXPLANATION GENERATOR
// ============================================

function generateExplanation(
  input: CropHealthRiskInput,
  riskLevel: RiskLevel,
  riskScore: number,
  factors: RiskContributingFactor[],
  reports: Awaited<ReturnType<typeof fetchNearbyFieldReports>>,
  regional: Awaited<ReturnType<typeof fetchRegionalData>>,
  trend: RiskTrendDirection
): string {
  const negFactors = factors.filter(f => f.impact === 'negative');
  const top1 = negFactors[0]?.factor ?? 'environmental conditions';
  const top2 = negFactors[1]?.factor ?? '';
  const problemLabel = input.problemType === 'pest' ? 'pest infestation' : 'disease outbreak';
  const trendStr = trend === 'increasing' ? 'and trending upward' : trend === 'decreasing' ? 'with improving conditions' : 'and stable';

  const nearbyStr = reports.count > 0
    ? ` ${reports.count} nearby ${input.problemType === 'pest' ? 'pest' : 'disease'} reports have been filed in the last 14 days (${reports.verifiedCount} expert-verified).`
    : '';

  if (riskLevel === 'critical') {
    return `CRITICAL risk (${riskScore}/100) for ${input.prediction} ${problemLabel} on your ${input.cropType} at ${input.location}. ${top1} combined with ${top2} create conditions of extreme danger.${nearbyStr} Immediate expert consultation is required.`;
  }
  if (riskLevel === 'high') {
    return `High ${problemLabel} risk (${riskScore}/100) for ${input.prediction} on your ${input.cropType} (${formatStage(input.growthStage)} stage) at ${input.location} — ${trendStr}.${nearbyStr} ${top1} is the primary driver. Proactive monitoring and preventive action are strongly recommended.`;
  }
  if (riskLevel === 'moderate') {
    return `Moderate ${problemLabel} risk (${riskScore}/100). ${top1}${top2 ? ` and ${top2}` : ''} require monitoring.${nearbyStr} Current conditions are not immediately dangerous but could escalate if left unmanaged.`;
  }
  return `Low ${problemLabel} risk (${riskScore}/100). Current conditions are generally favourable. Continue standard monitoring and field hygiene practices.`;
}

// ============================================
// MAIN PUBLIC API
// ============================================

/**
 * calculateCropHealthRisk — Unified Crop Health Risk Engine
 *
 * Works for BOTH disease and pest identification results.
 * API-ready: each provider is independently replaceable with a real API call.
 * Secure: no API keys in frontend; provider stubs call /api/* endpoints in production.
 *
 * IMPORTANT: AI Confidence is read-only context. It is NOT used in risk calculation.
 * riskScore is derived purely from: weather + field reports + history + growth stage + regional.
 *
 * @param input - AI identification result + agronomic context
 * @returns CropHealthRiskResult with riskScore, riskLevel, trend, explanation, factors
 */
export async function calculateCropHealthRisk(
  input: CropHealthRiskInput
): Promise<CropHealthRiskResult> {
  // Fetch all data concurrently from independent providers
  const [weatherData, reportsData, historyData, regionalData] = await Promise.all([
    fetchWeatherConditions(),
    fetchNearbyFieldReports(input),
    fetchHistoricalData(input),
    fetchRegionalData(),
  ]);

  const { conditions: weather, summary: weatherSummary } = weatherData;

  // Calculate sub-scores from each category
  const weatherResult   = calcWeatherRisk(weather, input.problemType);
  const reportsResult   = calcFieldReportsRisk(reportsData, input.problemType);
  const historyResult   = calcHistoryRisk(historyData, input.problemType);
  const growthResult    = calcGrowthStageRisk(input.growthStage, input.problemType, input.cropType);

  const seasonalScore = 62; // September Kharif peak
  const seasonalFactor: RiskContributingFactor = {
    id: 's-kharif', category: 'seasonal', factor: 'Kharif / Monsoon Season Peak',
    impact: 'negative', weight: 0.10, scoreContribution: seasonalScore,
    detail: `September is peak Kharif season in Punjab. Sustained moisture, warmth, and dense crop canopy create optimal conditions for both ${input.problemType === 'pest' ? 'pest population explosions' : 'disease outbreaks'}.`,
  };

  const regionalFactor: RiskContributingFactor = {
    id: 'reg-zone', category: 'regional', factor: 'Regional Agro-Climatic Pressure',
    impact: 'neutral', weight: 0.08, scoreContribution: regionalData.baseScore,
    detail: regionalData.description,
  };

  // Pest-specific additional modifier
  let pestModifier = 0;
  if (input.problemType === 'pest' && input.pestCategory) {
    pestModifier = PEST_CATEGORY_RISK[input.pestCategory] ?? 0;
  }

  // Weighted composite score
  // IMPORTANT: aiConfidence is NOT in this calculation
  const compositeScore = Math.round(
    weatherResult.score   * WEIGHTS.weather      +
    reportsResult.score   * WEIGHTS.fieldReports  +
    historyResult.score   * WEIGHTS.history       +
    growthResult.score    * WEIGHTS.growthStage   +
    regionalData.baseScore* WEIGHTS.regional      +
    seasonalScore         * WEIGHTS.seasonal
  ) + pestModifier;

  const riskScore = Math.max(0, Math.min(100, compositeScore));
  const riskLevel = scoreToRiskLevel(riskScore);

  // Combine and sort all factors (highest weight first)
  const allFactors: RiskContributingFactor[] = [
    ...weatherResult.factors,
    ...reportsResult.factors,
    ...historyResult.factors,
    ...growthResult.factors,
    seasonalFactor,
    regionalFactor,
  ].sort((a, b) => b.weight - a.weight);

  const trend = determineTrend(historyData, reportsData);

  const explanation = generateExplanation(
    input, riskLevel, riskScore, allFactors, reportsData, regionalData, trend
  );

  const riskEmoji =
    riskLevel === 'critical' ? '🔴' :
    riskLevel === 'high' ? '🟠' :
    riskLevel === 'moderate' ? '🟡' : '🟢';

  const riskLabel =
    riskLevel === 'critical' ? 'CRITICAL RISK' :
    riskLevel === 'high' ? 'HIGH RISK' :
    riskLevel === 'moderate' ? 'MODERATE RISK' : 'LOW RISK';

  return {
    riskScore,
    riskLevel,
    trend,
    explanation,
    contributingFactors: allFactors,
    categoryBreakdown: {
      weather: Math.round(weatherResult.score),
      fieldReports: Math.round(reportsResult.score),
      history: Math.round(historyResult.score),
      growthStage: Math.round(growthResult.score),
      regional: Math.round(regionalData.baseScore),
      seasonal: seasonalScore,
    },
    weatherSummary,
    regionalSummary: regionalData.description,
    growthStageSummary: growthResult.factors[0]?.detail ?? '',
    computedAt: new Date().toISOString(),
    nearbyReportCount: reportsData.count,
    regionalActivity: reportsData.activity,
    riskLabel,
    riskEmoji,
  };
}

// ============================================
// ADAPTER: Convert from legacy RiskAssessment format
// (for backward compatibility with existing UI)
// ============================================

import type { RiskAssessment } from '../types';

/**
 * Converts a CropHealthRiskResult to the legacy RiskAssessment shape
 * used by ContextualAssessment consumers in DetectPage.tsx.
 *
 * Use this when you need to feed the new engine output into old UI components.
 */
export function toRiskAssessment(result: CropHealthRiskResult): RiskAssessment {
  return {
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    riskFactors: result.contributingFactors.map(f => ({
      factor: f.factor,
      impact: f.impact,
      detail: f.detail,
    })),
    weatherContribution: result.weatherSummary,
    regionalContext: result.regionalSummary,
    growthStageImpact: result.growthStageSummary,
  };
}

/**
 * Lightweight in-memory cache to avoid redundant calls when the same
 * input is assessed twice within 5 minutes (e.g. dashboard + detect page).
 * Keys are cleared after TTL.
 *
 * In production: replace with a React Query / SWR cache.
 */
const _cache = new Map<string, { result: CropHealthRiskResult; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function calculateCropHealthRiskCached(
  input: CropHealthRiskInput
): Promise<CropHealthRiskResult> {
  const key = `${input.problemType}|${input.cropType}|${input.growthStage}|${input.location}`;
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.result;
  }
  const result = await calculateCropHealthRisk(input);
  _cache.set(key, { result, ts: Date.now() });
  return result;
}

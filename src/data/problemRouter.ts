// ============================================
// CropShield AI – AI Problem Router
// ============================================
// The Problem Router is the FIRST step after image upload.
// It determines whether the image shows a DISEASE, PEST, or is UNCERTAIN,
// before forwarding to the appropriate specialist AI model.
//
// PIPELINE POSITION:
//   Image Upload → IMAGE VALIDATION → [THIS ROUTER] → Disease Model / Pest Model
//
// In production: replace routeProblem() with a real multi-label classifier.
// Current implementation uses rule-based heuristics on cropType + symptoms.
// ============================================

import type { ProblemType, RouterInput, RouterOutput, AnalysisStage, AnalysisStageStatus } from '../types';

// ============================================
// ROUTING STAGE (shown in UI during routing)
// ============================================

export function getRoutingStage(): AnalysisStage {
  return {
    id: 'routing',
    label: 'AI Problem Router',
    description: 'Classifying the nature of the agricultural problem — disease, pest, or uncertain',
    status: 'pending' as AnalysisStageStatus,
    durationMs: 250,
  };
}

// ============================================
// RULE-BASED ROUTING HEURISTICS
// In production: replace with a multi-label CNN or a dedicated router model.
// ============================================

// Keywords in symptom descriptions that strongly indicate pest presence
const PEST_KEYWORDS = [
  'insect', 'bug', 'worm', 'larva', 'larvae', 'caterpillar', 'aphid',
  'whitefly', 'white fly', 'fly', 'beetle', 'mite', 'spider mite',
  'thrips', 'borer', 'weevil', 'locust', 'grasshopper', 'hole',
  'bore', 'chewing', 'eaten', 'tunnelling', 'frass', 'honeydew',
  'sticky', 'bollworm', 'bollweevil', 'stem borer', 'leaf miner',
  'pod borer', 'fruit borer', 'armyworm', 'nematode', 'pheromone',
];

// Keywords that strongly indicate disease
const DISEASE_KEYWORDS = [
  'spot', 'blight', 'rust', 'mildew', 'mold', 'mould', 'rot', 'wilt',
  'lesion', 'necrosis', 'chlorosis', 'yellowing', 'browning', 'blackening',
  'canker', 'scab', 'smut', 'blast', 'mosaic', 'curl', 'ring',
  'concentric', 'fungal', 'bacterial', 'viral', 'pathogen',
  'infection', 'infected', 'spreading', 'pustule', 'spore',
];

// Crops that are strongly associated with major pest problems
const PEST_ASSOCIATED_CROPS: Record<string, string[]> = {
  Cotton: ['bollworm', 'whitefly', 'aphid', 'jassid', 'mealybug'],
  Rice: ['stem borer', 'brown planthopper', 'leaf folder', 'gall midge'],
  Maize: ['fall armyworm', 'stem borer', 'aphid'],
  Sugarcane: ['top borer', 'internode borer', 'pyrilla', 'white grub'],
  Groundnut: ['leaf miner', 'thrips', 'spodoptera'],
};

// ============================================
// MAIN ROUTER FUNCTION
// ============================================

/**
 * Routes an image/symptom description to the appropriate AI model.
 *
 * Decision logic (in priority order):
 * 1. If symptoms text strongly matches pest keywords → 'pest'
 * 2. If symptoms text strongly matches disease keywords → 'disease'
 * 3. If crop is strongly associated with pests AND has ambiguous symptoms → 'pest'
 * 4. Default fallback: → 'disease' (most common crop health problem category)
 *
 * @param input - Router input with cropType, optional symptomsDescription, imagePreview
 * @returns RouterOutput with problemType, confidence, and reasoning
 */
export async function routeProblem(input: RouterInput): Promise<RouterOutput> {
  // Simulate network/model latency
  await new Promise(resolve => setTimeout(resolve, 250));

  const symptomsLower = (input.symptomsDescription || '').toLowerCase();

  // Count pest and disease keyword matches
  let pestScore = 0;
  let diseaseScore = 0;
  const matchedPestKeywords: string[] = [];
  const matchedDiseaseKeywords: string[] = [];

  for (const kw of PEST_KEYWORDS) {
    if (symptomsLower.includes(kw)) {
      pestScore += 1;
      matchedPestKeywords.push(kw);
    }
  }

  for (const kw of DISEASE_KEYWORDS) {
    if (symptomsLower.includes(kw)) {
      diseaseScore += 1;
      matchedDiseaseKeywords.push(kw);
    }
  }

  // Check if this crop is strongly associated with pests
  const cropPestAssociations = PEST_ASSOCIATED_CROPS[input.cropType] || [];
  let cropPestBonus = 0;
  for (const assoc of cropPestAssociations) {
    if (symptomsLower.includes(assoc)) {
      cropPestBonus += 2; // Stronger signal
    }
  }

  const totalPestScore = pestScore + cropPestBonus;
  const totalDiseaseScore = diseaseScore;

  // Routing decision
  if (totalPestScore > totalDiseaseScore && totalPestScore >= 1) {
    const confidence = Math.min(0.95, 0.65 + (totalPestScore * 0.06));
    return {
      problemType: 'pest',
      routerConfidence: confidence,
      reason: matchedPestKeywords.length > 0
        ? `Detected pest indicators in symptoms: ${matchedPestKeywords.slice(0, 3).join(', ')}`
        : `${input.cropType} is associated with known pest pressures in this season`,
    };
  }

  if (totalDiseaseScore > 0) {
    const confidence = Math.min(0.95, 0.70 + (totalDiseaseScore * 0.05));
    return {
      problemType: 'disease',
      routerConfidence: confidence,
      reason: matchedDiseaseKeywords.length > 0
        ? `Detected disease indicators in symptoms: ${matchedDiseaseKeywords.slice(0, 3).join(', ')}`
        : 'Symptom pattern consistent with fungal/bacterial disease',
    };
  }

  // No clear signal — if image only, classify as uncertain (low confidence) or default disease
  if (!input.symptomsDescription || input.symptomsDescription.trim().length < 5) {
    return {
      problemType: 'disease',
      routerConfidence: 0.55,
      reason: 'No symptom description provided. Defaulting to disease analysis pipeline. Add symptom details to improve routing accuracy.',
    };
  }

  // Ambiguous symptoms — mark as uncertain
  return {
    problemType: 'uncertain',
    routerConfidence: 0.45,
    reason: 'Symptoms are ambiguous — could be disease, pest damage, or nutrient deficiency. Both disease and pest models will be evaluated.',
  };
}

// ============================================
// LABEL HELPERS
// ============================================

export const problemTypeLabels: Record<ProblemType, string> = {
  disease: 'Disease / Pathogen',
  pest: 'Pest / Insect Damage',
  uncertain: 'Uncertain — Needs Expert Review',
};

export const problemTypeEmoji: Record<ProblemType, string> = {
  disease: '🦠',
  pest: '🐛',
  uncertain: '🔍',
};

export const problemTypeColor: Record<ProblemType, string> = {
  disease: '#dc2626',  // red
  pest: '#d97706',     // amber
  uncertain: '#7c3aed', // purple
};

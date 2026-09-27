// ============================================
// CropShield AI – Pest Detection Service
// ============================================
// Extension point for pest identification.
// Mirrors the structure of detectionService.ts for diseases.
//
// PIPELINE POSITION:
//   Problem Router ('pest') → [THIS SERVICE] → AIIdentification (pest)
//                                             → Common Risk Engine
//                                             → Alert + Advisory + Expert
//
// In production: replace analyzePest() with a real pest identification
// ML model endpoint (e.g. a trained EfficientNet/ViT on pest imagery).
//
// IMPORTANT: This service returns AIIdentification (confidence only).
// It does NOT compute risk scores — that is handled by the shared Risk Engine.
// ============================================

import type {
  PestIdentification,
  CropDetectionInput,
  AnalysisStage,
  AnalysisStageStatus,
} from '../types';

// ============================================
// PEST ANALYSIS STAGES (mirrors disease pipeline)
// ============================================

export function getPestAnalysisStages(): AnalysisStage[] {
  return [
    {
      id: 'quality',
      label: 'Multi-Spectral Image Quality Check',
      description: 'Verifying resolution, lighting, crop surface clarity, and focus quality',
      status: 'pending' as AnalysisStageStatus,
      durationMs: 300,
    },
    {
      id: 'morphology',
      label: 'Pest Morphology Segmentation',
      description: 'Extracting body structure, wing patterns, damage signatures, and frass deposits',
      status: 'pending' as AnalysisStageStatus,
      durationMs: 500,
    },
    {
      id: 'classify',
      label: 'Hierarchical Arthropod Classification (CNN Ensemble)',
      description: 'Cross-matching morphological vectors with ICAR/IARI pest database and field records',
      status: 'pending' as AnalysisStageStatus,
      durationMs: 450,
    },
    {
      id: 'confidence',
      label: 'Bayesian Confidence Calibration',
      description: 'Estimating model certainty across pest species with temperature scaling',
      status: 'pending' as AnalysisStageStatus,
      durationMs: 300,
    },
    {
      id: 'context',
      label: 'Crop–Pest Compatibility & Seasonal Verification',
      description: 'Validating pest–host relationship, population density, and seasonal pressure',
      status: 'pending' as AnalysisStageStatus,
      durationMs: 350,
    },
  ];
}

// ============================================
// PEST KNOWLEDGE BASE (Mock — replace with real model)
// ============================================

interface MockPestEntry {
  pestName: string;
  scientificName: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  pestCategory: PestIdentification['pestCategory'];
  infestedArea: string;
  economicThreshold: string;
  lifeStage: string;
  symptoms: string[];
  description: string;
}

const mockPestDB: Record<string, MockPestEntry[]> = {
  Cotton: [
    {
      pestName: 'American Bollworm',
      scientificName: 'Helicoverpa armigera',
      confidence: 0.968,
      severity: 'severe',
      pestCategory: 'insect',
      infestedArea: '15–30% of bolls',
      economicThreshold: '1–2 egg masses or larvae per plant',
      lifeStage: '2nd–3rd instar larva',
      symptoms: [
        'Clean circular entry bore holes on squares and developing bolls',
        'Granular frass deposits on bracts and leaf axils',
        'Flared square symptom — bracts opening outward from boll damage',
        'Hollowed bolls with seed destruction and internal frass',
      ],
      description: 'Helicoverpa armigera (American Bollworm) is one of the most economically destructive pests in cotton. In early stages, larvae feed on squares and young leaves; later instars bore into bolls causing direct yield loss. Pheromone trapping and timely bio-pesticide application are critical management strategies.',
    },
    {
      pestName: 'Whitefly',
      scientificName: 'Bemisia tabaci',
      confidence: 0.942,
      severity: 'moderate',
      pestCategory: 'insect',
      infestedArea: '40–60% of leaf area',
      economicThreshold: '10 adults per leaf',
      lifeStage: 'Adult + nymph',
      symptoms: [
        'Dense colonies of tiny white adults on undersides of leaves',
        'Sticky honeydew secretion on leaf surfaces causing sooty mould',
        'Silvering and crinkling of young leaves from sucking damage',
        'Indirect damage: vector for Cotton Leaf Curl Virus',
      ],
      description: 'Bemisia tabaci is a devastating sucking pest that also acts as vector for Cotton Leaf Curl Virus (CLCuV). High temperatures and dry conditions favour rapid population buildup. Yellow sticky traps for monitoring, and neem-based sprays are first-line IPM measures.',
    },
  ],
  Rice: [
    {
      pestName: 'Brown Planthopper',
      scientificName: 'Nilaparvata lugens',
      confidence: 0.961,
      severity: 'critical',
      pestCategory: 'insect',
      infestedArea: 'Entire base of plant',
      economicThreshold: '10–20 hoppers per hill at tillering',
      lifeStage: 'Adult + nymph',
      symptoms: [
        'Circular "hopperburn" patches — yellowing then browning of plant clusters',
        'Dense colonies visible at the base of tillers near waterline',
        'Honeydew on leaf sheaths causing sooty mould',
        'Sudden plant lodging (crop lying flat) in severe infestations',
      ],
      description: 'Nilaparvata lugens (BPH) is the single most destructive rice pest in Asia. Resurgence is triggered by inappropriate insecticide use. Synchronized transplanting, light trapping, and use of BPH-resistant varieties are essential management tools.',
    },
    {
      pestName: 'Yellow Stem Borer',
      scientificName: 'Scirpophaga incertulas',
      confidence: 0.954,
      severity: 'severe',
      pestCategory: 'insect',
      infestedArea: '10–25% of tillers',
      economicThreshold: '5% dead hearts or 1% white ear (whiteheads)',
      lifeStage: '3rd–4th instar larva',
      symptoms: [
        '"Dead heart" — central shoot of young tiller dries up and pulls out easily',
        '"Whitehead" — entire panicle turns white without grain filling',
        'Circular bore holes at base of tiller or internode',
        'Larval frass visible inside bored tillers',
      ],
      description: 'Scirpophaga incertulas causes dead heart during vegetative stage and whitehead during reproductive stage. Both result in significant yield loss. Pheromone traps, egg mass scouting, and timely transplanting reduce infestation pressure.',
    },
  ],
  Tomato: [
    {
      pestName: 'Tomato Fruit Borer',
      scientificName: 'Helicoverpa armigera',
      confidence: 0.959,
      severity: 'severe',
      pestCategory: 'insect',
      infestedArea: '20–40% of fruits',
      economicThreshold: '1–2 larvae per 5 plants',
      lifeStage: '2nd instar larva',
      symptoms: [
        'Circular entry holes on fruits with protruding frass',
        'Internal fruit damage — hollowed cavity with larva inside',
        'Premature fruit drop and rotting from secondary infection',
        'Feeding on flower buds and young leaves in early stage',
      ],
      description: 'Helicoverpa armigera bores into tomato fruits rendering them unmarketable. A single larva can damage 3–5 fruits before pupating. Pheromone traps, light traps, and biological control using NPV (Nuclear Polyhedrosis Virus) are recommended IPM tools.',
    },
  ],
  Chilli: [
    {
      pestName: 'Chilli Thrips',
      scientificName: 'Scirtothrips dorsalis',
      confidence: 0.938,
      severity: 'moderate',
      pestCategory: 'insect',
      infestedArea: '25–45% of plants',
      economicThreshold: '2–3 thrips per terminal bud',
      lifeStage: 'Adult + 2nd instar nymph',
      symptoms: [
        'Silvery streaks or speckling on young leaves — typical thrips feeding damage',
        'Upward curling and distortion of terminal leaves and flower buds',
        'Stunted new growth with shortened internodes',
        'Black faecal spots on undersides of leaves',
      ],
      description: 'Scirtothrips dorsalis (Chilli Thrips) is a key vector of Capsicum chlorosis virus. It proliferates rapidly in dry and warm conditions. Blue sticky traps for monitoring, and spinosad-based bio-insecticides are effective management tools.',
    },
  ],
  Wheat: [
    {
      pestName: 'Aphid',
      scientificName: 'Schizaphis graminum / Sitobion avenae',
      confidence: 0.945,
      severity: 'moderate',
      pestCategory: 'insect',
      infestedArea: '30–50% of leaf area',
      economicThreshold: '25–50 aphids per tiller during heading',
      lifeStage: 'Mixed colony (alate + apterous adults)',
      symptoms: [
        'Dense soft-bodied colonies on leaf undersides and spikes',
        'Yellowing and wilting of heavily infested tillers',
        'Sticky honeydew attracting ants, leading to sooty mould',
        'Stunted plant growth with reduced grain fill',
      ],
      description: 'Cereal aphids cause direct damage by sap extraction and indirect damage as vectors for Barley Yellow Dwarf Virus (BYDV). Natural predators (ladybirds, lacewings) are effective biocontrol agents. Spray only at economic threshold.',
    },
  ],
};

const fallbackPest: MockPestEntry = {
  pestName: 'Unidentified Pest Damage',
  scientificName: 'Further identification required',
  confidence: 0.38,
  severity: 'mild',
  pestCategory: 'insect',
  infestedArea: 'Localised area',
  economicThreshold: 'Consult your agriculture officer',
  lifeStage: 'Unknown',
  symptoms: [
    'Signs of arthropod feeding damage detected',
    'Pattern does not match known pests with high confidence',
    'Recommend field scouting with magnification',
  ],
  description: 'The AI system detected signs consistent with pest activity, but was unable to identify the specific pest with sufficient confidence. Expert field inspection is recommended for accurate identification and appropriate management.',
};

// ============================================
// CONFIDENCE LEVEL HELPER
// ============================================

function getConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' | 'very-high' {
  if (confidence >= 0.9) return 'very-high';
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Simulates pest AI analysis of a crop image.
 *
 * RETURNS: PestIdentification (AI confidence only — no risk score).
 * The Risk Score is computed separately by the Common Risk Engine (riskEngine.ts).
 *
 * In production: replace with a real pest classification ML model endpoint.
 */
export async function analyzePest(
  input: CropDetectionInput,
  onStageUpdate: (stages: AnalysisStage[]) => void
): Promise<PestIdentification> {
  const stages = getPestAnalysisStages();

  for (let i = 0; i < stages.length; i++) {
    stages[i].status = 'running';
    onStageUpdate([...stages]);

    await new Promise(resolve => setTimeout(resolve, stages[i].durationMs));

    stages[i].status = 'complete';
    onStageUpdate([...stages]);

    await new Promise(resolve => setTimeout(resolve, 150));
  }

  const entries = mockPestDB[input.cropType];
  const entry = entries
    ? entries[Math.floor(Math.random() * entries.length)]
    : fallbackPest;

  return {
    problemType: 'pest',
    prediction: entry.pestName,
    scientificName: entry.scientificName,
    confidence: entry.confidence,
    confidenceLevel: getConfidenceLevel(entry.confidence),
    severity: entry.severity,
    pestCategory: entry.pestCategory,
    infestedArea: entry.infestedArea,
    economicThreshold: entry.economicThreshold,
    lifeStage: entry.lifeStage,
    symptoms: entry.symptoms,
    description: entry.description,
    imagePreview: input.imagePreview || '',
    analyzedAt: new Date().toISOString(),
  };
}

/** Same threshold as disease model — below this, expert review is recommended */
export const PEST_EXPERT_THRESHOLD = 0.70;

/** Pest catalog for display purposes */
export const pestCatalog = [
  {
    crop: 'Cotton',
    pests: ['American Bollworm', 'Whitefly', 'Pink Bollworm', 'Jassid', 'Aphid', 'Mealybug'],
  },
  {
    crop: 'Rice',
    pests: ['Brown Planthopper', 'Yellow Stem Borer', 'Leaf Folder', 'Gall Midge', 'Green Leafhopper'],
  },
  {
    crop: 'Tomato',
    pests: ['Tomato Fruit Borer', 'Whitefly', 'Leaf Miner', 'Spider Mite', 'Aphid'],
  },
  {
    crop: 'Chilli',
    pests: ['Chilli Thrips', 'Aphid', 'Whitefly', 'Mites'],
  },
  {
    crop: 'Wheat',
    pests: ['Aphid', 'Army Worm', 'Termite'],
  },
];

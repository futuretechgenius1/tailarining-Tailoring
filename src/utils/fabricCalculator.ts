export type GarmentCategoryGroup = 'women' | 'men' | 'bridal';

export type FabricWidthInches = 36 | 44 | 54 | 60;

export type BodySizeCode = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL';

export type HeightBand = 'petite' | 'average' | 'tall' | 'extra-tall';

export type SleeveStyle = 'sleeveless' | 'short' | 'elbow' | 'three-quarter' | 'full' | 'puff';

export type FitFullness = 'fitted' | 'standard' | 'flared' | 'extra-full';

export type PatternType = 'solid' | 'directional' | 'checks-border';

export type MeasurementUnit = 'meters' | 'yards';

export interface GarmentFabricSpec {
  id: string;
  name: string;
  shortName: string;
  group: GarmentCategoryGroup;
  /** Matching garment option id inside CustomStitchingPage */
  customStitchingGarmentId: string;
  summary: string;
  /** Base main fabric in meters for Size M, Average height, 44" fabric width, standard sleeve & fit */
  baseMetersAt44: number;
  /** Separate lining (astar) ratio of main fabric when lining is selected */
  liningRatio: number;
  liningDefault: boolean;
  /** Optional secondary piece (e.g. salwar bottom or dupatta) */
  secondaryPiece?: {
    label: string;
    baseMetersAt44: number;
    scalesWithHeight: boolean;
  };
  optionalDupattaMeters?: number;
  supportsSleeves: boolean;
  defaultSleeve: SleeveStyle;
  supportsFullness: boolean;
  fullnessLabels?: Record<FitFullness, string>;
  defaultLengthInches: number;
  minLengthInches: number;
  maxLengthInches: number;
  lengthLabel: string;
  tailorTip: string;
  recommendedFabrics: string[];
  /** Panel labels shown on the visual cut diagram */
  diagramPanels: { label: string; share: number; tone: 'primary' | 'secondary' | 'accent' }[];
}

export const GARMENT_FABRIC_SPECS: GarmentFabricSpec[] = [
  {
    id: 'blouse',
    name: 'Designer / Saree Blouse',
    shortName: 'Saree Blouse',
    group: 'women',
    customStitchingGarmentId: 'designer-blouse',
    summary: 'Tailored princess-cut, katori, or padded saree blouse with neck & sleeve customization.',
    baseMetersAt44: 0.9,
    liningRatio: 1.0,
    liningDefault: true,
    supportsSleeves: true,
    defaultSleeve: 'elbow',
    supportsFullness: false,
    defaultLengthInches: 15,
    minLengthInches: 12,
    maxLengthInches: 19,
    lengthLabel: 'Blouse Length',
    tailorTip: 'For Maggam or heavy hand-embroidery frames, add 0.25 m extra so the artisan can mount the fabric cleanly on the adda.',
    recommendedFabrics: ['Raw Silk', 'Brocade', 'Kanjivaram Silk', 'Velvet', 'Cotton Silk'],
    diagramPanels: [
      { label: 'Front & Back Bodice', share: 0.56, tone: 'primary' },
      { label: 'Sleeves', share: 0.3, tone: 'secondary' },
      { label: 'Piping & Ease', share: 0.14, tone: 'accent' },
    ],
  },
  {
    id: 'kurti',
    name: 'Custom Kurti / Tunic',
    shortName: 'Kurti',
    group: 'women',
    customStitchingGarmentId: 'kurti',
    summary: 'Straight, A-line, or high-slit daily & festive kurti stitched to your exact shoulder and bust fit.',
    baseMetersAt44: 2.1,
    liningRatio: 0.85,
    liningDefault: true,
    supportsSleeves: true,
    defaultSleeve: 'three-quarter',
    supportsFullness: true,
    fullnessLabels: {
      fitted: 'Straight Fit',
      standard: 'A-Line Cut',
      flared: 'Flared Hem',
      'extra-full': 'Double Flare / Gathered',
    },
    defaultLengthInches: 42,
    minLengthInches: 32,
    maxLengthInches: 54,
    lengthLabel: 'Kurti Length',
    tailorTip: 'Pure cotton and mulmul shrink by 5–8% on first wash — keep the pre-wash shrinkage buffer turned on.',
    recommendedFabrics: ['Cotton', 'Chanderi', 'Rayon', 'Linen', 'Silk Blend'],
    diagramPanels: [
      { label: 'Front & Back Panels', share: 0.65, tone: 'primary' },
      { label: 'Sleeves & Neck Facing', share: 0.23, tone: 'secondary' },
      { label: 'Hem & Ease', share: 0.12, tone: 'accent' },
    ],
  },
  {
    id: 'salwar-set',
    name: 'Salwar Kameez / Chudidar Set',
    shortName: 'Salwar Set',
    group: 'women',
    customStitchingGarmentId: 'chudidar',
    summary: 'Complete 2-piece or 3-piece ethnic suit including kameez top, salwar/chudidar/palazzo bottom, and optional dupatta.',
    baseMetersAt44: 2.25,
    liningRatio: 0.85,
    liningDefault: true,
    secondaryPiece: {
      label: 'Salwar / Chudidar / Palazzo Bottom',
      baseMetersAt44: 2.15,
      scalesWithHeight: true,
    },
    optionalDupattaMeters: 2.35,
    supportsSleeves: true,
    defaultSleeve: 'three-quarter',
    supportsFullness: true,
    fullnessLabels: {
      fitted: 'Straight Pant / Cigarette',
      standard: 'Classic Chudidar',
      flared: 'Wide Palazzo / Semi-Patiala',
      'extra-full': 'Full Heavy Patiala',
    },
    defaultLengthInches: 44,
    minLengthInches: 36,
    maxLengthInches: 54,
    lengthLabel: 'Kameez Length',
    tailorTip: 'For a heavy Patiala salwar, pick "Full Heavy Patiala" fullness — it automatically allocates extra bottom pleating yardage.',
    recommendedFabrics: ['Cotton Cambric', 'Chanderi Silk', 'Georgette', 'Crepe', 'Banarasi'],
    diagramPanels: [
      { label: 'Kameez Top', share: 0.44, tone: 'primary' },
      { label: 'Bottom / Salwar', share: 0.44, tone: 'secondary' },
      { label: 'Sleeves & Ease', share: 0.12, tone: 'accent' },
    ],
  },
  {
    id: 'anarkali',
    name: 'Anarkali / Kalidar Gown',
    shortName: 'Anarkali Gown',
    group: 'bridal',
    customStitchingGarmentId: 'lehenga',
    summary: 'Floor-length kalidar anarkali or festive evening gown with sweeping ghera and fitted yoke.',
    baseMetersAt44: 4.25,
    liningRatio: 0.78,
    liningDefault: true,
    optionalDupattaMeters: 2.5,
    supportsSleeves: true,
    defaultSleeve: 'full',
    supportsFullness: true,
    fullnessLabels: {
      fitted: '10-Kali Subtle Flare',
      standard: '16-Kali Classic Ghera',
      flared: '24-Kali Festive Flare',
      'extra-full': '32-Kali Bridal Grand Flare',
    },
    defaultLengthInches: 54,
    minLengthInches: 44,
    maxLengthInches: 62,
    lengthLabel: 'Gown Length',
    tailorTip: 'Choose 54" or 60" wide georgette or organza if available — wider fabric significantly reduces total meterage on kalidar flares.',
    recommendedFabrics: ['Georgette', 'Chanderi', 'Organza', 'Raw Silk', 'Chiffon'],
    diagramPanels: [
      { label: 'Kali / Skirt Flare', share: 0.68, tone: 'primary' },
      { label: 'Yoke & Sleeves', share: 0.22, tone: 'secondary' },
      { label: 'Hem & Seam Ease', share: 0.1, tone: 'accent' },
    ],
  },
  {
    id: 'lehenga',
    name: 'Bridal Lehenga Choli',
    shortName: 'Lehenga Choli',
    group: 'bridal',
    customStitchingGarmentId: 'lehenga',
    summary: 'Grand bridal or sangeet lehenga skirt paired with custom-fitted choli blouse and optional dupatta.',
    baseMetersAt44: 4.5,
    liningRatio: 0.82,
    liningDefault: true,
    secondaryPiece: {
      label: 'Matching Choli Blouse',
      baseMetersAt44: 0.95,
      scalesWithHeight: false,
    },
    optionalDupattaMeters: 2.6,
    supportsSleeves: true,
    defaultSleeve: 'elbow',
    supportsFullness: true,
    fullnessLabels: {
      fitted: 'A-Line Minimal Flare (3 m)',
      standard: 'Classic Festive Ghera (4.5 m)',
      flared: 'Heavy Kalidar Bridal (6 m)',
      'extra-full': 'Royal Double-Can-Can (7.5 m)',
    },
    defaultLengthInches: 42,
    minLengthInches: 36,
    maxLengthInches: 48,
    lengthLabel: 'Lehenga Waist-to-Floor',
    tailorTip: 'For can-can stiffness under bridal silk or velvet, request separate stiff net (usually 3.0 m) — your tailor can also supply it.',
    recommendedFabrics: ['Banarasi Brocade', 'Velvet', 'Raw Silk', 'Tissue Organza', 'Net'],
    diagramPanels: [
      { label: 'Lehenga Skirt Panels', share: 0.66, tone: 'primary' },
      { label: 'Choli Blouse', share: 0.22, tone: 'secondary' },
      { label: 'Waistband & Borders', share: 0.12, tone: 'accent' },
    ],
  },
  {
    id: 'dress',
    name: 'Tailored Midi / Maxi Dress',
    shortName: 'Midi / Maxi Dress',
    group: 'women',
    customStitchingGarmentId: 'kurti',
    summary: 'Structured wrap dress, tiered maxi, or tailored shift dress with clean darts and concealed zip.',
    baseMetersAt44: 2.6,
    liningRatio: 0.8,
    liningDefault: true,
    supportsSleeves: true,
    defaultSleeve: 'short',
    supportsFullness: true,
    fullnessLabels: {
      fitted: 'Shift / Sheath Silhouette',
      standard: 'A-Line Everyday Drape',
      flared: 'Pleated / Tiered Skirt',
      'extra-full': 'Full Circle Maxi',
    },
    defaultLengthInches: 46,
    minLengthInches: 34,
    maxLengthInches: 58,
    lengthLabel: 'Shoulder-to-Hem Length',
    tailorTip: 'Bias-cut or full-circle dresses consume extra fabric along the diagonal — keep the flare setting accurate for your design.',
    recommendedFabrics: ['Linen', 'Cotton Poplin', 'Satin', 'Viscose Crepe', 'Silk'],
    diagramPanels: [
      { label: 'Bodice & Skirt Panels', share: 0.68, tone: 'primary' },
      { label: 'Sleeves & Facings', share: 0.21, tone: 'secondary' },
      { label: 'Hem Allowance', share: 0.11, tone: 'accent' },
    ],
  },
  {
    id: 'mens-shirt',
    name: "Men's Bespoke Shirt",
    shortName: "Men's Shirt",
    group: 'men',
    customStitchingGarmentId: 'mens-shirt',
    summary: 'Crisp office formal or relaxed linen shirt with custom collar spread, cuff style, and placket.',
    baseMetersAt44: 1.85,
    liningRatio: 0,
    liningDefault: false,
    supportsSleeves: true,
    defaultSleeve: 'full',
    supportsFullness: true,
    fullnessLabels: {
      fitted: 'Slim Tailored Fit',
      standard: 'Classic Regular Fit',
      flared: 'Relaxed Comfort Fit',
      'extra-full': 'Oversized Resort Cut',
    },
    defaultLengthInches: 30,
    minLengthInches: 26,
    maxLengthInches: 35,
    lengthLabel: 'Shirt Length',
    tailorTip: 'For fine checks or pinstripes, enable "Checks / Stripes" matching so pockets, yokes, and cuffs align seamlessly.',
    recommendedFabrics: ['Egyptian Cotton', 'Giza Poplin', 'Irish Linen', 'Oxford Weave', 'Twill'],
    diagramPanels: [
      { label: 'Front, Back & Yoke', share: 0.56, tone: 'primary' },
      { label: 'Sleeves & Cuffs', share: 0.32, tone: 'secondary' },
      { label: 'Collar & Placket', share: 0.12, tone: 'accent' },
    ],
  },
  {
    id: 'mens-trouser',
    name: "Men's Tailored Trousers",
    shortName: "Men's Trousers",
    group: 'men',
    customStitchingGarmentId: 'mens-trouser',
    summary: 'Single-pleat, flat-front, or Gurkha trousers with custom rise, taper, and cuff finish.',
    baseMetersAt44: 1.55,
    liningRatio: 0.5,
    liningDefault: false,
    supportsSleeves: false,
    defaultSleeve: 'sleeveless',
    supportsFullness: true,
    fullnessLabels: {
      fitted: 'Slim Tapered Flat-Front',
      standard: 'Classic Straight Cut',
      flared: 'Double-Pleated Classic',
      'extra-full': 'Wide Gurkha / Turn-Up Cuff',
    },
    defaultLengthInches: 41,
    minLengthInches: 36,
    maxLengthInches: 47,
    lengthLabel: 'Outseam Length',
    tailorTip: 'Most suiting wool & poly-viscose bolts come in 54"–60" width — switch Fabric Width to 54" or 60" for accurate suiting meterage (usually 1.25–1.40 m).',
    recommendedFabrics: ['Wool Worsted', 'Linen Suiting', 'Cotton Chino', 'Poly-Viscose', 'Tropical Wool'],
    diagramPanels: [
      { label: 'Front & Back Legs', share: 0.74, tone: 'primary' },
      { label: 'Waistband & Fly', share: 0.15, tone: 'secondary' },
      { label: 'Turn-Up & Ease', share: 0.11, tone: 'accent' },
    ],
  },
  {
    id: 'mens-kurta',
    name: "Men's Festive Kurta Pyjama",
    shortName: 'Kurta Pyjama',
    group: 'men',
    customStitchingGarmentId: 'mens-kurta',
    summary: 'Festive silk or chikankari kurta paired with tailored churidar, Aligarhi pyjama, or straight pant.',
    baseMetersAt44: 2.35,
    liningRatio: 0.85,
    liningDefault: false,
    secondaryPiece: {
      label: 'Matching Pyjama / Churidar Bottom',
      baseMetersAt44: 2.0,
      scalesWithHeight: true,
    },
    supportsSleeves: true,
    defaultSleeve: 'full',
    supportsFullness: true,
    fullnessLabels: {
      fitted: 'Tailored Slim Kurta',
      standard: 'Classic Straight Kurta',
      flared: 'Pathani / Relaxed Drape',
      'extra-full': 'Asymmetric / Layered Kurta',
    },
    defaultLengthInches: 42,
    minLengthInches: 36,
    maxLengthInches: 48,
    lengthLabel: 'Kurta Length',
    tailorTip: 'Raw silk and jacquard kurtas feel far more comfortable in warm weather when paired with a breathable soft cotton lining.',
    recommendedFabrics: ['Raw Silk', 'Chikankari Cotton', 'Tussar Silk', 'Linen', 'Jacquard'],
    diagramPanels: [
      { label: 'Kurta Body & Sleeves', share: 0.52, tone: 'primary' },
      { label: 'Pyjama / Churidar', share: 0.38, tone: 'secondary' },
      { label: 'Mandarin Collar & Ease', share: 0.1, tone: 'accent' },
    ],
  },
  {
    id: 'mens-suit',
    name: "Men's 2-Piece Suit / Bandhgala",
    shortName: '2-Piece Suit',
    group: 'bridal',
    customStitchingGarmentId: 'mens-kurta',
    summary: 'Structured tailored jacket or Bandhgala blazer with matching trousers and inner bemberg lining.',
    baseMetersAt44: 3.65,
    liningRatio: 0.65,
    liningDefault: true,
    supportsSleeves: false,
    defaultSleeve: 'full',
    supportsFullness: true,
    fullnessLabels: {
      fitted: 'Single-Breasted Slim',
      standard: 'Single-Breasted Classic',
      flared: 'Bandhgala / Nehru Jacket Set',
      'extra-full': 'Double-Breasted Peak Lapel',
    },
    defaultLengthInches: 30,
    minLengthInches: 27,
    maxLengthInches: 35,
    lengthLabel: 'Jacket Length',
    tailorTip: 'Standard suiting cloth is 58"–60" wide, where a classic 2-piece suit takes 3.00–3.25 m. For double-breasted or plaid checks, keep 0.25–0.50 m extra.',
    recommendedFabrics: ['Super 120s Wool', 'Raymond Suiting', 'Linen Wool Blend', 'Velvet', 'Tweed'],
    diagramPanels: [
      { label: 'Jacket Body & Lapels', share: 0.48, tone: 'primary' },
      { label: 'Matching Trousers', share: 0.38, tone: 'secondary' },
      { label: 'Sleeves & Collar', share: 0.14, tone: 'accent' },
    ],
  },
];

export const FABRIC_WIDTH_OPTIONS: {
  inches: FabricWidthInches;
  cm: number;
  label: string;
  note: string;
}[] = [
  { inches: 36, cm: 90, label: '36" (90 cm)', note: 'Handloom / Narrow Silk' },
  { inches: 44, cm: 112, label: '44" (112 cm)', note: 'Standard Dress Fabric' },
  { inches: 54, cm: 137, label: '54" (137 cm)', note: 'Wide Linen / Rayon' },
  { inches: 60, cm: 150, label: '60" (150 cm)', note: 'Suiting / Wide Bolt' },
];

export const SIZE_MULTIPLIERS: Record<BodySizeCode, { factor: number; chestLabel: string }> = {
  XS: { factor: 0.9, chestLabel: '32"–34"' },
  S: { factor: 0.95, chestLabel: '34"–36"' },
  M: { factor: 1.0, chestLabel: '36"–38"' },
  L: { factor: 1.08, chestLabel: '38"–40"' },
  XL: { factor: 1.16, chestLabel: '40"–42"' },
  XXL: { factor: 1.25, chestLabel: '42"–46"' },
  '3XL': { factor: 1.35, chestLabel: '46"–50"' },
};

export const HEIGHT_MULTIPLIERS: Record<HeightBand, { factor: number; label: string; range: string }> = {
  petite: { factor: 0.94, label: 'Petite', range: 'Under 5\'2"' },
  average: { factor: 1.0, label: 'Average', range: '5\'2" – 5\'7"' },
  tall: { factor: 1.07, label: 'Tall', range: '5\'8" – 6\'0"' },
  'extra-tall': { factor: 1.14, label: 'Extra Tall', range: 'Above 6\'0"' },
};

export const SLEEVE_DELTAS_METERS: Record<SleeveStyle, { delta: number; label: string }> = {
  sleeveless: { delta: -0.22, label: 'Sleeveless' },
  short: { delta: -0.08, label: 'Short / Cap' },
  elbow: { delta: 0.08, label: 'Elbow Length' },
  'three-quarter': { delta: 0.16, label: '3/4th Sleeve' },
  full: { delta: 0.28, label: 'Full Sleeve' },
  puff: { delta: 0.35, label: 'Puff / Bell Sleeve' },
};

const WIDTH_CONVERSION_FROM_44: Record<FabricWidthInches, number> = {
  36: 1.22,
  44: 1.0,
  54: 0.86,
  60: 0.79,
};

const FULLNESS_MULTIPLIER: Record<FitFullness, number> = {
  fitted: 0.88,
  standard: 1.0,
  flared: 1.24,
  'extra-full': 1.48,
};

const PATTERN_ALLOWANCE: Record<PatternType, { pct: number; label: string; detail: string }> = {
  solid: { pct: 0, label: 'Solid / All-Over Print', detail: 'No directional waste' },
  directional: { pct: 0.1, label: 'Directional / Velvet / Nap', detail: '+10% one-way cut' },
  'checks-border': { pct: 0.15, label: 'Checks / Stripes / Border', detail: '+15% motif alignment' },
};

export const PATTERN_OPTIONS = PATTERN_ALLOWANCE;

export interface FabricCalcInput {
  garmentId: string;
  size: BodySizeCode;
  heightBand: HeightBand;
  fabricWidth: FabricWidthInches;
  sleeveStyle: SleeveStyle;
  fullness: FitFullness;
  customLengthInches: number;
  patternType: PatternType;
  includeShrinkage: boolean;
  includeLining: boolean;
  includeSecondaryPiece: boolean;
  includeDupatta: boolean;
  quantity: number;
}

export interface FabricCalcResult {
  garment: GarmentFabricSpec;
  /** Exact raw main fabric (meters) for 1 garment before rounding */
  rawMainMeters: number;
  /** Practical bolt-cut recommendation rounded up to nearest 0.25m for 1 garment */
  recommendedMainMeters: number;
  /** Secondary piece (bottom/blouse) recommended meters for 1 garment */
  secondaryMeters: number;
  /** Optional dupatta meters */
  dupattaMeters: number;
  /** Separate lining (astar) meters at 44" standard lining width */
  liningMeters: number;
  /** Combined main + secondary fabric for 1 garment (when stitched from same fabric) */
  totalPrimarySetMeters: number;
  /** Multiplied by quantity */
  totalOrderMainMeters: number;
  totalOrderLiningMeters: number;
  totalOrderDupattaMeters: number;
  breakdown: {
    baseMeters: number;
    sizeAndHeightDelta: number;
    sleeveAndLengthDelta: number;
    fullnessDelta: number;
    widthAdjustmentDelta: number;
    patternAndShrinkageDelta: number;
  };
}

export function roundUpQuarter(val: number): number {
  if (val <= 0) return 0;
  return Math.ceil(val * 4) / 4;
}

export function metersToYards(meters: number): number {
  return meters * 1.09361;
}

export function formatFabricLength(meters: number, unit: MeasurementUnit): string {
  if (unit === 'yards') {
    const yd = roundUpQuarter(metersToYards(meters));
    return `${yd.toFixed(2)} yd`;
  }
  return `${meters.toFixed(2)} m`;
}

export function formatSecondaryUnit(meters: number, unit: MeasurementUnit): string {
  if (unit === 'yards') {
    return `${meters.toFixed(2)} m`;
  }
  return `${roundUpQuarter(metersToYards(meters)).toFixed(2)} yd`;
}

export function calculateFabricRequirement(input: FabricCalcInput): FabricCalcResult {
  const garment =
    GARMENT_FABRIC_SPECS.find((g) => g.id === input.garmentId) || GARMENT_FABRIC_SPECS[0];

  const qty = Math.max(1, Math.min(20, Math.round(input.quantity || 1)));
  const sizeFactor = SIZE_MULTIPLIERS[input.size].factor;
  const heightFactor = HEIGHT_MULTIPLIERS[input.heightBand].factor;
  const widthFactor = WIDTH_CONVERSION_FROM_44[input.fabricWidth];
  const fullnessFactor = garment.supportsFullness ? FULLNESS_MULTIPLIER[input.fullness] : 1.0;

  // Base calculation for main piece at 44"
  const baseMeters = garment.baseMetersAt44;

  // Size + height adjustment
  const afterSizeHeight = baseMeters * sizeFactor * heightFactor;
  const sizeAndHeightDelta = afterSizeHeight - baseMeters;

  // Sleeve adjustment (relative to garment's default sleeve)
  const sleeveDelta = garment.supportsSleeves
    ? SLEEVE_DELTAS_METERS[input.sleeveStyle].delta -
      SLEEVE_DELTAS_METERS[garment.defaultSleeve].delta
    : 0;

  // Custom garment length adjustment (each extra 4 inches of garment length adds ~0.22m on 44" bolt, front+back)
  const lengthDiffInches = input.customLengthInches - garment.defaultLengthInches;
  const lengthDelta = (lengthDiffInches / 4) * (garment.id === 'blouse' ? 0.14 : 0.22);
  const sleeveAndLengthDelta = sleeveDelta + lengthDelta;

  const afterSleeveLen = Math.max(0.55, afterSizeHeight + sleeveAndLengthDelta);

  // Fullness / flare adjustment
  const afterFullness = afterSleeveLen * fullnessFactor;
  const fullnessDelta = afterFullness - afterSleeveLen;

  // Fabric bolt width conversion
  const afterWidth = afterFullness * widthFactor;
  const widthAdjustmentDelta = afterWidth - afterFullness;

  // Pattern matching + pre-wash shrinkage
  const patternPct = PATTERN_ALLOWANCE[input.patternType].pct;
  const shrinkagePct = input.includeShrinkage ? 0.08 : 0;
  const rawMainMeters = afterWidth * (1 + patternPct + shrinkagePct);
  const patternAndShrinkageDelta = rawMainMeters - afterWidth;

  const recommendedMainMeters = Math.max(0.75, roundUpQuarter(rawMainMeters));

  // Secondary piece (e.g., salwar bottom or choli blouse)
  let secondaryMeters = 0;
  if (garment.secondaryPiece && input.includeSecondaryPiece) {
    const secBase = garment.secondaryPiece.baseMetersAt44;
    const secHeight = garment.secondaryPiece.scalesWithHeight ? heightFactor : 1.0;
    // For salwar sets, fullness strongly affects the bottom (Patiala vs straight pant)
    const secFullness =
      garment.id === 'salwar-set'
        ? input.fullness === 'extra-full'
          ? 1.45
          : input.fullness === 'flared'
            ? 1.2
            : input.fullness === 'fitted'
              ? 0.9
              : 1.0
        : 1.0;
    const secRaw =
      secBase *
      (0.5 + 0.5 * sizeFactor) *
      secHeight *
      secFullness *
      widthFactor *
      (1 + patternPct * 0.5 + shrinkagePct);
    secondaryMeters = Math.max(0.75, roundUpQuarter(secRaw));
  }

  // Optional dupatta
  const dupattaMeters =
    garment.optionalDupattaMeters && input.includeDupatta ? garment.optionalDupattaMeters : 0;

  // Lining (astar) is almost always sold in 36"–44" width regardless of outer fabric width
  let liningMeters = 0;
  if (input.includeLining && garment.liningRatio > 0) {
    const rawLining =
      (afterFullness * garment.liningRatio + (garment.id === 'lehenga' ? 0.85 : 0)) *
      (1 + (input.includeShrinkage ? 0.06 : 0));
    liningMeters = Math.max(0.75, roundUpQuarter(rawLining));
  }

  const totalPrimarySetMeters = recommendedMainMeters + secondaryMeters;

  return {
    garment,
    rawMainMeters,
    recommendedMainMeters,
    secondaryMeters,
    dupattaMeters,
    liningMeters,
    totalPrimarySetMeters,
    totalOrderMainMeters: totalPrimarySetMeters * qty,
    totalOrderLiningMeters: liningMeters * qty,
    totalOrderDupattaMeters: dupattaMeters * qty,
    breakdown: {
      baseMeters,
      sizeAndHeightDelta,
      sleeveAndLengthDelta,
      fullnessDelta,
      widthAdjustmentDelta,
      patternAndShrinkageDelta,
    },
  };
}

/** Infer BodySizeCode from a saved measurement profile's chest/bust value */
export function inferSizeFromMeasurements(values: Record<string, string>): BodySizeCode | null {
  const raw =
    values.Bust ||
    values.bust ||
    values.Chest ||
    values.chest ||
    values['Chest / Bust'] ||
    '';
  const match = raw.match(/\d+(\.\d+)?/);
  if (!match) return null;
  const inches = parseFloat(match[0]);
  if (!Number.isFinite(inches) || inches < 26 || inches > 60) return null;
  if (inches < 33) return 'XS';
  if (inches < 35.5) return 'S';
  if (inches < 38) return 'M';
  if (inches < 40.5) return 'L';
  if (inches < 43) return 'XL';
  if (inches < 46.5) return 'XXL';
  return '3XL';
}

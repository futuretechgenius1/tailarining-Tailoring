import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Copy,
  Info,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Ruler,
  Scissors,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { FabricBookingPreset, MeasurementProfile, PageRoute } from '../types';
import {
  BodySizeCode,
  FABRIC_WIDTH_OPTIONS,
  FabricWidthInches,
  FitFullness,
  GARMENT_FABRIC_SPECS,
  GarmentCategoryGroup,
  HEIGHT_MULTIPLIERS,
  HeightBand,
  MeasurementUnit,
  PATTERN_OPTIONS,
  PatternType,
  SIZE_MULTIPLIERS,
  SLEEVE_DELTAS_METERS,
  SleeveStyle,
  calculateFabricRequirement,
  formatFabricLength,
  formatSecondaryUnit,
  inferSizeFromMeasurements,
} from '../utils/fabricCalculator';

interface FabricCalculatorPageProps {
  measurements: MeasurementProfile[];
  onProceedToBooking: (preset: FabricBookingPreset) => void;
  onNavigate: (page: PageRoute) => void;
  onNotifyToast: (msg: string) => void;
}

interface SavedShoppingItem {
  id: string;
  garmentName: string;
  garmentOptionId: string;
  specSummary: string;
  fabricWidth: FabricWidthInches;
  quantity: number;
  mainMeters: number;
  secondaryLabel?: string;
  secondaryMeters: number;
  liningMeters: number;
  dupattaMeters: number;
  includeLining: boolean;
}

const CATEGORY_TABS: { id: 'all' | GarmentCategoryGroup; label: string }[] = [
  { id: 'all', label: 'All Garments' },
  { id: 'women', label: "Women's Couture" },
  { id: 'men', label: "Men's Bespoke" },
  { id: 'bridal', label: 'Bridal & Occasion' },
];

const BODY_SIZES: BodySizeCode[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const HEIGHT_BANDS: HeightBand[] = ['petite', 'average', 'tall', 'extra-tall'];
const SLEEVE_STYLES: SleeveStyle[] = [
  'sleeveless',
  'short',
  'elbow',
  'three-quarter',
  'full',
  'puff',
];
const FULLNESS_LEVELS: FitFullness[] = ['fitted', 'standard', 'flared', 'extra-full'];
const PATTERN_TYPES: PatternType[] = ['solid', 'directional', 'checks-border'];

function formatSignedDelta(deltaMeters: number, unit: MeasurementUnit): string {
  const rounded = Math.round(deltaMeters * 100) / 100;
  if (Math.abs(rounded) < 0.01) return '0.00';
  const sign = rounded > 0 ? '+' : '−';
  const absVal = Math.abs(rounded);
  if (unit === 'yards') {
    return `${sign}${(absVal * 1.09361).toFixed(2)} yd`;
  }
  return `${sign}${absVal.toFixed(2)} m`;
}

export const FabricCalculatorPage: React.FC<FabricCalculatorPageProps> = ({
  measurements,
  onProceedToBooking,
  onNavigate,
  onNotifyToast,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | GarmentCategoryGroup>('all');
  const [unit, setUnit] = useState<MeasurementUnit>('meters');
  const [garmentId, setGarmentId] = useState<string>(GARMENT_FABRIC_SPECS[0].id);
  const [size, setSize] = useState<BodySizeCode>('M');
  const [heightBand, setHeightBand] = useState<HeightBand>('average');
  const [fabricWidth, setFabricWidth] = useState<FabricWidthInches>(44);
  const [sleeveStyle, setSleeveStyle] = useState<SleeveStyle>(GARMENT_FABRIC_SPECS[0].defaultSleeve);
  const [fullness, setFullness] = useState<FitFullness>('standard');
  const [customLengthInches, setCustomLengthInches] = useState<number>(
    GARMENT_FABRIC_SPECS[0].defaultLengthInches,
  );
  const [patternType, setPatternType] = useState<PatternType>('solid');
  const [includeShrinkage, setIncludeShrinkage] = useState<boolean>(true);
  const [includeLining, setIncludeLining] = useState<boolean>(GARMENT_FABRIC_SPECS[0].liningDefault);
  const [includeSecondaryPiece, setIncludeSecondaryPiece] = useState<boolean>(true);
  const [includeDupatta, setIncludeDupatta] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(true);
  const [copiedSingle, setCopiedSingle] = useState<boolean>(false);
  const [shoppingList, setShoppingList] = useState<SavedShoppingItem[]>([]);

  const visibleGarments = useMemo(
    () =>
      categoryFilter === 'all'
        ? GARMENT_FABRIC_SPECS
        : GARMENT_FABRIC_SPECS.filter((g) => g.group === categoryFilter),
    [categoryFilter],
  );

  const selectedGarment = useMemo(
    () => GARMENT_FABRIC_SPECS.find((g) => g.id === garmentId) || GARMENT_FABRIC_SPECS[0],
    [garmentId],
  );

  const handleSelectGarment = (nextId: string) => {
    const spec = GARMENT_FABRIC_SPECS.find((g) => g.id === nextId);
    if (!spec) return;
    setGarmentId(spec.id);
    setSleeveStyle(spec.defaultSleeve);
    setFullness('standard');
    setCustomLengthInches(spec.defaultLengthInches);
    setIncludeLining(spec.liningDefault);
    setIncludeSecondaryPiece(Boolean(spec.secondaryPiece));
    setIncludeDupatta(false);
    // Switch to 54" automatically for trousers & suits since suiting bolts are wider, else 44"
    if (spec.id === 'mens-trouser' || spec.id === 'mens-suit') {
      setFabricWidth(54);
    } else if (fabricWidth === 54 || fabricWidth === 60) {
      setFabricWidth(44);
    }
  };

  const handleApplyProfile = (profile: MeasurementProfile) => {
    setActiveProfileId(profile.id);
    const inferredSize = inferSizeFromMeasurements(profile.values);
    if (inferredSize) {
      setSize(inferredSize);
    }

    // Match garment category heuristically if user clicks a blouse/trouser/shirt profile
    const typeLower = profile.garmentType.toLowerCase();
    if (typeLower.includes('blouse')) {
      handleSelectGarment('blouse');
    } else if (typeLower.includes('trouser')) {
      handleSelectGarment('mens-trouser');
    } else if (typeLower.includes('shirt')) {
      handleSelectGarment('mens-shirt');
    } else if (typeLower.includes('kurti') || typeLower.includes('salwar')) {
      handleSelectGarment('salwar-set');
    }

    onNotifyToast(
      inferredSize
        ? `Applied "${profile.label}" — auto-selected Size ${inferredSize}.`
        : `Selected "${profile.label}". Confirm your size & length below.`,
    );
  };

  const handleReset = () => {
    setSize('M');
    setHeightBand('average');
    setFabricWidth(
      selectedGarment.id === 'mens-trouser' || selectedGarment.id === 'mens-suit' ? 54 : 44,
    );
    setSleeveStyle(selectedGarment.defaultSleeve);
    setFullness('standard');
    setCustomLengthInches(selectedGarment.defaultLengthInches);
    setPatternType('solid');
    setIncludeShrinkage(true);
    setIncludeLining(selectedGarment.liningDefault);
    setIncludeSecondaryPiece(Boolean(selectedGarment.secondaryPiece));
    setIncludeDupatta(false);
    setQuantity(1);
    setActiveProfileId(null);
    onNotifyToast('Calculator reset to standard tailoring defaults.');
  };

  const result = useMemo(
    () =>
      calculateFabricRequirement({
        garmentId: selectedGarment.id,
        size,
        heightBand,
        fabricWidth,
        sleeveStyle,
        fullness,
        customLengthInches,
        patternType,
        includeShrinkage,
        includeLining,
        includeSecondaryPiece,
        includeDupatta,
        quantity,
      }),
    [
      selectedGarment.id,
      size,
      heightBand,
      fabricWidth,
      sleeveStyle,
      fullness,
      customLengthInches,
      patternType,
      includeShrinkage,
      includeLining,
      includeSecondaryPiece,
      includeDupatta,
      quantity,
    ],
  );

  const buildPlainTextSummary = (): string => {
    const parts: string[] = [
      `Fabric Plan: ${selectedGarment.name} (Qty ${quantity})`,
      `Specs: Size ${size} · ${HEIGHT_MULTIPLIERS[heightBand].label} · ${customLengthInches}" length · ${fabricWidth}" bolt width`,
    ];
    if (selectedGarment.supportsSleeves) {
      parts.push(`Sleeve: ${SLEEVE_DELTAS_METERS[sleeveStyle].label}`);
    }
    if (selectedGarment.supportsFullness && selectedGarment.fullnessLabels) {
      parts.push(`Cut/Flare: ${selectedGarment.fullnessLabels[fullness]}`);
    }
    parts.push(
      `Main Fabric: ${formatFabricLength(result.recommendedMainMeters * quantity, unit)} (${formatSecondaryUnit(result.recommendedMainMeters * quantity, unit)})`,
    );
    if (result.secondaryMeters > 0 && selectedGarment.secondaryPiece) {
      parts.push(
        `${selectedGarment.secondaryPiece.label}: ${formatFabricLength(result.secondaryMeters * quantity, unit)}`,
      );
    }
    if (result.liningMeters > 0) {
      parts.push(`Lining (Astar, 44"): ${formatFabricLength(result.totalOrderLiningMeters, unit)}`);
    }
    if (result.dupattaMeters > 0) {
      parts.push(`Dupatta: ${formatFabricLength(result.totalOrderDupattaMeters, unit)}`);
    }
    if (includeShrinkage) {
      parts.push('Includes +8% pre-wash shrinkage allowance');
    }
    return parts.join(' | ');
  };

  const handleCopySummary = async () => {
    const text = buildPlainTextSummary();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSingle(true);
      onNotifyToast('Fabric cut plan copied to clipboard.');
      setTimeout(() => setCopiedSingle(false), 2200);
    } catch {
      onNotifyToast('Plan ready — use "Book Custom Stitching" to attach it directly.');
    }
  };

  const handleAddToShoppingList = () => {
    const specBits = [
      `Size ${size}`,
      `${fabricWidth}" width`,
      `${customLengthInches}" len`,
      selectedGarment.supportsSleeves ? SLEEVE_DELTAS_METERS[sleeveStyle].label : null,
      quantity > 1 ? `Qty ${quantity}` : null,
    ].filter(Boolean);

    const newItem: SavedShoppingItem = {
      id: `fab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      garmentName: selectedGarment.name,
      garmentOptionId: selectedGarment.customStitchingGarmentId,
      specSummary: specBits.join(' · '),
      fabricWidth,
      quantity,
      mainMeters: result.recommendedMainMeters * quantity,
      secondaryLabel: selectedGarment.secondaryPiece?.label,
      secondaryMeters: result.secondaryMeters * quantity,
      liningMeters: result.totalOrderLiningMeters,
      dupattaMeters: result.totalOrderDupattaMeters,
      includeLining: result.liningMeters > 0,
    };

    setShoppingList((prev) => [newItem, ...prev]);
    onNotifyToast(`Added ${selectedGarment.shortName} to your Fabric Shopping List.`);
  };

  const handleRemoveShoppingItem = (id: string) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  };

  const shoppingTotals = useMemo(() => {
    return shoppingList.reduce(
      (acc, item) => ({
        mainAndSecondary: acc.mainAndSecondary + item.mainMeters + item.secondaryMeters,
        lining: acc.lining + item.liningMeters,
        dupatta: acc.dupatta + item.dupattaMeters,
        garments: acc.garments + item.quantity,
      }),
      { mainAndSecondary: 0, lining: 0, dupatta: 0, garments: 0 },
    );
  }, [shoppingList]);

  const handleCopyShoppingList = async () => {
    if (shoppingList.length === 0) return;
    const lines = [
      'TAILERING FABRIC SHOPPING CHECKLIST',
      ...shoppingList.map(
        (item, idx) =>
          `${idx + 1}. ${item.garmentName} (${item.specSummary}) — Main: ${formatFabricLength(item.mainMeters, unit)}${
            item.secondaryMeters > 0
              ? `, ${item.secondaryLabel || 'Bottom'}: ${formatFabricLength(item.secondaryMeters, unit)}`
              : ''
          }${item.liningMeters > 0 ? `, Lining: ${formatFabricLength(item.liningMeters, unit)}` : ''}${
            item.dupattaMeters > 0 ? `, Dupatta: ${formatFabricLength(item.dupattaMeters, unit)}` : ''
          }`,
      ),
      `TOTAL OUTER FABRIC: ${formatFabricLength(shoppingTotals.mainAndSecondary, unit)} | TOTAL LINING: ${formatFabricLength(shoppingTotals.lining, unit)}${
        shoppingTotals.dupatta > 0
          ? ` | TOTAL DUPATTA: ${formatFabricLength(shoppingTotals.dupatta, unit)}`
          : ''
      }`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      onNotifyToast('Full fabric shopping checklist copied to clipboard.');
    } catch {
      onNotifyToast('Could not access clipboard — please copy from the summary below.');
    }
  };

  const handleProceedToBooking = () => {
    const preset: FabricBookingPreset = {
      garmentOptionId: selectedGarment.customStitchingGarmentId,
      garmentLabel: selectedGarment.name,
      includeLining: result.liningMeters > 0,
      summaryNote: buildPlainTextSummary(),
    };
    onProceedToBooking(preset);
  };

  // Compute proportional panel widths for the SVG bolt diagram
  const boltDiagramPanels = useMemo(() => {
    let cursor = 0;
    return selectedGarment.diagramPanels.map((panel) => {
      const start = cursor;
      cursor += panel.share;
      return { ...panel, start };
    });
  }, [selectedGarment.diagramPanels]);

  const primaryCutForDiagram =
    result.secondaryMeters > 0 ? result.totalPrimarySetMeters : result.recommendedMainMeters;

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 sm:py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#EAE0FA]">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6B21D9]">
            <Ruler className="w-3.5 h-3.5" />
            TAILOR-CALIBRATED YARDAGE PLANNER
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#1A103D] font-serif-accent text-balance">
            Fabric Requirements Calculator
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-1.5 leading-relaxed">
            Estimate exact fabric length before you shop — calibrated for Indian &amp; bespoke
            widths (36&Prime;–60&Prime;), garment length, sleeves, flare, lining, and shrinkage.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-end shrink-0">
          {/* Unit Switch */}
          <div
            role="group"
            aria-label="Measurement unit"
            className="inline-flex items-center bg-white border border-[#CBD5E1] rounded-xl p-1"
          >
            <button
              type="button"
              onClick={() => setUnit('meters')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer min-h-[36px] ${
                unit === 'meters'
                  ? 'bg-[#1A103D] text-white'
                  : 'text-[#475569] hover:text-[#1A103D]'
              }`}
            >
              Meters (m)
            </button>
            <button
              type="button"
              onClick={() => setUnit('yards')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer min-h-[36px] ${
                unit === 'yards'
                  ? 'bg-[#1A103D] text-white'
                  : 'text-[#475569] hover:text-[#1A103D]'
              }`}
            >
              Yards (yd)
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 bg-white border border-[#CBD5E1] hover:border-[#6B21D9] text-[#334155] hover:text-[#1A103D] px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Saved Measurement Profile Quick-Fill Strip */}
      {measurements.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EAE0FA] px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#F4EEFF] border border-[#DCD0F5] text-[#6B21D9] flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#1A103D]">
                Auto-fill from Saved Measurements
              </p>
              <p className="text-[11px] text-[#64748B] truncate">
                Select a saved profile to infer your body size and garment type automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0">
            {measurements.slice(0, 4).map((prof) => {
              const active = activeProfileId === prof.id;
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => handleApplyProfile(prof)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer min-h-[38px] ${
                    active
                      ? 'bg-[#6B21D9] border-[#6B21D9] text-white'
                      : 'bg-[#FAF8FF] border-[#EAE0FA] text-[#1A103D] hover:border-[#6B21D9]'
                  }`}
                >
                  {prof.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onNavigate('measurements')}
              className="text-xs font-semibold text-[#6B21D9] hover:underline whitespace-nowrap shrink-0 px-1.5 cursor-pointer"
            >
              Manage
            </button>
          </div>
        </div>
      )}

      {/* Main Split Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Interactive Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Garment Selection */}
          <section className="bg-white rounded-2xl border border-[#EAE0FA] p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#1A103D] font-serif-accent">
                  1. Choose Garment Type
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Pick the garment you plan to stitch so seam allowances and panel layouts match.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#64748B] tabular-nums shrink-0">
                {visibleGarments.length} garments
              </span>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#F1F5F9]">
              {CATEGORY_TABS.map((tab) => {
                const active = categoryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer min-h-[38px] ${
                      active
                        ? 'bg-[#1A103D] text-white'
                        : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#1A103D]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Garment Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleGarments.map((item) => {
                const active = selectedGarment.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectGarment(item.id)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-[#F4EEFF] border-[#6B21D9] ring-1 ring-[#6B21D9]/25'
                        : 'bg-white border-[#EAE0FA] hover:border-[#6B21D9]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-[#1A103D] leading-snug">{item.name}</p>
                      <span
                        className={`text-xs font-bold tabular-nums whitespace-nowrap shrink-0 ${
                          active ? 'text-[#6B21D9]' : 'text-[#475569]'
                        }`}
                      >
                        ~{formatFabricLength(item.baseMetersAt44, unit)}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#64748B] mt-1.5 line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>
                    <p className="text-[11px] font-medium text-[#64748B] mt-2">
                      Base 44&Prime; bolt · Default {item.defaultLengthInches}&Prime; length
                      {item.secondaryPiece ? ' · 2-piece set' : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: Size, Height, Garment Length & Quantity */}
          <section className="bg-white rounded-2xl border border-[#EAE0FA] p-5 sm:p-6 space-y-5">
            <h2 className="text-base font-bold text-[#1A103D] font-serif-accent">
              2. Body Size, Height &amp; Garment Length
            </h2>

            {/* Body Size Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#334155]">Body Size (Bust / Chest)</span>
                <span className="text-[#64748B] tabular-nums">
                  Selected: <strong className="text-[#1A103D]">{size}</strong> (
                  {SIZE_MULTIPLIERS[size].chestLabel})
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {BODY_SIZES.map((code) => {
                  const active = size === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setSize(code)}
                      className={`py-2.5 px-1.5 rounded-xl border text-center transition-all cursor-pointer min-h-[52px] flex flex-col items-center justify-center ${
                        active
                          ? 'bg-[#1A103D] border-[#1A103D] text-white'
                          : 'bg-white border-[#EAE0FA] text-[#1A103D] hover:border-[#6B21D9]'
                      }`}
                    >
                      <span className="text-xs font-extrabold">{code}</span>
                      <span
                        className={`text-[10px] mt-0.5 tabular-nums ${
                          active ? 'text-[#CBD5E1]' : 'text-[#64748B]'
                        }`}
                      >
                        {SIZE_MULTIPLIERS[code].chestLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Height Band */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-[#334155]">Height Profile</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {HEIGHT_BANDS.map((band) => {
                  const active = heightBand === band;
                  const meta = HEIGHT_MULTIPLIERS[band];
                  return (
                    <button
                      key={band}
                      type="button"
                      onClick={() => setHeightBand(band)}
                      className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[52px] ${
                        active
                          ? 'bg-[#F4EEFF] border-[#6B21D9] ring-1 ring-[#6B21D9]/20'
                          : 'bg-white border-[#EAE0FA] hover:border-[#6B21D9]/50'
                      }`}
                    >
                      <p className="text-xs font-bold text-[#1A103D]">{meta.label}</p>
                      <p className="text-[11px] text-[#64748B] tabular-nums mt-0.5">{meta.range}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Length Slider + Quantity Stepper */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
              <div className="sm:col-span-8 bg-[#FAF8FF] rounded-xl border border-[#EAE0FA] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="fabric-length-slider"
                    className="text-xs font-bold text-[#1A103D]"
                  >
                    {selectedGarment.lengthLabel}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[#6B21D9] tabular-nums">
                      {customLengthInches}&Prime;
                    </span>
                    {customLengthInches !== selectedGarment.defaultLengthInches && (
                      <button
                        type="button"
                        onClick={() => setCustomLengthInches(selectedGarment.defaultLengthInches)}
                        className="text-[11px] font-semibold text-[#64748B] hover:text-[#6B21D9] underline cursor-pointer"
                      >
                        Std ({selectedGarment.defaultLengthInches}&Prime;)
                      </button>
                    )}
                  </div>
                </div>
                <input
                  id="fabric-length-slider"
                  type="range"
                  min={selectedGarment.minLengthInches}
                  max={selectedGarment.maxLengthInches}
                  step={1}
                  value={customLengthInches}
                  onChange={(e) => setCustomLengthInches(Number(e.target.value))}
                  className="w-full accent-[#6B21D9] cursor-pointer h-2"
                />
                <div className="flex justify-between text-[11px] text-[#64748B] tabular-nums">
                  <span>{selectedGarment.minLengthInches}&Prime; (Shorter)</span>
                  <span>Standard {selectedGarment.defaultLengthInches}&Prime;</span>
                  <span>{selectedGarment.maxLengthInches}&Prime; (Longer)</span>
                </div>
              </div>

              <div className="sm:col-span-4 bg-[#FAF8FF] rounded-xl border border-[#EAE0FA] p-4 flex flex-col justify-between">
                <span className="text-xs font-bold text-[#1A103D]">Garment Quantity</span>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-lg bg-white border border-[#CBD5E1] hover:border-[#6B21D9] text-[#1A103D] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-extrabold text-[#1A103D] tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                    className="w-10 h-10 rounded-lg bg-white border border-[#CBD5E1] hover:border-[#6B21D9] text-[#1A103D] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[11px] text-[#64748B] mt-1.5">
                  Multiplies cut totals
                </span>
              </div>
            </div>
          </section>

          {/* Step 3: Fabric Width, Sleeves, Fullness, Pattern & Allowances */}
          <section className="bg-white rounded-2xl border border-[#EAE0FA] p-5 sm:p-6 space-y-5">
            <h2 className="text-base font-bold text-[#1A103D] font-serif-accent">
              3. Fabric Width (Panna), Style &amp; Allowances
            </h2>

            {/* Fabric Bolt Width */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#334155]">Fabric Bolt Width (Panna)</span>
                <span className="text-[#64748B]">Wider bolts need less length</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {FABRIC_WIDTH_OPTIONS.map((opt) => {
                  const active = fabricWidth === opt.inches;
                  return (
                    <button
                      key={opt.inches}
                      type="button"
                      onClick={() => setFabricWidth(opt.inches)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[60px] ${
                        active
                          ? 'bg-[#F4EEFF] border-[#6B21D9] ring-1 ring-[#6B21D9]/20'
                          : 'bg-white border-[#EAE0FA] hover:border-[#6B21D9]/50'
                      }`}
                    >
                      <p className="text-xs font-extrabold text-[#1A103D] tabular-nums">
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">{opt.note}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sleeve Style (Conditional) */}
            {selectedGarment.supportsSleeves && (
              <div className="space-y-2">
                <span className="block text-xs font-bold text-[#334155]">Sleeve Style</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {SLEEVE_STYLES.map((style) => {
                    const active = sleeveStyle === style;
                    const meta = SLEEVE_DELTAS_METERS[style];
                    return (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setSleeveStyle(style)}
                        className={`px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[44px] flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-[#F4EEFF] border-[#6B21D9] text-[#1A103D] font-bold'
                            : 'bg-white border-[#EAE0FA] text-[#334155] hover:border-[#6B21D9]/50 font-semibold'
                        }`}
                      >
                        <span className="text-xs">{meta.label}</span>
                        {active && <Check className="w-3.5 h-3.5 text-[#6B21D9] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fit / Flare Fullness (Conditional) */}
            {selectedGarment.supportsFullness && selectedGarment.fullnessLabels && (
              <div className="space-y-2">
                <span className="block text-xs font-bold text-[#334155]">
                  Silhouette / Flare Fullness
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FULLNESS_LEVELS.map((lvl) => {
                    const active = fullness === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setFullness(lvl)}
                        className={`px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer min-h-[44px] flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-[#F4EEFF] border-[#6B21D9] text-[#1A103D] font-bold'
                            : 'bg-white border-[#EAE0FA] text-[#334155] hover:border-[#6B21D9]/50 font-semibold'
                        }`}
                      >
                        <span className="text-xs">{selectedGarment.fullnessLabels?.[lvl]}</span>
                        {active && <Check className="w-3.5 h-3.5 text-[#6B21D9] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pattern / Print Matching */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-[#334155]">
                Fabric Print, Weave &amp; Nap Direction
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {PATTERN_TYPES.map((pt) => {
                  const active = patternType === pt;
                  const meta = PATTERN_OPTIONS[pt];
                  return (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setPatternType(pt)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[58px] ${
                        active
                          ? 'bg-[#F4EEFF] border-[#6B21D9] ring-1 ring-[#6B21D9]/20'
                          : 'bg-white border-[#EAE0FA] hover:border-[#6B21D9]/50'
                      }`}
                    >
                      <p className="text-xs font-bold text-[#1A103D]">{meta.label}</p>
                      <p className="text-[11px] text-[#64748B] mt-0.5">{meta.detail}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkboxes: Shrinkage, Lining, Secondary Piece, Dupatta */}
            <div className="pt-2 border-t border-[#F1F5F9] grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#EAE0FA] bg-[#FAF8FF] hover:border-[#6B21D9]/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeShrinkage}
                  onChange={(e) => setIncludeShrinkage(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#6B21D9] shrink-0"
                />
                <div>
                  <p className="text-xs font-bold text-[#1A103D]">
                    Pre-Wash Shrinkage Buffer (+8%)
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Essential for pure cotton, linen, rayon &amp; handloom fabrics.
                  </p>
                </div>
              </label>

              {selectedGarment.liningRatio > 0 && (
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#EAE0FA] bg-[#FAF8FF] hover:border-[#6B21D9]/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeLining}
                    onChange={(e) => setIncludeLining(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#6B21D9] shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#1A103D]">
                      Include Matching Lining (Astar)
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Calculated separately for standard 44&Prime; cotton / crepe lining.
                    </p>
                  </div>
                </label>
              )}

              {selectedGarment.secondaryPiece && (
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#EAE0FA] bg-[#FAF8FF] hover:border-[#6B21D9]/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeSecondaryPiece}
                    onChange={(e) => setIncludeSecondaryPiece(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#6B21D9] shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#1A103D]">
                      Include {selectedGarment.secondaryPiece.label}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Uncheck if you already have a contrast bottom or blouse piece.
                    </p>
                  </div>
                </label>
              )}

              {selectedGarment.optionalDupattaMeters && (
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#EAE0FA] bg-[#FAF8FF] hover:border-[#6B21D9]/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={includeDupatta}
                    onChange={(e) => setIncludeDupatta(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#6B21D9] shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#1A103D]">
                      Include Matching Dupatta / Odhani
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Adds standard full-drape length (
                      {formatFabricLength(selectedGarment.optionalDupattaMeters, unit)}).
                    </p>
                  </div>
                </label>
              )}
            </div>
          </section>
        </div>

        {/* Right 5 Cols: Sticky Fabric Cut Plan & Visual Diagram */}
        <aside className="lg:col-span-5 lg:sticky lg:top-28 space-y-5">
          <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden shadow-xs">
            {/* Top Navy Readout Header */}
            <div className="bg-[#1A103D] text-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#E2B14B]">
                    RECOMMENDED FABRIC CUT
                  </p>
                  <h2 className="text-lg font-bold font-serif-accent mt-1">
                    {selectedGarment.name}
                  </h2>
                  <p className="text-xs text-[#CBD5E1] mt-1">
                    Size {size} · {HEIGHT_MULTIPLIERS[heightBand].label} · {fabricWidth}&Prime;
                    bolt · Qty {quantity}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/10 text-[#C4B5FD] flex items-center justify-center shrink-0">
                  <Scissors className="w-5 h-5" />
                </div>
              </div>

              {/* Hero Meterage Display */}
              <div className="mt-5 pt-4 border-t border-white/15 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] text-[#94A3B8] font-medium">
                    {result.secondaryMeters > 0
                      ? 'Main Piece (Top / Skirt)'
                      : quantity > 1
                        ? `Total Main Fabric (${quantity} pcs)`
                        : 'Main Outer Fabric'}
                  </p>
                  <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white tabular-nums mt-0.5">
                    {formatFabricLength(result.recommendedMainMeters * quantity, unit)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#C4B5FD] tabular-nums">
                    ≈ {formatSecondaryUnit(result.recommendedMainMeters * quantity, unit)}
                  </p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    Rounded up to 0.25 {unit === 'meters' ? 'm' : 'yd'}
                  </p>
                </div>
              </div>
            </div>

            {/* Body: Line Items, Visual Bolt Layout, Breakdown, Actions */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Itemized Piece Totals */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
                  <span className="text-[#475569] font-medium">
                    Main Fabric ({fabricWidth}&Prime; width)
                    {quantity > 1 ? ` × ${quantity}` : ''}
                  </span>
                  <span className="font-extrabold text-[#1A103D] tabular-nums">
                    {formatFabricLength(result.recommendedMainMeters * quantity, unit)}
                  </span>
                </div>

                {result.secondaryMeters > 0 && selectedGarment.secondaryPiece && (
                  <div className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
                    <span className="text-[#475569] font-medium">
                      {selectedGarment.secondaryPiece.label}
                      {quantity > 1 ? ` × ${quantity}` : ''}
                    </span>
                    <span className="font-extrabold text-[#1A103D] tabular-nums">
                      {formatFabricLength(result.secondaryMeters * quantity, unit)}
                    </span>
                  </div>
                )}

                {result.secondaryMeters > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#F4EEFF] border border-[#DCD0F5]">
                    <span className="text-[#6B21D9] font-bold">
                      Combined (if cut from same fabric)
                    </span>
                    <span className="font-extrabold text-[#1A103D] tabular-nums">
                      {formatFabricLength(result.totalOrderMainMeters, unit)}
                    </span>
                  </div>
                )}

                {result.liningMeters > 0 && (
                  <div className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
                    <span className="text-[#475569] font-medium">
                      Lining / Astar (44&Prime; width)
                      {quantity > 1 ? ` × ${quantity}` : ''}
                    </span>
                    <span className="font-extrabold text-[#6B21D9] tabular-nums">
                      {formatFabricLength(result.totalOrderLiningMeters, unit)}
                    </span>
                  </div>
                )}

                {result.dupattaMeters > 0 && (
                  <div className="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
                    <span className="text-[#475569] font-medium">
                      Matching Dupatta / Odhani
                      {quantity > 1 ? ` × ${quantity}` : ''}
                    </span>
                    <span className="font-extrabold text-[#C8922A] tabular-nums">
                      {formatFabricLength(result.totalOrderDupattaMeters, unit)}
                    </span>
                  </div>
                )}
              </div>

              {/* Architectural SVG Fabric Bolt Cut Layout Diagram */}
              <div className="bg-[#FAF8FF] rounded-xl border border-[#EAE0FA] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#475569] inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#6B21D9]" />
                    Bolt Cut Schematic (Per Garment)
                  </span>
                  <span className="text-[11px] font-bold text-[#1A103D] tabular-nums">
                    {fabricWidth}&Prime; × {formatFabricLength(primaryCutForDiagram, unit)}
                  </span>
                </div>

                <svg
                  viewBox="0 0 360 112"
                  className="w-full h-auto block"
                  role="img"
                  aria-label={`Fabric bolt cutting schematic showing ${fabricWidth} inch bolt width and ${formatFabricLength(primaryCutForDiagram, unit)} cut length`}
                >
                  {/* Left width dimension guide */}
                  <line x1="22" y1="16" x2="22" y2="82" stroke="#64748B" strokeWidth="1" />
                  <line x1="18" y1="16" x2="26" y2="16" stroke="#64748B" strokeWidth="1" />
                  <line x1="18" y1="82" x2="26" y2="82" stroke="#64748B" strokeWidth="1" />
                  <text
                    x="13"
                    y="52"
                    textAnchor="middle"
                    fill="#1A103D"
                    fontSize="9.5"
                    fontWeight="700"
                    transform="rotate(-90 13 52)"
                  >
                    {fabricWidth}&Prime;
                  </text>

                  {/* Bolt outer frame (selvedge top & bottom) */}
                  <rect
                    x="34"
                    y="16"
                    width="314"
                    height="66"
                    rx="6"
                    fill="#FFFFFF"
                    stroke="#1A103D"
                    strokeWidth="1.25"
                  />
                  {/* Selvedge dashed edges */}
                  <line
                    x1="36"
                    y1="21"
                    x2="346"
                    y2="21"
                    stroke="#CBD5E1"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="36"
                    y1="77"
                    x2="346"
                    y2="77"
                    stroke="#CBD5E1"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />

                  {/* Proportional cutting panels */}
                  {boltDiagramPanels.map((panel, idx) => {
                    const innerWidth = 304;
                    const x = 39 + panel.start * innerWidth;
                    const w = Math.max(24, panel.share * innerWidth - 4);
                    const fill =
                      panel.tone === 'primary'
                        ? '#E0F2F5'
                        : panel.tone === 'secondary'
                          ? '#EAE0FA'
                          : '#FDF3DF';
                    const stroke =
                      panel.tone === 'primary'
                        ? '#6B21D9'
                        : panel.tone === 'secondary'
                          ? '#475569'
                          : '#C8922A';
                    const textFill =
                      panel.tone === 'primary'
                        ? '#1A103D'
                        : panel.tone === 'secondary'
                          ? '#1E293B'
                          : '#92610F';
                    return (
                      <g key={`${panel.label}-${idx}`}>
                        <rect
                          x={x}
                          y={25}
                          width={w}
                          height={48}
                          rx="4"
                          fill={fill}
                          stroke={stroke}
                          strokeWidth="1"
                          strokeDasharray={panel.tone === 'accent' ? '3 2' : undefined}
                        />
                        {w >= 54 && (
                          <text
                            x={x + w / 2}
                            y={47}
                            textAnchor="middle"
                            fill={textFill}
                            fontSize="8.5"
                            fontWeight="700"
                          >
                            {panel.label.length > 18 ? `${panel.label.slice(0, 17)}…` : panel.label}
                          </text>
                        )}
                        <text
                          x={x + w / 2}
                          y={w >= 54 ? 60 : 52}
                          textAnchor="middle"
                          fill={stroke}
                          fontSize="8"
                          fontWeight="600"
                        >
                          {Math.round(panel.share * 100)}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Bottom length bracket */}
                  <line x1="34" y1="95" x2="348" y2="95" stroke="#6B21D9" strokeWidth="1.25" />
                  <line x1="34" y1="91" x2="34" y2="99" stroke="#6B21D9" strokeWidth="1.25" />
                  <line x1="348" y1="91" x2="348" y2="99" stroke="#6B21D9" strokeWidth="1.25" />
                  <rect x="136" y="86" width="110" height="18" rx="4" fill="#FAF8FF" />
                  <text
                    x="191"
                    y="98"
                    textAnchor="middle"
                    fill="#6B21D9"
                    fontSize="9.5"
                    fontWeight="700"
                  >
                    Cut: {formatFabricLength(primaryCutForDiagram, unit)}
                  </text>
                </svg>
              </div>

              {/* Calculation Breakdown Accordion */}
              <div className="border border-[#EAE0FA] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowBreakdown((v) => !v)}
                  className="w-full px-4 py-2.5 bg-[#FAF8FF] flex items-center justify-between text-xs font-bold text-[#1A103D] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                >
                  <span>How This Estimate Was Calculated</span>
                  {showBreakdown ? (
                    <ChevronUp className="w-4 h-4 text-[#64748B]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#64748B]" />
                  )}
                </button>
                {showBreakdown && (
                  <div className="px-4 py-3 space-y-1.5 text-[11.5px] bg-white border-t border-[#EAE0FA]">
                    <div className="flex justify-between text-[#475569]">
                      <span>Base pattern (Size M · 44&Prime; bolt)</span>
                      <span className="font-semibold text-[#1A103D] tabular-nums">
                        {formatFabricLength(result.breakdown.baseMeters, unit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#475569]">
                      <span>Size ({size}) &amp; Height ({HEIGHT_MULTIPLIERS[heightBand].label})</span>
                      <span className="font-semibold text-[#1A103D] tabular-nums">
                        {formatSignedDelta(result.breakdown.sizeAndHeightDelta, unit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#475569]">
                      <span>Sleeves &amp; Length ({customLengthInches}&Prime;)</span>
                      <span className="font-semibold text-[#1A103D] tabular-nums">
                        {formatSignedDelta(result.breakdown.sleeveAndLengthDelta, unit)}
                      </span>
                    </div>
                    {selectedGarment.supportsFullness && (
                      <div className="flex justify-between text-[#475569]">
                        <span>Cut &amp; Flare fullness</span>
                        <span className="font-semibold text-[#1A103D] tabular-nums">
                          {formatSignedDelta(result.breakdown.fullnessDelta, unit)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#475569]">
                      <span>Bolt width adjustment ({fabricWidth}&Prime;)</span>
                      <span className="font-semibold text-[#1A103D] tabular-nums">
                        {formatSignedDelta(result.breakdown.widthAdjustmentDelta, unit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#475569]">
                      <span>Pattern matching &amp; shrinkage</span>
                      <span className="font-semibold text-[#1A103D] tabular-nums">
                        {formatSignedDelta(result.breakdown.patternAndShrinkageDelta, unit)}
                      </span>
                    </div>
                    <div className="pt-1.5 mt-1 border-t border-[#F1F5F9] flex justify-between font-bold text-[#1A103D]">
                      <span>Raw exact → Practical cut (1 pc)</span>
                      <span className="tabular-nums text-[#6B21D9]">
                        {result.rawMainMeters.toFixed(2)} m →{' '}
                        {formatFabricLength(result.recommendedMainMeters, unit)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Master Tailor Note & Recommended Fabrics */}
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3.5 space-y-2">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[#C8922A] shrink-0 mt-0.5" />
                  <div className="text-[11.5px] text-[#78350F] leading-relaxed">
                    <strong className="font-bold text-[#1A103D]">Master Tailor Tip: </strong>
                    {selectedGarment.tailorTip}
                  </div>
                </div>
                <p className="text-[11px] text-[#64748B] pl-6">
                  <strong className="text-[#1A103D]">Best fabrics:</strong>{' '}
                  {selectedGarment.recommendedFabrics.join(' · ')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleProceedToBooking}
                  className="w-full bg-[#6B21D9] hover:bg-[#5B21B6] text-white font-bold text-xs sm:text-sm py-3.5 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
                >
                  <span>Book Custom Stitching with This Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleAddToShoppingList}
                    className="bg-[#1A103D] hover:bg-[#2E1065] text-white font-bold text-xs py-3 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] whitespace-nowrap"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Add to List
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="bg-white hover:bg-[#FAF8FF] border border-[#CBD5E1] text-[#1A103D] font-bold text-xs py-3 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] whitespace-nowrap"
                  >
                    {copiedSingle ? (
                      <>
                        <ClipboardCheck className="w-3.5 h-3.5 text-[#059669]" />
                        Copied Plan
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Summary
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Multi-Garment Fabric Shopping Checklist */}
      {shoppingList.length > 0 && (
        <section className="bg-white rounded-2xl border border-[#EAE0FA] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B21D9]">
                FABRIC SHOPPING CHECKLIST
              </p>
              <h2 className="text-lg font-bold text-[#1A103D] font-serif-accent mt-0.5">
                Combined Fabric Plan ({shoppingTotals.garments}{' '}
                {shoppingTotals.garments === 1 ? 'garment' : 'garments'})
              </h2>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyShoppingList}
                className="inline-flex items-center gap-1.5 bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer min-h-[40px] whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Checklist
              </button>
              <button
                type="button"
                onClick={() => setShoppingList([])}
                className="inline-flex items-center gap-1.5 bg-white border border-[#EAE0FA] hover:border-red-300 text-[#64748B] hover:text-red-600 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer min-h-[40px] whitespace-nowrap"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {shoppingList.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1A103D]">{item.garmentName}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">{item.specSummary}</p>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
                  <span className="font-bold text-[#1A103D]">
                    Main: {formatFabricLength(item.mainMeters, unit)}
                  </span>
                  {item.secondaryMeters > 0 && (
                    <span className="font-semibold text-[#334155]">
                      Bottom/Choli: {formatFabricLength(item.secondaryMeters, unit)}
                    </span>
                  )}
                  {item.liningMeters > 0 && (
                    <span className="font-semibold text-[#6B21D9]">
                      Lining: {formatFabricLength(item.liningMeters, unit)}
                    </span>
                  )}
                  {item.dupattaMeters > 0 && (
                    <span className="font-semibold text-[#C8922A]">
                      Dupatta: {formatFabricLength(item.dupattaMeters, unit)}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${item.garmentName}`}
                    onClick={() => handleRemoveShoppingItem(item.id)}
                    className="p-2 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#EAE0FA] grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#FAF8FF] rounded-xl border border-[#EAE0FA] p-3.5">
              <p className="text-[11px] font-semibold text-[#64748B]">Total Outer Fabric</p>
              <p className="text-lg font-extrabold text-[#1A103D] tabular-nums mt-0.5">
                {formatFabricLength(shoppingTotals.mainAndSecondary, unit)}
              </p>
            </div>
            <div className="bg-[#FAF8FF] rounded-xl border border-[#EAE0FA] p-3.5">
              <p className="text-[11px] font-semibold text-[#64748B]">Total Lining (44&Prime;)</p>
              <p className="text-lg font-extrabold text-[#6B21D9] tabular-nums mt-0.5">
                {formatFabricLength(shoppingTotals.lining, unit)}
              </p>
            </div>
            <div className="bg-[#FAF8FF] rounded-xl border border-[#EAE0FA] p-3.5">
              <p className="text-[11px] font-semibold text-[#64748B]">Total Dupatta</p>
              <p className="text-lg font-extrabold text-[#C8922A] tabular-nums mt-0.5">
                {formatFabricLength(shoppingTotals.dupatta, unit)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Fabric Width Reference Guide */}
      <section className="bg-white rounded-2xl border border-[#EAE0FA] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#6B21D9]" />
          <h2 className="text-sm sm:text-base font-bold text-[#1A103D] font-serif-accent">
            Quick Guide to Indian &amp; Suiting Fabric Widths (Panna)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {FABRIC_WIDTH_OPTIONS.map((w) => (
            <div
              key={w.inches}
              className="p-4 rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] space-y-1.5"
            >
              <p className="text-sm font-extrabold text-[#1A103D] tabular-nums">{w.label}</p>
              <p className="text-xs font-semibold text-[#6B21D9]">{w.note}</p>
              <p className="text-[11.5px] text-[#64748B] leading-relaxed">
                {w.inches === 36 &&
                  'Common for pure handloom silks, Banarasi brocades, and traditional cottons. Requires ~22% more length than 44" fabric.'}
                {w.inches === 44 &&
                  'Standard width across Indian dress materials, kurtis, chanderi, georgette, and cotton lining (astar).'}
                {w.inches === 54 &&
                  'Popular for export linen, modal satin, heavy rayon, and wider designer prints — saves ~14% yardage.'}
                {w.inches === 60 &&
                  'Standard width for Raymond/wool suiting, trousers, and bridal net — lets tailors cut trouser legs side-by-side.'}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Calendar,
  Check,
  Clock,
  Eye,
  MapPin,
  Navigation,
  Play,
  RotateCcw,
  Scissors,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { TAILOR_PARTNERS } from '../data/catalogData';
import {
  OrderRecord,
  PageRoute,
  TailorPartner,
  TailorPortfolioWork,
  TailorServiceItem,
} from '../types';
import { SafeImage } from './SafeImage';
import { QuickBookModal, TailorCompareModal, TailorProfileModal } from './TailorModals';
import {
  CRAFT_REEL_SCENES,
  CraftReelModal,
  StitchingReelStrip,
} from './StitchingReelShowcase';

interface HomePageProps {
  locality: string;
  onOpenLocationModal: () => void;
  onNavigate: (page: PageRoute, opts?: { categoryId?: string; searchQuery?: string }) => void;
  onCreateOrder: (order: OrderRecord) => void;
  onNotifyToast: (msg: string) => void;
}

type SortOption = 'relevance' | 'distance' | 'rating' | 'price' | 'turnaround';

interface ServiceIntent {
  id: string;
  label: string;
  keywords: string[];
}

const SERVICE_INTENTS: ServiceIntent[] = [
  { id: 'all', label: 'All Services', keywords: [] },
  {
    id: 'blouses',
    label: 'Blouses & Maggam',
    keywords: ['blouse', 'maggam', 'bridal', 'embroidery', 'zardosi', 'keyhole', 'trousseau'],
  },
  {
    id: 'alterations',
    label: 'Alterations',
    keywords: ['alteration', 'waist', 'length', 'jeans', 'zip', 'hem', 'pant', 'repair', 'fit'],
  },
  {
    id: 'menswear',
    label: "Men's Suits & Sherwani",
    keywords: ['suit', 'sherwani', 'blazer', 'shirt', 'trouser', 'kurta', 'men', 'jodhpuri', 'tuxedo'],
  },
  {
    id: 'saree',
    label: 'Saree Finishing',
    keywords: ['saree', 'pleat', 'pleating', 'fall', 'pico', 'half saree', 'pattu'],
  },
  {
    id: 'ethnic',
    label: 'Kurtis & Lehengas',
    keywords: ['kurti', 'palazzo', 'lehenga', 'salwar', 'chudidar', 'festive', 'family'],
  },
  {
    id: 'gowns',
    label: 'Gowns & Western',
    keywords: ['gown', 'evening', 'western', 'dress', 'cocktail'],
  },
  {
    id: 'uniforms',
    label: 'Uniforms & Bulk',
    keywords: ['uniform', 'school', 'corporate', 'clinic', 'bulk', 'hospital'],
  },
];

interface ScoredTailor {
  tailor: TailorPartner;
  score: number;
  rankedServices: TailorServiceItem[];
  rankedPortfolio: TailorPortfolioWork[];
}

function scoreText(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (lower.includes(term)) hits += 1;
  }
  return hits;
}

export const HomePage: React.FC<HomePageProps> = ({
  locality,
  onOpenLocationModal,
  onNavigate,
  onCreateOrder,
  onNotifyToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIntent, setActiveIntent] = useState<string>('all');
  const [pickupOnly, setPickupOnly] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  // Cinematic Stitching Reel State
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isReelPlaying, setIsReelPlaying] = useState(true);
  const [filmModalOpen, setFilmModalOpen] = useState(false);
  const [filmModalStartIndex, setFilmModalStartIndex] = useState(0);

  // Compare & Modals State
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [profileState, setProfileState] = useState<{
    tailor: TailorPartner;
    tab: 'services' | 'portfolio' | 'reviews';
  } | null>(null);
  const [bookingState, setBookingState] = useState<{
    tailor: TailorPartner;
    serviceId?: string;
    note?: string;
  } | null>(null);

  const resultsRef = useRef<HTMLElement | null>(null);

  // Auto-advance cinematic stitching reel scenes
  useEffect(() => {
    if (!isReelPlaying || filmModalOpen) return;
    const current = CRAFT_REEL_SCENES[activeSceneIndex];
    const timer = window.setTimeout(() => {
      setActiveSceneIndex((prev) => (prev + 1) % CRAFT_REEL_SCENES.length);
    }, current.durationSec * 1000);
    return () => window.clearTimeout(timer);
  }, [activeSceneIndex, isReelPlaying, filmModalOpen]);

  const activeScene = CRAFT_REEL_SCENES[activeSceneIndex];

  const activeIntentObj = useMemo(
    () => SERVICE_INTENTS.find((item) => item.id === activeIntent) || SERVICE_INTENTS[0],
    [activeIntent],
  );

  const queryTerms = useMemo(() => {
    return searchQuery
      .toLowerCase()
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);
  }, [searchQuery]);

  const effectiveTerms = useMemo(() => {
    return Array.from(new Set([...queryTerms, ...activeIntentObj.keywords]));
  }, [queryTerms, activeIntentObj]);

  const scoredTailors = useMemo<ScoredTailor[]>(() => {
    const hasSearch = queryTerms.length > 0;
    const hasIntent = activeIntentObj.keywords.length > 0;

    const evaluated: ScoredTailor[] = [];

    for (const tailor of TAILOR_PARTNERS) {
      if (pickupOnly && !tailor.pickupAvailable) continue;
      if (openNowOnly && !tailor.openNow) continue;

      const haystack = [
        tailor.shopName,
        tailor.masterTailor,
        tailor.locality,
        tailor.bio,
        ...tailor.specialties,
        ...tailor.services.map((s) => `${s.name} ${s.category} ${s.description}`),
        ...tailor.portfolio.map((p) => `${p.title} ${p.category} ${p.tags.join(' ')}`),
      ]
        .join(' ')
        .toLowerCase();

      if (hasSearch && !queryTerms.some((term) => haystack.includes(term))) {
        continue;
      }

      if (hasIntent && !activeIntentObj.keywords.some((kw) => haystack.includes(kw))) {
        continue;
      }

      const rankedServices = [...tailor.services].sort((a, b) => {
        if (effectiveTerms.length === 0) return 0;
        const sa =
          scoreText(`${a.name} ${a.category} ${a.description}`, queryTerms) * 3 +
          scoreText(`${a.name} ${a.category} ${a.description}`, activeIntentObj.keywords);
        const sb =
          scoreText(`${b.name} ${b.category} ${b.description}`, queryTerms) * 3 +
          scoreText(`${b.name} ${b.category} ${b.description}`, activeIntentObj.keywords);
        return sb - sa;
      });

      const rankedPortfolio = [...tailor.portfolio].sort((a, b) => {
        if (effectiveTerms.length === 0) return 0;
        const pa =
          scoreText(`${a.title} ${a.category} ${a.tags.join(' ')}`, queryTerms) * 3 +
          scoreText(`${a.title} ${a.category} ${a.tags.join(' ')}`, activeIntentObj.keywords);
        const pb =
          scoreText(`${b.title} ${b.category} ${b.tags.join(' ')}`, queryTerms) * 3 +
          scoreText(`${b.title} ${b.category} ${b.tags.join(' ')}`, activeIntentObj.keywords);
        return pb - pa;
      });

      const queryScore = scoreText(haystack, queryTerms) * 20;
      const intentScore = scoreText(haystack, activeIntentObj.keywords) * 8;
      const proximityBonus = Math.max(0, 10 - tailor.distanceKm * 2);
      const ratingBonus = tailor.rating * 3;
      const pickupBonus = tailor.pickupAvailable ? 2 : 0;

      evaluated.push({
        tailor,
        score: queryScore + intentScore + proximityBonus + ratingBonus + pickupBonus,
        rankedServices,
        rankedPortfolio,
      });
    }

    evaluated.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.tailor.distanceKm - b.tailor.distanceKm;
        case 'rating':
          return b.tailor.rating - a.tailor.rating || b.tailor.reviewCount - a.tailor.reviewCount;
        case 'price':
          return a.tailor.startingPrice - b.tailor.startingPrice;
        case 'turnaround':
          return a.tailor.turnaroundDays - b.tailor.turnaroundDays;
        case 'relevance':
        default:
          return b.score - a.score;
      }
    });

    return evaluated;
  }, [queryTerms, activeIntentObj, effectiveTerms, pickupOnly, openNowOnly, sortBy]);

  const comparedTailors = useMemo(
    () =>
      compareIds
        .map((id) => TAILOR_PARTNERS.find((t) => t.id === id))
        .filter((t): t is TailorPartner => Boolean(t)),
    [compareIds],
  );

  const handleToggleCompare = (tailorId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(tailorId)) {
        return prev.filter((id) => id !== tailorId);
      }
      if (prev.length >= 3) {
        onNotifyToast('You can compare up to 3 tailors at once. Remove one to add another.');
        return prev;
      }
      return [...prev, tailorId];
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFilterFromReel = (intentId: string) => {
    setActiveIntent(intentId);
    setSearchQuery('');
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveIntent('all');
    setPickupOnly(false);
    setOpenNowOnly(false);
    setSortBy('relevance');
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 || activeIntent !== 'all' || pickupOnly || openNowOnly;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* SECTION 1: CINEMATIC CENTERED LUXURY HERO WITH ANIMATED STITCHING BACKDROP */}
      <section className="relative bg-[#0B1F3A] text-white overflow-hidden">
        {/* Live Crossfading Ken-Burns Stitching Backdrop */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <AnimatePresence mode="sync">
            <motion.div
              key={activeScene.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <SafeImage
                src={activeScene.image}
                alt=""
                className={`w-full h-full object-cover object-center ${
                  isReelPlaying
                    ? activeScene.motionVariant === 'zoom'
                      ? 'animate-ken-burns'
                      : 'animate-ken-burns-pan'
                    : ''
                }`}
              />
            </motion.div>
          </AnimatePresence>
          {/* Measured Luxury Navy Contrast Scrim */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#071529]/82 via-[#0B1F3A]/72 to-[#0B1F3A]/95" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(11,114,133,0.18)_0%,transparent_65%)]" />
        </div>

        {/* Centered Hero Foreground Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12 sm:pt-16 sm:pb-16 text-center">
          {/* Animated Gold Stitched Thread Accent */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 220 16"
              className="w-40 h-3.5 mb-3 opacity-85"
            >
              <path
                d="M 4 8 Q 55 2, 110 8 T 216 8"
                fill="none"
                stroke="#E2B14B"
                strokeWidth="1.6"
                strokeLinecap="round"
                className="animate-stitch-flow"
              />
            </svg>
            <p className="text-xs sm:text-[13px] font-medium tracking-wide text-[#5EEAD4]">
              Bespoke Tailoring · Handcrafted Maggam · Doorstep Pickup &amp; Alterations
            </p>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif-accent text-3xl sm:text-5xl lg:text-[54px] font-bold leading-[1.12] tracking-[-0.01em] text-balance mt-3 max-w-3xl mx-auto"
          >
            Find, Compare &amp; Book Your Nearest Master Tailor
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm sm:text-base text-white/80 mt-3.5 max-w-2xl mx-auto leading-relaxed"
          >
            Search any garment or alteration to explore verified neighborhood ateliers, inspect
            their previous work, compare transparent rates, and schedule a convenient pickup slot.
          </motion.p>

          {/* CENTERED FLOATING LUXURY SEARCH COMMAND BAR */}
          <motion.form
            onSubmit={handleSearchSubmit}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 max-w-3xl mx-auto bg-white rounded-2xl p-2 shadow-2xl ring-1 ring-white/25 flex flex-col md:flex-row items-stretch md:items-center gap-1.5"
          >
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-[#0B7285] absolute left-4 pointer-events-none" />
              <input
                id="homepage-tailor-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Maggam blouse, suit, pant alteration, saree pleating..."
                className="w-full pl-11 pr-9 py-3.5 rounded-xl text-sm text-[#0B1F3A] placeholder:text-[#64748B] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 p-1 text-[#64748B] hover:text-[#0B1F3A] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="hidden md:block w-px h-8 bg-[#E2E8F0]" aria-hidden="true" />

            <button
              type="button"
              onClick={onOpenLocationModal}
              className="flex items-center justify-between md:justify-start gap-2 px-3.5 py-3 rounded-xl hover:bg-[#F8FAFC] text-left transition-colors md:max-w-[235px] cursor-pointer"
            >
              <span className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-[#C8922A] shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-[#0B1F3A] truncate">
                  {locality}
                </span>
              </span>
              <span className="text-[11px] font-semibold text-[#0B7285] shrink-0">Change</span>
            </button>

            <button
              type="submit"
              className="px-6 py-3.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white text-sm font-semibold transition-colors shrink-0 cursor-pointer shadow-sm"
            >
              Search Tailors
            </button>
          </motion.form>

          {/* CENTERED QUICK-INTENT SERVICE FILTER TABS */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto"
          >
            {SERVICE_INTENTS.map((intent) => {
              const active = activeIntent === intent.id;
              return (
                <button
                  key={intent.id}
                  type="button"
                  onClick={() => {
                    setActiveIntent(intent.id);
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? 'bg-[#C8922A] border-[#C8922A] text-white shadow-sm'
                      : 'bg-white/10 border-white/15 text-white/90 hover:bg-white/20 hover:text-white backdrop-blur-xs'
                  }`}
                >
                  {intent.label}
                </button>
              );
            })}
          </motion.div>

          {/* Quiet Centered Proof Line + Film Reel Launcher */}
          <div className="mt-7 pt-5 border-t border-white/15 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/80 tabular-nums">
            <span>{TAILOR_PARTNERS.length} Verified Local Ateliers</span>
            <span className="text-white/35" aria-hidden="true">
              ·
            </span>
            <span>4.9★ Average Fit Rating</span>
            <span className="text-white/35" aria-hidden="true">
              ·
            </span>
            <span>Doorstep Pickup &amp; Quote Protection</span>
            <span className="text-white/35 hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={() => {
                setFilmModalStartIndex(activeSceneIndex);
                setFilmModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-[#E2B14B] hover:text-white font-semibold transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Watch Craft Film ({activeScene.title})
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: ANIMATED STITCHING CRAFTSMANSHIP REEL STRIP */}
      <StitchingReelStrip
        activeSceneIndex={activeSceneIndex}
        isPlaying={isReelPlaying}
        onSelectScene={(idx) => setActiveSceneIndex(idx)}
        onTogglePlay={() => setIsReelPlaying((p) => !p)}
        onOpenFilmModal={(idx) => {
          setFilmModalStartIndex(idx);
          setFilmModalOpen(true);
        }}
        onFilterByIntent={handleFilterFromReel}
      />

      {/* SECTION 3: VISUAL NEARBY TAILORS DIRECTORY (3-COLUMN LUXURY GRID) */}
      <section
        id="tailor-results"
        ref={resultsRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10"
      >
        {/* Filter & Sort Controls Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
          <div>
            <p className="text-xs font-semibold text-[#0B7285]">
              Handpicked Neighborhood Boutiques &amp; Master Studios
            </p>
            <h2 className="font-serif-accent text-2xl sm:text-3xl font-bold text-[#0B1F3A] mt-0.5">
              {searchQuery.trim()
                ? `Tailors Matching “${searchQuery.trim()}”`
                : activeIntent !== 'all'
                  ? `${activeIntentObj.label} Specialists Near You`
                  : 'Top-Rated Tailors Serving Your Area'}
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] mt-1 tabular-nums">
              Showing <span className="font-semibold text-[#0B1F3A]">{scoredTailors.length}</span>{' '}
              verified {scoredTailors.length === 1 ? 'atelier' : 'ateliers'} near {locality}
              {compareIds.length > 0 && (
                <span>
                  {' '}
                  · <strong className="text-[#0B7285]">{compareIds.length} selected</strong> for
                  side-by-side comparison
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPickupOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                pickupOnly
                  ? 'bg-[#0B7285] border-[#0B7285] text-white'
                  : 'bg-white border-[#CBD5E1] text-[#334155] hover:border-[#0B7285]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Doorstep Pickup
            </button>

            <button
              type="button"
              onClick={() => setOpenNowOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                openNowOnly
                  ? 'bg-[#0B7285] border-[#0B7285] text-white'
                  : 'bg-white border-[#CBD5E1] text-[#334155] hover:border-[#0B7285]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Open Now
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#64748B]" />
              <label htmlFor="tailor-sort" className="text-[#64748B] font-medium">
                Sort:
              </label>
              <select
                id="tailor-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="font-semibold text-[#0B1F3A] bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="relevance">Best Match</option>
                <option value="distance">Nearest First</option>
                <option value="rating">Highest Rated</option>
                <option value="price">Lowest Price</option>
                <option value="turnaround">Fastest Delivery</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('nearby-shops')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#F0F9FA] border border-[#CBE7EC] text-[#0B7285] hover:bg-[#E1F3F6] transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              Live GPS Map
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0B1F3A] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Tailor Cards Grid (3 columns on XL desktop for rich scanability) */}
        {scoredTailors.length === 0 ? (
          <div className="mt-8 bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center max-w-xl mx-auto">
            <Scissors className="w-8 h-8 text-[#0B7285] mx-auto mb-3" />
            <h3 className="font-serif-accent text-xl font-bold text-[#0B1F3A]">
              No matching tailors found
            </h3>
            <p className="text-sm text-[#475569] mt-1.5">
              Try a broader service keyword like “blouse”, “alteration”, “suit”, “lehenga”, or
              “saree”, or clear your active filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-5 px-5 py-2.5 rounded-lg bg-[#0B1F3A] hover:bg-[#15325B] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Reset Search &amp; Filters
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {scoredTailors.map(({ tailor, rankedServices, rankedPortfolio }, idx) => {
              const isCompared = compareIds.includes(tailor.id);

              return (
                <motion.article
                  key={tailor.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: Math.min(idx * 0.04, 0.28),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`group bg-white rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden ${
                    isCompared
                      ? 'border-[#0B7285] ring-1 ring-[#0B7285]/30 shadow-lg'
                      : 'border-[#E2E8F0] hover:shadow-lg hover:border-[#CBD5E1]'
                  }`}
                >
                  <div>
                    {/* Visual Atelier Cover Photograph Header */}
                    <div
                      onClick={() => setProfileState({ tailor, tab: 'services' })}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setProfileState({ tailor, tab: 'services' });
                        }
                      }}
                      className="relative h-44 bg-[#0B1F3A] overflow-hidden cursor-pointer"
                    >
                      <SafeImage
                        src={tailor.coverImage}
                        alt={tailor.shopName}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/95 via-[#0B1F3A]/35 to-[#0B1F3A]/20" />

                      {/* Top Clean Metrics Row over Photo */}
                      <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between text-xs text-white tabular-nums">
                        <span className="inline-flex items-center gap-1.5 bg-[#0B1F3A]/75 backdrop-blur-xs px-2.5 py-1 rounded-lg font-semibold">
                          <Star className="w-3.5 h-3.5 fill-[#E2B14B] text-[#E2B14B]" />
                          {tailor.rating.toFixed(1)}
                          <span className="text-white/70 font-normal">({tailor.reviewCount})</span>
                          <span className="text-white/35" aria-hidden="true">
                            ·
                          </span>
                          <span>{tailor.distanceKm.toFixed(1)} km</span>
                        </span>

                        <span className="bg-[#0B1F3A]/75 backdrop-blur-xs px-2.5 py-1 rounded-lg font-bold text-[#E2B14B]">
                          From ₹{tailor.startingPrice.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Bottom Shop Name & Master Tailor over Measured Scrim */}
                      <div className="absolute bottom-3 left-4 right-4">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-serif-accent text-lg font-bold text-white leading-snug truncate">
                            {tailor.shopName}
                          </h3>
                          {tailor.verified && (
                            <BadgeCheck
                              className="w-4 h-4 text-[#5EEAD4] shrink-0"
                              aria-label="Verified Tailor"
                            />
                          )}
                        </div>
                        <p className="text-xs text-white/80 mt-0.5 truncate tabular-nums">
                          Master {tailor.masterTailor} · {tailor.yearsExperience} yrs ·{' '}
                          {tailor.locality}
                        </p>
                      </div>
                    </div>

                    {/* Clean Structured Card Body */}
                    <div className="p-4 sm:p-5 space-y-3.5">
                      {/* Operational Metadata Row (Zero-pill, Icon + Text) */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                        {tailor.pickupAvailable ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#0B7285]">
                            <Truck className="w-3.5 h-3.5" />
                            Pickup {tailor.homeVisitFee === 0 ? 'Free' : `₹${tailor.homeVisitFee}`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#475569]">
                            <Store className="w-3.5 h-3.5" />
                            Studio Visit Only
                          </span>
                        )}
                        <span className="text-[#CBD5E1]" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[#475569] tabular-nums">{tailor.turnaround}</span>
                        <span className="text-[#CBD5E1]" aria-hidden="true">
                          ·
                        </span>
                        <span
                          className={
                            tailor.openNow
                              ? 'font-semibold text-[#0B7285]'
                              : 'font-medium text-[#64748B]'
                          }
                        >
                          {tailor.openNow ? 'Open Now' : 'Opens Tomorrow'}
                        </span>
                      </div>

                      {/* Specializations Line */}
                      <p className="text-xs text-[#475569] leading-relaxed line-clamp-1">
                        <span className="font-semibold text-[#0B1F3A]">Specialties:</span>{' '}
                        {tailor.specialties.join(' · ')}
                      </p>

                      {/* Top 2 Matching Services with Direct Quick-Book */}
                      <div className="pt-2.5 border-t border-[#E2E8F0]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold text-[#64748B]">
                            {hasActiveFilters ? 'Matching Services' : 'Popular Services'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setProfileState({ tailor, tab: 'services' })}
                            className="text-[11px] font-semibold text-[#0B7285] hover:text-[#085463] cursor-pointer"
                          >
                            All {tailor.services.length} rates
                          </button>
                        </div>

                        <div className="divide-y divide-[#F1F5F9]">
                          {rankedServices.slice(0, 2).map((srv) => (
                            <div
                              key={srv.id}
                              className="py-1.5 flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="font-medium text-[#0B1F3A] truncate">
                                {srv.name}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-[#0B1F3A] tabular-nums">
                                  ₹{srv.price.toLocaleString('en-IN')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setBookingState({ tailor, serviceId: srv.id })}
                                  className="px-2 py-0.5 rounded border border-[#CBD5E1] hover:border-[#0B7285] hover:bg-[#F0F9FA] text-[11px] font-semibold text-[#0B1F3A] hover:text-[#0B7285] transition-colors cursor-pointer"
                                >
                                  Book
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Previous Work Portfolio 3-Thumb Strip */}
                      <div className="pt-2.5 border-t border-[#E2E8F0]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-[#64748B]">
                            Previous Work
                          </span>
                          <button
                            type="button"
                            onClick={() => setProfileState({ tailor, tab: 'portfolio' })}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B7285] hover:text-[#085463] cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            Gallery
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {rankedPortfolio.slice(0, 3).map((work) => (
                            <button
                              key={work.id}
                              type="button"
                              onClick={() => setProfileState({ tailor, tab: 'portfolio' })}
                              className="group/thumb text-left cursor-pointer"
                            >
                              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#F1F5F9] border border-[#E2E8F0]">
                                <SafeImage
                                  src={work.image}
                                  alt={work.title}
                                  className="w-full h-full object-cover object-top group-hover/thumb:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <p className="text-[11px] font-medium text-[#334155] truncate mt-1 group-hover/thumb:text-[#0B7285] transition-colors">
                                {work.title}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clean Action Footer */}
                  <div className="px-4 sm:px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleCompare(tailor.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                          isCompared
                            ? 'border-[#0B7285] bg-[#F0F9FA] text-[#0B7285]'
                            : 'border-[#CBD5E1] bg-white text-[#334155] hover:border-[#0B1F3A] hover:text-[#0B1F3A]'
                        }`}
                      >
                        {isCompared ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        )}
                        {isCompared ? 'Added' : 'Compare'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setProfileState({ tailor, tab: 'services' })}
                        className="px-2.5 py-2 rounded-lg text-xs font-semibold border border-[#CBD5E1] bg-white text-[#0B1F3A] hover:border-[#0B7285] hover:text-[#0B7285] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Profile
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setBookingState({
                          tailor,
                          serviceId: rankedServices[0]?.id,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#5EEAD4]" />
                      {tailor.pickupAvailable ? 'Schedule Pickup' : 'Book Visit'}
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 4: COMPACT PLATFORM ASSURANCE & QUICK NAVIGATION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-7">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
            <div className="flex items-start gap-3.5 pt-1 md:pt-0">
              <ShieldCheck className="w-5 h-5 text-[#0B7285] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A]">Quote Approval Before Cutting</h3>
                <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                  Review your tailor&apos;s itemized stitching quotation before any fabric is cut.
                  Zero hidden charges.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-5 md:pt-0 md:pl-6">
              <Truck className="w-5 h-5 text-[#0B7285] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A]">Flexible Doorstep Pickup</h3>
                <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                  Pick a convenient date and 2-hour pickup window for measurements and fabric
                  collection, or book a studio visit.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-5 md:pt-0 md:pl-6">
              <Scissors className="w-5 h-5 text-[#C8922A] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A]">7-Day Complimentary Fit Check</h3>
                <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                  Every garment stitched through Tailering includes free post-delivery fit
                  adjustments within 7 days.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-[#475569]">
              Prefer locating nearby tailors on a live distance map or listing your own studio?
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('nearby-shops')}
                className="inline-flex items-center gap-1 font-semibold text-[#0B7285] hover:text-[#085463] cursor-pointer"
              >
                Explore Real-Time GPS Map
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('partner')}
                className="inline-flex items-center gap-1 font-semibold text-[#0B1F3A] hover:text-[#0B7285] cursor-pointer"
              >
                List Your Tailoring Studio
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SLIM FLOATING COMPARE DOCK */}
      <AnimatePresence>
        {comparedTailors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-3xl bg-[#0B1F3A] text-white rounded-xl shadow-2xl border border-white/15 px-3.5 py-2.5 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar">
              <span className="text-xs font-semibold text-[#5EEAD4] shrink-0 tabular-nums">
                Compare ({comparedTailors.length}/3):
              </span>
              {comparedTailors.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded-md whitespace-nowrap"
                >
                  <span className="max-w-[115px] truncate">{t.shopName}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleCompare(t.id)}
                    aria-label={`Remove ${t.shopName}`}
                    className="text-white/70 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="text-xs text-white/75 hover:text-white px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={comparedTailors.length < 2}
                onClick={() => setCompareModalOpen(true)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  comparedTailors.length >= 2
                    ? 'bg-[#C8922A] hover:bg-[#B27D1D] text-white cursor-pointer'
                    : 'bg-white/15 text-white/60 cursor-not-allowed'
                }`}
              >
                {comparedTailors.length >= 2 ? 'Compare Side-by-Side' : 'Select 1 More'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE MODALS */}
      <CraftReelModal
        open={filmModalOpen}
        initialIndex={filmModalStartIndex}
        onClose={() => setFilmModalOpen(false)}
        onFilterByIntent={handleFilterFromReel}
      />

      <TailorProfileModal
        tailor={profileState?.tailor || null}
        initialTab={profileState?.tab || 'services'}
        isCompared={profileState ? compareIds.includes(profileState.tailor.id) : false}
        onToggleCompare={handleToggleCompare}
        onClose={() => setProfileState(null)}
        onBookTailor={(tailor, serviceId, note) => {
          setProfileState(null);
          setBookingState({ tailor, serviceId, note });
        }}
      />

      <TailorCompareModal
        open={compareModalOpen}
        tailors={comparedTailors}
        onRemove={(id) => {
          setCompareIds((prev) => {
            const next = prev.filter((item) => item !== id);
            if (next.length === 0) setCompareModalOpen(false);
            return next;
          });
        }}
        onClose={() => setCompareModalOpen(false)}
        onViewProfile={(tailor) => {
          setCompareModalOpen(false);
          setProfileState({ tailor, tab: 'services' });
        }}
        onBookTailor={(tailor) => {
          setCompareModalOpen(false);
          setBookingState({ tailor });
        }}
      />

      <QuickBookModal
        tailor={bookingState?.tailor || null}
        initialServiceId={bookingState?.serviceId}
        initialNote={bookingState?.note}
        locality={locality}
        onClose={() => setBookingState(null)}
        onConfirmBooking={onCreateOrder}
        onNotifyToast={onNotifyToast}
      />
    </div>
  );
};

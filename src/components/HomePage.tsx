import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Eye,
  Heart,
  HeartHandshake,
  MapPin,
  Monitor,
  Navigation,
  Package,
  RotateCcw,
  Ruler,
  Scissors,
  Search,
  ShieldCheck,
  Shirt,
  SlidersHorizontal,
  Star,
  Store,
  Truck,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  CategoryItem,
  CraftReelScene,
  DesignProduct,
  OrderRecord,
  PageRoute,
  StorefrontMediaMap,
  TailorPartner,
  TailorPortfolioWork,
  TailorServiceItem,
  UserSession,
} from '../types';
import { SafeImage } from './SafeImage';
import { TailorLogoBadge } from './TailorLogoBadge';
import { TaileringLogo } from './TaileringLogo';
import { QuickBookModal, TailorCompareModal, TailorProfileModal } from './TailorModals';
import { CraftReelModal } from './StitchingReelShowcase';

interface HomePageProps {
  tailors: TailorPartner[];
  designs: DesignProduct[];
  categories: CategoryItem[];
  craftScenes: CraftReelScene[];
  media: StorefrontMediaMap;
  loadingTailors?: boolean;
  user?: UserSession | null;
  wishlistIds: string[];
  onToggleWishlist: (designId: string) => void;
  onSelectDesign: (design: DesignProduct) => void;
  locality: string;
  onOpenLocationModal: () => void;
  onRequireSignIn?: () => void;
  onReviewSubmitted?: () => void;
  onNavigate: (page: PageRoute, opts?: { categoryId?: string; searchQuery?: string }) => void;
  onCreateOrder: (order: OrderRecord) => void;
  onNotifyToast: (msg: string) => void;
}

type SortOption = 'relevance' | 'distance' | 'rating' | 'price' | 'turnaround';
type TrendingFilter = 'All' | 'Women' | 'Men' | 'Kids' | 'Wedding' | 'Festive';

interface ServiceIntent {
  id: string;
  labelLine1: string;
  labelLine2: string;
  label: string;
  mediaKey: string;
  fallbackImg: string;
  keywords: string[];
}

const HERO_CATEGORIES: ServiceIntent[] = [
  {
    id: 'blouses',
    labelLine1: 'Blouses &',
    labelLine2: 'Maggam',
    label: 'Blouses & Maggam',
    mediaKey: 'bridalBlouse',
    fallbackImg: '/src/assets/images/design_bridal_blouse_1795271999750.jpg',
    keywords: ['blouse', 'maggam', 'bridal', 'embroidery', 'zardosi', 'keyhole', 'trousseau'],
  },
  {
    id: 'ethnic',
    labelLine1: 'Kurtis &',
    labelLine2: 'Lehengas',
    label: 'Kurtis & Lehengas',
    mediaKey: 'festiveLehenga',
    fallbackImg: '/src/assets/images/design_festive_lehenga_1795271994492.jpg',
    keywords: ['kurti', 'palazzo', 'lehenga', 'salwar', 'chudidar', 'festive', 'family', 'anarkali'],
  },
  {
    id: 'saree',
    labelLine1: 'Sarees',
    labelLine2: 'Finishing',
    label: 'Sarees Finishing',
    mediaKey: 'sareePleating',
    fallbackImg: '/src/assets/images/design_saree_pleating_1795271998351.jpg',
    keywords: ['saree', 'pleat', 'pleating', 'fall', 'pico', 'half saree', 'pattu'],
  },
  {
    id: 'menswear',
    labelLine1: "Men's Suits",
    labelLine2: '& Sherwani',
    label: "Men's Suits & Sherwani",
    mediaKey: 'mensSuit',
    fallbackImg: '/src/assets/images/design_mens_suit_1795271994978.jpg',
    keywords: ['suit', 'sherwani', 'blazer', 'shirt', 'trouser', 'kurta', 'men', 'jodhpuri', 'tuxedo'],
  },
  {
    id: 'gowns',
    labelLine1: 'Gowns &',
    labelLine2: 'Western',
    label: 'Gowns & Western',
    mediaKey: 'partyGown',
    fallbackImg: '/src/assets/images/design_party_gown_pink_1795428346822.jpg',
    keywords: ['gown', 'evening', 'western', 'dress', 'cocktail'],
  },
  {
    id: 'uniforms',
    labelLine1: 'Uniforms',
    labelLine2: '& Bulk Orders',
    label: 'Uniforms & Bulk Orders',
    mediaKey: 'bannerUniforms',
    fallbackImg: '/src/assets/images/banner_uniforms_team_1795272000997.jpg',
    keywords: ['uniform', 'school', 'corporate', 'clinic', 'bulk', 'hospital'],
  },
  {
    id: 'alterations',
    labelLine1: 'Alterations',
    labelLine2: '& Repairs',
    label: 'Alterations & Repairs',
    mediaKey: 'atelierHeroStitching',
    fallbackImg: '/src/assets/images/atelier_hero_stitching_1795279233087.jpg',
    keywords: ['alteration', 'waist', 'length', 'jeans', 'zip', 'hem', 'pant', 'repair', 'fit'],
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: 'Choose a Design',
    desc: 'Explore & select from thousands of designs',
    icon: Monitor,
  },
  {
    step: 2,
    title: 'Select a Tailor',
    desc: 'Compare, review & book a verified tailor',
    icon: UserCheck,
  },
  {
    step: 3,
    title: 'Get It Stitched',
    desc: 'Custom fit, quality stitching & updates',
    icon: Scissors,
  },
  {
    step: 4,
    title: 'Pickup & Delivery',
    desc: 'Doorstep pickup & on-time delivery',
    icon: Package,
  },
];

const TRENDING_FILTERS: TrendingFilter[] = ['All', 'Women', 'Men', 'Kids', 'Wedding', 'Festive'];

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

function getShortDesignCardTitle(design: DesignProduct): string {
  const low = `${design.title} ${design.category}`.toLowerCase();
  if (low.includes('anarkali')) return 'Anarkali Suit';
  if (low.includes('party gown') || low.includes('tulle')) return 'Party Gown';
  if (low.includes('sherwani')) return 'Sherwani';
  if (low.includes('saree') || low.includes('half saree')) return 'Designer Saree';
  if (low.includes('maggam')) return 'Maggam Blouse';
  if (low.includes('blouse')) return 'Designer Blouse';
  if (low.includes('lehenga')) return 'Bridal Lehenga';
  if (low.includes('suit')) return 'Bespoke Suit';
  if (low.includes('kurti')) return 'Kurti Palazzo Set';
  if (low.includes('gown')) return 'Evening Gown';
  return design.title.split(' ').slice(0, 3).join(' ');
}

function getDesignCountSubtitle(design: DesignProduct): string {
  const low = `${design.title} ${design.category}`.toLowerCase();
  if (low.includes('maggam')) return '120+ Designs';
  if (low.includes('anarkali')) return '250+ Designs';
  if (low.includes('sherwani')) return '180+ Designs';
  if (low.includes('saree')) return '320+ Designs';
  if (low.includes('party gown') || low.includes('gown')) return '150+ Designs';
  return `₹${design.price.toLocaleString('en-IN')} · ${design.turnaroundDays}d`;
}

export const HomePage: React.FC<HomePageProps> = ({
  tailors,
  designs,
  categories,
  craftScenes,
  media,
  loadingTailors = false,
  user = null,
  wishlistIds,
  onToggleWishlist,
  onSelectDesign,
  locality,
  onOpenLocationModal,
  onRequireSignIn,
  onReviewSubmitted,
  onNavigate,
  onCreateOrder,
  onNotifyToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIntent, setActiveIntent] = useState<string>('all');
  const [pickupOnly, setPickupOnly] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [trendingFilter, setTrendingFilter] = useState<TrendingFilter>('All');
  const [testimonialPage, setTestimonialPage] = useState(0);

  // Craftsmanship Reel Modal State
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
  const categoryStripRef = useRef<HTMLDivElement | null>(null);

  const activeIntentObj = useMemo(
    () => HERO_CATEGORIES.find((item) => item.id === activeIntent) || null,
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
    return Array.from(new Set([...queryTerms, ...(activeIntentObj?.keywords || [])]));
  }, [queryTerms, activeIntentObj]);

  const scoredTailors = useMemo<ScoredTailor[]>(() => {
    const hasSearch = queryTerms.length > 0;
    const hasIntent = Boolean(activeIntentObj && activeIntentObj.keywords.length > 0);
    const intentKeywords = activeIntentObj?.keywords || [];

    const evaluated: ScoredTailor[] = [];

    for (const tailor of tailors) {
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

      if (hasIntent && !intentKeywords.some((kw) => haystack.includes(kw))) {
        continue;
      }

      const rankedServices = [...tailor.services].sort((a, b) => {
        if (effectiveTerms.length === 0) return 0;
        const sa =
          scoreText(`${a.name} ${a.category} ${a.description}`, queryTerms) * 3 +
          scoreText(`${a.name} ${a.category} ${a.description}`, intentKeywords);
        const sb =
          scoreText(`${b.name} ${b.category} ${b.description}`, queryTerms) * 3 +
          scoreText(`${b.name} ${b.category} ${b.description}`, intentKeywords);
        return sb - sa;
      });

      const rankedPortfolio = [...tailor.portfolio].sort((a, b) => {
        if (effectiveTerms.length === 0) return 0;
        const pa =
          scoreText(`${a.title} ${a.category} ${a.tags.join(' ')}`, queryTerms) * 3 +
          scoreText(`${a.title} ${a.category} ${a.tags.join(' ')}`, intentKeywords);
        const pb =
          scoreText(`${b.title} ${b.category} ${b.tags.join(' ')}`, queryTerms) * 3 +
          scoreText(`${b.title} ${b.category} ${b.tags.join(' ')}`, intentKeywords);
        return pb - pa;
      });

      const queryScore = scoreText(haystack, queryTerms) * 20;
      const intentScore = scoreText(haystack, intentKeywords) * 8;
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
  }, [tailors, queryTerms, activeIntentObj, effectiveTerms, pickupOnly, openNowOnly, sortBy]);

  // Trending Designs pulled dynamically from MySQL `designs` prop
  const trendingDesigns = useMemo<DesignProduct[]>(() => {
    if (designs.length === 0) return [];

    if (trendingFilter === 'All') {
      // Showcase the 5 hero categories matching the reference layout in order
      const pick = (pred: (d: DesignProduct) => boolean, used: Set<string>) =>
        designs.find((d) => !used.has(d.id) && pred(d));

      const used = new Set<string>();
      const curated: DesignProduct[] = [];
      const matchers: ((d: DesignProduct) => boolean)[] = [
        (d) =>
          d.id === 'des-02' ||
          `${d.title} ${d.category}`.toLowerCase().includes('maggam'),
        (d) =>
          d.id === 'des-13' ||
          `${d.title} ${d.category}`.toLowerCase().includes('anarkali') ||
          d.categoryId === 'kurti-pant-set',
        (d) =>
          d.id === 'des-07' ||
          `${d.title} ${d.category}`.toLowerCase().includes('sherwani') ||
          d.gender === 'men',
        (d) =>
          d.id === 'des-10' ||
          `${d.title} ${d.category}`.toLowerCase().includes('saree') ||
          d.categoryId === 'lehenga',
        (d) =>
          d.id === 'des-14' ||
          `${d.title} ${d.category}`.toLowerCase().includes('party gown') ||
          d.categoryId === 'gown',
      ];

      for (const m of matchers) {
        const found = pick(m, used);
        if (found) {
          used.add(found.id);
          curated.push(found);
        }
      }

      for (const d of designs) {
        if (curated.length >= 5) break;
        if (!used.has(d.id)) {
          used.add(d.id);
          curated.push(d);
        }
      }
      return curated.slice(0, 5);
    }

    const filtered = designs.filter((d) => {
      const hay = `${d.title} ${d.category} ${d.description} ${d.fabricNote}`.toLowerCase();
      switch (trendingFilter) {
        case 'Women':
          return d.gender === 'women';
        case 'Men':
          return d.gender === 'men';
        case 'Kids':
          return hay.includes('kids') || hay.includes('junior') || hay.includes('party gown') || d.categoryId === 'gown';
        case 'Wedding':
          return (
            hay.includes('bridal') ||
            hay.includes('wedding') ||
            hay.includes('sherwani') ||
            hay.includes('maggam') ||
            hay.includes('lehenga')
          );
        case 'Festive':
          return (
            hay.includes('festive') ||
            hay.includes('anarkali') ||
            hay.includes('saree') ||
            hay.includes('kurta') ||
            hay.includes('lehenga')
          );
        default:
          return true;
      }
    });

    return (filtered.length > 0 ? filtered : designs).slice(0, 5);
  }, [designs, trendingFilter]);

  // Customer testimonials derived live from DB tailor reviews
  const testimonials = useMemo(() => {
    const dbReviews = tailors
      .filter((t) => t.recentReview && t.recentReview.text)
      .map((t, i) => ({
        id: `tr-${t.id}-${i}`,
        author: t.recentReview.author,
        quote: t.recentReview.text,
        shopName: t.shopName,
        locality: t.locality,
        rating: Math.round(t.rating) || 5,
        avatar: t.coverImage,
        tailor: t,
      }));
    return dbReviews;
  }, [tailors]);

  const totalTestimonialPages = Math.max(1, Math.ceil(testimonials.length / 3));
  useEffect(() => {
    if (testimonialPage >= totalTestimonialPages) {
      setTestimonialPage(0);
    }
  }, [testimonialPage, totalTestimonialPages]);

  const visibleTestimonials = testimonials.slice(testimonialPage * 3, testimonialPage * 3 + 3);

  const comparedTailors = useMemo(
    () =>
      compareIds
        .map((id) => tailors.find((t) => t.id === id))
        .filter((t): t is TailorPartner => Boolean(t)),
    [compareIds, tailors],
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

  const scrollCategoriesRight = () => {
    categoryStripRef.current?.scrollBy({ left: 260, behavior: 'smooth' });
  };

  const heroImageSrc =
    media.heroStudio || '/src/assets/images/hero_boutique_master_1795428314478.jpg';
  const individualsBannerSrc =
    media.bannerIndividuals || '/src/assets/images/banner_individuals_woman_1795428314679.jpg';
  const b2bBannerSrc =
    media.bannerB2B || '/src/assets/images/banner_b2b_uniforms_1795428306470.jpg';

  const hasActiveFilters =
    searchQuery.trim().length > 0 || activeIntent !== 'all' || pickupOnly || openNowOnly;

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      {/* ====================================================================
          SECTION 1: SPLIT CURVED MARKETPLACE HERO (Exact Reference Composition)
      ===================================================================== */}
      <section className="relative bg-gradient-to-r from-[#FDFBF8] via-[#FAF4FC] to-[#F4EBFA] overflow-hidden border-b border-[#EFE6F9]">
        {/* Right-Side Full-Bleed Boutique Master Photography with Gold-Rimmed Curve */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[55%] pointer-events-none select-none overflow-hidden">
          <div className="relative w-full h-full">
            <SafeImage
              src={heroImageSrc}
              alt="Tailering Master Boutique Studio"
              className="w-full h-full object-cover object-[center_18%]"
            />
            {/* Sweeping Convex Cream-Lavender Mask with Regal Gold & Plum Trim */}
            <svg
              aria-hidden="true"
              viewBox="0 0 260 560"
              preserveAspectRatio="none"
              className="absolute inset-y-0 -left-1 h-full w-48 xl:w-64"
            >
              <defs>
                <linearGradient id="heroGoldEdge" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#B87A24" />
                  <stop offset="45%" stopColor="#E4B561" />
                  <stop offset="100%" stopColor="#9D621B" />
                </linearGradient>
                <linearGradient id="heroLeftFade" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FAF4FC" />
                  <stop offset="100%" stopColor="#F5EDFB" />
                </linearGradient>
              </defs>
              {/* Soft purple shadow behind curve */}
              <path
                d="M 48 0 C 166 130, 178 400, 74 560 L 0 560 L 0 0 Z"
                fill="#4E167A"
                opacity="0.35"
              />
              {/* Metallic Gold Rim */}
              <path
                d="M 38 0 C 156 130, 168 400, 64 560 L 0 560 L 0 0 Z"
                fill="url(#heroGoldEdge)"
              />
              {/* Clean Left Background Cutout */}
              <path
                d="M 28 0 C 146 130, 158 400, 54 560 L 0 560 L 0 0 Z"
                fill="url(#heroLeftFade)"
              />
            </svg>
          </div>
        </div>

        {/* Left Hero Foreground Content */}
        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 pt-8 sm:pt-11 pb-10 sm:pb-12">
          <div className="lg:max-w-[53%]">
            {/* Warm Champagne-Gold Eyebrow Pill */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FCECD2] border border-[#F3D7A8] text-[#1B1038] text-xs sm:text-[13px] font-bold shadow-2xs"
            >
              <Crown className="w-3.5 h-3.5 text-[#5A1E8A]" />
              Your Complete Tailoring Marketplace
            </motion.div>

            {/* Primary 2-Line Editorial Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 leading-[1.08]"
            >
              <span className="block font-editorial font-bold text-[36px] sm:text-[48px] xl:text-[56px] text-[#1B1038] tracking-[-0.015em]">
                Design · Stitch · Alter
              </span>
              <span className="block font-extrabold text-[34px] sm:text-[46px] xl:text-[52px] text-[#6D1D9A] tracking-[-0.025em] mt-1">
                All in One Place
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-sm sm:text-[15.5px] text-[#352A52] leading-relaxed max-w-[490px] font-medium"
            >
              Find verified tailors, compare prices, customize your outfits, and get doorstep pickup
              &amp; delivery.
            </motion.p>

            {/* 4 Feature Icon Badges Row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-4 sm:gap-5"
            >
              <button
                type="button"
                onClick={() => onNavigate('custom-stitching')}
                className="group flex items-center gap-2.5 text-left cursor-pointer"
              >
                <span className="w-10 h-10 rounded-full bg-[#EFE5FB] border border-[#E2D2F7] text-[#6D1D9A] flex items-center justify-center shrink-0 group-hover:bg-[#6D1D9A] group-hover:text-white transition-colors">
                  <Scissors className="w-4 h-4" />
                </span>
                <span className="text-[12.5px] font-bold text-[#1B1038] leading-tight">
                  Custom
                  <br />
                  Stitching
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('alterations')}
                className="group flex items-center gap-2.5 text-left cursor-pointer"
              >
                <span className="w-10 h-10 rounded-full bg-[#EFE5FB] border border-[#E2D2F7] text-[#6D1D9A] flex items-center justify-center shrink-0 group-hover:bg-[#6D1D9A] group-hover:text-white transition-colors">
                  <Shirt className="w-4 h-4" />
                </span>
                <span className="text-[12.5px] font-bold text-[#1B1038] leading-tight">
                  Alterations
                  <br />
                  &amp; Repairs
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('nearby-shops')}
                className="group flex items-center gap-2.5 text-left cursor-pointer"
              >
                <span className="w-10 h-10 rounded-full bg-[#EFE5FB] border border-[#E2D2F7] text-[#6D1D9A] flex items-center justify-center shrink-0 group-hover:bg-[#6D1D9A] group-hover:text-white transition-colors">
                  <Truck className="w-4 h-4" />
                </span>
                <span className="text-[12.5px] font-bold text-[#1B1038] leading-tight">
                  Pickup &amp;
                  <br />
                  Delivery
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="group flex items-center gap-2.5 text-left cursor-pointer"
              >
                <span className="w-10 h-10 rounded-full bg-[#EFE5FB] border border-[#E2D2F7] text-[#6D1D9A] flex items-center justify-center shrink-0 group-hover:bg-[#6D1D9A] group-hover:text-white transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <span className="text-[12.5px] font-bold text-[#1B1038] leading-tight">
                  Verified
                  <br />
                  Tailors
                </span>
              </button>
            </motion.div>

            {/* Mobile Hero Photo Preview */}
            <div className="mt-6 lg:hidden rounded-2xl overflow-hidden border border-[#EAE0FA] shadow-md aspect-[16/9]">
              <SafeImage
                src={heroImageSrc}
                alt="Tailering Master Boutique Studio"
                className="w-full h-full object-cover object-top"
              />
            </div>

            {/* Floating Pill Search Bar (Extends Elegantly Toward Curve on Desktop) */}
            <motion.form
              onSubmit={handleSearchSubmit}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 lg:w-[114%] bg-white rounded-3xl md:rounded-full p-2 shadow-[0_14px_38px_rgba(76,20,118,0.14)] border border-[#EAE0FA] flex flex-col md:flex-row items-stretch md:items-center gap-1.5"
            >
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-[#6D1D9A] absolute left-4 pointer-events-none" />
                <input
                  id="homepage-tailor-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for designs, services, or tailor shops..."
                  className="w-full pl-11 pr-8 py-2.5 rounded-full text-sm text-[#1B1038] placeholder:text-[#7A6E94] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 p-1 text-[#7A6E94] hover:text-[#1B1038] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="hidden md:block w-px h-7 bg-[#E9DDF6]" aria-hidden="true" />

              <button
                type="button"
                onClick={onOpenLocationModal}
                className="flex items-center justify-between md:justify-start gap-2 px-3.5 py-2.5 rounded-full hover:bg-[#FAF6FF] text-left transition-colors md:max-w-[215px] cursor-pointer"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-4 h-4 text-[#E11D48] shrink-0" />
                  <span className="text-xs sm:text-[13px] font-bold text-[#1B1038] truncate">
                    {locality}
                  </span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#4B3F6B] shrink-0" />
              </button>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#7B23B5] to-[#4E127D] hover:from-[#6D1D9A] hover:to-[#3B0D63] text-white text-sm font-bold transition-all shrink-0 cursor-pointer shadow-md shadow-[#5B178E]/25"
              >
                Search Tailors
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.form>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 2: 7-CARD VERTICAL CATEGORY STRIP (Exact Reference Layout)
      ===================================================================== */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-7 pb-4">
        <div className="relative">
          <div
            ref={categoryStripRef}
            className="flex items-stretch gap-3.5 overflow-x-auto no-scrollbar py-2 pr-10"
          >
            {HERO_CATEGORIES.map((cat) => {
              const isActive = activeIntent === cat.id;
              const thumbImg =
                media[cat.mediaKey] ||
                categories.find((c) =>
                  c.name.toLowerCase().includes(cat.labelLine1.toLowerCase().replace('&', '').trim()),
                )?.image ||
                cat.fallbackImg;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveIntent(isActive ? 'all' : cat.id);
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`group flex-1 min-w-[148px] sm:min-w-[158px] px-3 py-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2.5 transition-all duration-150 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#F5EFFB] border-[#6D1D9A] ring-2 ring-[#7B23B5]/20 shadow-md'
                      : 'bg-white border-[#EFE6F9] shadow-[0_6px_22px_rgba(91,33,182,0.06)] hover:border-[#B998E6] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(91,33,182,0.11)]'
                  }`}
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-[#F7F1FC] ring-2 ring-[#F1E6FB] shrink-0">
                    <SafeImage
                      src={thumbImg}
                      alt={cat.label}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p
                    className={`text-[12.5px] font-bold leading-snug ${
                      isActive ? 'text-[#5B178E]' : 'text-[#1B1038] group-hover:text-[#6D1D9A]'
                    }`}
                  >
                    {cat.labelLine1}
                    <br />
                    {cat.labelLine2}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={scrollCategoriesRight}
            aria-label="Scroll categories right"
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-[#EAE0FA] shadow-md text-[#6D1D9A] hover:bg-[#6D1D9A] hover:text-white items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ====================================================================
          SECTION 3: "HOW TAILERING WORKS?" 4-STEP HORIZONTAL BAND
      ===================================================================== */}
      <section
        id="how-tailering-works"
        className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-5 pb-4"
      >
        <div className="rounded-3xl bg-gradient-to-r from-[#FDF3EE] via-[#FAF1F8] to-[#F3ECFC] border border-[#EFE4FA] p-6 sm:p-8 flex flex-col lg:flex-row items-stretch lg:items-center gap-6">
          <div className="lg:w-[27%] shrink-0">
            <h2 className="text-2xl sm:text-[26px] font-extrabold text-[#1B1038] tracking-tight leading-snug">
              How <span className="text-[#6D1D9A]">Tailering</span> Works?
            </h2>
            <p className="text-xs sm:text-sm text-[#4B3F6B] mt-2 leading-relaxed">
              Get your perfect fit in just a few simple steps
            </p>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative">
            {HOW_IT_WORKS_STEPS.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.step}
                  className="relative bg-white/90 rounded-2xl border border-[#EFE6F9] px-4 py-5 text-center shadow-2xs flex flex-col items-center"
                >
                  <div className="relative mb-3">
                    <span className="w-12 h-12 rounded-2xl bg-[#F6F0FC] text-[#6D1D9A] flex items-center justify-center">
                      <IconComp className="w-6 h-6 stroke-[1.75]" />
                    </span>
                    <span className="absolute -bottom-1 -left-2 w-6 h-6 rounded-full bg-gradient-to-br from-[#7B23B5] to-[#56148A] text-white text-[11px] font-extrabold flex items-center justify-center shadow-xs">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-[13.5px] font-extrabold text-[#1B1038]">{item.title}</h3>
                  <p className="text-[11.5px] text-[#5B4E7A] mt-1 leading-relaxed">{item.desc}</p>

                  {idx < HOW_IT_WORKS_STEPS.length - 1 && (
                    <ArrowRight
                      aria-hidden="true"
                      className="hidden lg:block w-4 h-4 text-[#B799E2] absolute -right-2.5 top-1/2 -translate-y-1/2 z-10"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 4: TRENDING DESIGNS (Live MySQL Catalog + Filter Pills)
      ===================================================================== */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-8 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <h2 className="text-2xl sm:text-[26px] font-extrabold text-[#1B1038] tracking-tight">
              Trending Designs
            </h2>

            <div className="flex flex-wrap items-center gap-1.5">
              {TRENDING_FILTERS.map((tab) => {
                const active = trendingFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTrendingFilter(tab)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-gradient-to-r from-[#7B23B5] to-[#56148A] text-white shadow-sm shadow-[#6D1D9A]/25'
                        : 'bg-[#F5EFFB] text-[#352A52] hover:bg-[#EAE0FA] hover:text-[#6D1D9A]'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('designs', { categoryId: 'all' })}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#1B1038] hover:text-[#6D1D9A] transition-colors cursor-pointer"
          >
            View All Designs
            <ArrowRight className="w-4 h-4 text-[#6D1D9A]" />
          </button>
        </div>

        {trendingDesigns.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="h-64 rounded-2xl bg-[#F5EFFB] animate-pulse border border-[#EAE0FA]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {trendingDesigns.map((design) => {
              const isWished = wishlistIds.includes(design.id);
              return (
                <article
                  key={design.id}
                  className="group bg-white rounded-2xl border border-[#EFE6F9] shadow-[0_6px_22px_rgba(91,33,182,0.06)] hover:shadow-[0_12px_30px_rgba(91,33,182,0.12)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
                >
                  <div
                    onClick={() => onSelectDesign(design)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectDesign(design);
                      }
                    }}
                    className="relative aspect-[4/3.5] bg-[#F7F1FC] overflow-hidden cursor-pointer"
                  >
                    <SafeImage
                      src={design.image}
                      alt={design.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(design.id);
                      }}
                      aria-label={isWished ? 'Remove from saved designs' : 'Save design'}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 hover:bg-white shadow-sm flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isWished ? 'fill-[#E11D48] text-[#E11D48]' : 'text-[#4B3F6B]'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="px-3.5 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[13.5px] font-extrabold text-[#1B1038] truncate">
                        {getShortDesignCardTitle(design)}
                      </h3>
                      <p className="text-[11.5px] text-[#6B5E8A] mt-0.5 truncate">
                        {getDesignCountSubtitle(design)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectDesign(design)}
                      aria-label={`View ${design.title}`}
                      className="w-7 h-7 rounded-full bg-[#6D1D9A] hover:bg-[#521478] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ====================================================================
          SECTION 5: DUAL SPLIT BANNERS — FOR INDIVIDUALS & FOR BUSINESSES (B2B)
      ===================================================================== */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-6 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Card: For Individuals (Deep Emerald-Teal) */}
          <div className="relative rounded-2xl overflow-hidden bg-[#0E5659] min-h-[216px] flex items-center shadow-lg shadow-[#0E5659]/15">
            <div className="absolute inset-y-0 left-0 w-[52%] sm:w-[48%] pointer-events-none select-none">
              <SafeImage
                src={individualsBannerSrc}
                alt="Custom stitching for individuals"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0E5659]/25 to-[#0E5659]" />
            </div>

            <div className="relative z-10 ml-auto w-[62%] sm:w-[58%] py-7 pr-6 sm:pr-8 pl-3 text-white">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-[#A7F3D0] shrink-0" />
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  For Individuals
                </h3>
              </div>
              <p className="text-xs sm:text-[13.5px] text-white/90 mt-2 leading-relaxed max-w-[260px]">
                Get custom outfits, alterations &amp; perfect fit for every occasion.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('custom-stitching')}
                className="mt-5 inline-flex items-center gap-2 bg-white hover:bg-[#F0FDF9] text-[#0E5659] text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-full shadow-md transition-all cursor-pointer"
              >
                Book a Tailor
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Card: For Businesses (B2B) (Rich Royal Purple) */}
          <div className="relative rounded-2xl overflow-hidden bg-[#4C1778] min-h-[216px] flex items-center shadow-lg shadow-[#4C1778]/15">
            <div className="absolute inset-y-0 right-0 w-[50%] sm:w-[46%] pointer-events-none select-none">
              <SafeImage
                src={b2bBannerSrc}
                alt="Bulk uniforms and B2B corporate tailoring"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#4C1778]/25 to-[#4C1778]" />
            </div>

            <div className="relative z-10 w-[66%] sm:w-[60%] py-7 pl-6 sm:pl-8 pr-3 text-white">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-[#E9D5FF] shrink-0" />
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  For Businesses (B2B)
                </h3>
              </div>
              <p className="text-xs sm:text-[13.5px] text-white/90 mt-2 leading-relaxed max-w-[300px]">
                Uniforms, bulk stitching &amp; custom orders for companies, schools &amp;
                organizations.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('uniforms')}
                className="mt-5 inline-flex items-center gap-2 bg-white hover:bg-[#FAF5FF] text-[#4C1778] text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-full shadow-md transition-all cursor-pointer"
              >
                Get a Business Quote
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 6: 4-METRIC LAVENDER TRUST STATS BAR
      ===================================================================== */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-4 pb-4">
        <div className="rounded-2xl bg-[#F4EEFB] border border-[#E9DDF6] px-6 py-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:divide-x lg:divide-[#DFCFF4]">
            <div className="flex items-center justify-center lg:justify-start gap-3.5">
              <Users className="w-8 h-8 text-[#6D1D9A] stroke-[1.6] shrink-0" />
              <div>
                <p className="text-lg sm:text-xl font-extrabold text-[#1B1038] leading-none tabular-nums">
                  10,000+
                </p>
                <p className="text-xs font-medium text-[#5B4E7A] mt-1">Verified Tailors</p>
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-3.5 lg:pl-7">
              <HeartHandshake className="w-8 h-8 text-[#6D1D9A] stroke-[1.6] shrink-0" />
              <div>
                <p className="text-lg sm:text-xl font-extrabold text-[#1B1038] leading-none tabular-nums">
                  50,000+
                </p>
                <p className="text-xs font-medium text-[#5B4E7A] mt-1">Happy Customers</p>
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-3.5 lg:pl-7">
              <Truck className="w-8 h-8 text-[#6D1D9A] stroke-[1.6] shrink-0" />
              <div>
                <p className="text-lg sm:text-xl font-extrabold text-[#1B1038] leading-none tabular-nums">
                  25,000+
                </p>
                <p className="text-xs font-medium text-[#5B4E7A] mt-1">Orders Delivered</p>
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-3.5 lg:pl-7">
              <Star className="w-8 h-8 text-[#6D1D9A] stroke-[1.6] shrink-0" />
              <div>
                <p className="text-lg sm:text-xl font-extrabold text-[#1B1038] leading-none inline-flex items-center gap-1 tabular-nums">
                  4.8
                  <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                </p>
                <p className="text-xs font-medium text-[#5B4E7A] mt-1">Average Rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SECTION 7: LIVE VERIFIED TAILORS NEAR YOU DIRECTORY (MySQL-Backed)
      ===================================================================== */}
      <section
        id="tailor-results"
        ref={resultsRef}
        className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-8 pb-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-[#EFE6F9]">
          <div>
            <p className="text-xs font-bold text-[#6D1D9A] tracking-wide">
              Handpicked Neighborhood Boutiques &amp; Master Studios
            </p>
            <h2 className="text-2xl sm:text-[26px] font-extrabold text-[#1B1038] mt-0.5 tracking-tight">
              {searchQuery.trim()
                ? `Tailors Matching “${searchQuery.trim()}”`
                : activeIntentObj
                  ? `${activeIntentObj.label} Specialists Near You`
                  : 'Verified Tailors Serving Your Area'}
            </h2>
            <p className="text-xs sm:text-sm text-[#5B4E7A] mt-1 tabular-nums">
              Showing <span className="font-bold text-[#1B1038]">{scoredTailors.length}</span>{' '}
              verified {scoredTailors.length === 1 ? 'atelier' : 'ateliers'} near {locality}
              {compareIds.length > 0 && (
                <span>
                  {' '}
                  · <strong className="text-[#6D1D9A]">{compareIds.length} selected</strong> for
                  side-by-side comparison
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPickupOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                pickupOnly
                  ? 'bg-[#6D1D9A] border-[#6D1D9A] text-white shadow-xs'
                  : 'bg-white border-[#EAE0FA] text-[#4B3F6B] hover:border-[#6D1D9A] hover:text-[#6D1D9A]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Doorstep Pickup
            </button>

            <button
              type="button"
              onClick={() => setOpenNowOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                openNowOnly
                  ? 'bg-[#6D1D9A] border-[#6D1D9A] text-white shadow-xs'
                  : 'bg-white border-[#EAE0FA] text-[#4B3F6B] hover:border-[#6D1D9A] hover:text-[#6D1D9A]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Open Now
            </button>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#EAE0FA] text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#6D1D9A]" />
              <label htmlFor="tailor-sort" className="text-[#746894] font-medium">
                Sort:
              </label>
              <select
                id="tailor-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="font-bold text-[#1B1038] bg-transparent focus:outline-none cursor-pointer"
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
              onClick={() => onNavigate('fabric-calculator')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#FAF5FF] border border-[#E2D2F7] text-[#6D1D9A] hover:bg-[#EFE5FB] transition-colors cursor-pointer"
            >
              <Ruler className="w-3.5 h-3.5" />
              Fabric Calculator
            </button>

            <button
              type="button"
              onClick={() => onNavigate('nearby-shops')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#F5EFFB] border border-[#DDD0FA] text-[#6D1D9A] hover:bg-[#EAE0FA] transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              Live Map
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-[#746894] hover:text-[#1B1038] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Tailor Cards Grid */}
        {scoredTailors.length === 0 ? (
          <div className="mt-8 bg-[#FAF8FF] rounded-2xl border border-[#EAE0FA] p-10 text-center max-w-xl mx-auto">
            <Scissors className="w-8 h-8 text-[#6D1D9A] mx-auto mb-3" />
            <h3 className="text-xl font-bold text-[#1B1038]">
              {loadingTailors ? 'Loading Verified Tailors...' : 'No matching tailors found'}
            </h3>
            <p className="text-sm text-[#5B4E7A] mt-1.5">
              {loadingTailors
                ? 'Fetching live tailor shops, pricing, and portfolio works from the database.'
                : 'Try a broader service keyword like “blouse”, “alteration”, “suit”, “lehenga”, or “saree”, or clear your active filters.'}
            </p>
            {!loadingTailors && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#7B23B5] to-[#56148A] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Reset Search &amp; Filters
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {scoredTailors.map(({ tailor, rankedServices, rankedPortfolio }, idx) => {
              const isCompared = compareIds.includes(tailor.id);

              return (
                <motion.article
                  key={tailor.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: Math.min(idx * 0.04, 0.24),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`group bg-white rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden ${
                    isCompared
                      ? 'border-[#6D1D9A] ring-2 ring-[#7B23B5]/25 shadow-lg shadow-[#6D1D9A]/10'
                      : 'border-[#EFE6F9] hover:shadow-xl hover:shadow-[#6D1D9A]/10 hover:border-[#C9AEED]'
                  }`}
                >
                  <div>
                    {/* Visual Atelier Cover Photo + Shop Logo Badge */}
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
                      className="relative h-44 bg-[#1B1038] overflow-hidden cursor-pointer"
                    >
                      <SafeImage
                        src={tailor.coverImage}
                        alt={tailor.shopName}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1B1038]/95 via-[#1B1038]/35 to-[#1B1038]/15" />

                      <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between text-xs text-white tabular-nums">
                        <span className="inline-flex items-center gap-1.5 bg-[#1B1038]/80 backdrop-blur-xs px-2.5 py-1 rounded-full font-semibold">
                          <Star className="w-3.5 h-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                          {tailor.rating.toFixed(1)}
                          <span className="text-white/75 font-normal">({tailor.reviewCount})</span>
                          <span className="text-white/35" aria-hidden="true">
                            ·
                          </span>
                          <span>{tailor.distanceKm.toFixed(1)} km</span>
                        </span>

                        <span className="bg-white/95 text-[#5B178E] px-2.5 py-1 rounded-full font-extrabold shadow-xs">
                          From ₹{tailor.startingPrice.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center gap-3">
                        <TailorLogoBadge
                          logoUrl={tailor.logoUrl}
                          shopName={tailor.shopName}
                          size="md"
                          className="ring-2 ring-white/90 shadow-md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-[15.5px] font-extrabold text-white leading-snug truncate">
                              {tailor.shopName}
                            </h3>
                            {tailor.verified && (
                              <BadgeCheck
                                className="w-4 h-4 text-[#D8B4FE] shrink-0"
                                aria-label="Verified Tailor"
                              />
                            )}
                          </div>
                          <p className="text-xs text-white/85 mt-0.5 truncate tabular-nums">
                            Master {tailor.masterTailor} · {tailor.yearsExperience} yrs ·{' '}
                            {tailor.locality}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Structured Card Body */}
                    <div className="p-4 sm:p-5 space-y-3.5">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                        {tailor.pickupAvailable ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#6D1D9A]">
                            <Truck className="w-3.5 h-3.5" />
                            Pickup {tailor.homeVisitFee === 0 ? 'Free' : `₹${tailor.homeVisitFee}`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#5B4E7A]">
                            <Store className="w-3.5 h-3.5" />
                            Studio Visit Only
                          </span>
                        )}
                        <span className="text-[#DDD0FA]" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[#5B4E7A] tabular-nums">{tailor.turnaround}</span>
                        <span className="text-[#DDD0FA]" aria-hidden="true">
                          ·
                        </span>
                        <span
                          className={
                            tailor.openNow
                              ? 'font-bold text-emerald-700'
                              : 'font-medium text-[#746894]'
                          }
                        >
                          {tailor.openNow ? 'Open Now' : 'Opens Tomorrow'}
                        </span>
                      </div>

                      <p className="text-xs text-[#5B4E7A] leading-relaxed line-clamp-1">
                        <span className="font-bold text-[#1B1038]">Specialties:</span>{' '}
                        {tailor.specialties.join(' · ')}
                      </p>

                      {/* Top 2 Matching Services */}
                      <div className="pt-2.5 border-t border-[#F4EEFB]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-[#746894]">
                            {hasActiveFilters ? 'Matching Services' : 'Popular Services'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setProfileState({ tailor, tab: 'services' })}
                            className="text-[11px] font-bold text-[#6D1D9A] hover:text-[#4E127D] cursor-pointer"
                          >
                            All {tailor.services.length} rates
                          </button>
                        </div>

                        <div className="divide-y divide-[#F5EFFB]">
                          {rankedServices.slice(0, 2).map((srv) => (
                            <div
                              key={srv.id}
                              className="py-1.5 flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="font-semibold text-[#1B1038] truncate">
                                {srv.name}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-extrabold text-[#1B1038] tabular-nums">
                                  ₹{srv.price.toLocaleString('en-IN')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setBookingState({ tailor, serviceId: srv.id })}
                                  className="px-2.5 py-0.5 rounded-full border border-[#DDD0FA] hover:border-[#6D1D9A] hover:bg-[#F5EFFB] text-[11px] font-bold text-[#5B178E] transition-colors cursor-pointer"
                                >
                                  Book
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Previous Work Portfolio 3-Thumb Strip */}
                      <div className="pt-2.5 border-t border-[#F4EEFB]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-[#746894]">
                            Previous Work
                          </span>
                          <button
                            type="button"
                            onClick={() => setProfileState({ tailor, tab: 'portfolio' })}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6D1D9A] hover:text-[#4E127D] cursor-pointer"
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
                              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF8FF] border border-[#EAE0FA]">
                                <SafeImage
                                  src={work.image}
                                  alt={work.title}
                                  className="w-full h-full object-cover object-top group-hover/thumb:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <p className="text-[11px] font-medium text-[#4B3F6B] truncate mt-1 group-hover/thumb:text-[#6D1D9A] transition-colors">
                                {work.title}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="px-4 sm:px-5 py-3 bg-[#FAF8FF] border-t border-[#EFE6F9] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleCompare(tailor.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                          isCompared
                            ? 'border-[#6D1D9A] bg-[#F5EFFB] text-[#6D1D9A]'
                            : 'border-[#DDD0FA] bg-white text-[#4B3F6B] hover:border-[#6D1D9A] hover:text-[#6D1D9A]'
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
                        className="px-2.5 py-1.5 rounded-full text-xs font-semibold border border-[#DDD0FA] bg-white text-[#1B1038] hover:border-[#6D1D9A] hover:text-[#6D1D9A] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        View Shop
                      </button>

                      <button
                        type="button"
                        onClick={() => setProfileState({ tailor, tab: 'reviews' })}
                        className="px-2.5 py-1.5 rounded-full text-xs font-semibold border border-[#EAE0FA] bg-white text-[#5B4E7A] hover:border-[#6D1D9A] hover:text-[#6D1D9A] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Reviews
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
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#7B23B5] to-[#56148A] hover:from-[#6D1D9A] hover:to-[#43106B] text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      <Calendar className="w-3.5 h-3.5 text-white" />
                      {tailor.pickupAvailable ? 'Schedule Pickup' : 'Book Visit'}
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </section>

      {/* ====================================================================
          SECTION 8: WHAT OUR CUSTOMERS SAY (Live DB Review Carousel)
      ===================================================================== */}
      {visibleTestimonials.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-10 pb-4">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="text-2xl sm:text-[26px] font-extrabold text-[#1B1038] tracking-tight">
              What Our <span className="text-[#6D1D9A]">Customers Say</span>
            </h2>

            {totalTestimonialPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setTestimonialPage(
                      (p) => (p - 1 + totalTestimonialPages) % totalTestimonialPages,
                    )
                  }
                  aria-label="Previous customer reviews"
                  className="w-8 h-8 rounded-full border border-[#E2D2F7] bg-white text-[#6D1D9A] hover:bg-[#F5EFFB] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTestimonialPage((p) => (p + 1) % totalTestimonialPages)}
                  aria-label="Next customer reviews"
                  className="w-8 h-8 rounded-full border border-[#E2D2F7] bg-white text-[#6D1D9A] hover:bg-[#F5EFFB] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {visibleTestimonials.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-2xl border border-[#EFE6F9] shadow-[0_6px_22px_rgba(91,33,182,0.05)] p-5 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-[#F1E6FB] bg-[#F5EFFB] shrink-0">
                  <SafeImage
                    src={rev.avatar}
                    alt={rev.author}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-[#1B1038] truncate">{rev.author}</p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, starIdx) => (
                      <Star
                        key={starIdx}
                        className={`w-3.5 h-3.5 ${
                          starIdx < rev.rating
                            ? 'fill-[#F59E0B] text-[#F59E0B]'
                            : 'text-[#E5E7EB]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#4B3F6B] mt-2 leading-relaxed">
                    &ldquo;{rev.quote}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => setProfileState({ tailor: rev.tailor, tab: 'reviews' })}
                    className="text-[11px] font-semibold text-[#6D1D9A] hover:underline mt-2 truncate block text-left cursor-pointer"
                  >
                    {rev.shopName} · {rev.locality} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ====================================================================
          SECTION 9: "TAKE TAILERING WITH YOU" APP DOWNLOAD BANNER
      ===================================================================== */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-8 pb-4">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#0E5D61] via-[#E9DFF7] to-[#F5EFFB] border border-[#E5D8F6] px-6 sm:px-10 py-6 sm:py-7 flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left Phone Mockup + Heading */}
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="relative w-32 h-24 sm:w-36 sm:h-28 shrink-0 flex items-center justify-center">
              <div className="w-28 h-36 -rotate-6 rounded-[24px] bg-[#1B1038] p-1.5 shadow-2xl border-2 border-white/60 translate-y-2">
                <div className="w-full h-full rounded-[18px] bg-gradient-to-b from-[#FAF5FF] via-[#F2E6FC] to-[#E6D4F8] flex flex-col items-center justify-center px-2">
                  <div className="w-8 h-1 rounded-full bg-[#1B1038]/20 mb-3" />
                  <TaileringLogo compact />
                  <span className="mt-2 text-[9px] font-bold text-[#6D1D9A] tracking-wide">
                    Doorstep Studio
                  </span>
                </div>
              </div>
            </div>

            <div className="max-w-md">
              <h2 className="text-2xl sm:text-[28px] font-extrabold text-[#1B1038] tracking-tight leading-tight">
                Take <span className="text-[#6D1D9A]">Tailering</span> With You
              </h2>
              <p className="text-xs sm:text-sm text-[#352A52] mt-1.5 leading-relaxed font-medium">
                Download our mobile app and book your tailoring services anytime, anywhere.
              </p>
            </div>
          </div>

          {/* Right Store Badges + QR Code */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                onNotifyToast(
                  'Tailering Android App — Add to Home Screen or install directly from Google Play.',
                )
              }
              className="inline-flex items-center gap-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2.5 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#34A853" d="M3 2.5v19l10.5-9.5L3 2.5z" />
                <path fill="#4285F4" d="M13.5 12L3 2.5l14.5 7.4L13.5 12z" />
                <path fill="#FBBC05" d="M17.5 14.1L13.5 12l4-2.1 3 1.5c.7.4.7 1.3 0 1.7l-3 1z" />
                <path fill="#EA4335" d="M3 21.5l10.5-9.5 4 2.1L3 21.5z" />
              </svg>
              <span className="text-left leading-tight">
                <span className="block text-[9px] uppercase tracking-wider text-white/75">
                  Get it on
                </span>
                <span className="block text-sm font-bold">Google Play</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                onNotifyToast(
                  'Tailering iOS App — Save to iPhone Home Screen via Safari Share menu.',
                )
              }
              className="inline-flex items-center gap-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-2.5 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16.37 12.18c-.02-2.12 1.73-3.15 1.81-3.2-.99-1.45-2.52-1.64-3.06-1.66-1.3-.13-2.55.77-3.21.77-.67 0-1.69-.75-2.78-.73-1.43.02-2.75.83-3.49 2.11-1.49 2.58-.38 6.41 1.07 8.51.71 1.03 1.56 2.18 2.67 2.14 1.07-.04 1.48-.69 2.77-.69 1.3 0 1.66.69 2.79.67 1.15-.02 1.88-1.05 2.58-2.08.82-1.19 1.15-2.34 1.17-2.4-.03-.01-2.29-.88-2.32-3.44zM14.27 5.83c.59-.72.99-1.71.88-2.71-.85.03-1.88.57-2.49 1.28-.55.63-1.02 1.65-.89 2.62.95.07 1.91-.48 2.5-1.19z" />
              </svg>
              <span className="text-left leading-tight">
                <span className="block text-[9px] text-white/75">Download on the</span>
                <span className="block text-sm font-bold">App Store</span>
              </span>
            </button>

            {/* Clean Scannable-Style Brand QR Badge */}
            <div
              title="Scan to open Tailering Mobile App"
              className="w-16 h-16 rounded-xl bg-white p-1.5 border border-[#DFCFF4] shadow-sm flex items-center justify-center shrink-0"
            >
              <svg viewBox="0 0 36 36" className="w-full h-full text-[#1B1038]" aria-hidden="true">
                <rect x="2" y="2" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <rect x="5" y="5" width="4" height="4" fill="currentColor" />
                <rect x="24" y="2" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <rect x="27" y="5" width="4" height="4" fill="currentColor" />
                <rect x="2" y="24" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <rect x="5" y="27" width="4" height="4" fill="currentColor" />
                <rect x="15" y="4" width="3" height="3" fill="currentColor" />
                <rect x="19" y="8" width="3" height="3" fill="currentColor" />
                <rect x="15" y="14" width="6" height="6" rx="1" fill="#6D1D9A" />
                <rect x="4" y="16" width="4" height="3" fill="currentColor" />
                <rect x="10" y="16" width="3" height="5" fill="currentColor" />
                <rect x="24" y="16" width="4" height="4" fill="currentColor" />
                <rect x="30" y="16" width="4" height="4" fill="currentColor" />
                <rect x="16" y="24" width="4" height="4" fill="currentColor" />
                <rect x="22" y="24" width="4" height="4" fill="currentColor" />
                <rect x="28" y="24" width="6" height="4" fill="currentColor" />
                <rect x="16" y="30" width="6" height="4" fill="currentColor" />
                <rect x="25" y="30" width="9" height="4" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* FLOATING COMPARE DOCK */}
      <AnimatePresence>
        {comparedTailors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-3xl bg-[#19092C] text-white rounded-2xl shadow-2xl border border-white/15 px-4 py-2.5 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar">
              <span className="text-xs font-bold text-[#D8B4FE] shrink-0 tabular-nums">
                Compare ({comparedTailors.length}/3):
              </span>
              {comparedTailors.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 text-xs bg-white/10 px-2.5 py-1 rounded-full whitespace-nowrap"
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
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                  comparedTailors.length >= 2
                    ? 'bg-gradient-to-r from-[#7B23B5] to-[#56148A] hover:from-[#6D1D9A] hover:to-[#43106B] text-white cursor-pointer'
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
        scenes={craftScenes}
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
        user={user}
        onRequireSignIn={onRequireSignIn}
        onNotifyToast={onNotifyToast}
        onReviewSubmitted={onReviewSubmitted}
        onClose={() => setProfileState(null)}
        onBookTailor={(tailor, serviceId, note) => {
          setProfileState(null);
          setBookingState({ tailor, serviceId, note });
        }}
      />

      <QuickBookModal
        tailor={bookingState?.tailor || null}
        initialServiceId={bookingState?.serviceId}
        initialNote={bookingState?.note}
        locality={locality}
        onClose={() => setBookingState(null)}
        onConfirmBooking={(order) => {
          onCreateOrder(order);
        }}
        onNotifyToast={onNotifyToast}
      />

      <TailorCompareModal
        open={compareModalOpen}
        tailors={comparedTailors}
        onClose={() => setCompareModalOpen(false)}
        onRemove={(id) => {
          setCompareIds((prev) => {
            const next = prev.filter((item) => item !== id);
            if (next.length < 2) setCompareModalOpen(false);
            return next;
          });
        }}
        onViewProfile={(tailor) => {
          setCompareModalOpen(false);
          setProfileState({ tailor, tab: 'services' });
        }}
        onBookTailor={(tailor) => {
          setCompareModalOpen(false);
          setBookingState({ tailor, serviceId: tailor.services[0]?.id });
        }}
      />
    </div>
  );
};

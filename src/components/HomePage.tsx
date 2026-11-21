import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Gift,
  Heart,
  Home,
  Mail,
  MessageCircle,
  Ruler,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Users,
  Wallet,
  Briefcase,
} from 'lucide-react';
import {
  ASSETS,
  CATEGORIES,
  DESIGNS_CATALOG,
  FESTIVE_DEALS,
  OTHER_SERVICES,
  PROMO_OFFERS,
  VERIFIED_REVIEWS,
} from '../data/catalogData';
import { DesignProduct, PageRoute } from '../types';
import { SafeImage } from './SafeImage';

interface HomePageProps {
  onNavigate: (page: PageRoute, opts?: { categoryId?: string; searchQuery?: string }) => void;
  onSelectDesign: (design: DesignProduct) => void;
  wishlistIds: string[];
  onToggleWishlist: (designId: string) => void;
  onOpenReferral: () => void;
  onOpenSupport: () => void;
  onNotifyToast: (msg: string) => void;
}

const HERO_POPULAR_TAGS = [
  { label: 'Designer Blouses', route: 'designs' as PageRoute, categoryId: 'blouse' },
  { label: 'Saree Fall & Pico', route: 'alterations' as PageRoute },
  { label: 'Saree Pre-Pleating', route: 'alterations' as PageRoute },
  { label: 'Bridal Maggam', route: 'designs' as PageRoute, categoryId: 'maggam' },
  { label: 'Pant Alterations', route: 'alterations' as PageRoute },
];

const TICKER_ITEMS = [
  '7-DAY FIT GUARANTEE',
  'FREE DOORSTEP MEASUREMENTS',
  '724+ CUSTOM DESIGNS',
  '29+ TAILOR PARTNERS',
  '22 STYLE CATEGORIES',
  'FIXED TRANSPARENT PRICING',
];

const BANNER_SLIDES = [
  {
    id: 'festival',
    kicker: 'FESTIVE COLLECTION 2026',
    titleLine1: 'Festival',
    titleLine2: 'Looks for Everyone',
    subtitle: 'Custom-stitched outfits for the whole family',
    desc: 'From kurtas and shirts to ethnic sets — celebrate in style with perfectly stitched outfits at your doorstep.',
    cta: "Explore Men's & Family Collection",
    targetRoute: 'designs' as PageRoute,
    categoryId: 'men-kurta-set',
    image: ASSETS.bannerFestive,
    bgClass: 'from-[#FFF4F6] via-[#FFF8F2] to-[#FCE7F3]',
  },
  {
    id: 'bridal',
    kicker: 'BRIDAL ATELIER · HYDERABAD',
    titleLine1: 'Bespoke',
    titleLine2: 'Bridal & Maggam Work',
    subtitle: 'Handcrafted zardosi blouses & royal lehengas',
    desc: 'Verified boutique master artisans stitch your bridal trousseau with complimentary doorstep trial fittings.',
    cta: 'Explore Bridal & Maggam',
    targetRoute: 'designs' as PageRoute,
    categoryId: 'maggam',
    image: ASSETS.bridalBlouse,
    bgClass: 'from-[#FFF7ED] via-[#FEF3C7] to-[#FFEDD5]',
  },
  {
    id: 'alterations',
    kicker: 'EXPRESS 48-HOUR SERVICE',
    titleLine1: 'Doorstep',
    titleLine2: 'Alterations from ₹49',
    subtitle: 'Zero shop visits · Pickup & delivery included',
    desc: 'Waist fitting, original denim hem finish, zip replacement, and 1-minute saree pleating handled from home.',
    cta: 'Book Doorstep Alteration',
    targetRoute: 'alterations' as PageRoute,
    categoryId: undefined,
    image: ASSETS.sareePleating,
    bgClass: 'from-[#F5F3FF] via-[#FFF7ED] to-[#FEF2F2]',
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onSelectDesign,
  wishlistIds,
  onToggleWishlist,
  onOpenReferral,
  onOpenSupport,
  onNotifyToast,
}) => {
  const [heroSearch, setHeroSearch] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [categoryGender, setCategoryGender] = useState<'all' | 'women' | 'men'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [notifyContact, setNotifyContact] = useState('');
  const [notifyArea, setNotifyArea] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const filteredCategories =
    categoryGender === 'all'
      ? CATEGORIES
      : CATEGORIES.filter((c) => c.gender === categoryGender);

  const trendingDesigns = DESIGNS_CATALOG.filter((d) => d.isTrending).slice(0, 6);

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroSearch.trim();
    if (!q) {
      onNavigate('designs');
      return;
    }
    if (
      q.toLowerCase().includes('alter') ||
      q.toLowerCase().includes('zip') ||
      q.toLowerCase().includes('pico') ||
      q.toLowerCase().includes('pleat')
    ) {
      onNavigate('alterations', { searchQuery: q });
    } else {
      onNavigate('designs', { searchQuery: q });
    }
  };

  const handleCopyPromo = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(code);
    onNotifyToast(`Promo code ${code} copied! Apply it in your StitchMate bag.`);
    setTimeout(() => setCopiedCode(null), 2400);
  };

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyContact.trim() || !notifyArea.trim()) {
      onNotifyToast('Please enter your phone/email and area pincode.');
      return;
    }
    setNotifySubmitted(true);
    onNotifyToast(`We'll notify you as soon as StitchMate launches in ${notifyArea}!`);
  };

  const currentSlide = BANNER_SLIDES[activeSlide];

  return (
    <div className="space-y-9 sm:space-y-11 pb-8">
      {/* 1. HERO SECTION */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-4">
        <div className="relative rounded-2xl overflow-hidden border border-[#F2E6D8] bg-[#FFF8F0] shadow-sm">
          {/* Background Studio Image on Right */}
          <div className="absolute inset-0 pointer-events-none">
            <SafeImage
              src={ASSETS.heroStudio}
              alt="StitchMate heritage tailoring studio"
              className="w-full h-full object-cover object-right opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFF9F2] via-[#FFF9F2]/95 lg:via-[#FFF9F2]/88 to-[#FFF9F2]/25 lg:to-transparent" />
          </div>

          {/* Hero Foreground Content */}
          <div className="relative z-10 px-5 sm:px-9 lg:px-12 py-8 sm:py-11 lg:py-12 max-w-[680px]">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase text-[#EA580C] bg-[#FFF7ED] border border-[#FED7AA] px-3 py-1 rounded-full mb-4">
              <span>STITCHMATE</span>
              <span className="text-[#78716C] font-semibold">PREMIUM TAILORING — HYDERABAD</span>
            </div>

            <h1 className="text-[28px] sm:text-[38px] lg:text-[44px] font-extrabold text-[#1C1917] leading-[1.12] tracking-tight text-balance">
              Tailoring at your fingertips,{' '}
              <span className="text-[#EA580C]">Stitched by Hyderabad&apos;s finest.</span>
            </h1>

            <p className="mt-3.5 text-sm sm:text-[15px] text-[#57534E] leading-relaxed max-w-xl">
              Experience bespoke custom stitching right from your home. We send certified master
              tailors to your doorstep for precision measurements, stitch with boutique perfection,
              and deliver with dedicated fit assurance.
            </p>

            {/* Primary CTA Buttons */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('custom-stitching')}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold text-sm px-5 py-3 rounded-xl shadow-md shadow-[#EA580C]/20 transition-all cursor-pointer"
              >
                <Scissors className="w-4 h-4" />
                Book Stitching
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('alterations')}
                className="inline-flex items-center gap-2 bg-white hover:bg-[#FFF7ED] text-[#1C1917] font-semibold text-sm px-5 py-3 rounded-xl border border-[#E7DDD2] shadow-xs transition-colors cursor-pointer"
              >
                <Ruler className="w-4 h-4 text-[#EA580C]" />
                Doorstep Alterations from ₹49
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('designs')}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#EA580C] hover:text-[#C2410C] cursor-pointer"
            >
              Browse 724+ Designs
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Search Bar inside Hero */}
            <form
              onSubmit={handleHeroSearchSubmit}
              className="mt-4 flex items-center bg-white rounded-xl border border-[#E7DDD2] p-1.5 shadow-sm max-w-[560px]"
            >
              <Search className="w-4 h-4 text-[#A8A29E] ml-2.5 shrink-0" />
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder="Search blouse, kurta, lehenga, pant alteration..."
                className="w-full px-3 py-2 text-xs sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none bg-transparent"
              />
              <button
                type="submit"
                className="bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                Search
              </button>
            </form>

            {/* Popular Quick Links */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#78716C]">
              <span className="font-bold uppercase tracking-wider text-[#A8A29E]">POPULAR:</span>
              {HERO_POPULAR_TAGS.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => onNavigate(tag.route, { categoryId: tag.categoryId })}
                  className="text-[#44403C] hover:text-[#EA580C] font-medium underline-offset-2 hover:underline cursor-pointer"
                >
                  {tag.label}
                </button>
              ))}
            </div>

            {/* 4 Trust Metrics Row */}
            <div className="mt-6 pt-5 border-t border-[#EFE5D8] grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#1C1917] tabular-nums">724+ Designs</p>
                  <p className="text-[10.5px] text-[#78716C]">Curated Catalog</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#1C1917]">Home Visit</p>
                  <p className="text-[10.5px] text-[#78716C]">Free Measurement</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#1C1917]">5-Day Delivery</p>
                  <p className="text-[10.5px] text-[#78716C]">Free Refit Guarantee</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 fill-[#EA580C]" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#1C1917] tabular-nums">4.9★ Rating</p>
                  <p className="text-[10.5px] text-[#78716C]">Verified Tailors</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HORIZONTAL TRUST TICKER STRIP */}
      <section className="w-full bg-[#FFF7ED] border-y border-[#FFEDD5] overflow-hidden py-2.5">
        <div className="animate-ticker flex items-center gap-10">
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.09em] text-[#9A3412] whitespace-nowrap"
            >
              <Scissors className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FESTIVE PROMOTIONAL BANNER CAROUSEL */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div
          className={`relative rounded-2xl overflow-hidden border border-[#F2E4D9] bg-gradient-to-r ${currentSlide.bgClass} shadow-sm`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[340px] sm:min-h-[380px]">
            {/* Left Campaign Content */}
            <div className="lg:col-span-7 p-6 sm:p-9 lg:p-11 flex flex-col justify-center relative z-10">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-[#9F1239] mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>StitchMate · {currentSlide.kicker}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold leading-[1.08] tracking-tight text-[#881337]">
                <span className="font-serif-accent">{currentSlide.titleLine1}</span>{' '}
                <span className="block text-[#9F1239]">{currentSlide.titleLine2}</span>
              </h2>

              <p className="mt-2.5 text-sm sm:text-base font-bold text-[#44403C]">
                {currentSlide.subtitle}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-[#57534E] max-w-lg leading-relaxed">
                {currentSlide.desc}
              </p>

              {/* Mini Garment Highlights */}
              {activeSlide === 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-lg">
                  {[
                    { name: 'Kurtas', sub: 'Traditional & Modern' },
                    { name: 'Shirts', sub: 'Festive Styles' },
                    { name: 'Ethnic Sets', sub: 'For All Ages' },
                    { name: 'Family Combos', sub: 'Matching Styles' },
                  ].map((pill) => (
                    <div
                      key={pill.name}
                      className="bg-white/85 backdrop-blur-xs border border-[#F5D0D8] rounded-xl px-2.5 py-2 text-center"
                    >
                      <p className="text-xs font-bold text-[#881337]">{pill.name}</p>
                      <p className="text-[10px] text-[#78716C]">{pill.sub}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Offer Strip */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-xl">
                <div className="bg-white/90 rounded-xl px-3 py-2 border border-[#F3E1D8] flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#E11D48] shrink-0" />
                  <div>
                    <p className="text-xs font-extrabold text-[#E11D48]">₹150</p>
                    <p className="text-[10px] text-[#57534E]">Welcome Offer</p>
                  </div>
                </div>
                <div className="bg-white/90 rounded-xl px-3 py-2 border border-[#F3E1D8] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#7C3AED] shrink-0" />
                  <div>
                    <p className="text-xs font-extrabold text-[#6D28D9]">5–7 Days</p>
                    <p className="text-[10px] text-[#57534E]">Expected Delivery</p>
                  </div>
                </div>
                <div className="bg-white/90 rounded-xl px-3 py-2 border border-[#F3E1D8] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  <div>
                    <p className="text-xs font-extrabold text-[#047857]">Zero Fee</p>
                    <p className="text-[10px] text-[#57534E]">Pickup & Measurement</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(currentSlide.targetRoute, { categoryId: currentSlide.categoryId })
                  }
                  className="inline-flex items-center gap-2 bg-[#881337] hover:bg-[#9F1239] text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full shadow-md transition-colors cursor-pointer"
                >
                  {currentSlide.cta}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Campaign Visual */}
            <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-full">
              <SafeImage
                src={currentSlide.image}
                alt={currentSlide.titleLine2}
                className="w-full h-full object-cover object-top lg:object-center"
              />
              <div className="hidden lg:block absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#FFF8F2] to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Carousel Controls */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-black/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
            {BANNER_SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setActiveSlide(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === activeSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Previous slide"
            onClick={() =>
              setActiveSlide((prev) => (prev - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length)
            }
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#1C1917] shadow-md items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setActiveSlide((prev) => (prev + 1) % BANNER_SLIDES.length)}
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-[#1C1917] shadow-md items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 4. EXPLORE CATEGORIES */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1C1917]">Explore Categories</h2>
            <p className="text-xs font-semibold text-[#EA580C]">Stitch from below</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('designs', { categoryId: 'all' })}
            className="inline-flex items-center gap-0.5 text-xs font-bold text-[#EA580C] hover:underline cursor-pointer"
          >
            All categories
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* All / Women / Men Filter Pills */}
        <div className="flex items-center gap-2 mb-5">
          {(['all', 'women', 'men'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setCategoryGender(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                categoryGender === tab
                  ? 'bg-[#18181B] text-white shadow-sm'
                  : 'bg-white text-[#57534E] border border-[#E7E5E4] hover:border-[#EA580C] hover:text-[#EA580C]'
              }`}
            >
              {tab === 'all' ? 'All' : tab}
            </button>
          ))}
        </div>

        {/* Category Tiles Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3 sm:gap-4">
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onNavigate('designs', { categoryId: cat.id })}
              className="group flex flex-col items-center text-center focus:outline-none cursor-pointer"
            >
              <div className="w-full aspect-square rounded-2xl overflow-hidden border border-[#F0E6DC] bg-[#FFF7ED] shadow-2xs group-hover:border-[#EA580C] group-hover:-translate-y-0.5 transition-all">
                <SafeImage
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <span className="mt-1.5 text-[11px] font-semibold text-[#292524] group-hover:text-[#EA580C] leading-tight line-clamp-2">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 5. FESTIVE DEALS & COLLECTIONS */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 mb-4">
          <h2 className="text-base sm:text-lg font-extrabold text-[#1C1917]">
            Festive Deals & Collections
          </h2>
          <p className="text-xs text-[#78716C] italic">Explore top celebration cuts crafted for you</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {FESTIVE_DEALS.map((deal) => (
            <button
              key={deal.id}
              type="button"
              onClick={() => onNavigate('designs', { categoryId: deal.categoryId })}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-[#F0E4D8] shadow-sm text-left cursor-pointer"
            >
              <SafeImage
                src={deal.image}
                alt={deal.title}
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${deal.accentBg}`} />
              <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-xs text-[#881337] text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                StitchMate
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                <p className="text-xs sm:text-[13px] font-extrabold leading-tight font-serif-accent">
                  {deal.title}
                </p>
                <p className="text-[10px] text-white/85 mt-0.5">{deal.subtitle}</p>
                <div className="mt-1.5 inline-flex items-baseline gap-1 bg-white/95 text-[#9F1239] px-2 py-0.5 rounded-md">
                  <span className="text-[9px] font-semibold uppercase">{deal.tag}</span>
                  <span className="text-xs font-extrabold tabular-nums">{deal.priceText}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 6. OTHER SERVICES */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1C1917]">Other Services</h2>
            <p className="text-xs text-[#78716C]">
              Saree finishing, maggam embroidery & doorstep alterations
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('alterations')}
            className="inline-flex items-center gap-0.5 text-xs font-bold text-[#EA580C] hover:underline cursor-pointer"
          >
            View All
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {OTHER_SERVICES.map((srv) => (
            <button
              key={srv.id}
              type="button"
              onClick={() => onNavigate(srv.targetRoute)}
              className="group bg-white rounded-2xl border border-[#EFE6DC] hover:border-[#FED7AA] hover:shadow-md p-3.5 flex items-center gap-3 text-left transition-all cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#FFF7ED] border border-[#F5E6D6] shrink-0">
                <SafeImage src={srv.image} alt={srv.title} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-[13px] font-bold text-[#1C1917] group-hover:text-[#EA580C] truncate">
                  {srv.title}
                </h3>
                <p className="text-[11px] text-[#78716C] line-clamp-1 mt-0.5">{srv.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10.5px] font-extrabold whitespace-nowrap ${srv.accent}`}>
                  {srv.priceLabel}
                </span>
                <span className="w-6 h-6 rounded-full bg-[#FFF7ED] text-[#EA580C] group-hover:bg-[#EA580C] group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 7. HOW STITCHMATE WORKS */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-[#EFE6DC] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-[#F5EFE8]">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#1C1917]">
                How StitchMate Works
              </h2>
              <p className="text-xs sm:text-sm text-[#78716C] mt-0.5">
                From doorstep measurement to perfect fit in 4 simple steps
              </p>
            </div>
            <span className="self-start sm:self-auto text-[11px] font-bold text-[#EA580C] bg-[#FFF7ED] border border-[#FED7AA] px-3 py-1 rounded-full">
              Doorstep Tailoring
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-7">
            {[
              {
                num: '1',
                title: 'Browse Design',
                desc: 'Select from curated styles, upload a reference picture, or request custom styling for your outfit.',
                icon: Search,
                badgeBg: 'bg-[#F97316]',
                iconBg: 'bg-[#FFF7ED] text-[#EA580C]',
              },
              {
                num: '2',
                title: 'Doorstep Measurement & Pickup',
                desc: 'Our certified master tailor visits your home to take precision measurements and safely collect your fabric.',
                icon: Home,
                badgeBg: 'bg-[#EC4899]',
                iconBg: 'bg-[#FDF2F8] text-[#DB2777]',
              },
              {
                num: '3',
                title: 'Stitching by Experts',
                desc: 'Stitched with high-grade lining, precision seam finishing, and heritage boutique craftsmanship.',
                icon: Scissors,
                badgeBg: 'bg-[#8B5CF6]',
                iconBg: 'bg-[#F5F3FF] text-[#7C3AED]',
              },
              {
                num: '4',
                title: 'Doorstep Delivery',
                desc: 'Delivered to your home within 5 days with complimentary doorstep alteration & refit assurance.',
                icon: Truck,
                badgeBg: 'bg-[#10B981]',
                iconBg: 'bg-[#ECFDF5] text-[#059669]',
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="flex flex-col items-center text-center px-2">
                  <div className="relative mb-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl ${step.iconBg} flex items-center justify-center`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full ${step.badgeBg} text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs`}
                    >
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1C1917]">{step.title}</h3>
                  <p className="mt-1.5 text-xs text-[#78716C] leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#F5EFE8]">
            <div className="flex items-center justify-center gap-2 bg-[#FFF7ED] text-[#9A3412] py-2.5 rounded-xl text-xs font-bold">
              <Home className="w-4 h-4 text-[#EA580C]" />
              Doorstep Service
            </div>
            <div className="flex items-center justify-center gap-2 bg-[#ECFDF5] text-[#065F46] py-2.5 rounded-xl text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              Fit Assurance
            </div>
            <div className="flex items-center justify-center gap-2 bg-[#F5F3FF] text-[#5B21B6] py-2.5 rounded-xl text-xs font-bold">
              <Clock className="w-4 h-4 text-[#7C3AED]" />
              Fast Delivery
            </div>
          </div>
        </div>
      </section>

      {/* 8. OFFERS & PROMO CODES */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-base sm:text-lg font-extrabold text-[#1C1917]">Offers & Promo Codes</h2>
          <span className="text-[11px] font-semibold text-[#EA580C]">Tap to Copy</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROMO_OFFERS.map((offer) => {
            const isCopied = copiedCode === offer.code;
            return (
              <div
                key={offer.code}
                onClick={() => handleCopyPromo(offer.code)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleCopyPromo(offer.code);
                }}
                className={`rounded-2xl bg-gradient-to-r ${offer.gradient} p-5 text-white shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-4`}
              >
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-extrabold tracking-wide">{offer.title}</p>
                  <p className="text-[11.5px] text-white/90 leading-snug mt-0.5">
                    {offer.description}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[10px] font-extrabold bg-black/20 px-2.5 py-0.5 rounded-full">
                      {offer.tag}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold bg-white/25 hover:bg-white/35 px-2.5 py-0.5 rounded-full">
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. TRENDING THIS WEEK */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1C1917] flex items-center gap-1.5">
              Trending This Week
              <Sparkles className="w-4 h-4 text-[#F97316]" />
            </h2>
            <p className="text-xs text-[#78716C]">Popular bespoke designs curated across styles</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('designs')}
            className="inline-flex items-center gap-0.5 text-xs font-bold text-[#EA580C] hover:underline cursor-pointer"
          >
            View all
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {trendingDesigns.map((design) => {
            const isFav = wishlistIds.includes(design.id);
            return (
              <div
                key={design.id}
                className="group bg-white rounded-2xl border border-[#EFE6DC] hover:border-[#FED7AA] hover:shadow-md overflow-hidden flex flex-col transition-all"
              >
                <div
                  onClick={() => onSelectDesign(design)}
                  className="relative aspect-[3/4] bg-[#F8F6F4] overflow-hidden cursor-pointer"
                >
                  <SafeImage
                    src={design.image}
                    alt={design.title}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 bg-[#1E293B]/85 backdrop-blur-xs text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md max-w-[78%] truncate">
                    {design.category}
                  </span>
                  <button
                    type="button"
                    aria-label="Toggle wishlist"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(design.id);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isFav ? 'fill-[#E11D48] text-[#E11D48]' : 'text-[#57534E]'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3 flex flex-col flex-1 justify-between">
                  <div>
                    <h3
                      onClick={() => onSelectDesign(design)}
                      className="text-xs font-bold text-[#1C1917] line-clamp-1 hover:text-[#EA580C] cursor-pointer"
                    >
                      {design.title}
                    </h3>
                    <p className="text-[10.5px] text-[#78716C] truncate mt-0.5">
                      by {design.boutique}
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[#F5EFE8] flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold text-[#1C1917] tabular-nums">
                      ₹{design.price.toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectDesign(design)}
                      className="text-[11px] font-bold text-[#EA580C] hover:underline inline-flex items-center cursor-pointer"
                    >
                      Details
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. RELAX AT HOME. WE'LL HANDLE THE REST. */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="relative rounded-2xl overflow-hidden border border-[#F2E4D9] bg-[#FFF8F1] shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Left Copy & 5-Step Journey */}
            <div className="lg:col-span-7 p-6 sm:p-9 lg:p-11 flex flex-col justify-center">
              <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold leading-tight tracking-tight text-[#1E293B]">
                Relax at Home.
                <span className="block text-[#9A3412]">We&apos;ll Handle the Rest.</span>
              </h2>
              <p className="mt-2.5 text-xs sm:text-sm text-[#57534E] max-w-lg">
                From browsing to doorstep delivery,{' '}
                <span className="font-bold text-[#EA580C]">StitchMate</span> manages every step of
                your <span className="font-semibold text-[#9A3412]">tailoring journey.</span>
              </p>

              {/* 5 Circular Journey Icons */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { num: '01', title: 'Browse', desc: 'Explore fabrics, styles & designs you love.' },
                  { num: '02', title: 'Measure & Pickup', desc: 'We measure you precisely at your location.' },
                  { num: '03', title: 'Stitching', desc: 'Expert tailors stitch your outfit with care.' },
                  { num: '04', title: 'Delivery', desc: 'Your fitted outfit delivered safely to doorstep.' },
                  { num: '05', title: 'Wear & Happy', desc: 'Wear with pride and enjoy compliments.' },
                ].map((item) => (
                  <div
                    key={item.num}
                    className="bg-white/90 rounded-xl border border-[#F3E5D8] p-2.5 text-center"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FFF7ED] border border-[#FED7AA] text-[10px] font-extrabold text-[#EA580C] mb-1">
                      {item.num}
                    </span>
                    <p className="text-[11px] font-extrabold text-[#1C1917] leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[9.5px] text-[#78716C] mt-1 leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-[#57534E]">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" /> Trusted Tailoring
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" /> Premium Finishing
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" /> On-Time Delivery
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" /> 100% Fit Guarantee
                </span>
              </div>
            </div>

            {/* Right Lifestyle Photo */}
            <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-full">
              <SafeImage
                src={ASSETS.bannerRelax}
                alt="Customer relaxing at home while StitchMate handles tailoring"
                className="w-full h-full object-cover object-center"
              />
              <div className="hidden lg:block absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#FFF8F1] to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* 11. REFER & EARN REAL CASH BANNER */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="rounded-2xl bg-gradient-to-r from-[#064E3B] via-[#065F46] to-[#047857] p-6 sm:p-8 text-white shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-widest uppercase text-[#A7F3D0] bg-white/10 px-3 py-1 rounded-full">
              <Gift className="w-3.5 h-3.5" />
              REFER & EARN REAL CASH
            </span>
            <h2 className="mt-3 text-xl sm:text-2xl font-extrabold leading-tight">
              Gift ₹50 to friends, earn ₹50 cash per referral!
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#D1FAE5] leading-relaxed">
              Share your link with friends &amp; family. Once their first outfit is stitched, cash
              rewards are credited directly to your StitchMate account.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A7F3D0]">
                THEY GET
              </p>
              <p className="text-sm font-extrabold text-white">₹50 OFF</p>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A7F3D0]">
                YOU GET
              </p>
              <p className="text-sm font-extrabold text-[#FDE047]">₹50 CASH</p>
            </div>
            <button
              type="button"
              onClick={onOpenReferral}
              className="inline-flex items-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#1C1917] font-extrabold text-xs sm:text-sm px-5 py-3.5 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              Start Earning Cash
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 12. STITCHMATE TRUST & SAFETY */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 text-center">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-widest text-[#E11D48] bg-[#FFF1F2] border border-[#FECDD3] px-3 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          STITCHMATE TRUST & SAFETY
        </span>
        <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
          Stitch With <span className="text-[#EA580C]">Total Confidence</span>
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-[#78716C] max-w-xl mx-auto">
          Hyderabad&apos;s trusted doorstep tailoring service with doorstep fit and fabric assurance
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="bg-white rounded-2xl border border-[#EFE6DC] p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#1C1917]">Fabric Safety Insured</h3>
              <p className="text-[11px] font-bold text-[#E11D48] mt-0.5">Certified Boutiques</p>
              <p className="text-xs text-[#57534E] mt-1.5 leading-relaxed">
                Fabrics are fully insured and crafted exclusively by verified local boutique experts.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFE6DC] p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#1C1917]">Book Now, Pay at Pickup</h3>
              <p className="text-[11px] font-bold text-[#D97706] mt-0.5">Zero Advance Required</p>
              <p className="text-xs text-[#57534E] mt-1.5 leading-relaxed">
                No advance payment needed. Approve your final quote and pay securely when your tailor visits.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFE6DC] p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#1C1917]">7-Day Free Doorstep Refit</h3>
              <p className="text-[11px] font-bold text-[#059669] mt-0.5">Fit Assurance</p>
              <p className="text-xs text-[#57534E] mt-1.5 leading-relaxed">
                If your outfit doesn&apos;t fit perfectly, we pick up and alter it for free within 7 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 13. LOVED ACROSS HYDERABAD (REVIEWS) */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-[#1C1917]">
            Loved Across Hyderabad
          </h2>
          <p className="text-xs text-[#78716C]">Real experiences from verified customers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {VERIFIED_REVIEWS.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl border border-[#EFE6DC] p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-0.5 text-[#F59E0B] mb-2.5">
                  {Array.from({ length: review.rating }).map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-[#F59E0B]" />
                  ))}
                </div>
                <p className="text-sm text-[#292524] italic leading-relaxed">
                  &ldquo;{review.quote}&rdquo;
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F5EFE8] flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-[#1C1917]">{review.name}</p>
                  <p className="text-[10.5px] text-[#78716C]">{review.locality}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#059669] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 14. PARTNER WITH STITCHMATE (FOR ALL TAILORS & BOUTIQUES) */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-[#EFE6DC] overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-[#EA580C] to-[#F97316] px-6 py-3.5 text-center text-white">
            <p className="text-xs sm:text-sm font-extrabold uppercase tracking-widest">
              FOR ALL TAILORS &amp; BOUTIQUES
            </p>
            <p className="text-[11px] text-white/90 mt-0.5">
              Hyderabad&apos;s Dedicated Doorstep Tailoring &amp; Boutique Network
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1C1917]">
              Partner with StitchMate and{' '}
              <span className="text-[#EA580C]">Grow Your Business to the Next Level</span>
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#57534E] max-w-3xl leading-relaxed">
              You focus on stitching from your boutique — doorstep measurements, pickup, delivery
              &amp; customer support are coordinated seamlessly by StitchMate. Grow your tailoring
              business without leaving your shop!
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-[#FFF9F2] border border-[#F5E6D6] rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#1C1917]">Steady Orders</p>
                  <p className="text-[11px] text-[#78716C]">Daily stitching &amp; alterations</p>
                </div>
              </div>

              <div className="bg-[#FFF9F2] border border-[#F5E6D6] rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#1C1917]">Zero Delivery Hassle</p>
                  <p className="text-[11px] text-[#78716C]">Pickup, measurements &amp; drop</p>
                </div>
              </div>

              <div className="bg-[#ECFDF5] border border-[#D1FAE5] rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#D1FAE5] text-[#059669] flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-[#1C1917]">Weekly Payouts</p>
                  <p className="text-[11px] text-[#78716C]">Guaranteed direct bank transfers</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#F5EFE8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs font-medium text-[#57534E] flex items-center gap-1.5">
                <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                Trusted by tailors &amp; boutiques across Hyderabad · Free pilot registration
              </p>
              <button
                type="button"
                onClick={() => onNavigate('partner')}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Register as Partner
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 15. CUSTOMER & TAILOR SUPPORT */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-[#EFE6DC] p-6 sm:p-7">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#1C1917]">
                Do You Want to Know About Stitching &amp; Orders?
              </h2>
              <p className="text-xs font-bold text-[#EA580C]">Customer &amp; Tailor Support</p>
              <p className="mt-1.5 text-xs sm:text-sm text-[#57534E] leading-relaxed">
                Have questions about your custom stitching, alterations, doorstep measurement visit,
                or order status? Our dedicated Hyderabad support team and master tailor advisors are
                here to assist you every step of the way.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#FFF9F2] rounded-xl py-2.5 px-3 text-center text-xs font-semibold text-[#44403C]">
              Order Tracking
            </div>
            <div className="bg-[#ECFDF5] rounded-xl py-2.5 px-3 text-center text-xs font-semibold text-[#065F46]">
              Tailor Support
            </div>
            <div className="bg-[#EFF6FF] rounded-xl py-2.5 px-3 text-center text-xs font-semibold text-[#1D4ED8]">
              Doorstep Help
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
            <button
              type="button"
              onClick={onOpenSupport}
              className="sm:col-span-3 inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-sm py-3 rounded-xl transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
            <button
              type="button"
              onClick={() => onNotifyToast('Support email ready: support@stitchmate.in')}
              className="sm:col-span-9 inline-flex items-center justify-center gap-2 bg-white hover:bg-[#FFF7ED] text-[#1C1917] font-bold text-sm py-3 rounded-xl border border-[#EFE6DC] hover:border-[#FED7AA] transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-[#EA580C]" />
              Email Support
            </button>
          </div>
        </div>
      </section>

      {/* 16. EMPOWERING INDIA */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-[#E9D5FF] overflow-hidden shadow-xs">
          <div className="bg-gradient-to-r from-[#3B0764] via-[#4C1D95] to-[#5B21B6] px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-white">
            <span className="text-xs font-extrabold uppercase tracking-widest">
              EMPOWERING INDIA
            </span>
            <span className="text-[11px] font-semibold bg-white/15 px-3 py-0.5 rounded-full">
              Vision 2026 · Skill India (Coming Soon)
            </span>
          </div>

          <div className="p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#3B0764]">
              Empowering Women Tailors &amp; Boutique Artisans Across Every Pin Code
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#57534E] max-w-3xl leading-relaxed">
              Our core mission is to bring steady earning opportunities and financial independence
              to talented women creators throughout India — connecting certified skill development
              with world-class doorstep tailoring.
            </p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#FAF5FF] border border-[#F3E8FF] rounded-xl p-4">
                <h3 className="text-xs sm:text-sm font-extrabold text-[#4C1D95]">All-India Reach</h3>
                <p className="mt-1 text-xs text-[#57534E]">
                  Reaching women artisans in every pin code with direct client orders.
                </p>
              </div>
              <div className="bg-[#FAF5FF] border border-[#F3E8FF] rounded-xl p-4">
                <h3 className="text-xs sm:text-sm font-extrabold text-[#4C1D95]">
                  Financial Independence
                </h3>
                <p className="mt-1 text-xs text-[#57534E]">
                  Empowering home tailors with steady income &amp; economic dignity.
                </p>
              </div>
              <div className="bg-[#FAF5FF] border border-[#F3E8FF] rounded-xl p-4">
                <h3 className="text-xs sm:text-sm font-extrabold text-[#4C1D95]">Skill India 2026</h3>
                <p className="mt-1 text-xs text-[#57534E]">
                  Upcoming certified collaboration for professional bespoke training.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 17. STITCHMATE IN YOUR AREA (NOTIFY ME) */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="rounded-2xl bg-gradient-to-r from-[#FFF7ED] to-[#FFEDD5]/60 border border-[#FDE6CE] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
              StitchMate in{' '}
              <span className="font-serif-accent italic text-[#EA580C]">Your Area</span>
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#57534E] leading-relaxed">
              Want to know when we expand into your neighborhood? Provide your details and
              we&apos;ll notify you as soon as we start serving your pin code.
            </p>
          </div>

          <div className="lg:col-span-7">
            {notifySubmitted ? (
              <div className="bg-white rounded-xl border border-[#BBF7D0] p-4 flex items-center gap-3 text-sm font-semibold text-[#065F46]">
                <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
                <span>
                  You&apos;re on the priority list for <strong>{notifyArea}</strong>! We&apos;ll
                  message you at {notifyContact}.
                </span>
              </div>
            ) : (
              <form onSubmit={handleNotifySubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={notifyContact}
                    onChange={(e) => setNotifyContact(e.target.value)}
                    placeholder="Email or Phone"
                    className="w-full bg-white border border-[#E7DDD2] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#EA580C]"
                  />
                  <input
                    type="text"
                    value={notifyArea}
                    onChange={(e) => setNotifyArea(e.target.value)}
                    placeholder="Area or Pincode (e.g. 500089)"
                    className="w-full bg-white border border-[#E7DDD2] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold text-sm py-3 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Notify Me
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

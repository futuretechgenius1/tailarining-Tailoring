import React, { useState, useRef } from 'react';
import {
  ArrowRight,
  Award,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Diamond,
  Eye,
  Heart,
  IndianRupee,
  MessageSquare,
  Minus,
  Package,
  Plus,
  Ruler,
  Scissors,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
} from 'lucide-react';
import {
  AlterationService,
  CartItem,
  DesignProduct,
  OrderRecord,
  PageRoute,
  StorefrontMediaMap,
} from '../types';
import { SafeImage } from './SafeImage';

interface AlterationsPageProps {
  alterations: AlterationService[];
  designs: DesignProduct[];
  media: StorefrontMediaMap;
  loading?: boolean;
  initialSearch?: string;
  cart: CartItem[];
  onAddAlteration: (service: AlterationService) => void;
  onUpdateQty: (itemId: string, delta: number) => void;
  onSelectDesign: (design: DesignProduct) => void;
  onQuickAddDesign: (design: DesignProduct) => void;
  wishlistIds: string[];
  onToggleWishlist: (designId: string) => void;
  onNavigate: (page: PageRoute) => void;
  orders: OrderRecord[];
  onApproveQuote: (orderId: string) => void;
}

const BADGE_STYLE: Record<AlterationService['badgeColor'], string> = {
  amber: 'bg-[#FFF7ED] text-[#C2410C]',
  orange: 'bg-[#F4EEFF] text-[#6B21D9]',
  blue: 'bg-[#EFF6FF] text-[#1E40AF]',
  emerald: 'bg-[#ECFDF5] text-[#047857]',
  rose: 'bg-[#FDF2F8] text-[#BE185D]',
  purple: 'bg-[#F4EEFF] text-[#5B21B6]',
};

const QUICK_CATEGORIES = [
  {
    id: 'size',
    title: 'Size Adjustment',
    subtitle: 'Make it fit you perfectly',
    query: 'waist',
    icon: 'shirt',
  },
  {
    id: 'length',
    title: 'Length Alteration',
    subtitle: 'Hemming for pants, skirts & dresses',
    query: 'length',
    icon: 'pants',
  },
  {
    id: 'fit',
    title: 'Fit & Shaping',
    subtitle: 'Tapering, loosening or contouring',
    query: 'fit',
    icon: 'taper',
  },
  {
    id: 'sleeve',
    title: 'Sleeve Adjustment',
    subtitle: 'Shorten or lengthen sleeves easily',
    query: 'hand',
    icon: 'sleeve',
  },
  {
    id: 'zipper',
    title: 'Zipper Replacement',
    subtitle: 'Smooth & durable zipper fixes',
    query: 'zip',
    icon: 'zipper',
  },
  {
    id: 'button',
    title: 'Button Repairs',
    subtitle: 'Replace or reinforce buttons',
    query: 'button',
    icon: 'button',
  },
  {
    id: 'tear',
    title: 'Tear & Damage Repair',
    subtitle: 'Professional mending for long-lasting wear',
    query: 'tear',
    icon: 'patch',
  },
  {
    id: 'style',
    title: 'Style Modifications',
    subtitle: 'Simple changes for a fresh new look',
    query: 'saree',
    icon: 'dress',
  },
] as const;

const QuickCategorySvg: React.FC<{ icon: (typeof QUICK_CATEGORIES)[number]['icon'] }> = ({
  icon,
}) => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#6B1B9A"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {icon === 'shirt' && (
      <>
        <path d="M5 6l4-2h6l4 2-2 4-2-1v11H9V9l-2 1-2-4z" />
        <path d="M12 4v5" />
      </>
    )}
    {icon === 'pants' && (
      <>
        <path d="M7 4h10l1 16h-4.5L12 11l-1.5 9H6L7 4z" />
        <path d="M7 8h10" />
      </>
    )}
    {icon === 'taper' && (
      <>
        <path d="M4 12h5m0 0l-2-2m2 2l-2 2" />
        <path d="M20 12h-5m0 0l2-2m-2 2l2 2" />
        <path d="M10 6c1 4 1 8 0 12" />
        <path d="M14 6c-1 4-1 8 0 12" />
      </>
    )}
    {icon === 'sleeve' && (
      <>
        <path d="M8 5h8l3 5-2 8h-2l-1-6H10l-1 6H7l-2-8 3-5z" />
        <path d="M19 6v3m-1.5-1.5h3" />
      </>
    )}
    {icon === 'zipper' && (
      <>
        <path d="M8 3l4 5 4-5" />
        <path d="M12 8v13" strokeDasharray="2 2" />
        <rect x="10" y="9" width="4" height="3.5" rx="0.8" />
      </>
    )}
    {icon === 'button' && (
      <>
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="9.8" cy="9.8" r="0.9" fill="#6B1B9A" />
        <circle cx="14.2" cy="9.8" r="0.9" fill="#6B1B9A" />
        <circle cx="9.8" cy="14.2" r="0.9" fill="#6B1B9A" />
        <circle cx="14.2" cy="14.2" r="0.9" fill="#6B1B9A" />
      </>
    )}
    {icon === 'patch' && (
      <>
        <rect x="5" y="5" width="14" height="14" rx="2.5" strokeDasharray="2.5 2" />
        <path d="M9 9l6 6m0-6l-6 6" />
      </>
    )}
    {icon === 'dress' && (
      <>
        <path d="M9 4h6l-1 5 4 11H6l4-11-1-5z" />
        <path d="M9.5 9h5" />
      </>
    )}
  </svg>
);

const AlterationIconBadge: React.FC<{ service: AlterationService; sareeImage: string }> = ({
  service,
  sareeImage,
}) => {
  if (service.section === 'saree') {
    return (
      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#A78BFA]/50 bg-[#F4EEFF] mx-auto shadow-2xs">
        <SafeImage
          src={sareeImage}
          alt={service.title}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const circleColor: Record<AlterationService['iconType'], string> = {
    button: 'bg-[#FBF5E6] border-[#C8922A]/50 text-[#A67418]',
    tear: 'bg-[#F1F5F9] border-[#94A3B8] text-[#1A103D]',
    waist: 'bg-[#F4EEFF] border-[#6B21D9]/45 text-[#6B21D9]',
    length: 'bg-[#EFF6FF] border-[#3B82F6]/45 text-[#1D4ED8]',
    'zip-small': 'bg-[#FBF5E6] border-[#C8922A]/50 text-[#A67418]',
    sleeve: 'bg-[#F1F5F9] border-[#1A103D]/30 text-[#1A103D]',
    'slim-fit': 'bg-[#ECFDF5] border-[#10B981]/45 text-[#047857]',
    'zip-large': 'bg-[#F4EEFF] border-[#6B21D9]/45 text-[#6B21D9]',
    jeans: 'bg-[#EFF6FF] border-[#1E3A8A]/35 text-[#1A103D]',
    'double-stitch': 'bg-[#FBF5E6] border-[#C8922A]/50 text-[#A67418]',
    'saree-fall': 'bg-[#F4EEFF] border-[#6B21D9]/45 text-[#6B21D9]',
    'saree-pleat': 'bg-[#FBF5E6] border-[#C8922A]/50 text-[#A67418]',
  };

  return (
    <div
      className={`w-14 h-14 rounded-full border mx-auto flex items-center justify-center shadow-2xs ${circleColor[service.iconType]}`}
    >
      <svg
        width="25"
        height="25"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {service.iconType === 'button' && (
          <>
            <circle cx="12" cy="12" r="8" />
            <circle cx="9.5" cy="9.5" r="1" fill="currentColor" />
            <circle cx="14.5" cy="9.5" r="1" fill="currentColor" />
            <circle cx="9.5" cy="14.5" r="1" fill="currentColor" />
            <circle cx="14.5" cy="14.5" r="1" fill="currentColor" />
          </>
        )}
        {service.iconType === 'tear' && (
          <>
            <path d="M4 6l4-2h8l4 2-2 5-2-1v10H8V10l-2 1-2-5z" />
            <path d="M10 12l4 3m0-3l-4 3" />
          </>
        )}
        {(service.iconType === 'waist' || service.iconType === 'jeans') && (
          <>
            <path d="M6 4h12l1 16h-5l-2-9-2 9H5L6 4z" />
            <path d="M6 8h12" />
          </>
        )}
        {service.iconType === 'length' && (
          <>
            <path d="M6 4h12v14H6z" />
            <path d="M6 14h12" strokeDasharray="2 2" />
            <path d="M12 15v5m-2-2l2 2 2-2" />
          </>
        )}
        {(service.iconType === 'zip-small' || service.iconType === 'zip-large') && (
          <>
            <path d="M12 3v18" strokeDasharray="2 2" />
            <rect x="9.5" y="6" width="5" height="4" rx="1" />
            <path d="M7 3l5 4 5-4" />
          </>
        )}
        {(service.iconType === 'sleeve' ||
          service.iconType === 'slim-fit' ||
          service.iconType === 'double-stitch') && (
          <>
            <path d="M4 7l4-3h8l4 3-2.5 5-2-1V20h-7V11l-2 1L4 7z" />
            <path d="M12 4v3" />
          </>
        )}
      </svg>
    </div>
  );
};

export const AlterationsPage: React.FC<AlterationsPageProps> = ({
  alterations,
  designs,
  media,
  initialSearch = '',
  cart,
  onAddAlteration,
  onUpdateQty,
  onSelectDesign,
  onQuickAddDesign,
  wishlistIds,
  onToggleWishlist,
  onNavigate,
  orders,
  onApproveQuote,
}) => {
  const heroMannequinImg =
    media.alterationsHeroMannequin ||
    '/src/assets/images/alterations_hero_mannequin_1795431556560.jpg';
  const cuttingHandsImg =
    media.alterationsCuttingHands ||
    '/src/assets/images/alterations_cutting_hands_1795431556701.jpg';
  const sareeImage =
    media.sareePleating || '/src/assets/images/design_saree_pleating_1795271998351.jpg';

  const [viewMode, setViewMode] = useState<'book' | 'history'>('book');
  const [search, setSearch] = useState(initialSearch);
  const [activeFilter, setActiveFilter] = useState<'all' | 'garment' | 'saree'>('all');
  const [selectedQuickCat, setSelectedQuickCat] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredServices = alterations.filter((srv) => {
    const matchesTab = activeFilter === 'all' || srv.section === activeFilter;
    const q = search.trim().toLowerCase();
    const matchesQuery =
      !q || srv.title.toLowerCase().includes(q) || srv.description.toLowerCase().includes(q);
    return matchesTab && matchesQuery;
  });

  const garmentServices = filteredServices.filter((s) => s.section === 'garment');
  const sareeServices = filteredServices.filter((s) => s.section === 'saree');

  const getCartQuantity = (serviceId: string) => {
    const found = cart.find((c) => c.id === serviceId);
    return found ? found.quantity : 0;
  };

  const scrollDesigns = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  const scrollToCatalog = (focusSearch = false) => {
    setViewMode('book');
    setTimeout(() => {
      document.getElementById('alterations-catalog')?.scrollIntoView({ behavior: 'smooth' });
      if (focusSearch) {
        searchInputRef.current?.focus();
      }
    }, 60);
  };

  const handleQuickCategoryClick = (cat: (typeof QUICK_CATEGORIES)[number]) => {
    if (selectedQuickCat === cat.id) {
      setSelectedQuickCat(null);
      setSearch('');
      setActiveFilter('all');
    } else {
      setSelectedQuickCat(cat.id);
      if (cat.query === 'saree') {
        setSearch('');
        setActiveFilter('saree');
      } else {
        setActiveFilter('all');
        setSearch(cat.query);
      }
    }
    scrollToCatalog(false);
  };

  const renderServiceCard = (srv: AlterationService) => {
    const qty = getCartQuantity(srv.id);
    return (
      <div
        key={srv.id}
        className="relative bg-white rounded-2xl border border-[#EAE0FA] hover:border-[#6B21D9]/45 hover:shadow-md transition-all p-4 pt-7 flex flex-col justify-between overflow-hidden"
      >
        <span
          className={`absolute top-0 left-0 text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-br-xl ${BADGE_STYLE[srv.badgeColor]}`}
        >
          {srv.badge}
        </span>

        <div className="text-center">
          <AlterationIconBadge service={srv} sareeImage={sareeImage} />
          <h3 className="mt-3 text-sm font-bold text-[#1A103D] leading-snug">{srv.title}</h3>
          <p className="mt-1.5 text-[11.5px] text-[#64748B] leading-relaxed line-clamp-2 min-h-[34px]">
            {srv.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-0.5 tabular-nums">
            <span className="text-sm font-extrabold text-[#1A103D]">₹{srv.price}</span>
            <span className="text-[11px] text-[#64748B]">/{srv.unit}</span>
          </div>

          {qty > 0 ? (
            <div className="inline-flex items-center gap-1.5 bg-[#F4EEFF] border border-[#6B21D9] rounded-lg px-1.5 py-0.5">
              <button
                type="button"
                aria-label={`Remove one ${srv.title}`}
                onClick={() => onUpdateQty(srv.id, -1)}
                className="w-6 h-6 rounded-md bg-white text-[#6B21D9] flex items-center justify-center hover:bg-[#6B21D9] hover:text-white transition-colors cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-extrabold text-[#1A103D] min-w-[16px] text-center tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                aria-label={`Add one more ${srv.title}`}
                onClick={() => onUpdateQty(srv.id, 1)}
                className="w-6 h-6 rounded-md bg-[#6B21D9] text-white flex items-center justify-center hover:bg-[#5B21B6] transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddAlteration(srv)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#6B21D9] bg-[#F4EEFF] hover:bg-[#6B21D9] hover:text-white border border-[#DCD0F5] px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Add +
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#FDF9FF] text-[#1A103D]">
      {/* 1. DEEP PLUM & GOLD ARCH HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2B0847] via-[#401164] to-[#26073F] text-white">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[370px] lg:min-h-[415px]">
          {/* Left Typography Column */}
          <div className="lg:col-span-6 px-4 sm:px-6 lg:pl-8 lg:pr-10 py-10 lg:py-12 flex flex-col justify-center relative z-10">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.26em] text-[#E9D5F7]/90">
              <span className="h-[1px] w-8 bg-[#D8B46B]/70" />
              <span>TAILORING SERVICES</span>
              <span className="h-[1px] w-8 bg-[#D8B46B]/70" />
            </div>

            <h1 className="mt-2 font-editorial text-5xl sm:text-6xl font-bold leading-[1.03] tracking-tight text-white">
              Alterations
            </h1>
            <p className="mt-1.5 font-editorial italic text-xl sm:text-2xl text-[#F5D68E]">
              Perfect Fit. Refined Look.
            </p>

            <p className="mt-3.5 text-sm text-[#EFE3FA]/90 leading-relaxed max-w-md">
              Get expert alterations for your favorite outfits. From minor adjustments to complete
              fitting—our verified tailors ensure a flawless, comfortable fit.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => scrollToCatalog(false)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#F9F2FF] to-[#EBD8FF] hover:from-white hover:to-[#F3E5FF] text-[#2B0847] font-bold text-sm px-6 py-3 rounded-full shadow-lg shadow-black/25 transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-[#6B1B9A]" />
                Book Alteration
                <ArrowRight className="w-4 h-4 text-[#6B1B9A]" />
              </button>

              <button
                type="button"
                onClick={() => scrollToCatalog(true)}
                className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/15 border border-[#DFB96E]/80 text-[#FAF2E1] font-semibold text-sm px-6 py-3 rounded-full transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-[#F2CD7B]" />
                Get a Quote
              </button>
            </div>

            {/* 4 Gold-Icon Micro Highlights */}
            <div className="mt-7 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11.5px] text-[#F4E9FD]">
              {[
                { label: 'Skilled Tailors', Icon: ShieldCheck },
                { label: 'Perfect Fit', Icon: Ruler },
                { label: 'Quick Turnaround', Icon: Clock },
                { label: 'Pickup & Delivery', Icon: Truck },
              ].map((item) => (
                <div key={item.label} className="inline-flex items-center gap-1.5 font-medium">
                  <item.Icon className="w-4 h-4 text-[#F0CB79] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Gold-Trimmed Convex Arch Photo */}
          <div className="lg:col-span-6 relative min-h-[260px] lg:min-h-full overflow-hidden">
            <SafeImage
              src={heroMannequinImg}
              alt="Burgundy velvet tailoring mannequin with measuring tape and antique sewing machine"
              className="w-full h-full object-cover object-center"
            />
            {/* Convex gold curve edge on desktop */}
            <svg
              viewBox="0 0 110 420"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="hidden lg:block absolute top-0 left-0 h-full w-24 pointer-events-none"
            >
              <path d="M0 0 H88 C22 135 22 285 88 420 H0 Z" fill="#370D58" />
              <path
                d="M88 0 C22 135 22 285 88 420"
                fill="none"
                stroke="url(#altGoldArch)"
                strokeWidth="7"
              />
              <defs>
                <linearGradient id="altGoldArch" x1="0" y1="0" x2="0" y2="420" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#D7A74A" />
                  <stop offset="0.5" stopColor="#FCE7A6" />
                  <stop offset="1" stopColor="#C28D32" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* 2. OUR ALTERATION SERVICES (8 INTERACTIVE CATEGORY FILTER CARDS) */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-9 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#1A103D]">
            Our <span className="text-[#721A9E]">Alteration</span> Services
          </h2>
          {selectedQuickCat && (
            <button
              type="button"
              onClick={() => {
                setSelectedQuickCat(null);
                setSearch('');
                setActiveFilter('all');
              }}
              className="text-xs font-bold text-[#721A9E] hover:underline cursor-pointer"
            >
              Clear selected service filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {QUICK_CATEGORIES.map((cat) => {
            const active = selectedQuickCat === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleQuickCategoryClick(cat)}
                className={`rounded-2xl p-3.5 text-center transition-all cursor-pointer border flex flex-col items-center justify-start ${
                  active
                    ? 'bg-[#F5E9FF] border-[#721A9E] shadow-sm ring-1 ring-[#721A9E]/25'
                    : 'bg-white border-[#EFE6F7] hover:border-[#C084FC] shadow-2xs hover:shadow-sm'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-[#FAF3FF] border border-[#EBD8FA] flex items-center justify-center mb-2.5">
                  <QuickCategorySvg icon={cat.icon} />
                </div>
                <p className="text-[12px] font-extrabold text-[#1A103D] leading-snug">
                  {cat.title}
                </p>
                <p className="mt-1 text-[10.5px] text-[#64597A] leading-snug">{cat.subtitle}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. HOW IT WORKS? SPLIT BAND */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-8">
        <div className="bg-white rounded-3xl border border-[#EFE6F7] shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-4 min-h-[210px] relative">
            <SafeImage
              src={cuttingHandsImg}
              alt="Master tailor cutting purple fabric with golden brass shears along chalk line"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center gap-6 bg-gradient-to-r from-[#FDF9FF] to-[#FBF5FF]">
            <div className="lg:w-44 shrink-0">
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#3D0D61] leading-tight">
                How It Works?
              </h2>
              <p className="mt-1.5 text-xs text-[#5E5275] leading-relaxed">
                Get your garment altered in 4 simple steps
              </p>
            </div>

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  step: '1',
                  title: 'Choose Service',
                  sub: 'Select the alteration you need',
                  Icon: Calendar,
                },
                {
                  step: '2',
                  title: 'Book a Slot',
                  sub: 'Pick a date & time that suits you',
                  Icon: CalendarCheck,
                },
                {
                  step: '3',
                  title: 'Pickup & Alteration',
                  sub: 'We pick up, alter & quality-check',
                  Icon: Package,
                },
                {
                  step: '4',
                  title: 'Get It Delivered',
                  sub: 'Receive your perfectly altered outfit',
                  Icon: Truck,
                },
              ].map((s, idx) => (
                <div key={s.step} className="relative flex flex-col items-center text-center">
                  {idx < 3 && (
                    <ArrowRight className="hidden sm:block w-4 h-4 text-[#9B59C7] absolute -right-3 top-6" />
                  )}
                  <div className="relative w-13 h-13 rounded-full bg-[#F2E4FF] border border-[#E2C6FA] text-[#6B1B9A] flex items-center justify-center">
                    <s.Icon className="w-5 h-5" />
                    <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-[#6B1B9A] text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                      {s.step}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-extrabold text-[#1A103D]">{s.title}</p>
                  <p className="mt-0.5 text-[10.5px] text-[#64597A] leading-snug">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY CHOOSE TAILERING FOR ALTERATIONS? CURVED TRUST BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#340B57] via-[#4D147C] to-[#2E094D] text-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-[#F0CB79]/60 text-[#F4D078] flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <h2 className="font-editorial text-xl sm:text-2xl font-bold leading-snug text-white">
              Why Choose Tailering
              <span className="block text-[#F4D078]">for Alterations?</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:divide-x lg:divide-white/15 flex-1">
            {[
              { label: 'Expert Tailors with Experience', Icon: Diamond },
              { label: 'Quick & Reliable Service', Icon: Clock },
              { label: 'Quality Assured', Icon: ShieldCheck },
              { label: 'Convenient Pickup & Delivery', Icon: Truck },
              { label: 'Transparent Pricing', Icon: IndianRupee },
            ].map((item, idx) => (
              <div
                key={item.label}
                className={`flex items-center gap-2.5 ${idx > 0 ? 'lg:pl-4' : ''}`}
              >
                <item.Icon className="w-5 h-5 text-[#F4D078] shrink-0" />
                <span className="text-xs font-medium text-[#F5ECFC] leading-snug">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. LIVE MYSQL ALTERATIONS CATALOG & BOOKING HISTORY */}
      <div id="alterations-catalog" className="max-w-[1280px] mx-auto px-4 sm:px-6 py-9 space-y-8">
        {/* Catalog Header + Book / History Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#EAE0FA]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6B21D9]">
              EXPRESS DOORSTEP RATE CARD
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-[#1A103D] font-editorial">
              Doorstep Alterations &amp; Saree Finishing
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
              Add alteration services to your bag and book complimentary doorstep pickup in
              Hyderabad.
            </p>
          </div>

          {/* Book | History Toggle */}
          <div className="inline-flex items-center bg-[#F1F5F9] border border-[#EAE0FA] p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('book')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'book'
                  ? 'bg-[#340B57] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#1A103D]'
              }`}
            >
              Book
            </button>
            <button
              type="button"
              onClick={() => setViewMode('history')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                viewMode === 'history'
                  ? 'bg-[#340B57] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#1A103D]'
              }`}
            >
              History
              <span
                className={`text-[10px] px-1.5 rounded-md tabular-nums ${
                  viewMode === 'history'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#6B21D9]/15 text-[#6B21D9]'
                }`}
              >
                {orders.length}
              </span>
            </button>
          </div>
        </div>

        {viewMode === 'history' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A103D] font-editorial">
                Your Stitching &amp; Alteration Bookings
              </h3>
              <button
                type="button"
                onClick={() => setViewMode('book')}
                className="text-xs font-bold text-[#6B21D9] hover:underline cursor-pointer"
              >
                + Book New Alteration
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#EAE0FA] p-10 text-center space-y-2">
                <p className="text-sm font-bold text-[#1A103D]">No alteration bookings yet.</p>
                <p className="text-xs text-[#64748B]">
                  Add any alteration service to your bag and confirm pickup to track it here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl border border-[#EAE0FA] p-5 flex flex-col justify-between gap-4 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[#6B21D9] tabular-nums">
                          {ord.id}
                        </span>
                        <span
                          className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-md ${
                            ord.stage === 'Delivered'
                              ? 'bg-[#ECFDF5] text-[#059669]'
                              : ord.stage === 'Quotation Submitted'
                                ? 'bg-[#FBF5E6] text-[#A67418]'
                                : 'bg-[#F4EEFF] text-[#6B21D9]'
                          }`}
                        >
                          {ord.stage}
                        </span>
                      </div>

                      <h4 className="mt-2 text-sm sm:text-base font-bold text-[#1A103D]">
                        {ord.serviceTitle}
                      </h4>
                      <p className="text-xs text-[#475569] mt-1">{ord.itemsSummary}</p>

                      <div className="mt-3 pt-3 border-t border-[#F1F5F9] grid grid-cols-2 gap-2 text-xs text-[#475569]">
                        <div>
                          <span className="text-[#64748B] block text-[10.5px]">Assigned Tailor</span>
                          <span className="font-semibold text-[#1A103D]">{ord.tailorName}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[10.5px]">
                            Promised Delivery
                          </span>
                          <span className="font-semibold text-[#1A103D]">{ord.deliveryDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                      <span className="text-base font-extrabold text-[#1A103D] tabular-nums">
                        ₹{ord.amount.toLocaleString('en-IN')}
                      </span>

                      {!ord.quoteApproved && ord.stage === 'Quotation Submitted' ? (
                        <button
                          type="button"
                          onClick={() => onApproveQuote(ord.id)}
                          className="inline-flex items-center gap-1.5 bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Final Quote
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669]">
                          <Package className="w-3.5 h-3.5" />
                          {ord.quoteApproved ? 'Quote Approved' : 'In Progress'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Search + Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xl">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedQuickCat(null);
                  }}
                  placeholder="Search services (e.g. zip, waist, tear, saree)..."
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-[#1A103D] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#6B21D9] shadow-2xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter('all');
                    setSelectedQuickCat(null);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-[#340B57] text-white shadow-2xs'
                      : 'bg-white border border-[#EAE0FA] text-[#334155] hover:border-[#6B21D9]'
                  }`}
                >
                  <span>All</span>
                  <span className="text-[10px] opacity-80 tabular-nums">{alterations.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter('garment');
                    setSelectedQuickCat(null);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'garment'
                      ? 'bg-[#340B57] text-white shadow-2xs'
                      : 'bg-white border border-[#EAE0FA] text-[#334155] hover:border-[#6B21D9]'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Garments</span>
                  <span className="text-[10px] opacity-80 tabular-nums">
                    {alterations.filter((a) => a.section === 'garment').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFilter('saree');
                    setSelectedQuickCat(null);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'saree'
                      ? 'bg-[#340B57] text-white shadow-2xs'
                      : 'bg-white border border-[#EAE0FA] text-[#334155] hover:border-[#6B21D9]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C8922A]" />
                  <span>Saree &amp; Add-ons</span>
                </button>
              </div>
            </div>

            {/* Section 1: Garment Alteration & Repair Services */}
            {garmentServices.length > 0 && (
              <section>
                <div className="flex items-end justify-between gap-2 pb-3 border-b border-[#EAE0FA] mb-5">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#1A103D] font-editorial">
                      Garment Alteration &amp; Repair Services
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Trousers, shirts, kurtis, zip replacements, tear mending, and precision
                      sizing.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#64748B] shrink-0 tabular-nums">
                    {garmentServices.length} services
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {garmentServices.map(renderServiceCard)}
                </div>
              </section>
            )}

            {/* Section 2: Stitching & Saree Add-Ons */}
            {sareeServices.length > 0 && (
              <section>
                <div className="flex items-end justify-between gap-2 pb-3 border-b border-[#EAE0FA] mb-5">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#1A103D] font-editorial">
                      Stitching &amp; Saree Add-Ons
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Matching saree fall &amp; pico, ready-to-wear 1-minute pre-pleating, and
                      blouse finishing.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#64748B] shrink-0 tabular-nums">
                    {sareeServices.length} services
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sareeServices.map(renderServiceCard)}
                </div>
              </section>
            )}

            {filteredServices.length === 0 && (
              <div className="bg-white rounded-2xl border border-[#EAE0FA] p-10 text-center">
                <p className="text-sm font-bold text-[#1A103D]">
                  No matching alteration services found.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setActiveFilter('all');
                    setSelectedQuickCat(null);
                  }}
                  className="mt-3 text-xs font-bold text-[#6B21D9] hover:underline cursor-pointer"
                >
                  Reset Search &amp; Filters
                </button>
              </div>
            )}

            {/* Section 3: Explore Stitching Designs */}
            <section className="pt-4">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h3 className="text-lg sm:text-xl font-bold text-[#1A103D] font-editorial">
                  Explore Stitching Designs
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('designs')}
                    className="inline-flex items-center gap-0.5 text-xs font-bold text-[#6B21D9] hover:underline mr-2 cursor-pointer"
                  >
                    More
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Scroll designs left"
                    onClick={() => scrollDesigns('left')}
                    className="w-8 h-8 rounded-full border border-[#CBD5E1] text-[#1A103D] hover:border-[#6B21D9] hover:text-[#6B21D9] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Scroll designs right"
                    onClick={() => scrollDesigns('right')}
                    className="w-8 h-8 rounded-full border border-[#CBD5E1] text-[#1A103D] hover:border-[#6B21D9] hover:text-[#6B21D9] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory"
              >
                {designs.slice(0, 7).map((design) => {
                  const isFav = wishlistIds.includes(design.id);
                  return (
                    <div
                      key={design.id}
                      className="snap-start shrink-0 w-[235px] sm:w-[248px] bg-white rounded-2xl border border-[#EAE0FA] hover:border-[#6B21D9]/45 hover:shadow-md overflow-hidden flex flex-col transition-all"
                    >
                      <div
                        onClick={() => onSelectDesign(design)}
                        className="relative aspect-[3/4] bg-[#F1F5F9] overflow-hidden cursor-pointer"
                      >
                        <SafeImage
                          src={design.image}
                          alt={design.title}
                          className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
                        />
                        {design.trusted && (
                          <span className="absolute top-2.5 left-2.5 bg-[#1A103D]/85 backdrop-blur-xs text-[#E2B14B] text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                            Atelier Verified
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label="Wishlist"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWishlist(design.id);
                          }}
                          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow-sm cursor-pointer"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              isFav ? 'fill-[#C8922A] text-[#C8922A]' : 'text-[#475569]'
                            }`}
                          />
                        </button>
                        <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 bg-white/90 text-[#1A103D] text-[10.5px] font-bold px-2 py-0.5 rounded-md tabular-nums">
                          <Clock className="w-3 h-3 text-[#6B21D9]" />
                          {design.turnaroundDays}d
                        </span>
                      </div>

                      <div className="p-3.5 flex flex-col flex-1 justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B21D9]">
                            {design.category}
                          </p>
                          <h4
                            onClick={() => onSelectDesign(design)}
                            className="mt-1 text-xs sm:text-[13px] font-bold text-[#1A103D] line-clamp-2 hover:text-[#6B21D9] cursor-pointer"
                          >
                            {design.title}
                          </h4>
                          <p className="mt-2 text-base font-extrabold text-[#1A103D] tabular-nums">
                            ₹ {design.price.toLocaleString('en-IN')}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B] tabular-nums">
                            <Eye className="w-3.5 h-3.5 text-[#6B21D9]" />
                            {design.views} views
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label="Add design to bag"
                              onClick={() => onQuickAddDesign(design)}
                              className="w-8 h-8 rounded-lg border border-[#CBD5E1] text-[#1A103D] hover:border-[#6B21D9] hover:text-[#6B21D9] flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectDesign(design)}
                              className="bg-[#340B57] hover:bg-[#4B137A] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Stitch
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 text-center">
                <button
                  type="button"
                  onClick={() => onNavigate('designs')}
                  className="inline-flex items-center justify-center bg-[#340B57] hover:bg-[#4B137A] text-white font-bold text-sm px-7 py-3 rounded-full shadow-sm transition-colors cursor-pointer"
                >
                  Explore All Designs
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

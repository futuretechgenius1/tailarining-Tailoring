import React, { useState, useRef } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  Minus,
  Plus,
  Scissors,
  Search,
  ShoppingCart,
  Sparkles,
  Package,
} from 'lucide-react';
import { ALTERATION_SERVICES, ASSETS, DESIGNS_CATALOG } from '../data/catalogData';
import { AlterationService, CartItem, DesignProduct, OrderRecord, PageRoute } from '../types';
import { SafeImage } from './SafeImage';

interface AlterationsPageProps {
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
  amber: 'bg-[#FBF5E6] text-[#A67418]',
  orange: 'bg-[#F0F9FA] text-[#0B7285]',
  blue: 'bg-[#EFF6FF] text-[#1E40AF]',
  emerald: 'bg-[#ECFDF5] text-[#047857]',
  rose: 'bg-[#F0F9FA] text-[#0B7285]',
  purple: 'bg-[#F1F5F9] text-[#0B1F3A]',
};

const AlterationIconBadge: React.FC<{ service: AlterationService }> = ({ service }) => {
  if (service.section === 'saree') {
    return (
      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#C8922A]/40 bg-[#FBF5E6] mx-auto shadow-2xs">
        <SafeImage
          src={ASSETS.sareePleating}
          alt={service.title}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const circleColor: Record<AlterationService['iconType'], string> = {
    button: 'bg-[#FBF5E6] border-[#C8922A]/50 text-[#A67418]',
    tear: 'bg-[#F1F5F9] border-[#94A3B8] text-[#0B1F3A]',
    waist: 'bg-[#F0F9FA] border-[#0B7285]/45 text-[#0B7285]',
    length: 'bg-[#EFF6FF] border-[#3B82F6]/45 text-[#1D4ED8]',
    'zip-small': 'bg-[#FBF5E6] border-[#C8922A]/50 text-[#A67418]',
    sleeve: 'bg-[#F1F5F9] border-[#0B1F3A]/30 text-[#0B1F3A]',
    'slim-fit': 'bg-[#ECFDF5] border-[#10B981]/45 text-[#047857]',
    'zip-large': 'bg-[#F0F9FA] border-[#0B7285]/45 text-[#0B7285]',
    jeans: 'bg-[#EFF6FF] border-[#1E3A8A]/35 text-[#0B1F3A]',
    'double-stitch': 'bg-[#FBF5E6] border-[#C8922A]/50 text-[#A67418]',
    'saree-fall': 'bg-[#F0F9FA] border-[#0B7285]/45 text-[#0B7285]',
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
  const [viewMode, setViewMode] = useState<'book' | 'history'>('book');
  const [search, setSearch] = useState(initialSearch);
  const [activeFilter, setActiveFilter] = useState<'all' | 'garment' | 'saree'>('all');
  const carouselRef = useRef<HTMLDivElement>(null);

  const filteredServices = ALTERATION_SERVICES.filter((srv) => {
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

  const renderServiceCard = (srv: AlterationService) => {
    const qty = getCartQuantity(srv.id);
    return (
      <div
        key={srv.id}
        className="relative bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#0B7285]/45 hover:shadow-md transition-all p-4 pt-7 flex flex-col justify-between overflow-hidden"
      >
        <span
          className={`absolute top-0 left-0 text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-br-xl ${BADGE_STYLE[srv.badgeColor]}`}
        >
          {srv.badge}
        </span>

        <div className="text-center">
          <AlterationIconBadge service={srv} />
          <h3 className="mt-3 text-sm font-bold text-[#0B1F3A] leading-snug">{srv.title}</h3>
          <p className="mt-1.5 text-[11.5px] text-[#64748B] leading-relaxed line-clamp-2 min-h-[34px]">
            {srv.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-0.5 tabular-nums">
            <span className="text-sm font-extrabold text-[#0B1F3A]">₹{srv.price}</span>
            <span className="text-[11px] text-[#64748B]">/{srv.unit}</span>
          </div>

          {qty > 0 ? (
            <div className="inline-flex items-center gap-1.5 bg-[#F0F9FA] border border-[#0B7285] rounded-lg px-1.5 py-0.5">
              <button
                type="button"
                aria-label={`Remove one ${srv.title}`}
                onClick={() => onUpdateQty(srv.id, -1)}
                className="w-6 h-6 rounded-md bg-white text-[#0B7285] flex items-center justify-center hover:bg-[#0B7285] hover:text-white transition-colors cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-extrabold text-[#0B1F3A] min-w-[16px] text-center tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                aria-label={`Add one more ${srv.title}`}
                onClick={() => onUpdateQty(srv.id, 1)}
                className="w-6 h-6 rounded-md bg-[#0B7285] text-white flex items-center justify-center hover:bg-[#085463] transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddAlteration(srv)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0B7285] bg-[#F0F9FA] hover:bg-[#0B7285] hover:text-white border border-[#CBE7EC] px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Add +
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 sm:py-9 space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B7285]">
            EXPRESS DOORSTEP SERVICE
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#0B1F3A] font-serif-accent">
            Doorstep Alterations &amp; Saree Finishing
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Expert fitting, precision mending, and complimentary doorstep pickup in Hyderabad
          </p>
        </div>

        {/* Book | History Toggle */}
        <div className="inline-flex items-center bg-[#F1F5F9] border border-[#E2E8F0] p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('book')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'book'
                ? 'bg-[#0B1F3A] text-white shadow-2xs'
                : 'text-[#475569] hover:text-[#0B1F3A]'
            }`}
          >
            Book
          </button>
          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              viewMode === 'history'
                ? 'bg-[#0B1F3A] text-white shadow-2xs'
                : 'text-[#475569] hover:text-[#0B1F3A]'
            }`}
          >
            History
            <span
              className={`text-[10px] px-1.5 rounded-md tabular-nums ${
                viewMode === 'history'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#0B7285]/15 text-[#0B7285]'
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
            <h2 className="text-base font-bold text-[#0B1F3A] font-serif-accent">
              Your Stitching &amp; Alteration Bookings
            </h2>
            <button
              type="button"
              onClick={() => setViewMode('book')}
              className="text-xs font-bold text-[#0B7285] hover:underline cursor-pointer"
            >
              + Book New Alteration
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col justify-between gap-4 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#0B7285] tabular-nums">
                      {ord.id}
                    </span>
                    <span
                      className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-md ${
                        ord.stage === 'Delivered'
                          ? 'bg-[#ECFDF5] text-[#059669]'
                          : ord.stage === 'Quotation Submitted'
                            ? 'bg-[#FBF5E6] text-[#A67418]'
                            : 'bg-[#F0F9FA] text-[#0B7285]'
                      }`}
                    >
                      {ord.stage}
                    </span>
                  </div>

                  <h3 className="mt-2 text-sm sm:text-base font-bold text-[#0B1F3A]">
                    {ord.serviceTitle}
                  </h3>
                  <p className="text-xs text-[#475569] mt-1">{ord.itemsSummary}</p>

                  <div className="mt-3 pt-3 border-t border-[#F1F5F9] grid grid-cols-2 gap-2 text-xs text-[#475569]">
                    <div>
                      <span className="text-[#64748B] block text-[10.5px]">Assigned Tailor</span>
                      <span className="font-semibold text-[#0B1F3A]">{ord.tailorName}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[10.5px]">Promised Delivery</span>
                      <span className="font-semibold text-[#0B1F3A]">{ord.deliveryDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                  <span className="text-base font-extrabold text-[#0B1F3A] tabular-nums">
                    ₹{ord.amount.toLocaleString('en-IN')}
                  </span>

                  {!ord.quoteApproved && ord.stage === 'Quotation Submitted' ? (
                    <button
                      type="button"
                      onClick={() => onApproveQuote(ord.id)}
                      className="inline-flex items-center gap-1.5 bg-[#0B7285] hover:bg-[#085463] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors"
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
        </div>
      ) : (
        <>
          {/* Search + Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services (e.g. zip, waist, tear, saree)..."
                className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-[#0B1F3A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0B7285] shadow-2xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-[#0B1F3A] text-white shadow-2xs'
                    : 'bg-white border border-[#E2E8F0] text-[#334155] hover:border-[#0B7285]'
                }`}
              >
                <span>All</span>
                <span className="text-[10px] opacity-80 tabular-nums">12</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('garment')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'garment'
                    ? 'bg-[#0B1F3A] text-white shadow-2xs'
                    : 'bg-white border border-[#E2E8F0] text-[#334155] hover:border-[#0B7285]'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Garments</span>
                <span className="text-[10px] opacity-80 tabular-nums">10</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('saree')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'saree'
                    ? 'bg-[#0B1F3A] text-white shadow-2xs'
                    : 'bg-white border border-[#E2E8F0] text-[#334155] hover:border-[#0B7285]'
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
              <div className="flex items-end justify-between gap-2 pb-3 border-b border-[#E2E8F0] mb-5">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#0B1F3A] font-serif-accent">
                    Garment Alteration &amp; Repair Services
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Trousers, shirts, kurtis, zip replacements, tear mending, and precision sizing.
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
              <div className="flex items-end justify-between gap-2 pb-3 border-b border-[#E2E8F0] mb-5">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#0B1F3A] font-serif-accent">
                    Stitching &amp; Saree Add-Ons
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Matching saree fall &amp; pico, ready-to-wear 1-minute pre-pleating, and blouse
                    finishing.
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
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center">
              <p className="text-sm font-bold text-[#0B1F3A]">
                No matching alteration services found.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setActiveFilter('all');
                }}
                className="mt-3 text-xs font-bold text-[#0B7285] hover:underline cursor-pointer"
              >
                Reset Search &amp; Filters
              </button>
            </div>
          )}

          {/* Section 3: Explore Stitching Designs */}
          <section className="pt-4">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-lg sm:text-xl font-bold text-[#0B1F3A] font-serif-accent">
                Explore Stitching Designs
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('designs')}
                  className="inline-flex items-center gap-0.5 text-xs font-bold text-[#0B7285] hover:underline mr-2 cursor-pointer"
                >
                  More
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll designs left"
                  onClick={() => scrollDesigns('left')}
                  className="w-8 h-8 rounded-full border border-[#CBD5E1] text-[#0B1F3A] hover:border-[#0B7285] hover:text-[#0B7285] flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll designs right"
                  onClick={() => scrollDesigns('right')}
                  className="w-8 h-8 rounded-full border border-[#CBD5E1] text-[#0B1F3A] hover:border-[#0B7285] hover:text-[#0B7285] flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory"
            >
              {DESIGNS_CATALOG.slice(0, 7).map((design) => {
                const isFav = wishlistIds.includes(design.id);
                return (
                  <div
                    key={design.id}
                    className="snap-start shrink-0 w-[235px] sm:w-[248px] bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#0B7285]/45 hover:shadow-md overflow-hidden flex flex-col transition-all"
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
                        <span className="absolute top-2.5 left-2.5 bg-[#0B1F3A]/85 backdrop-blur-xs text-[#E2B14B] text-[10px] font-bold px-2.5 py-0.5 rounded-md">
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
                      <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 bg-white/90 text-[#0B1F3A] text-[10.5px] font-bold px-2 py-0.5 rounded-md tabular-nums">
                        <Clock className="w-3 h-3 text-[#0B7285]" />
                        {design.turnaroundDays}d
                      </span>
                    </div>

                    <div className="p-3.5 flex flex-col flex-1 justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0B7285]">
                          {design.category}
                        </p>
                        <h3
                          onClick={() => onSelectDesign(design)}
                          className="mt-1 text-xs sm:text-[13px] font-bold text-[#0B1F3A] line-clamp-2 hover:text-[#0B7285] cursor-pointer"
                        >
                          {design.title}
                        </h3>
                        <p className="mt-2 text-base font-extrabold text-[#0B1F3A] tabular-nums">
                          ₹ {design.price.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B] tabular-nums">
                          <Eye className="w-3.5 h-3.5 text-[#0B7285]" />
                          {design.views} views
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="Add design to bag"
                            onClick={() => onQuickAddDesign(design)}
                            className="w-8 h-8 rounded-lg border border-[#CBD5E1] text-[#0B1F3A] hover:border-[#0B7285] hover:text-[#0B7285] flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectDesign(design)}
                            className="bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
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
                className="inline-flex items-center justify-center bg-[#0B1F3A] hover:bg-[#15325B] text-white font-bold text-sm px-7 py-3 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Explore All Designs
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

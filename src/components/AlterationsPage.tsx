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
  amber: 'bg-[#FEF3C7] text-[#B45309]',
  orange: 'bg-[#FFEDD5] text-[#C2410C]',
  blue: 'bg-[#DBEAFE] text-[#1D4ED8]',
  emerald: 'bg-[#D1FAE5] text-[#047857]',
  rose: 'bg-[#FFE4E6] text-[#BE123C]',
  purple: 'bg-[#F3E8FF] text-[#7E22CE]',
};

const AlterationIconBadge: React.FC<{ service: AlterationService }> = ({ service }) => {
  if (service.section === 'saree') {
    return (
      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#FED7AA] bg-[#FFF7ED] mx-auto shadow-2xs">
        <SafeImage src={ASSETS.sareePleating} alt={service.title} className="w-full h-full object-cover" />
      </div>
    );
  }

  const circleColor: Record<AlterationService['iconType'], string> = {
    button: 'bg-[#FEF3C7] border-[#F59E0B] text-[#78350F]',
    tear: 'bg-[#F5F5F4] border-[#57534E] text-[#1C1917]',
    waist: 'bg-[#FEE2E2] border-[#EF4444] text-[#B91C1C]',
    length: 'bg-[#E0E7FF] border-[#6366F1] text-[#3730A3]',
    'zip-small': 'bg-[#FFEDD5] border-[#F97316] text-[#C2410C]',
    sleeve: 'bg-[#EDE9FE] border-[#8B5CF6] text-[#5B21B6]',
    'slim-fit': 'bg-[#DCFCE7] border-[#22C55E] text-[#15803D]',
    'zip-large': 'bg-[#FCE7F3] border-[#EC4899] text-[#9D174D]',
    jeans: 'bg-[#DBEAFE] border-[#2563EB] text-[#1E3A8A]',
    'double-stitch': 'bg-[#FEF9C3] border-[#EAB308] text-[#854D0E]',
    'saree-fall': 'bg-[#FFE4E6] border-[#F43F5E] text-[#9F1239]',
    'saree-pleat': 'bg-[#FFEDD5] border-[#EA580C] text-[#9A3412]',
  };

  return (
    <div
      className={`w-14 h-14 rounded-full border-2 mx-auto flex items-center justify-center shadow-2xs ${circleColor[service.iconType]}`}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
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
        {(service.iconType === 'sleeve' || service.iconType === 'slim-fit' || service.iconType === 'double-stitch') && (
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
        className="relative bg-white rounded-2xl border border-[#EFE6DC] hover:border-[#FED7AA] hover:shadow-md transition-all p-4 pt-7 flex flex-col justify-between overflow-hidden"
      >
        {/* Top-left Corner Badge (exact match to Screenshot 2) */}
        <span
          className={`absolute top-0 left-0 text-[9.5px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-br-xl ${BADGE_STYLE[srv.badgeColor]}`}
        >
          {srv.badge}
        </span>

        <div className="text-center">
          <AlterationIconBadge service={srv} />
          <h3 className="mt-3 text-sm font-extrabold text-[#EA580C] leading-snug">{srv.title}</h3>
          <p className="mt-1.5 text-[11.5px] text-[#57534E] leading-relaxed line-clamp-2 min-h-[34px]">
            {srv.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-[#F5EFE8] flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-0.5 tabular-nums">
            <span className="text-sm font-extrabold text-[#1C1917]">₹{srv.price}</span>
            <span className="text-[11px] text-[#78716C]">/{srv.unit}</span>
          </div>

          {qty > 0 ? (
            <div className="inline-flex items-center gap-1.5 bg-[#FFF7ED] border border-[#EA580C] rounded-full px-1.5 py-0.5">
              <button
                type="button"
                aria-label={`Remove one ${srv.title}`}
                onClick={() => onUpdateQty(srv.id, -1)}
                className="w-6 h-6 rounded-full bg-white text-[#EA580C] flex items-center justify-center hover:bg-[#EA580C] hover:text-white transition-colors cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-extrabold text-[#EA580C] min-w-[16px] text-center tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                aria-label={`Add one more ${srv.title}`}
                onClick={() => onUpdateQty(srv.id, 1)}
                className="w-6 h-6 rounded-full bg-[#EA580C] text-white flex items-center justify-center hover:bg-[#C2410C] transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddAlteration(srv)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#EA580C] bg-[#FFF7ED] hover:bg-[#EA580C] hover:text-white border border-[#FED7AA] px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              Add +
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917]">Doorstep Alteration</h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-0.5">
            Expert fitting, mending &amp; doorstep pickup in Hyderabad
          </p>
        </div>

        {/* Book | History Toggle */}
        <div className="inline-flex items-center bg-[#F5EFE8] p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('book')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'book'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Book
          </button>
          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              viewMode === 'history'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            History
            <span className="text-[10px] bg-[#EA580C]/15 text-[#EA580C] px-1.5 rounded-full tabular-nums">
              {orders.length}
            </span>
          </button>
        </div>
      </div>

      {viewMode === 'history' ? (
        /* Order History View (Business Plan Order Lifecycle & Quote Approval) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#1C1917]">
              Your Stitching &amp; Alteration Bookings
            </h2>
            <button
              type="button"
              onClick={() => setViewMode('book')}
              className="text-xs font-bold text-[#EA580C] hover:underline cursor-pointer"
            >
              + Book New Alteration
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white rounded-2xl border border-[#EFE6DC] p-5 flex flex-col justify-between gap-4 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#EA580C] tabular-nums">
                      {ord.id}
                    </span>
                    <span
                      className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${
                        ord.stage === 'Delivered'
                          ? 'bg-[#ECFDF5] text-[#059669]'
                          : ord.stage === 'Quotation Submitted'
                            ? 'bg-[#FEF3C7] text-[#B45309]'
                            : 'bg-[#FFF7ED] text-[#EA580C]'
                      }`}
                    >
                      {ord.stage}
                    </span>
                  </div>

                  <h3 className="mt-2 text-sm sm:text-base font-extrabold text-[#1C1917]">
                    {ord.serviceTitle}
                  </h3>
                  <p className="text-xs text-[#57534E] mt-1">{ord.itemsSummary}</p>

                  <div className="mt-3 pt-3 border-t border-[#F5EFE8] grid grid-cols-2 gap-2 text-xs text-[#57534E]">
                    <div>
                      <span className="text-[#78716C] block text-[10.5px]">Assigned Tailor</span>
                      <span className="font-semibold text-[#1C1917]">{ord.tailorName}</span>
                    </div>
                    <div>
                      <span className="text-[#78716C] block text-[10.5px]">Promised Delivery</span>
                      <span className="font-semibold text-[#1C1917]">{ord.deliveryDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#F5EFE8]">
                  <span className="text-base font-extrabold text-[#1C1917] tabular-nums">
                    ₹{ord.amount.toLocaleString('en-IN')}
                  </span>

                  {!ord.quoteApproved && ord.stage === 'Quotation Submitted' ? (
                    <button
                      type="button"
                      onClick={() => onApproveQuote(ord.id)}
                      className="inline-flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
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
        /* Book Alteration Services View (Exact match to Screenshot 2) */
        <>
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#A8A29E] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services (e.g. zip, waist, tear)..."
              className="w-full bg-white border border-[#E7DDD2] rounded-xl pl-11 pr-4 py-3 text-xs sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#EA580C] shadow-2xs"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'bg-white border border-[#E7E5E4] text-[#44403C] hover:border-[#EA580C]'
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-[#F5F5F4] text-[#57534E]'
                }`}
              >
                12
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('garment')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'garment'
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'bg-white border border-[#E7E5E4] text-[#44403C] hover:border-[#EA580C]'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Garments</span>
              <span
                className={`text-[10px] px-1.5 rounded-full tabular-nums ${
                  activeFilter === 'garment'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F5F5F4] text-[#57534E]'
                }`}
              >
                10
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('saree')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'saree'
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'bg-white border border-[#E7E5E4] text-[#44403C] hover:border-[#EA580C]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>Saree &amp; Add-ons</span>
              <span className="text-[9.5px] font-extrabold uppercase bg-[#FEF3C7] text-[#B45309] px-1.5 py-0.5 rounded-md">
                SPECIAL
              </span>
            </button>
          </div>

          {/* Section 1: Garment Alteration & Repair Services */}
          {garmentServices.length > 0 && (
            <section>
              <div className="flex items-end justify-between gap-2 pb-3 border-b border-[#EFE6DC] mb-5">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#1C1917]">
                    Garment Alteration &amp; Repair Services
                  </h2>
                  <p className="text-xs text-[#78716C]">
                    Trousers, shirts, kurtis, zip replacements, tear mending, and custom size fitting.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#78716C] bg-[#F5EFE8] px-2.5 py-1 rounded-full shrink-0 tabular-nums">
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
              <div className="flex items-end justify-between gap-2 pb-3 border-b border-[#EFE6DC] mb-5">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#1C1917]">
                    Stitching &amp; Saree Add-Ons
                  </h2>
                  <p className="text-xs text-[#78716C]">
                    Matching saree fall &amp; pico, ready-to-wear 1-minute pre-pleating, and blouse
                    finishing.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#78716C] bg-[#F5EFE8] px-2.5 py-1 rounded-full shrink-0 tabular-nums">
                  {sareeServices.length} services
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {sareeServices.map(renderServiceCard)}
              </div>
            </section>
          )}

          {filteredServices.length === 0 && (
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-10 text-center">
              <p className="text-sm font-bold text-[#1C1917]">No matching alteration services found.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setActiveFilter('all');
                }}
                className="mt-3 text-xs font-bold text-[#EA580C] hover:underline cursor-pointer"
              >
                Reset Search &amp; Filters
              </button>
            </div>
          )}

          {/* Section 3: Explore Stitching Designs (Exact match to Screenshot 2 bottom showcase) */}
          <section className="pt-4">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#1C1917] font-serif-accent">
                Explore Stitching Designs
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('designs')}
                  className="inline-flex items-center gap-0.5 text-xs font-bold text-[#EA580C] hover:underline mr-2 cursor-pointer"
                >
                  More
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll designs left"
                  onClick={() => scrollDesigns('left')}
                  className="w-8 h-8 rounded-full border border-[#FED7AA] text-[#EA580C] hover:bg-[#FFF7ED] flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll designs right"
                  onClick={() => scrollDesigns('right')}
                  className="w-8 h-8 rounded-full border border-[#FED7AA] text-[#EA580C] hover:bg-[#FFF7ED] flex items-center justify-center cursor-pointer"
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
                    className="snap-start shrink-0 w-[235px] sm:w-[248px] bg-white rounded-2xl border border-[#EFE6DC] hover:border-[#FED7AA] hover:shadow-md overflow-hidden flex flex-col transition-all"
                  >
                    <div
                      onClick={() => onSelectDesign(design)}
                      className="relative aspect-[3/4] bg-[#F8F6F4] overflow-hidden cursor-pointer"
                    >
                      <SafeImage
                        src={design.image}
                        alt={design.title}
                        className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
                      />
                      {design.trusted && (
                        <span className="absolute top-2.5 left-0 bg-[#38BDF8] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-r-full shadow-xs">
                          Trusted
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
                            isFav ? 'fill-[#E11D48] text-[#E11D48]' : 'text-[#57534E]'
                          }`}
                        />
                      </button>
                      <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 bg-white/90 text-[#1C1917] text-[10.5px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        <Clock className="w-3 h-3 text-[#78716C]" />
                        {design.turnaroundDays}d
                      </span>
                    </div>

                    <div className="p-3.5 flex flex-col flex-1 justify-between">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#EA580C]">
                          {design.category}
                        </p>
                        <h3
                          onClick={() => onSelectDesign(design)}
                          className="mt-1 text-xs sm:text-[13px] font-bold text-[#1C1917] line-clamp-2 hover:text-[#EA580C] cursor-pointer"
                        >
                          {design.title}
                        </h3>
                        <p className="mt-2 text-base font-extrabold text-[#1C1917] tabular-nums">
                          ₹ {design.price.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#F5EFE8] flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#EA580C] tabular-nums">
                          <Eye className="w-3.5 h-3.5" />
                          {design.views} views
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="Add design to bag"
                            onClick={() => onQuickAddDesign(design)}
                            className="w-8 h-8 rounded-lg border border-[#FED7AA] text-[#EA580C] hover:bg-[#FFF7ED] flex items-center justify-center cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectDesign(design)}
                            className="bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
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
                className="inline-flex items-center justify-center bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-bold text-sm px-7 py-3 rounded-full shadow-md shadow-[#EA580C]/20 transition-all cursor-pointer"
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

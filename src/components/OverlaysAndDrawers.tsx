import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Gift,
  Heart,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { CartItem, DesignProduct, OrderRecord, PromoOffer, ServiceLocality } from '../types';
import { SafeImage } from './SafeImage';

/* =========================================================
   1. LOCATION PICKER MODAL
========================================================= */
export const LocationModal: React.FC<{
  open: boolean;
  currentLocality: string;
  localities: ServiceLocality[];
  onSelect: (loc: string) => void;
  onChooseFromMap?: () => void;
  onClose: () => void;
}> = ({ open, currentLocality, localities, onSelect, onChooseFromMap, onClose }) => {
  const [query, setQuery] = useState('');
  if (!open) return null;

  const localityNames = localities.map((l) => l.name);
  const filtered = localityNames.filter((l) =>
    l.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A103D]/55 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#EAE0FA]">
        <div className="px-5 py-4 border-b border-[#EAE0FA] flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#1A103D]">
              Select Service Locality
            </h3>
            <p className="text-[11px] text-[#746894]">Hyderabad Doorstep Tailoring Zones</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#746894] hover:bg-[#F4EEFF] hover:text-[#1A103D] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B21D9] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Manikonda, Gachibowli, Jubilee Hills..."
              className="w-full border border-[#DDD0FA] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#1A103D] placeholder:text-[#746894] focus:outline-none focus:border-[#6B21D9]"
            />
          </div>

          {onChooseFromMap && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onChooseFromMap();
              }}
              className="w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-gradient-to-r from-[#F6F0FF] to-[#EFE5FF] border border-[#D8C5FA] hover:border-[#6B21D9] text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#6B21D9] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#1A103D] group-hover:text-[#6B21D9] transition-colors">
                    Choose Location &amp; Shops on Live Map
                  </p>
                  <p className="text-[11px] text-[#645588] truncate">
                    Drop a pin anywhere on Google Maps to find nearby tailors
                  </p>
                </div>
              </div>
              <MapPin className="w-4 h-4 text-[#6B21D9] shrink-0" />
            </button>
          )}

          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {filtered.length === 0 ? (
              <p className="text-xs text-center text-[#746894] py-6">
                No matching localities found.
              </p>
            ) : (
              filtered.map((loc) => {
                const active = loc === currentLocality;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      onSelect(loc);
                      onClose();
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#F4EEFF] text-[#6B21D9] border border-[#DDD0FA]'
                        : 'text-[#4B3F6B] hover:bg-[#FAF8FF]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#6B21D9]" />
                      {loc}
                    </span>
                    {active && <Check className="w-4 h-4" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   2. CART & CHECKOUT DRAWER
========================================================= */
export const CartDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  promos: PromoOffer[];
  locality: string;
  defaultTailorName?: string;
  defaultTailorId?: number | null;
  onUpdateQty: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckoutComplete: (order: OrderRecord) => void;
  onNotifyToast: (msg: string) => void;
}> = ({
  open,
  onClose,
  cart,
  promos,
  locality,
  defaultTailorName,
  defaultTailorId,
  onUpdateQty,
  onRemoveItem,
  onCheckoutComplete,
  onNotifyToast,
}) => {
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [bookingDone, setBookingDone] = useState<string | null>(null);

  if (!open) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const matchedPromo = promos.find((p) => p.code === appliedPromo);
  const discount =
    matchedPromo && subtotal >= matchedPromo.minOrder ? matchedPromo.discountAmount : 0;
  const total = Math.max(0, subtotal - discount);

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    const offer = promos.find((p) => p.code === code);
    if (!offer) {
      const codes = promos.map((p) => p.code).join(', ');
      onNotifyToast(
        codes ? `Invalid promo code. Try ${codes}.` : 'No active promo codes available right now.',
      );
      return;
    }
    if (subtotal < offer.minOrder) {
      onNotifyToast(`${code} requires a minimum order of ₹${offer.minOrder}.`);
      return;
    }
    setAppliedPromo(code);
    onNotifyToast(`Promo ${code} applied! You saved ₹${offer.discountAmount}.`);
  };

  const handlePlaceOrder = () => {
    const id = `TLR-${new Date().getFullYear()}-${Math.floor(1050 + Math.random() * 8900)}`;
    const today = new Date();
    const delivery = new Date(today);
    delivery.setDate(today.getDate() + 4);
    const newOrder: OrderRecord = {
      id,
      serviceTitle:
        cart.length === 1
          ? cart[0].title
          : `${cart[0].title} + ${cart.length - 1} more item(s)`,
      type: cart[0]?.type || 'alteration',
      tailorName: defaultTailorName || 'Tailering Master Atelier',
      tailorId: defaultTailorId ?? null,
      locality,
      createdAt: today.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      deliveryDate: delivery.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      amount: total,
      stage: 'Visit Scheduled',
      itemsSummary: cart.map((c) => `${c.quantity}x ${c.title}`).join(', '),
      quoteApproved: true,
      pickupMode: 'doorstep_pickup',
      pickupDate: today.toISOString().split('T')[0],
      pickupSlot: '10:00 AM – 12:00 PM',
      pickupAddress: locality,
    };
    onCheckoutComplete(newOrder);
    setBookingDone(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#1A103D]/55 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-[#EAE0FA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#6B21D9]" />
            <h3 className="text-base font-bold text-[#1A103D] font-serif-accent">
              Your Tailering Bag
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setBookingDone(null);
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {bookingDone ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h4 className="text-xl font-bold text-[#1A103D] font-serif-accent">
              Booking Confirmed
            </h4>
            <p className="text-xs font-bold text-[#6B21D9] bg-[#F4EEFF] border border-[#DCD0F5] px-3 py-1 rounded-lg tabular-nums">
              Order ID: {bookingDone}
            </p>
            <p className="text-sm text-[#475569]">
              Our certified master tailor in <strong className="text-[#1A103D]">{locality}</strong>{' '}
              will arrive for complimentary doorstep measurement &amp; pickup. Pay securely at
              pickup.
            </p>
            <button
              type="button"
              onClick={() => {
                setBookingDone(null);
                onClose();
              }}
              className="mt-2 bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-bold px-6 py-3 rounded-xl cursor-pointer transition-colors"
            >
              Continue Browsing
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#F4EEFF] text-[#6B21D9] flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#1A103D]">Your Tailering bag is empty</p>
            <p className="text-xs text-[#64748B] max-w-xs">
              Add doorstep alterations from ₹49 or custom couture designs to schedule a free home
              visit.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#FAF8FF] rounded-xl border border-[#EAE0FA] p-3.5 flex items-center gap-3"
                >
                  {item.image && (
                    <div className="w-14 h-16 rounded-lg overflow-hidden bg-[#F1F5F9] shrink-0">
                      <SafeImage
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#1A103D] line-clamp-1">{item.title}</p>
                    <p className="text-[11px] text-[#64748B] truncate">{item.subtitle}</p>
                    <p className="text-xs font-extrabold text-[#6B21D9] mt-1 tabular-nums">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-[#94A3B8] hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="inline-flex items-center gap-1.5 bg-white border border-[#CBD5E1] rounded-lg px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, -1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-[#475569] hover:text-[#6B21D9] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold tabular-nums min-w-[14px] text-center text-[#1A103D]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, 1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-[#475569] hover:text-[#6B21D9] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Promo Code Input */}
              <div className="pt-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Promo code (WELCOME150)"
                      className="w-full border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs uppercase text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-[#EAE0FA] bg-[#FAF8FF] space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#475569]">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-[#1A103D] tabular-nums">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[#059669]">
                  <span>Doorstep Measurement &amp; Pickup</span>
                  <span className="font-bold">FREE</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#6B21D9]">
                    <span>Promo ({appliedPromo})</span>
                    <span className="font-bold tabular-nums">-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-[#1A103D] pt-2 border-t border-[#EAE0FA]">
                  <span>Pay at Pickup Total</span>
                  <span className="tabular-nums">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                className="w-full bg-[#1A103D] hover:bg-[#2E1065] text-white font-bold text-sm py-3.5 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Book Now · Pay at Pickup
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   3. WISHLIST DRAWER
========================================================= */
export const WishlistDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  designs: DesignProduct[];
  wishlistIds: string[];
  onToggleWishlist: (id: string) => void;
  onSelectDesign: (design: DesignProduct) => void;
}> = ({ open, onClose, designs, wishlistIds, onToggleWishlist, onSelectDesign }) => {
  if (!open) return null;
  const saved = designs.filter((d) => wishlistIds.includes(d.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#1A103D]/55 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-[#EAE0FA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#C8922A] fill-[#C8922A]" />
            <h3 className="text-base font-bold text-[#1A103D] font-serif-accent">
              Saved Designs ({saved.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {saved.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Heart className="w-10 h-10 text-[#CBD5E1] mx-auto" />
              <p className="text-sm font-bold text-[#1A103D]">No saved designs yet</p>
              <p className="text-xs text-[#64748B]">
                Tap the heart icon on any blouse, lehenga, or sherwani to bookmark it here.
              </p>
            </div>
          ) : (
            saved.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-[#EAE0FA] bg-[#FAF8FF]"
              >
                <div className="w-16 h-20 rounded-lg overflow-hidden shrink-0">
                  <SafeImage
                    src={d.image}
                    alt={d.title}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-[#6B21D9] uppercase tracking-wider">
                    {d.category}
                  </p>
                  <p className="text-xs font-bold text-[#1A103D] line-clamp-2">{d.title}</p>
                  <p className="text-xs font-extrabold text-[#1A103D] mt-1 tabular-nums">
                    ₹{d.price.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectDesign(d);
                    }}
                    className="bg-[#1A103D] hover:bg-[#2E1065] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    Stitch
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleWishlist(d.id)}
                    className="text-[11px] text-[#64748B] hover:text-red-600 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   4. DESIGN DETAIL MODAL (BOOK STITCHING)
========================================================= */
export const DesignDetailModal: React.FC<{
  design: DesignProduct | null;
  onClose: () => void;
  onAddDesignToCart: (design: DesignProduct) => void;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
}> = ({ design, onClose, onAddDesignToCart, isWishlisted, onToggleWishlist }) => {
  if (!design) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A103D]/60 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-[#EAE0FA] max-h-[90vh] overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-12">
          <div className="sm:col-span-5 relative bg-[#F1F5F9] min-h-[260px]">
            <SafeImage
              src={design.image}
              alt={design.title}
              className="w-full h-full object-cover object-top"
            />
            <button
              type="button"
              onClick={() => onToggleWishlist(design.id)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 shadow-sm flex items-center justify-center cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${
                  isWishlisted ? 'fill-[#C8922A] text-[#C8922A]' : 'text-[#475569]'
                }`}
              />
            </button>
          </div>

          <div className="sm:col-span-7 p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6B21D9]">
                  {design.category}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-[#1A103D] mt-1 leading-snug font-serif-accent">
                {design.title}
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Crafted by <strong className="text-[#1A103D]">{design.boutique}</strong>
              </p>

              <div className="mt-3 flex items-center gap-3">
                <span className="text-2xl font-extrabold text-[#1A103D] tabular-nums">
                  ₹{design.price.toLocaleString('en-IN')}
                </span>
                {design.originalPrice && (
                  <span className="text-sm text-[#94A3B8] line-through tabular-nums">
                    ₹{design.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#A67418] bg-[#FBF5E6] px-2 py-0.5 rounded-md tabular-nums">
                  <Star className="w-3 h-3 fill-[#C8922A] text-[#C8922A]" />
                  {design.rating}
                </span>
              </div>

              <p className="mt-3 text-xs sm:text-sm text-[#334155] leading-relaxed">
                {design.description}
              </p>

              <div className="mt-3 bg-[#FAF8FF] border border-[#EAE0FA] rounded-xl p-3 text-xs text-[#475569] space-y-1.5">
                <p>
                  <strong className="text-[#1A103D]">Fabric Guidance:</strong> {design.fabricNote}
                </p>
                <p className="inline-flex items-center gap-1.5 text-[#6B21D9] font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Estimated Delivery: {design.turnaroundDays} Days · Free Home Measurement
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-[#EAE0FA]">
              <button
                type="button"
                onClick={() => {
                  onAddDesignToCart(design);
                  onClose();
                }}
                className="w-full bg-[#1A103D] hover:bg-[#2E1065] text-white font-bold text-sm py-3 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Add to Bag · Book Free Home Visit
              </button>
              <p className="text-[11px] text-center text-[#64748B] inline-flex items-center justify-center gap-1 w-full">
                <ShieldCheck className="w-3.5 h-3.5 text-[#6B21D9]" />
                Fabric Insured · 7-Day Free Doorstep Refit Guarantee
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   5. REFER & EARN MODAL
========================================================= */
export const ReferralModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onNotifyToast: (msg: string) => void;
}> = ({ open, onClose, onNotifyToast }) => {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const refCode = 'TAILERING50';
  const copyCode = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(refCode).catch(() => {});
    setCopied(true);
    onNotifyToast(`Referral code ${refCode} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A103D]/60 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#EAE0FA]">
        <div className="bg-gradient-to-br from-[#1A103D] via-[#0F2C52] to-[#6B21D9] p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-white/80 hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <Gift className="w-8 h-8 text-[#E2B14B] mb-2" />
          <h3 className="text-xl font-bold font-serif-accent">Gift ₹50, Earn ₹50 Cash</h3>
          <p className="text-xs text-slate-200 mt-1">
            Share your personal Tailering invite code with friends &amp; neighbors in Hyderabad.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-[#FAF8FF] border border-dashed border-[#6B21D9]/50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                YOUR REFERRAL CODE
              </p>
              <p className="text-lg font-extrabold text-[#1A103D] tracking-wider">{refCode}</p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-[#475569] leading-relaxed">
            When your friend books their first custom stitching or alteration order using{' '}
            <strong className="text-[#1A103D]">{refCode}</strong>, they receive ₹50 off instantly
            and ₹50 cash is credited to your Tailering account upon delivery.
          </p>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   6. SUPPORT CHAT DRAWER
========================================================= */
export const SupportDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  locality: string;
}> = ({ open, onClose, locality }) => {
  const [messages, setMessages] = useState([
    {
      from: 'agent',
      text: `Namaste! Welcome to Tailering Concierge (${locality}). How can we assist with your bespoke stitching, alterations, or home measurement visit today?`,
    },
  ]);
  const [input, setInput] = useState('');

  if (!open) return null;

  const sendMessage = (textToSend?: string) => {
    const msg = (textToSend ?? input).trim();
    if (!msg) return;
    setMessages((prev) => [
      ...prev,
      { from: 'user', text: msg },
      {
        from: 'agent',
        text: 'Thank you for reaching out! A Tailering Master Tailor advisor has been assigned to your query and can call you back within 5 minutes.',
      },
    ]);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#1A103D]/45 backdrop-blur-[1px]">
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="bg-[#1A103D] text-white px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6B21D9]/40 text-[#C4B5FD] flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-serif-accent">Tailering Concierge</h3>
              <p className="text-[11px] text-slate-300">Hyderabad Customer &amp; Tailor Desk</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF8FF]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                m.from === 'user'
                  ? 'ml-auto bg-[#1A103D] text-white rounded-br-sm'
                  : 'bg-white border border-[#EAE0FA] text-[#1A103D] rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          ))}

          <div className="pt-2 flex flex-wrap gap-1.5">
            {[
              'Track my order',
              'Free home measurement availability',
              'Bridal maggam work quote',
            ].map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => sendMessage(quick)}
                className="text-[11px] font-semibold bg-white border border-[#DCD0F5] text-[#6B21D9] px-2.5 py-1 rounded-lg hover:bg-[#F4EEFF] cursor-pointer transition-colors"
              >
                {quick}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-3 bg-white border-t border-[#EAE0FA] flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 bg-[#FAF8FF] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="w-9 h-9 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

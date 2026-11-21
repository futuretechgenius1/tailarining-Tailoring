import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
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
import { DESIGNS_CATALOG, HYDERABAD_LOCALITIES, PROMO_OFFERS } from '../data/catalogData';
import { CartItem, DesignProduct, OrderRecord } from '../types';
import { SafeImage } from './SafeImage';

/* =========================================================
   1. LOCATION PICKER MODAL
========================================================= */
export const LocationModal: React.FC<{
  open: boolean;
  currentLocality: string;
  onSelect: (loc: string) => void;
  onClose: () => void;
}> = ({ open, currentLocality, onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  if (!open) return null;

  const filtered = HYDERABAD_LOCALITIES.filter((l) =>
    l.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F3A]/55 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#E2E8F0]">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0B1F3A] font-serif-accent">
              Select Service Locality
            </h3>
            <p className="text-[11px] text-[#64748B]">Hyderabad Doorstep Tailoring Zones</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0B1F3A] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Manikonda, Gachibowli, Jubilee Hills..."
              className="w-full border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0B7285]"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5">
            {filtered.map((loc) => {
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
                      ? 'bg-[#F0F9FA] text-[#0B7285] border border-[#CBE7EC]'
                      : 'text-[#334155] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#0B7285]" />
                    {loc}
                  </span>
                  {active && <Check className="w-4 h-4" />}
                </button>
              );
            })}
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
  locality: string;
  onUpdateQty: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckoutComplete: (order: OrderRecord) => void;
  onNotifyToast: (msg: string) => void;
}> = ({
  open,
  onClose,
  cart,
  locality,
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
  const matchedPromo = PROMO_OFFERS.find((p) => p.code === appliedPromo);
  const discount =
    matchedPromo && subtotal >= matchedPromo.minOrder ? matchedPromo.discountAmount : 0;
  const total = Math.max(0, subtotal - discount);

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    const offer = PROMO_OFFERS.find((p) => p.code === code);
    if (!offer) {
      onNotifyToast('Invalid promo code. Try WELCOME150, SAVE250, or SAVE500.');
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
    const id = `TLR-2026-${Math.floor(1050 + Math.random() * 8900)}`;
    const newOrder: OrderRecord = {
      id,
      serviceTitle:
        cart.length === 1
          ? cart[0].title
          : `${cart[0].title} + ${cart.length - 1} more item(s)`,
      type: cart[0]?.type || 'alteration',
      tailorName: 'Radhika Designer Boutique',
      locality,
      createdAt: '21 Nov 2026',
      deliveryDate: '26 Nov 2026',
      amount: total,
      stage: 'Visit Scheduled',
      itemsSummary: cart.map((c) => `${c.quantity}x ${c.title}`).join(', '),
      quoteApproved: true,
    };
    onCheckoutComplete(newOrder);
    setBookingDone(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0B1F3A]/55 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#0B7285]" />
            <h3 className="text-base font-bold text-[#0B1F3A] font-serif-accent">
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
            <h4 className="text-xl font-bold text-[#0B1F3A] font-serif-accent">
              Booking Confirmed
            </h4>
            <p className="text-xs font-bold text-[#0B7285] bg-[#F0F9FA] border border-[#CBE7EC] px-3 py-1 rounded-lg tabular-nums">
              Order ID: {bookingDone}
            </p>
            <p className="text-sm text-[#475569]">
              Our certified master tailor in <strong className="text-[#0B1F3A]">{locality}</strong>{' '}
              will arrive for complimentary doorstep measurement &amp; pickup. Pay securely at
              pickup.
            </p>
            <button
              type="button"
              onClick={() => {
                setBookingDone(null);
                onClose();
              }}
              className="mt-2 bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold px-6 py-3 rounded-xl cursor-pointer transition-colors"
            >
              Continue Browsing
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#F0F9FA] text-[#0B7285] flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#0B1F3A]">Your Tailering bag is empty</p>
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
                  className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-3.5 flex items-center gap-3"
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
                    <p className="text-xs font-bold text-[#0B1F3A] line-clamp-1">{item.title}</p>
                    <p className="text-[11px] text-[#64748B] truncate">{item.subtitle}</p>
                    <p className="text-xs font-extrabold text-[#0B7285] mt-1 tabular-nums">
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
                        className="w-5 h-5 rounded flex items-center justify-center text-[#475569] hover:text-[#0B7285] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold tabular-nums min-w-[14px] text-center text-[#0B1F3A]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, 1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-[#475569] hover:text-[#0B7285] cursor-pointer"
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
                      className="w-full border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs uppercase text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#475569]">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-[#0B1F3A] tabular-nums">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-[#059669]">
                  <span>Doorstep Measurement &amp; Pickup</span>
                  <span className="font-bold">FREE</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#0B7285]">
                    <span>Promo ({appliedPromo})</span>
                    <span className="font-bold tabular-nums">-₹{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-[#0B1F3A] pt-2 border-t border-[#E2E8F0]">
                  <span>Pay at Pickup Total</span>
                  <span className="tabular-nums">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                className="w-full bg-[#0B1F3A] hover:bg-[#15325B] text-white font-bold text-sm py-3.5 rounded-xl shadow-sm transition-colors cursor-pointer"
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
  wishlistIds: string[];
  onToggleWishlist: (id: string) => void;
  onSelectDesign: (design: DesignProduct) => void;
}> = ({ open, onClose, wishlistIds, onToggleWishlist, onSelectDesign }) => {
  if (!open) return null;
  const saved = DESIGNS_CATALOG.filter((d) => wishlistIds.includes(d.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0B1F3A]/55 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#C8922A] fill-[#C8922A]" />
            <h3 className="text-base font-bold text-[#0B1F3A] font-serif-accent">
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
              <p className="text-sm font-bold text-[#0B1F3A]">No saved designs yet</p>
              <p className="text-xs text-[#64748B]">
                Tap the heart icon on any blouse, lehenga, or sherwani to bookmark it here.
              </p>
            </div>
          ) : (
            saved.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
              >
                <div className="w-16 h-20 rounded-lg overflow-hidden shrink-0">
                  <SafeImage
                    src={d.image}
                    alt={d.title}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-[#0B7285] uppercase tracking-wider">
                    {d.category}
                  </p>
                  <p className="text-xs font-bold text-[#0B1F3A] line-clamp-2">{d.title}</p>
                  <p className="text-xs font-extrabold text-[#0B1F3A] mt-1 tabular-nums">
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
                    className="bg-[#0B1F3A] hover:bg-[#15325B] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F3A]/60 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-[#E2E8F0] max-h-[90vh] overflow-y-auto">
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
                <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#0B7285]">
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

              <h3 className="text-lg sm:text-xl font-bold text-[#0B1F3A] mt-1 leading-snug font-serif-accent">
                {design.title}
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Crafted by <strong className="text-[#0B1F3A]">{design.boutique}</strong>
              </p>

              <div className="mt-3 flex items-center gap-3">
                <span className="text-2xl font-extrabold text-[#0B1F3A] tabular-nums">
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

              <div className="mt-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-xs text-[#475569] space-y-1.5">
                <p>
                  <strong className="text-[#0B1F3A]">Fabric Guidance:</strong> {design.fabricNote}
                </p>
                <p className="inline-flex items-center gap-1.5 text-[#0B7285] font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Estimated Delivery: {design.turnaroundDays} Days · Free Home Measurement
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => {
                  onAddDesignToCart(design);
                  onClose();
                }}
                className="w-full bg-[#0B1F3A] hover:bg-[#15325B] text-white font-bold text-sm py-3 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Add to Bag · Book Free Home Visit
              </button>
              <p className="text-[11px] text-center text-[#64748B] inline-flex items-center justify-center gap-1 w-full">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0B7285]" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F3A]/60 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#E2E8F0]">
        <div className="bg-gradient-to-br from-[#0B1F3A] via-[#0F2C52] to-[#0B7285] p-6 text-white relative">
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
          <div className="bg-[#F8FAFC] border border-dashed border-[#0B7285]/50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                YOUR REFERRAL CODE
              </p>
              <p className="text-lg font-extrabold text-[#0B1F3A] tracking-wider">{refCode}</p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 bg-[#0B7285] hover:bg-[#085463] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-[#475569] leading-relaxed">
            When your friend books their first custom stitching or alteration order using{' '}
            <strong className="text-[#0B1F3A]">{refCode}</strong>, they receive ₹50 off instantly
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
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0B1F3A]/45 backdrop-blur-[1px]">
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="bg-[#0B1F3A] text-white px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B7285]/40 text-[#5EEAD4] flex items-center justify-center">
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                m.from === 'user'
                  ? 'ml-auto bg-[#0B1F3A] text-white rounded-br-sm'
                  : 'bg-white border border-[#E2E8F0] text-[#0B1F3A] rounded-bl-sm'
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
                className="text-[11px] font-semibold bg-white border border-[#CBE7EC] text-[#0B7285] px-2.5 py-1 rounded-lg hover:bg-[#F0F9FA] cursor-pointer transition-colors"
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
          className="p-3 bg-white border-t border-[#E2E8F0] flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="w-9 h-9 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

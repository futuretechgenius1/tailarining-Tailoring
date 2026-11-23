import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  MapPin,
  Navigation,
  Phone,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { OrderRecord, StorefrontMediaMap } from '../types';
import {
  EvaluatedTailorShop,
  MatchingRulesConfig,
  ServiceSpecialtyRule,
  evaluateHomeVisitFee,
} from '../utils/matchingRules';
import { SafeImage } from './SafeImage';

export interface MapRouteSummary {
  shopId: string;
  shopName: string;
  distanceMeters: number;
  durationMillis: number;
  travelMode: 'DRIVING' | 'TWO_WHEELER' | 'WALKING';
}

interface MapServiceOption {
  id: string;
  label: string;
  category: 'alteration' | 'custom' | 'uniform';
  price: number;
  turnaround: string;
  description: string;
  specialtyMatch: ServiceSpecialtyRule[];
}

const MAP_SERVICE_OPTIONS: MapServiceOption[] = [
  {
    id: 'ms-blouse',
    label: 'Designer / Maggam Blouse Stitching',
    category: 'custom',
    price: 1299,
    turnaround: '4–5 days',
    description: 'Custom lining, neckline shaping, padded cups option, and doorstep trial.',
    specialtyMatch: ['all', 'blouse-maggam'],
  },
  {
    id: 'ms-alteration',
    label: 'Express Garment Alteration Bundle',
    category: 'alteration',
    price: 349,
    turnaround: '24–48 hrs',
    description: 'Waist fitting, original-hem shortening, zip replacement, or side tapering.',
    specialtyMatch: ['all', 'alterations'],
  },
  {
    id: 'ms-menswear',
    label: "Men's Bespoke Suit / Kurta Tailoring",
    category: 'custom',
    price: 2499,
    turnaround: '5–6 days',
    description: 'Custom-drafted suit jacket, blazer, wedding sherwani, or shirt & trouser set.',
    specialtyMatch: ['all', 'mens-tailoring'],
  },
  {
    id: 'ms-saree',
    label: 'Saree Fall, Pico & 1-Minute Pre-Pleating',
    category: 'alteration',
    price: 799,
    turnaround: '48 hrs',
    description: 'Color-matched fall, fine edge pico, and travel-ready box pre-pleating.',
    specialtyMatch: ['all', 'blouse-maggam', 'alterations'],
  },
  {
    id: 'ms-kurti',
    label: 'Custom Kurti & Palazzo / Salwar Set',
    category: 'custom',
    price: 1190,
    turnaround: '3–4 days',
    description: 'Breathable lined ethnic set with custom neckline and comfort bottom fit.',
    specialtyMatch: ['all', 'blouse-maggam'],
  },
  {
    id: 'ms-uniform',
    label: 'School, Clinic or Corporate Uniform Set',
    category: 'uniform',
    price: 999,
    turnaround: '4–5 days',
    description: 'Reinforced uniform stitching with size grading for single or bulk orders.',
    specialtyMatch: ['all', 'uniforms'],
  },
];

const PICKUP_TIME_SLOTS = [
  '09:30 AM – 11:30 AM',
  '12:00 PM – 02:00 PM',
  '03:00 PM – 05:00 PM',
  '05:30 PM – 07:30 PM',
];

function formatDurationMinutes(durationMillis: number): string {
  const mins = Math.max(1, Math.round(durationMillis / 60000));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function buildUpcomingDates(): { iso: string; dayLabel: string; dateLabel: string }[] {
  const out: { iso: string; dayLabel: string; dateLabel: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      iso: d.toISOString().split('T')[0],
      dayLabel:
        i === 0
          ? 'Today'
          : i === 1
            ? 'Tomorrow'
            : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dateLabel: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    });
  }
  return out;
}

export function getShopFallbackImage(shopId: string, media?: StorefrontMediaMap): string {
  const fallbacks = [
    media?.atelierBoutiqueInterior || '/src/assets/images/atelier_boutique_interior_1795277826258.jpg',
    media?.atelierHeroStitching || '/src/assets/images/atelier_hero_stitching_1795277761139.jpg',
    media?.atelierMaggamCraft || '/src/assets/images/atelier_maggam_craft_1795277781373.jpg',
    media?.atelierBespokeChalk || '/src/assets/images/atelier_bespoke_chalk_1795277807957.jpg',
    media?.heroStudio || '/src/assets/images/hero_tailoring_studio_1795271871856.jpg',
  ];
  let hash = 0;
  for (let i = 0; i < shopId.length; i++) {
    hash = (hash * 31 + shopId.charCodeAt(i)) >>> 0;
  }
  return fallbacks[hash % fallbacks.length];
}

// ============================================================================
// 1. MAP SHOP DETAIL MODAL (Live Google Maps Info, Hours, Rules Breakdown)
// ============================================================================
interface MapShopDetailModalProps {
  shop: EvaluatedTailorShop | null;
  routeSummary: MapRouteSummary | null;
  onClose: () => void;
  onBookShop: (shop: EvaluatedTailorShop) => void;
}

export const MapShopDetailModal: React.FC<MapShopDetailModalProps> = ({
  shop,
  routeSummary,
  onClose,
  onBookShop,
}) => {
  if (!shop) return null;

  const hasLiveRoute = routeSummary && routeSummary.shopId === shop.place.id;
  const coverSrc = shop.place.photoUri || getShopFallbackImage(shop.place.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1A103D]/65 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${shop.place.name} details`}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-[#EAE0FA] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo Header */}
        <div className="relative h-48 sm:h-56 bg-[#1A103D] shrink-0">
          <SafeImage
            src={coverSrc}
            alt={shop.place.name}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A103D] via-[#1A103D]/45 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close shop details"
            className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-[#1A103D]/80 hover:bg-[#1A103D] text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {shop.place.photoAttribution && (
            <span className="absolute top-3.5 left-4 text-[10px] text-white/75 bg-[#1A103D]/70 px-2 py-0.5 rounded">
              Photo: {shop.place.photoAttribution}
            </span>
          )}

          <div className="absolute bottom-4 left-5 right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#C4B5FD] font-semibold">
                {shop.rank !== null ? (
                  <span>
                    #{shop.rank} Match · {shop.dispatchWave === 1 ? 'Wave 1 Priority' : 'Wave 2 Backup'}
                  </span>
                ) : (
                  <span className="text-amber-300">Outside Current Rule Filter</span>
                )}
                {shop.place.isOpenNow !== null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className={shop.place.isOpenNow ? 'text-emerald-300' : 'text-rose-300'}>
                      {shop.place.isOpenNow ? 'Open Now' : 'Currently Closed'}
                    </span>
                  </>
                )}
              </div>
              <h2 className="font-serif-accent text-xl sm:text-2xl font-bold text-white leading-tight mt-0.5">
                {shop.place.name}
              </h2>
              <p className="text-xs text-white/80 mt-0.5 line-clamp-1">{shop.place.address}</p>
            </div>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-white shrink-0 tabular-nums">
              {shop.place.rating !== null && (
                <span className="inline-flex items-center gap-1 font-bold">
                  <Star className="w-4 h-4 fill-[#E2B14B] text-[#E2B14B]" />
                  {shop.place.rating.toFixed(1)}
                  <span className="text-white/70 font-normal">({shop.place.userRatingCount})</span>
                </span>
              )}
              <span className="text-white/35">|</span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-[#C4B5FD]" />
                {hasLiveRoute
                  ? `${(routeSummary.distanceMeters / 1000).toFixed(2)} km`
                  : `${shop.distanceKm.toFixed(2)} km`}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Details Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Live Route & Contact Summary Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EAE0FA] text-xs text-[#334155]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {hasLiveRoute && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#6B21D9] tabular-nums">
                  <Navigation className="w-3.5 h-3.5" />
                  Live Route: {(routeSummary.distanceMeters / 1000).toFixed(2)} km · ~
                  {formatDurationMinutes(routeSummary.durationMillis)}
                </span>
              )}
              {shop.place.phoneNumber && (
                <>
                  {hasLiveRoute && <span className="text-[#CBD5E1]">·</span>}
                  <span className="inline-flex items-center gap-1 font-semibold text-[#1A103D] tabular-nums">
                    <Phone className="w-3.5 h-3.5 text-[#6B21D9]" />
                    {shop.place.phoneNumber}
                  </span>
                </>
              )}
              {shop.place.primaryType && (
                <>
                  <span className="text-[#CBD5E1]">·</span>
                  <span>{shop.place.primaryType}</span>
                </>
              )}
            </div>

            {shop.place.googleMapsURI && (
              <a
                href={shop.place.googleMapsURI}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#6B21D9] hover:text-[#5B21B6]"
              >
                Open in Google Maps
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Matching Score Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Tailering Real-Time Matching Evaluation
              </h3>
              <span className="text-xs font-bold text-[#6B21D9] tabular-nums">
                Composite Score: {shop.matchScore} / 100
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              {[
                { label: 'Proximity', val: `${shop.scoreBreakdown.proximity}/45` },
                { label: 'Google Rating', val: `${shop.scoreBreakdown.rating}/30` },
                { label: 'Review Trust', val: `${shop.scoreBreakdown.trustVolume}/15` },
                { label: 'Availability', val: `${shop.scoreBreakdown.availability}/10` },
              ].map((m) => (
                <div key={m.label} className="rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] p-2.5">
                  <span className="block text-[11px] text-[#64748B]">{m.label}</span>
                  <span className="block text-sm font-bold text-[#1A103D] tabular-nums mt-0.5">
                    {m.val}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 divide-y divide-[#F1F5F9] border border-[#EAE0FA] rounded-xl overflow-hidden">
              {shop.ruleChecks.map((check) => (
                <div
                  key={check.ruleId}
                  className="px-3.5 py-2.5 bg-white flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {check.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#6B21D9] shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="font-semibold text-[#1A103D]">{check.label}</span>
                  </div>
                  <span
                    className={`text-right shrink-0 ${
                      check.passed ? 'text-[#475569]' : 'text-rose-700 font-semibold'
                    }`}
                  >
                    {check.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Real Google Maps Opening Hours */}
          {shop.place.openingHoursText.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">
                Live Google Maps Opening Hours
              </h3>
              <div className="rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-[#334155]">
                {shop.place.openingHoursText.map((line) => (
                  <p key={line} className="tabular-nums">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer CTA */}
        <div className="px-5 py-3.5 bg-white border-t border-[#EAE0FA] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#475569]">
            <span className="font-semibold text-[#1A103D] block">
              Doorstep Pickup or Direct Shop Visit
            </span>
            <span>Quote approval required before any fabric is cut.</span>
          </div>

          <button
            type="button"
            onClick={() => onBookShop(shop)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            Book Appointment &amp; Schedule Pickup
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. COMPLETE END-TO-END MAP SHOP APPOINTMENT & PICKUP BOOKING MODAL
// ============================================================================
interface MapShopBookingModalProps {
  shop: EvaluatedTailorShop | null;
  routeSummary: MapRouteSummary | null;
  locality: string;
  rules: MatchingRulesConfig;
  defaultAddress: string;
  onClose: () => void;
  onConfirmOrder: (order: OrderRecord, bookedShop: EvaluatedTailorShop) => void;
  onNotifyToast: (msg: string) => void;
}

export const MapShopBookingModal: React.FC<MapShopBookingModalProps> = ({
  shop,
  routeSummary,
  locality,
  rules,
  defaultAddress,
  onClose,
  onConfirmOrder,
  onNotifyToast,
}) => {
  const dateOptions = useMemo(() => buildUpcomingDates(), []);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(MAP_SERVICE_OPTIONS[0].id);
  const [appointmentMode, setAppointmentMode] = useState<'pickup' | 'studio'>('pickup');
  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[0].iso);
  const [selectedSlot, setSelectedSlot] = useState<string>(PICKUP_TIME_SLOTS[1]);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState(defaultAddress);
  const [garmentNotes, setGarmentNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    if (!shop) return;
    const preferred =
      MAP_SERVICE_OPTIONS.find((s) => s.specialtyMatch.includes(rules.serviceType)) ||
      MAP_SERVICE_OPTIONS[0];
    setSelectedServiceId(preferred.id);
    setAppointmentMode('pickup');
    setSelectedDate(dateOptions[shop.place.isOpenNow === false ? 1 : 0].iso);
    setSelectedSlot(PICKUP_TIME_SLOTS[1]);
    setPickupAddress(defaultAddress);
    setGarmentNotes('');
    setFormError(null);
    setConfirmedOrder(null);
  }, [shop, rules.serviceType, defaultAddress, dateOptions]);

  if (!shop) return null;

  const chosenService =
    MAP_SERVICE_OPTIONS.find((s) => s.id === selectedServiceId) || MAP_SERVICE_OPTIONS[0];

  const visitFeeEval = evaluateHomeVisitFee(chosenService.price, rules);
  const payableVisitFee = appointmentMode === 'pickup' ? visitFeeEval.payableVisitFee : 0;
  const estimatedTotal = chosenService.price + payableVisitFee;

  const hasLiveRoute = routeSummary && routeSummary.shopId === shop.place.id;

  const formattedDate = (() => {
    const found = dateOptions.find((d) => d.iso === selectedDate);
    if (found) return `${found.dayLabel}, ${found.dateLabel}`;
    const parsed = new Date(`${selectedDate}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? selectedDate
      : parsed.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  })();

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setFormError('Please enter your full name to confirm the appointment.');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (appointmentMode === 'pickup' && !pickupAddress.trim()) {
      setFormError('Please provide your flat/house address for doorstep pickup.');
      return;
    }

    const orderNum = Math.floor(2000 + Math.random() * 7900);
    const deliveryDate = new Date(`${selectedDate}T00:00:00`);
    const daysToAdd = chosenService.category === 'alteration' ? 2 : 5;
    if (!Number.isNaN(deliveryDate.getTime())) {
      deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);
    }
    const deliveryDateStr = Number.isNaN(deliveryDate.getTime())
      ? chosenService.turnaround
      : deliveryDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

    const routeNote = hasLiveRoute
      ? `${(routeSummary.distanceMeters / 1000).toFixed(2)} km road route`
      : `${shop.distanceKm.toFixed(2)} km away`;

    const modeSummary =
      appointmentMode === 'pickup'
        ? `Doorstep Pickup (${rules.maskAddressUntilAccepted ? 'Address masked until shop accepts' : pickupAddress.trim()})`
        : `Direct Shop Appointment at ${shop.place.name}`;

    const newOrder: OrderRecord = {
      id: `TLR-2026-${orderNum}`,
      serviceTitle: chosenService.label,
      type: chosenService.category,
      tailorName: shop.place.name,
      locality,
      createdAt: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      deliveryDate: deliveryDateStr,
      amount: estimatedTotal,
      stage: 'Visit Scheduled',
      itemsSummary: `${chosenService.label} · ${modeSummary} · ${formattedDate} (${selectedSlot}) · ${routeNote}${
        garmentNotes.trim() ? ` · Notes: ${garmentNotes.trim()}` : ''
      }`,
      quoteApproved: false,
    };

    onConfirmOrder(newOrder, shop);
    onNotifyToast(
      `Appointment ${newOrder.id} scheduled with ${shop.place.name} for ${formattedDate}!`,
    );
    setConfirmedOrder(newOrder);
    setFormError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1A103D]/65 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Schedule appointment with ${shop.place.name}`}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-[#EAE0FA] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#1A103D] text-white flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C4B5FD]">
              Live Map Shop Appointment &amp; Pickup Booking
            </p>
            <h2 className="font-serif-accent text-lg sm:text-xl font-bold mt-0.5 truncate">
              {shop.place.name}
            </h2>
            <p className="text-xs text-white/80 mt-0.5 flex flex-wrap items-center gap-x-2 tabular-nums">
              <span className="truncate max-w-[260px]">{shop.place.address}</span>
              <span aria-hidden="true">·</span>
              <span>
                {hasLiveRoute
                  ? `${(routeSummary.distanceMeters / 1000).toFixed(2)} km (~${formatDurationMinutes(routeSummary.durationMillis)})`
                  : `${shop.distanceKm.toFixed(2)} km`}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking modal"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {confirmedOrder ? (
          <div className="p-6 overflow-y-auto space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-[#F4EEFF] text-[#6B21D9] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif-accent text-xl font-bold text-[#1A103D]">
                  Appointment &amp; Booking Confirmed
                </h3>
                <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
                  Your request is confirmed with <strong className="text-[#1A103D]">{shop.place.name}</strong> and
                  synced to your Orders &amp; Partner Portal.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Booking Reference</span>
                <span className="font-bold text-[#1A103D] tabular-nums">{confirmedOrder.id}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Selected Shop</span>
                <span className="font-semibold text-[#1A103D] text-right">{shop.place.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Service</span>
                <span className="font-semibold text-[#1A103D] text-right">
                  {confirmedOrder.serviceTitle}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Appointment Mode</span>
                <span className="font-semibold text-[#6B21D9]">
                  {appointmentMode === 'pickup'
                    ? 'Doorstep Pickup & Measurement'
                    : 'Direct Shop Visit'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Scheduled Slot</span>
                <span className="font-semibold text-[#1A103D] tabular-nums">
                  {formattedDate} · {selectedSlot}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Estimated Delivery</span>
                <span className="font-semibold text-[#1A103D] tabular-nums">
                  {confirmedOrder.deliveryDate}
                </span>
              </div>
              <div className="pt-2.5 border-t border-[#EAE0FA] flex justify-between gap-2">
                <span className="font-semibold text-[#1A103D]">Estimated Total</span>
                <span className="font-bold text-[#1A103D] tabular-nums">
                  ₹{confirmedOrder.amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-[#FBF5E6] border border-[#E8D5A8] p-3.5 flex items-start gap-2.5 text-xs text-[#475569]">
              <ShieldCheck className="w-4 h-4 text-[#A67418] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1A103D]">Quote-Approval Protection Active:</strong> Your
                tailor will submit a final written quotation after measurement. Stitching cannot
                start until you approve it in <strong>Alterations → History</strong>.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {shop.place.googleMapsURI && (
                <a
                  href={shop.place.googleMapsURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-[#CBD5E1] text-xs sm:text-sm font-semibold text-[#1A103D] hover:border-[#6B21D9] hover:text-[#6B21D9] transition-colors"
                >
                  Directions in Maps
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Done &amp; Return to Live Map
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirm} className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Step 1: Service Choice */}
            <div>
              <label
                htmlFor="map-booking-service"
                className="block text-xs font-bold uppercase tracking-wider text-[#1A103D] mb-2"
              >
                1. Select Tailoring Service
              </label>
              <select
                id="map-booking-service"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-sm font-medium text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
              >
                {MAP_SERVICE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} — ₹{opt.price.toLocaleString('en-IN')} ({opt.turnaround})
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#64748B] mt-1.5">{chosenService.description}</p>
            </div>

            {/* Step 2: Doorstep Pickup vs Shop Visit */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-[#1A103D] mb-2">
                2. Choose Appointment Mode
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAppointmentMode('pickup')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    appointmentMode === 'pickup'
                      ? 'border-[#6B21D9] bg-[#F4EEFF]'
                      : 'border-[#EAE0FA] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A103D]">
                      <Truck className="w-4 h-4 text-[#6B21D9]" />
                      Doorstep Pickup
                    </span>
                    {appointmentMode === 'pickup' && <Check className="w-4 h-4 text-[#6B21D9]" />}
                  </div>
                  <p className="text-xs text-[#475569] mt-1">
                    {visitFeeEval.creditedBack
                      ? 'Free doorstep visit (waived on this service).'
                      : `₹${rules.homeVisitFeeInr} visit fee (waived ≥ ₹${rules.minOrderForFreeVisitInr}).`}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAppointmentMode('studio')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    appointmentMode === 'studio'
                      ? 'border-[#6B21D9] bg-[#F4EEFF]'
                      : 'border-[#EAE0FA] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A103D]">
                      <Store className="w-4 h-4 text-[#6B21D9]" />
                      Visit Tailor Shop
                    </span>
                    {appointmentMode === 'studio' && <Check className="w-4 h-4 text-[#6B21D9]" />}
                  </div>
                  <p className="text-xs text-[#475569] mt-1 tabular-nums">
                    Zero visit fee · {shop.distanceKm.toFixed(2)} km from you.
                  </p>
                </button>
              </div>
            </div>

            {/* Step 3: Convenient Date & Time Slot */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1A103D]">
                  3. Select {appointmentMode === 'pickup' ? 'Pickup' : 'Visit'} Date &amp; Time
                </span>
                <label className="text-[11px] font-medium text-[#6B21D9] inline-flex items-center gap-1">
                  <span>Custom date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    min={dateOptions[0].iso}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[11px] text-[#1A103D]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {dateOptions.map((d) => {
                  const active = selectedDate === d.iso;
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => setSelectedDate(d.iso)}
                      className={`py-2 px-1 rounded-lg border text-center transition-colors cursor-pointer ${
                        active
                          ? 'border-[#1A103D] bg-[#1A103D] text-white'
                          : 'border-[#EAE0FA] bg-white text-[#334155] hover:border-[#6B21D9]'
                      }`}
                    >
                      <span className="block text-[11px] font-semibold">{d.dayLabel}</span>
                      <span
                        className={`block text-[11px] tabular-nums mt-0.5 ${
                          active ? 'text-white/80' : 'text-[#64748B]'
                        }`}
                      >
                        {d.dateLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PICKUP_TIME_SLOTS.map((slot) => {
                  const active = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer tabular-nums ${
                        active
                          ? 'border-[#6B21D9] bg-[#F4EEFF] text-[#6B21D9]'
                          : 'border-[#EAE0FA] text-[#334155] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Customer Details & Address Privacy */}
            <div className="space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#1A103D]">
                4. Customer &amp; Pickup Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                  />
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit Mobile Number"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                  />
                </div>
              </div>

              {appointmentMode === 'pickup' && (
                <div className="space-y-1.5">
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder={`Flat / Villa No., Street (${locality})`}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                    />
                  </div>
                  {rules.maskAddressUntilAccepted && (
                    <p className="text-[11px] text-[#6B21D9] inline-flex items-center gap-1.5">
                      <Lock className="w-3 h-3 shrink-0" />
                      Privacy protection: exact flat/street is revealed only after shop confirms.
                    </p>
                  )}
                </div>
              )}

              <div className="relative">
                <Scissors className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <textarea
                  rows={2}
                  value={garmentNotes}
                  onChange={(e) => setGarmentNotes(e.target.value)}
                  placeholder="Optional garment instructions (e.g., 2 silk blouses + 1 trouser hem, bring lining swatch)..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#CBD5E1] text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9] resize-none"
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {formError}
              </p>
            )}

            {/* Estimate Breakdown & Confirm Button */}
            <div className="pt-3 border-t border-[#EAE0FA] space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <span className="font-semibold text-[#1A103D] block">
                    Estimated Total{' '}
                    {appointmentMode === 'pickup' && (
                      <span className="font-normal text-[#6B21D9]">
                        ({payableVisitFee === 0 ? 'Free Pickup' : `incl. ₹${payableVisitFee} visit fee`})
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-[#64748B]">
                    {formattedDate} · {selectedSlot} · Pay after quote approval
                  </span>
                </div>
                <span className="text-lg font-bold text-[#1A103D] tabular-nums">
                  ₹{estimatedTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Confirm {appointmentMode === 'pickup' ? 'Doorstep Pickup & Booking' : 'Shop Appointment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

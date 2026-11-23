import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
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
} from 'lucide-react';
import { OrderRecord } from '../types';
import {
  EvaluatedTailorShop,
  MatchingRulesConfig,
  ServiceSpecialtyRule,
  evaluateHomeVisitFee,
} from '../utils/matchingRules';
import { SafeImage } from './SafeImage';
import { MapRouteSummary, getShopFallbackImage } from './MapShopModals';

export type MapBookingStep = 1 | 2 | 3 | 4; // 1: Select Shop, 2: Choose Service, 3: Schedule, 4: Confirmed

interface MapServiceItem {
  id: string;
  label: string;
  category: 'alteration' | 'custom' | 'uniform';
  price: number;
  turnaround: string;
  description: string;
  specialtyMatch: ServiceSpecialtyRule[];
}

export const MAP_FLOW_SERVICES: MapServiceItem[] = [
  {
    id: 'mf-blouse',
    label: 'Designer / Maggam Blouse Stitching',
    category: 'custom',
    price: 1299,
    turnaround: '4–5 days',
    description: 'Custom lining, neckline shaping, padded cups option & doorstep trial.',
    specialtyMatch: ['all', 'blouse-maggam'],
  },
  {
    id: 'mf-alteration',
    label: 'Express Garment Alteration Bundle',
    category: 'alteration',
    price: 349,
    turnaround: '24–48 hrs',
    description: 'Waist fitting, original-hem shortening, zip replacement or tapering.',
    specialtyMatch: ['all', 'alterations'],
  },
  {
    id: 'mf-menswear',
    label: "Men's Bespoke Suit / Kurta Tailoring",
    category: 'custom',
    price: 2499,
    turnaround: '5–6 days',
    description: 'Custom-drafted suit jacket, blazer, wedding sherwani or formal trouser.',
    specialtyMatch: ['all', 'mens-tailoring'],
  },
  {
    id: 'mf-saree',
    label: 'Saree Fall, Pico & 1-Minute Pre-Pleating',
    category: 'alteration',
    price: 799,
    turnaround: '48 hrs',
    description: 'Color-matched fall, fine edge pico & compact travel-ready box pleats.',
    specialtyMatch: ['all', 'blouse-maggam', 'alterations'],
  },
  {
    id: 'mf-kurti',
    label: 'Custom Kurti & Palazzo / Salwar Set',
    category: 'custom',
    price: 1190,
    turnaround: '3–4 days',
    description: 'Breathable cotton-lined ethnic set with pocketed palazzo or salwar.',
    specialtyMatch: ['all', 'blouse-maggam'],
  },
  {
    id: 'mf-uniform',
    label: 'School, Clinic or Corporate Uniform Set',
    category: 'uniform',
    price: 999,
    turnaround: '4–5 days',
    description: 'Reinforced uniform stitching with multi-size grading for teams.',
    specialtyMatch: ['all', 'uniforms'],
  },
];

const TIME_SLOTS = [
  '09:30 AM – 11:30 AM',
  '12:00 PM – 02:00 PM',
  '03:00 PM – 05:00 PM',
  '05:30 PM – 07:30 PM',
];

function formatEta(durationMillis: number): string {
  const mins = Math.max(1, Math.round(durationMillis / 60000));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function buildNextFiveDays(): { iso: string; dayLabel: string; dateLabel: string }[] {
  const list: { iso: string; dayLabel: string; dateLabel: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    list.push({
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
  return list;
}

interface MapBookingFlowPanelProps {
  step: MapBookingStep;
  selectedShop: EvaluatedTailorShop | null;
  routeSummary: MapRouteSummary | null;
  locality: string;
  rules: MatchingRulesConfig;
  defaultAddress: string;
  onChangeStep: (step: MapBookingStep) => void;
  onInspectShop: (shop: EvaluatedTailorShop) => void;
  onConfirmOrder: (order: OrderRecord, bookedShop: EvaluatedTailorShop) => void;
  onNotifyToast: (msg: string) => void;
  onResetFlow: () => void;
}

export const MapBookingFlowPanel: React.FC<MapBookingFlowPanelProps> = ({
  step,
  selectedShop,
  routeSummary,
  locality,
  rules,
  defaultAddress,
  onChangeStep,
  onInspectShop,
  onConfirmOrder,
  onNotifyToast,
  onResetFlow,
}) => {
  const dateOptions = useMemo(() => buildNextFiveDays(), []);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(MAP_FLOW_SERVICES[0].id);
  const [appointmentMode, setAppointmentMode] = useState<'pickup' | 'studio'>('pickup');
  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[0].iso);
  const [selectedSlot, setSelectedSlot] = useState<string>(TIME_SLOTS[1]);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState(defaultAddress);
  const [garmentNotes, setGarmentNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  // Sync preferred service whenever selectedShop or active specialty rule changes
  useEffect(() => {
    const match =
      MAP_FLOW_SERVICES.find((s) => s.specialtyMatch.includes(rules.serviceType)) ||
      MAP_FLOW_SERVICES[0];
    setSelectedServiceId(match.id);
  }, [rules.serviceType]);

  useEffect(() => {
    if (selectedShop) {
      setSelectedDate(dateOptions[selectedShop.place.isOpenNow === false ? 1 : 0].iso);
      setFormError(null);
      if (step !== 4) setConfirmedOrder(null);
    }
  }, [selectedShop?.place.id, dateOptions]);

  useEffect(() => {
    setPickupAddress(defaultAddress);
  }, [defaultAddress]);

  if (!selectedShop) return null;

  const chosenService =
    MAP_FLOW_SERVICES.find((s) => s.id === selectedServiceId) || MAP_FLOW_SERVICES[0];
  const visitFeeEval = evaluateHomeVisitFee(chosenService.price, rules);
  const payableVisitFee = appointmentMode === 'pickup' ? visitFeeEval.payableVisitFee : 0;
  const estimatedTotal = chosenService.price + payableVisitFee;
  const hasLiveRoute = routeSummary && routeSummary.shopId === selectedShop.place.id;

  const formattedDate = (() => {
    const found = dateOptions.find((d) => d.iso === selectedDate);
    if (found) return `${found.dayLabel}, ${found.dateLabel}`;
    const parsed = new Date(`${selectedDate}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? selectedDate
      : parsed.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  })();

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (appointmentMode === 'pickup' && !pickupAddress.trim()) {
      setFormError('Please enter your flat/house address for doorstep pickup.');
      return;
    }

    const orderNum = Math.floor(2100 + Math.random() * 7800);
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
      : `${selectedShop.distanceKm.toFixed(2)} km away`;

    const modeSummary =
      appointmentMode === 'pickup'
        ? `Doorstep Pickup (${rules.maskAddressUntilAccepted ? 'Address masked until accepted' : pickupAddress.trim()})`
        : `Direct Shop Appointment at ${selectedShop.place.name}`;

    const newOrder: OrderRecord = {
      id: `TLR-2026-${orderNum}`,
      serviceTitle: chosenService.label,
      type: chosenService.category,
      tailorName: selectedShop.place.name,
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

    onConfirmOrder(newOrder, selectedShop);
    onNotifyToast(
      `Appointment ${newOrder.id} confirmed with ${selectedShop.place.name} for ${formattedDate}!`,
    );
    setConfirmedOrder(newOrder);
    setFormError(null);
    onChangeStep(4);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Selected Shop Mini Header (Anchored above Steps 2, 3, 4) */}
      <div className="px-4 py-3 bg-[#1A103D] text-white flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 shrink-0 border border-white/15">
          <SafeImage
            src={selectedShop.place.photoUri || getShopFallbackImage(selectedShop.place.id)}
            alt={selectedShop.place.name}
            className="w-full h-full object-cover object-center"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] text-[#C4B5FD] font-semibold tabular-nums">
            <span>
              {selectedShop.rank !== null ? `#${selectedShop.rank} Match` : 'Selected Shop'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {hasLiveRoute
                ? `${(routeSummary.distanceMeters / 1000).toFixed(2)} km (~${formatEta(routeSummary.durationMillis)})`
                : `${selectedShop.distanceKm.toFixed(2)} km`}
            </span>
          </div>
          <h3 className="font-serif-accent text-sm sm:text-base font-bold text-white truncate">
            {selectedShop.place.name}
          </h3>
          <div className="flex items-center gap-2 text-[11px] text-white/75 tabular-nums">
            {selectedShop.place.rating !== null && (
              <span className="inline-flex items-center gap-0.5 text-white font-semibold">
                <Star className="w-3 h-3 fill-[#E2B14B] text-[#E2B14B]" />
                {selectedShop.place.rating.toFixed(1)}
              </span>
            )}
            <span className="truncate">{selectedShop.place.address}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onInspectShop(selectedShop)}
          aria-label="Inspect shop details and hours"
          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white inline-flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Info
        </button>
      </div>

      {/* Animated Step Body */}
      <div className="p-4 max-h-[580px] overflow-y-auto flex-1">
        <AnimatePresence mode="wait">
          {/* STEP 2: CHOOSE SERVICE & APPOINTMENT MODE */}
          {step === 2 && (
            <motion.div
              key="step-2-service"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#1A103D]">
                    Step 2 · Choose Tailoring Service
                  </h4>
                  <p className="text-xs text-[#64748B]">
                    Select your service &amp; preferred pickup or studio visit mode.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeStep(1)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B21D9] hover:text-[#5B21B6] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change Shop
                </button>
              </div>

              {/* Service Cards List */}
              <div className="space-y-2">
                {MAP_FLOW_SERVICES.map((srv) => {
                  const active = selectedServiceId === srv.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setSelectedServiceId(srv.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        active
                          ? 'border-[#6B21D9] bg-[#F4EEFF] shadow-2xs'
                          : 'border-[#EAE0FA] bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                active
                                  ? 'border-[#6B21D9] bg-[#6B21D9] text-white'
                                  : 'border-[#CBD5E1]'
                              }`}
                            >
                              {active && <Check className="w-2.5 h-2.5" />}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-[#1A103D] truncate">
                              {srv.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-1 pl-5.5 leading-snug">
                            {srv.description}
                          </p>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          <span className="block text-sm font-bold text-[#1A103D]">
                            ₹{srv.price.toLocaleString('en-IN')}
                          </span>
                          <span className="block text-[10.5px] text-[#64748B]">
                            {srv.turnaround}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Service Mode Toggle */}
              <div className="pt-2 border-t border-[#EAE0FA] space-y-2">
                <span className="block text-xs font-bold text-[#1A103D]">Appointment Mode</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAppointmentMode('pickup')}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      appointmentMode === 'pickup'
                        ? 'border-[#6B21D9] bg-[#F4EEFF]'
                        : 'border-[#EAE0FA] bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A103D]">
                      <Truck className="w-3.5 h-3.5 text-[#6B21D9]" />
                      Doorstep Pickup
                    </span>
                    <span className="block text-[11px] text-[#475569] mt-0.5">
                      {visitFeeEval.creditedBack
                        ? 'Free (waived)'
                        : `₹${rules.homeVisitFeeInr} visit fee`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppointmentMode('studio')}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      appointmentMode === 'studio'
                        ? 'border-[#6B21D9] bg-[#F4EEFF]'
                        : 'border-[#EAE0FA] bg-white hover:border-[#CBD5E1]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A103D]">
                      <Store className="w-3.5 h-3.5 text-[#6B21D9]" />
                      Visit Tailor Shop
                    </span>
                    <span className="block text-[11px] text-[#475569] mt-0.5 tabular-nums">
                      Zero fee · {selectedShop.distanceKm.toFixed(1)} km
                    </span>
                  </button>
                </div>
              </div>

              {/* Step 2 Footer CTA */}
              <div className="pt-3 border-t border-[#EAE0FA] flex items-center justify-between gap-3">
                <div className="tabular-nums">
                  <span className="block text-[11px] text-[#64748B]">Estimated Total</span>
                  <span className="text-base font-bold text-[#1A103D]">
                    ₹{estimatedTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeStep(3)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Schedule Appointment
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: SCHEDULE APPOINTMENT & CONFIRM */}
          {step === 3 && (
            <motion.form
              key="step-3-schedule"
              onSubmit={handleSubmitBooking}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#1A103D]">
                    Step 3 · Schedule Date &amp; Time
                  </h4>
                  <p className="text-xs text-[#64748B]">
                    {chosenService.label} ·{' '}
                    {appointmentMode === 'pickup' ? 'Doorstep Pickup' : 'Shop Visit'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeStep(2)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B21D9] hover:text-[#5B21B6] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Edit Service
                </button>
              </div>

              {/* Date Picker Strip */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1A103D]">
                    Select {appointmentMode === 'pickup' ? 'Pickup' : 'Appointment'} Date
                  </span>
                  <label className="text-[11px] font-medium text-[#6B21D9] inline-flex items-center gap-1">
                    <span>Other:</span>
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
                          className={`block text-[10.5px] tabular-nums mt-0.5 ${
                            active ? 'text-white/80' : 'text-[#64748B]'
                          }`}
                        >
                          {d.dateLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-[#1A103D]">Preferred Time Window</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {TIME_SLOTS.map((slot) => {
                    const active = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-2.5 py-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer tabular-nums ${
                          active
                            ? 'border-[#6B21D9] bg-[#F4EEFF] text-[#6B21D9]'
                            : 'border-[#EAE0FA] text-[#334155] hover:border-[#CBD5E1]'
                        }`}
                      >
                        <Clock className="w-3 h-3 shrink-0" />
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact & Pickup Address */}
              <div className="space-y-2.5">
                <span className="block text-xs font-bold text-[#1A103D]">Your Contact Details</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#CBD5E1] text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit Mobile"
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#CBD5E1] text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                    />
                  </div>
                </div>

                {appointmentMode === 'pickup' && (
                  <div className="space-y-1">
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        placeholder={`Flat / House No., Street (${locality})`}
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#CBD5E1] text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                      />
                    </div>
                    {rules.maskAddressUntilAccepted && (
                      <p className="text-[11px] text-[#6B21D9] inline-flex items-center gap-1">
                        <Lock className="w-3 h-3 shrink-0" />
                        Exact flat/street stays hidden until {selectedShop.place.name} accepts.
                      </p>
                    )}
                  </div>
                )}

                <div className="relative">
                  <Scissors className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
                  <textarea
                    rows={2}
                    value={garmentNotes}
                    onChange={(e) => setGarmentNotes(e.target.value)}
                    placeholder="Optional garment notes (fabric type, lining, urgent trial date)..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#1A103D] focus:outline-none focus:border-[#6B21D9] resize-none"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {formError}
                </p>
              )}

              {/* Confirm CTA */}
              <div className="pt-3 border-t border-[#EAE0FA] space-y-2.5">
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <span className="text-[#475569]">
                    {formattedDate} · {selectedSlot}
                  </span>
                  <span className="text-base font-bold text-[#1A103D]">
                    ₹{estimatedTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Confirm {appointmentMode === 'pickup' ? 'Pickup & Appointment' : 'Shop Booking'}
                </button>
              </div>
            </motion.form>
          )}

          {/* STEP 4: INSTANT BOOKING CONFIRMED RECEIPT */}
          {step === 4 && confirmedOrder && (
            <motion.div
              key="step-4-confirmed"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#F4EEFF] text-[#6B21D9] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif-accent text-lg font-bold text-[#1A103D]">
                    Appointment Confirmed
                  </h4>
                  <p className="text-xs text-[#475569] mt-0.5">
                    Booked directly with <strong className="text-[#1A103D]">{selectedShop.place.name}</strong>{' '}
                    and synced to your Orders &amp; Partner Portal.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] p-3.5 space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-[#64748B]">Booking ID</span>
                  <span className="font-bold text-[#1A103D] tabular-nums">{confirmedOrder.id}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#64748B]">Service</span>
                  <span className="font-semibold text-[#1A103D] text-right">
                    {confirmedOrder.serviceTitle}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#64748B]">Mode</span>
                  <span className="font-semibold text-[#6B21D9]">
                    {appointmentMode === 'pickup' ? 'Doorstep Pickup' : 'Visit Tailor Shop'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#64748B]">Scheduled Slot</span>
                  <span className="font-semibold text-[#1A103D] tabular-nums">
                    {formattedDate} · {selectedSlot}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#64748B]">Est. Delivery</span>
                  <span className="font-semibold text-[#1A103D] tabular-nums">
                    {confirmedOrder.deliveryDate}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#EAE0FA] flex justify-between gap-2">
                  <span className="font-semibold text-[#1A103D]">Estimated Total</span>
                  <span className="font-bold text-[#1A103D] tabular-nums">
                    ₹{confirmedOrder.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-[#FBF5E6] border border-[#E8D5A8] p-3 flex items-start gap-2 text-[11px] text-[#475569]">
                <ShieldCheck className="w-4 h-4 text-[#A67418] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#1A103D]">Quote Approval Active:</strong> Stitching
                  starts only after you review &amp; approve the final written quote in{' '}
                  <strong>Alterations → History</strong>.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedShop.place.googleMapsURI && (
                  <a
                    href={selectedShop.place.googleMapsURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#1A103D] hover:border-[#6B21D9] hover:text-[#6B21D9] transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Directions
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={onResetFlow}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                  Book Another Tailor
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

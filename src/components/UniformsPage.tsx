import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Link2,
  MapPin,
  Phone,
  Ruler,
  Scissors,
  Shield,
  Shirt,
  Sparkles,
  Upload,
  User,
  Users,
  Stethoscope,
  GraduationCap,
  ChefHat,
} from 'lucide-react';
import { ASSETS } from '../data/catalogData';
import { OrderRecord } from '../types';
import { SafeImage } from './SafeImage';

interface UniformsPageProps {
  locality: string;
  onOpenLocationModal: () => void;
  onSubmitOrder: (order: OrderRecord) => void;
  onNotifyToast: (msg: string) => void;
}

type GenderOption = 'Men' | 'Women' | 'Boys' | 'Girls';

const BASE_PRICES: Record<GenderOption, { label: string; price: number }> = {
  Men: { label: 'MEN UNIFORM', price: 1199 },
  Women: { label: "WOMEN'S UNIFORM", price: 1299 },
  Boys: { label: "BOYS' UNIFORM", price: 899 },
  Girls: { label: "GIRLS' UNIFORM", price: 999 },
};

const TOP_SIZES = ['XS (34)', 'S (36)', 'M (38)', 'L (40)', 'XL (42)', 'XXL (44)', '3XL (46)'];
const BOTTOM_SIZES = ['26', '28', '30', '32', '34', '36', '38', '40', '42'];

export const UniformsPage: React.FC<UniformsPageProps> = ({
  locality,
  onOpenLocationModal,
  onSubmitOrder,
  onNotifyToast,
}) => {
  const [orderMode, setOrderMode] = useState<'single' | 'bulk'>('single');
  const [bulkQty, setBulkQty] = useState(15);
  const [gender, setGender] = useState<GenderOption>('Men');
  const [measureMode, setMeasureMode] = useState<'manual' | 'home'>('manual');
  const [topSize, setTopSize] = useState('');
  const [bottomSize, setBottomSize] = useState('');
  const [designLink, setDesignLink] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const unitPrice = BASE_PRICES[gender].price;
  const effectivePrice =
    orderMode === 'single' ? unitPrice : Math.round(unitPrice * bulkQty * 0.88);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      onNotifyToast(`Reference image "${file.name}" attached!`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !mobile.trim() || !addressDetails.trim()) {
      onNotifyToast('Please fill in Full Name, Mobile Number, and Address Details.');
      return;
    }

    const orderId = `TLR-UNI-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: OrderRecord = {
      id: orderId,
      serviceTitle: `${gender} Uniform (${orderMode === 'bulk' ? `Bulk ${bulkQty} pcs` : 'Single Piece'})`,
      type: 'uniform',
      tailorName: 'Tailering Institutional Tailoring Desk',
      locality,
      createdAt: '21 Nov 2026',
      deliveryDate: targetDate || '28 Nov 2026',
      amount: effectivePrice,
      stage: 'Booking Created',
      itemsSummary: `${orderMode === 'bulk' ? `${bulkQty}x` : '1x'} ${gender} Uniform · ${
        measureMode === 'home'
          ? 'Home Measurement Visit'
          : `Sizes: ${topSize || 'Standard'} / ${bottomSize || 'Standard'}`
      }`,
      quoteApproved: false,
    };

    onSubmitOrder(newOrder);
    setSubmittedRef(orderId);
    onNotifyToast(`Uniform inquiry ${orderId} submitted! Our specialist will call you shortly.`);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 sm:py-10 space-y-10">
      {/* 1. SPLIT HERO */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-center">
        {/* Left Copy */}
        <div className="lg:col-span-5 space-y-3.5">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B7285]">
            <Sparkles className="w-3.5 h-3.5 text-[#C8922A]" />
            INSTITUTIONAL &amp; B2B TAILORING
          </p>

          <h1 className="text-4xl sm:text-5xl font-bold text-[#0B1F3A] leading-[1.08] tracking-tight text-balance font-serif-accent">
            Any Uniform, One Bespoke Solution
          </h1>

          <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-md">
            Precision-tailored uniforms for schools, hospitals, hospitality, and corporate teams —
            crafted by verified Tailering master ateliers.
          </p>
        </div>

        {/* Right Promotional Banner Card */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] bg-[#0B1F3A] text-white shadow-md">
            <div className="grid grid-cols-1 sm:grid-cols-12 items-stretch">
              <div className="sm:col-span-5 p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold leading-tight text-white font-serif-accent">
                    Uniforms That{' '}
                    <span className="text-[#E2B14B]">Represent Your Brand.</span>
                  </h2>
                  <p className="mt-2 text-[11px] text-slate-300 leading-relaxed">
                    Professional. Breathable. Made to exact spec. Single or bulk orders,{' '}
                    <span className="font-bold text-[#5EEAD4]">we tailor it all.</span>
                  </p>

                  {/* Mini Category Icons */}
                  <div className="mt-4 grid grid-cols-5 gap-1.5 text-center">
                    {[
                      { label: 'School', Icon: GraduationCap },
                      { label: 'Nurse', Icon: Stethoscope },
                      { label: 'Police', Icon: Shield },
                      { label: 'Security', Icon: Shield },
                      { label: 'Chef', Icon: ChefHat },
                    ].map((cat) => (
                      <div key={cat.label} className="flex flex-col items-center">
                        <span className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 text-[#5EEAD4] flex items-center justify-center">
                          <cat.Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[8.5px] font-bold text-slate-300 mt-1 uppercase">
                          {cat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <a
                  href="#uniform-configurator"
                  className="mt-5 inline-flex items-center justify-center gap-1.5 bg-[#0B7285] hover:bg-[#085463] text-white text-[11px] font-bold px-4 py-2 rounded-xl transition-colors w-fit"
                >
                  GET UNIFORMS
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="sm:col-span-7 relative min-h-[210px]">
                <SafeImage
                  src={ASSETS.bannerUniforms}
                  alt="Tailering institutional uniforms for school, nurse, police, security, and chef"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>

            <div className="bg-[#08172B] border-t border-white/10 px-5 py-2.5 grid grid-cols-3 gap-2 text-center">
              <div className="text-[10px] sm:text-[11px] font-bold text-white">
                SINGLE ORDERS{' '}
                <span className="hidden sm:inline font-normal text-slate-300">· No Minimum</span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-[#E2B14B]">
                BULK ORDERS{' '}
                <span className="hidden sm:inline font-normal text-slate-300">· Teams &amp; Brands</span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-[#5EEAD4]">
                DOORSTEP SERVICE{' '}
                <span className="hidden sm:inline font-normal text-slate-300">· Across Hyderabad</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STARTING BASE PRICES */}
      <section className="space-y-4">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B7285]">
            TRANSPARENT STARTING BASE PRICES
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {(Object.keys(BASE_PRICES) as GenderOption[]).map((key) => {
            const item = BASE_PRICES[key];
            const selected = gender === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setGender(key)}
                className={`rounded-2xl p-5 text-center transition-all cursor-pointer border ${
                  selected
                    ? 'bg-[#F0F9FA] border-[#0B7285] shadow-sm ring-1 ring-[#0B7285]/20'
                    : 'bg-white border-[#E2E8F0] hover:border-[#0B7285]/45'
                }`}
              >
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                  {item.label}
                </p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] tabular-nums">
                  ₹{item.price}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[#0B7285]">
                  BASE PRICE
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. CONFIGURE YOUR ORDER */}
      <section id="uniform-configurator" className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0B1F3A] font-serif-accent">
            Configure Your Order
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Select custom individual stitching or bulk institutional requirements.
          </p>

          <div className="mt-4 inline-flex items-center bg-[#F1F5F9] border border-[#E2E8F0] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setOrderMode('single')}
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                orderMode === 'single'
                  ? 'bg-[#0B1F3A] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#0B1F3A]'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              Single Piece
            </button>
            <button
              type="button"
              onClick={() => setOrderMode('bulk')}
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                orderMode === 'bulk'
                  ? 'bg-[#0B1F3A] text-white shadow-2xs'
                  : 'text-[#475569] hover:text-[#0B1F3A]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Bulk Order (10+)
            </button>
          </div>
        </div>

        {submittedRef ? (
          <div className="bg-white rounded-2xl border border-[#A7F3D0] p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] text-[#059669] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#0B1F3A] font-serif-accent">
              Uniform Inquiry Confirmed ({submittedRef})
            </h3>
            <p className="text-sm text-[#475569] max-w-md mx-auto">
              Thank you, <strong className="text-[#0B1F3A]">{fullName}</strong>! Our Tailering
              uniform coordinator in <strong className="text-[#0B1F3A]">{locality}</strong> will
              contact you on <strong className="text-[#0B1F3A]">+91 {mobile}</strong> with fabric
              swatches and final confirmation.
            </p>
            <div className="inline-flex items-center gap-2 bg-[#F0F9FA] border border-[#CBE7EC] text-[#0B7285] px-4 py-2 rounded-xl text-sm font-extrabold tabular-nums">
              Estimated Quote: ₹{effectivePrice.toLocaleString('en-IN')}
            </div>
            <div>
              <button
                type="button"
                onClick={() => setSubmittedRef(null)}
                className="mt-2 bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Configure Another Uniform Order
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* STEP 1 */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#0B7285] text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F3A]">Who is this for?</h3>
                  <p className="text-[11px] text-[#64748B]">
                    Select the gender category for this uniform
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['Men', 'Women', 'Boys', 'Girls'] as GenderOption[]).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setGender(opt)}
                    className={`py-3 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                      gender === opt
                        ? 'bg-[#F0F9FA] border-[#0B7285] text-[#0B7285]'
                        : 'bg-white border-[#CBD5E1] text-[#334155] hover:border-[#0B7285]/50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {orderMode === 'bulk' && (
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 bg-[#FBF5E6] border border-[#F0DFA8] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-[#0B1F3A]">
                      Bulk Quantity (12% Institutional Discount Applied)
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Minimum 10 sets for schools, clinics, offices &amp; hotels
                    </p>
                  </div>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={bulkQty}
                    onChange={(e) => setBulkQty(Math.max(10, Number(e.target.value) || 10))}
                    className="w-24 bg-white border border-[#C8922A] rounded-lg px-3 py-1.5 text-sm font-extrabold text-[#0B1F3A] text-center tabular-nums focus:outline-none focus:border-[#0B7285]"
                  />
                </div>
              )}
            </div>

            {/* STEP 2 */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#0B7285] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F3A]">Measurements &amp; Style</h3>
                  <p className="text-[11px] text-[#64748B]">
                    How would you like to provide measurements?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setMeasureMode('manual')}
                  className={`p-4 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                    measureMode === 'manual'
                      ? 'bg-[#F0F9FA] border-[#0B7285]'
                      : 'bg-white border-[#E2E8F0] hover:border-[#0B7285]/45'
                  }`}
                >
                  <span className="w-10 h-10 rounded-xl bg-[#F0F9FA] border border-[#CBE7EC] text-[#0B7285] flex items-center justify-center shrink-0">
                    <Ruler className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#0B1F3A]">Manual Sizes</p>
                    <p className="text-[11px] text-[#64748B]">Select standard sizes</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMeasureMode('home')}
                  className={`p-4 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                    measureMode === 'home'
                      ? 'bg-[#F0F9FA] border-[#0B7285]'
                      : 'bg-white border-[#E2E8F0] hover:border-[#0B7285]/45'
                  }`}
                >
                  <span className="w-10 h-10 rounded-xl bg-[#F1F5F9] text-[#0B1F3A] flex items-center justify-center shrink-0">
                    <Scissors className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#0B1F3A]">Home Measurement</p>
                    <p className="text-[11px] text-[#64748B]">We visit you for precision sizing</p>
                  </div>
                </button>
              </div>

              {measureMode === 'manual' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                      TOP SIZE
                    </label>
                    <select
                      value={topSize}
                      onChange={(e) => setTopSize(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                    >
                      <option value="">Select Top Size</option>
                      {TOP_SIZES.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                      BOTTOM SIZE
                    </label>
                    <select
                      value={bottomSize}
                      onChange={(e) => setBottomSize(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                    >
                      <option value="">Select Bottom Size</option>
                      {BOTTOM_SIZES.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz} inches
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                    REFERENCE IMAGE
                  </label>
                  <label className="flex flex-col items-center justify-center h-[116px] rounded-xl border-2 border-dashed border-[#CBD5E1] hover:border-[#0B7285] bg-[#F8FAFC] cursor-pointer transition-colors px-4 text-center">
                    <Upload className="w-5 h-5 text-[#0B7285] mb-1.5" />
                    <span className="text-xs font-bold text-[#334155]">
                      {uploadedFileName || 'Upload Image'}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] mt-0.5">Max size 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                      OR DESIGN LINK
                    </label>
                    <div className="relative">
                      <Link2 className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={designLink}
                        onChange={(e) => setDesignLink(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                      ADDITIONAL NOTES
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Logo embroidery, fabric GSM, pocket style..."
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#0B7285] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F3A]">Contact &amp; Delivery</h3>
                  <p className="text-[11px] text-[#64748B]">
                    We&apos;ll reach you with the quote and updates
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                    FULL NAME *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                    MOBILE NUMBER *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                  SERVICE LOCATION *
                </label>
                <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5">
                  <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0B1F3A] truncate">
                    <MapPin className="w-4 h-4 text-[#0B7285] shrink-0" />
                    {locality}
                  </span>
                  <button
                    type="button"
                    onClick={onOpenLocationModal}
                    className="text-[11px] font-bold text-[#0B7285] hover:underline uppercase shrink-0 ml-2 cursor-pointer"
                  >
                    CHANGE
                  </button>
                </div>
              </div>

              <div>
                <textarea
                  rows={2}
                  required
                  value={addressDetails}
                  onChange={(e) => setAddressDetails(e.target.value)}
                  placeholder="Flat / House / Institution Name & Street Details *"
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                />
              </div>

              <div className="max-w-xs">
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                  TARGET DATE *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                  />
                </div>
              </div>
            </div>

            {/* BOTTOM ESTIMATE & SUBMIT BAR */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  BASE PRICE ESTIMATE
                </p>
                <p className="text-2xl font-extrabold text-[#0B1F3A] tabular-nums">
                  ₹{effectivePrice.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-[#64748B] italic">
                  Free consultation · Fast delivery · Transparent final quote
                </p>
              </div>

              <button
                type="submit"
                className="bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs sm:text-sm font-bold uppercase tracking-wider px-8 py-3.5 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                SUBMIT INQUIRY
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

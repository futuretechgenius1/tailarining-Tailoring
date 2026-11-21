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

    const orderId = `SM-UNI-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: OrderRecord = {
      id: orderId,
      serviceTitle: `${gender} Uniform (${orderMode === 'bulk' ? `Bulk ${bulkQty} pcs` : 'Single Piece'})`,
      type: 'uniform',
      tailorName: 'StitchMate Institutional Tailoring Desk',
      locality,
      createdAt: '21 Nov 2026',
      deliveryDate: targetDate || '28 Nov 2026',
      amount: effectivePrice,
      stage: 'Booking Created',
      itemsSummary: `${orderMode === 'bulk' ? `${bulkQty}x` : '1x'} ${gender} Uniform · ${
        measureMode === 'home' ? 'Home Measurement Visit' : `Sizes: ${topSize || 'Standard'} / ${bottomSize || 'Standard'}`
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
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-[#EA580C] bg-[#FFF7ED] border border-[#FED7AA] px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            PREMIUM INSTITUTIONAL TAILORING
          </span>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1C1917] leading-[1.08] tracking-tight text-balance">
            Any Uniform One Solution
          </h1>

          <p className="text-sm sm:text-base text-[#57534E] leading-relaxed max-w-md">
            Premium tailored uniforms with precise measurements for every age and gender — crafted
            by verified StitchMate master tailors.
          </p>
        </div>

        {/* Right Promotional Banner Card (Matching Screenshot 3) */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl overflow-hidden border border-[#F2E2D4] bg-gradient-to-br from-[#FFF9F2] via-[#FFF4E8] to-[#FDE8D7] shadow-md">
            <div className="grid grid-cols-1 sm:grid-cols-12 items-stretch">
              {/* Banner Left Copy */}
              <div className="sm:col-span-5 p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold leading-tight text-[#1C1917]">
                    Uniforms That{' '}
                    <span className="text-[#E11D48]">Represent Your Brand.</span>
                  </h2>
                  <p className="mt-2 text-[11px] text-[#57534E] leading-relaxed">
                    Professional. Comfortable. Made for you. Single or bulk orders,{' '}
                    <span className="font-bold text-[#E11D48]">we tailor it all.</span>
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
                        <span className="w-7 h-7 rounded-lg bg-white border border-[#F5DDD0] text-[#EA580C] flex items-center justify-center shadow-2xs">
                          <cat.Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[8.5px] font-bold text-[#57534E] mt-1 uppercase">
                          {cat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <a
                  href="#uniform-configurator"
                  className="mt-4 inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#EA580C] to-[#F97316] text-white text-[11px] font-extrabold px-4 py-2 rounded-full shadow-xs w-fit"
                >
                  GET UNIFORMS
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Banner Right 5-Professionals Photo */}
              <div className="sm:col-span-7 relative min-h-[210px]">
                <SafeImage
                  src={ASSETS.bannerUniforms}
                  alt="StitchMate institutional uniforms for school, nurse, police, security, and chef"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>

            {/* Bottom Crimson/Orange Strip */}
            <div className="bg-gradient-to-r from-[#EA580C] via-[#E11D48] to-[#DB2777] px-5 py-2.5 grid grid-cols-3 gap-2 text-white text-center">
              <div className="text-[10px] sm:text-[11px] font-bold">
                SINGLE ORDERS <span className="hidden sm:inline font-normal opacity-90">· No Minimum</span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold">
                BULK ORDERS <span className="hidden sm:inline font-normal opacity-90">· Teams &amp; Brands</span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold">
                DOORSTEP SERVICE <span className="hidden sm:inline font-normal opacity-90">· Across Hyderabad</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STARTING BASE PRICES */}
      <section className="space-y-4">
        <div className="text-center">
          <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-widest text-[#EA580C] bg-[#FFF7ED] border border-[#FED7AA] px-3.5 py-1 rounded-full">
            ₹ STARTING BASE PRICES
          </span>
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
                    ? 'bg-[#FFF9F2] border-[#EA580C] shadow-sm ring-1 ring-[#EA580C]/20'
                    : 'bg-white border-[#EFE6DC] hover:border-[#FED7AA]'
                }`}
              >
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#78716C]">
                  {item.label}
                </p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-[#EA580C] tabular-nums">
                  ₹{item.price}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[#A8A29E]">
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917]">Configure Your Order</h2>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1">
            Select custom individual stitching or bulk institutional requirements.
          </p>

          {/* Single Piece | Bulk Order Toggle */}
          <div className="mt-4 inline-flex items-center bg-[#F5EFE8] p-1 rounded-full">
            <button
              type="button"
              onClick={() => setOrderMode('single')}
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                orderMode === 'single'
                  ? 'bg-white text-[#EA580C] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              Single Piece
            </button>
            <button
              type="button"
              onClick={() => setOrderMode('bulk')}
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                orderMode === 'bulk'
                  ? 'bg-white text-[#EA580C] shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Bulk Order (10+)
            </button>
          </div>
        </div>

        {submittedRef ? (
          <div className="bg-white rounded-2xl border border-[#BBF7D0] p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-[#ECFDF5] text-[#16A34A] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-[#1C1917]">
              Uniform Inquiry Confirmed ({submittedRef})
            </h3>
            <p className="text-sm text-[#57534E] max-w-md mx-auto">
              Thank you, <strong>{fullName}</strong>! Our StitchMate uniform coordinator in{' '}
              <strong>{locality}</strong> will contact you on <strong>+91 {mobile}</strong> with
              fabric swatches and final confirmation.
            </p>
            <div className="inline-flex items-center gap-2 bg-[#FFF7ED] text-[#EA580C] px-4 py-2 rounded-xl text-sm font-extrabold tabular-nums">
              Estimated Quote: ₹{effectivePrice.toLocaleString('en-IN')}
            </div>
            <div>
              <button
                type="button"
                onClick={() => setSubmittedRef(null)}
                className="mt-2 bg-[#1C1917] text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer"
              >
                Configure Another Uniform Order
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* STEP 1: WHO IS THIS FOR? */}
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#EA580C] text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1C1917]">Who is this for?</h3>
                  <p className="text-[11px] text-[#78716C]">Select the gender category for this uniform</p>
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
                        ? 'bg-[#FFF7ED] border-[#EA580C] text-[#EA580C]'
                        : 'bg-white border-[#E7E5E4] text-[#44403C] hover:border-[#FED7AA]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {orderMode === 'bulk' && (
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 bg-[#FFF9F2] border border-[#F5E6D6] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-[#1C1917]">Bulk Quantity (12% Institutional Discount Applied)</p>
                    <p className="text-[11px] text-[#78716C]">Minimum 10 sets for schools, clinics, offices &amp; hotels</p>
                  </div>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={bulkQty}
                    onChange={(e) => setBulkQty(Math.max(10, Number(e.target.value) || 10))}
                    className="w-24 bg-white border border-[#FED7AA] rounded-lg px-3 py-1.5 text-sm font-extrabold text-[#EA580C] text-center tabular-nums focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
              )}
            </div>

            {/* STEP 2: MEASUREMENTS & STYLE */}
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#EA580C] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1C1917]">Measurements &amp; Style</h3>
                  <p className="text-[11px] text-[#78716C]">How would you like to provide measurements?</p>
                </div>
              </div>

              {/* Manual Sizes vs Home Measurement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setMeasureMode('manual')}
                  className={`p-4 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                    measureMode === 'manual'
                      ? 'bg-[#FFF9F2] border-[#EA580C]'
                      : 'bg-white border-[#E7E5E4] hover:border-[#FED7AA]'
                  }`}
                >
                  <span className="w-10 h-10 rounded-xl bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center shrink-0">
                    <Ruler className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold text-[#1C1917]">Manual Sizes</p>
                    <p className="text-[11px] text-[#78716C]">Select standard sizes</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMeasureMode('home')}
                  className={`p-4 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                    measureMode === 'home'
                      ? 'bg-[#FFF9F2] border-[#EA580C]'
                      : 'bg-white border-[#E7E5E4] hover:border-[#FED7AA]'
                  }`}
                >
                  <span className="w-10 h-10 rounded-xl bg-[#F5F5F4] text-[#57534E] flex items-center justify-center shrink-0">
                    <Scissors className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-extrabold text-[#1C1917]">Home Measurement</p>
                    <p className="text-[11px] text-[#78716C]">We visit you for precision sizing</p>
                  </div>
                </button>
              </div>

              {measureMode === 'manual' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#78716C] mb-1.5">
                      TOP SIZE
                    </label>
                    <select
                      value={topSize}
                      onChange={(e) => setTopSize(e.target.value)}
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
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
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#78716C] mb-1.5">
                      BOTTOM SIZE
                    </label>
                    <select
                      value={bottomSize}
                      onChange={(e) => setBottomSize(e.target.value)}
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
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

              {/* Reference Image & Design Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#78716C] mb-1.5">
                    REFERENCE IMAGE
                  </label>
                  <label className="flex flex-col items-center justify-center h-[116px] rounded-xl border-2 border-dashed border-[#E7DDD2] hover:border-[#EA580C] bg-[#FDFBF9] cursor-pointer transition-colors px-4 text-center">
                    <Upload className="w-5 h-5 text-[#A8A29E] mb-1.5" />
                    <span className="text-xs font-bold text-[#44403C]">
                      {uploadedFileName || 'Upload Image'}
                    </span>
                    <span className="text-[10px] text-[#A8A29E] mt-0.5">Max size 5MB</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#78716C] mb-1.5">
                      OR DESIGN LINK
                    </label>
                    <div className="relative">
                      <Link2 className="w-4 h-4 text-[#A8A29E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={designLink}
                        onChange={(e) => setDesignLink(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-white border border-[#E7E5E4] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#78716C] mb-1.5">
                      ADDITIONAL NOTES
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Logo embroidery, fabric GSM, pocket style..."
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3: CONTACT & DELIVERY */}
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#EA580C] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1C1917]">Contact &amp; Delivery</h3>
                  <p className="text-[11px] text-[#78716C]">We&apos;ll reach you with the quote and updates</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#78716C] mb-1.5">
                    FULL NAME *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#A8A29E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#78716C] mb-1.5">
                    MOBILE NUMBER *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#A8A29E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile"
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#78716C] mb-1.5">
                  SERVICE LOCATION *
                </label>
                <div className="flex items-center justify-between bg-[#FFF9F2] border border-[#F3E5D8] rounded-xl px-4 py-2.5">
                  <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1C1917] truncate">
                    <MapPin className="w-4 h-4 text-[#EA580C] shrink-0" />
                    {locality}
                  </span>
                  <button
                    type="button"
                    onClick={onOpenLocationModal}
                    className="text-[11px] font-extrabold text-[#EA580C] hover:underline uppercase shrink-0 ml-2 cursor-pointer"
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
                  className="w-full bg-white border border-[#E7E5E4] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
                />
              </div>

              <div className="max-w-xs">
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#78716C] mb-1.5">
                  TARGET DATE *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#A8A29E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-white border border-[#E7E5E4] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
              </div>
            </div>

            {/* BOTTOM ESTIMATE & SUBMIT BAR */}
            <div className="bg-white rounded-2xl border border-[#EFE6DC] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
                  BASE PRICE ESTIMATE
                </p>
                <p className="text-2xl font-extrabold text-[#1C1917] tabular-nums">
                  ₹{effectivePrice.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-[#78716C] italic">
                  Free consultation · Fast delivery · Transparent final quote
                </p>
              </div>

              <button
                type="submit"
                className="bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider px-8 py-3.5 rounded-full shadow-md shadow-[#EA580C]/20 transition-all cursor-pointer"
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

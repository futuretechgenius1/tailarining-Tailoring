import React, { useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  Diamond,
  Home,
  Layers,
  Lock,
  MapPin,
  Play,
  Plus,
  Ruler,
  Scissors,
  ShieldCheck,
  Trash2,
  User,
  Video,
  X,
} from 'lucide-react';
import { MeasurementProfile, PageRoute, StorefrontMediaMap } from '../types';
import { SafeImage } from './SafeImage';

interface MeasurementsPageProps {
  profiles: MeasurementProfile[];
  media: StorefrontMediaMap;
  onAddProfile: (profile: MeasurementProfile) => void;
  onDeleteProfile: (id: string) => void;
  onToggleConsent: (id: string) => void;
  onNavigate: (page: PageRoute) => void;
  onOpenSupport?: () => void;
  onNotifyToast: (msg: string) => void;
}

const GUIDE_STEPS = [
  {
    step: '01',
    title: 'Chest / Bust',
    tip: 'Wrap the tape level around the fullest part of your chest/bust while breathing normally. Keep two fingers slack for comfort.',
    typical: '34" – 42"',
  },
  {
    step: '02',
    title: 'Natural Waist',
    tip: 'Measure around the narrowest part of your torso just above the navel without pulling the tape tight.',
    typical: '28" – 36"',
  },
  {
    step: '03',
    title: 'Shoulder Width',
    tip: 'Measure straight across the upper back from the outer bony edge of the left shoulder to the right shoulder.',
    typical: '14" – 18"',
  },
  {
    step: '04',
    title: 'Garment Length',
    tip: 'Start at the highest point of the shoulder beside the neck and drop straight down to your desired blouse, kurti, or shirt hem.',
    typical: '14.5" (Blouse) / 42" (Kurti)',
  },
];

export const MeasurementsPage: React.FC<MeasurementsPageProps> = ({
  profiles,
  media,
  onAddProfile,
  onDeleteProfile,
  onToggleConsent,
  onNavigate,
  onOpenSupport,
  onNotifyToast,
}) => {
  const heroFittingImg =
    media.measurementsHeroFitting ||
    '/src/assets/images/measurements_hero_fitting_1795431557418.jpg';
  const guideChestImg =
    media.measurementsGuideChest ||
    '/src/assets/images/measurements_guide_chest_1795431555263.jpg';

  const [showAddForm, setShowAddForm] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [garmentType, setGarmentType] = useState<MeasurementProfile['garmentType']>('Blouse');
  const [chestBust, setChestBust] = useState('36.0 in');
  const [waist, setWaist] = useState('30.0 in');
  const [lengthVal, setLengthVal] = useState('14.5 in');
  const [shoulder, setShoulder] = useState('14.5 in');
  const [consentChecked, setConsentChecked] = useState(true);

  const openVaultForm = () => {
    setShowAddForm(true);
    setTimeout(() => {
      document.getElementById('measurement-vault')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !ownerName.trim()) {
      onNotifyToast('Please enter a profile name and wearer name.');
      return;
    }

    const newProfile: MeasurementProfile = {
      id: `meas-${Date.now()}`,
      label: label.trim(),
      garmentType,
      ownerName: ownerName.trim(),
      updatedAt: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      consentSaved: consentChecked,
      measuredBy: 'Self-Entered (Verify at Next Visit)',
      values: {
        'Chest / Bust': chestBust,
        Waist: waist,
        Length: lengthVal,
        Shoulder: shoulder,
      },
    };

    onAddProfile(newProfile);
    setShowAddForm(false);
    setLabel('');
    setOwnerName('');
    onNotifyToast('Measurement profile securely saved!');
  };

  return (
    <div className="bg-[#FDF9FF] text-[#1A103D]">
      {/* 1. BLUSH-LAVENDER & GOLD ARCH HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#FAF4FC] via-[#F7EFFB] to-[#F3E8F9] border-b border-[#EDE1F6]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[370px] lg:min-h-[410px]">
          {/* Left Copy & 3 Action Mode Cards */}
          <div className="lg:col-span-6 px-4 sm:px-6 lg:pl-8 lg:pr-8 py-9 lg:py-12 flex flex-col justify-center relative z-10">
            <div className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#4C1A70]">
              <span className="h-[1px] w-8 bg-[#D8B46B]" />
              <Scissors className="w-4 h-4 text-[#7521A8]" />
              <span>TAILORING MADE PERFECT</span>
              <span className="h-[1px] w-8 bg-[#D8B46B]" />
            </div>

            <h1 className="mt-2 font-editorial text-5xl sm:text-6xl font-bold leading-[1.04] tracking-tight text-[#3E0D61]">
              Measurements
            </h1>

            <p className="mt-3 text-sm sm:text-[15px] text-[#4E4266] leading-relaxed max-w-lg">
              Get accurate body measurements for a perfect fit, whether you measure yourself, take
              assistance, or book a tailor visit.
            </p>

            {/* 3 Interactive Option Cards */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={openVaultForm}
                className="flex items-center gap-2.5 bg-gradient-to-r from-[#5D138A] to-[#7B1FA2] hover:from-[#4C0E73] hover:to-[#6A1890] text-white rounded-2xl px-4 py-3.5 text-left shadow-md shadow-[#6B1B9A]/25 transition-all cursor-pointer"
              >
                <Ruler className="w-5 h-5 text-[#F6D68B] shrink-0" />
                <span className="text-xs font-bold leading-snug">
                  Measure Yourself with Our Guide
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenSupport) {
                    onOpenSupport();
                  } else {
                    setGuideModalOpen(true);
                  }
                }}
                className="flex items-center gap-2.5 bg-white hover:bg-[#FAF4FF] border border-[#E5D7F2] hover:border-[#7B1FA2] text-[#1A103D] rounded-2xl px-4 py-3.5 text-left shadow-2xs transition-all cursor-pointer"
              >
                <Video className="w-5 h-5 text-[#7521A8] shrink-0" />
                <span className="text-xs font-bold leading-snug">Get Assistance Online</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('custom-stitching')}
                className="flex items-center gap-2.5 bg-white hover:bg-[#FAF4FF] border border-[#E5D7F2] hover:border-[#7B1FA2] text-[#1A103D] rounded-2xl px-4 py-3.5 text-left shadow-2xs transition-all cursor-pointer"
              >
                <MapPin className="w-5 h-5 text-[#7521A8] shrink-0" />
                <span className="text-xs font-bold leading-snug">Book a Tailor Visit</span>
              </button>
            </div>
          </div>

          {/* Right Gold-Trimmed Convex Arch Photo */}
          <div className="lg:col-span-6 relative min-h-[260px] lg:min-h-full overflow-hidden">
            <SafeImage
              src={heroFittingImg}
              alt="Master tailor taking shoulder measurements of smiling woman wearing royal purple embroidered blouse"
              className="w-full h-full object-cover object-top"
            />
            <svg
              viewBox="0 0 110 420"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="hidden lg:block absolute top-0 left-0 h-full w-24 pointer-events-none"
            >
              <path d="M0 0 H88 C22 135 22 285 88 420 H0 Z" fill="#F4EAF9" />
              <path
                d="M88 0 C22 135 22 285 88 420"
                fill="none"
                stroke="url(#measGoldArch)"
                strokeWidth="7"
              />
              <defs>
                <linearGradient id="measGoldArch" x1="0" y1="0" x2="0" y2="420" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#DFB35B" />
                  <stop offset="0.5" stopColor="#F8E2A6" />
                  <stop offset="1" stopColor="#C89336" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* 2. MEASUREMENT GUIDE + HOW IT WORKS & WHY ACCURATE MEASUREMENTS MATTER */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-9">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 4 Cols: Measurement Guide Card */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-[#ECE1F5] p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FDF4E7] border border-[#F0D9B0] text-[#7A209C] flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h2 className="font-editorial text-2xl font-bold text-[#3E0D61]">
                  Measurement Guide
                </h2>
              </div>
              <p className="mt-2.5 text-xs text-[#5E5275] leading-relaxed">
                A simple step-by-step guide with images and visual tips for accurate body
                measurements at home.
              </p>

              {/* Visual Chest Tape Preview with Play Button */}
              <button
                type="button"
                onClick={() => setGuideModalOpen(true)}
                className="mt-4 relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-[#EAE0F2] group cursor-pointer block"
              >
                <SafeImage
                  src={guideChestImg}
                  alt="Self-measurement demonstration using yellow tape across chest"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-[#1A103D]/15 group-hover:bg-[#1A103D]/25 transition-colors flex items-center justify-center">
                  <span className="w-12 h-12 rounded-full bg-white/95 text-[#5D138A] shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-[#5D138A] ml-0.5" />
                  </span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setGuideModalOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-[#FAF2FF] border-2 border-[#6E1A9E] text-[#3E0D61] font-bold text-xs sm:text-sm py-2.5 rounded-full transition-colors cursor-pointer"
            >
              View Full Guide
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right 8 Cols: How It Works + Why Accurate Measurements Matter */}
          <div className="lg:col-span-8 flex flex-col justify-between gap-6">
            {/* How It Works */}
            <div className="bg-white rounded-3xl border border-[#ECE1F5] p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-center gap-4 mb-6">
                <span className="h-[1px] w-12 sm:w-20 bg-gradient-to-r from-transparent to-[#D6B162]" />
                <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#3E0D61]">
                  How It Works
                </h2>
                <span className="h-[1px] w-12 sm:w-20 bg-gradient-to-l from-transparent to-[#D6B162]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  {
                    step: '1',
                    title: 'Choose an Option',
                    sub: 'Select how you want to provide measurements',
                    Icon: Ruler,
                  },
                  {
                    step: '2',
                    title: 'Take Measurements',
                    sub: 'Follow our easy guide or get expert tailor help',
                    Icon: User,
                  },
                  {
                    step: '3',
                    title: 'Save & Use',
                    sub: 'We store your measurements for a perfect fit every time',
                    Icon: ShieldCheck,
                  },
                ].map((s, idx) => (
                  <div key={s.step} className="relative flex flex-col items-center text-center">
                    {idx < 2 && (
                      <ArrowRight className="hidden sm:block w-5 h-5 text-[#8E44AD] absolute -right-4 top-7" />
                    )}
                    <div className="relative w-16 h-16 rounded-full bg-[#F5EAFF] border border-[#E5CEF9] text-[#6E1A9E] flex items-center justify-center">
                      <s.Icon className="w-7 h-7" />
                      <span className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-[#6E1A9E] text-white text-xs font-extrabold flex items-center justify-center shadow-xs">
                        {s.step}
                      </span>
                    </div>
                    <h3 className="mt-3.5 text-sm font-extrabold text-[#1A103D]">{s.title}</h3>
                    <p className="mt-1 text-xs text-[#64597A] leading-relaxed max-w-[200px]">
                      {s.sub}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Accurate Measurements Matter? */}
            <div className="rounded-3xl bg-gradient-to-r from-[#FDF5F9] via-[#FAF2FC] to-[#F7EEFA] border border-[#ECDDF4] px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#3E0D61] leading-snug md:w-52 shrink-0">
                Why Accurate Measurements Matter?
              </h3>

              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:divide-x sm:divide-[#E4D3EE]">
                {[
                  { label: 'Perfect Fit Every Time', Icon: BadgeCheck },
                  { label: 'Reduced Alterations', Icon: Layers },
                  { label: 'Time & Cost Saving', Icon: Clock },
                  { label: 'Greater Comfort & Look', Icon: Diamond },
                ].map((item, idx) => (
                  <div
                    key={item.label}
                    className={`flex flex-col items-center text-center gap-1.5 ${
                      idx > 0 ? 'sm:pl-3' : ''
                    }`}
                  >
                    <item.Icon className="w-5 h-5 text-[#7521A8]" />
                    <span className="text-[11.5px] font-bold text-[#1A103D] leading-snug">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TAILERING DIGITAL FIT VAULT (SAVED MEASUREMENTS FROM MYSQL) */}
      <section id="measurement-vault" className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-12 space-y-7">
        {/* Vault Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#EAE0FA]">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6B21D9]">
              <Ruler className="w-3.5 h-3.5" />
              TAILERING DIGITAL FIT VAULT
            </p>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#1A103D] font-editorial">
              Your Saved Measurement Profiles
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              Reuse verified tailor measurements for faster repeat orders — private and shared only
              with your assigned tailor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 bg-white border border-[#CBD5E1] hover:border-[#6B21D9] text-[#1A103D] text-xs font-bold px-4 py-2.5 rounded-full cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 text-[#6B21D9]" />
              Add Measurement Profile
            </button>
            <button
              type="button"
              onClick={() => onNavigate('custom-stitching')}
              className="inline-flex items-center gap-1.5 bg-[#3E0D61] hover:bg-[#571487] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-xs cursor-pointer transition-colors"
            >
              <Home className="w-4 h-4 text-[#F3D27A]" />
              Book Free Home Measurement
            </button>
          </div>
        </div>

        {/* Privacy Notice Banner */}
        <div className="bg-[#F4EEFF] border border-[#DCD0F5] rounded-2xl p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-[#6B21D9] shrink-0 mt-0.5" />
          <div className="text-xs text-[#334155] leading-relaxed">
            <strong className="text-[#1A103D]">Privacy-First Measurement Access:</strong> Your body
            measurements are stored strictly with your explicit consent and remain invisible to
            unassigned tailors. You can revoke consent or delete any profile anytime.
          </div>
        </div>

        {/* Add Measurement Inline Form */}
        {showAddForm && (
          <form
            onSubmit={handleSaveNew}
            className="bg-white rounded-2xl border border-[#6B21D9]/40 p-5 sm:p-6 shadow-sm space-y-4"
          >
            <h3 className="text-base font-bold text-[#1A103D] font-editorial">
              New Measurement Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Profile Label (e.g. Festive Silk Blouse)"
                className="bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
              />
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Wearer Full Name"
                className="bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
              />
              <select
                value={garmentType}
                onChange={(e) =>
                  setGarmentType(e.target.value as MeasurementProfile['garmentType'])
                }
                className="bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
              >
                <option value="Blouse">Blouse</option>
                <option value="Kurti / Salwar">Kurti / Salwar</option>
                <option value="Men Shirt / Kurta">Men Shirt / Kurta</option>
                <option value="Trousers / Bottom">Trousers / Bottom</option>
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Chest / Bust
                </label>
                <input
                  type="text"
                  value={chestBust}
                  onChange={(e) => setChestBust(e.target.value)}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Waist
                </label>
                <input
                  type="text"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Garment Length
                </label>
                <input
                  type="text"
                  value={lengthVal}
                  onChange={(e) => setLengthVal(e.target.value)}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                />
              </div>
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                  Shoulder
                </label>
                <input
                  type="text"
                  value={shoulder}
                  onChange={(e) => setShoulder(e.target.value)}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-[#334155]">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="accent-[#6B21D9]"
              />
              I consent to securely save this measurement profile for repeat Tailering bookings.
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="bg-[#3E0D61] hover:bg-[#571487] text-white text-xs font-bold px-5 py-2.5 rounded-full cursor-pointer transition-colors"
              >
                Save Profile
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs font-semibold text-[#64748B] hover:text-[#1A103D] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Saved Profiles Cards */}
        {profiles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EAE0FA] p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F4EEFF] text-[#6B21D9] mx-auto flex items-center justify-center">
              <Ruler className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1A103D] font-editorial">
              No Saved Measurement Profiles Yet
            </h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto">
              Add your first self-measured profile using our visual guide above, or sign in to sync
              measurements taken by your Tailering master tailor.
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 bg-[#3E0D61] hover:bg-[#571487] text-white text-xs font-bold px-5 py-2.5 rounded-full cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Measurement Profile
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {profiles.map((prof) => (
              <div
                key={prof.id}
                className="bg-white rounded-2xl border border-[#EAE0FA] p-5 sm:p-6 space-y-4 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#6B21D9]">
                      {prof.garmentType}
                    </span>
                    <h3 className="text-base font-bold text-[#1A103D] mt-0.5 font-editorial">
                      {prof.label}
                    </h3>
                    <p className="text-xs text-[#64748B] inline-flex items-center gap-1.5 mt-1">
                      <User className="w-3.5 h-3.5" />
                      {prof.ownerName} &bull; Updated {prof.updatedAt}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Delete profile"
                    onClick={() => onDeleteProfile(prof.id)}
                    className="p-2 rounded-lg text-[#94A3B8] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.entries(prof.values).map(([k, v]) => (
                    <div key={k} className="bg-[#FAF8FF] rounded-xl p-2.5 border border-[#EAE0FA]">
                      <p className="text-[10px] font-semibold text-[#64748B] truncate">{k}</p>
                      <p className="text-xs font-extrabold text-[#1A103D] mt-0.5 tabular-nums">
                        {v}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-[#475569]">
                    <ShieldCheck className="w-4 h-4 text-[#059669]" />
                    {prof.measuredBy}
                  </span>

                  <button
                    type="button"
                    onClick={() => onToggleConsent(prof.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                      prof.consentSaved
                        ? 'bg-[#ECFDF5] text-[#059669]'
                        : 'bg-[#F1F5F9] text-[#64748B]'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {prof.consentSaved ? 'Reuse Enabled' : 'Reuse Paused'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* INTERACTIVE FULL MEASUREMENT GUIDE MODAL */}
      {guideModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1A103D]/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setGuideModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-2xl border border-[#EAE0FA]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-xs px-6 py-4 border-b border-[#EAE0FA] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-[#6E1A9E]" />
                <h3 className="font-editorial text-xl font-bold text-[#3E0D61]">
                  Step-by-Step Self Measurement Guide
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close measurement guide"
                onClick={() => setGuideModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F4EEFF] text-[#3E0D61] hover:bg-[#E7D8FA] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="rounded-2xl overflow-hidden border border-[#EAE0FA] aspect-[16/9]">
                <SafeImage
                  src={guideChestImg}
                  alt="How to hold measuring tape straight across chest"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {GUIDE_STEPS.map((g) => (
                  <div
                    key={g.step}
                    className="rounded-2xl bg-[#FAF6FF] border border-[#E9DDF5] p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-[#6E1A9E]">
                        STEP {g.step}
                      </span>
                      <span className="text-[10.5px] font-semibold text-[#64748B]">
                        Avg: {g.typical}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#1A103D]">{g.title}</h4>
                    <p className="text-xs text-[#475569] leading-relaxed">{g.tip}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setGuideModalOpen(false);
                    onNavigate('custom-stitching');
                  }}
                  className="text-xs font-bold text-[#6E1A9E] hover:underline cursor-pointer"
                >
                  Prefer a Home Tailor Visit?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGuideModalOpen(false);
                    openVaultForm();
                  }}
                  className="inline-flex items-center gap-1.5 bg-[#3E0D61] hover:bg-[#571487] text-white text-xs font-bold px-5 py-2.5 rounded-full cursor-pointer transition-colors"
                >
                  Enter My Measurements Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

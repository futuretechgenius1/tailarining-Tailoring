import React, { useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle2,
  IndianRupee,
  Layers,
  Link2,
  MapPin,
  Phone,
  Ruler,
  Scissors,
  ShieldCheck,
  Shirt,
  Truck,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { OrderRecord, StorefrontMediaMap } from '../types';
import { SafeImage } from './SafeImage';

interface UniformsPageProps {
  locality: string;
  media: StorefrontMediaMap;
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
  media,
  onOpenLocationModal,
  onSubmitOrder,
  onNotifyToast,
}) => {
  const heroTeamImg =
    media.uniformsHeroTeam || '/src/assets/images/uniforms_hero_team_1795431556416.jpg';
  const teamFabricsImg =
    media.uniformsTeamFabrics || '/src/assets/images/uniforms_team_fabrics_1795431555260.jpg';

  const sectorCards = [
    {
      id: 'school',
      title: 'School Uniforms',
      defaultGender: 'Boys' as GenderOption,
      note: 'School Uniforms — breathable cotton-blend shirts, pleated skirts/trousers & school crest embroidery.',
      image: media.uniformSectorSchool || '/src/assets/images/uniform_sector_school_1795431557558.jpg',
    },
    {
      id: 'corporate',
      title: 'Corporate Uniforms',
      defaultGender: 'Men' as GenderOption,
      note: 'Corporate Uniforms — crisp formal button-downs, tailored trousers & optional brand logo monogram.',
      image:
        media.uniformSectorCorporate ||
        '/src/assets/images/uniform_sector_corporate_1795431554972.jpg',
    },
    {
      id: 'healthcare',
      title: 'Healthcare Uniforms',
      defaultGender: 'Women' as GenderOption,
      note: 'Healthcare Uniforms — antimicrobial scrubs, lab coats & clinic tunics with utility pockets.',
      image:
        media.uniformSectorHealthcare ||
        '/src/assets/images/uniform_sector_healthcare_1795431557117.jpg',
    },
    {
      id: 'hospitality',
      title: 'Hospitality Uniforms',
      defaultGender: 'Men' as GenderOption,
      note: 'Hospitality Uniforms — tailored waistcoats, front-desk blazers, chef coats & service shirts.',
      image:
        media.uniformSectorHospitality ||
        '/src/assets/images/uniform_sector_hospitality_1795431554556.jpg',
    },
    {
      id: 'industrial',
      title: 'Industrial Uniforms',
      defaultGender: 'Men' as GenderOption,
      note: 'Industrial Uniforms — heavy-duty workwear shirts, reflective high-visibility tape & reinforced seams.',
      image:
        media.uniformSectorIndustrial ||
        '/src/assets/images/uniform_sector_industrial_1795431558550.jpg',
    },
  ];

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

  const scrollToConfigurator = (mode?: 'single' | 'bulk') => {
    if (mode) setOrderMode(mode);
    setSubmittedRef(null);
    document.getElementById('uniform-configurator')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectSector = (sector: (typeof sectorCards)[number]) => {
    setGender(sector.defaultGender);
    setNotes(sector.note);
    setSubmittedRef(null);
    onNotifyToast(`Selected ${sector.title} template below.`);
    document.getElementById('uniform-configurator')?.scrollIntoView({ behavior: 'smooth' });
  };

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
    const todayStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const newOrder: OrderRecord = {
      id: orderId,
      serviceTitle: `${gender} Uniform (${orderMode === 'bulk' ? `Bulk ${bulkQty} pcs` : 'Single Piece'})`,
      type: 'uniform',
      tailorName: 'Tailering Institutional Tailoring Desk',
      locality,
      createdAt: todayStr,
      deliveryDate: targetDate || 'Within 7 Days',
      amount: effectivePrice,
      stage: 'Booking Created',
      itemsSummary: `${orderMode === 'bulk' ? `${bulkQty}x` : '1x'} ${gender} Uniform · ${
        measureMode === 'home'
          ? 'Home Measurement Visit'
          : `Sizes: ${topSize || 'Standard'} / ${bottomSize || 'Standard'}`
      }${notes.trim() ? ` · ${notes.trim()}` : ''}`,
      quoteApproved: false,
    };

    onSubmitOrder(newOrder);
    setSubmittedRef(orderId);
    onNotifyToast(`Uniform inquiry ${orderId} submitted! Our specialist will call you shortly.`);
  };

  return (
    <div className="bg-[#FDF9FF] text-[#1A103D]">
      {/* 1. ROYAL PLUM & GOLD ARCH HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#320A54] via-[#4B137A] to-[#2B0747] text-white">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[370px] lg:min-h-[415px]">
          {/* Left Copy Column */}
          <div className="lg:col-span-6 px-4 sm:px-6 lg:pl-8 lg:pr-10 py-10 lg:py-12 flex flex-col justify-center relative z-10">
            <div className="flex items-center gap-3.5">
              {/* Golden Uniform Shirt Emblem */}
              <svg
                width="46"
                height="46"
                viewBox="0 0 48 48"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <path
                  d="M15 8L24 14L33 8L41 14L38 23L34 21V40H14V21L10 23L7 14L15 8Z"
                  stroke="#F4CF74"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path d="M19 11L24 16L29 11" stroke="#F4CF74" strokeWidth="2" />
                <path d="M24 16V40" stroke="#F4CF74" strokeWidth="1.6" strokeDasharray="3 3" />
                <rect x="27" y="21" width="5" height="4" rx="0.8" stroke="#F4CF74" strokeWidth="1.6" />
              </svg>
              <h1 className="font-editorial text-5xl sm:text-6xl font-bold leading-none tracking-tight text-white">
                Uniforms
              </h1>
            </div>

            <p className="mt-4 font-editorial text-lg sm:text-xl text-[#F5EAFB] leading-snug max-w-md">
              Professional, Comfortable &amp; Custom-Fit Uniforms for Every Organization
            </p>
            <div className="mt-3.5 h-[2px] w-14 bg-[#EBBF5D] rounded-full" />

            {/* 4 Gold-Icon Highlights */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11.5px] text-[#F5EBFD]">
              {[
                { label: 'Custom Fit & Sizing', Icon: Ruler },
                { label: 'Premium Fabrics', Icon: Layers },
                { label: 'Bulk Order Support', Icon: BadgeCheck },
                { label: 'On-Time Delivery', Icon: Truck },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <item.Icon className="w-4 h-4 text-[#F3CE74] shrink-0" />
                  <span className="leading-tight font-medium">{item.label}</span>
                </div>
              ))}
            </div>

            {/* 2 Pill CTAs */}
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => scrollToConfigurator()}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#F9DC8A] via-[#ECC05E] to-[#E0AC41] hover:from-[#FCE5A2] hover:to-[#E8B851] text-[#22073B] font-bold text-sm px-6 py-3 rounded-full shadow-lg shadow-black/25 transition-all cursor-pointer"
              >
                Get Uniform Quote
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() =>
                  document.getElementById('uniform-sectors')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/15 border border-white/60 text-white font-semibold text-sm px-6 py-3 rounded-full transition-all cursor-pointer"
              >
                Explore Styles
              </button>
            </div>
          </div>

          {/* Right Gold-Trimmed Convex Arch Photo */}
          <div className="lg:col-span-6 relative min-h-[260px] lg:min-h-full overflow-hidden">
            <SafeImage
              src={heroTeamImg}
              alt="Aviation and hospitality staff wearing custom-fitted uniforms in tailoring studio"
              className="w-full h-full object-cover object-top"
            />
            <svg
              viewBox="0 0 110 420"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="hidden lg:block absolute top-0 left-0 h-full w-24 pointer-events-none"
            >
              <path d="M0 0 H88 C22 135 22 285 88 420 H0 Z" fill="#41106B" />
              <path
                d="M88 0 C22 135 22 285 88 420"
                fill="none"
                stroke="url(#uniGoldArch)"
                strokeWidth="7"
              />
              <defs>
                <linearGradient id="uniGoldArch" x1="0" y1="0" x2="0" y2="420" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#E1B24D" />
                  <stop offset="0.5" stopColor="#FCE7A6" />
                  <stop offset="1" stopColor="#C8932F" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* 2. UNIFORM SOLUTIONS FOR EVERY SECTOR */}
      <section id="uniform-sectors" className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-10 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-3 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#5B4B75]">
              UNIFORMS
            </p>
            <h2 className="font-editorial text-3xl sm:text-[34px] font-bold text-[#1A103D] leading-[1.12]">
              Uniform Solutions for Every Sector
            </h2>
            <div className="h-[2.5px] w-12 bg-[#E3B249] rounded-full pt-0.5" />
          </div>

          <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {sectorCards.map((sector) => (
              <button
                key={sector.id}
                type="button"
                onClick={() => handleSelectSector(sector)}
                className="group bg-[#FFFDF9] rounded-2xl border border-[#ECE4F3] hover:border-[#D9A744] shadow-xs hover:shadow-md overflow-hidden text-left transition-all cursor-pointer flex flex-col"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#F5F0FA]">
                  <SafeImage
                    src={sector.image}
                    alt={sector.title}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 flex items-center justify-between gap-2 mt-auto">
                  <span className="text-xs font-extrabold text-[#1A103D] leading-snug">
                    {sector.title}
                  </span>
                  <span className="w-6 h-6 rounded-full bg-[#F5CD6D] group-hover:bg-[#E0AA3A] text-[#280A45] flex items-center justify-center shrink-0 transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. WHY CHOOSE TAILERING FOR UNIFORMS? */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#F6ECFC] via-[#FAF4FF] to-[#F3E8FA] border border-[#E7D8F5] px-6 py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="lg:w-64 shrink-0">
            <h2 className="font-editorial text-2xl font-bold text-[#1A103D] leading-snug">
              Why Choose{' '}
              <span className="text-[#6E189C]">Tailering</span> for Uniforms?
            </h2>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:divide-x lg:divide-[#E1D1F0]">
            {[
              { label: 'Custom Designs', Icon: ShieldCheck },
              { label: 'Durable & Premium Fabric', Icon: Layers },
              { label: 'Bulk & Corporate Orders', Icon: Users },
              { label: 'On-Time Delivery', Icon: Truck },
              { label: 'Competitive Pricing', Icon: IndianRupee },
            ].map((item, idx) => (
              <div
                key={item.label}
                className={`flex items-center gap-2.5 ${idx > 0 ? 'lg:pl-4' : ''}`}
              >
                <item.Icon className="w-5 h-5 text-[#6E189C] shrink-0" />
                <span className="text-xs font-bold text-[#1A103D] leading-snug">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. BOTTOM DARK PLUM BULK CTA BANNER */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-10">
        <div className="relative overflow-hidden rounded-3xl bg-[#320A54] text-white shadow-md border border-[#5B1F8D]/40 min-h-[168px] flex items-center">
          <SafeImage
            src={teamFabricsImg}
            alt="Folded purple, white, and navy uniform suiting fabrics with measuring tape and brass shears"
            className="absolute inset-0 w-full h-full object-cover object-left"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(44,10,74,0.18) 0%, rgba(46,10,77,0.88) 38%, rgba(50,10,84,0.98) 65%, rgba(44,10,74,0.98) 100%)',
            }}
          />

          <div className="relative z-10 w-full px-6 sm:px-10 py-7 flex flex-col lg:flex-row lg:items-center justify-end gap-6">
            <div className="max-w-lg lg:pr-6 lg:border-r lg:border-[#E5BC5E]/40">
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-white leading-tight">
                Need Uniforms for Your Team?
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#EADBF7] leading-relaxed">
                Get custom, high-quality uniforms in any style, fabric, and quantity. Perfect for
                schools, companies, hospitals, hotels, and more.
              </p>
            </div>

            <button
              type="button"
              onClick={() => scrollToConfigurator('bulk')}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#F9DC8A] via-[#ECC05E] to-[#E0AC41] hover:from-[#FCE5A2] hover:to-[#E8B851] text-[#22073B] font-bold text-sm px-6 py-3.5 rounded-full shadow-lg shrink-0 transition-all cursor-pointer self-start lg:self-center"
            >
              Request a Bulk Quote
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. STARTING BASE PRICES & INTERACTIVE 3-STEP UNIFORM CONFIGURATOR */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-12 space-y-10">
        {/* Starting Base Prices */}
        <section className="space-y-4">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6B21D9]">
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
                      ? 'bg-[#F4EEFF] border-[#6B21D9] shadow-sm ring-1 ring-[#6B21D9]/20'
                      : 'bg-white border-[#EAE0FA] hover:border-[#6B21D9]/45'
                  }`}
                >
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                    {item.label}
                  </p>
                  <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-[#1A103D] tabular-nums">
                    ₹{item.price}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[#6B21D9]">
                    BASE PRICE
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Configure Your Order */}
        <section id="uniform-configurator" className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1A103D] font-editorial">
              Configure Your Uniform Order
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              Select custom individual stitching or bulk institutional requirements (12% off 10+
              sets).
            </p>

            <div className="mt-4 inline-flex items-center bg-[#F1F5F9] border border-[#EAE0FA] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setOrderMode('single')}
                className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  orderMode === 'single'
                    ? 'bg-[#320A54] text-white shadow-2xs'
                    : 'text-[#475569] hover:text-[#1A103D]'
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
                    ? 'bg-[#320A54] text-white shadow-2xs'
                    : 'text-[#475569] hover:text-[#1A103D]'
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
              <h3 className="text-xl font-bold text-[#1A103D] font-editorial">
                Uniform Inquiry Confirmed ({submittedRef})
              </h3>
              <p className="text-sm text-[#475569] max-w-md mx-auto">
                Thank you, <strong className="text-[#1A103D]">{fullName}</strong>! Our Tailering
                uniform coordinator in <strong className="text-[#1A103D]">{locality}</strong> will
                contact you on <strong className="text-[#1A103D]">+91 {mobile}</strong> with fabric
                swatches and final confirmation.
              </p>
              <div className="inline-flex items-center gap-2 bg-[#F4EEFF] border border-[#DCD0F5] text-[#6B21D9] px-4 py-2 rounded-xl text-sm font-extrabold tabular-nums">
                Estimated Quote: ₹{effectivePrice.toLocaleString('en-IN')}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setSubmittedRef(null)}
                  className="mt-2 bg-[#320A54] hover:bg-[#4B137A] text-white text-xs font-bold px-6 py-2.5 rounded-full cursor-pointer transition-colors"
                >
                  Configure Another Uniform Order
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* STEP 1 */}
              <div className="bg-white rounded-2xl border border-[#EAE0FA] p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#6B21D9] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A103D]">Who is this for?</h3>
                    <p className="text-[11px] text-[#64748B]">
                      Select the category for this uniform
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
                          ? 'bg-[#F4EEFF] border-[#6B21D9] text-[#6B21D9]'
                          : 'bg-white border-[#CBD5E1] text-[#334155] hover:border-[#6B21D9]/50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {orderMode === 'bulk' && (
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 bg-[#FBF5E6] border border-[#F0DFA8] rounded-xl px-4 py-3">
                    <div>
                      <p className="text-xs font-bold text-[#1A103D]">
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
                      className="w-24 bg-white border border-[#C8922A] rounded-lg px-3 py-1.5 text-sm font-extrabold text-[#1A103D] text-center tabular-nums focus:outline-none focus:border-[#6B21D9]"
                    />
                  </div>
                )}
              </div>

              {/* STEP 2 */}
              <div className="bg-white rounded-2xl border border-[#EAE0FA] p-5 sm:p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#6B21D9] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A103D]">Measurements &amp; Style</h3>
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
                        ? 'bg-[#F4EEFF] border-[#6B21D9]'
                        : 'bg-white border-[#EAE0FA] hover:border-[#6B21D9]/45'
                    }`}
                  >
                    <span className="w-10 h-10 rounded-xl bg-[#F4EEFF] border border-[#DCD0F5] text-[#6B21D9] flex items-center justify-center shrink-0">
                      <Ruler className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-[#1A103D]">Manual Sizes</p>
                      <p className="text-[11px] text-[#64748B]">Select standard sizes</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMeasureMode('home')}
                    className={`p-4 rounded-xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                      measureMode === 'home'
                        ? 'bg-[#F4EEFF] border-[#6B21D9]'
                        : 'bg-white border-[#EAE0FA] hover:border-[#6B21D9]/45'
                    }`}
                  >
                    <span className="w-10 h-10 rounded-xl bg-[#F1F5F9] text-[#1A103D] flex items-center justify-center shrink-0">
                      <Scissors className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-[#1A103D]">
                        Home / On-Site Measurement
                      </p>
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
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
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
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
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
                    <label className="flex flex-col items-center justify-center h-[116px] rounded-xl border-2 border-dashed border-[#CBD5E1] hover:border-[#6B21D9] bg-[#FAF8FF] cursor-pointer transition-colors px-4 text-center">
                      <Upload className="w-5 h-5 text-[#6B21D9] mb-1.5" />
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
                          className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
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
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="bg-white rounded-2xl border border-[#EAE0FA] p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#6B21D9] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A103D]">Contact &amp; Delivery</h3>
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
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
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
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                    SERVICE LOCATION *
                  </label>
                  <div className="flex items-center justify-between bg-[#FAF8FF] border border-[#EAE0FA] rounded-xl px-4 py-2.5">
                    <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1A103D] truncate">
                      <MapPin className="w-4 h-4 text-[#6B21D9] shrink-0" />
                      {locality}
                    </span>
                    <button
                      type="button"
                      onClick={onOpenLocationModal}
                      className="text-[11px] font-bold text-[#6B21D9] hover:underline uppercase shrink-0 ml-2 cursor-pointer"
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
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
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
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                    />
                  </div>
                </div>
              </div>

              {/* BOTTOM ESTIMATE & SUBMIT BAR */}
              <div className="bg-white rounded-2xl border border-[#EAE0FA] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    BASE PRICE ESTIMATE
                  </p>
                  <p className="text-2xl font-extrabold text-[#1A103D] tabular-nums">
                    ₹{effectivePrice.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-[#64748B] italic">
                    Free consultation &bull; Fast delivery &bull; Transparent final quote
                  </p>
                </div>

                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#320A54] to-[#5B1691] hover:from-[#260742] hover:to-[#491078] text-white text-xs sm:text-sm font-bold uppercase tracking-wider px-8 py-3.5 rounded-full shadow-sm transition-all cursor-pointer"
                >
                  SUBMIT INQUIRY
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

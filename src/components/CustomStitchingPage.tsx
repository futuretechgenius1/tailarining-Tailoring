import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Home,
  Layers,
  MapPin,
  Ruler,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import {
  FabricBookingPreset,
  OrderRecord,
  PageRoute,
  PlatformServiceItem,
  StorefrontMediaMap,
  TailorPartner,
} from '../types';
import { SafeImage } from './SafeImage';
import { TailorLogoBadge } from './TailorLogoBadge';
import { TailorProfileTab } from './TailorModals';

interface CustomStitchingPageProps {
  tailors: TailorPartner[];
  platformServices: PlatformServiceItem[];
  media: StorefrontMediaMap;
  locality: string;
  fabricPreset?: FabricBookingPreset | null;
  onClearFabricPreset?: () => void;
  onOpenFabricCalculator: () => void;
  onOpenLocationModal: () => void;
  onInspectTailor?: (tailor: TailorPartner, tab?: TailorProfileTab) => void;
  onNavigate?: (page: PageRoute) => void;
  onSubmitOrder: (order: OrderRecord) => void;
  onNotifyToast: (msg: string) => void;
}

interface GarmentOptionItem {
  id: string;
  dbId?: number;
  label: string;
  price: number;
  range: string;
}

export const CustomStitchingPage: React.FC<CustomStitchingPageProps> = ({
  tailors,
  platformServices,
  media,
  locality,
  fabricPreset,
  onClearFabricPreset,
  onOpenFabricCalculator,
  onOpenLocationModal,
  onInspectTailor,
  onNavigate,
  onSubmitOrder,
  onNotifyToast,
}) => {
  const heroImg =
    media.customStitchingHero || '/src/assets/images/custom_stitching_hero_1795431555405.jpg';
  const shearsImg =
    media.customStitchingShears || '/src/assets/images/custom_stitching_shears_1795431558269.jpg';

  const outfitShowcase = [
    {
      label: 'Blouses',
      matchKey: 'blouse',
      image: media.bridalBlouse || '/src/assets/images/design_bridal_blouse_1795271999750.jpg',
    },
    {
      label: 'Kurtis',
      matchKey: 'kurti',
      image: media.anarkaliSuit || '/src/assets/images/design_anarkali_pastel_1795428315907.jpg',
    },
    {
      label: 'Lehengas',
      matchKey: 'lehenga',
      image: media.festiveLehenga || '/src/assets/images/design_festive_lehenga_1795271994492.jpg',
    },
    {
      label: 'Sherwanis',
      matchKey: 'kurta',
      image: media.mensSherwani || '/src/assets/images/design_mens_sherwani_1795272000158.jpg',
    },
    {
      label: 'Suits',
      matchKey: 'shirt',
      image: media.mensSuit || '/src/assets/images/design_mens_suit_1795271994978.jpg',
    },
    {
      label: 'Sarees',
      matchKey: 'blouse',
      image: media.sareePleating || '/src/assets/images/design_saree_pleating_1795271998351.jpg',
    },
    {
      label: 'Kids Wear',
      matchKey: 'kurti',
      image: media.partyGown || '/src/assets/images/design_party_gown_pink_1795428346822.jpg',
    },
    {
      label: 'Uniforms',
      matchKey: 'uniform',
      image: media.bannerUniforms || '/src/assets/images/banner_uniforms_team_1795272000997.jpg',
    },
    {
      label: 'Other Outfits',
      matchKey: 'salwar',
      image: media.atelierMaggamCraft || '/src/assets/images/atelier_maggam_craft_1795279206510.jpg',
    },
  ];

  const garmentOptions: GarmentOptionItem[] = platformServices.map((srv) => ({
    id: srv.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, ''),
    dbId: srv.id,
    label: srv.title,
    price: srv.basePrice,
    range: srv.description || `~${srv.turnaroundDays} days`,
  }));

  const [selectedGarmentId, setSelectedGarmentId] = useState<string>('');
  const [visitType, setVisitType] = useState<'home' | 'shop'>('home');
  const [selectedTailorId, setSelectedTailorId] = useState<string>(tailors[0]?.id || '');
  const [liningIncluded, setLiningIncluded] = useState(true);
  const [paddedCups, setPaddedCups] = useState(false);
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('10:00 AM – 12:00 PM');
  const [notes, setNotes] = useState('');
  const [refFile, setRefFile] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedGarment: GarmentOptionItem =
    garmentOptions.find((g) => g.id === selectedGarmentId) ||
    garmentOptions[0] || {
      id: 'custom-garment',
      label: 'Custom Tailoring Service',
      price: 799,
      range: 'Quote Based',
    };

  useEffect(() => {
    if (!fabricPreset) return;
    const matched = garmentOptions.find(
      (g) =>
        g.id.includes(fabricPreset.garmentOptionId) ||
        g.label.toLowerCase().includes(fabricPreset.garmentLabel.toLowerCase()),
    );
    if (matched) {
      setSelectedGarmentId(matched.id);
    }
    setLiningIncluded(fabricPreset.includeLining);
    setNotes(fabricPreset.summaryNote);
  }, [fabricPreset, platformServices]);

  const selectedTailor =
    tailors.find((t) => t.id === selectedTailorId) || tailors[0] || null;

  const addonsTotal = (liningIncluded ? 150 : 0) + (paddedCups ? 180 : 0);
  const visitFee = visitType === 'home' ? (selectedTailor?.homeVisitFee ?? 49) : 0;
  const estimatedTotal = selectedGarment.price + addonsTotal + visitFee;

  const scrollToBooking = () => {
    document.getElementById('custom-booking-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUploadCta = () => {
    setConfirmedId(null);
    const el = document.getElementById('custom-upload-box');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 350);
  };

  const handleSelectOutfitCard = (label: string, matchKey: string) => {
    if (matchKey === 'uniform' && onNavigate) {
      onNavigate('uniforms');
      return;
    }
    setConfirmedId(null);
    const matched = garmentOptions.find((g) => g.label.toLowerCase().includes(matchKey));
    if (matched) {
      setSelectedGarmentId(matched.id);
    }
    setNotes((prev) =>
      prev.trim()
        ? prev
        : `Interested in custom-stitched ${label}. Please advise on fabric drape and finishing.`,
    );
    scrollToBooking();
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const orderId = `TLR-CST-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date();
    const delivery = new Date(visitDate || today);
    delivery.setDate(delivery.getDate() + (selectedTailor?.turnaroundDays ?? 5));
    const newOrder: OrderRecord = {
      id: orderId,
      serviceTitle: selectedGarment.label,
      type: 'custom',
      tailorName: selectedTailor?.shopName || 'Tailering Master Atelier',
      tailorId:
        selectedTailor?.dbId ??
        (selectedTailor && Number.isFinite(Number(selectedTailor.id))
          ? Number(selectedTailor.id)
          : null),
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
      amount: estimatedTotal,
      stage: 'Visit Scheduled',
      itemsSummary: `${selectedGarment.label} · ${
        visitType === 'home' ? 'Home Measurement' : 'Shop Appointment'
      } (${timeSlot})${notes.trim() ? ` · ${notes.trim()}` : ''}`,
      quoteApproved: false,
      pickupMode: visitType === 'home' ? 'doorstep_pickup' : 'shop_visit',
      pickupDate: visitDate,
      pickupSlot: timeSlot,
      pickupAddress: locality,
    };

    onSubmitOrder(newOrder);
    setConfirmedId(orderId);
    onNotifyToast(
      `Custom stitching booking ${orderId} confirmed with ${selectedTailor?.shopName || 'Tailering Atelier'}!`,
    );
  };

  return (
    <div className="bg-[#FDFBF7] text-[#0E2F33]">
      {/* 1. EMERALD-TEAL LUXURY HERO BANNER */}
      <section className="relative overflow-hidden bg-[#05353A] text-white">
        {/* Background studio image positioned right */}
        <div className="absolute inset-0">
          <SafeImage
            src={heroImg}
            alt="Smiling Indian couple in bespoke embroidered saree blouse and ivory sherwani in tailoring studio"
            className="w-full h-full object-cover object-right lg:object-[78%_center]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(4,42,46,0.97) 0%, rgba(5,53,58,0.92) 38%, rgba(5,53,58,0.52) 60%, rgba(5,53,58,0.08) 100%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#042A2E]/65 via-transparent to-[#042A2E]/30 lg:hidden" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 pt-5 pb-10 sm:pt-7 sm:pb-14 lg:py-14">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-[#D5E6E4]/85 font-medium mb-5">
            <button
              type="button"
              onClick={() => onNavigate?.('home')}
              className="hover:text-[#F4D078] transition-colors cursor-pointer"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#E5C16C]/70" />
            <span className="text-[#F8E2A5] font-semibold">Custom Stitching</span>
          </nav>

          <div className="max-w-xl">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[56px] font-bold leading-[1.06] tracking-tight bg-gradient-to-r from-[#F9E4A6] via-[#E8BC62] to-[#F7D786] bg-clip-text text-transparent">
                Custom Stitching
              </h1>
              {/* Gold Needle & Buttons Emblem */}
              <svg
                width="48"
                height="48"
                viewBox="0 0 56 56"
                fill="none"
                aria-hidden="true"
                className="shrink-0 hidden sm:block"
              >
                <path
                  d="M10 48L39 9C40.5 7 43 7.5 42.5 10L16 49L10 48Z"
                  fill="url(#needleGold)"
                  stroke="#FBE7A8"
                  strokeWidth="1"
                />
                <ellipse cx="37.5" cy="14" rx="1.6" ry="3.4" transform="rotate(35 37.5 14)" fill="#05353A" />
                <circle cx="38" cy="36" r="6.5" fill="url(#needleGold)" stroke="#05353A" strokeWidth="1.2" />
                <circle cx="36" cy="34.5" r="1" fill="#05353A" />
                <circle cx="40" cy="34.5" r="1" fill="#05353A" />
                <circle cx="36" cy="37.8" r="1" fill="#05353A" />
                <circle cx="40" cy="37.8" r="1" fill="#05353A" />
                <circle cx="48" cy="27" r="5" fill="url(#needleGold)" stroke="#05353A" strokeWidth="1.1" />
                <circle cx="46.5" cy="25.8" r="0.8" fill="#05353A" />
                <circle cx="49.5" cy="25.8" r="0.8" fill="#05353A" />
                <circle cx="46.5" cy="28.3" r="0.8" fill="#05353A" />
                <circle cx="49.5" cy="28.3" r="0.8" fill="#05353A" />
                <defs>
                  <linearGradient id="needleGold" x1="10" y1="8" x2="52" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FCE7A2" />
                    <stop offset="0.5" stopColor="#E1AD4A" />
                    <stop offset="1" stopColor="#B88125" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <p className="mt-2.5 text-sm sm:text-base font-medium tracking-wide text-[#F3D282]">
              Your Design &bull; Our Craftsmanship &bull; Perfect Fit
            </p>

            <p className="mt-3.5 text-sm sm:text-[15px] text-[#E6F1F0]/90 leading-relaxed max-w-lg">
              Bring your style to life with personalized stitching. Share your design, choose the
              fabric, and get it tailored by verified expert tailors.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={scrollToBooking}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#F3D27A] via-[#E5B857] to-[#D9A33E] hover:from-[#F8DD94] hover:to-[#E3B14B] text-[#0A2528] font-bold text-sm px-6 py-3 rounded-full shadow-lg shadow-black/25 transition-all cursor-pointer"
              >
                <Scissors className="w-4 h-4" />
                Start Custom Stitching
              </button>

              <button
                type="button"
                onClick={handleUploadCta}
                className="inline-flex items-center gap-2 bg-[#073B40]/70 hover:bg-[#0B4F55]/85 border border-[#E5C16C]/80 text-[#FDF6DF] font-semibold text-sm px-6 py-3 rounded-full backdrop-blur-xs transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#F3D27A]" />
                Upload Your Design
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STITCH ANY OUTFIT YOUR WAY (9-CARD SHOWCASE) */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-9 pb-7">
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="h-[1px] w-14 sm:w-28 bg-gradient-to-r from-transparent to-[#D6B162]" />
          <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#0A2F33] text-center">
            Stitch Any Outfit Your Way
          </h2>
          <span className="h-[1px] w-14 sm:w-28 bg-gradient-to-l from-transparent to-[#D6B162]" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
          {outfitShowcase.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleSelectOutfitCard(item.label, item.matchKey)}
              className="group bg-[#FFFDF9] rounded-2xl border border-[#ECE4D5] hover:border-[#D4AA52] shadow-xs hover:shadow-md overflow-hidden text-left transition-all cursor-pointer flex flex-col"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#F5EFE3]">
                <SafeImage
                  src={item.image}
                  alt={item.label}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="px-2.5 py-2.5 flex items-center justify-between gap-1.5 mt-auto">
                <span className="text-[12px] font-bold text-[#0E2F33] truncate">{item.label}</span>
                <span className="w-5 h-5 rounded-full bg-[#F7EBD2] group-hover:bg-[#E2B252] text-[#7D5714] group-hover:text-[#082B2E] flex items-center justify-center shrink-0 transition-colors">
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. HOW CUSTOM STITCHING WORKS + UPLOAD YOUR DESIGN SPOTLIGHT */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left 8 Cols: 4-Step Process Card */}
          <div className="lg:col-span-8 relative overflow-hidden bg-gradient-to-r from-[#FAF4E8] via-[#FDFBF7] to-[#FAF4E8] rounded-2xl border border-[#ECE3D2] p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Decorative measuring tape curve bottom-left */}
            <svg
              className="absolute -bottom-2 -left-2 w-40 h-14 opacity-85 pointer-events-none hidden sm:block"
              viewBox="0 0 200 60"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M-10 52 C25 18, 55 58, 95 28 C125 8, 155 46, 195 36"
                stroke="#F2C94C"
                strokeWidth="16"
                strokeLinecap="round"
              />
              <path
                d="M-10 52 C25 18, 55 58, 95 28 C125 8, 155 46, 195 36"
                stroke="#8A6112"
                strokeWidth="1.5"
                strokeDasharray="3 6"
              />
            </svg>

            <div className="lg:w-44 shrink-0 relative z-10">
              <h3 className="font-editorial text-2xl sm:text-[26px] font-bold text-[#0A2F33] leading-tight">
                How Custom Stitching Works
              </h3>
            </div>

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
              {[
                {
                  step: '1',
                  title: 'Upload Design',
                  sub: 'Share your idea or reference image',
                  Icon: Upload,
                },
                {
                  step: '2',
                  title: 'Choose Fabric',
                  sub: 'Select from premium fabrics',
                  Icon: Layers,
                },
                {
                  step: '3',
                  title: 'Share Measurements',
                  sub: 'Provide your size or get guided',
                  Icon: Ruler,
                },
                {
                  step: '4',
                  title: 'We Stitch & Deliver',
                  sub: 'Expert stitching and on-time delivery',
                  Icon: Scissors,
                },
              ].map((item, idx) => (
                <div key={item.step} className="relative flex flex-col items-center text-center">
                  {idx < 3 && (
                    <ArrowRight className="hidden sm:block w-4 h-4 text-[#C69A42] absolute -right-3 top-6" />
                  )}
                  <div className="w-13 h-13 rounded-full bg-[#F8EDD6] border border-[#E7CFA0] text-[#9A6E1D] flex items-center justify-center shadow-2xs">
                    <item.Icon className="w-5 h-5" />
                  </div>
                  <div className="mt-2.5 flex items-center justify-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#C69332] text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                      {item.step}
                    </span>
                    <span className="text-xs font-extrabold text-[#0A2F33] leading-tight">
                      {item.title}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#5B686A] leading-snug">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right 4 Cols: Upload Your Design Dark Teal Card */}
          <button
            type="button"
            onClick={handleUploadCta}
            className="lg:col-span-4 relative overflow-hidden rounded-2xl bg-[#05353A] text-left p-6 flex flex-col justify-center min-h-[180px] group cursor-pointer shadow-md border border-[#12555C]"
          >
            <SafeImage
              src={shearsImg}
              alt="Golden tailor shears on draped teal satin silk"
              className="absolute inset-0 w-full h-full object-cover object-right group-hover:scale-105 transition-transform duration-500"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(95deg, rgba(4,41,45,0.96) 0%, rgba(5,52,58,0.86) 52%, rgba(5,52,58,0.22) 100%)',
              }}
            />
            <div className="relative z-10 max-w-[230px]">
              <h3 className="font-editorial italic text-2xl font-bold text-[#FAF3E0] leading-snug">
                Upload Your Design
                <span className="block text-[#F3D27A]">Get It Stitched</span>
              </h3>
              <p className="mt-2 text-xs text-[#DCECEB] leading-relaxed">
                Unique styles, precise fit, and premium finishing.
              </p>
              <span className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#F3D27A] group-hover:translate-x-1 transition-transform">
                <Upload className="w-3.5 h-3.5" />
                Attach Reference Photo
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* 4. 5-ITEM GOLD TRUST BAR */}
      <section className="border-y border-[#ECE3D2] bg-[#FAF5EB]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 divide-y sm:divide-y-0 lg:divide-x divide-[#E6DAC2]">
            {[
              { title: 'Verified Tailors', sub: 'Skilled & Trusted', Icon: ShieldCheck },
              { title: 'Perfect Fit', sub: 'As Per Your Measurements', Icon: Ruler },
              { title: 'Quality Stitching', sub: 'Neat & Durable Finish', Icon: Scissors },
              { title: 'Wide Fabric Range', sub: 'Premium Collections', Icon: Layers },
              { title: 'Pickup & Delivery', sub: 'At Your Convenience', Icon: Truck },
            ].map((trust, idx) => (
              <div
                key={trust.title}
                className={`flex items-center gap-3 ${idx > 0 ? 'lg:pl-5' : ''} pt-2 sm:pt-0`}
              >
                <div className="w-11 h-11 rounded-full bg-[#F5E7CA] border border-[#E4C993] text-[#9A6B18] flex items-center justify-center shrink-0">
                  <trust.Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] font-extrabold text-[#0A2F33] truncate">
                    {trust.title}
                  </p>
                  <p className="text-[11px] text-[#5A6769] truncate">{trust.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. LIVE INTERACTIVE BOOKING CONFIGURATOR (BACKED BY MYSQL) */}
      <section id="custom-booking-form" className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 space-y-7">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#EAE0CE]">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B5D63]">
              <Sparkles className="w-3.5 h-3.5 text-[#C8922A]" />
              BOOK YOUR BESPOKE APPOINTMENT
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-[#0A2F33] font-editorial">
              Customize &amp; Schedule Your Stitching Visit
            </h2>
            <p className="text-xs sm:text-sm text-[#5A6769] mt-1">
              Transparent starting prices from verified tailors &bull; Final quote approved by you
              before stitching begins.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenLocationModal}
            className="inline-flex items-center gap-2 bg-white border border-[#DFD5C0] rounded-xl px-4 py-2.5 text-xs font-bold text-[#0A2F33] hover:border-[#0B5D63] cursor-pointer self-start transition-colors"
          >
            <MapPin className="w-4 h-4 text-[#0B5D63]" />
            <span>{locality}</span>
            <span className="text-[#B68221]">Change</span>
          </button>
        </div>

        {confirmedId ? (
          <div className="bg-white rounded-2xl border border-[#A7F3D0] p-8 text-center max-w-2xl mx-auto space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] text-[#059669] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#0A2F33] font-editorial">
              Doorstep Visit Scheduled ({confirmedId})
            </h3>
            <p className="text-sm text-[#475569]">
              <strong className="text-[#0A2F33]">
                {selectedTailor?.masterTailor || 'Master Tailor'}
              </strong>{' '}
              from{' '}
              <strong className="text-[#0A2F33]">
                {selectedTailor?.shopName || 'Tailering Atelier'}
              </strong>{' '}
              will meet you on <strong className="text-[#0A2F33]">{visitDate}</strong> ({timeSlot})
              for measurements and final quotation approval.
            </p>
            <div className="bg-[#FAF6EE] border border-[#EAE0CE] rounded-xl p-4 text-xs text-[#475569] text-left space-y-1">
              <p>
                <strong className="text-[#0A2F33]">Service:</strong> {selectedGarment.label}
              </p>
              <p>
                <strong className="text-[#0A2F33]">Indicative Estimate:</strong> ₹
                {estimatedTotal.toLocaleString('en-IN')} (Pay at pickup after quote approval)
              </p>
              <p>
                <strong className="text-[#0A2F33]">Protection:</strong> Fabric Insured &bull; 7-Day
                Free Doorstep Refit Guarantee
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmedId(null)}
              className="bg-[#063B40] hover:bg-[#0B555B] text-white font-bold text-xs px-6 py-3 rounded-full cursor-pointer transition-colors"
            >
              Book Another Garment
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirmBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Configuration */}
            <div className="lg:col-span-8 space-y-6">
              {/* Contextual Fabric Requirements Calculator Banner */}
              {fabricPreset ? (
                <div className="bg-[#EFF8F7] rounded-2xl border border-[#BFE2DE] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#BFE2DE] text-[#0B5D63] flex items-center justify-center shrink-0">
                      <Ruler className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0A2F33]">
                        Fabric Plan Applied: {fabricPreset.garmentLabel}
                      </p>
                      <p className="text-[11.5px] text-[#475569] mt-0.5 line-clamp-2">
                        {fabricPreset.summaryNote}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={onOpenFabricCalculator}
                      className="px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] hover:border-[#0B5D63] text-xs font-bold text-[#0A2F33] whitespace-nowrap cursor-pointer transition-colors"
                    >
                      Recalculate
                    </button>
                    {onClearFabricPreset && (
                      <button
                        type="button"
                        aria-label="Clear applied fabric plan"
                        onClick={onClearFabricPreset}
                        className="p-2 rounded-lg text-[#64748B] hover:text-[#0A2F33] hover:bg-white cursor-pointer transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#EAE0CE] px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F8EDD6] border border-[#E7CFA0] text-[#9A6E1D] flex items-center justify-center shrink-0">
                      <Ruler className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0A2F33]">
                        Not sure how much fabric to buy before booking?
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        Calculate exact meters by garment, bolt width (36&Prime;–60&Prime;), lining
                        &amp; shrinkage.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenFabricCalculator}
                    className="inline-flex items-center gap-1.5 bg-[#063B40] hover:bg-[#0A545A] text-white text-xs font-bold px-4 py-2.5 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-center"
                  >
                    <span>Fabric Calculator</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#F3D27A]" />
                  </button>
                </div>
              )}

              {/* 1. Choose Garment */}
              <div className="bg-white rounded-2xl border border-[#EAE0CE] p-5 sm:p-6 space-y-4">
                <h3 className="text-base font-bold text-[#0A2F33] font-editorial">
                  1. Choose Garment Category
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {garmentOptions.map((g) => {
                    const active = selectedGarment.id === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGarmentId(g.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-[#EFF8F7] border-[#0B5D63] ring-1 ring-[#0B5D63]/20'
                            : 'bg-white border-[#EAE0CE] hover:border-[#C89B42]'
                        }`}
                      >
                        <p className="text-xs font-bold text-[#0A2F33]">{g.label}</p>
                        <div className="mt-1.5 flex items-baseline justify-between gap-2">
                          <span className="text-sm font-extrabold text-[#0B5D63] tabular-nums">
                            ₹{g.price}
                          </span>
                          <span className="text-[10px] text-[#64748B] truncate">{g.range}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Appointment Mode & Verified Local Tailor */}
              <div className="bg-white rounded-2xl border border-[#EAE0CE] p-5 sm:p-6 space-y-5">
                <h3 className="text-base font-bold text-[#0A2F33] font-editorial">
                  2. Appointment Mode &amp; Nearby Verified Tailor
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVisitType('home')}
                    className={`p-4 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-all ${
                      visitType === 'home'
                        ? 'bg-[#EFF8F7] border-[#0B5D63]'
                        : 'bg-white border-[#EAE0CE] hover:border-[#0B5D63]/45'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#EFF8F7] border border-[#BFE2DE] text-[#0B5D63] flex items-center justify-center shrink-0">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-[#0A2F33]">
                        Home Measurement Visit
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        Master tailor visits your doorstep &amp; picks up fabric
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisitType('shop')}
                    className={`p-4 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-all ${
                      visitType === 'shop'
                        ? 'bg-[#EFF8F7] border-[#0B5D63]'
                        : 'bg-white border-[#EAE0CE] hover:border-[#0B5D63]/45'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#FAF4E8] border border-[#E7CFA0] text-[#9A6E1D] flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-[#0A2F33]">
                        Boutique Shop Appointment
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        Reserved zero-wait slot at nearby partner boutique
                      </p>
                    </div>
                  </button>
                </div>

                {/* Nearby Tailors List */}
                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-[#475569]">
                    Verified Partners Serving {locality} (within 5 km):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tailors.map((t) => {
                      const active = (selectedTailor?.id || selectedTailorId) === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTailorId(t.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedTailorId(t.id);
                            }
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            active
                              ? 'bg-[#EFF8F7] border-[#0B5D63] ring-1 ring-[#0B5D63]/20'
                              : 'bg-white border-[#EAE0CE] hover:border-[#C89B42]'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <TailorLogoBadge logoUrl={t.logoUrl} shopName={t.shopName} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-xs font-extrabold text-[#0A2F33] truncate">
                                    {t.shopName}
                                  </p>
                                  <p className="text-[11px] text-[#64748B] tabular-nums truncate">
                                    {t.masterTailor} &bull; {t.distanceKm} km away
                                  </p>
                                </div>
                              </div>
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#8A5F12] bg-[#FAF0D7] px-2 py-0.5 rounded-full tabular-nums shrink-0">
                                <Star className="w-3 h-3 fill-[#E0A938] text-[#E0A938]" />
                                {t.rating}
                              </span>
                            </div>
                            <p className="mt-2 text-[10.5px] text-[#526063] line-clamp-1">
                              {t.specialties.join(' · ')}
                            </p>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-[#ECE4D5]/80 flex items-center justify-between gap-2 text-[10.5px]">
                            <span className="font-semibold text-emerald-700">
                              {t.homeVisitFee === 0
                                ? 'Free Home Visit'
                                : `Visit Fee: ₹${t.homeVisitFee}`}{' '}
                              · <span className="text-[#64748B] font-normal">{t.turnaround}</span>
                            </span>
                            {onInspectTailor && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInspectTailor(t, 'services');
                                }}
                                className="font-bold text-[#0B5D63] hover:text-[#05353A] hover:underline shrink-0 cursor-pointer"
                              >
                                View Shop &amp; Work →
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Customizations, Reference Photo & Slot */}
              <div
                id="custom-upload-box"
                className="bg-white rounded-2xl border border-[#EAE0CE] p-5 sm:p-6 space-y-4"
              >
                <h3 className="text-base font-bold text-[#0A2F33] font-editorial">
                  3. Style Notes, Reference Photo &amp; Preferred Slot
                </h3>

                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 bg-[#FAF6EE] border border-[#EAE0CE] px-3.5 py-2 rounded-xl text-xs font-semibold text-[#0A2F33] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liningIncluded}
                      onChange={(e) => setLiningIncluded(e.target.checked)}
                      className="accent-[#0B5D63]"
                    />
                    Pure Cotton Lining (+₹150)
                  </label>

                  <label className="inline-flex items-center gap-2 bg-[#FAF6EE] border border-[#EAE0CE] px-3.5 py-2 rounded-xl text-xs font-semibold text-[#0A2F33] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paddedCups}
                      onChange={(e) => setPaddedCups(e.target.checked)}
                      className="accent-[#0B5D63]"
                    />
                    Padded Cups &amp; Piping (+₹180)
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Preferred Visit Date
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full bg-white border border-[#D8CFC0] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#0A2F33] focus:outline-none focus:border-[#0B5D63]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                      Time Slot
                    </label>
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full bg-white border border-[#D8CFC0] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0A2F33] focus:outline-none focus:border-[#0B5D63]"
                    >
                      <option>10:00 AM – 12:00 PM</option>
                      <option>12:00 PM – 02:00 PM</option>
                      <option>04:00 PM – 06:00 PM</option>
                      <option>06:00 PM – 08:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-[#D6C7A9] hover:border-[#0B5D63] bg-[#FAF6EE] cursor-pointer px-4 text-center transition-colors">
                    <Upload className="w-4 h-4 text-[#0B5D63] mb-1" />
                    <span className="text-xs font-bold text-[#0A2F33]">
                      {refFile || 'Upload Reference Design Photo'}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setRefFile(f.name);
                          onNotifyToast(`Design reference "${f.name}" attached.`);
                        }
                      }}
                    />
                  </label>

                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Neck depth, sleeve style, tassel preference, or fit notes..."
                    className="w-full bg-white border border-[#D8CFC0] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0A2F33] focus:outline-none focus:border-[#0B5D63]"
                  />
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Sticky Quote Summary */}
            <div className="lg:col-span-4">
              <div className="sticky top-28 bg-white rounded-2xl border border-[#EAE0CE] p-5 sm:p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-[#0A2F33] font-editorial">
                  Transparent Estimate
                </h3>

                <div className="space-y-2.5 text-xs sm:text-sm pb-4 border-b border-[#F1ECE1]">
                  <div className="flex justify-between">
                    <span className="text-[#475569]">{selectedGarment.label}</span>
                    <span className="font-bold text-[#0A2F33] tabular-nums">
                      ₹{selectedGarment.price}
                    </span>
                  </div>
                  {liningIncluded && (
                    <div className="flex justify-between">
                      <span className="text-[#475569]">Pure Cotton Lining</span>
                      <span className="font-bold text-[#0A2F33] tabular-nums">₹150</span>
                    </div>
                  )}
                  {paddedCups && (
                    <div className="flex justify-between">
                      <span className="text-[#475569]">Padded Cups &amp; Piping</span>
                      <span className="font-bold text-[#0A2F33] tabular-nums">₹180</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#475569]">
                      {visitType === 'home' ? 'Doorstep Measurement Visit' : 'Shop Appointment'}
                    </span>
                    <span className="font-bold text-[#059669] tabular-nums">
                      {visitFee === 0 ? 'FREE' : `₹${visitFee}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#64748B]">ESTIMATED TOTAL</p>
                    <p className="text-[11px] text-[#0B5D63] font-semibold">
                      Zero advance &bull; Pay after final quote
                    </p>
                  </div>
                  <span className="text-2xl font-extrabold text-[#0A2F33] tabular-nums">
                    ₹{estimatedTotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#07444A] to-[#0B636A] hover:from-[#05353A] hover:to-[#084F55] text-white font-bold text-sm py-3.5 rounded-full shadow-md shadow-[#063B40]/20 transition-all cursor-pointer"
                >
                  Confirm Measurement Visit
                </button>

                <div className="bg-[#FAF6EE] border border-[#EAE0CE] rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-[#475569]">
                  <ShieldCheck className="w-4 h-4 text-[#0B5D63] shrink-0 mt-0.5" />
                  <span>
                    Stitching never starts until you inspect and approve the tailor&apos;s final
                    quote and promised delivery date.
                  </span>
                </div>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

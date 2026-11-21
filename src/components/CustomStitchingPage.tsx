import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Home,
  MapPin,
  Scissors,
  ShieldCheck,
  Star,
  Store,
  Upload,
} from 'lucide-react';
import { TAILOR_PARTNERS } from '../data/catalogData';
import { OrderRecord } from '../types';

interface CustomStitchingPageProps {
  locality: string;
  onOpenLocationModal: () => void;
  onSubmitOrder: (order: OrderRecord) => void;
  onNotifyToast: (msg: string) => void;
}

const GARMENT_OPTIONS = [
  { id: 'basic-blouse', label: 'Basic Blouse Stitching', price: 549, range: '₹450–₹700' },
  { id: 'designer-blouse', label: 'Designer / Padded Blouse', price: 999, range: '₹800–₹1,500' },
  { id: 'maggam-blouse', label: 'Bridal Maggam Work Blouse', price: 2499, range: 'Quote Based' },
  { id: 'chudidar', label: 'Chudidar / Salwar Kameez', price: 899, range: '₹700–₹1,100' },
  { id: 'kurti', label: 'Kurti Stitching', price: 599, range: '₹450–₹800' },
  { id: 'lehenga', label: 'Lehenga Choli with Can-Can', price: 1699, range: '₹1,499+' },
  { id: 'mens-shirt', label: 'Men Formal / Casual Shirt', price: 649, range: '₹500–₹800' },
  { id: 'mens-trouser', label: 'Men Tailored Trousers', price: 699, range: '₹500–₹800' },
  { id: 'mens-kurta', label: 'Men Festive Kurta Set', price: 1199, range: '₹1,099+' },
];

export const CustomStitchingPage: React.FC<CustomStitchingPageProps> = ({
  locality,
  onOpenLocationModal,
  onSubmitOrder,
  onNotifyToast,
}) => {
  const [selectedGarment, setSelectedGarment] = useState(GARMENT_OPTIONS[1]);
  const [visitType, setVisitType] = useState<'home' | 'shop'>('home');
  const [selectedTailorId, setSelectedTailorId] = useState(TAILOR_PARTNERS[0].id);
  const [liningIncluded, setLiningIncluded] = useState(true);
  const [paddedCups, setPaddedCups] = useState(false);
  const [visitDate, setVisitDate] = useState('2026-11-23');
  const [timeSlot, setTimeSlot] = useState('10:00 AM – 12:00 PM');
  const [notes, setNotes] = useState('');
  const [refFile, setRefFile] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const selectedTailor =
    TAILOR_PARTNERS.find((t) => t.id === selectedTailorId) || TAILOR_PARTNERS[0];

  const addonsTotal = (liningIncluded ? 150 : 0) + (paddedCups ? 180 : 0);
  const visitFee = visitType === 'home' ? selectedTailor.homeVisitFee : 0;
  const estimatedTotal = selectedGarment.price + addonsTotal + visitFee;

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const orderId = `TLR-CST-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: OrderRecord = {
      id: orderId,
      serviceTitle: selectedGarment.label,
      type: 'custom',
      tailorName: selectedTailor.shopName,
      locality,
      createdAt: '21 Nov 2026',
      deliveryDate: '27 Nov 2026',
      amount: estimatedTotal,
      stage: 'Visit Scheduled',
      itemsSummary: `${selectedGarment.label} · ${
        visitType === 'home' ? 'Home Measurement' : 'Shop Appointment'
      } (${timeSlot})`,
      quoteApproved: false,
    };

    onSubmitOrder(newOrder);
    setConfirmedId(orderId);
    onNotifyToast(`Custom stitching booking ${orderId} confirmed with ${selectedTailor.shopName}!`);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 sm:py-9 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B7285]">
            <Scissors className="w-3.5 h-3.5" />
            BESPOKE CUSTOM STITCHING
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#0B1F3A] font-serif-accent">
            Book Your Custom Stitching Visit
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Transparent starting prices · Final quote approved by you before stitching begins.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenLocationModal}
          className="inline-flex items-center gap-2 bg-white border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-xs font-bold text-[#0B1F3A] hover:border-[#0B7285] cursor-pointer self-start transition-colors"
        >
          <MapPin className="w-4 h-4 text-[#0B7285]" />
          <span>{locality}</span>
          <span className="text-[#0B7285]">Change</span>
        </button>
      </div>

      {confirmedId ? (
        <div className="bg-white rounded-2xl border border-[#A7F3D0] p-8 text-center max-w-2xl mx-auto space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] text-[#059669] mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#0B1F3A] font-serif-accent">
            Doorstep Visit Scheduled ({confirmedId})
          </h2>
          <p className="text-sm text-[#475569]">
            <strong className="text-[#0B1F3A]">{selectedTailor.masterTailor}</strong> from{' '}
            <strong className="text-[#0B1F3A]">{selectedTailor.shopName}</strong> will meet you on{' '}
            <strong className="text-[#0B1F3A]">{visitDate}</strong> ({timeSlot}) for measurements
            and final quotation approval.
          </p>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-xs text-[#475569] text-left space-y-1">
            <p>
              <strong className="text-[#0B1F3A]">Service:</strong> {selectedGarment.label}
            </p>
            <p>
              <strong className="text-[#0B1F3A]">Indicative Estimate:</strong> ₹
              {estimatedTotal.toLocaleString('en-IN')} (Pay at pickup after quote approval)
            </p>
            <p>
              <strong className="text-[#0B1F3A]">Protection:</strong> Fabric Insured · 7-Day Free
              Doorstep Refit Guarantee
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmedId(null)}
            className="bg-[#0B1F3A] hover:bg-[#15325B] text-white font-bold text-xs px-6 py-3 rounded-xl cursor-pointer transition-colors"
          >
            Book Another Garment
          </button>
        </div>
      ) : (
        <form onSubmit={handleConfirmBooking} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 Cols: Configuration */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Choose Garment */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-bold text-[#0B1F3A] font-serif-accent">
                1. Choose Garment Category
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {GARMENT_OPTIONS.map((g) => {
                  const active = selectedGarment.id === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGarment(g)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-[#F0F9FA] border-[#0B7285] ring-1 ring-[#0B7285]/20'
                          : 'bg-white border-[#E2E8F0] hover:border-[#0B7285]/45'
                      }`}
                    >
                      <p className="text-xs font-bold text-[#0B1F3A]">{g.label}</p>
                      <div className="mt-1.5 flex items-baseline justify-between">
                        <span className="text-sm font-extrabold text-[#0B7285] tabular-nums">
                          ₹{g.price}
                        </span>
                        <span className="text-[10px] text-[#64748B]">{g.range}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Appointment Mode & Verified Local Tailor */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-5">
              <h2 className="text-base font-bold text-[#0B1F3A] font-serif-accent">
                2. Appointment Mode &amp; Nearby Verified Tailor
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVisitType('home')}
                  className={`p-4 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-all ${
                    visitType === 'home'
                      ? 'bg-[#F0F9FA] border-[#0B7285]'
                      : 'bg-white border-[#E2E8F0] hover:border-[#0B7285]/45'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F0F9FA] border border-[#CBE7EC] text-[#0B7285] flex items-center justify-center shrink-0">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#0B1F3A]">
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
                      ? 'bg-[#F0F9FA] border-[#0B7285]'
                      : 'bg-white border-[#E2E8F0] hover:border-[#0B7285]/45'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] text-[#0B1F3A] flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#0B1F3A]">
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
                  {TAILOR_PARTNERS.map((t) => {
                    const active = selectedTailorId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTailorId(t.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-[#F0F9FA] border-[#0B7285]'
                            : 'bg-white border-[#E2E8F0] hover:border-[#0B7285]/45'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-extrabold text-[#0B1F3A]">{t.shopName}</p>
                            <p className="text-[11px] text-[#64748B] tabular-nums">
                              {t.masterTailor} · {t.distanceKm} km away
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#A67418] bg-[#FBF5E6] px-2 py-0.5 rounded-md tabular-nums">
                            <Star className="w-3 h-3 fill-[#C8922A] text-[#C8922A]" />
                            {t.rating}
                          </span>
                        </div>
                        <p className="mt-2 text-[10.5px] text-[#475569] line-clamp-1">
                          {t.specialties.join(' · ')}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[10.5px]">
                          <span className="font-semibold text-[#059669]">
                            {t.homeVisitFee === 0
                              ? 'Free Home Visit'
                              : `Visit Fee: ₹${t.homeVisitFee}`}
                          </span>
                          <span className="text-[#64748B]">{t.turnaround}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Customizations, Reference Photo & Slot */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-bold text-[#0B1F3A] font-serif-accent">
                3. Style Notes, Add-ons &amp; Preferred Slot
              </h2>

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 rounded-xl text-xs font-semibold text-[#0B1F3A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={liningIncluded}
                    onChange={(e) => setLiningIncluded(e.target.checked)}
                    className="accent-[#0B7285]"
                  />
                  Pure Cotton Lining (+₹150)
                </label>

                <label className="inline-flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2 rounded-xl text-xs font-semibold text-[#0B1F3A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paddedCups}
                    onChange={(e) => setPaddedCups(e.target.checked)}
                    className="accent-[#0B7285]"
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
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
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
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                  >
                    <option>10:00 AM – 12:00 PM</option>
                    <option>12:00 PM – 02:00 PM</option>
                    <option>04:00 PM – 06:00 PM</option>
                    <option>06:00 PM – 08:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-[#CBD5E1] hover:border-[#0B7285] bg-[#F8FAFC] cursor-pointer px-4 text-center transition-colors">
                  <Upload className="w-4 h-4 text-[#0B7285] mb-1" />
                  <span className="text-xs font-bold text-[#334155]">
                    {refFile || 'Upload Reference Design Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setRefFile(f.name);
                    }}
                  />
                </label>

                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Neck depth, sleeve style, tassel preference, or fit notes..."
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                />
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Sticky Quote Summary */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-[#0B1F3A] font-serif-accent">
                Transparent Estimate
              </h3>

              <div className="space-y-2.5 text-xs sm:text-sm pb-4 border-b border-[#F1F5F9]">
                <div className="flex justify-between">
                  <span className="text-[#475569]">{selectedGarment.label}</span>
                  <span className="font-bold text-[#0B1F3A] tabular-nums">
                    ₹{selectedGarment.price}
                  </span>
                </div>
                {liningIncluded && (
                  <div className="flex justify-between">
                    <span className="text-[#475569]">Pure Cotton Lining</span>
                    <span className="font-bold text-[#0B1F3A] tabular-nums">₹150</span>
                  </div>
                )}
                {paddedCups && (
                  <div className="flex justify-between">
                    <span className="text-[#475569]">Padded Cups &amp; Piping</span>
                    <span className="font-bold text-[#0B1F3A] tabular-nums">₹180</span>
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
                  <p className="text-[11px] text-[#0B7285] font-semibold">
                    Zero advance · Pay after final quote
                  </p>
                </div>
                <span className="text-2xl font-extrabold text-[#0B1F3A] tabular-nums">
                  ₹{estimatedTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-[#0B1F3A] hover:bg-[#15325B] text-white font-bold text-sm py-3.5 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Confirm Measurement Visit
              </button>

              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-[#475569]">
                <ShieldCheck className="w-4 h-4 text-[#0B7285] shrink-0 mt-0.5" />
                <span>
                  Stitching never starts until you inspect and approve the tailor&apos;s final quote
                  and promised delivery date.
                </span>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

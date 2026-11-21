import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
  User,
  X,
} from 'lucide-react';
import { OrderRecord, TailorPartner } from '../types';
import { SafeImage } from './SafeImage';

export interface TailorProfileModalProps {
  tailor: TailorPartner | null;
  initialTab?: 'services' | 'portfolio' | 'reviews';
  isCompared: boolean;
  onToggleCompare: (tailorId: string) => void;
  onClose: () => void;
  onBookTailor: (tailor: TailorPartner, serviceId?: string, note?: string) => void;
}

export const TailorProfileModal: React.FC<TailorProfileModalProps> = ({
  tailor,
  initialTab = 'services',
  isCompared,
  onToggleCompare,
  onClose,
  onBookTailor,
}) => {
  const [activeTab, setActiveTab] = useState<'services' | 'portfolio' | 'reviews'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [tailor?.id, initialTab]);

  if (!tailor) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0B1F3A]/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${tailor.shopName} profile`}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-3xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover & Header */}
        <div className="relative h-44 sm:h-52 bg-[#0B1F3A] shrink-0">
          <SafeImage
            src={tailor.coverImage}
            alt={tailor.shopName}
            className="w-full h-full object-cover object-center opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A] via-[#0B1F3A]/45 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close tailor profile"
            className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-[#0B1F3A]/80 hover:bg-[#0B1F3A] text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-4 left-5 right-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-[#5EEAD4]">
                {tailor.verified && (
                  <span className="inline-flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Verified Master Tailor
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <span className="text-white/85">{tailor.yearsExperience} yrs experience</span>
              </div>
              <h2 className="font-serif-accent text-xl sm:text-2xl font-bold text-white leading-tight mt-0.5">
                {tailor.shopName}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 mt-0.5">
                Led by {tailor.masterTailor} · {tailor.locality}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-white shrink-0 tabular-nums">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Star className="w-4 h-4 fill-[#E2B14B] text-[#E2B14B]" />
                {tailor.rating.toFixed(1)}
                <span className="text-white/70 font-normal">({tailor.reviewCount})</span>
              </span>
              <span className="text-white/40" aria-hidden="true">
                |
              </span>
              <span className="inline-flex items-center gap-1 text-white/90">
                <MapPin className="w-3.5 h-3.5 text-[#5EEAD4]" />
                {tailor.distanceKm.toFixed(1)} km
              </span>
            </div>
          </div>
        </div>

        {/* Key Operational Facts Row (Zero-pill clean metadata) */}
        <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs text-[#334155] shrink-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {tailor.pickupAvailable ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#0B7285]">
                <Truck className="w-3.5 h-3.5" />
                Doorstep Pickup ({tailor.homeVisitFee === 0 ? 'Free' : `₹${tailor.homeVisitFee}`})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#475569]">
                <Store className="w-3.5 h-3.5" />
                Studio Visit Only
              </span>
            )}
            <span className="text-[#CBD5E1]" aria-hidden="true">
              ·
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-[#64748B]" />
              {tailor.workingHours} ({tailor.openNow ? 'Open Now' : 'Opens Tomorrow'})
            </span>
            <span className="text-[#CBD5E1]" aria-hidden="true">
              ·
            </span>
            <span className="tabular-nums">Turnaround: {tailor.turnaround}</span>
          </div>
          <span className="text-[#0B1F3A] font-semibold tabular-nums">
            {tailor.completedOrders}+ orders completed
          </span>
        </div>

        {/* Interactive Tabs */}
        <div className="px-5 border-b border-[#E2E8F0] flex items-center gap-6 bg-white shrink-0">
          {(
            [
              { id: 'services', label: `Services & Pricing (${tailor.services.length})` },
              { id: 'portfolio', label: `Previous Work (${tailor.portfolio.length})` },
              { id: 'reviews', label: `Reviews (${tailor.reviewCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#0B7285] text-[#0B1F3A]'
                  : 'border-transparent text-[#64748B] hover:text-[#0B1F3A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Bio & Specializations */}
          <div className="space-y-1.5">
            <p className="text-sm text-[#334155] leading-relaxed">{tailor.bio}</p>
            <p className="text-xs text-[#64748B]">
              <span className="font-semibold text-[#0B1F3A]">Specializations:</span>{' '}
              {tailor.specialties.join(' · ')}
            </p>
          </div>

          {activeTab === 'services' && (
            <div className="divide-y divide-[#E2E8F0] border-t border-b border-[#E2E8F0]">
              {tailor.services.map((srv) => (
                <div
                  key={srv.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#0B7285] font-medium">
                      <span>{srv.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#64748B]">{srv.turnaround}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-[#0B1F3A] mt-0.5">{srv.name}</h4>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      {srv.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="block text-base font-bold text-[#0B1F3A] tabular-nums">
                        ₹{srv.price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-[#64748B]">Starting rate</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onBookTailor(tailor, srv.id)}
                      className="px-3.5 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Book Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {tailor.portfolio.map((work) => (
                <div
                  key={work.id}
                  className="group border border-[#E2E8F0] rounded-xl overflow-hidden bg-white flex flex-col"
                >
                  <div className="aspect-[4/3] bg-[#F1F5F9] overflow-hidden">
                    <SafeImage
                      src={work.image}
                      alt={work.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0B7285]">
                        {work.category}
                      </p>
                      <h4 className="text-sm font-semibold text-[#0B1F3A] leading-snug mt-0.5">
                        {work.title}
                      </h4>
                      <p className="text-xs text-[#64748B] mt-1 tabular-nums">
                        ₹{work.price.toLocaleString('en-IN')} · {work.days}{' '}
                        {work.days === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onBookTailor(
                          tailor,
                          undefined,
                          `Interested in similar work: "${work.title}" (${work.category})`,
                        )
                      }
                      className="w-full py-1.5 rounded-lg border border-[#CBD5E1] hover:border-[#0B7285] hover:text-[#0B7285] text-xs font-semibold text-[#0B1F3A] transition-colors cursor-pointer"
                    >
                      Request Similar Style
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-[#0B1F3A] tabular-nums">
                    {tailor.rating.toFixed(1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 fill-[#C8922A] text-[#C8922A]"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
                      Based on {tailor.reviewCount} verified Tailering customer ratings
                    </p>
                  </div>
                </div>
                <div className="text-xs text-[#334155] space-y-0.5">
                  <p className="font-semibold text-[#0B1F3A]">Verified Fit & Delivery Record</p>
                  <p className="text-[#64748B]">
                    98% on-time delivery · 7-day complimentary refit protection
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span className="font-semibold text-[#0B1F3A]">{tailor.recentReview.author}</span>
                    <span>{tailor.recentReview.date}</span>
                  </div>
                  <p className="text-sm text-[#334155] mt-1.5 leading-relaxed">
                    “{tailor.recentReview.text}”
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span className="font-semibold text-[#0B1F3A]">Verified Tailering Client</span>
                    <span>2 weeks ago</span>
                  </div>
                  <p className="text-sm text-[#334155] mt-1.5 leading-relaxed">
                    “Clear quote approval before cutting, punctual pickup from {tailor.locality}, and
                    neat inner lining finishing.”
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer CTA */}
        <div className="px-5 py-3.5 bg-white border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onToggleCompare(tailor.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold border transition-colors cursor-pointer ${
              isCompared
                ? 'border-[#0B7285] bg-[#F0F9FA] text-[#0B7285]'
                : 'border-[#CBD5E1] text-[#334155] hover:border-[#0B1F3A] hover:text-[#0B1F3A]'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            {isCompared ? 'Added to Compare' : 'Add to Compare'}
          </button>

          <button
            type="button"
            onClick={() => onBookTailor(tailor)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B7285] hover:bg-[#085463] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            {tailor.pickupAvailable ? 'Schedule Pickup / Appointment' : 'Schedule Studio Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface TailorCompareModalProps {
  open: boolean;
  tailors: TailorPartner[];
  onRemove: (tailorId: string) => void;
  onClose: () => void;
  onBookTailor: (tailor: TailorPartner) => void;
  onViewProfile: (tailor: TailorPartner) => void;
}

export const TailorCompareModal: React.FC<TailorCompareModalProps> = ({
  open,
  tailors,
  onRemove,
  onClose,
  onBookTailor,
  onViewProfile,
}) => {
  if (!open || tailors.length === 0) return null;

  const lowestPrice = Math.min(...tailors.map((t) => t.startingPrice));
  const nearestDistance = Math.min(...tailors.map((t) => t.distanceKm));
  const highestRating = Math.max(...tailors.map((t) => t.rating));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0B1F3A]/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Compare tailors side by side"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-5xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#0B1F3A] text-white shrink-0">
          <div>
            <h2 className="font-serif-accent text-lg sm:text-xl font-bold">
              Compare Tailors Side-by-Side
            </h2>
            <p className="text-xs text-white/75 mt-0.5">
              Comparing {tailors.length} nearby ateliers on pricing, pickup availability, turnaround,
              and portfolio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comparison"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="py-3 pr-4 w-40 text-xs font-semibold uppercase tracking-wider text-[#64748B] align-top">
                    Comparison Criteria
                  </th>
                  {tailors.map((t) => (
                    <th key={t.id} className="py-3 px-3 align-top min-w-[210px]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            type="button"
                            onClick={() => onViewProfile(t)}
                            className="text-sm font-bold text-[#0B1F3A] hover:text-[#0B7285] text-left transition-colors cursor-pointer"
                          >
                            {t.shopName}
                          </button>
                          <p className="text-xs text-[#64748B] font-normal mt-0.5">
                            {t.masterTailor} · {t.yearsExperience} yrs
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(t.id)}
                          aria-label={`Remove ${t.shopName} from comparison`}
                          className="p-1 text-[#94A3B8] hover:text-[#0B1F3A] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs sm:text-sm text-[#334155]">
                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#0B1F3A]">Distance & Area</td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 tabular-nums">
                      <span
                        className={
                          t.distanceKm === nearestDistance
                            ? 'font-bold text-[#0B7285]'
                            : 'font-medium text-[#0B1F3A]'
                        }
                      >
                        {t.distanceKm.toFixed(1)} km away
                      </span>
                      <span className="block text-xs text-[#64748B]">{t.locality}</span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#0B1F3A]">Rating & Orders</td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 tabular-nums">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#0B1F3A]">
                        <Star className="w-3.5 h-3.5 fill-[#C8922A] text-[#C8922A]" />
                        {t.rating.toFixed(1)}
                        {t.rating === highestRating && (
                          <span className="text-[11px] font-semibold text-[#A67418] ml-1">
                            Top Rated
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-[#64748B]">
                        {t.reviewCount} reviews · {t.completedOrders}+ orders
                      </span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#0B1F3A]">Starting Price</td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 tabular-nums">
                      <span
                        className={`text-base font-bold ${
                          t.startingPrice === lowestPrice ? 'text-[#0B7285]' : 'text-[#0B1F3A]'
                        }`}
                      >
                        ₹{t.startingPrice.toLocaleString('en-IN')}
                      </span>
                      {t.startingPrice === lowestPrice && (
                        <span className="block text-[11px] font-semibold text-[#0B7285]">
                          Most Affordable
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#0B1F3A]">Doorstep Pickup</td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3">
                      {t.pickupAvailable ? (
                        <div>
                          <span className="inline-flex items-center gap-1 font-semibold text-[#0B7285]">
                            <Truck className="w-3.5 h-3.5" />
                            Available ({t.homeVisitFee === 0 ? 'Free' : `₹${t.homeVisitFee}`})
                          </span>
                          <span className="block text-xs text-[#64748B] mt-0.5">
                            Next: {t.nextPickupSlot}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#64748B] font-medium">
                          <Store className="w-3.5 h-3.5" />
                          Studio Visit Only
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#0B1F3A]">Turnaround & Hours</td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 tabular-nums">
                      <span className="font-semibold text-[#0B1F3A]">{t.turnaround}</span>
                      <span className="block text-xs text-[#64748B]">{t.workingHours}</span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#0B1F3A] align-top">
                    Specializations
                  </td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 align-top text-xs leading-relaxed">
                      {t.specialties.join(' · ')}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#0B1F3A] align-top">
                    Popular Services
                  </td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 align-top">
                      <ul className="space-y-1.5 text-xs">
                        {t.services.slice(0, 3).map((s) => (
                          <li key={s.id} className="flex items-start justify-between gap-2">
                            <span className="text-[#334155]">{s.name}</span>
                            <span className="font-semibold text-[#0B1F3A] shrink-0 tabular-nums">
                              ₹{s.price}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#0B1F3A] align-top">
                    Previous Work
                  </td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 align-top">
                      <div className="grid grid-cols-2 gap-1.5">
                        {t.portfolio.slice(0, 2).map((w) => (
                          <div
                            key={w.id}
                            className="aspect-[4/3] rounded-lg overflow-hidden bg-[#F1F5F9]"
                          >
                            <SafeImage
                              src={w.image}
                              alt={w.title}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-4 pr-4" />
                  {tailors.map((t) => (
                    <td key={t.id} className="py-4 px-3">
                      <button
                        type="button"
                        onClick={() => onBookTailor(t)}
                        className="w-full py-2.5 px-3 rounded-lg bg-[#0B7285] hover:bg-[#085463] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                      >
                        Book {t.shopName.split(' ')[0]}
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface QuickBookModalProps {
  tailor: TailorPartner | null;
  initialServiceId?: string;
  initialNote?: string;
  locality: string;
  onClose: () => void;
  onConfirmBooking: (order: OrderRecord) => void;
  onNotifyToast: (msg: string) => void;
}

interface UpcomingDateOption {
  iso: string;
  dayLabel: string;
  dateLabel: string;
}

function buildUpcomingDates(): UpcomingDateOption[] {
  const result: UpcomingDateOption[] = [];
  const today = new Date();
  for (let offset = 0; offset < 5; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    const iso = d.toISOString().split('T')[0];
    const dayLabel =
      offset === 0
        ? 'Today'
        : offset === 1
          ? 'Tomorrow'
          : d.toLocaleDateString('en-IN', { weekday: 'short' });
    const dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    result.push({ iso, dayLabel, dateLabel });
  }
  return result;
}

export const QuickBookModal: React.FC<QuickBookModalProps> = ({
  tailor,
  initialServiceId,
  initialNote = '',
  locality,
  onClose,
  onConfirmBooking,
  onNotifyToast,
}) => {
  const dateOptions = useMemo(() => buildUpcomingDates(), []);

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [appointmentMode, setAppointmentMode] = useState<'pickup' | 'studio'>('pickup');
  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[0].iso);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    if (!tailor) return;
    setSelectedServiceId(initialServiceId || tailor.services[0]?.id || 'custom');
    setAppointmentMode(tailor.pickupAvailable ? 'pickup' : 'studio');
    setSelectedDate(dateOptions[tailor.openNow ? 0 : 1].iso);
    setSelectedSlot(tailor.pickupSlots[0] || '10:00 AM – 12:00 PM');
    setNotes(initialNote);
    setFormError(null);
    setConfirmedOrder(null);
  }, [tailor, initialServiceId, initialNote, dateOptions]);

  if (!tailor) return null;

  const chosenService = tailor.services.find((s) => s.id === selectedServiceId);
  const estimatedPrice = chosenService ? chosenService.price : tailor.startingPrice;
  const pickupFee =
    appointmentMode === 'pickup' && tailor.pickupAvailable ? tailor.homeVisitFee : 0;
  const totalEstimate = estimatedPrice + pickupFee;

  const formattedSelectedDate = (() => {
    const found = dateOptions.find((d) => d.iso === selectedDate);
    if (found) return `${found.dayLabel}, ${found.dateLabel}`;
    const parsed = new Date(`${selectedDate}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? selectedDate
      : parsed.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  })();

  const handleSubmit = (e: React.FormEvent) => {
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
    if (appointmentMode === 'pickup' && tailor.pickupAvailable && !addressLine.trim()) {
      setFormError('Please enter your flat/house address for doorstep pickup.');
      return;
    }

    const orderNum = Math.floor(1100 + Math.random() * 8800);
    const serviceLabel = chosenService ? chosenService.name : 'Custom Tailoring Consultation';
    const modeLabel =
      appointmentMode === 'pickup' && tailor.pickupAvailable
        ? `Doorstep Pickup (${addressLine.trim()})`
        : 'Boutique Studio Appointment';

    const delivery = new Date(`${selectedDate}T00:00:00`);
    if (!Number.isNaN(delivery.getTime())) {
      delivery.setDate(delivery.getDate() + Math.max(1, tailor.turnaroundDays));
    }
    const deliveryDateStr = Number.isNaN(delivery.getTime())
      ? tailor.turnaround
      : delivery.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const newOrder: OrderRecord = {
      id: `TLR-2026-${orderNum}`,
      serviceTitle: serviceLabel,
      type: chosenService?.category.toLowerCase().includes('alteration')
        ? 'alteration'
        : chosenService?.category.toLowerCase().includes('uniform')
          ? 'uniform'
          : 'custom',
      tailorName: tailor.shopName,
      locality,
      createdAt: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      deliveryDate: deliveryDateStr,
      amount: totalEstimate,
      stage: 'Visit Scheduled',
      itemsSummary: `${serviceLabel} · ${modeLabel} · ${formattedSelectedDate} (${selectedSlot})${
        notes.trim() ? ` · Note: ${notes.trim()}` : ''
      }`,
      quoteApproved: false,
    };

    onConfirmBooking(newOrder);
    onNotifyToast(
      `Appointment ${newOrder.id} booked with ${tailor.shopName} for ${formattedSelectedDate}.`,
    );
    setConfirmedOrder(newOrder);
    setFormError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0B1F3A]/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Book appointment with ${tailor.shopName}`}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#0B1F3A] text-white flex items-start justify-between gap-3 shrink-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5EEAD4]">
              Quick Appointment & Pickup Scheduler
            </p>
            <h2 className="font-serif-accent text-lg sm:text-xl font-bold mt-0.5">
              {tailor.shopName}
            </h2>
            <p className="text-xs text-white/75 mt-0.5">
              {tailor.masterTailor} · {tailor.locality} ({tailor.distanceKm.toFixed(1)} km)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking dialog"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {confirmedOrder ? (
          <div className="p-6 overflow-y-auto space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-[#F0F9FA] text-[#0B7285] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0B1F3A]">Appointment Confirmed</h3>
                <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
                  Your booking has been sent to <span className="font-semibold">{tailor.shopName}</span>.
                  Final stitching starts only after you approve the written quotation.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Booking ID</span>
                <span className="font-bold text-[#0B1F3A] tabular-nums">{confirmedOrder.id}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Service</span>
                <span className="font-semibold text-[#0B1F3A] text-right">
                  {confirmedOrder.serviceTitle}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Mode</span>
                <span className="font-semibold text-[#0B7285]">
                  {appointmentMode === 'pickup' && tailor.pickupAvailable
                    ? 'Doorstep Pickup & Measurement'
                    : 'Boutique Studio Visit'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Scheduled Slot</span>
                <span className="font-semibold text-[#0B1F3A] tabular-nums">
                  {formattedSelectedDate} · {selectedSlot}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Estimated Delivery</span>
                <span className="font-semibold text-[#0B1F3A] tabular-nums">
                  {confirmedOrder.deliveryDate}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E2E8F0] flex justify-between gap-2">
                <span className="font-semibold text-[#0B1F3A]">Estimated Amount</span>
                <span className="font-bold text-[#0B1F3A] tabular-nums">
                  ₹{confirmedOrder.amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-[#475569] bg-[#FBF5E6] border border-[#E8D5A8] rounded-xl p-3">
              <ShieldCheck className="w-4 h-4 text-[#A67418] shrink-0 mt-0.5" />
              <span>
                You can track live order progress and approve your tailor&apos;s quote anytime in{' '}
                <strong className="text-[#0B1F3A]">Alterations → History</strong>.
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-lg bg-[#0B1F3A] hover:bg-[#15325B] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Done & Back to Tailors
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Step 1: Select Service */}
            <div>
              <label
                htmlFor="booking-service"
                className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3A] mb-2"
              >
                1. Choose Tailoring Service
              </label>
              <select
                id="booking-service"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] bg-white text-sm font-medium text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
              >
                {tailor.services.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} — ₹{srv.price.toLocaleString('en-IN')} ({srv.turnaround})
                  </option>
                ))}
                <option value="custom">
                  Custom / Multiple Garments (Quote after measurement)
                </option>
              </select>
            </div>

            {/* Step 2: Pickup vs Studio Visit */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3A] mb-2">
                2. Service Mode
              </span>
              {tailor.pickupAvailable ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAppointmentMode('pickup')}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      appointmentMode === 'pickup'
                        ? 'border-[#0B7285] bg-[#F0F9FA]'
                        : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1F3A]">
                        <Truck className="w-4 h-4 text-[#0B7285]" />
                        Doorstep Pickup
                      </span>
                      {appointmentMode === 'pickup' && (
                        <Check className="w-4 h-4 text-[#0B7285]" />
                      )}
                    </div>
                    <p className="text-xs text-[#475569] mt-1">
                      Master tailor visits for measurement & fabric pickup (
                      {tailor.homeVisitFee === 0 ? 'Free' : `₹${tailor.homeVisitFee}`}).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppointmentMode('studio')}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      appointmentMode === 'studio'
                        ? 'border-[#0B7285] bg-[#F0F9FA]'
                        : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1F3A]">
                        <Store className="w-4 h-4 text-[#0B7285]" />
                        Studio Appointment
                      </span>
                      {appointmentMode === 'studio' && (
                        <Check className="w-4 h-4 text-[#0B7285]" />
                      )}
                    </div>
                    <p className="text-xs text-[#475569] mt-1">
                      Visit {tailor.locality} studio directly (No visit fee).
                    </p>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-2.5 text-xs text-[#475569]">
                  <Store className="w-4 h-4 text-[#0B1F3A] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#0B1F3A]">Boutique Studio Visit Only</p>
                    <p className="mt-0.5">
                      Doorstep pickup is currently unavailable for this workshop. Reserve a
                      zero-wait appointment slot at their {tailor.locality} studio.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Date & Time Slot */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
                  3. Select {appointmentMode === 'pickup' && tailor.pickupAvailable ? 'Pickup' : 'Appointment'} Date & Time
                </span>
                <label className="text-[11px] font-medium text-[#0B7285] inline-flex items-center gap-1">
                  <span>Other date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    min={dateOptions[0].iso}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[11px] text-[#0B1F3A]"
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
                          ? 'border-[#0B1F3A] bg-[#0B1F3A] text-white'
                          : 'border-[#E2E8F0] bg-white text-[#334155] hover:border-[#0B7285]'
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
                {tailor.pickupSlots.map((slot) => {
                  const active = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer tabular-nums ${
                        active
                          ? 'border-[#0B7285] bg-[#F0F9FA] text-[#0B7285]'
                          : 'border-[#E2E8F0] text-[#334155] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Contact & Pickup Address */}
            <div className="space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
                4. Your Details
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                  />
                </div>
              </div>

              {appointmentMode === 'pickup' && tailor.pickupAvailable && (
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder={`Flat / Villa No., Street (${locality})`}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                  />
                </div>
              )}

              <div className="relative">
                <Scissors className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional garment notes (e.g., silk blouse with cotton lining, 2 trousers for hem)..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#CBD5E1] text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285] resize-none"
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            {/* Estimate Summary & Submit */}
            <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <span className="text-[#64748B]">Estimated total</span>
                  <span className="block text-[11px] text-[#64748B]">
                    Pay only after final quote approval · {formattedSelectedDate}
                  </span>
                </div>
                <span className="text-lg font-bold text-[#0B1F3A] tabular-nums">
                  ₹{totalEstimate.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-[#0B7285] hover:bg-[#085463] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Confirm {appointmentMode === 'pickup' && tailor.pickupAvailable ? 'Pickup & Appointment' : 'Studio Appointment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

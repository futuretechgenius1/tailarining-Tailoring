import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  MessageSquarePlus,
  Phone,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
  User,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  OrderRecord,
  TailorPartner,
  TailorRatingBreakdown,
  TailorReviewItem,
  UserSession,
} from '../types';
import {
  customerReviewApi,
  mapPublicTailorToPartner,
  publicApi,
  TailorPortfolioItem,
} from '../services/api';
import { SafeImage } from './SafeImage';
import { TailorLogoBadge } from './TailorLogoBadge';

export type TailorProfileTab = 'services' | 'portfolio' | 'reviews';

export interface TailorProfileModalProps {
  tailor: TailorPartner | null;
  initialTab?: TailorProfileTab;
  isCompared?: boolean;
  onToggleCompare?: (tailorId: string) => void;
  user?: UserSession | null;
  onRequireSignIn?: () => void;
  onNotifyToast?: (msg: string) => void;
  onReviewSubmitted?: () => void;
  onClose: () => void;
  onBookTailor: (tailor: TailorPartner, serviceId?: string, note?: string) => void;
}

const EMPTY_BREAKDOWN: TailorRatingBreakdown = {
  '5': 0,
  '4': 0,
  '3': 0,
  '2': 0,
  '1': 0,
};

function formatReviewDate(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Recently';
  const diffMs = Date.now() - dt.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatCategoryLabel(raw: string): string {
  if (!raw) return 'Custom';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export const TailorProfileModal: React.FC<TailorProfileModalProps> = ({
  tailor,
  initialTab = 'services',
  isCompared = false,
  onToggleCompare,
  user = null,
  onRequireSignIn,
  onNotifyToast,
  onReviewSubmitted,
  onClose,
  onBookTailor,
}) => {
  const [activeTab, setActiveTab] = useState<TailorProfileTab>(initialTab);
  const [liveTailor, setLiveTailor] = useState<TailorPartner | null>(tailor);
  const [portfolioItems, setPortfolioItems] = useState<TailorPortfolioItem[]>([]);
  const [reviews, setReviews] = useState<TailorReviewItem[]>([]);
  const [ratingBreakdown, setRatingBreakdown] = useState<TailorRatingBreakdown>(EMPTY_BREAKDOWN);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Gallery filter & Lightbox state
  const [galleryCategory, setGalleryCategory] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Customer review composer state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewService, setReviewService] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);

  const numericTailorId = useMemo(() => {
    if (!tailor) return null;
    if (tailor.dbId && Number.isInteger(tailor.dbId) && tailor.dbId > 0) return tailor.dbId;
    const parsed = Number(tailor.id);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [tailor]);

  const loadTailorDetail = useCallback(async (tid: number) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const res = await publicApi.tailorDetail(tid);
      const detail = res.tailor;
      setLiveTailor(mapPublicTailorToPartner(detail));
      setPortfolioItems(detail.portfolio || []);
      setReviews(detail.reviews || []);
      setRatingBreakdown(detail.ratingBreakdown || EMPTY_BREAKDOWN);
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : 'Unable to load latest shop details from database.',
      );
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
    setLiveTailor(tailor);
    setGalleryCategory('all');
    setLightboxIndex(null);
    setShowReviewForm(false);
    setReviewRating(5);
    setReviewService('');
    setReviewComment('');
    setReviewFormError(null);
    setReviews([]);
    setRatingBreakdown(EMPTY_BREAKDOWN);
    setPortfolioItems([]);

    if (tailor && numericTailorId) {
      void loadTailorDetail(numericTailorId);
    }
  }, [tailor, numericTailorId, initialTab, loadTailorDetail]);

  const activeTailor = liveTailor || tailor;

  // Derived gallery items (prefer live DB portfolioItems; fallback to prop portfolio while initial fetch loads)
  const displayGallery = useMemo(() => {
    if (portfolioItems.length > 0) {
      return portfolioItems.map((item) => {
        const captionParts = (item.caption || '').split('·');
        const displayCategory = captionParts[0]?.trim() || formatCategoryLabel(item.category);
        const tagLine = captionParts.length > 1 ? captionParts.slice(1).join('·').trim() : '';
        return {
          id: String(item.id),
          title: item.title,
          rawCategory: item.category,
          categoryLabel: displayCategory,
          tagLine,
          image: item.imageUrl,
          price: item.priceHint,
          days: item.turnaroundDays,
          isFeatured: item.isFeatured,
        };
      });
    }
    if (loadingDetail && activeTailor?.portfolio.length) {
      return activeTailor.portfolio.map((w) => ({
        id: w.id,
        title: w.title,
        rawCategory: w.category.toLowerCase(),
        categoryLabel: w.category,
        tagLine: w.tags.join(', '),
        image: w.image,
        price: w.price,
        days: w.days,
        isFeatured: Boolean(w.isFeatured),
      }));
    }
    return [];
  }, [portfolioItems, loadingDetail, activeTailor]);

  const galleryCategories = useMemo(() => {
    const set = new Set<string>();
    displayGallery.forEach((item) => {
      if (item.rawCategory) set.add(item.rawCategory.toLowerCase());
    });
    return ['all', ...Array.from(set)];
  }, [displayGallery]);

  const filteredGallery = useMemo(() => {
    if (galleryCategory === 'all') return displayGallery;
    return displayGallery.filter((item) => item.rawCategory.toLowerCase() === galleryCategory);
  }, [displayGallery, galleryCategory]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight' && filteredGallery.length > 1) {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev + 1) % filteredGallery.length,
        );
      } else if (e.key === 'ArrowLeft' && filteredGallery.length > 1) {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev - 1 + filteredGallery.length) % filteredGallery.length,
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, filteredGallery.length]);

  const totalBreakdownCount = useMemo(
    () =>
      ratingBreakdown['5'] +
      ratingBreakdown['4'] +
      ratingBreakdown['3'] +
      ratingBreakdown['2'] +
      ratingBreakdown['1'],
    [ratingBreakdown],
  );

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numericTailorId) return;
    const trimmed = reviewComment.trim();
    if (trimmed.length < 8) {
      setReviewFormError('Please share at least 8 characters about your stitching experience.');
      return;
    }

    setSubmittingReview(true);
    setReviewFormError(null);
    try {
      const res = await customerReviewApi.create(numericTailorId, {
        rating: reviewRating,
        serviceName: reviewService.trim() || undefined,
        comment: trimmed,
      });
      setReviews((prev) => [res.review, ...prev]);
      setRatingBreakdown(res.ratingBreakdown);
      setLiveTailor((prev) =>
        prev
          ? {
              ...prev,
              rating: res.rating,
              reviewCount: res.totalReviews,
              recentReview: {
                author: res.review.reviewerName,
                text: res.review.comment,
                date: 'Today',
              },
            }
          : prev,
      );
      setReviewComment('');
      setReviewService('');
      setReviewRating(5);
      setShowReviewForm(false);
      onNotifyToast?.(res.message || 'Your review has been published!');
      onReviewSubmitted?.();
    } catch (err) {
      setReviewFormError(err instanceof Error ? err.message : 'Unable to submit review right now.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!tailor || !activeTailor) return null;

  const activeLightboxItem =
    lightboxIndex !== null && filteredGallery[lightboxIndex]
      ? filteredGallery[lightboxIndex]
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1A103D]/65 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${activeTailor.shopName} shop profile`}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-4xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-[#EAE0FA] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover & Atelier Identity Header */}
        <div className="relative h-44 sm:h-52 bg-[#1A103D] shrink-0">
          <SafeImage
            src={activeTailor.coverImage}
            alt={activeTailor.shopName}
            className="w-full h-full object-cover object-center opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A103D] via-[#1A103D]/55 to-[#1A103D]/15" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close tailor shop profile"
            className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-[#1A103D]/80 hover:bg-[#6B21D9] text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-4 left-5 right-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <TailorLogoBadge
                logoUrl={activeTailor.logoUrl}
                shopName={activeTailor.shopName}
                size="lg"
                className="ring-2 ring-white/90 shadow-lg"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#D8B4FE]">
                  {activeTailor.verified && (
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Verified Master Atelier
                    </span>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="text-white/90">{activeTailor.yearsExperience} yrs craft heritage</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mt-0.5 truncate font-editorial">
                  {activeTailor.shopName}
                </h2>
                <p className="text-xs sm:text-sm text-white/85 mt-0.5 truncate">
                  Master {activeTailor.masterTailor} · {activeTailor.address || activeTailor.locality}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-white shrink-0 tabular-nums bg-[#1A103D]/65 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/15">
              <span className="inline-flex items-center gap-1 font-bold">
                <Star className="w-4 h-4 fill-[#FBBF24] text-[#FBBF24]" />
                {activeTailor.rating.toFixed(1)}
                <span className="text-white/75 font-normal">({activeTailor.reviewCount})</span>
              </span>
              <span className="text-white/35" aria-hidden="true">
                |
              </span>
              <span className="inline-flex items-center gap-1 text-white/90">
                <MapPin className="w-3.5 h-3.5 text-[#D8B4FE]" />
                {activeTailor.distanceKm.toFixed(1)} km
              </span>
            </div>
          </div>
        </div>

        {/* Operational Facts Strip */}
        <div className="px-5 py-3 bg-[#FAF8FF] border-b border-[#EAE0FA] flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs text-[#334155] shrink-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {activeTailor.pickupAvailable ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#6B21D9]">
                <Truck className="w-3.5 h-3.5" />
                Doorstep Pickup (
                {activeTailor.homeVisitFee === 0 ? 'Free' : `₹${activeTailor.homeVisitFee}`})
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
              {activeTailor.workingHours} (
              <span className={activeTailor.openNow ? 'text-emerald-700 font-semibold' : ''}>
                {activeTailor.openNow ? 'Open Now' : 'Opens Tomorrow'}
              </span>
              )
            </span>
            <span className="text-[#CBD5E1]" aria-hidden="true">
              ·
            </span>
            <span className="tabular-nums">Turnaround: {activeTailor.turnaround}</span>
          </div>
          <span className="text-[#1A103D] font-bold tabular-nums">
            {activeTailor.completedOrders}+ orders stitched
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 border-b border-[#EAE0FA] flex items-center gap-5 sm:gap-7 bg-white shrink-0 overflow-x-auto no-scrollbar">
          {(
            [
              {
                id: 'services',
                label: `Specializations & Rates (${activeTailor.services.length})`,
              },
              {
                id: 'portfolio',
                label: `Past Work Gallery (${displayGallery.length})`,
              },
              {
                id: 'reviews',
                label: `Customer Reviews (${reviews.length || activeTailor.reviewCount})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#6B21D9] text-[#1A103D]'
                  : 'border-transparent text-[#64748B] hover:text-[#1A103D]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {detailError && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-3 text-xs text-amber-900">
              <span>{detailError}</span>
              {numericTailorId && (
                <button
                  type="button"
                  onClick={() => void loadTailorDetail(numericTailorId)}
                  className="inline-flex items-center gap-1 font-bold text-[#6B21D9] hover:underline shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              )}
            </div>
          )}

          {/* TAB 1: SPECIALIZATIONS & SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              {/* Atelier Story + Specializations Grid */}
              <div className="rounded-2xl bg-[#FAF8FF] border border-[#EAE0FA] p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B21D9]">
                      <Award className="w-3.5 h-3.5" />
                      Atelier Craft &amp; Specializations
                    </p>
                    <p className="text-sm text-[#334155] leading-relaxed">{activeTailor.bio}</p>
                  </div>
                </div>

                {/* Live DB Specializations Grid */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2.5">
                    Signature Specializations ({activeTailor.specialties.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {activeTailor.specialties.map((spec) => (
                      <div
                        key={spec}
                        className="flex items-start gap-2.5 bg-white rounded-xl border border-[#EAE0FA] px-3.5 py-2.5 shadow-2xs"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#F4EEFF] text-[#6B21D9] flex items-center justify-center shrink-0 mt-0.5">
                          <Scissors className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1A103D] leading-snug">{spec}</p>
                          <p className="text-[11px] text-[#64748B] mt-0.5">
                            In-house master pattern &amp; trial fit
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Service Rate Card from MySQL */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-bold text-[#1A103D] font-editorial">
                    Tailoring Services &amp; Starting Rates
                  </h3>
                  <span className="text-xs text-[#64748B]">
                    Final quote confirmed before cutting
                  </span>
                </div>

                <div className="divide-y divide-[#EAE0FA] border border-[#EAE0FA] rounded-2xl overflow-hidden bg-white">
                  {activeTailor.services.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8FF]/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-[#6B21D9] font-semibold">
                          <span>{srv.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#64748B]">{srv.turnaround}</span>
                        </div>
                        <h4 className="text-sm font-bold text-[#1A103D] mt-0.5">{srv.name}</h4>
                        <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                          {srv.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-left sm:text-right">
                          <span className="block text-base font-extrabold text-[#1A103D] tabular-nums">
                            ₹{srv.price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] text-[#64748B]">Starting rate</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onBookTailor(activeTailor, srv.id)}
                          className="px-4 py-2 rounded-xl bg-[#1A103D] hover:bg-[#6B21D9] text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Book Service
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAST WORK GALLERY (LIVE MYSQL PORTFOLIO ITEMS) */}
          {activeTab === 'portfolio' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#1A103D] font-editorial">
                    Gallery of Past Work
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Real garments stitched by {activeTailor.shopName}. Click any photo to inspect
                    finishing details up close.
                  </p>
                </div>

                {galleryCategories.length > 2 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {galleryCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setGalleryCategory(cat);
                          setLightboxIndex(null);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                          galleryCategory === cat
                            ? 'bg-[#6B21D9] border-[#6B21D9] text-white'
                            : 'bg-white border-[#EAE0FA] text-[#4B3F6B] hover:border-[#6B21D9] hover:text-[#6B21D9]'
                        }`}
                      >
                        {cat === 'all' ? `All (${displayGallery.length})` : formatCategoryLabel(cat)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {loadingDetail && displayGallery.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="rounded-xl border border-[#EAE0FA] overflow-hidden bg-white"
                    >
                      <div className="aspect-[4/3] bg-[#F3ECFC] animate-pulse" />
                      <div className="p-3 space-y-2">
                        <div className="h-3 w-20 bg-[#EAE0FA] rounded animate-pulse" />
                        <div className="h-4 w-3/4 bg-[#EAE0FA] rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredGallery.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DDD0FA] bg-[#FAF8FF] p-10 text-center space-y-2">
                  <ImageIcon className="w-8 h-8 text-[#8B5CF6] mx-auto" />
                  <p className="text-sm font-bold text-[#1A103D]">
                    No portfolio photos uploaded in this category yet
                  </p>
                  <p className="text-xs text-[#64748B]">
                    You can still book a doorstep consultation or share your own reference photo
                    during scheduling.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGallery.map((work, index) => (
                    <div
                      key={work.id}
                      className="group border border-[#EAE0FA] hover:border-[#C4B5FD] rounded-2xl overflow-hidden bg-white flex flex-col shadow-2xs hover:shadow-md transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className="relative aspect-[4/3] bg-[#F5F0FC] overflow-hidden cursor-pointer text-left"
                      >
                        <SafeImage
                          src={work.image}
                          alt={work.title}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-[#1A103D]/0 group-hover:bg-[#1A103D]/30 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 bg-white/95 text-[#1A103D] text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                            <ZoomIn className="w-3.5 h-3.5 text-[#6B21D9]" />
                            Inspect Work
                          </span>
                        </div>
                        {work.isFeatured && (
                          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-[#1A103D]/85 text-[#FDE68A] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-xs">
                            <Sparkles className="w-3 h-3" />
                            Featured
                          </span>
                        )}
                      </button>

                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B21D9] truncate">
                              {work.categoryLabel}
                            </p>
                            {work.days !== null && work.days !== undefined && (
                              <span className="text-[11px] text-[#64748B] shrink-0 tabular-nums">
                                {work.days} {work.days === 1 ? 'day' : 'days'}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-[#1A103D] leading-snug mt-0.5">
                            {work.title}
                          </h4>
                          {work.tagLine && (
                            <p className="text-[11.5px] text-[#64748B] mt-1 line-clamp-2">
                              {work.tagLine}
                            </p>
                          )}
                          {work.price !== null && work.price !== undefined && (
                            <p className="text-xs font-extrabold text-[#1A103D] mt-1.5 tabular-nums">
                              Indicative: ₹{Number(work.price).toLocaleString('en-IN')}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onBookTailor(
                              activeTailor,
                              undefined,
                              `Interested in similar work: "${work.title}" (${work.categoryLabel})`,
                            )
                          }
                          className="w-full py-2 rounded-xl border border-[#DDD0FA] hover:border-[#6B21D9] hover:bg-[#FAF5FF] hover:text-[#6B21D9] text-xs font-bold text-[#1A103D] transition-colors cursor-pointer"
                        >
                          Request Similar Style
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOMER REVIEWS (100% LIVE MYSQL tailor_reviews) */}
          {activeTab === 'reviews' && (
            <div className="space-y-5">
              {/* Rating Summary + 5★..1★ Breakdown + Write Review Action */}
              <div className="rounded-2xl bg-[#FAF8FF] border border-[#EAE0FA] p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                <div className="md:col-span-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#1A103D] text-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                    <span className="text-2xl font-extrabold leading-none tabular-nums">
                      {activeTailor.rating.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-[#D8B4FE] font-semibold mt-0.5">
                      out of 5
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(activeTailor.rating)
                              ? 'fill-[#F59E0B] text-[#F59E0B]'
                              : 'text-[#CBD5E1]'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-bold text-[#1A103D] mt-1 tabular-nums">
                      {activeTailor.reviewCount} verified customer ratings
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      7-day complimentary refit protection
                    </p>
                  </div>
                </div>

                {/* Live 5★–1★ Histogram from DB */}
                <div className="md:col-span-5 space-y-1.5">
                  {(['5', '4', '3', '2', '1'] as const).map((starKey) => {
                    const count = ratingBreakdown[starKey] || 0;
                    const pct =
                      totalBreakdownCount > 0
                        ? Math.round((count / totalBreakdownCount) * 100)
                        : 0;
                    return (
                      <div key={starKey} className="flex items-center gap-2 text-xs tabular-nums">
                        <span className="w-8 font-bold text-[#4B3F6B] inline-flex items-center gap-0.5 shrink-0">
                          {starKey}
                          <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-[#EAE0FA] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#6B21D9] transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-7 text-right text-[11px] font-semibold text-[#64748B]">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Write a Review CTA */}
                <div className="md:col-span-3 flex flex-col items-stretch sm:items-end justify-center gap-2">
                  {user?.role === 'customer' ? (
                    <button
                      type="button"
                      onClick={() => setShowReviewForm((prev) => !prev)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#6B21D9] hover:bg-[#581C87] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                      {showReviewForm ? 'Close Review Form' : 'Write a Review'}
                    </button>
                  ) : !user ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequireSignIn?.();
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#6B21D9] bg-white hover:bg-[#F5EFFB] text-[#6B21D9] text-xs font-bold transition-colors cursor-pointer"
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                      Sign In to Review
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#64748B] text-right">
                      Customer accounts can publish verified shop reviews.
                    </span>
                  )}
                </div>
              </div>

              {/* Inline Customer Review Submission Form */}
              {showReviewForm && user?.role === 'customer' && (
                <form
                  onSubmit={handleSubmitReview}
                  className="rounded-2xl border border-[#D8B4FE] bg-white p-4 sm:p-5 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#1A103D]">
                        Rate Your Experience with {activeTailor.shopName}
                      </h4>
                      <p className="text-xs text-[#64748B]">
                        Posting as <strong className="text-[#1A103D]">{user.name}</strong> ·{' '}
                        {user.locality}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                        Your Star Rating
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const active = (hoverRating ?? reviewRating) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(null)}
                              onClick={() => setReviewRating(star)}
                              aria-label={`Rate ${star} out of 5 stars`}
                              className="p-1 cursor-pointer transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  active
                                    ? 'fill-[#F59E0B] text-[#F59E0B]'
                                    : 'text-[#CBD5E1]'
                                }`}
                              />
                            </button>
                          );
                        })}
                        <span className="ml-1.5 text-xs font-bold text-[#1A103D] tabular-nums">
                          {reviewRating}.0 / 5
                        </span>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="review-service-select"
                        className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5"
                      >
                        Service Availed (Optional)
                      </label>
                      <select
                        id="review-service-select"
                        value={reviewService}
                        onChange={(e) => setReviewService(e.target.value)}
                        className="w-full rounded-xl border border-[#DDD0FA] bg-[#FAF8FF] px-3 py-2 text-xs text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                      >
                        <option value="">General Tailoring Experience</option>
                        {activeTailor.services.map((srv) => (
                          <option key={srv.id} value={srv.name}>
                            {srv.name}
                          </option>
                        ))}
                        {activeTailor.specialties.map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="review-comment-input"
                      className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5"
                    >
                      Your Review
                    </label>
                    <textarea
                      id="review-comment-input"
                      rows={3}
                      maxLength={1000}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share details on stitching finish, measurement accuracy, pickup punctuality, and delivery..."
                      className="w-full rounded-xl border border-[#DDD0FA] bg-white px-3.5 py-2.5 text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>Minimum 8 characters</span>
                      <span className="tabular-nums">{reviewComment.trim().length} / 1000</span>
                    </div>
                  </div>

                  {reviewFormError && (
                    <p className="text-xs font-semibold text-rose-600">{reviewFormError}</p>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="px-4 py-2 rounded-xl border border-[#DDD0FA] text-xs font-bold text-[#4B3F6B] hover:bg-[#FAF8FF] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#6B21D9] hover:bg-[#581C87] disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
                    >
                      {submittingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Publish Review
                    </button>
                  </div>
                </form>
              )}

              {/* Live Customer Reviews Feed from MySQL */}
              {loadingDetail && reviews.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="p-4 rounded-2xl border border-[#EAE0FA] bg-white space-y-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EFE5FB] animate-pulse" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-32 bg-[#EAE0FA] rounded animate-pulse" />
                          <div className="h-3 w-24 bg-[#F3ECFC] rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="h-4 w-full bg-[#F5EFFB] rounded animate-pulse" />
                      <div className="h-4 w-2/3 bg-[#F5EFFB] rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DDD0FA] bg-[#FAF8FF] p-8 text-center space-y-2">
                  <Star className="w-8 h-8 text-[#C8922A] mx-auto" />
                  <p className="text-sm font-bold text-[#1A103D]">No written reviews yet</p>
                  <p className="text-xs text-[#64748B]">
                    Be the first customer to share your stitching experience with{' '}
                    {activeTailor.shopName}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <article
                      key={rev.id}
                      className="p-4 rounded-2xl bg-white border border-[#EAE0FA] hover:border-[#D8B4FE] transition-colors space-y-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#F4EEFF] border border-[#DDD0FA] text-[#6B21D9] text-xs font-extrabold flex items-center justify-center shrink-0">
                            {getInitials(rev.reviewerName)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold text-[#1A103D] truncate">
                                {rev.reviewerName}
                              </span>
                              {rev.isVerifiedBooking && (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Verified Client
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#64748B] mt-0.5">
                              <span>{rev.reviewerLocality}</span>
                              <span aria-hidden="true">·</span>
                              <span>{formatReviewDate(rev.createdAt)}</span>
                              {rev.serviceName && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-semibold text-[#6B21D9]">
                                    {rev.serviceName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= rev.rating
                                  ? 'fill-[#F59E0B] text-[#F59E0B]'
                                  : 'text-[#E2E8F0]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-sm text-[#334155] leading-relaxed">“{rev.comment}”</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <div className="px-5 py-3.5 bg-white border-t border-[#EAE0FA] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {onToggleCompare && (
              <button
                type="button"
                onClick={() => onToggleCompare(activeTailor.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold border transition-colors cursor-pointer ${
                  isCompared
                    ? 'border-[#6B21D9] bg-[#F4EEFF] text-[#6B21D9]'
                    : 'border-[#DDD0FA] text-[#4B3F6B] hover:border-[#6B21D9] hover:text-[#6B21D9]'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                {isCompared ? 'Added to Compare' : 'Add to Compare'}
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#64748B] pl-1">
              <Layers className="w-3.5 h-3.5 text-[#6B21D9]" />
              <span>
                Starting from{' '}
                <strong className="text-[#1A103D] tabular-nums">
                  ₹{activeTailor.startingPrice.toLocaleString('en-IN')}
                </strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onBookTailor(activeTailor)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#6B21D9] hover:from-[#6B21D9] hover:to-[#4C1D95] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-sm"
          >
            <Calendar className="w-4 h-4" />
            {activeTailor.pickupAvailable
              ? 'Schedule Pickup / Appointment'
              : 'Schedule Studio Appointment'}
          </button>
        </div>
      </div>

      {/* FULL-SCREEN PAST WORK PHOTO LIGHTBOX */}
      {activeLightboxItem && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[60] bg-[#0F0824]/92 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Past work photo: ${activeLightboxItem.title}`}
          onClick={(e) => {
            e.stopPropagation();
            setLightboxIndex(null);
          }}
        >
          <div
            className="relative w-full max-w-3xl bg-[#190E36] border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between text-white">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#D8B4FE]">
                  {activeLightboxItem.categoryLabel} · {lightboxIndex + 1} / {filteredGallery.length}
                </p>
                <h4 className="text-sm sm:text-base font-bold truncate">
                  {activeLightboxItem.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Close photo lightbox"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-black/50 flex items-center justify-center max-h-[65vh] overflow-hidden">
              <SafeImage
                src={activeLightboxItem.image}
                alt={activeLightboxItem.title}
                className="max-h-[65vh] w-auto object-contain"
              />

              {filteredGallery.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous work photo"
                    onClick={() =>
                      setLightboxIndex(
                        (lightboxIndex - 1 + filteredGallery.length) % filteredGallery.length,
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#1A103D]/80 hover:bg-[#6B21D9] text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next work photo"
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % filteredGallery.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#1A103D]/80 hover:bg-[#6B21D9] text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <div className="px-4 py-3.5 bg-[#190E36] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-white/85">
              <div className="space-y-0.5">
                {activeLightboxItem.tagLine && (
                  <p className="text-white/80">{activeLightboxItem.tagLine}</p>
                )}
                <p className="text-[#D8B4FE] font-semibold tabular-nums">
                  {activeLightboxItem.price !== null && activeLightboxItem.price !== undefined
                    ? `Indicative ₹${Number(activeLightboxItem.price).toLocaleString('en-IN')}`
                    : 'Custom Quote'}
                  {activeLightboxItem.days
                    ? ` · ${activeLightboxItem.days} ${activeLightboxItem.days === 1 ? 'day' : 'days'} turnaround`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const title = activeLightboxItem.title;
                  const cat = activeLightboxItem.categoryLabel;
                  setLightboxIndex(null);
                  onBookTailor(
                    activeTailor,
                    undefined,
                    `Interested in similar work: "${title}" (${cat})`,
                  );
                }}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#6B21D9] hover:from-[#6B21D9] hover:to-[#4C1D95] text-white font-bold cursor-pointer"
              >
                Request Similar Style
              </button>
            </div>
          </div>
        </div>
      )}
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1A103D]/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Compare tailors side by side"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-5xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-[#EAE0FA] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#EAE0FA] flex items-center justify-between bg-[#1A103D] text-white shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold">
              Compare Tailors Side-by-Side
            </h2>
            <p className="text-xs text-[#DDD6FE] mt-0.5">
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
                <tr className="border-b border-[#EAE0FA]">
                  <th className="py-3 pr-4 w-40 text-xs font-semibold uppercase tracking-wider text-[#746894] align-top">
                    Comparison Criteria
                  </th>
                  {tailors.map((t) => (
                    <th key={t.id} className="py-3 px-3 align-top min-w-[215px]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <TailorLogoBadge logoUrl={t.logoUrl} shopName={t.shopName} size="sm" />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => onViewProfile(t)}
                              className="text-sm font-bold text-[#1A103D] hover:text-[#6B21D9] text-left transition-colors cursor-pointer truncate block"
                            >
                              {t.shopName}
                            </button>
                            <p className="text-xs text-[#746894] font-normal mt-0.5 truncate">
                              {t.masterTailor} · {t.yearsExperience} yrs
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(t.id)}
                          aria-label={`Remove ${t.shopName} from comparison`}
                          className="p-1 text-[#94A3B8] hover:text-[#1A103D] cursor-pointer shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0FA] text-xs sm:text-sm text-[#334155]">
                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#1A103D]">Distance & Area</td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 tabular-nums">
                      <span
                        className={
                          t.distanceKm === nearestDistance
                            ? 'font-bold text-[#6B21D9]'
                            : 'font-medium text-[#1A103D]'
                        }
                      >
                        {t.distanceKm.toFixed(1)} km away
                      </span>
                      <span className="block text-xs text-[#64748B]">{t.locality}</span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#1A103D]">Rating & Orders</td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 tabular-nums">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#1A103D]">
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
                  <td className="py-3 pr-4 font-semibold text-[#1A103D]">Starting Price</td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 tabular-nums">
                      <span
                        className={`text-base font-bold ${
                          t.startingPrice === lowestPrice ? 'text-[#6B21D9]' : 'text-[#1A103D]'
                        }`}
                      >
                        ₹{t.startingPrice.toLocaleString('en-IN')}
                      </span>
                      {t.startingPrice === lowestPrice && (
                        <span className="block text-[11px] font-semibold text-[#6B21D9]">
                          Most Affordable
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#1A103D]">Doorstep Pickup</td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3">
                      {t.pickupAvailable ? (
                        <div>
                          <span className="inline-flex items-center gap-1 font-semibold text-[#6B21D9]">
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
                  <td className="py-3 pr-4 font-semibold text-[#1A103D]">Turnaround & Hours</td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 tabular-nums">
                      <span className="font-semibold text-[#1A103D]">{t.turnaround}</span>
                      <span className="block text-xs text-[#64748B]">{t.workingHours}</span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#1A103D] align-top">
                    Specializations
                  </td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 align-top text-xs leading-relaxed">
                      {t.specialties.join(' · ')}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#1A103D] align-top">
                    Popular Services
                  </td>
                  {tailors.map((t) => (
                    <td key={t.id} className="py-3 px-3 align-top">
                      <ul className="space-y-1.5 text-xs">
                        {t.services.slice(0, 3).map((s) => (
                          <li key={s.id} className="flex items-start justify-between gap-2">
                            <span className="text-[#334155]">{s.name}</span>
                            <span className="font-semibold text-[#1A103D] shrink-0 tabular-nums">
                              ₹{s.price}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 pr-4 font-semibold text-[#1A103D] align-top">
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
                        className="w-full py-2.5 px-3 rounded-lg bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
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
      tailorId: tailor.dbId ?? (Number.isFinite(Number(tailor.id)) ? Number(tailor.id) : null),
      serviceId:
        chosenService?.dbId ??
        (chosenService && Number.isFinite(Number(chosenService.id))
          ? Number(chosenService.id)
          : null),
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
      pickupMode:
        appointmentMode === 'pickup' && tailor.pickupAvailable ? 'doorstep_pickup' : 'shop_visit',
      pickupDate: selectedDate,
      pickupSlot: selectedSlot,
      pickupAddress: addressLine.trim() || locality,
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1A103D]/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Book appointment with ${tailor.shopName}`}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-[#EAE0FA] overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#1A103D] text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <TailorLogoBadge
              logoUrl={tailor.logoUrl}
              shopName={tailor.shopName}
              size="md"
              className="ring-2 ring-white/80"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C4B5FD]">
                Quick Appointment &amp; Pickup Scheduler
              </p>
              <h2 className="text-lg sm:text-xl font-extrabold mt-0.5 truncate">
                {tailor.shopName}
              </h2>
              <p className="text-xs text-white/75 mt-0.5 truncate">
                {tailor.masterTailor} · {tailor.locality} ({tailor.distanceKm.toFixed(1)} km)
              </p>
            </div>
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
              <div className="w-11 h-11 rounded-full bg-[#F4EEFF] text-[#6B21D9] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1A103D]">Appointment Confirmed</h3>
                <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
                  Your booking has been sent to <span className="font-semibold">{tailor.shopName}</span>.
                  Final stitching starts only after you approve the written quotation.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] p-4 space-y-2.5 text-xs sm:text-sm">
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
                  {appointmentMode === 'pickup' && tailor.pickupAvailable
                    ? 'Doorstep Pickup & Measurement'
                    : 'Boutique Studio Visit'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Scheduled Slot</span>
                <span className="font-semibold text-[#1A103D] tabular-nums">
                  {formattedSelectedDate} · {selectedSlot}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Estimated Delivery</span>
                <span className="font-semibold text-[#1A103D] tabular-nums">
                  {confirmedOrder.deliveryDate}
                </span>
              </div>
              <div className="pt-2 border-t border-[#EAE0FA] flex justify-between gap-2">
                <span className="font-semibold text-[#1A103D]">Estimated Amount</span>
                <span className="font-bold text-[#1A103D] tabular-nums">
                  ₹{confirmedOrder.amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-[#475569] bg-[#FBF5E6] border border-[#E8D5A8] rounded-xl p-3">
              <ShieldCheck className="w-4 h-4 text-[#A67418] shrink-0 mt-0.5" />
              <span>
                You can track live order progress and approve your tailor&apos;s quote anytime in{' '}
                <strong className="text-[#1A103D]">Alterations → History</strong>.
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-lg bg-[#1A103D] hover:bg-[#2E1065] text-white text-sm font-semibold transition-colors cursor-pointer"
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
                className="block text-xs font-bold uppercase tracking-wider text-[#1A103D] mb-2"
              >
                1. Choose Tailoring Service
              </label>
              <select
                id="booking-service"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] bg-white text-sm font-medium text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
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
              <span className="block text-xs font-bold uppercase tracking-wider text-[#1A103D] mb-2">
                2. Service Mode
              </span>
              {tailor.pickupAvailable ? (
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
                      {appointmentMode === 'pickup' && (
                        <Check className="w-4 h-4 text-[#6B21D9]" />
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
                        ? 'border-[#6B21D9] bg-[#F4EEFF]'
                        : 'border-[#EAE0FA] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A103D]">
                        <Store className="w-4 h-4 text-[#6B21D9]" />
                        Studio Appointment
                      </span>
                      {appointmentMode === 'studio' && (
                        <Check className="w-4 h-4 text-[#6B21D9]" />
                      )}
                    </div>
                    <p className="text-xs text-[#475569] mt-1">
                      Visit {tailor.locality} studio directly (No visit fee).
                    </p>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] flex items-start gap-2.5 text-xs text-[#475569]">
                  <Store className="w-4 h-4 text-[#1A103D] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#1A103D]">Boutique Studio Visit Only</p>
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
                <span className="text-xs font-bold uppercase tracking-wider text-[#1A103D]">
                  3. Select {appointmentMode === 'pickup' && tailor.pickupAvailable ? 'Pickup' : 'Appointment'} Date & Time
                </span>
                <label className="text-[11px] font-medium text-[#6B21D9] inline-flex items-center gap-1">
                  <span>Other date:</span>
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
                {tailor.pickupSlots.map((slot) => {
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

            {/* Step 4: Contact & Pickup Address */}
            <div className="space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-[#1A103D]">
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#CBD5E1] text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
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
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#CBD5E1] text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9] resize-none"
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            {/* Estimate Summary & Submit */}
            <div className="pt-3 border-t border-[#EAE0FA] space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <span className="text-[#64748B]">Estimated total</span>
                  <span className="block text-[11px] text-[#64748B]">
                    Pay only after final quote approval · {formattedSelectedDate}
                  </span>
                </div>
                <span className="text-lg font-bold text-[#1A103D] tabular-nums">
                  ₹{totalEstimate.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
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

import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PaginationMeta } from '../../services/api';
import { SafeImage } from '../SafeImage';

/**
 * Maps tailoring service/order categories or atelier index to verified source-folder photography
 * (mirrored in MySQL `storefront_media` table).
 */
export function getCategoryImage(category?: string): string {
  switch ((category || '').toLowerCase()) {
    case 'bridal':
      return '/src/assets/images/design_bridal_blouse_1795271999750.jpg';
    case 'alteration':
      return '/src/assets/images/design_saree_pleating_1795272107725.jpg';
    case 'menswear':
      return '/src/assets/images/design_mens_suit_1795272089242.jpg';
    case 'uniform':
      return '/src/assets/images/banner_uniforms_1795271946500.jpg';
    default:
      return '/src/assets/images/design_kurti_palazzo_1795272067948.jpg';
  }
}

const ATELIER_COVERS = [
  '/src/assets/images/atelier_boutique_interior_1795277826258.jpg',
  '/src/assets/images/atelier_maggam_craft_1795277781373.jpg',
  '/src/assets/images/atelier_bespoke_chalk_1795277807957.jpg',
  '/src/assets/images/atelier_hero_stitching_1795277761139.jpg',
  '/src/assets/images/hero_tailoring_studio_1795271871856.jpg',
];

export function getAtelierImage(seedId: number): string {
  const idx = Math.abs(Number(seedId) || 0) % ATELIER_COVERS.length;
  return ATELIER_COVERS[idx];
}

export const CategoryThumbnail: React.FC<{
  category?: string;
  alt: string;
  size?: 'sm' | 'md';
}> = ({ category, alt, size = 'sm' }) => {
  const dim = size === 'md' ? 'w-14 h-14 rounded-xl' : 'w-11 h-11 rounded-xl';
  return (
    <SafeImage
      src={getCategoryImage(category)}
      alt={alt}
      fallbackTitle={category || 'Tailering'}
      className={`${dim} shrink-0 border border-[#EAE0FA]`}
    />
  );
};

interface PaginationBarProps {
  pagination: PaginationMeta | null;
  onPageChange: (nextPage: number) => void;
  onLimitChange?: (nextLimit: number) => void;
  itemLabel?: string;
}

/**
 * Mobile-first pagination bar with 44px touch targets, compact mobile indicator,
 * desktop numbered buttons, and optional page-size selector.
 */
export const PaginationBar: React.FC<PaginationBarProps> = ({
  pagination,
  onPageChange,
  onLimitChange,
  itemLabel = 'records',
}) => {
  if (!pagination || pagination.total === 0) return null;

  const { page, limit, total, totalPages, hasPrev, hasNext } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const visiblePages: number[] = [];
  const startPage = Math.max(1, page - 1);
  const endPage = Math.min(totalPages, page + 1);
  for (let p = startPage; p <= endPage; p += 1) {
    visiblePages.push(p);
  }

  return (
    <div className="px-4 sm:px-5 py-3.5 border-t border-[#EAE0FA] bg-[#FAF8FF]/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center justify-between sm:justify-start gap-3 text-xs text-[#5B4E7A] tabular-nums">
        <span>
          Showing <strong className="text-[#1A103D]">{start}–{end}</strong> of{' '}
          <strong className="text-[#1A103D]">{total}</strong> {itemLabel}
        </span>

        {onLimitChange && (
          <label className="inline-flex items-center gap-1.5">
            <span className="sr-only">Items per page</span>
            <select
              aria-label="Rows per page"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="min-h-[36px] rounded-lg border border-[#DCD0F5] bg-white px-2 py-1 text-xs font-semibold text-[#1A103D]"
            >
              {[8, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-2">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-[#DCD0F5] bg-white hover:border-[#6B21D9] text-xs font-semibold text-[#1A103D] inline-flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Prev</span>
        </button>

        {/* Compact Mobile Indicator */}
        <span className="sm:hidden text-xs font-bold text-[#1A103D] tabular-nums px-2">
          {page} / {totalPages}
        </span>

        {/* Desktop Numbered Controls */}
        <div className="hidden sm:flex items-center gap-1">
          {startPage > 1 && (
            <>
              <button
                type="button"
                onClick={() => onPageChange(1)}
                className="min-h-[40px] min-w-[40px] rounded-xl border border-[#EAE0FA] bg-white hover:border-[#6B21D9] text-xs font-semibold text-[#1A103D] tabular-nums cursor-pointer"
              >
                1
              </button>
              {startPage > 2 && <span className="px-1 text-xs text-[#9488B3]">…</span>}
            </>
          )}
          {visiblePages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`min-h-[40px] min-w-[40px] rounded-xl text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                p === page
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#6B21D9] text-white shadow-xs'
                  : 'border border-[#EAE0FA] bg-white hover:border-[#6B21D9] text-[#1A103D]'
              }`}
            >
              {p}
            </button>
          ))}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-1 text-xs text-[#9488B3]">…</span>}
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                className="min-h-[40px] min-w-[40px] rounded-xl border border-[#EAE0FA] bg-white hover:border-[#6B21D9] text-xs font-semibold text-[#1A103D] tabular-nums cursor-pointer"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-[#DCD0F5] bg-white hover:border-[#6B21D9] text-xs font-semibold text-[#1A103D] inline-flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface MobileBottomSheetModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
}

/**
 * Renders as a native-feel slide-up bottom sheet on mobile (< sm) and
 * a centered rounded dialog on tablet/desktop (sm:+).
 */
export const MobileBottomSheetModal: React.FC<MobileBottomSheetModalProps> = ({
  open,
  title,
  subtitle,
  onClose,
  maxWidthClass = 'sm:max-w-md',
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-[#1A103D]/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClass} bg-white rounded-t-3xl sm:rounded-2xl border border-[#EAE0FA] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200`}
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-gradient-to-r from-[#2E1065] to-[#1A103D]">
          <span className="w-10 h-1.5 rounded-full bg-white/30" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 sm:py-4 bg-gradient-to-r from-[#2E1065] to-[#1A103D] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="font-serif-accent text-base font-bold truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-[#C4B5FD] truncate mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl flex items-center justify-center text-[#DDD6FE] hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto overscroll-contain flex-1">{children}</div>
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 sm:h-28 rounded-2xl bg-white border border-[#EAE0FA] p-4 space-y-2.5">
          <div className="h-3 w-20 bg-[#F4EEFF] rounded animate-pulse" />
          <div className="h-7 w-24 bg-[#EAE0FA] rounded animate-pulse" />
          <div className="h-2.5 w-28 bg-[#F4EEFF] rounded animate-pulse" />
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl border border-[#EAE0FA] p-4 sm:p-5 space-y-3">
      {[1, 2, 3, 4].map((r) => (
        <div key={r} className="h-14 rounded-xl bg-[#FAF8FF] border border-[#F4EEFF] animate-pulse" />
      ))}
    </div>
  </div>
);

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  Maximize2,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  PaginationMeta,
  TailorPortfolioItem,
  tailorPortfolioApi,
} from '../../services/api';
import { SafeImage } from '../SafeImage';
import {
  DashboardSkeleton,
  MobileBottomSheetModal,
  PaginationBar,
} from './DashboardPrimitives';

const PORTFOLIO_CATEGORIES = [
  { id: '', label: 'All Work' },
  { id: 'bridal', label: 'Bridal & Maggam' },
  { id: 'custom', label: 'Custom Stitching' },
  { id: 'menswear', label: 'Menswear' },
  { id: 'alteration', label: 'Alterations' },
  { id: 'uniform', label: 'Uniforms' },
] as const;

type PortfolioCategory = 'custom' | 'alteration' | 'uniform' | 'bridal' | 'menswear';

const CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  bridal: 'Bridal & Maggam',
  custom: 'Custom Stitching',
  menswear: 'Menswear',
  alteration: 'Alteration',
  uniform: 'Uniform',
};

interface CompressedPhoto {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  dataUrl: string;
  sizeKb: number;
  width: number;
  height: number;
}

/**
 * Resizes and compresses a selected image file in the browser so smartphone photos
 * stay crisp (up to 1200px) while uploading quickly within bandwidth limits.
 */
async function compressPortfolioImage(file: File): Promise<CompressedPhoto> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('Please choose a JPG, PNG, or WebP photo.');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('Original image must be under 12 MB.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode the selected image.'));
      el.src = objectUrl;
    });

    const maxDim = 1200;
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing is not supported in this browser.');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Prefer WebP when supported, else fall back to JPEG
    let mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/webp';
    let dataUrl = canvas.toDataURL('image/webp', 0.84);
    if (!dataUrl.startsWith('data:image/webp')) {
      mimeType = 'image/jpeg';
      dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    }

    // If still larger than ~1.1MB base64, gently reduce quality
    if (dataUrl.length > 1_450_000) {
      mimeType = 'image/jpeg';
      dataUrl = canvas.toDataURL('image/jpeg', 0.72);
    }

    const base64Body = dataUrl.split(',')[1] || '';
    const sizeBytes = Math.round((base64Body.length * 3) / 4);
    return {
      mimeType,
      dataUrl,
      sizeKb: Math.max(1, Math.round(sizeBytes / 1024)),
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface TailorPortfolioViewProps {
  uploadModalOpen: boolean;
  onOpenUploadModal: () => void;
  onCloseUploadModal: () => void;
  onNotifyToast: (msg: string) => void;
  refreshSignal?: number;
}

export const TailorPortfolioView: React.FC<TailorPortfolioViewProps> = ({
  uploadModalOpen,
  onOpenUploadModal,
  onCloseUploadModal,
  onNotifyToast,
  refreshSignal = 0,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(9);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [items, setItems] = useState<TailorPortfolioItem[]>([]);
  const [stats, setStats] = useState({ totalCount: 0, visibleCount: 0, featuredCount: 0 });

  // Upload Form State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<CompressedPhoto | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'bridal' as PortfolioCategory,
    caption: '',
    priceHint: '',
    turnaroundDays: '',
    isFeatured: false,
  });

  // Edit Metadata Modal
  const [editingItem, setEditingItem] = useState<{
    id: number;
    title: string;
    category: PortfolioCategory;
    caption: string;
    priceHint: string;
    turnaroundDays: string;
    isFeatured: boolean;
    isVisible: boolean;
  } | null>(null);

  // Full Preview Lightbox Modal
  const [previewItem, setPreviewItem] = useState<TailorPortfolioItem | null>(null);

  const loadPortfolio = useCallback(
    async (targetPage = page, targetLimit = limit, targetCategory = categoryFilter) => {
      setLoading(true);
      setError(null);
      try {
        const res = await tailorPortfolioApi.list(targetPage, targetLimit, targetCategory);
        setItems(res.items);
        setStats(res.stats);
        setPagination(res.pagination || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load your portfolio.');
      } finally {
        setLoading(false);
      }
    },
    [page, limit, categoryFilter],
  );

  useEffect(() => {
    void loadPortfolio(page, limit, categoryFilter);
  }, [page, limit, categoryFilter, refreshSignal, loadPortfolio]);

  const handleFileSelected = async (file: File | undefined | null) => {
    if (!file) return;
    setUploadError(null);
    setCompressing(true);
    try {
      const compressed = await compressPortfolioImage(file);
      setPhotoPreview(compressed);
      if (!uploadForm.title) {
        const baseName = file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .trim();
        if (baseName.length >= 2 && baseName.length <= 60) {
          setUploadForm((f) => ({
            ...f,
            title: baseName.charAt(0).toUpperCase() + baseName.slice(1),
          }));
        }
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to process image.');
    } finally {
      setCompressing(false);
    }
  };

  const resetUploadForm = () => {
    setPhotoPreview(null);
    setUploadError(null);
    setUploadForm({
      title: '',
      category: 'bridal',
      caption: '',
      priceHint: '',
      turnaroundDays: '',
      isFeatured: false,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoPreview) {
      setUploadError('Please select a photo of your finished work first.');
      return;
    }
    setBusyId('upload-portfolio');
    setUploadError(null);
    try {
      const res = await tailorPortfolioApi.create({
        title: uploadForm.title.trim(),
        category: uploadForm.category,
        caption: uploadForm.caption.trim() || undefined,
        priceHint: uploadForm.priceHint ? Number(uploadForm.priceHint) : null,
        turnaroundDays: uploadForm.turnaroundDays ? Number(uploadForm.turnaroundDays) : null,
        isFeatured: uploadForm.isFeatured,
        isVisible: true,
        mimeType: photoPreview.mimeType,
        imageBase64: photoPreview.dataUrl,
      });
      onNotifyToast(res.message);
      resetUploadForm();
      onCloseUploadModal();
      setPage(1);
      await loadPortfolio(1, limit, categoryFilter);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleFeatured = async (item: TailorPortfolioItem) => {
    setBusyId(`feat-${item.id}`);
    try {
      await tailorPortfolioApi.update(item.id, { isFeatured: !item.isFeatured });
      onNotifyToast(
        !item.isFeatured
          ? `"${item.title}" pinned as featured showcase work.`
          : `Removed featured pin from "${item.title}".`,
      );
      await loadPortfolio(page, limit, categoryFilter);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleVisibility = async (item: TailorPortfolioItem) => {
    const nextVisible = !Boolean(item.isVisible);
    setBusyId(`vis-${item.id}`);
    try {
      await tailorPortfolioApi.update(item.id, { isVisible: nextVisible });
      onNotifyToast(
        nextVisible
          ? `"${item.title}" is now visible to customers.`
          : `"${item.title}" hidden from public storefront.`,
      );
      await loadPortfolio(page, limit, categoryFilter);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setBusyId(`save-edit-${editingItem.id}`);
    try {
      await tailorPortfolioApi.update(editingItem.id, {
        title: editingItem.title.trim(),
        category: editingItem.category,
        caption: editingItem.caption.trim() || null,
        priceHint: editingItem.priceHint ? Number(editingItem.priceHint) : null,
        turnaroundDays: editingItem.turnaroundDays ? Number(editingItem.turnaroundDays) : null,
        isFeatured: editingItem.isFeatured,
        isVisible: editingItem.isVisible,
      });
      onNotifyToast('Portfolio showcase details updated.');
      setEditingItem(null);
      await loadPortfolio(page, limit, categoryFilter);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteItem = async (item: TailorPortfolioItem) => {
    setBusyId(`del-${item.id}`);
    try {
      await tailorPortfolioApi.remove(item.id);
      onNotifyToast(`Removed "${item.title}" from your portfolio.`);
      if (previewItem?.id === item.id) setPreviewItem(null);
      await loadPortfolio(page, limit, categoryFilter);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading && items.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Portfolio Summary KPIs */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#EAE0FA] p-3.5 sm:p-5">
          <span className="text-[11px] sm:text-xs font-semibold text-[#64748B]">
            Showcase Pieces
          </span>
          <p className="text-xl sm:text-2xl font-bold text-[#1A103D] tabular-nums mt-1">
            {stats.totalCount}
            <span className="text-xs font-normal text-[#94A3B8]"> / 40</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#EAE0FA] p-3.5 sm:p-5">
          <span className="text-[11px] sm:text-xs font-semibold text-[#64748B]">
            Live to Customers
          </span>
          <p className="text-xl sm:text-2xl font-bold text-[#6B21D9] tabular-nums mt-1">
            {stats.visibleCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-[#EAE0FA] p-3.5 sm:p-5">
          <span className="text-[11px] sm:text-xs font-semibold text-[#64748B]">Featured</span>
          <p className="text-xl sm:text-2xl font-bold text-[#C8922A] tabular-nums mt-1">
            {stats.featuredCount}
          </p>
        </div>
      </div>

      {/* Category Filter Strip + Quick Upload Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {PORTFOLIO_CATEGORIES.map((cat) => {
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id || 'all'}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat.id);
                  setPage(1);
                }}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#1A103D] text-white'
                    : 'bg-white border border-[#EAE0FA] text-[#475569] hover:border-[#6B21D9]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onOpenUploadModal}
          className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-bold cursor-pointer shrink-0 transition-colors"
        >
          <ImagePlus className="w-4 h-4" />
          Upload Previous Work
        </button>
      </div>

      {/* Portfolio Gallery Container */}
      <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
        {items.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#F4EEFF] border border-[#DCD0F5] text-[#6B21D9] flex items-center justify-center mx-auto">
              <Camera className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="font-serif-accent text-lg font-bold text-[#1A103D]">
                {categoryFilter
                  ? `No ${CATEGORY_LABELS[categoryFilter as PortfolioCategory] || ''} photos yet`
                  : 'Showcase Your Craftsmanship'}
              </h3>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1 leading-relaxed">
                Upload crisp photos of your bespoke blouses, bridal lehengas, suits, or precision
                alterations. Verified showcase photos appear on your public tailor profile so
                customers book with confidence.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={onOpenUploadModal}
                className="min-h-[44px] inline-flex items-center gap-2 px-5 rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-bold cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#C4B5FD]" />
                Upload First Photo
              </button>
              {categoryFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('');
                    setPage(1);
                  }}
                  className="min-h-[44px] px-4 rounded-xl border border-[#CBD5E1] text-xs font-semibold text-[#1A103D] cursor-pointer"
                >
                  Show All Categories
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {items.map((item) => {
                const isHidden = item.isVisible === false;
                return (
                  <article
                    key={item.id}
                    className={`rounded-2xl border overflow-hidden flex flex-col justify-between bg-white transition-colors ${
                      isHidden
                        ? 'border-dashed border-[#CBD5E1] opacity-85'
                        : 'border-[#EAE0FA] hover:border-[#6B21D9]/50'
                    }`}
                  >
                    <div>
                      <div className="relative aspect-[4/3] bg-[#F1F5F9] group">
                        <SafeImage
                          src={item.imageUrl}
                          alt={item.title}
                          fallbackTitle={item.title}
                          className="w-full h-full"
                        />

                        {/* Top Corner Indicators */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          {item.isFeatured && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1A103D]/90 text-[#E2B14B] text-[11px] font-bold backdrop-blur-xs">
                              <Star className="w-3 h-3 fill-[#E2B14B]" />
                              Featured
                            </span>
                          )}
                          {isHidden && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/80 text-slate-200 text-[11px] font-semibold backdrop-blur-xs">
                              <EyeOff className="w-3 h-3" />
                              Hidden
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          aria-label={`Preview ${item.title}`}
                          className="absolute bottom-2.5 right-2.5 min-h-[38px] min-w-[38px] rounded-xl bg-[#1A103D]/80 hover:bg-[#1A103D] text-white inline-flex items-center justify-center backdrop-blur-xs cursor-pointer transition-colors"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-4 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B21D9]">
                              {CATEGORY_LABELS[item.category] || item.category}
                            </span>
                            <h3 className="font-serif-accent text-base font-bold text-[#1A103D] truncate">
                              {item.title}
                            </h3>
                          </div>
                          {item.priceHint !== null && (
                            <span className="text-sm font-bold text-[#1A103D] tabular-nums shrink-0">
                              ₹{item.priceHint.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        {item.caption && (
                          <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed">
                            {item.caption}
                          </p>
                        )}

                        {item.turnaroundDays !== null && (
                          <p className="text-[11px] text-[#64748B] flex items-center gap-1 pt-0.5 tabular-nums">
                            <Clock className="w-3 h-3 text-[#6B21D9]" />
                            Typical turnaround: {item.turnaroundDays} days
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Controls (44px+ Mobile Touch Targets) */}
                    <div className="px-3 py-2.5 bg-[#FAF8FF] border-t border-[#F1F5F9] grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === `feat-${item.id}`}
                        onClick={() => void handleToggleFeatured(item)}
                        title={item.isFeatured ? 'Unpin featured' : 'Feature on storefront'}
                        className={`min-h-[42px] rounded-xl border text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                          item.isFeatured
                            ? 'bg-[#FBF5E6] border-[#E2B14B] text-[#9A6700]'
                            : 'bg-white border-[#EAE0FA] text-[#475569] hover:border-[#C8922A]'
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${item.isFeatured ? 'fill-[#C8922A] text-[#C8922A]' : ''}`}
                        />
                        <span className="sr-only sm:not-sr-only">Pin</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyId === `vis-${item.id}`}
                        onClick={() => void handleToggleVisibility(item)}
                        title={isHidden ? 'Show to customers' : 'Hide from customers'}
                        className={`min-h-[42px] rounded-xl border text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                          isHidden
                            ? 'bg-slate-100 border-slate-300 text-slate-600'
                            : 'bg-white border-[#EAE0FA] text-[#6B21D9] hover:border-[#6B21D9]'
                        }`}
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span className="sr-only sm:not-sr-only">{isHidden ? 'Hidden' : 'Live'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingItem({
                            id: item.id,
                            title: item.title,
                            category: item.category,
                            caption: item.caption || '',
                            priceHint: item.priceHint !== null ? String(item.priceHint) : '',
                            turnaroundDays:
                              item.turnaroundDays !== null ? String(item.turnaroundDays) : '',
                            isFeatured: item.isFeatured,
                            isVisible: item.isVisible !== false,
                          })
                        }
                        title="Edit details"
                        className="min-h-[42px] rounded-xl border border-[#EAE0FA] bg-white hover:border-[#6B21D9] text-[#1A103D] text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="sr-only sm:not-sr-only">Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyId === `del-${item.id}`}
                        onClick={() => void handleDeleteItem(item)}
                        title="Delete photo"
                        aria-label={`Delete ${item.title}`}
                        className="min-h-[42px] rounded-xl border border-[#EAE0FA] bg-white hover:border-rose-300 hover:bg-rose-50 text-rose-600 text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="sr-only sm:not-sr-only">Delete</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <PaginationBar
              pagination={pagination}
              onPageChange={setPage}
              onLimitChange={(n) => {
                setLimit(n);
                setPage(1);
              }}
              itemLabel="photos"
            />
          </>
        )}
      </div>

      {/* UPLOAD PORTFOLIO PHOTO BOTTOM-SHEET MODAL */}
      <MobileBottomSheetModal
        open={uploadModalOpen}
        title="Upload Portfolio Photo"
        subtitle="Showcase finished work to customers browsing nearby tailors"
        maxWidthClass="sm:max-w-lg"
        onClose={() => {
          onCloseUploadModal();
          setUploadError(null);
        }}
      >
        <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs">
          {uploadError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-rose-700 font-semibold">
              {uploadError}
            </div>
          )}

          {/* Drag-and-Drop / Tap Photo Picker */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              void handleFileSelected(e.dataTransfer.files?.[0]);
            }}
            className={`relative rounded-2xl border-2 border-dashed transition-colors overflow-hidden ${
              dragActive
                ? 'border-[#6B21D9] bg-[#F4EEFF]'
                : 'border-[#CBD5E1] bg-[#FAF8FF] hover:border-[#6B21D9]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void handleFileSelected(e.target.files?.[0])}
              className="sr-only"
              id="tailor-portfolio-file-input"
            />

            {photoPreview ? (
              <div className="relative aspect-[16/10] bg-[#1A103D]">
                <img
                  src={photoPreview.dataUrl}
                  alt="Upload preview"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-[#1A103D]/90 to-transparent flex items-center justify-between gap-2 text-white">
                  <span className="text-[11px] font-semibold tabular-nums">
                    Optimized: {photoPreview.width}×{photoPreview.height}px · {photoPreview.sizeKb} KB
                  </span>
                  <label
                    htmlFor="tailor-portfolio-file-input"
                    className="min-h-[36px] px-3 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Change Photo
                  </label>
                </div>
              </div>
            ) : (
              <label
                htmlFor="tailor-portfolio-file-input"
                className="flex flex-col items-center justify-center text-center py-8 px-4 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#EAE0FA] text-[#6B21D9] flex items-center justify-center mb-2.5 shadow-2xs">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-[#1A103D]">
                  {compressing ? 'Optimizing image...' : 'Tap to choose or drop a photo here'}
                </p>
                <p className="text-[11px] text-[#64748B] mt-1">
                  JPG, PNG, or WebP · Auto-compressed for fast mobile browsing
                </p>
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-[#1A103D] mb-1">Work Title</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={140}
                placeholder="e.g. Handcrafted Zardosi Bridal Maggam Blouse"
                value={uploadForm.title}
                onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-sm text-[#1A103D]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Category</label>
              <select
                value={uploadForm.category}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, category: e.target.value as PortfolioCategory }))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-sm text-[#1A103D] bg-white"
              >
                <option value="bridal">Bridal &amp; Maggam</option>
                <option value="custom">Custom Stitching</option>
                <option value="menswear">Menswear</option>
                <option value="alteration">Alteration</option>
                <option value="uniform">Uniforms</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#1A103D] mb-1">
                Approx. Starting Price (₹, optional)
              </label>
              <input
                type="number"
                min={20}
                max={500000}
                placeholder="e.g. 1850"
                value={uploadForm.priceHint}
                onChange={(e) => setUploadForm((f) => ({ ...f, priceHint: e.target.value }))}
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-sm text-[#1A103D]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1A103D] mb-1">
                Turnaround (Days, optional)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                placeholder="e.g. 5"
                value={uploadForm.turnaroundDays}
                onChange={(e) => setUploadForm((f) => ({ ...f, turnaroundDays: e.target.value }))}
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-sm text-[#1A103D]"
              />
            </div>

            <label className="min-h-[44px] flex items-center gap-2.5 px-3 rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] font-semibold text-[#1A103D] cursor-pointer self-end">
              <input
                type="checkbox"
                checked={uploadForm.isFeatured}
                onChange={(e) => setUploadForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                className="w-4 h-4 accent-[#6B21D9]"
              />
              Pin as Featured Cover
            </label>

            <div className="sm:col-span-2">
              <label className="block font-bold text-[#1A103D] mb-1">
                Craftsmanship Notes / Fabric Details (optional)
              </label>
              <textarea
                rows={2}
                maxLength={500}
                placeholder="Describe embroidery, silk lining, custom neckline, or tailoring finish..."
                value={uploadForm.caption}
                onChange={(e) => setUploadForm((f) => ({ ...f, caption: e.target.value }))}
                className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#1A103D]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busyId === 'upload-portfolio' || compressing || !photoPreview}
            className="w-full min-h-[48px] rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white font-bold text-sm cursor-pointer disabled:opacity-50 transition-colors"
          >
            {busyId === 'upload-portfolio' ? 'Uploading to Portfolio...' : 'Publish to Tailor Portfolio'}
          </button>
        </form>
      </MobileBottomSheetModal>

      {/* EDIT PORTFOLIO METADATA MODAL */}
      <MobileBottomSheetModal
        open={Boolean(editingItem)}
        title="Edit Showcase Details"
        subtitle="Update caption, category, pricing hint, or visibility"
        maxWidthClass="sm:max-w-md"
        onClose={() => setEditingItem(null)}
      >
        {editingItem && (
          <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Work Title</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={140}
                value={editingItem.title}
                onChange={(e) =>
                  setEditingItem((prev) => (prev ? { ...prev, title: e.target.value } : null))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-sm text-[#1A103D]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1A103D] mb-1">Category</label>
                <select
                  value={editingItem.category}
                  onChange={(e) =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, category: e.target.value as PortfolioCategory } : null,
                    )
                  }
                  className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-sm text-[#1A103D] bg-white"
                >
                  <option value="bridal">Bridal &amp; Maggam</option>
                  <option value="custom">Custom Stitching</option>
                  <option value="menswear">Menswear</option>
                  <option value="alteration">Alteration</option>
                  <option value="uniform">Uniforms</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1A103D] mb-1">Price Hint (₹)</label>
                <input
                  type="number"
                  min={20}
                  max={500000}
                  value={editingItem.priceHint}
                  onChange={(e) =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, priceHint: e.target.value } : null,
                    )
                  }
                  className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-sm text-[#1A103D]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Turnaround Days</label>
              <input
                type="number"
                min={1}
                max={60}
                value={editingItem.turnaroundDays}
                onChange={(e) =>
                  setEditingItem((prev) =>
                    prev ? { ...prev, turnaroundDays: e.target.value } : null,
                  )
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-sm text-[#1A103D]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Craftsmanship Notes</label>
              <textarea
                rows={3}
                maxLength={500}
                value={editingItem.caption}
                onChange={(e) =>
                  setEditingItem((prev) => (prev ? { ...prev, caption: e.target.value } : null))
                }
                className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#1A103D]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="min-h-[44px] flex items-center gap-2 px-3 rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] font-semibold text-[#1A103D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingItem.isFeatured}
                  onChange={(e) =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, isFeatured: e.target.checked } : null,
                    )
                  }
                  className="w-4 h-4 accent-[#6B21D9]"
                />
                Featured
              </label>
              <label className="min-h-[44px] flex items-center gap-2 px-3 rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] font-semibold text-[#1A103D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingItem.isVisible}
                  onChange={(e) =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, isVisible: e.target.checked } : null,
                    )
                  }
                  className="w-4 h-4 accent-[#6B21D9]"
                />
                Public
              </label>
            </div>

            <button
              type="submit"
              disabled={busyId === `save-edit-${editingItem.id}`}
              className="w-full min-h-[48px] rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
            >
              {busyId === `save-edit-${editingItem.id}` ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </MobileBottomSheetModal>

      {/* FULL PHOTO LIGHTBOX MODAL */}
      <MobileBottomSheetModal
        open={Boolean(previewItem)}
        title={previewItem?.title || 'Portfolio Preview'}
        subtitle={
          previewItem ? CATEGORY_LABELS[previewItem.category] || previewItem.category : ''
        }
        maxWidthClass="sm:max-w-2xl"
        onClose={() => setPreviewItem(null)}
      >
        {previewItem && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="rounded-2xl overflow-hidden bg-[#1A103D] aspect-[4/3]">
              <SafeImage
                src={previewItem.imageUrl}
                alt={previewItem.title}
                priority
                className="w-full h-full"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#6B21D9] uppercase tracking-wider">
                  {CATEGORY_LABELS[previewItem.category] || previewItem.category}
                </span>
                {previewItem.turnaroundDays !== null && (
                  <span className="text-[#64748B] tabular-nums">
                    · {previewItem.turnaroundDays} days turnaround
                  </span>
                )}
              </div>
              {previewItem.priceHint !== null && (
                <span className="text-base font-bold text-[#1A103D] tabular-nums">
                  From ₹{previewItem.priceHint.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            {previewItem.caption && (
              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                {previewItem.caption}
              </p>
            )}
          </div>
        )}
      </MobileBottomSheetModal>
    </div>
  );
};

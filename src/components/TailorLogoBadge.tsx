import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';

interface TailorLogoBadgeProps {
  logoUrl?: string | null;
  shopName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<TailorLogoBadgeProps['size']>, string> = {
  xs: 'w-8 h-8 rounded-lg text-[10px]',
  sm: 'w-10 h-10 rounded-xl text-xs',
  md: 'w-12 h-12 rounded-xl text-sm',
  lg: 'w-16 h-16 rounded-2xl text-base',
  xl: 'w-20 h-20 rounded-2xl text-lg',
};

function getShopMonogram(shopName: string): string {
  const words = (shopName || 'TS')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'TS';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export const TailorLogoBadge: React.FC<TailorLogoBadgeProps> = ({
  logoUrl,
  shopName,
  size = 'md',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(logoUrl && logoUrl.trim().length > 0 && !imgFailed);

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-[#EAE0FA] bg-white shadow-xs flex items-center justify-center select-none ${SIZE_CLASSES[size]} ${className}`}
      title={shopName}
    >
      {showImage ? (
        <img
          src={logoUrl!}
          alt={`${shopName} logo`}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] text-white font-extrabold tracking-tight flex items-center justify-center">
          {getShopMonogram(shopName)}
        </div>
      )}
    </div>
  );
};

interface ShopLogoUploaderProps {
  currentLogoUrl?: string | null;
  shopName: string;
  onUpload: (
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
    imageBase64: string,
  ) => Promise<void>;
  onRemove?: () => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}

const MAX_LOGO_BYTES = 1_200_000;

function readAndNormalizeLogo(
  file: File,
): Promise<{ mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string }> {
  return new Promise((resolve, reject) => {
    const allowed: Record<string, 'image/jpeg' | 'image/png' | 'image/webp'> = {
      'image/jpeg': 'image/jpeg',
      'image/jpg': 'image/jpeg',
      'image/png': 'image/png',
      'image/webp': 'image/webp',
    };
    const targetMime = allowed[file.type.toLowerCase()];
    if (!targetMime) {
      reject(new Error('Please select a JPEG, PNG, or WebP logo image.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is not a valid image.'));
      img.onload = () => {
        const size = 400;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }

        // Fill clean white backing for JPEG, transparent for PNG/WebP
        if (targetMime === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, size, size);
        } else {
          ctx.clearRect(0, 0, size, size);
        }

        // Fit centered square cover/contain preserving emblem clarity
        const scale = Math.min(size / img.width, size / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const offsetX = (size - drawW) / 2;
        const offsetY = (size - drawH) / 2;
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        const outMime: 'image/jpeg' | 'image/png' | 'image/webp' =
          targetMime === 'image/png' ? 'image/png' : 'image/webp';
        let outDataUrl = canvas.toDataURL(outMime, 0.9);
        let rawBase64 = outDataUrl.split(',')[1] || '';

        if (rawBase64.length * 0.75 > MAX_LOGO_BYTES) {
          outDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          rawBase64 = outDataUrl.split(',')[1] || '';
          resolve({ mimeType: 'image/jpeg', base64: rawBase64 });
          return;
        }
        resolve({ mimeType: outMime, base64: rawBase64 });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const ShopLogoUploader: React.FC<ShopLogoUploaderProps> = ({
  currentLogoUrl,
  shopName,
  onUpload,
  onRemove,
  disabled = false,
  compact = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const normalized = await readAndNormalizeLogo(file);
      await onUpload(normalized.mimeType, normalized.base64);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload shop logo.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setError(null);
    setBusy(true);
    try {
      await onRemove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove shop logo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-[#EAE0FA] bg-[#FAF8FF] ${
        compact ? 'p-3.5' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative shrink-0 self-start">
          <TailorLogoBadge
            logoUrl={currentLogoUrl}
            shopName={shopName}
            size={compact ? 'lg' : 'xl'}
            className="ring-2 ring-white shadow-md"
          />
          <button
            type="button"
            disabled={busy || disabled}
            onClick={() => inputRef.current?.click()}
            aria-label="Upload shop logo"
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#6B21D9] hover:bg-[#5B21B6] text-white flex items-center justify-center shadow-md border-2 border-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-sm font-bold text-[#1A103D]">Tailor Shop Logo / Emblem</p>
            <p className="text-xs text-[#5B4E7A] mt-0.5 leading-relaxed">
              Displayed across marketplace cards, profile headers, and customer bookings. Upload
              a square JPEG, PNG, or WebP image (auto-optimized to 400×400).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={busy || disabled}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#6B21D9] hover:from-[#6B21D9] hover:to-[#5B21B6] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {currentLogoUrl ? 'Change Logo' : 'Upload Logo'}
            </button>

            {currentLogoUrl && onRemove && (
              <button
                type="button"
                disabled={busy || disabled}
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
          </div>

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
};

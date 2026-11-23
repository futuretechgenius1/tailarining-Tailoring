import React, { useEffect, useRef, useState } from 'react';
import { Scissors } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Blocks unsafe protocols (javascript:, vbscript:, data:text/html) while
 * permitting relative app assets and standard https/http image sources.
 */
function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') || trimmed.startsWith('./')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  priority = false,
  sizes,
}) => {
  const safeSrc = isSafeImageUrl(src) ? src : '';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(priority);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [safeSrc]);

  useEffect(() => {
    if (priority || inView) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, inView]);

  if (failed || !safeSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F4EEFF] to-[#EAE0FA] text-[#1A103D] p-3 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Scissors className="w-6 h-6 text-[#6B21D9] opacity-70 mb-1" />
        <span className="text-[11px] font-semibold text-center line-clamp-2 text-[#475569]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-[#EEF2F6] ${className}`}>
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#EEF2F6] via-[#FAF8FF] to-[#EEF2F6] animate-pulse"
        />
      )}
      {inView && (
        <img
          src={safeSrc}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};

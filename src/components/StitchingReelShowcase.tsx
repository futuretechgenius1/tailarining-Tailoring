import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Scissors,
  X,
} from 'lucide-react';
import { CraftReelScene } from '../types';
import { SafeImage } from './SafeImage';

interface StitchingReelStripProps {
  scenes: CraftReelScene[];
  activeSceneIndex: number;
  isPlaying: boolean;
  onSelectScene: (index: number) => void;
  onTogglePlay: () => void;
  onOpenFilmModal: (index: number) => void;
  onFilterByIntent: (intentId: string) => void;
}

export const StitchingReelStrip: React.FC<StitchingReelStripProps> = ({
  scenes,
  activeSceneIndex,
  isPlaying,
  onSelectScene,
  onTogglePlay,
  onOpenFilmModal,
  onFilterByIntent,
}) => {
  if (!scenes || scenes.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-2">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-bold tracking-wide text-[#6B21D9]">
            Inside Our Partner Ateliers
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1A103D] mt-0.5 tracking-tight">
            Tailoring Craftsmanship in Motion
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onTogglePlay}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#EAE0FA] bg-white text-xs font-semibold text-[#1A103D] hover:border-[#6B21D9] hover:text-[#6B21D9] transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause Reel' : 'Play Reel'}
          </button>
          <button
            type="button"
            onClick={() => onOpenFilmModal(activeSceneIndex)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#6B21D9] hover:from-[#6B21D9] hover:to-[#4C1D95] text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-white text-white" />
            Watch Full Reel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenes.map((scene, idx) => {
          const isActive = idx === activeSceneIndex;
          return (
            <div
              key={scene.id}
              onClick={() => onSelectScene(idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectScene(idx);
                }
              }}
              className={`group relative rounded-2xl overflow-hidden bg-[#1A103D] border transition-all cursor-pointer ${
                isActive
                  ? 'border-[#6B21D9] shadow-lg shadow-[#6B21D9]/15 ring-2 ring-[#7C3AED]/30'
                  : 'border-[#EAE0FA] hover:border-[#A78BFA]'
              }`}
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <SafeImage
                  src={scene.image}
                  alt={scene.title}
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    isActive && isPlaying
                      ? scene.motionVariant === 'zoom'
                        ? 'animate-ken-burns'
                        : 'animate-ken-burns-pan'
                      : 'group-hover:scale-105'
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A103D]/95 via-[#1A103D]/35 to-transparent" />

                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider text-[#DDD6FE] tabular-nums">
                    {scene.chapter} · 0:0{scene.durationSec}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFilmModal(idx);
                    }}
                    aria-label={`Play ${scene.title} reel`}
                    className="w-8 h-8 rounded-full bg-[#1A103D]/75 hover:bg-[#6B21D9] text-white flex items-center justify-center border border-white/25 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                </div>

                <div className="absolute bottom-3 left-3.5 right-3.5">
                  <h3 className="text-sm sm:text-[15px] font-bold text-white leading-snug">
                    {scene.title}
                  </h3>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFilterByIntent(scene.intentId);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C4B5FD] hover:text-white transition-colors cursor-pointer"
                    >
                      View specialists
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/15 overflow-hidden">
                  {isActive && isPlaying ? (
                    <motion.div
                      key={`${scene.id}-progress`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: scene.durationSec, ease: 'linear' }}
                      style={{ transformOrigin: 'left center' }}
                      className="h-full w-full bg-gradient-to-r from-[#A78BFA] to-[#F97316]"
                    />
                  ) : (
                    <div
                      className={`h-full transition-all ${
                        isActive ? 'w-full bg-[#A78BFA]' : 'w-0'
                      }`}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

interface CraftReelModalProps {
  scenes: CraftReelScene[];
  open: boolean;
  initialIndex: number;
  onClose: () => void;
  onFilterByIntent: (intentId: string) => void;
}

export const CraftReelModal: React.FC<CraftReelModalProps> = ({
  scenes,
  open,
  initialIndex,
  onClose,
  onFilterByIntent,
}) => {
  const [sceneIdx, setSceneIdx] = useState(initialIndex);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    setSceneIdx(initialIndex);
    setPlaying(true);
  }, [initialIndex, open]);

  useEffect(() => {
    if (!open || !playing || scenes.length === 0) return;
    const current = scenes[sceneIdx % scenes.length];
    const timer = window.setTimeout(() => {
      setSceneIdx((prev) => (prev + 1) % scenes.length);
    }, current.durationSec * 1000);
    return () => window.clearTimeout(timer);
  }, [open, playing, sceneIdx, scenes]);

  if (!open || scenes.length === 0) return null;

  const safeIdx = sceneIdx % scenes.length;
  const scene = scenes[safeIdx];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#140B2E]/85 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Tailering Craftsmanship Film Reel"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#1A103D] rounded-2xl overflow-hidden border border-white/15 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          {scenes.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSceneIdx(idx)}
              aria-label={`Jump to chapter ${item.chapter}: ${item.title}`}
              className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden cursor-pointer"
            >
              {idx < safeIdx ? (
                <div className="h-full w-full bg-[#A78BFA]" />
              ) : idx === safeIdx ? (
                playing ? (
                  <motion.div
                    key={`${item.id}-modal-bar-${safeIdx}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: item.durationSec, ease: 'linear' }}
                    style={{ transformOrigin: 'left center' }}
                    className="h-full w-full bg-gradient-to-r from-[#A78BFA] to-[#F97316]"
                  />
                ) : (
                  <div className="h-full w-1/2 bg-[#A78BFA]" />
                )
              ) : null}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reel"
            className="ml-2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative aspect-[16/9] bg-[#140B2E] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={scene.id}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <SafeImage
                src={scene.image}
                alt={scene.title}
                className={`w-full h-full object-cover ${
                  playing
                    ? scene.motionVariant === 'zoom'
                      ? 'animate-ken-burns'
                      : 'animate-ken-burns-pan'
                    : ''
                }`}
              />
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-t from-[#1A103D] via-[#1A103D]/30 to-transparent" />

          <svg
            aria-hidden="true"
            viewBox="0 0 800 40"
            className="absolute bottom-28 sm:bottom-24 left-0 w-full h-8 opacity-65 pointer-events-none"
            preserveAspectRatio="none"
          >
            <path
              d="M 0 22 Q 200 4, 400 22 T 800 18"
              fill="none"
              stroke="#C4B5FD"
              strokeWidth="1.5"
              className="animate-stitch-flow"
            />
          </svg>

          <button
            type="button"
            onClick={() => setSceneIdx((prev) => (prev - 1 + scenes.length) % scenes.length)}
            aria-label="Previous chapter"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#1A103D]/70 hover:bg-[#6B21D9] text-white flex items-center justify-center border border-white/15 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setSceneIdx((prev) => (prev + 1) % scenes.length)}
            aria-label="Next chapter"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#1A103D]/70 hover:bg-[#6B21D9] text-white flex items-center justify-center border border-white/15 cursor-pointer transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-5 right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-xs font-semibold text-[#C4B5FD] tracking-wide">
                Chapter {scene.chapter} of 0{scenes.length} · Tailering Craft Film
              </p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {scene.title}
              </h3>
              <p className="text-xs sm:text-sm text-white/80 mt-1 leading-relaxed">
                {scene.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 cursor-pointer"
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {playing ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFilterByIntent(scene.intentId);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#6B21D9] hover:from-[#6B21D9] hover:to-[#4C1D95] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                <Scissors className="w-4 h-4" />
                Explore Matching Tailors
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

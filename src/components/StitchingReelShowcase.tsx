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
import { ASSETS } from '../data/catalogData';
import { SafeImage } from './SafeImage';

export interface CraftReelScene {
  id: string;
  chapter: string;
  title: string;
  subtitle: string;
  durationSec: number;
  image: string;
  intentId: string;
  motionVariant: 'zoom' | 'pan';
}

export const CRAFT_REEL_SCENES: CraftReelScene[] = [
  {
    id: 'scene-stitching',
    chapter: '01',
    title: 'Hand-Finished Silk Stitching',
    subtitle: 'Fine needlework, reinforced French seams, and invisible hemming crafted to millimetre tolerance.',
    durationSec: 6,
    image: ASSETS.atelierHeroStitching,
    intentId: 'alterations',
    motionVariant: 'zoom',
  },
  {
    id: 'scene-maggam',
    chapter: '02',
    title: 'Maggam & Zardosi Frame Craft',
    subtitle: 'Traditional Hyderabadi aari needle embroidery with gold cutdana, silk thread, and bridal beadwork.',
    durationSec: 6,
    image: ASSETS.atelierMaggamCraft,
    intentId: 'blouses',
    motionVariant: 'pan',
  },
  {
    id: 'scene-chalk',
    chapter: '03',
    title: 'Bespoke Chalk & Pattern Drafting',
    subtitle: 'Individual paper-and-chalk pattern cutting for structured suits, bandhgalas, and wedding sherwanis.',
    durationSec: 6,
    image: ASSETS.atelierBespokeChalk,
    intentId: 'menswear',
    motionVariant: 'zoom',
  },
  {
    id: 'scene-atelier',
    chapter: '04',
    title: 'Atelier Draping & Final Fit',
    subtitle: 'Mannequin silhouette balancing, steam finishing, and doorstep garment delivery with 7-day fit care.',
    durationSec: 6,
    image: ASSETS.atelierBoutiqueInterior,
    intentId: 'ethnic',
    motionVariant: 'pan',
  },
];

interface StitchingReelStripProps {
  activeSceneIndex: number;
  isPlaying: boolean;
  onSelectScene: (index: number) => void;
  onTogglePlay: () => void;
  onOpenFilmModal: (index: number) => void;
  onFilterByIntent: (intentId: string) => void;
}

export const StitchingReelStrip: React.FC<StitchingReelStripProps> = ({
  activeSceneIndex,
  isPlaying,
  onSelectScene,
  onTogglePlay,
  onOpenFilmModal,
  onFilterByIntent,
}) => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#0B7285]">
            Inside Our Partner Ateliers
          </p>
          <h2 className="font-serif-accent text-xl sm:text-2xl font-bold text-[#0B1F3A] mt-0.5">
            Tailoring Craftsmanship in Motion
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0B1F3A] hover:border-[#0B7285] hover:text-[#0B7285] transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause Reel' : 'Play Reel'}
          </button>
          <button
            type="button"
            onClick={() => onOpenFilmModal(activeSceneIndex)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-[#E2B14B] text-[#E2B14B]" />
            Watch Full Reel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CRAFT_REEL_SCENES.map((scene, idx) => {
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
              className={`group relative rounded-xl overflow-hidden bg-[#0B1F3A] border transition-all cursor-pointer ${
                isActive
                  ? 'border-[#C8922A] shadow-lg ring-1 ring-[#C8922A]/30'
                  : 'border-[#E2E8F0] hover:border-[#0B7285]/50'
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
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A]/95 via-[#0B1F3A]/35 to-transparent" />

                {/* Top Chapter + Play Button */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider text-[#E2B14B] tabular-nums">
                    {scene.chapter} · 0:0{scene.durationSec}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFilmModal(idx);
                    }}
                    aria-label={`Play ${scene.title} reel`}
                    className="w-8 h-8 rounded-full bg-[#0B1F3A]/75 hover:bg-[#C8922A] text-white flex items-center justify-center border border-white/25 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                </div>

                {/* Bottom Caption & Action */}
                <div className="absolute bottom-3 left-3.5 right-3.5">
                  <h3 className="font-serif-accent text-sm sm:text-base font-bold text-white leading-snug">
                    {scene.title}
                  </h3>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFilterByIntent(scene.intentId);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5EEAD4] hover:text-white transition-colors cursor-pointer"
                    >
                      View specialists
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Animated Video-Style Progress Bar */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/15 overflow-hidden">
                  {isActive && isPlaying ? (
                    <motion.div
                      key={`${scene.id}-progress`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: scene.durationSec, ease: 'linear' }}
                      style={{ transformOrigin: 'left center' }}
                      className="h-full w-full bg-gradient-to-r from-[#5EEAD4] to-[#E2B14B]"
                    />
                  ) : (
                    <div
                      className={`h-full transition-all ${
                        isActive ? 'w-full bg-[#E2B14B]' : 'w-0'
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
  open: boolean;
  initialIndex: number;
  onClose: () => void;
  onFilterByIntent: (intentId: string) => void;
}

export const CraftReelModal: React.FC<CraftReelModalProps> = ({
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
    if (!open || !playing) return;
    const current = CRAFT_REEL_SCENES[sceneIdx];
    const timer = window.setTimeout(() => {
      setSceneIdx((prev) => (prev + 1) % CRAFT_REEL_SCENES.length);
    }, current.durationSec * 1000);
    return () => window.clearTimeout(timer);
  }, [open, playing, sceneIdx]);

  if (!open) return null;

  const scene = CRAFT_REEL_SCENES[sceneIdx];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#061224]/85 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Tailering Craftsmanship Film Reel"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#0B1F3A] rounded-2xl overflow-hidden border border-white/15 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Progress Bars (Reel Chapters) */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          {CRAFT_REEL_SCENES.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSceneIdx(idx)}
              aria-label={`Jump to chapter ${item.chapter}: ${item.title}`}
              className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden cursor-pointer"
            >
              {idx < sceneIdx ? (
                <div className="h-full w-full bg-[#E2B14B]" />
              ) : idx === sceneIdx ? (
                playing ? (
                  <motion.div
                    key={`${item.id}-modal-bar-${sceneIdx}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: item.durationSec, ease: 'linear' }}
                    style={{ transformOrigin: 'left center' }}
                    className="h-full w-full bg-gradient-to-r from-[#5EEAD4] to-[#E2B14B]"
                  />
                ) : (
                  <div className="h-full w-1/2 bg-[#E2B14B]" />
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

        {/* Main 16:9 Animated Cinema Stage */}
        <div className="relative aspect-[16/9] bg-[#061224] overflow-hidden">
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

          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F3A] via-[#0B1F3A]/30 to-transparent" />

          {/* Subtle Animated Golden Thread Stitch Line */}
          <svg
            aria-hidden="true"
            viewBox="0 0 800 40"
            className="absolute bottom-28 sm:bottom-24 left-0 w-full h-8 opacity-60 pointer-events-none"
            preserveAspectRatio="none"
          >
            <path
              d="M 0 22 Q 200 4, 400 22 T 800 18"
              fill="none"
              stroke="#E2B14B"
              strokeWidth="1.5"
              className="animate-stitch-flow"
            />
          </svg>

          {/* Left / Right Scene Nav */}
          <button
            type="button"
            onClick={() =>
              setSceneIdx((prev) => (prev - 1 + CRAFT_REEL_SCENES.length) % CRAFT_REEL_SCENES.length)
            }
            aria-label="Previous chapter"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#0B1F3A]/65 hover:bg-[#0B1F3A] text-white flex items-center justify-center border border-white/15 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setSceneIdx((prev) => (prev + 1) % CRAFT_REEL_SCENES.length)}
            aria-label="Next chapter"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#0B1F3A]/65 hover:bg-[#0B1F3A] text-white flex items-center justify-center border border-white/15 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Bottom Stage Info */}
          <div className="absolute bottom-4 left-5 right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-xs font-semibold text-[#5EEAD4] tracking-wide">
                Chapter {scene.chapter} of 0{CRAFT_REEL_SCENES.length} · Tailering Craft Film
              </p>
              <h3 className="font-serif-accent text-xl sm:text-2xl font-bold text-white mt-1">
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#C8922A] hover:bg-[#B27D1D] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
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

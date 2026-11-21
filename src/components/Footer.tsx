import React from 'react';
import {
  Mail,
  MapPin,
  MessageCircle,
  AlertTriangle,
  Smartphone,
  Facebook,
  Instagram,
} from 'lucide-react';
import { PageRoute } from '../types';
import { TaileringLogo } from './TaileringLogo';

interface FooterProps {
  onNavigate: (page: PageRoute, opts?: { categoryId?: string }) => void;
  onOpenSupport: () => void;
  onOpenReferral: () => void;
  onNotifyToast: (msg: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenSupport,
  onOpenReferral,
  onNotifyToast,
}) => {
  return (
    <>
      <footer className="bg-[#0B1F3A] text-white mt-16 border-t border-[#15325B]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12 sm:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-white/10">
            {/* Brand Column */}
            <div className="md:col-span-4 space-y-4">
              <TaileringLogo compact inverted />
              <p className="text-xs leading-relaxed text-[#CBD5E1] max-w-xs">
                Bespoke doorstep tailoring for modern wardrobes. Precision measurements, master
                craftsmanship, and transparent delivery across Hyderabad.
              </p>
              <div className="space-y-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={onOpenSupport}
                  className="flex items-center gap-2 text-[#E2E8F0] hover:text-[#E2B14B] font-medium cursor-pointer transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#E2B14B]" />
                  support@tailering.in
                </button>
                <div className="flex items-center gap-3 text-[#CBD5E1]">
                  <button
                    type="button"
                    onClick={onOpenSupport}
                    className="inline-flex items-center gap-1.5 text-[#5EEAD4] font-semibold hover:underline cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Concierge Support
                  </button>
                  <span className="text-white/25">·</span>
                  <span className="inline-flex items-center gap-1 text-[#94A3B8]">
                    <MapPin className="w-3.5 h-3.5" />
                    Hyderabad
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  aria-label="Tailering Facebook"
                  onClick={() => onNotifyToast('Following Tailering on Facebook.')}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#0B7285] text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Facebook className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Tailering Instagram"
                  onClick={() => onNotifyToast('Following @tailering.in on Instagram.')}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#C8922A] text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Instagram className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Tailering X"
                  onClick={() => onNotifyToast('Following @tailering_in on X.')}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                >
                  𝕏
                </button>
              </div>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-8 space-y-6">
              <div>
                <h4 className="text-[11px] font-semibold tracking-[0.16em] text-[#E2B14B] uppercase mb-2.5">
                  Tailoring Services
                </h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#CBD5E1]">
                  <button
                    type="button"
                    onClick={() => onNavigate('custom-stitching')}
                    className="hover:text-white cursor-pointer transition-colors"
                  >
                    Custom Stitching
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('alterations')}
                    className="font-semibold text-[#5EEAD4] hover:underline cursor-pointer"
                  >
                    Doorstep Alterations
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('uniforms')}
                    className="hover:text-white cursor-pointer transition-colors"
                  >
                    Uniforms &amp; B2B
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('designs', { categoryId: 'blouse' })}
                    className="hover:text-white cursor-pointer transition-colors"
                  >
                    Women&apos;s Couture
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('designs', { categoryId: 'sherwanis' })}
                    className="hover:text-white cursor-pointer transition-colors"
                  >
                    Men&apos;s Bespoke
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('designs', { categoryId: 'maggam' })}
                    className="hover:text-white cursor-pointer transition-colors"
                  >
                    Maggam &amp; Bridal
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('measurements')}
                    className="hover:text-white cursor-pointer transition-colors"
                  >
                    Saved Measurements
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('nearby-shops')}
                    className="font-semibold text-[#E2B14B] hover:underline cursor-pointer"
                  >
                    Nearby Tailor Map
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold tracking-[0.16em] text-[#E2B14B] uppercase mb-2.5">
                  Platform &amp; Partners
                </h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#CBD5E1]">
                  <button
                    type="button"
                    onClick={() => onNavigate('home')}
                    className="hover:text-white cursor-pointer transition-colors"
                  >
                    About Tailering
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('partner')}
                    className="hover:text-white cursor-pointer transition-colors"
                  >
                    Master Tailors
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('partner')}
                    className="font-semibold text-[#5EEAD4] hover:underline cursor-pointer"
                  >
                    Partner with Us
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('alterations')}
                    className="hover:text-white cursor-pointer transition-colors"
                  >
                    Transparent Pricing
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={onOpenReferral}
                    className="font-semibold text-[#E2B14B] hover:underline cursor-pointer"
                  >
                    Refer &amp; Earn ₹50
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('auth')}
                    className="hover:text-white cursor-pointer transition-colors"
                  >
                    Business Login
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onOpenSupport}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E2E8F0] bg-white/8 border border-white/15 hover:border-[#E2B14B] hover:text-white px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#E2B14B]" />
                  Report Issue
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onNotifyToast(
                      'Tailering Mobile Web App ready — add to Home Screen from your browser menu.',
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B1F3A] bg-[#E2B14B] hover:bg-[#D49B2A] px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Install Mobile App
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11.5px] text-[#94A3B8]">
            <p>© 2026 Tailering. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() =>
                  onNotifyToast(
                    'Privacy Policy: Measurements & customer addresses are masked until tailor assignment.',
                  )
                }
                className="hover:text-white cursor-pointer transition-colors"
              >
                Privacy
              </button>
              <button
                type="button"
                onClick={() =>
                  onNotifyToast(
                    'Terms: Stitching starts only after customer approves final quote & delivery date.',
                  )
                }
                className="hover:text-white cursor-pointer transition-colors"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() =>
                  onNotifyToast(
                    'Fit Guarantee: Free 7-day doorstep alteration & refit on every custom garment.',
                  )
                }
                className="hover:text-white cursor-pointer transition-colors"
              >
                Fit Guarantee
              </button>
              <button
                type="button"
                onClick={() =>
                  onNotifyToast(
                    'Doorstep pickup & delivery across Alkapur Township, Manikonda & Hyderabad zones.',
                  )
                }
                className="hover:text-white cursor-pointer transition-colors"
              >
                Service Zones
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Concierge Support Button */}
      <button
        type="button"
        onClick={onOpenSupport}
        aria-label="Open Tailering Support"
        className="fixed bottom-5 right-5 z-30 w-12 h-12 rounded-full bg-[#0B7285] hover:bg-[#085463] text-white shadow-lg shadow-[#0B1F3A]/25 flex items-center justify-center transition-transform duration-150 hover:scale-105 cursor-pointer"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    </>
  );
};

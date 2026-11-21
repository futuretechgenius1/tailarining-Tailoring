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
import { StitchMateLogo } from './StitchMateLogo';

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
      <footer className="bg-white border-t border-[#EFE8E0] mt-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-[#F3ECE4]">
            {/* Brand Column */}
            <div className="md:col-span-4 space-y-3">
              <StitchMateLogo compact showSubtext={false} />
              <p className="text-xs leading-relaxed text-[#57534E] max-w-xs">
                Premium tailoring for modern styles. Craft garments that celebrate your unique style
                with verified Hyderabad master tailors at your doorstep.
              </p>
              <div className="space-y-1.5 pt-1 text-xs">
                <button
                  type="button"
                  onClick={onOpenSupport}
                  className="flex items-center gap-2 text-[#44403C] hover:text-[#EA580C] font-medium cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-[#EA580C]" />
                  support@stitchmate.in
                </button>
                <div className="flex items-center gap-3 text-[#44403C]">
                  <button
                    type="button"
                    onClick={onOpenSupport}
                    className="inline-flex items-center gap-1.5 text-[#16A34A] font-semibold hover:underline cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp Support
                  </button>
                  <span className="text-[#D6D3D1]">·</span>
                  <span className="inline-flex items-center gap-1 text-[#78716C]">
                    <MapPin className="w-3.5 h-3.5" />
                    Hyderabad
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  aria-label="StitchMate Facebook"
                  onClick={() => onNotifyToast('Following StitchMate on Facebook!')}
                  className="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                >
                  <Facebook className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="StitchMate Instagram"
                  onClick={() => onNotifyToast('Following @stitchmate.hyd on Instagram!')}
                  className="w-8 h-8 rounded-full bg-[#FDF2F8] text-[#DB2777] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                >
                  <Instagram className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="StitchMate X"
                  onClick={() => onNotifyToast('Following @stitchmate_in on X!')}
                  className="w-8 h-8 rounded-full bg-[#F5F5F4] text-[#1C1917] flex items-center justify-center font-bold text-xs hover:scale-105 transition-transform cursor-pointer"
                >
                  𝕏
                </button>
              </div>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-8 space-y-5">
              {/* Tailoring Services */}
              <div>
                <h4 className="text-[11px] font-bold tracking-[0.14em] text-[#78716C] uppercase mb-2">
                  TAILORING SERVICES
                </h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#44403C]">
                  <button
                    type="button"
                    onClick={() => onNavigate('custom-stitching')}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    Custom Stitching
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('alterations')}
                    className="font-semibold text-[#EA580C] hover:underline cursor-pointer"
                  >
                    Doorstep Alterations
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('uniforms')}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    Uniforms & Bulk
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('designs', { categoryId: 'blouse' })}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    Women&apos;s Tailoring
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('designs', { categoryId: 'sherwanis' })}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    Men&apos;s Tailoring
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('designs', { categoryId: 'maggam' })}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    Maggam Work & Bridal
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('measurements')}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    Free Measurements
                  </button>
                </div>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-[11px] font-bold tracking-[0.14em] text-[#78716C] uppercase mb-2">
                  COMPANY
                </h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#44403C]">
                  <button
                    type="button"
                    onClick={() => onNavigate('home')}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    About Us
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('partner')}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    Our Tailors
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('partner')}
                    className="font-semibold text-[#EA580C] hover:underline cursor-pointer"
                  >
                    Partner with Us
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('alterations')}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    Pricing
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={onOpenSupport}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    Contact
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={onOpenReferral}
                    className="font-semibold text-[#D97706] hover:underline cursor-pointer"
                  >
                    Refer & Earn (Win Cash)
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('auth')}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    Business Login
                  </button>
                </div>
              </div>

              {/* Support */}
              <div>
                <h4 className="text-[11px] font-bold tracking-[0.14em] text-[#78716C] uppercase mb-2">
                  SUPPORT
                </h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#44403C] mb-3.5">
                  <button
                    type="button"
                    onClick={() => onNavigate('home')}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    How It Works
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('measurements')}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    Measurement Guide
                  </button>
                  <span className="text-[#E7E5E4]">|</span>
                  <button
                    type="button"
                    onClick={onOpenSupport}
                    className="hover:text-[#EA580C] cursor-pointer"
                  >
                    FAQ & Help
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onOpenSupport}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#44403C] bg-[#FAF7F5] border border-[#E7E5E4] hover:border-[#EA580C] hover:text-[#EA580C] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-[#EA580C]" />
                    Report Issue
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onNotifyToast('StitchMate Mobile Web App ready — add to Home Screen from your browser menu!')
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Install App
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#78716C]">
            <p>© 2026 StitchMate. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => onNotifyToast('Privacy Policy: Customer measurements & addresses are encrypted and restricted to assigned tailors.')}
                className="hover:text-[#1C1917] cursor-pointer"
              >
                Privacy
              </button>
              <button
                type="button"
                onClick={() => onNotifyToast('Terms: Stitching starts only after final quote & delivery date approval.')}
                className="hover:text-[#1C1917] cursor-pointer"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => onNotifyToast('Refund & Refit Policy: Free 7-day doorstep alteration guarantee on all bespoke orders.')}
                className="hover:text-[#1C1917] cursor-pointer"
              >
                Refund
              </button>
              <button
                type="button"
                onClick={() => onNotifyToast('Doorstep Pickup & Delivery across Alkapur Township, Manikonda & Hyderabad zones.')}
                className="hover:text-[#1C1917] cursor-pointer"
              >
                Shipping
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Support Button (matching Screenshots 1, 2, 3) */}
      <button
        type="button"
        onClick={onOpenSupport}
        aria-label="Chat with StitchMate WhatsApp Support"
        className="fixed bottom-5 right-5 z-30 w-12 h-12 rounded-full bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-lg shadow-[#22C55E]/30 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </>
  );
};

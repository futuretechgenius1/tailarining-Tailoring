import React, { useState } from 'react';
import {
  ArrowRight,
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Youtube,
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
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      onNotifyToast('Please enter a valid email address to subscribe.');
      return;
    }
    setEmail('');
    onNotifyToast(`Subscribed ${trimmed} to Tailering lookbooks & offers.`);
  };

  return (
    <>
      <footer className="bg-[#19092C] text-white mt-14 border-t border-[#2E1352]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1.5fr_0.85fr_0.95fr_0.95fr_0.95fr_1.5fr] gap-8 items-start">
            {/* Column 1: Brand + Social Circles */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1 space-y-3.5">
              <TaileringLogo compact inverted />
              <p className="text-xs text-[#D8C8EC] leading-relaxed">
                Your Complete Tailoring Marketplace
              </p>
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  aria-label="Tailering YouTube"
                  onClick={() => onNotifyToast('Following Tailering Studio on YouTube.')}
                  className="w-8 h-8 rounded-full bg-[#DC2626] hover:opacity-90 text-white flex items-center justify-center transition-opacity cursor-pointer"
                >
                  <Youtube className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Tailering Instagram"
                  onClick={() => onNotifyToast('Following @tailering.in on Instagram.')}
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F59E0B] via-[#EC4899] to-[#7C3AED] hover:opacity-90 text-white flex items-center justify-center transition-opacity cursor-pointer"
                >
                  <Instagram className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Tailering Facebook"
                  onClick={() => onNotifyToast('Following Tailering on Facebook.')}
                  className="w-8 h-8 rounded-full bg-[#2563EB] hover:opacity-90 text-white flex items-center justify-center transition-opacity cursor-pointer"
                >
                  <Facebook className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Tailering LinkedIn"
                  onClick={() => onNotifyToast('Following Tailering on LinkedIn.')}
                  className="w-8 h-8 rounded-full bg-[#0284C7] hover:opacity-90 text-white flex items-center justify-center transition-opacity cursor-pointer"
                >
                  <Linkedin className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white tracking-wide">Quick Links</h4>
              <ul className="space-y-2 text-xs text-[#CBB8E4]">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('home')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Home
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('designs', { categoryId: 'all' })}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Designs
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('custom-stitching')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Custom Stitching
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('alterations')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Alterations
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('uniforms')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Uniforms
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: For Users */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white tracking-wide">For Users</h4>
              <ul className="space-y-2 text-xs text-[#CBB8E4]">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('home');
                      setTimeout(() => {
                        document
                          .getElementById('how-tailering-works')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }, 80);
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    How It Works
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('nearby-shops')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Find Tailors
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('fabric-calculator')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Fabric Calculator
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Track Order
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenSupport}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Help &amp; Support
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: For Tailors */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white tracking-wide">For Tailors</h4>
              <ul className="space-y-2 text-xs text-[#CBB8E4]">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('partner')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Become a Partner
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('partner')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Partner Benefits
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('alterations')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('auth')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Partner Login
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenReferral}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Refer &amp; Earn ₹50
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 5: Company */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white tracking-wide">Company</h4>
              <ul className="space-y-2 text-xs text-[#CBB8E4]">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('home')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    About Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      onNotifyToast('Hiring master pattern drafters & city ops in Hyderabad!')
                    }
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Careers
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      onNotifyToast(
                        'Terms: Stitching starts only after customer approves final quote & delivery date.',
                      )
                    }
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Terms &amp; Conditions
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      onNotifyToast(
                        'Privacy Policy: Measurements & addresses stay private until tailor assignment.',
                      )
                    }
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenSupport}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 6: Subscribe for Updates + Copyright */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1 space-y-4">
              <h4 className="text-xs font-bold text-white tracking-wide">Subscribe for Updates</h4>
              <form
                onSubmit={handleSubscribe}
                className="flex items-center bg-white rounded-full p-1 pl-4 shadow-md max-w-xs"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  aria-label="Email address for updates"
                  className="flex-1 min-w-0 bg-transparent text-xs text-[#1B1038] placeholder:text-[#8E7FA8] focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="w-8 h-8 rounded-full bg-gradient-to-r from-[#8B2FC9] to-[#6D1D9A] hover:from-[#7B23B5] hover:to-[#56148A] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
              <div className="w-10 h-px bg-white/20" />
              <p className="text-[11.5px] text-[#A993C7]">
                © 2026 Tailering. All Rights Reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Concierge Support Button */}
      <button
        type="button"
        onClick={onOpenSupport}
        aria-label="Open Tailering Support"
        className="fixed bottom-5 right-5 z-30 w-12 h-12 rounded-full bg-gradient-to-r from-[#7B23B5] to-[#5B178E] hover:from-[#6D1D9A] hover:to-[#4A1173] text-white shadow-lg shadow-[#5B178E]/35 flex items-center justify-center transition-transform duration-150 hover:scale-105 cursor-pointer"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    </>
  );
};

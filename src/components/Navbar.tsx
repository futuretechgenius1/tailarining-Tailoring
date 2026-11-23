import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Heart,
  MapPin,
  Menu,
  Search,
  ShoppingCart,
  User,
  X,
  Briefcase,
  LogOut,
  Compass,
  Ruler,
  Headphones,
} from 'lucide-react';
import { PageRoute, UserSession } from '../types';
import { TaileringLogo } from './TaileringLogo';

interface NavbarProps {
  activePage: PageRoute;
  onNavigate: (page: PageRoute, opts?: { categoryId?: string; searchQuery?: string }) => void;
  locality: string;
  onOpenLocationModal: () => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenSearch: () => void;
  onOpenSupport: () => void;
  user: UserSession | null;
  onLogout: () => void;
}

const DESIGN_DROPDOWN_ITEMS = [
  { label: 'All Curated Designs', categoryId: 'all' },
  { label: 'Designer Blouses', categoryId: 'blouse' },
  { label: 'Bridal & Maggam Work', categoryId: 'maggam' },
  { label: 'Lehengas & Half Sarees', categoryId: 'lehenga' },
  { label: 'Kurtis & Evening Gowns', categoryId: 'gown' },
  { label: 'Men Suits & Sherwanis', categoryId: 'sherwanis' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  locality,
  onOpenLocationModal,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenWishlist,
  onOpenSearch,
  onOpenSupport,
  user,
  onLogout,
}) => {
  const [designsOpen, setDesignsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDesignsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const displayLocality = locality.toLowerCase().includes('hyderabad')
    ? locality
    : `${locality}, Hyderabad`;

  const navLinkClass = (page: PageRoute) =>
    `relative text-[13.5px] font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1D9A] rounded-full ${
      activePage === page
        ? 'bg-gradient-to-r from-[#7B23B5] to-[#5B178E] text-white px-5 py-1.5 shadow-sm shadow-[#6D1D9A]/25'
        : 'text-[#1B1038] hover:text-[#6D1D9A] px-2.5 py-1.5 hover:bg-[#F5EFFB]'
    }`;

  return (
    <div className="sticky top-0 z-40 w-full bg-white shadow-[0_1px_12px_rgba(27,16,56,0.06)]">
      {/* TOP LAVENDER UTILITY BAR (Exact Match to Reference UI) */}
      <div className="bg-[#F5EFFB] border-b border-[#E9DDF6]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-9 flex items-center justify-between gap-3 text-[12px]">
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="inline-flex items-center gap-1.5 text-[#1B1038] hover:text-[#6D1D9A] transition-colors truncate cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-[#E11D48] shrink-0" />
            <span className="truncate font-semibold">{displayLocality}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#4B3F6B] shrink-0" />
          </button>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-[12px]">
            <button
              type="button"
              onClick={() => onNavigate('partner')}
              className="hidden sm:inline-flex items-center font-semibold text-[#1B1038] hover:text-[#6D1D9A] transition-colors whitespace-nowrap cursor-pointer"
            >
              Become a Tailor Partner
            </button>
            <span className="hidden sm:inline text-[#D5C3EC]" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={() => onNavigate('uniforms')}
              className="font-semibold text-[#1B1038] hover:text-[#6D1D9A] transition-colors whitespace-nowrap cursor-pointer"
            >
              Business (B2B)
            </button>
            <span className="text-[#D5C3EC]" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={onOpenSupport}
              className="font-semibold text-[#1B1038] hover:text-[#6D1D9A] transition-colors whitespace-nowrap cursor-pointer"
            >
              Help &amp; Support
            </button>
          </div>
        </div>
      </div>

      {/* PRIMARY WHITE HEADER ROW */}
      <header className="bg-white border-b border-[#EFE6F9]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 sm:h-[68px] flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1.5 rounded-xl text-[#1B1038] hover:bg-[#F5EFFB] transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6D1D9A] rounded-lg cursor-pointer"
            >
              <TaileringLogo compact={false} />
            </button>
          </div>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <nav
            className="hidden lg:flex items-center gap-3 xl:gap-5"
            aria-label="Primary Navigation"
          >
            <button type="button" onClick={() => onNavigate('home')} className={navLinkClass('home')}>
              Home
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDesignsOpen((o) => !o)}
                className={`inline-flex items-center gap-1 ${navLinkClass('designs')}`}
                aria-expanded={designsOpen}
              >
                Designs
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    designsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {designsOpen && (
                <div className="absolute left-0 top-full mt-3 w-64 bg-white rounded-2xl border border-[#EAE0FA] shadow-xl shadow-[#4C1D95]/10 py-2 z-50">
                  {DESIGN_DROPDOWN_ITEMS.map((item) => (
                    <button
                      key={item.categoryId}
                      type="button"
                      onClick={() => {
                        setDesignsOpen(false);
                        onNavigate('designs', { categoryId: item.categoryId });
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#1B1038] hover:bg-[#F5EFFB] hover:text-[#6D1D9A] transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  ))}
                  <div className="my-1.5 border-t border-[#F2EBFE]" />
                  <button
                    type="button"
                    onClick={() => {
                      setDesignsOpen(false);
                      onNavigate('fabric-calculator');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-[#6D1D9A] hover:bg-[#F5EFFB] flex items-center gap-2 cursor-pointer"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    Fabric Requirements Calculator
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDesignsOpen(false);
                      onNavigate('nearby-shops');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-[#6D1D9A] hover:bg-[#F5EFFB] flex items-center gap-2 cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Live Nearby Tailor Map
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('custom-stitching')}
              className={navLinkClass('custom-stitching')}
            >
              Custom Stitching
            </button>
            <button
              type="button"
              onClick={() => onNavigate('alterations')}
              className={navLinkClass('alterations')}
            >
              Alterations
            </button>
            <button
              type="button"
              onClick={() => onNavigate('uniforms')}
              className={navLinkClass('uniforms')}
            >
              Uniforms
            </button>
            <button
              type="button"
              onClick={() => onNavigate('measurements')}
              className={navLinkClass('measurements')}
            >
              Measurements
            </button>
          </nav>

          {/* Zone 3: Search, Wishlist, Cart & Sign In Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Search designs and services"
              className="p-2 rounded-full text-[#1B1038] hover:bg-[#F5EFFB] hover:text-[#6D1D9A] transition-colors cursor-pointer"
            >
              <Search className="w-[19px] h-[19px]" />
            </button>

            <button
              type="button"
              onClick={onOpenWishlist}
              aria-label="Saved designs"
              className="relative p-2 rounded-full text-[#1B1038] hover:bg-[#F5EFFB] hover:text-[#6D1D9A] transition-colors cursor-pointer"
            >
              <Heart className="w-[19px] h-[19px]" />
              {wishlistCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#6D1D9A] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {wishlistCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              aria-label="Shopping cart"
              className="relative p-2 rounded-full text-[#1B1038] hover:bg-[#F5EFFB] hover:text-[#6D1D9A] transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-[19px] h-[19px]" />
              <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#E11D48] text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                {cartCount}
              </span>
            </button>

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 bg-[#F5EFFB] border border-[#DDD0FA] text-[#5B178E] hover:bg-[#EAE0FA] px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-[#EAE0FA] shadow-xl shadow-[#4C1D95]/10 py-2 z-50">
                    <div className="px-4 py-2.5 border-b border-[#F5EFFB]">
                      <p className="text-xs font-bold text-[#1B1038] truncate">{user.name}</p>
                      <p className="text-[11px] text-[#6D1D9A] font-semibold capitalize">
                        {user.role === 'owner'
                          ? 'App Owner Console'
                          : user.role === 'tailor'
                            ? 'Tailor Partner'
                            : 'Customer Account'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigate('dashboard');
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#6D1D9A] bg-[#FAF8FF] hover:bg-[#F5EFFB] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      Open{' '}
                      {user.role === 'owner'
                        ? 'App Owner Dashboard'
                        : user.role === 'tailor'
                          ? 'Tailor Dashboard'
                          : 'Customer Dashboard'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigate('measurements');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-[#4B3F6B] hover:bg-[#F5EFFB] hover:text-[#6D1D9A] cursor-pointer"
                    >
                      Saved Measurements
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigate('fabric-calculator');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-[#4B3F6B] hover:bg-[#F5EFFB] hover:text-[#6D1D9A] cursor-pointer"
                    >
                      Fabric Calculator
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigate('nearby-shops');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-[#4B3F6B] hover:bg-[#F5EFFB] hover:text-[#6D1D9A] cursor-pointer"
                    >
                      Nearby Tailor Map
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50 flex items-center gap-1.5 border-t border-[#F5EFFB] mt-1 pt-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('auth')}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#5D1A8E] to-[#3B0D63] hover:from-[#4C1476] hover:to-[#2B084A] text-white text-xs sm:text-[13.5px] font-semibold px-4 sm:px-5 py-2 rounded-full shadow-md shadow-[#4C1476]/25 transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#1B1038]/45 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-[84%] max-w-[320px] bg-white h-full shadow-2xl flex flex-col justify-between z-10 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAE0FA]">
                <TaileringLogo compact />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 rounded-xl text-[#4B3F6B] hover:bg-[#F5EFFB]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-1">
                {(
                  [
                    { label: 'Home', route: 'home' },
                    { label: 'Browse Designs', route: 'designs' },
                    { label: 'Custom Stitching', route: 'custom-stitching' },
                    { label: 'Doorstep Alterations', route: 'alterations' },
                    { label: 'Uniforms & Business (B2B)', route: 'uniforms' },
                    { label: 'Saved Measurements', route: 'measurements' },
                    { label: 'Fabric Calculator', route: 'fabric-calculator' },
                    { label: 'Nearby Tailor Map', route: 'nearby-shops' },
                    { label: 'Become a Tailor Partner', route: 'partner' },
                    {
                      label: user ? 'My Role Dashboard' : 'Dashboard Sign In',
                      route: user ? 'dashboard' : 'auth',
                    },
                  ] as { label: string; route: PageRoute }[]
                ).map((item) => (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate(item.route);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors ${
                      activePage === item.route
                        ? 'bg-gradient-to-r from-[#7B23B5] to-[#5B178E] text-white shadow-xs'
                        : 'text-[#1B1038] hover:bg-[#FAF8FF]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-4 h-4 opacity-60" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenSupport();
                  }}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-[#6D1D9A] hover:bg-[#F5EFFB] flex items-center gap-2"
                >
                  <Headphones className="w-4 h-4" />
                  Help &amp; Support
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-[#EAE0FA] bg-[#FAF8FF] space-y-3">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLocationModal();
                }}
                className="flex items-center gap-2 text-xs text-[#4B3F6B] w-full text-left"
              >
                <MapPin className="w-3.5 h-3.5 text-[#E11D48] shrink-0" />
                <span className="truncate font-semibold">{displayLocality}</span>
              </button>
              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('auth');
                  }}
                  className="w-full bg-gradient-to-r from-[#5D1A8E] to-[#3B0D63] text-white py-2.5 rounded-full text-sm font-semibold shadow-sm"
                >
                  Sign In / Join Tailering
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full bg-white border border-red-200 text-red-600 py-2.5 rounded-full text-sm font-semibold"
                >
                  Sign Out ({user.name.split(' ')[0]})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

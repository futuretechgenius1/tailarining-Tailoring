import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Heart,
  MapPin,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
  Briefcase,
  LogOut,
  Compass,
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
  user: UserSession | null;
  onLogout: () => void;
}

const DESIGN_DROPDOWN_ITEMS = [
  { label: 'All Curated Designs (724+)', categoryId: 'all' },
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

  const navLinkClass = (page: PageRoute) =>
    `relative py-1 text-[13.5px] font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B7285] rounded ${
      activePage === page
        ? 'text-[#0B7285] after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-[2px] after:bg-[#C8922A] after:rounded-full'
        : 'text-[#334155] hover:text-[#0B1F3A]'
    }`;

  return (
    <div className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
      {/* Primary Single-Row Header */}
      <header className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 sm:h-[68px] flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-1.5 rounded-lg text-[#0B1F3A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B7285] rounded-lg cursor-pointer"
          >
            <TaileringLogo compact={false} />
          </button>
        </div>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="Primary Navigation">
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
                  designsOpen ? 'rotate-180 text-[#0B7285]' : ''
                }`}
              />
            </button>

            {designsOpen && (
              <div className="absolute left-0 top-full mt-3 w-64 bg-white rounded-xl border border-[#E2E8F0] shadow-xl py-2 z-50">
                {DESIGN_DROPDOWN_ITEMS.map((item) => (
                  <button
                    key={item.categoryId}
                    type="button"
                    onClick={() => {
                      setDesignsOpen(false);
                      onNavigate('designs', { categoryId: item.categoryId });
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#1E293B] hover:bg-[#F0F9FA] hover:text-[#0B7285] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                ))}
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
          <button
            type="button"
            onClick={() => onNavigate('nearby-shops')}
            className={navLinkClass('nearby-shops')}
          >
            Nearby Shops
          </button>
        </nav>

        {/* Zone 3: Functional Actions & Account */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search designs and services"
            className="p-2 rounded-lg text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0B1F3A] transition-colors cursor-pointer"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>

          <button
            type="button"
            onClick={onOpenWishlist}
            aria-label="Saved designs"
            className="relative p-2 rounded-lg text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0B1F3A] transition-colors cursor-pointer"
          >
            <Heart className="w-[18px] h-[18px]" />
            {wishlistCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C8922A] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Shopping bag"
            className="relative p-2 rounded-lg text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0B1F3A] transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-[18px] h-[18px]" />
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#0B1F3A] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
              {cartCount}
            </span>
          </button>

          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 bg-[#F0F9FA] border border-[#CBE7EC] text-[#0B7285] hover:bg-[#E1F4F7] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span className="max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-[#E2E8F0] shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-[#F1F5F9]">
                    <p className="text-xs font-bold text-[#0B1F3A] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#0B7285] font-semibold capitalize">
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
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#0B7285] bg-[#F0F9FA]/70 hover:bg-[#F0F9FA] flex items-center gap-1.5 cursor-pointer"
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
                    className="w-full text-left px-4 py-2 text-xs font-medium text-[#334155] hover:bg-[#F0F9FA] hover:text-[#0B7285] cursor-pointer"
                  >
                    Saved Measurements
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onNavigate('nearby-shops');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-[#334155] hover:bg-[#F0F9FA] hover:text-[#0B7285] cursor-pointer"
                  >
                    Find Nearest Tailor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50 flex items-center gap-1.5 border-t border-[#F1F5F9] mt-1 pt-2 cursor-pointer"
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
              className="bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs sm:text-[13px] font-semibold px-4 sm:px-5 py-2 rounded-lg shadow-xs transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Slim Service Locality Bar */}
      <div className="bg-[#F8FAFC] border-t border-[#E2E8F0]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-8 flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="inline-flex items-center gap-1.5 text-[#334155] hover:text-[#0B7285] transition-colors truncate cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-[#0B7285] shrink-0" />
            <span className="text-[#64748B] hidden sm:inline">Serving:</span>
            <span className="truncate font-semibold text-[#0B1F3A]">{locality}</span>
          </button>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('nearby-shops')}
              className="inline-flex items-center gap-1 text-[#0B7285] hover:text-[#085463] font-semibold text-[11.5px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              Live Map
            </button>
            <span className="text-[#CBD5E1]" aria-hidden="true">|</span>
            <button
              type="button"
              onClick={onOpenLocationModal}
              className="inline-flex items-center gap-0.5 text-[#475569] hover:text-[#0B1F3A] font-semibold text-[11.5px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Change
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0B1F3A]/45 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-[84%] max-w-[320px] bg-white h-full shadow-2xl flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
                <TaileringLogo compact />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 rounded-lg text-[#475569] hover:bg-[#F1F5F9]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-1">
                {(
                  [
                    { label: 'Home', route: 'home' },
                    { label: 'Browse Designs (724+)', route: 'designs' },
                    { label: 'Custom Stitching', route: 'custom-stitching' },
                    { label: 'Doorstep Alterations', route: 'alterations' },
                    { label: 'Institutional Uniforms', route: 'uniforms' },
                    { label: 'Saved Measurements', route: 'measurements' },
                    { label: 'Nearby Tailor Shops (Live Map)', route: 'nearby-shops' },
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
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors ${
                      activePage === item.route
                        ? 'bg-[#F0F9FA] text-[#0B7285]'
                        : 'text-[#1E293B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
              <div className="flex items-center gap-2 text-xs text-[#475569]">
                <MapPin className="w-3.5 h-3.5 text-[#0B7285] shrink-0" />
                <span className="truncate font-medium">{locality}</span>
              </div>
              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('auth');
                  }}
                  className="w-full bg-[#0B1F3A] hover:bg-[#15325B] text-white py-2.5 rounded-lg text-sm font-semibold shadow-xs"
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
                  className="w-full bg-white border border-red-200 text-red-600 py-2.5 rounded-lg text-sm font-semibold"
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

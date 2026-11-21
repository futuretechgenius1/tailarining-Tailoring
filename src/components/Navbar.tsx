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
} from 'lucide-react';
import { PageRoute, UserSession } from '../types';
import { StitchMateLogo } from './StitchMateLogo';

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
    `relative py-1 text-[13.5px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
      activePage === page
        ? 'text-[#EA580C] after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-[2px] after:bg-[#EA580C] after:rounded-full'
        : 'text-[#44403C] hover:text-[#EA580C]'
    }`;

  return (
    <div className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md shadow-[0_1px_0_rgba(28,25,23,0.06)]">
      {/* Main Top Navigation Row */}
      <header className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Button + StitchMate Brand Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-1 rounded-lg text-[#44403C] hover:bg-[#FFF7ED] hover:text-[#EA580C] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C] rounded-lg cursor-pointer"
          >
            <StitchMateLogo compact={false} />
          </button>
        </div>

        {/* Center: Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="Primary Navigation">
          <button type="button" onClick={() => onNavigate('home')} className={navLinkClass('home')}>
            Home
          </button>

          {/* Designs Dropdown */}
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
                  designsOpen ? 'rotate-180 text-[#EA580C]' : ''
                }`}
              />
            </button>

            {designsOpen && (
              <div className="absolute left-0 top-full mt-3 w-64 bg-white rounded-xl border border-[#F3E8DC] shadow-xl py-2 z-50">
                {DESIGN_DROPDOWN_ITEMS.map((item) => (
                  <button
                    key={item.categoryId}
                    type="button"
                    onClick={() => {
                      setDesignsOpen(false);
                      onNavigate('designs', { categoryId: item.categoryId });
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-[#292524] hover:bg-[#FFF7ED] hover:text-[#EA580C] transition-colors flex items-center justify-between cursor-pointer"
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
        </nav>

        {/* Right: Search, Wishlist, Bag, Login */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search designs and services"
            className="p-2 rounded-full text-[#44403C] hover:bg-[#FFF7ED] hover:text-[#EA580C] transition-colors cursor-pointer"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>

          <button
            type="button"
            onClick={onOpenWishlist}
            aria-label="Wishlist"
            className="relative p-2 rounded-full text-[#44403C] hover:bg-[#FFF7ED] hover:text-[#EA580C] transition-colors cursor-pointer"
          >
            <Heart className="w-[18px] h-[18px]" />
            {wishlistCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#E11D48] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Shopping bag"
            className="relative p-2 rounded-full text-[#44403C] hover:bg-[#FFF7ED] hover:text-[#EA580C] transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-[18px] h-[18px]" />
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#1C1917] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
              {cartCount}
            </span>
          </button>

          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] hover:bg-[#FFEDD5] px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span className="max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-[#F3E8DC] shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-[#F5F5F4]">
                    <p className="text-xs font-bold text-[#1C1917] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#78716C] capitalize">{user.role} Account</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onNavigate('measurements');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-[#44403C] hover:bg-[#FFF7ED] hover:text-[#EA580C] cursor-pointer"
                  >
                    Saved Measurements
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onNavigate('alterations');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-[#44403C] hover:bg-[#FFF7ED] hover:text-[#EA580C] cursor-pointer"
                  >
                    My Bookings & Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onNavigate('partner');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-[#44403C] hover:bg-[#FFF7ED] hover:text-[#EA580C] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    Partner / Admin Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50 flex items-center gap-1.5 border-t border-[#F5F5F4] mt-1 pt-2 cursor-pointer"
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
              className="bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs sm:text-[13px] font-bold px-4 sm:px-5 py-2 rounded-full shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              Login
            </button>
          )}
        </div>
      </header>

      {/* Location Sub-bar (Matching Screenshots 1, 2, 3) */}
      <div className="bg-[#FFF9F2] border-y border-[#F3E8DC]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-9 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="inline-flex items-center gap-1.5 text-[#292524] font-medium hover:text-[#EA580C] transition-colors truncate cursor-pointer"
          >
            <span className="w-5 h-5 rounded-full bg-[#FFEDD5] text-[#EA580C] inline-flex items-center justify-center shrink-0">
              <MapPin className="w-3 h-3" />
            </span>
            <span className="truncate font-semibold">{locality}</span>
          </button>

          <button
            type="button"
            onClick={onOpenLocationModal}
            className="inline-flex items-center gap-0.5 text-[#EA580C] font-semibold bg-white border border-[#FED7AA] hover:bg-[#FFF7ED] px-2.5 py-0.5 rounded-full text-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Change
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-[82%] max-w-[320px] bg-white h-full shadow-2xl flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3E8DC]">
                <StitchMateLogo compact />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 rounded-lg text-[#57534E] hover:bg-[#FFF7ED]"
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
                    { label: 'Tailor Partner Portal', route: 'partner' },
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
                        ? 'bg-[#FFF7ED] text-[#EA580C]'
                        : 'text-[#292524] hover:bg-[#FAF7F5]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-[#F3E8DC] bg-[#FFF9F2] space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-[#57534E]">
                <MapPin className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                <span className="truncate font-medium">{locality}</span>
              </div>
              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('auth');
                  }}
                  className="w-full bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white py-2.5 rounded-xl text-sm font-bold shadow-sm"
                >
                  Login / Join StitchMate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full bg-white border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-semibold"
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

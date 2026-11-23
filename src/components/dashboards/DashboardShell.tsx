import React, { useEffect, useState } from 'react';
import {
  Bell,
  ChevronRight,
  Grid,
  Home,
  LogOut,
  Menu,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { UserSession } from '../../types';
import { TaileringLogo } from '../TaileringLogo';

export interface DashboardNavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface DashboardShellProps {
  user: UserSession;
  roleTitle: string;
  roleSubtitle: string;
  navItems: DashboardNavItem[];
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onBackToStorefront: () => void;
  onLogout: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  user,
  roleTitle,
  roleSubtitle,
  navItems,
  activeSection,
  onSelectSection,
  unreadNotifications = 0,
  onOpenNotifications,
  onRefresh,
  refreshing = false,
  onBackToStorefront,
  onLogout,
  headerAction,
  children,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const currentItem = navItems.find((i) => i.id === activeSection) || navItems[0];

  const needsMoreTab = navItems.length > 5;
  const bottomNavItems = needsMoreTab ? navItems.slice(0, 4) : navItems;
  const overflowItems = needsMoreTab ? navItems.slice(4) : [];
  const isOverflowActive = overflowItems.some((i) => i.id === activeSection);

  useEffect(() => {
    if (!mobileDrawerOpen && !moreSheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileDrawerOpen(false);
        setMoreSheetOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileDrawerOpen, moreSheetOpen]);

  const handleSelect = (id: string) => {
    onSelectSection(id);
    setMobileDrawerOpen(false);
    setMoreSheetOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#1A103D] via-[#231252] to-[#1A103D] text-white select-none">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackToStorefront}
          className="text-left focus:outline-none cursor-pointer"
        >
          <TaileringLogo inverted compact />
        </button>
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl flex items-center justify-center text-[#DDD6FE] hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role Context */}
      <div className="px-5 py-3.5 border-b border-white/10 bg-white/[0.04]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#F59E0B]">
          <ShieldCheck className="w-4 h-4 text-[#C4B5FD] shrink-0" />
          <span className="truncate">{roleTitle}</span>
        </div>
        <p className="text-xs text-[#DDD6FE]/80 mt-0.5 truncate">{roleSubtitle}</p>
      </div>

      {/* Left-Side Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-3.5 space-y-1" aria-label={`${roleTitle} Menu`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`w-full min-h-[44px] flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#6B21D9] text-white shadow-md shadow-[#6B21D9]/30'
                  : 'text-[#DDD6FE]/85 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#A78BFA]'}`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-[#6B21D9]/40 text-[#DDD6FE]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account Footer */}
      <div className="p-4 border-t border-white/10 bg-[#120A2C]/80 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-xl bg-[#6B21D9]/40 border border-[#C4B5FD]/30 text-[#DDD6FE] font-bold text-sm flex items-center justify-center shrink-0 uppercase">
            {user.name.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{user.name}</p>
            <p className="text-[11px] text-[#C4B5FD]/75 truncate">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onBackToStorefront}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Storefront</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/25 text-xs font-semibold text-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex">
      {/* Desktop Persistent Left Sidebar (264px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[264px] lg:fixed lg:inset-y-0 lg:left-0 z-30 shadow-xl">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Full Slide-Over Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#1A103D]/60 backdrop-blur-[2px]"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative w-[84%] max-w-[300px] h-full shadow-2xl z-10">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Mobile "More" Bottom Sheet for Overflow Sections */}
      {moreSheetOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex items-end bg-[#1A103D]/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMoreSheetOpen(false);
          }}
        >
          <div className="w-full bg-white rounded-t-3xl border-t border-[#EAE0FA] shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden">
            <div className="pt-3 pb-1 flex justify-center">
              <span className="w-10 h-1.5 rounded-full bg-[#DCD0F5]" />
            </div>
            <div className="px-5 py-3 border-b border-[#EAE0FA] flex items-center justify-between">
              <div>
                <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                  {roleTitle} Menu
                </h2>
                <p className="text-xs text-[#5B4E7A] truncate">{user.name} · {user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreSheetOpen(false)}
                aria-label="Close menu sheet"
                className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl flex items-center justify-center text-[#5B4E7A] hover:bg-[#F4EEFF] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-1.5">
              {overflowItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full min-h-[48px] px-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#6B21D9] text-white'
                        : 'bg-[#FAF8FF] text-[#1A103D] hover:bg-[#F4EEFF]'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-[#6B21D9]'}`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="text-xs font-bold tabular-nums text-[#F59E0B]">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 opacity-60" />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-[#EAE0FA] bg-[#FAF8FF] grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMoreSheetOpen(false);
                  onBackToStorefront();
                }}
                className="min-h-[46px] rounded-xl border border-[#DCD0F5] bg-white text-xs font-bold text-[#1A103D] inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4 text-[#6B21D9]" />
                Storefront
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreSheetOpen(false);
                  onLogout();
                }}
                className="min-h-[46px] rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[264px] flex flex-col min-w-0">
        {/* Compact Sticky Top App Bar */}
        <header className="sticky top-0 z-20 h-14 lg:h-16 bg-white/95 backdrop-blur-md border-b border-[#EAE0FA] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-h-[44px] min-w-[44px] -ml-1 rounded-xl flex items-center justify-center text-[#1A103D] hover:bg-[#F4EEFF] cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm min-w-0">
              <span className="text-[#5B4E7A] font-medium hidden md:inline whitespace-nowrap">
                {roleTitle}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-[#9488B3] hidden md:inline shrink-0" />
              <h1 className="font-serif-accent text-base sm:text-lg font-bold text-[#1A103D] truncate">
                {currentItem?.label || 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh live data"
                className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] rounded-xl border border-[#EAE0FA] bg-white hover:border-[#6B21D9] text-[#5B4E7A] hover:text-[#6B21D9] inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                aria-label="Notifications"
                className="relative min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] rounded-xl border border-[#EAE0FA] bg-white hover:border-[#6B21D9] text-[#5B4E7A] hover:text-[#6B21D9] inline-flex items-center justify-center transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#F59E0B] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
            )}

            {headerAction}
          </div>
        </header>

        {/* Active Section Viewport */}
        <main className="flex-1 px-3.5 py-4 sm:p-6 lg:p-7 pb-24 lg:pb-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile quick navigation"
        className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white/95 backdrop-blur-md border-t border-[#EAE0FA] shadow-[0_-4px_16px_rgba(107,33,217,0.08)]"
      >
        <div
          className={`grid h-16 items-center px-1 ${
            needsMoreTab
              ? 'grid-cols-5'
              : bottomNavItems.length === 4
                ? 'grid-cols-4'
                : 'grid-cols-5'
          }`}
        >
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            const label = item.shortLabel || item.label.split(' ')[0];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
                  active ? 'text-[#6B21D9]' : 'text-[#5B4E7A] hover:text-[#1A103D]'
                }`}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" />
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#F59E0B] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-semibold tracking-tight truncate max-w-[68px]">
                  {label}
                </span>
              </button>
            );
          })}

          {needsMoreTab && (
            <button
              type="button"
              onClick={() => setMoreSheetOpen(true)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors cursor-pointer ${
                isOverflowActive || moreSheetOpen
                  ? 'text-[#6B21D9]'
                  : 'text-[#5B4E7A] hover:text-[#1A103D]'
              }`}
            >
              <Grid className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-tight">More</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};

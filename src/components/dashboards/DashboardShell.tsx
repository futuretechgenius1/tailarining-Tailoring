import React, { useState } from 'react';
import {
  Bell,
  ChevronRight,
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const currentItem = navItems.find((i) => i.id === activeSection) || navItems[0];

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#0B1F3A] text-white select-none">
      {/* Brand + Role Header */}
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
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
            className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role Context Banner */}
      <div className="px-5 py-3.5 border-b border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#E2B14B]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5EEAD4]" />
          <span>{roleTitle}</span>
        </div>
        <p className="text-xs text-slate-300 mt-0.5 truncate">{roleSubtitle}</p>
      </div>

      {/* Left-Side Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label={`${roleTitle} Menu`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                if (isMobile) setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-[#0B7285] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-[#5EEAD4]' : 'text-slate-400'}`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                    active ? 'bg-white/20 text-white' : 'bg-[#C8922A] text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom User Card & Actions */}
      <div className="p-4 border-t border-white/10 bg-[#071529]/70 space-y-2.5">
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 rounded-xl bg-[#0B7285]/30 border border-[#5EEAD4]/30 text-[#5EEAD4] font-bold text-sm flex items-center justify-center shrink-0 uppercase">
            {user.name.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{user.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onBackToStorefront}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-[11.5px] font-semibold text-white transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            Storefront
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/25 text-[11.5px] font-semibold text-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Desktop Persistent Left Sidebar (260px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[264px] lg:fixed lg:inset-y-0 lg:left-0 z-30 shadow-xl">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Collapsible Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0B1F3A]/60 backdrop-blur-[2px]"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative w-[82%] max-w-[290px] h-full shadow-2xl z-10">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[264px] flex flex-col min-w-0">
        {/* Top Bar with Breadcrumb, Refresh, Notifications & Primary Action */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open dashboard navigation"
              className="lg:hidden p-2 -ml-1.5 rounded-lg text-[#0B1F3A] hover:bg-[#F1F5F9] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm min-w-0">
              <span className="text-[#64748B] font-medium hidden sm:inline">{roleTitle}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] hidden sm:inline shrink-0" />
              <h1 className="font-serif-accent text-base sm:text-lg font-bold text-[#0B1F3A] truncate">
                {currentItem?.label || 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh live data"
                className="p-2 rounded-lg border border-[#E2E8F0] bg-white hover:border-[#0B7285] text-[#475569] hover:text-[#0B7285] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                aria-label="Notifications"
                className="relative p-2 rounded-lg border border-[#E2E8F0] bg-white hover:border-[#0B7285] text-[#475569] hover:text-[#0B7285] transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C8922A] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            )}

            {headerAction}
          </div>
        </header>

        {/* Active Section Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

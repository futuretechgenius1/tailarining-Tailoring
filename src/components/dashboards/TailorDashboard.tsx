import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Calendar,
  Camera,
  CheckCircle2,
  CreditCard,
  ImageIcon,
  LayoutDashboard,
  Package,
  Pencil,
  Plus,
  Scissors,
  Store,
  Trash2,
} from 'lucide-react';
import { UserSession } from '../../types';
import {
  apiRequest,
  notificationApi,
  NotificationItem,
  PaginationMeta,
  tailorLogoApi,
  TailorPortfolioItem,
} from '../../services/api';
import { DashboardNavItem, DashboardShell } from './DashboardShell';
import {
  CategoryThumbnail,
  DashboardSkeleton,
  MobileBottomSheetModal,
  PaginationBar,
} from './DashboardPrimitives';
import { TailorPortfolioView } from './TailorPortfolioView';
import { SafeImage } from '../SafeImage';
import { ShopLogoUploader, TailorLogoBadge } from '../TailorLogoBadge';

interface TailorDashboardProps {
  user: UserSession;
  onBackToStorefront: () => void;
  onLogout: () => void;
  onNotifyToast: (msg: string) => void;
}

const TAILOR_STAGES = [
  'Tailor Accepted',
  'Visit Scheduled',
  'Measurements Completed',
  'Quotation Submitted',
  'Stitching Started',
  'Quality Check',
  'Ready for Delivery',
  'Delivered',
] as const;

export const TailorDashboard: React.FC<TailorDashboardProps> = ({
  user,
  onBackToStorefront,
  onLogout,
  onNotifyToast,
}) => {
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [queueTab, setQueueTab] = useState<'assigned' | 'open'>('assigned');

  const [overview, setOverview] = useState<{
    profile: Record<string, unknown>;
    kpis: Record<string, number>;
    recentOrders: Record<string, unknown>[];
  } | null>(null);

  const [assignedOrders, setAssignedOrders] = useState<Record<string, unknown>[]>([]);
  const [openOrders, setOpenOrders] = useState<Record<string, unknown>[]>([]);
  const [services, setServices] = useState<Record<string, unknown>[]>([]);
  const [earnings, setEarnings] = useState<{
    commissionRate: number;
    summary: Record<string, number>;
    ledger: Record<string, unknown>[];
  } | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Profile Editor State
  const [profileForm, setProfileForm] = useState({
    shopName: '',
    masterTailor: '',
    bio: '',
    locality: '',
    address: '',
    specialtiesText: '',
    workingHours: '',
    experienceYears: '5',
    homeVisitFee: '49',
    coverImageUrl: '',
    logoUrl: '',
    turnaroundText: '3–5 Days',
    turnaroundDays: '4',
    pickupAvailable: true,
    isAvailable: true,
  });
  const [profilePortfolioChoices, setProfilePortfolioChoices] = useState<TailorPortfolioItem[]>([]);

  // Add / Edit Service & Portfolio Upload Modals
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [portfolioUploadOpen, setPortfolioUploadOpen] = useState(false);
  const [portfolioRefreshTick, setPortfolioRefreshTick] = useState(0);
  const [serviceForm, setServiceForm] = useState({
    title: '',
    category: 'custom' as 'custom' | 'alteration' | 'uniform' | 'bridal' | 'menswear',
    description: '',
    basePrice: '899',
    turnaroundDays: '3',
  });

  // Quote & Timeline Editor per order
  const [editingOrder, setEditingOrder] = useState<{
    id: number;
    orderCode: string;
    quotedAmount: string;
    deliveryDate: string;
    status: string;
    note: string;
  } | null>(null);

  const handleSelectSection = (nextSection: string) => {
    setSection(nextSection);
    setPage(1);
    setPagination(null);
  };

  const loadSectionData = useCallback(
    async (target: string, targetPage = page, targetLimit = limit) => {
      setLoading(true);
      setError(null);
      try {
        const notifRes = await notificationApi.list(
          target === 'notifications' ? targetPage : 1,
          target === 'notifications' ? targetLimit : 10,
        );
        setNotifications(notifRes.notifications);
        setUnreadCount(notifRes.unreadCount);

        if (target === 'notifications') {
          setPagination(notifRes.pagination ?? null);
        } else if (target === 'overview') {
          const data = await apiRequest<{
            profile: Record<string, unknown>;
            kpis: Record<string, number>;
            recentOrders: Record<string, unknown>[];
          }>('/api/tailor/overview');
          setOverview(data);
          setPagination(null);
        } else if (target === 'orders') {
          const params = new URLSearchParams({
            page: String(targetPage),
            limit: String(targetLimit),
          });
          if (orderStatusFilter) params.set('status', orderStatusFilter);
          const data = await apiRequest<{
            assignedOrders: Record<string, unknown>[];
            openOrders: Record<string, unknown>[];
            pagination?: PaginationMeta;
          }>(`/api/tailor/orders?${params}`);
          setAssignedOrders(data.assignedOrders);
          setOpenOrders(data.openOrders);
          setPagination(data.pagination ?? null);
        } else if (target === 'services') {
          const data = await apiRequest<{
            services: Record<string, unknown>[];
            pagination?: PaginationMeta;
          }>(`/api/tailor/services?page=${targetPage}&limit=${targetLimit}`);
          setServices(data.services);
          setPagination(data.pagination ?? null);
        } else if (target === 'profile') {
          const [data, portRes] = await Promise.all([
            apiRequest<{ profile: Record<string, unknown> }>('/api/tailor/profile'),
            apiRequest<{ items: TailorPortfolioItem[] }>('/api/tailor/portfolio?page=1&limit=12').catch(
              () => ({ items: [] }),
            ),
          ]);
          const p = data.profile;
          setProfilePortfolioChoices(portRes.items || []);
          setProfileForm({
            shopName: String(p.shopName || ''),
            masterTailor: String(p.masterTailor || ''),
            bio: String(p.bio || ''),
            locality: String(p.locality || ''),
            address: String(p.address || ''),
            specialtiesText: Array.isArray(p.specialties) ? (p.specialties as string[]).join(', ') : '',
            workingHours: String(p.workingHours || ''),
            experienceYears: String(p.experienceYears ?? 5),
            homeVisitFee: String(p.homeVisitFee ?? 49),
            coverImageUrl: String(p.coverImageUrl || ''),
            logoUrl: String(p.logoUrl || ''),
            turnaroundText: String(p.turnaroundText || '3–5 Days'),
            turnaroundDays: String(p.turnaroundDays ?? 4),
            pickupAvailable: Boolean(p.pickupAvailable),
            isAvailable: Boolean(p.isAvailable),
          });
          setPagination(null);
        } else if (target === 'earnings') {
          const data = await apiRequest<{
            commissionRate: number;
            summary: Record<string, number>;
            ledger: Record<string, unknown>[];
            pagination?: PaginationMeta;
          }>(`/api/tailor/earnings?page=${targetPage}&limit=${targetLimit}`);
          setEarnings(data);
          setPagination(data.pagination ?? null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load tailor data.');
      } finally {
        setLoading(false);
      }
    },
    [page, limit, orderStatusFilter],
  );

  useEffect(() => {
    void loadSectionData(section, page, limit);
  }, [section, page, limit, loadSectionData]);

  // First 4 tabs appear in the Mobile Bottom Bar; Pricing, Earnings, Profile & Notifications in "More" sheet
  const navItems: DashboardNavItem[] = [
    { id: 'overview', label: 'Overview', shortLabel: 'Home', icon: LayoutDashboard },
    {
      id: 'orders',
      label: 'Orders & Queue',
      shortLabel: 'Orders',
      icon: Package,
      badge: overview?.kpis.activeOrders || undefined,
    },
    { id: 'portfolio', label: 'Tailor Portfolio', shortLabel: 'Portfolio', icon: Camera },
    { id: 'services', label: 'Pricing & Services', shortLabel: 'Pricing', icon: Scissors },
    { id: 'earnings', label: 'Earnings & Payouts', icon: CreditCard },
    { id: 'profile', label: 'Shop Profile', icon: Store },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount || undefined },
  ];

  const handleAcceptOpenOrder = async (orderId: number) => {
    setBusyId(`accept-${orderId}`);
    try {
      await apiRequest(`/api/tailor/orders/${orderId}/accept`, { method: 'POST' });
      onNotifyToast('Order accepted and added to your assigned queue!');
      setQueueTab('assigned');
      await loadSectionData('orders', 1, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not accept order.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveOrderUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setBusyId(`edit-ord-${editingOrder.id}`);
    try {
      await apiRequest(`/api/tailor/orders/${editingOrder.id}`, {
        method: 'PATCH',
        body: {
          status: editingOrder.status,
          quotedAmount: Number(editingOrder.quotedAmount),
          deliveryDate: editingOrder.deliveryDate || null,
          note: editingOrder.note || undefined,
        },
      });
      onNotifyToast(`Order ${editingOrder.orderCode} updated to "${editingOrder.status}".`);
      setEditingOrder(null);
      await loadSectionData('orders', page, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Order update blocked by rule.');
    } finally {
      setBusyId(null);
    }
  };

  const openAddServiceModal = () => {
    setEditingServiceId(null);
    setServiceForm({
      title: '',
      category: 'custom',
      description: '',
      basePrice: '899',
      turnaroundDays: '3',
    });
    setServiceModalOpen(true);
  };

  const openEditServiceModal = (s: Record<string, unknown>) => {
    setEditingServiceId(Number(s.id));
    setServiceForm({
      title: String(s.title || ''),
      category: (String(s.category || 'custom') as
        | 'custom'
        | 'alteration'
        | 'uniform'
        | 'bridal'
        | 'menswear'),
      description: String(s.description || ''),
      basePrice: String(s.base_price ?? '899'),
      turnaroundDays: String(s.turnaround_days ?? '3'),
    });
    setServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('save-service');
    try {
      const payload = {
        title: serviceForm.title,
        category: serviceForm.category,
        description: serviceForm.description,
        basePrice: Number(serviceForm.basePrice),
        turnaroundDays: Number(serviceForm.turnaroundDays),
        isActive: true,
      };
      if (editingServiceId) {
        await apiRequest(`/api/tailor/services/${editingServiceId}`, {
          method: 'PATCH',
          body: payload,
        });
        onNotifyToast(`Updated "${serviceForm.title}" — live on storefront.`);
      } else {
        await apiRequest('/api/tailor/services', {
          method: 'POST',
          body: payload,
        });
        onNotifyToast(`Added "${serviceForm.title}" to your pricing menu.`);
      }
      setServiceModalOpen(false);
      setEditingServiceId(null);
      setServiceForm({
        title: '',
        category: 'custom',
        description: '',
        basePrice: '899',
        turnaroundDays: '3',
      });
      await loadSectionData('services', editingServiceId ? page : 1, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not save service.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteService = async (id: number) => {
    setBusyId(`del-svc-${id}`);
    try {
      await apiRequest(`/api/tailor/services/${id}`, { method: 'DELETE' });
      onNotifyToast('Service removed from your menu.');
      await loadSectionData('services', page, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('save-profile');
    try {
      const specialties = profileForm.specialtiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await apiRequest('/api/tailor/profile', {
        method: 'PUT',
        body: {
          shopName: profileForm.shopName,
          masterTailor: profileForm.masterTailor,
          bio: profileForm.bio,
          locality: profileForm.locality,
          address: profileForm.address,
          specialties,
          workingHours: profileForm.workingHours,
          experienceYears: Number(profileForm.experienceYears),
          homeVisitFee: Number(profileForm.homeVisitFee),
          coverImageUrl: profileForm.coverImageUrl.trim(),
          turnaroundText: profileForm.turnaroundText.trim() || '3–5 Days',
          turnaroundDays: Number(profileForm.turnaroundDays) || 4,
          pickupAvailable: profileForm.pickupAvailable,
          isAvailable: profileForm.isAvailable,
        },
      });
      onNotifyToast('Shop profile, cover photo & turnaround saved to storefront.');
      await loadSectionData('profile', 1, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Profile update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleAvailabilityQuick = async () => {
    if (!overview) return;
    const nextVal = !Boolean(overview.profile.isAvailable);
    setBusyId('toggle-avail');
    try {
      await apiRequest('/api/tailor/profile', { method: 'PUT', body: { isAvailable: nextVal } });
      onNotifyToast(nextVal ? 'Shop is now OPEN for new bookings.' : 'Shop paused for new orders.');
      await loadSectionData('overview', 1, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardShell
      user={user}
      roleTitle="Tailor Partner Portal"
      roleSubtitle={
        overview?.profile?.shopName ? String(overview.profile.shopName) : 'Atelier Operations'
      }
      navItems={navItems}
      activeSection={section}
      onSelectSection={handleSelectSection}
      unreadNotifications={unreadCount}
      onOpenNotifications={() => handleSelectSection('notifications')}
      onRefresh={() => {
        if (section === 'portfolio') {
          setPortfolioRefreshTick((t) => t + 1);
        } else {
          void loadSectionData(section, page, limit);
        }
      }}
      refreshing={loading}
      onBackToStorefront={onBackToStorefront}
      onLogout={onLogout}
      headerAction={
        section === 'portfolio' ? (
          <button
            type="button"
            onClick={() => setPortfolioUploadOpen(true)}
            className="min-h-[44px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-3 sm:px-3.5 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Photo</span>
            <span className="sm:hidden">Upload</span>
          </button>
        ) : section === 'services' ? (
          <button
            type="button"
            onClick={openAddServiceModal}
            className="min-h-[44px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-3 sm:px-3.5 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Service</span>
          </button>
        ) : section === 'overview' && overview ? (
          <button
            type="button"
            disabled={busyId === 'toggle-avail'}
            onClick={() => void handleToggleAvailabilityQuick()}
            className={`min-h-[44px] sm:min-h-[40px] px-3 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap ${
              Boolean(overview.profile.isAvailable)
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {Boolean(overview.profile.isAvailable) ? 'Shop Open' : 'Paused'}
          </button>
        ) : null
      }
    >
      {error && (
        <div className="mb-4 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-800">
          {error}
        </div>
      )}

      {section === 'portfolio' ? (
        <TailorPortfolioView
          uploadModalOpen={portfolioUploadOpen}
          onOpenUploadModal={() => setPortfolioUploadOpen(true)}
          onCloseUploadModal={() => setPortfolioUploadOpen(false)}
          onNotifyToast={onNotifyToast}
          refreshSignal={portfolioRefreshTick}
        />
      ) : loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* 1. OVERVIEW */}
          {section === 'overview' && overview && (
            <div className="space-y-5">
              {/* Shop Brand Identity Banner */}
              <div className="bg-white rounded-2xl border border-[#EAE0FA] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <TailorLogoBadge
                    logoUrl={String(overview.profile.logoUrl || '') || undefined}
                    shopName={String(overview.profile.shopName || 'Atelier')}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <h2 className="font-serif-accent text-lg sm:text-xl font-bold text-[#1A103D] truncate">
                      {String(overview.profile.shopName || 'Your Atelier')}
                    </h2>
                    <p className="text-xs text-[#5B4E7A] truncate">
                      Master {String(overview.profile.masterTailor || user.name)} ·{' '}
                      {String(overview.profile.locality || user.locality)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectSection('profile')}
                  className="min-h-[40px] px-4 rounded-xl border border-[#DCD0F5] bg-[#FAF8FF] hover:border-[#6B21D9] text-xs font-bold text-[#6B21D9] cursor-pointer whitespace-nowrap"
                >
                  Manage Logo &amp; Shop Profile
                </button>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {[
                  {
                    label: 'Active Orders',
                    value: String(overview.kpis.activeOrders || 0),
                    sub: `${overview.kpis.openPoolOrders || 0} in open pool`,
                    accent: 'text-[#1A103D]',
                  },
                  {
                    label: 'Pending Quotes',
                    value: String(overview.kpis.pendingApproval || 0),
                    sub: `${overview.kpis.awaitingQuote || 0} need your quote`,
                    accent: 'text-[#C8922A]',
                  },
                  {
                    label: 'Net Earnings',
                    value: `₹${Number(overview.kpis.totalEarned || 0).toLocaleString('en-IN')}`,
                    sub: `Settled: ₹${Number(overview.kpis.settledEarnings || 0).toLocaleString('en-IN')}`,
                    accent: 'text-[#6B21D9]',
                  },
                  {
                    label: 'Completed',
                    value: String(overview.kpis.deliveredOrders || 0),
                    sub: `${Number(overview.profile.rating || 4.8).toFixed(1)}★ · Fee ${Number(overview.profile.commissionRate || 12)}%`,
                    accent: 'text-emerald-700',
                  },
                ].map((k) => (
                  <div key={k.label} className="bg-white rounded-2xl border border-[#EAE0FA] p-4 sm:p-5">
                    <span className="text-[11px] sm:text-xs font-semibold text-[#64748B] truncate block">
                      {k.label}
                    </span>
                    <p className={`text-xl sm:text-2xl font-bold tabular-nums mt-1.5 ${k.accent}`}>
                      {k.value}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1 tabular-nums truncate">{k.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
                <div className="px-4 sm:px-5 py-3.5 border-b border-[#EAE0FA] flex items-center justify-between gap-2">
                  <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                    Recent Assigned Orders
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('orders')}
                    className="min-h-[36px] px-2 text-xs font-semibold text-[#6B21D9] hover:underline cursor-pointer"
                  >
                    Open Queue →
                  </button>
                </div>
                {overview.recentOrders.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[#64748B]">
                    No assigned orders yet. Check <strong>Orders &amp; Queue</strong> to accept open
                    customer requests.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F1F5F9]">
                    {overview.recentOrders.map((o) => (
                      <div
                        key={String(o.id)}
                        className="p-4 sm:px-5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryThumbnail
                            category={String(o.order_type || 'custom')}
                            alt={String(o.service_title)}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-[#1A103D] truncate">
                              {String(o.order_code)} · {String(o.service_title)}
                            </p>
                            <p className="text-[#64748B] truncate">
                              {String(o.customer_name)} · {String(o.locality)}
                            </p>
                            <p className="text-[#6B21D9] font-semibold mt-0.5 sm:hidden">
                              {String(o.status)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 tabular-nums shrink-0">
                          <span className="hidden sm:inline font-semibold text-[#6B21D9]">
                            {String(o.status)}
                          </span>
                          <span className="font-bold text-[#1A103D]">
                            ₹{Number(o.tailor_payout).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. ORDERS & OPEN POOL (Segmented Mobile Switcher + Pagination) */}
          {section === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Interactive Segmented Control */}
                <div className="grid grid-cols-2 p-1 rounded-xl bg-[#EAE0FA]/70 sm:w-auto sm:inline-grid">
                  <button
                    type="button"
                    onClick={() => setQueueTab('assigned')}
                    className={`min-h-[42px] px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      queueTab === 'assigned'
                        ? 'bg-white text-[#1A103D] shadow-xs'
                        : 'text-[#475569] hover:text-[#1A103D]'
                    }`}
                  >
                    Assigned ({pagination?.total ?? assignedOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueTab('open')}
                    className={`min-h-[42px] px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      queueTab === 'open'
                        ? 'bg-white text-[#6B21D9] shadow-xs'
                        : 'text-[#475569] hover:text-[#1A103D]'
                    }`}
                  >
                    Open Pool ({openOrders.length})
                  </button>
                </div>

                {queueTab === 'assigned' && (
                  <select
                    aria-label="Filter assigned orders by stage"
                    value={orderStatusFilter}
                    onChange={(e) => {
                      setOrderStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full sm:w-56 min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-xs font-semibold text-[#1A103D] bg-white"
                  >
                    <option value="">All Assigned Stages</option>
                    {TAILOR_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {queueTab === 'open' ? (
                <div className="bg-white rounded-2xl border border-[#DCD0F5] overflow-hidden">
                  <div className="px-4 sm:px-5 py-3.5 bg-[#F4EEFF] border-b border-[#DCD0F5]">
                    <h2 className="font-serif-accent text-sm sm:text-base font-bold text-[#1A103D]">
                      Open Locality Requests ({openOrders.length})
                    </h2>
                    <p className="text-xs text-[#475569]">
                      Accept an open booking to unlock exact doorstep address and begin measurements.
                    </p>
                  </div>
                  {openOrders.length === 0 ? (
                    <div className="p-10 text-center text-sm text-[#64748B]">
                      No open unassigned requests right now.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F1F5F9]">
                      {openOrders.map((o) => {
                        const oid = Number(o.id);
                        return (
                          <div
                            key={oid}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <CategoryThumbnail
                                category={String(o.order_type || 'custom')}
                                alt={String(o.service_title)}
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-[#1A103D] tabular-nums">
                                  {String(o.order_code)} · {String(o.service_title)}
                                </p>
                                <p className="text-[#475569] mt-0.5">
                                  {String(o.customer_name)} · {String(o.pickup_address)}
                                </p>
                                <p className="text-[#64748B] mt-0.5">
                                  Pickup: {o.pickup_date ? String(o.pickup_date).slice(0, 10) : 'Flexible'}{' '}
                                  {o.pickup_slot ? `(${String(o.pickup_slot)})` : ''}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={busyId === `accept-${oid}`}
                              onClick={() => void handleAcceptOpenOrder(oid)}
                              className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white font-bold cursor-pointer shrink-0"
                            >
                              {busyId === `accept-${oid}` ? 'Accepting...' : 'Accept Order'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
                  <div className="px-4 sm:px-5 py-3.5 border-b border-[#EAE0FA]">
                    <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                      Assigned Orders ({pagination?.total ?? assignedOrders.length})
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Submit quotes and update delivery dates. Stitching unlocks once the customer approves.
                    </p>
                  </div>

                  {assignedOrders.length === 0 ? (
                    <div className="p-10 text-center text-sm text-[#64748B]">
                      No assigned orders match this filter.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F1F5F9]">
                      {assignedOrders.map((o) => {
                        const oid = Number(o.id);
                        return (
                          <div key={oid} className="p-4 sm:p-5 space-y-3">
                            <div className="flex items-start gap-3">
                              <CategoryThumbnail
                                category={String(o.order_type || 'custom')}
                                alt={String(o.service_title)}
                                size="md"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="font-bold text-[#1A103D] tabular-nums">
                                      {String(o.order_code)}
                                    </span>
                                    <span className="text-[#CBD5E1]">·</span>
                                    <span className="font-bold text-[#6B21D9]">
                                      {String(o.status)}
                                    </span>
                                    <span className="text-[#CBD5E1]">·</span>
                                    <span
                                      className={`font-semibold ${
                                        Boolean(o.quote_approved)
                                          ? 'text-emerald-700'
                                          : 'text-amber-700'
                                      }`}
                                    >
                                      {Boolean(o.quote_approved)
                                        ? 'Quote Approved'
                                        : 'Awaiting Quote Approval'}
                                    </span>
                                  </div>
                                  <span className="text-sm sm:text-base font-bold text-[#1A103D] tabular-nums">
                                    ₹{Number(o.total_amount).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                <h3 className="text-sm font-bold text-[#1A103D] mt-1">
                                  {String(o.service_title)}
                                </h3>
                                <p className="text-xs text-[#475569] mt-0.5">
                                  <strong>{String(o.customer_name)}</strong>{' '}
                                  {o.customer_phone ? `(${String(o.customer_phone)})` : ''} ·{' '}
                                  {String(o.pickup_address || o.locality)}
                                </p>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs tabular-nums">
                                  <span className="text-[#6B21D9] font-semibold">
                                    Net Payout: ₹{Number(o.tailor_payout).toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[#64748B]">
                                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                                    Due: {o.delivery_date ? String(o.delivery_date).slice(0, 10) : 'TBD'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {Boolean(o.garment_notes || o.customer_requirements) && (
                              <p className="text-xs text-[#475569] bg-[#FAF8FF] border border-[#EAE0FA] rounded-xl px-3.5 py-2">
                                <strong>Requirements:</strong>{' '}
                                {String(o.customer_requirements || o.garment_notes)}
                              </p>
                            )}

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingOrder({
                                    id: oid,
                                    orderCode: String(o.order_code),
                                    quotedAmount: String(o.quoted_amount),
                                    deliveryDate: o.delivery_date
                                      ? String(o.delivery_date).slice(0, 10)
                                      : '',
                                    status: String(o.status),
                                    note: '',
                                  })
                                }
                                className="w-full sm:w-auto min-h-[44px] px-4 rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-semibold cursor-pointer"
                              >
                                Update Status, Quote &amp; Delivery
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <PaginationBar
                    pagination={pagination}
                    onPageChange={setPage}
                    onLimitChange={(n) => {
                      setLimit(n);
                      setPage(1);
                    }}
                    itemLabel="orders"
                  />
                </div>
              )}
            </div>
          )}

          {/* 3. PRICING & SERVICES (Visual Cards + Pagination) */}
          {section === 'services' && (
            <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA] flex items-center justify-between gap-2">
                <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                  Your Atelier Price List ({pagination?.total ?? services.length})
                </h2>
              </div>
              {services.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <p className="text-sm text-[#64748B]">
                    No custom services added yet. Add your first service to display pricing to customers.
                  </p>
                  <button
                    type="button"
                    onClick={openAddServiceModal}
                    className="min-h-[44px] px-5 rounded-xl bg-[#6B21D9] text-white text-xs font-bold cursor-pointer"
                  >
                    + Add First Service
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {services.map((s) => {
                    const sid = Number(s.id);
                    return (
                      <div
                        key={sid}
                        className="p-4 sm:px-5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryThumbnail
                            category={String(s.category)}
                            alt={String(s.title)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#1A103D] truncate">
                              {String(s.title)}
                            </p>
                            <p className="text-xs text-[#64748B] truncate">
                              <span className="capitalize font-semibold text-[#6B21D9]">
                                {String(s.category)}
                              </span>{' '}
                              · {Number(s.turnaround_days)} days ·{' '}
                              {s.description ? String(s.description) : 'Standard tailoring'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 tabular-nums shrink-0">
                          <span className="text-sm font-bold text-[#1A103D] mr-1">
                            ₹{Number(s.base_price).toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => openEditServiceModal(s)}
                            aria-label={`Edit ${s.title}`}
                            className="min-h-[44px] min-w-[44px] rounded-xl text-[#6B21D9] hover:bg-[#F4EEFF] inline-flex items-center justify-center cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busyId === `del-svc-${sid}`}
                            onClick={() => void handleDeleteService(sid)}
                            aria-label={`Delete ${s.title}`}
                            className="min-h-[44px] min-w-[44px] rounded-xl text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <PaginationBar
                pagination={pagination}
                onPageChange={setPage}
                onLimitChange={(n) => {
                  setLimit(n);
                  setPage(1);
                }}
                itemLabel="services"
              />
            </div>
          )}

          {/* 4. SHOP PROFILE & AVAILABILITY */}
          {section === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden max-w-3xl"
            >
              <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA]">
                <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                  Atelier Business Profile, Shop Logo &amp; Availability
                </h2>
              </div>
              <div className="px-4 sm:px-5 pt-4 sm:pt-5">
                <ShopLogoUploader
                  currentLogoUrl={profileForm.logoUrl || undefined}
                  shopName={profileForm.shopName || 'Tailor Shop'}
                  onUpload={async (mimeType, imageBase64) => {
                    const res = await tailorLogoApi.upload({ mimeType, imageBase64 });
                    setProfileForm((f) => ({ ...f, logoUrl: res.logoUrl }));
                    onNotifyToast('Shop logo uploaded and updated live on storefront!');
                  }}
                  onRemove={async () => {
                    await tailorLogoApi.remove();
                    setProfileForm((f) => ({ ...f, logoUrl: '' }));
                    onNotifyToast('Shop logo removed.');
                  }}
                />
              </div>
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">Shop / Boutique Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.shopName}
                    onChange={(e) => setProfileForm((f) => ({ ...f, shopName: e.target.value }))}
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">Master Tailor Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.masterTailor}
                    onChange={(e) => setProfileForm((f) => ({ ...f, masterTailor: e.target.value }))}
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">Locality</label>
                  <input
                    type="text"
                    required
                    value={profileForm.locality}
                    onChange={(e) => setProfileForm((f) => ({ ...f, locality: e.target.value }))}
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">Working Hours</label>
                  <input
                    type="text"
                    required
                    value={profileForm.workingHours}
                    onChange={(e) => setProfileForm((f) => ({ ...f, workingHours: e.target.value }))}
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min={0}
                    value={profileForm.experienceYears}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, experienceYears: e.target.value }))
                    }
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">Home Visit Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={profileForm.homeVisitFee}
                    onChange={(e) => setProfileForm((f) => ({ ...f, homeVisitFee: e.target.value }))}
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#1A103D] mb-1">Shop Address</label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#1A103D] mb-1">
                    Specialties (comma separated)
                  </label>
                  <input
                    type="text"
                    value={profileForm.specialtiesText}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, specialtiesText: e.target.value }))
                    }
                    placeholder="Maggam Blouses, Bridal Lehenga, Alterations"
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">
                    Turnaround Label (Shown on Storefront)
                  </label>
                  <input
                    type="text"
                    value={profileForm.turnaroundText}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, turnaroundText: e.target.value }))
                    }
                    placeholder="e.g. 3–5 Days or 48 Hrs Express"
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">
                    Average Turnaround (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={profileForm.turnaroundDays}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, turnaroundDays: e.target.value }))
                    }
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2.5">
                  <label className="block font-bold text-[#1A103D]">
                    Storefront Cover Photo URL
                  </label>
                  <div className="flex items-center gap-3">
                    {profileForm.coverImageUrl ? (
                      <SafeImage
                        src={profileForm.coverImageUrl}
                        alt={profileForm.shopName || 'Atelier cover'}
                        className="w-16 h-12 rounded-xl border border-[#EAE0FA] shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-16 h-12 rounded-xl border border-dashed border-[#CBD5E1] bg-[#FAF8FF] flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5 text-[#94A3B8]" />
                      </div>
                    )}
                    <input
                      type="text"
                      value={profileForm.coverImageUrl}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, coverImageUrl: e.target.value }))
                      }
                      placeholder="/api/public/portfolio/... or https://..."
                      className="flex-1 min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
                    />
                  </div>
                  {profilePortfolioChoices.length > 0 && (
                    <div>
                      <p className="text-[11px] text-[#64748B] mb-1.5">
                        Quick-pick cover from your uploaded Portfolio:
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {profilePortfolioChoices.map((item) => {
                          const active = profileForm.coverImageUrl === item.imageUrl;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                setProfileForm((f) => ({ ...f, coverImageUrl: item.imageUrl }))
                              }
                              className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer transition-all ${
                                active
                                  ? 'border-[#6B21D9] ring-2 ring-[#6B21D9]/30'
                                  : 'border-[#EAE0FA] hover:border-[#6B21D9]/60'
                              }`}
                              title={`Use "${item.title}" as cover`}
                            >
                              <SafeImage
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#1A103D] mb-1">Atelier Bio</label>
                  <textarea
                    rows={3}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-[#1A103D]"
                  />
                </div>
                <label className="min-h-[44px] flex items-center gap-2.5 px-3 rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] font-semibold text-[#1A103D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.pickupAvailable}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, pickupAvailable: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#6B21D9]"
                  />
                  Offer Doorstep Measurement &amp; Pickup
                </label>
                <label className="min-h-[44px] flex items-center gap-2.5 px-3 rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] font-semibold text-[#1A103D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.isAvailable}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, isAvailable: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#6B21D9]"
                  />
                  Shop Open &amp; Accepting Orders
                </label>
              </div>
              <div className="px-4 sm:px-5 py-4 bg-[#FAF8FF] border-t border-[#EAE0FA] flex justify-end">
                <button
                  type="submit"
                  disabled={busyId === 'save-profile'}
                  className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 px-5 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-bold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {busyId === 'save-profile' ? 'Saving...' : 'Save Shop Profile'}
                </button>
              </div>
            </form>
          )}

          {/* 5. EARNINGS & PAYOUTS (Mobile Cards + Desktop Table + Pagination) */}
          {section === 'earnings' && earnings && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white rounded-2xl border border-[#EAE0FA] p-4 sm:p-5">
                  <span className="text-xs font-semibold text-[#64748B]">Gross Orders Value</span>
                  <p className="text-2xl font-bold text-[#1A103D] tabular-nums mt-1.5">
                    ₹{Number(earnings.summary.gross_billed || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[11px] text-[#64748B] tabular-nums">
                    Platform fee ({earnings.commissionRate}%): ₹
                    {Number(earnings.summary.total_platform_fee || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-[#EAE0FA] p-4 sm:p-5">
                  <span className="text-xs font-semibold text-[#64748B]">Settled to Your Bank</span>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1.5">
                    ₹{Number(earnings.summary.settled_amount || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-[#EAE0FA] p-4 sm:p-5">
                  <span className="text-xs font-semibold text-[#64748B]">Ready for Next Payout</span>
                  <p className="text-2xl font-bold text-[#6B21D9] tabular-nums mt-1.5">
                    ₹{Number(earnings.summary.ready_for_payout || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA]">
                  <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                    Earnings &amp; Settlement History ({pagination?.total ?? earnings.ledger.length})
                  </h2>
                </div>
                {earnings.ledger.length === 0 ? (
                  <p className="p-8 text-center text-sm text-[#64748B]">No earnings recorded yet.</p>
                ) : (
                  <>
                    {/* Mobile Ledger Cards */}
                    <div className="md:hidden divide-y divide-[#F1F5F9]">
                      {earnings.ledger.map((row) => (
                        <div key={String(row.id)} className="p-4 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#1A103D] tabular-nums">
                              {String(row.order_code)}
                            </p>
                            <p className="text-xs text-[#334155] truncate mt-0.5">
                              {String(row.service_title)} · {String(row.customer_name)}
                            </p>
                            <p className="text-[11px] text-[#64748B] capitalize mt-1">
                              Payment: {String(row.payment_status)} · Payout: {String(row.payout_status)}
                            </p>
                          </div>
                          <div className="text-right tabular-nums shrink-0">
                            <p className="text-sm font-bold text-[#6B21D9]">
                              ₹{Number(row.tailor_earning).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                              Gross ₹{Number(row.amount).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF8FF] border-b border-[#EAE0FA] text-[#64748B]">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Order</th>
                            <th className="px-4 py-3 font-semibold">Customer</th>
                            <th className="px-4 py-3 font-semibold text-right">Gross</th>
                            <th className="px-4 py-3 font-semibold text-right">Net Payout</th>
                            <th className="px-4 py-3 font-semibold">Payment / Settlement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {earnings.ledger.map((row) => (
                            <tr key={String(row.id)}>
                              <td className="px-4 py-3 font-bold text-[#1A103D] tabular-nums">
                                {String(row.order_code)}
                                <span className="block font-normal text-[#64748B]">
                                  {String(row.service_title)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[#334155]">{String(row.customer_name)}</td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                ₹{Number(row.amount).toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-[#6B21D9] tabular-nums">
                                ₹{Number(row.tailor_earning).toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 capitalize">
                                <span className="font-semibold text-[#1A103D]">
                                  {String(row.payment_status)}
                                </span>{' '}
                                · <span className="text-[#64748B]">{String(row.payout_status)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                <PaginationBar
                  pagination={pagination}
                  onPageChange={setPage}
                  onLimitChange={(n) => {
                    setLimit(n);
                    setPage(1);
                  }}
                  itemLabel="payouts"
                />
              </div>
            </div>
          )}

          {/* 6. NOTIFICATIONS (Paginated) */}
          {section === 'notifications' && (
            <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden max-w-3xl">
              <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA] flex items-center justify-between gap-2">
                <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                  Notifications ({unreadCount} unread)
                </h2>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await notificationApi.markAllRead();
                      await loadSectionData('notifications', page, limit);
                    }}
                    className="min-h-[36px] px-2.5 text-xs font-semibold text-[#6B21D9] hover:underline cursor-pointer"
                  >
                    Mark All Read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#64748B]">No notifications yet.</p>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 flex items-start justify-between gap-3 ${
                        n.isRead ? 'bg-white' : 'bg-[#F4EEFF]/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1A103D]">{n.title}</p>
                        <p className="text-xs text-[#475569] mt-0.5">{n.message}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={async () => {
                            await notificationApi.markRead(n.id);
                            await loadSectionData('notifications', page, limit);
                          }}
                          className="min-h-[36px] px-2.5 rounded-lg bg-white border border-[#DCD0F5] text-[11px] font-bold text-[#6B21D9] shrink-0 cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <PaginationBar
                pagination={pagination}
                onPageChange={setPage}
                itemLabel="alerts"
              />
            </div>
          )}
        </>
      )}

      {/* EDIT ORDER STATUS / QUOTE BOTTOM SHEET / MODAL */}
      <MobileBottomSheetModal
        open={Boolean(editingOrder)}
        title={editingOrder ? `Update Order ${editingOrder.orderCode}` : 'Update Order'}
        subtitle="Customer approves quotes before stitching starts"
        onClose={() => setEditingOrder(null)}
      >
        {editingOrder && (
          <form onSubmit={handleSaveOrderUpdate} className="p-5 space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Order Stage</label>
              <select
                value={editingOrder.status}
                onChange={(e) =>
                  setEditingOrder((o) => (o ? { ...o, status: e.target.value } : null))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D] bg-white"
              >
                {TAILOR_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#1A103D] mb-1">
                Quoted Stitching Price (₹)
              </label>
              <input
                type="number"
                min={20}
                required
                value={editingOrder.quotedAmount}
                onChange={(e) =>
                  setEditingOrder((o) => (o ? { ...o, quotedAmount: e.target.value } : null))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Estimated Delivery Date</label>
              <input
                type="date"
                value={editingOrder.deliveryDate}
                onChange={(e) =>
                  setEditingOrder((o) => (o ? { ...o, deliveryDate: e.target.value } : null))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Customer Update Note</label>
              <textarea
                rows={2}
                placeholder="e.g. Lining & maggam quote finalized, ready in 4 days."
                value={editingOrder.note}
                onChange={(e) =>
                  setEditingOrder((o) => (o ? { ...o, note: e.target.value } : null))
                }
                className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-[#1A103D]"
              />
            </div>
            <button
              type="submit"
              disabled={busyId === `edit-ord-${editingOrder.id}`}
              className="w-full min-h-[48px] rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white font-bold cursor-pointer"
            >
              {busyId === `edit-ord-${editingOrder.id}` ? 'Updating...' : 'Save Order Update'}
            </button>
          </form>
        )}
      </MobileBottomSheetModal>

      {/* ADD / EDIT SERVICE BOTTOM SHEET / MODAL */}
      <MobileBottomSheetModal
        open={serviceModalOpen}
        title={editingServiceId ? 'Edit Service Pricing & SLA' : 'Add Service to Your Menu'}
        subtitle="Changes immediately reflect on the customer storefront"
        onClose={() => {
          setServiceModalOpen(false);
          setEditingServiceId(null);
        }}
      >
        <form onSubmit={handleSaveService} className="p-5 space-y-3 text-xs">
          <input
            type="text"
            required
            placeholder="Service Title (e.g. Padded Silk Blouse)"
            value={serviceForm.title}
            onChange={(e) => setServiceForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
          />
          <select
            value={serviceForm.category}
            onChange={(e) =>
              setServiceForm((f) => ({
                ...f,
                category: e.target.value as
                  | 'custom'
                  | 'alteration'
                  | 'uniform'
                  | 'bridal'
                  | 'menswear',
              }))
            }
            className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D] bg-white"
          >
            <option value="custom">Custom Stitching</option>
            <option value="bridal">Bridal &amp; Maggam</option>
            <option value="alteration">Alteration</option>
            <option value="menswear">Menswear</option>
            <option value="uniform">Uniforms</option>
          </select>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="number"
              required
              min={20}
              placeholder="Price (₹)"
              value={serviceForm.basePrice}
              onChange={(e) => setServiceForm((f) => ({ ...f, basePrice: e.target.value }))}
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
            />
            <input
              type="number"
              required
              min={1}
              placeholder="Days SLA"
              value={serviceForm.turnaroundDays}
              onChange={(e) => setServiceForm((f) => ({ ...f, turnaroundDays: e.target.value }))}
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
            />
          </div>
          <textarea
            rows={2}
            placeholder="Short description..."
            value={serviceForm.description}
            onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-[#1A103D]"
          />
          <button
            type="submit"
            disabled={busyId === 'save-service'}
            className="w-full min-h-[48px] rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white font-bold cursor-pointer"
          >
            {busyId === 'save-service'
              ? 'Saving...'
              : editingServiceId
                ? 'Update Service'
                : 'Save Service'}
          </button>
        </form>
      </MobileBottomSheetModal>
    </DashboardShell>
  );
};

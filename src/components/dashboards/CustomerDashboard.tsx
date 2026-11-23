import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  LayoutDashboard,
  Lock,
  MapPin,
  Package,
  Plus,
  Ruler,
  Search,
  ShieldCheck,
  Star,
  Store,
  Trash2,
  User,
} from 'lucide-react';
import { UserSession } from '../../types';
import {
  apiRequest,
  authApi,
  mapAuthUserToSession,
  notificationApi,
  NotificationItem,
  PaginationMeta,
  publicApi,
  PublicTailorItem,
} from '../../services/api';
import { DashboardNavItem, DashboardShell } from './DashboardShell';
import {
  CategoryThumbnail,
  DashboardSkeleton,
  getAtelierImage,
  MobileBottomSheetModal,
  PaginationBar,
} from './DashboardPrimitives';
import { SafeImage } from '../SafeImage';

interface CustomerDashboardProps {
  user: UserSession;
  onUpdateUser: (next: UserSession) => void;
  onBackToStorefront: () => void;
  onLogout: () => void;
  onNotifyToast: (msg: string) => void;
}

const PICKUP_SLOTS = [
  '09:30 AM – 11:30 AM',
  '12:00 PM – 02:00 PM',
  '03:00 PM – 05:00 PM',
  '05:30 PM – 07:30 PM',
];

const ORDER_STATUS_FILTERS = [
  { id: '', label: 'All Orders' },
  { id: 'Booking Created', label: 'Booking Created' },
  { id: 'Visit Scheduled', label: 'Visit Scheduled' },
  { id: 'Quotation Submitted', label: 'Quote Ready' },
  { id: 'Customer Approved', label: 'Approved' },
  { id: 'Stitching Started', label: 'Stitching' },
  { id: 'Ready for Delivery', label: 'Ready' },
  { id: 'Delivered', label: 'Delivered' },
  { id: 'Cancelled', label: 'Cancelled' },
];

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  user,
  onUpdateUser,
  onBackToStorefront,
  onLogout,
  onNotifyToast,
}) => {
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [tailorSearch, setTailorSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  const [overview, setOverview] = useState<{
    kpis: Record<string, number>;
    recentOrders: Record<string, unknown>[];
  } | null>(null);
  const [tailors, setTailors] = useState<PublicTailorItem[]>([]);
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [measurements, setMeasurements] = useState<
    {
      id: number;
      label: string;
      garmentType: string;
      ownerName: string;
      measuredBy: string;
      values: Record<string, string>;
    }[]
  >([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Order Detail Timeline Modal
  const [timelineModal, setTimelineModal] = useState<{
    order: Record<string, unknown>;
    history: Record<string, unknown>[];
  } | null>(null);

  // Place Order Modal
  const [bookingModal, setBookingModal] = useState<{
    tailor: PublicTailorItem | null;
    serviceId: number | null;
    serviceTitle: string;
    orderType: 'custom' | 'alteration' | 'uniform' | 'bridal' | 'menswear';
    basePrice: number;
  } | null>(null);
  const [bookingForm, setBookingForm] = useState({
    pickupMode: 'doorstep_pickup' as 'doorstep_pickup' | 'shop_visit',
    pickupDate: new Date().toISOString().split('T')[0],
    pickupSlot: PICKUP_SLOTS[1],
    pickupAddress: user.address || user.locality,
    garmentNotes: '',
    paymentMethod: 'upi' as 'upi' | 'card' | 'cash' | 'netbanking' | 'wallet',
  });

  // Payment & Portfolio Showcase Modals
  const [payModalOrder, setPayModalOrder] = useState<Record<string, unknown> | null>(null);
  const [portfolioGalleryTailor, setPortfolioGalleryTailor] = useState<PublicTailorItem | null>(
    null,
  );
  const [payMethod, setPayMethod] = useState<'upi' | 'card' | 'cash' | 'netbanking' | 'wallet'>(
    'upi',
  );

  // Add Measurement Modal
  const [measModalOpen, setMeasModalOpen] = useState(false);
  const [measForm, setMeasForm] = useState({
    label: '',
    garmentType: 'Blouse',
    ownerName: user.name,
    chestBust: '36 in',
    waist: '30 in',
    length: '15 in',
    shoulder: '14.5 in',
  });

  // Profile & Security State
  const [profileForm, setProfileForm] = useState({
    fullName: user.name,
    phone: user.phone || '',
    locality: user.locality,
    address: user.address || '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });

  const handleSelectSection = (nextSection: string) => {
    setSection(nextSection);
    setPage(1);
    setPagination(null);
  };

  const loadSectionData = useCallback(
    async (target: string, currentPage = page, currentLimit = limit) => {
      setLoading(true);
      setError(null);
      try {
        if (target === 'notifications') {
          const notifRes = await notificationApi.list(currentPage, currentLimit);
          setNotifications(notifRes.notifications);
          setUnreadCount(notifRes.unreadCount);
          setPagination(notifRes.pagination || null);
        } else {
          const notifBadge = await notificationApi.list(1, 1);
          setUnreadCount(notifBadge.unreadCount);
        }

        if (target === 'overview') {
          const data = await apiRequest<{
            kpis: Record<string, number>;
            recentOrders: Record<string, unknown>[];
          }>('/api/customer/overview');
          setOverview(data);
          setPagination(null);
        } else if (target === 'browse') {
          const data = await publicApi.tailors(tailorSearch, undefined, currentPage, currentLimit);
          setTailors(data.tailors);
          setPagination(data.pagination || null);
        } else if (target === 'orders') {
          const qs = new URLSearchParams({
            page: String(currentPage),
            limit: String(currentLimit),
          });
          if (orderStatusFilter) qs.set('status', orderStatusFilter);
          const data = await apiRequest<{
            orders: Record<string, unknown>[];
            pagination?: PaginationMeta;
          }>(`/api/customer/orders?${qs.toString()}`);
          setOrders(data.orders);
          setPagination(data.pagination || null);
        } else if (target === 'payments') {
          const data = await apiRequest<{
            payments: Record<string, unknown>[];
            pagination?: PaginationMeta;
          }>(`/api/customer/payments?page=${currentPage}&limit=${currentLimit}`);
          setPayments(data.payments);
          setPagination(data.pagination || null);
        } else if (target === 'measurements') {
          const data = await apiRequest<{
            measurements: {
              id: number;
              label: string;
              garmentType: string;
              ownerName: string;
              measuredBy: string;
              values: Record<string, string>;
            }[];
            pagination?: PaginationMeta;
          }>(`/api/customer/measurements?page=${currentPage}&limit=${currentLimit}`);
          setMeasurements(data.measurements);
          setPagination(data.pagination || null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load your account data.');
      } finally {
        setLoading(false);
      }
    },
    [tailorSearch, orderStatusFilter, page, limit],
  );

  useEffect(() => {
    void loadSectionData(section, page, limit);
  }, [section, page, limit, loadSectionData]);

  const navItems: DashboardNavItem[] = [
    { id: 'overview', label: 'Overview', shortLabel: 'Home', icon: LayoutDashboard },
    { id: 'browse', label: 'Browse Tailors', shortLabel: 'Tailors', icon: Store },
    {
      id: 'orders',
      label: 'My Orders',
      shortLabel: 'Orders',
      icon: Package,
      badge: overview?.kpis.activeOrders || undefined,
    },
    { id: 'payments', label: 'Payments', shortLabel: 'Payments', icon: CreditCard },
    { id: 'measurements', label: 'Measurements', icon: Ruler },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount || undefined },
    { id: 'profile', label: 'Profile & Security', icon: User },
  ];

  const handleOpenTimeline = async (orderId: number) => {
    setBusyId(`timeline-${orderId}`);
    try {
      const data = await apiRequest<{
        order: Record<string, unknown>;
        history: Record<string, unknown>[];
      }>(`/api/customer/orders/${orderId}`);
      setTimelineModal(data);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not load timeline.');
    } finally {
      setBusyId(null);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModal) return;
    setBusyId('place-order');
    try {
      const res = await apiRequest<{ orderCode: string; message: string }>('/api/customer/orders', {
        method: 'POST',
        body: {
          tailorId: bookingModal.tailor?.id ?? null,
          serviceId: bookingModal.serviceId,
          serviceTitle: bookingModal.serviceTitle,
          orderType: bookingModal.orderType,
          quotedAmount: bookingModal.basePrice,
          pickupMode: bookingForm.pickupMode,
          pickupDate: bookingForm.pickupDate,
          pickupSlot: bookingForm.pickupSlot,
          locality: user.locality,
          pickupAddress: bookingForm.pickupAddress,
          garmentNotes: bookingForm.garmentNotes,
          customerRequirements: bookingForm.garmentNotes,
          paymentMethod: bookingForm.paymentMethod,
        },
      });
      onNotifyToast(res.message);
      setBookingModal(null);
      setPage(1);
      setSection('orders');
      await loadSectionData('orders', 1, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Order placement failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveQuote = async (orderId: number) => {
    setBusyId(`approve-${orderId}`);
    try {
      const res = await apiRequest<{ message: string }>(
        `/api/customer/orders/${orderId}/approve-quote`,
        { method: 'PATCH' },
      );
      onNotifyToast(res.message);
      await loadSectionData('orders', page, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not approve quote.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    setBusyId(`cancel-${orderId}`);
    try {
      const res = await apiRequest<{ message: string }>(`/api/customer/orders/${orderId}/cancel`, {
        method: 'PATCH',
      });
      onNotifyToast(res.message);
      await loadSectionData('orders', page, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not cancel order.');
    } finally {
      setBusyId(null);
    }
  };

  const handlePayOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalOrder) return;
    const oid = Number(payModalOrder.id);
    setBusyId(`pay-${oid}`);
    try {
      const res = await apiRequest<{ message: string }>(`/api/customer/orders/${oid}/pay`, {
        method: 'POST',
        body: { paymentMethod: payMethod },
      });
      onNotifyToast(res.message);
      setPayModalOrder(null);
      await loadSectionData(section, page, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('add-meas');
    try {
      await apiRequest('/api/customer/measurements', {
        method: 'POST',
        body: {
          label: measForm.label,
          garmentType: measForm.garmentType,
          ownerName: measForm.ownerName,
          measuredBy: 'Self Entered',
          consentSaved: true,
          values: {
            'Chest / Bust': measForm.chestBust,
            Waist: measForm.waist,
            Length: measForm.length,
            Shoulder: measForm.shoulder,
          },
        },
      });
      onNotifyToast('Measurement profile saved.');
      setMeasModalOpen(false);
      setMeasForm((f) => ({ ...f, label: '' }));
      setPage(1);
      await loadSectionData('measurements', 1, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not save measurement.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteMeasurement = async (id: number) => {
    setBusyId(`del-meas-${id}`);
    try {
      await apiRequest(`/api/customer/measurements/${id}`, { method: 'DELETE' });
      onNotifyToast('Measurement deleted.');
      await loadSectionData('measurements', page, limit);
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
      const res = await authApi.updateProfile(profileForm);
      onUpdateUser(mapAuthUserToSession(res.user));
      onNotifyToast('Profile updated successfully.');
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Profile update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('change-pw');
    try {
      const res = await authApi.changePassword(pwForm.currentPassword, pwForm.newPassword);
      onNotifyToast(res.message);
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Password change failed.');
    } finally {
      setBusyId(null);
    }
  };

  const pwChecks = {
    length: pwForm.newPassword.length >= 8,
    letter: /[A-Za-z]/.test(pwForm.newPassword),
    number: /[0-9]/.test(pwForm.newPassword),
  };

  return (
    <DashboardShell
      user={user}
      roleTitle="Customer Portal"
      roleSubtitle={user.locality}
      navItems={navItems}
      activeSection={section}
      onSelectSection={handleSelectSection}
      unreadNotifications={unreadCount}
      onOpenNotifications={() => handleSelectSection('notifications')}
      onRefresh={() => void loadSectionData(section, page, limit)}
      refreshing={loading}
      onBackToStorefront={onBackToStorefront}
      onLogout={onLogout}
      headerAction={
        section === 'measurements' ? (
          <button
            type="button"
            onClick={() => setMeasModalOpen(true)}
            className="min-h-[44px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-3 sm:px-3.5 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Measurement</span>
            <span className="sm:hidden">Add</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSelectSection('browse')}
            className="min-h-[44px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-3 sm:px-3.5 rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#C4B5FD]" />
            <span className="hidden sm:inline">New Booking</span>
            <span className="sm:hidden">Book</span>
          </button>
        )
      }
    >
      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* 1. OVERVIEW */}
          {section === 'overview' && overview && (
            <div className="space-y-5">
              {/* Mobile 2-col / Desktop 4-col KPI Grid */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {[
                  {
                    label: 'Active Orders',
                    value: String(overview.kpis.activeOrders || 0),
                    sub: `${overview.kpis.deliveredOrders || 0} completed`,
                    accent: 'text-[#1A103D]',
                  },
                  {
                    label: 'Quotes Pending',
                    value: String(overview.kpis.quotesAwaitingApproval || 0),
                    sub: 'Approve to begin stitching',
                    accent: 'text-[#C8922A]',
                  },
                  {
                    label: 'Total Spent',
                    value: `₹${Number(overview.kpis.totalPaid || 0).toLocaleString('en-IN')}`,
                    sub: `Due: ₹${Number(overview.kpis.pendingDue || 0).toLocaleString('en-IN')}`,
                    accent: 'text-[#6B21D9]',
                  },
                  {
                    label: 'Fit Profiles',
                    value: String(overview.kpis.savedMeasurements || 0),
                    sub: `${overview.kpis.unreadNotifications || 0} unread alerts`,
                    accent: 'text-emerald-700',
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="bg-white rounded-2xl border border-[#EAE0FA] p-3.5 sm:p-5 flex flex-col justify-between"
                  >
                    <span className="text-[11px] sm:text-xs font-semibold text-[#64748B]">
                      {k.label}
                    </span>
                    <p className={`text-xl sm:text-2xl font-bold tabular-nums mt-1.5 ${k.accent}`}>
                      {k.value}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1 truncate">{k.sub}</p>
                  </div>
                ))}
              </div>

              {/* Recent Orders & Tracking */}
              <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
                <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#EAE0FA] flex items-center justify-between gap-2">
                  <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                    Recent Orders &amp; Tracking
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSelectSection('orders')}
                    className="min-h-[36px] text-xs font-semibold text-[#6B21D9] hover:underline cursor-pointer"
                  >
                    View All →
                  </button>
                </div>
                {overview.recentOrders.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <p className="text-sm text-[#64748B]">
                      You haven&apos;t placed an order yet. Browse verified nearby tailors to
                      schedule your first pickup.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectSection('browse')}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-bold cursor-pointer"
                    >
                      Browse Verified Tailors
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F1F5F9]">
                    {overview.recentOrders.map((o) => {
                      const oid = Number(o.id);
                      return (
                        <button
                          key={oid}
                          type="button"
                          onClick={() => void handleOpenTimeline(oid)}
                          className="w-full text-left px-4 sm:px-5 py-3.5 hover:bg-[#FAF8FF] transition-colors flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <CategoryThumbnail
                              category={String(o.order_type || 'custom')}
                              alt={String(o.service_title || 'Order')}
                            />
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-[#1A103D] truncate">
                                {String(o.service_title)}
                              </p>
                              <p className="text-[11px] text-[#64748B] truncate tabular-nums">
                                {String(o.order_code)} ·{' '}
                                {o.tailor_shop_name
                                  ? String(o.tailor_shop_name)
                                  : 'Matching nearest tailor'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right tabular-nums shrink-0">
                            <p className="text-xs sm:text-sm font-bold text-[#1A103D]">
                              ₹{Number(o.total_amount).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[11px] font-semibold text-[#6B21D9]">
                              {String(o.status)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. BROWSE TAILORS & PLACE ORDER */}
          {section === 'browse' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tailorSearch}
                    onChange={(e) => {
                      setTailorSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search tailors by shop, craft, locality..."
                    className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setBookingModal({
                      tailor: null,
                      serviceId: null,
                      serviceTitle: 'Custom Stitching / Doorstep Alteration',
                      orderType: 'custom',
                      basePrice: 899,
                    })
                  }
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  Auto-Match Nearest Tailor
                </button>
              </div>

              {tailors.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#EAE0FA] p-8 sm:p-10 text-center space-y-3">
                  <Store className="w-8 h-8 text-[#6B21D9] mx-auto" />
                  <h3 className="font-serif-accent text-lg font-bold text-[#1A103D]">
                    No matching tailor shops found
                  </h3>
                  <p className="text-xs text-[#64748B] max-w-md mx-auto">
                    Place an open doorstep booking and it will be dispatched immediately to nearby
                    verified tailor partners.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setBookingModal({
                        tailor: null,
                        serviceId: null,
                        serviceTitle: 'Custom Stitching / Alteration Order',
                        orderType: 'custom',
                        basePrice: 999,
                      })
                    }
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6B21D9] text-white text-xs font-bold cursor-pointer"
                  >
                    Place Open Doorstep Order
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {tailors.map((t) => {
                      const coverPhoto =
                        t.portfolio && t.portfolio.length > 0
                          ? t.portfolio[0].imageUrl
                          : getAtelierImage(t.id);
                      return (
                        <div
                          key={t.id}
                          className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden flex flex-col justify-between hover:border-[#6B21D9]/50 transition-colors"
                        >
                          <div>
                            <div className="relative aspect-[16/9] bg-[#F1F5F9]">
                              <SafeImage
                                src={coverPhoto}
                                alt={t.shopName}
                                fallbackTitle={t.shopName}
                                className="w-full h-full"
                              />
                              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#1A103D]/85 text-white text-xs font-bold inline-flex items-center gap-1 tabular-nums backdrop-blur-xs">
                                <Star className="w-3.5 h-3.5 fill-[#E2B14B] text-[#E2B14B]" />
                                {t.rating.toFixed(1)}
                              </div>
                              {t.portfolio && t.portfolio.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPortfolioGalleryTailor(t)}
                                  className="absolute bottom-2.5 left-2.5 min-h-[34px] px-2.5 py-1 rounded-lg bg-[#1A103D]/85 hover:bg-[#1A103D] text-white text-[11px] font-bold inline-flex items-center gap-1.5 backdrop-blur-xs cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5 text-[#C4B5FD]" />
                                  {t.portfolio.length} Work Photo{t.portfolio.length > 1 ? 's' : ''}
                                </button>
                              )}
                            </div>

                            <div className="p-4 space-y-2.5">
                              <div>
                                <h3 className="font-serif-accent text-base font-bold text-[#1A103D] truncate">
                                  {t.shopName}
                                </h3>
                                <p className="text-xs text-[#64748B] truncate">
                                  Master: {t.masterTailor} · {t.experienceYears} yrs exp
                                </p>
                              </div>
                              <p className="text-xs text-[#475569] flex items-center gap-1.5 truncate">
                                <MapPin className="w-3.5 h-3.5 text-[#6B21D9] shrink-0" />
                                <span className="truncate">
                                  {t.locality} · {t.workingHours}
                                </span>
                              </p>
                              {t.bio && (
                                <p className="text-xs text-[#64748B] line-clamp-2">{t.bio}</p>
                              )}

                              {t.portfolio && t.portfolio.length > 0 && (
                                <div className="pt-2 border-t border-[#F1F5F9] space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                                      Previous Work
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setPortfolioGalleryTailor(t)}
                                      className="text-[11px] font-bold text-[#6B21D9] hover:underline cursor-pointer"
                                    >
                                      View Portfolio →
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {t.portfolio.slice(0, 4).map((p) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setPortfolioGalleryTailor(t)}
                                        aria-label={`View ${p.title}`}
                                        className="aspect-square rounded-lg overflow-hidden border border-[#EAE0FA] hover:border-[#6B21D9] cursor-pointer"
                                      >
                                        <SafeImage
                                          src={p.imageUrl}
                                          alt={p.title}
                                          fallbackTitle={p.title}
                                          className="w-full h-full"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {t.services.length > 0 && (
                                <div className="pt-2.5 border-t border-[#F1F5F9] space-y-1.5">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                                    Popular Services
                                  </span>
                                  {t.services.slice(0, 3).map((sv) => (
                                    <div
                                      key={sv.id}
                                      className="flex items-center justify-between gap-2 text-xs py-0.5"
                                    >
                                      <span className="text-[#1A103D] font-medium truncate">
                                        {sv.title}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setBookingModal({
                                            tailor: t,
                                            serviceId: sv.id,
                                            serviceTitle: sv.title,
                                            orderType:
                                              (sv.category as
                                                | 'custom'
                                                | 'alteration'
                                                | 'uniform'
                                                | 'bridal'
                                                | 'menswear') || 'custom',
                                            basePrice: sv.basePrice,
                                          })
                                        }
                                        className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#F4EEFF] hover:bg-[#6B21D9] text-[#6B21D9] hover:text-white font-bold tabular-nums shrink-0 transition-colors cursor-pointer"
                                      >
                                        ₹{sv.basePrice.toLocaleString('en-IN')} · Book
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="p-4 pt-0">
                            <button
                              type="button"
                              onClick={() =>
                                setBookingModal({
                                  tailor: t,
                                  serviceId: t.services[0]?.id ?? null,
                                  serviceTitle: t.services[0]?.title || 'Custom Tailoring Order',
                                  orderType: 'custom',
                                  basePrice: t.services[0]?.basePrice ?? 999,
                                })
                              }
                              className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-bold cursor-pointer transition-colors"
                            >
                              Schedule Pickup
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <PaginationBar
                    pagination={pagination}
                    onPageChange={setPage}
                    onLimitChange={(n) => {
                      setLimit(n);
                      setPage(1);
                    }}
                    itemLabel="tailors"
                  />
                </div>
              )}
            </div>
          )}

          {/* 3. MY ORDERS & TRACKING */}
          {section === 'orders' && (
            <div className="space-y-4">
              {/* Mobile-Friendly Status Filter Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {ORDER_STATUS_FILTERS.map((f) => {
                  const active = orderStatusFilter === f.id;
                  return (
                    <button
                      key={f.id || 'all'}
                      type="button"
                      onClick={() => {
                        setOrderStatusFilter(f.id);
                        setPage(1);
                      }}
                      className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1A103D] text-white'
                          : 'bg-white border border-[#EAE0FA] text-[#475569] hover:border-[#6B21D9]'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#EAE0FA] p-8 sm:p-10 text-center space-y-3">
                  <Package className="w-8 h-8 text-[#6B21D9] mx-auto" />
                  <p className="text-sm font-semibold text-[#1A103D]">
                    {orderStatusFilter
                      ? `No orders in "${orderStatusFilter}" stage`
                      : 'No orders found yet'}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      orderStatusFilter ? setOrderStatusFilter('') : handleSelectSection('browse')
                    }
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6B21D9] text-white text-xs font-bold cursor-pointer"
                  >
                    {orderStatusFilter ? 'Show All Orders' : 'Book Your First Service'}
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
                  <div className="divide-y divide-[#F1F5F9]">
                    {orders.map((o) => {
                      const oid = Number(o.id);
                      const canApprove =
                        !Boolean(o.quote_approved) &&
                        String(o.status) !== 'Cancelled' &&
                        String(o.status) !== 'Delivered';
                      const canCancel = ![
                        'Stitching Started',
                        'Quality Check',
                        'Ready for Delivery',
                        'Delivered',
                        'Cancelled',
                      ].includes(String(o.status));
                      const canPay =
                        String(o.payment_status) !== 'paid' && String(o.status) !== 'Cancelled';

                      return (
                        <div key={oid} className="p-4 sm:p-5 space-y-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <CategoryThumbnail
                                category={String(o.order_type || 'custom')}
                                alt={String(o.service_title || 'Order')}
                                size="md"
                              />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs">
                                  <span className="font-bold text-[#1A103D] tabular-nums">
                                    {String(o.order_code)}
                                  </span>
                                  <span className="text-[#CBD5E1]">·</span>
                                  <span className="font-bold text-[#6B21D9]">
                                    {String(o.status)}
                                  </span>
                                  <span className="text-[#CBD5E1]">·</span>
                                  <span
                                    className={`font-semibold capitalize ${
                                      o.payment_status === 'paid'
                                        ? 'text-emerald-700'
                                        : 'text-amber-700'
                                    }`}
                                  >
                                    {String(o.payment_status)}
                                  </span>
                                </div>
                                <h3 className="font-serif-accent text-sm sm:text-base font-bold text-[#1A103D] mt-0.5 truncate">
                                  {String(o.service_title)}
                                </h3>
                                <p className="text-xs text-[#475569] mt-0.5">
                                  <strong>
                                    {o.tailor_shop_name
                                      ? String(o.tailor_shop_name)
                                      : 'Matching in queue'}
                                  </strong>{' '}
                                  · Pickup:{' '}
                                  {o.pickup_date ? String(o.pickup_date).slice(0, 10) : 'TBD'}
                                </p>
                              </div>
                            </div>

                            <div className="text-right tabular-nums shrink-0">
                              <p className="text-base sm:text-lg font-bold text-[#1A103D]">
                                ₹{Number(o.total_amount).toLocaleString('en-IN')}
                              </p>
                              <p className="text-[11px] text-[#64748B] flex items-center justify-end gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                {o.delivery_date ? String(o.delivery_date).slice(0, 10) : 'TBD'}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              disabled={busyId === `timeline-${oid}`}
                              onClick={() => void handleOpenTimeline(oid)}
                              className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 rounded-xl border border-[#CBD5E1] hover:border-[#6B21D9] text-xs font-semibold text-[#1A103D] cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5 text-[#6B21D9]" />
                              Timeline
                            </button>

                            <div className="flex flex-wrap items-center gap-2">
                              {canApprove && (
                                <button
                                  type="button"
                                  disabled={busyId === `approve-${oid}`}
                                  onClick={() => void handleApproveQuote(oid)}
                                  className="min-h-[42px] px-3.5 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-bold cursor-pointer"
                                >
                                  Approve Quote
                                </button>
                              )}
                              {canPay && (
                                <button
                                  type="button"
                                  onClick={() => setPayModalOrder(o)}
                                  className="min-h-[42px] px-3.5 rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-bold tabular-nums cursor-pointer"
                                >
                                  Pay ₹{Number(o.total_amount).toLocaleString('en-IN')}
                                </button>
                              )}
                              {canCancel && (
                                <button
                                  type="button"
                                  disabled={busyId === `cancel-${oid}`}
                                  onClick={() => void handleCancelOrder(oid)}
                                  className="min-h-[42px] px-3.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

          {/* 4. PAYMENTS (Mobile Cards + Desktop Table + Pagination) */}
          {section === 'payments' && (
            <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA]">
                <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                  Payment History &amp; Receipts
                  {pagination ? ` (${pagination.total})` : ''}
                </h2>
              </div>
              {payments.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#64748B]">No payment history yet.</p>
              ) : (
                <>
                  {/* Mobile Receipt Cards */}
                  <div className="md:hidden divide-y divide-[#F1F5F9]">
                    {payments.map((p) => (
                      <div key={String(p.id)} className="p-4 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-[#1A103D] truncate">
                              {String(p.service_title)}
                            </p>
                            <p className="text-[11px] text-[#64748B] tabular-nums">
                              {String(p.payment_code)} · {String(p.order_code)}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-[#1A103D] tabular-nums shrink-0">
                            ₹{Number(p.amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] pt-1">
                          <span className="text-[#475569] uppercase tabular-nums truncate">
                            {String(p.payment_method)}
                            {p.transaction_ref ? ` · ${String(p.transaction_ref)}` : ''}
                          </span>
                          <span
                            className={`font-bold capitalize shrink-0 ${
                              p.payment_status === 'completed'
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {String(p.payment_status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8FF] border-b border-[#EAE0FA] text-[#64748B]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Receipt / Order</th>
                          <th className="px-4 py-3 font-semibold">Service &amp; Tailor</th>
                          <th className="px-4 py-3 font-semibold">Method / Ref</th>
                          <th className="px-4 py-3 font-semibold text-right">Amount</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {payments.map((p) => (
                          <tr key={String(p.id)} className="hover:bg-[#FAF8FF]/60">
                            <td className="px-4 py-3 tabular-nums font-bold text-[#1A103D]">
                              {String(p.payment_code)}
                              <span className="block font-normal text-[#64748B]">
                                {String(p.order_code)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[#1A103D]">
                                {String(p.service_title)}
                              </p>
                              <p className="text-[11px] text-[#64748B]">
                                {p.tailor_shop_name ? String(p.tailor_shop_name) : 'Tailering'}
                              </p>
                            </td>
                            <td className="px-4 py-3 uppercase text-[#475569] tabular-nums">
                              {String(p.payment_method)}
                              {p.transaction_ref ? ` · ${String(p.transaction_ref)}` : ''}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[#1A103D] tabular-nums">
                              ₹{Number(p.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 capitalize font-bold">
                              <span
                                className={
                                  p.payment_status === 'completed'
                                    ? 'text-emerald-700'
                                    : 'text-amber-700'
                                }
                              >
                                {String(p.payment_status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar
                    pagination={pagination}
                    onPageChange={setPage}
                    onLimitChange={(n) => {
                      setLimit(n);
                      setPage(1);
                    }}
                    itemLabel="receipts"
                  />
                </>
              )}
            </div>
          )}

          {/* 5. MEASUREMENTS */}
          {section === 'measurements' && (
            <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
              {measurements.length === 0 ? (
                <div className="p-8 sm:p-10 text-center space-y-3">
                  <Ruler className="w-8 h-8 text-[#6B21D9] mx-auto" />
                  <p className="text-sm text-[#64748B]">No saved measurement profiles yet.</p>
                  <button
                    type="button"
                    onClick={() => setMeasModalOpen(true)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6B21D9] text-white text-xs font-bold cursor-pointer"
                  >
                    + Save First Measurement Profile
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {measurements.map((m) => (
                      <div
                        key={m.id}
                        className="bg-white rounded-2xl border border-[#EAE0FA] p-4 sm:p-5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-serif-accent text-base font-bold text-[#1A103D] truncate">
                              {m.label}
                            </h3>
                            <p className="text-xs text-[#64748B] truncate">
                              {m.garmentType} · For {m.ownerName}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={busyId === `del-meas-${m.id}`}
                            onClick={() => void handleDeleteMeasurement(m.id)}
                            aria-label={`Delete ${m.label}`}
                            className="min-h-[40px] min-w-[40px] rounded-xl text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1F5F9] text-xs">
                          {Object.entries(m.values).map(([k, v]) => (
                            <div key={k} className="bg-[#FAF8FF] rounded-xl px-3 py-2">
                              <span className="text-[#64748B] block text-[10.5px]">{k}</span>
                              <span className="font-bold text-[#1A103D] tabular-nums">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <PaginationBar
                    pagination={pagination}
                    onPageChange={setPage}
                    onLimitChange={(n) => {
                      setLimit(n);
                      setPage(1);
                    }}
                    itemLabel="profiles"
                  />
                </>
              )}
            </div>
          )}

          {/* 6. NOTIFICATIONS */}
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
                    className="min-h-[36px] text-xs font-semibold text-[#6B21D9] hover:underline cursor-pointer"
                  >
                    Mark All Read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#64748B]">No notifications yet.</p>
              ) : (
                <>
                  <div className="divide-y divide-[#F1F5F9]">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-4 flex items-start justify-between gap-3 ${
                          n.isRead ? 'bg-white' : 'bg-[#F4EEFF]/70'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-[#1A103D]">{n.title}</p>
                          <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={async () => {
                              await notificationApi.markRead(n.id);
                              await loadSectionData('notifications', page, limit);
                            }}
                            className="min-h-[36px] px-2.5 rounded-lg text-[11px] font-bold text-[#6B21D9] hover:bg-[#6B21D9]/10 shrink-0 cursor-pointer"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <PaginationBar
                    pagination={pagination}
                    onPageChange={setPage}
                    onLimitChange={(n) => {
                      setLimit(n);
                      setPage(1);
                    }}
                    itemLabel="alerts"
                  />
                </>
              )}
            </div>
          )}

          {/* 7. PROFILE & SECURITY */}
          {section === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
              <form
                onSubmit={handleSaveProfile}
                className="bg-white rounded-2xl border border-[#EAE0FA] p-4 sm:p-5 space-y-4 text-xs"
              >
                <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                  Personal Profile &amp; Delivery Address
                </h2>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#1A103D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#1A103D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">Locality</label>
                  <input
                    type="text"
                    required
                    value={profileForm.locality}
                    onChange={(e) => setProfileForm((f) => ({ ...f, locality: e.target.value }))}
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#1A103D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">
                    Doorstep Pickup Address
                  </label>
                  <textarea
                    rows={2}
                    value={profileForm.address}
                    onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#1A103D]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busyId === 'save-profile'}
                  className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white font-bold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {busyId === 'save-profile' ? 'Saving...' : 'Save Profile'}
                </button>
              </form>

              <form
                onSubmit={handleChangePassword}
                className="bg-white rounded-2xl border border-[#EAE0FA] p-4 sm:p-5 space-y-4 text-xs h-fit"
              >
                <h2 className="font-serif-accent text-base font-bold text-[#1A103D] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#6B21D9]" />
                  Account Security
                </h2>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={pwForm.currentPassword}
                    onChange={(e) =>
                      setPwForm((f) => ({ ...f, currentPassword: e.target.value }))
                    }
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#1A103D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1A103D] mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Min 8 chars, 1 letter & 1 number"
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#1A103D]"
                  />
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                    {[
                      { ok: pwChecks.length, text: '8+ chars' },
                      { ok: pwChecks.letter, text: '1 letter' },
                      { ok: pwChecks.number, text: '1 number' },
                    ].map((c) => (
                      <span
                        key={c.text}
                        className={`inline-flex items-center gap-1 font-semibold ${
                          c.ok ? 'text-emerald-700' : 'text-[#64748B]'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        {c.text}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={
                    busyId === 'change-pw' ||
                    !(pwChecks.length && pwChecks.letter && pwChecks.number)
                  }
                  className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {busyId === 'change-pw' ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: ORDER STATUS TIMELINE */}
      <MobileBottomSheetModal
        open={Boolean(timelineModal)}
        onClose={() => setTimelineModal(null)}
        title={`Order ${String(timelineModal?.order.order_code || '')}`}
        subtitle={String(timelineModal?.order.service_title || '')}
        maxWidthClass="sm:max-w-lg"
      >
        {timelineModal && (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] p-3.5 flex items-center justify-between text-xs">
              <div>
                <p className="text-[#64748B]">Current Stage</p>
                <p className="font-bold text-[#6B21D9] text-sm mt-0.5">
                  {String(timelineModal.order.status)}
                </p>
              </div>
              <div className="text-right tabular-nums">
                <p className="text-[#64748B]">Total Amount</p>
                <p className="font-bold text-[#1A103D] text-sm mt-0.5">
                  ₹{Number(timelineModal.order.total_amount).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {timelineModal.history.length === 0 ? (
              <p className="text-xs text-[#64748B] text-center py-6">
                No status updates recorded yet.
              </p>
            ) : (
              <ol className="relative border-l-2 border-[#EAE0FA] ml-2.5 space-y-4 pl-5">
                {timelineModal.history.map((h) => (
                  <li key={String(h.id)} className="relative">
                    <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#6B21D9] ring-4 ring-white" />
                    <p className="text-xs font-bold text-[#1A103D]">{String(h.to_status)}</p>
                    {Boolean(h.note) && (
                      <p className="text-xs text-[#475569] mt-0.5">{String(h.note)}</p>
                    )}
                    <p className="text-[11px] text-[#94A3B8] mt-1 tabular-nums">
                      {String(h.actor_name || 'System')} ·{' '}
                      {h.created_at ? new Date(String(h.created_at)).toLocaleString('en-IN') : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </MobileBottomSheetModal>

      {/* MODAL 2: SCHEDULE BOOKING */}
      <MobileBottomSheetModal
        open={Boolean(bookingModal)}
        onClose={() => setBookingModal(null)}
        title="Schedule Tailoring Pickup"
        subtitle={
          bookingModal?.tailor
            ? `${bookingModal.tailor.shopName} · ${bookingModal.serviceTitle}`
            : bookingModal?.serviceTitle
        }
        maxWidthClass="sm:max-w-lg"
      >
        {bookingModal && (
          <form onSubmit={handlePlaceOrder} className="p-5 space-y-3.5 text-xs">
            <div className="rounded-xl bg-[#F4EEFF] border border-[#DCD0F5] p-3.5 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-bold text-[#1A103D] truncate">{bookingModal.serviceTitle}</p>
                <p className="text-[11px] text-[#475569]">
                  {bookingModal.tailor
                    ? `Assigned to ${bookingModal.tailor.shopName}`
                    : 'Auto-matched to nearest verified tailor'}
                </p>
              </div>
              <span className="text-base font-bold text-[#6B21D9] tabular-nums shrink-0 ml-2">
                ₹{bookingModal.basePrice.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'doorstep_pickup', label: 'Doorstep Pickup' },
                { id: 'shop_visit', label: 'Visit Tailor Shop' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setBookingForm((f) => ({
                      ...f,
                      pickupMode: m.id as 'doorstep_pickup' | 'shop_visit',
                    }))
                  }
                  className={`min-h-[44px] rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    bookingForm.pickupMode === m.id
                      ? 'border-[#6B21D9] bg-[#F4EEFF] text-[#6B21D9]'
                      : 'border-[#EAE0FA] bg-white text-[#475569]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1A103D] mb-1">Preferred Date</label>
                <input
                  type="date"
                  required
                  value={bookingForm.pickupDate}
                  onChange={(e) => setBookingForm((f) => ({ ...f, pickupDate: e.target.value }))}
                  className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-[#1A103D]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1A103D] mb-1">Time Slot</label>
                <select
                  value={bookingForm.pickupSlot}
                  onChange={(e) => setBookingForm((f) => ({ ...f, pickupSlot: e.target.value }))}
                  className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-[#1A103D] bg-white"
                >
                  {PICKUP_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Pickup Address</label>
              <input
                type="text"
                required
                value={bookingForm.pickupAddress}
                onChange={(e) => setBookingForm((f) => ({ ...f, pickupAddress: e.target.value }))}
                placeholder="Flat / Street / Landmark"
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-sm text-[#1A103D]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Payment Mode</label>
              <select
                value={bookingForm.paymentMethod}
                onChange={(e) =>
                  setBookingForm((f) => ({
                    ...f,
                    paymentMethod: e.target.value as
                      | 'upi'
                      | 'card'
                      | 'cash'
                      | 'netbanking'
                      | 'wallet',
                  }))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-[#1A103D] bg-white"
              >
                <option value="upi">UPI (GPay / PhonePe)</option>
                <option value="card">Debit / Credit Card</option>
                <option value="cash">Cash on Delivery</option>
                <option value="netbanking">Net Banking</option>
                <option value="wallet">Wallet</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#1A103D] mb-1">
                Garment &amp; Fit Instructions (optional)
              </label>
              <textarea
                rows={2}
                value={bookingForm.garmentNotes}
                onChange={(e) => setBookingForm((f) => ({ ...f, garmentNotes: e.target.value }))}
                placeholder="E.g. Boat neck with dori tassels, bring sample blouse..."
                className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-sm text-[#1A103D]"
              />
            </div>

            <button
              type="submit"
              disabled={busyId === 'place-order'}
              className="w-full min-h-[46px] rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
            >
              {busyId === 'place-order' ? 'Confirming Booking...' : 'Confirm & Schedule Pickup'}
            </button>
          </form>
        )}
      </MobileBottomSheetModal>

      {/* MODAL 3: PAY ORDER */}
      <MobileBottomSheetModal
        open={Boolean(payModalOrder)}
        onClose={() => setPayModalOrder(null)}
        title="Complete Payment"
        subtitle={
          payModalOrder
            ? `${String(payModalOrder.order_code)} · ${String(payModalOrder.service_title)}`
            : ''
        }
        maxWidthClass="sm:max-w-md"
      >
        {payModalOrder && (
          <form onSubmit={handlePayOrder} className="p-5 space-y-4 text-xs">
            <div className="rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] p-4 flex items-center justify-between">
              <span className="font-semibold text-[#64748B]">Payable Amount</span>
              <span className="text-xl font-bold text-[#1A103D] tabular-nums">
                ₹{Number(payModalOrder.total_amount).toLocaleString('en-IN')}
              </span>
            </div>

            <div>
              <label className="block font-bold text-[#1A103D] mb-2">Choose Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'upi', label: 'UPI Instant' },
                    { id: 'card', label: 'Card' },
                    { id: 'netbanking', label: 'Net Banking' },
                    { id: 'cash', label: 'Cash' },
                  ] as const
                ).map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPayMethod(pm.id)}
                    className={`min-h-[44px] rounded-xl border font-bold cursor-pointer transition-colors ${
                      payMethod === pm.id
                        ? 'border-[#6B21D9] bg-[#F4EEFF] text-[#6B21D9]'
                        : 'border-[#EAE0FA] bg-white text-[#475569]'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={busyId === `pay-${Number(payModalOrder.id)}`}
              className="w-full min-h-[46px] rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
            >
              {busyId === `pay-${Number(payModalOrder.id)}`
                ? 'Processing...'
                : `Pay ₹${Number(payModalOrder.total_amount).toLocaleString('en-IN')}`}
            </button>
          </form>
        )}
      </MobileBottomSheetModal>

      {/* MODAL 4: ADD MEASUREMENT PROFILE */}
      <MobileBottomSheetModal
        open={measModalOpen}
        onClose={() => setMeasModalOpen(false)}
        title="Save Measurement Profile"
        subtitle="Reuse across future custom stitching & alteration bookings"
        maxWidthClass="sm:max-w-md"
      >
        <form onSubmit={handleAddMeasurement} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#1A103D] mb-1">Profile Label</label>
            <input
              type="text"
              required
              value={measForm.label}
              onChange={(e) => setMeasForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Festive Saree Blouse Fit"
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-sm text-[#1A103D]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Garment Type</label>
              <select
                value={measForm.garmentType}
                onChange={(e) => setMeasForm((f) => ({ ...f, garmentType: e.target.value }))}
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-[#1A103D] bg-white"
              >
                <option value="Blouse">Blouse</option>
                <option value="Kurti / Suit">Kurti / Suit</option>
                <option value="Lehenga">Lehenga</option>
                <option value="Shirt / Trousers">Shirt / Trousers</option>
                <option value="Blazer / Suit">Blazer / Suit</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#1A103D] mb-1">For Person</label>
              <input
                type="text"
                required
                value={measForm.ownerName}
                onChange={(e) => setMeasForm((f) => ({ ...f, ownerName: e.target.value }))}
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-[#1A103D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Chest / Bust</label>
              <input
                type="text"
                required
                value={measForm.chestBust}
                onChange={(e) => setMeasForm((f) => ({ ...f, chestBust: e.target.value }))}
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-[#1A103D]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Waist</label>
              <input
                type="text"
                required
                value={measForm.waist}
                onChange={(e) => setMeasForm((f) => ({ ...f, waist: e.target.value }))}
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-[#1A103D]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Length</label>
              <input
                type="text"
                required
                value={measForm.length}
                onChange={(e) => setMeasForm((f) => ({ ...f, length: e.target.value }))}
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-[#1A103D]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#1A103D] mb-1">Shoulder</label>
              <input
                type="text"
                required
                value={measForm.shoulder}
                onChange={(e) => setMeasForm((f) => ({ ...f, shoulder: e.target.value }))}
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 py-2 text-sm text-[#1A103D]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busyId === 'add-meas'}
            className="w-full min-h-[46px] rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
          >
            {busyId === 'add-meas' ? 'Saving...' : 'Save Measurement Profile'}
          </button>
        </form>
      </MobileBottomSheetModal>

      {/* MODAL 5: TAILOR PORTFOLIO SHOWCASE VIEWER */}
      <MobileBottomSheetModal
        open={Boolean(portfolioGalleryTailor)}
        onClose={() => setPortfolioGalleryTailor(null)}
        title={portfolioGalleryTailor ? `${portfolioGalleryTailor.shopName} Portfolio` : 'Portfolio'}
        subtitle={
          portfolioGalleryTailor
            ? `Master ${portfolioGalleryTailor.masterTailor} · ${portfolioGalleryTailor.locality}`
            : ''
        }
        maxWidthClass="sm:max-w-2xl"
      >
        {portfolioGalleryTailor && (
          <div className="p-4 sm:p-5 space-y-4">
            {(!portfolioGalleryTailor.portfolio || portfolioGalleryTailor.portfolio.length === 0) ? (
              <p className="text-center text-sm text-[#64748B] py-8">
                No portfolio photos uploaded by this atelier yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {portfolioGalleryTailor.portfolio.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#EAE0FA] overflow-hidden bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-[4/3] bg-[#F1F5F9]">
                        <SafeImage
                          src={item.imageUrl}
                          alt={item.title}
                          fallbackTitle={item.title}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="p-3.5 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-serif-accent text-sm font-bold text-[#1A103D]">
                            {item.title}
                          </h4>
                          {item.priceHint !== null && (
                            <span className="text-xs font-bold text-[#6B21D9] tabular-nums shrink-0">
                              ₹{item.priceHint.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        {item.caption && (
                          <p className="text-xs text-[#64748B] leading-relaxed">{item.caption}</p>
                        )}
                      </div>
                    </div>
                    <div className="px-3.5 pb-3.5">
                      <button
                        type="button"
                        onClick={() => {
                          const targetTailor = portfolioGalleryTailor;
                          setPortfolioGalleryTailor(null);
                          setBookingModal({
                            tailor: targetTailor,
                            serviceId: null,
                            serviceTitle: item.title,
                            orderType: item.category,
                            basePrice: item.priceHint ?? targetTailor.services[0]?.basePrice ?? 999,
                          });
                        }}
                        className="w-full min-h-[42px] rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-bold cursor-pointer"
                      >
                        Book Similar Style
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </MobileBottomSheetModal>
    </DashboardShell>
  );
};

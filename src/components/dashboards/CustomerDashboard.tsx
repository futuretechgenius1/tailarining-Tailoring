import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Calendar,
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
  Star,
  Store,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { UserSession } from '../../types';
import {
  apiRequest,
  authApi,
  mapAuthUserToSession,
  notificationApi,
  NotificationItem,
  publicApi,
  PublicTailorItem,
} from '../../services/api';
import { DashboardNavItem, DashboardShell } from './DashboardShell';

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

  const [overview, setOverview] = useState<{
    kpis: Record<string, number>;
    recentOrders: Record<string, unknown>[];
  } | null>(null);
  const [tailors, setTailors] = useState<PublicTailorItem[]>([]);
  const [tailorSearch, setTailorSearch] = useState('');
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

  // Payment Modal
  const [payModalOrder, setPayModalOrder] = useState<Record<string, unknown> | null>(null);
  const [payMethod, setPayMethod] = useState<'upi' | 'card' | 'cash' | 'netbanking' | 'wallet'>('upi');

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

  const loadSectionData = useCallback(
    async (target: string) => {
      setLoading(true);
      setError(null);
      try {
        const notifRes = await notificationApi.list();
        setNotifications(notifRes.notifications);
        setUnreadCount(notifRes.unreadCount);

        if (target === 'overview') {
          const data = await apiRequest<{
            kpis: Record<string, number>;
            recentOrders: Record<string, unknown>[];
          }>('/api/customer/overview');
          setOverview(data);
        } else if (target === 'browse') {
          const data = await publicApi.tailors(tailorSearch);
          setTailors(data.tailors);
        } else if (target === 'orders') {
          const data = await apiRequest<{ orders: Record<string, unknown>[] }>(
            '/api/customer/orders',
          );
          setOrders(data.orders);
        } else if (target === 'payments') {
          const data = await apiRequest<{ payments: Record<string, unknown>[] }>(
            '/api/customer/payments',
          );
          setPayments(data.payments);
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
          }>('/api/customer/measurements');
          setMeasurements(data.measurements);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load your account data.');
      } finally {
        setLoading(false);
      }
    },
    [tailorSearch],
  );

  useEffect(() => {
    void loadSectionData(section);
  }, [section, loadSectionData]);

  const navItems: DashboardNavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'browse', label: 'Browse Tailors', icon: Store },
    {
      id: 'orders',
      label: 'My Orders',
      icon: Package,
      badge: overview?.kpis.activeOrders || undefined,
    },
    { id: 'payments', label: 'Payments', icon: CreditCard },
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
      setSection('orders');
      await loadSectionData('orders');
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
      await loadSectionData('orders');
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
      await loadSectionData('orders');
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
      await loadSectionData(section);
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
      onNotifyToast('Measurement profile saved to MySQL.');
      setMeasModalOpen(false);
      setMeasForm((f) => ({ ...f, label: '' }));
      await loadSectionData('measurements');
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
      await loadSectionData('measurements');
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

  return (
    <DashboardShell
      user={user}
      roleTitle="Customer Portal"
      roleSubtitle={user.locality}
      navItems={navItems}
      activeSection={section}
      onSelectSection={setSection}
      unreadNotifications={unreadCount}
      onOpenNotifications={() => setSection('notifications')}
      onRefresh={() => void loadSectionData(section)}
      refreshing={loading}
      onBackToStorefront={onBackToStorefront}
      onLogout={onLogout}
      headerAction={
        section === 'measurements' ? (
          <button
            type="button"
            onClick={() => setMeasModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Measurement
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSection('browse')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#5EEAD4]" />
            New Booking
          </button>
        )
      }
    >
      {error && (
        <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* 1. OVERVIEW */}
          {section === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Active Orders',
                    value: String(overview.kpis.activeOrders || 0),
                    sub: `${overview.kpis.deliveredOrders || 0} completed`,
                    accent: 'text-[#0B1F3A]',
                  },
                  {
                    label: 'Quotes to Approve',
                    value: String(overview.kpis.quotesAwaitingApproval || 0),
                    sub: 'Approve to begin stitching',
                    accent: 'text-[#C8922A]',
                  },
                  {
                    label: 'Total Spent',
                    value: `₹${Number(overview.kpis.totalPaid || 0).toLocaleString('en-IN')}`,
                    sub: `Pending due: ₹${Number(overview.kpis.pendingDue || 0).toLocaleString('en-IN')}`,
                    accent: 'text-[#0B7285]',
                  },
                  {
                    label: 'Saved Measurements',
                    value: String(overview.kpis.savedMeasurements || 0),
                    sub: `${overview.kpis.unreadNotifications || 0} unread alerts`,
                    accent: 'text-emerald-700',
                  },
                ].map((k) => (
                  <div key={k.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                    <span className="text-xs font-semibold text-[#64748B]">{k.label}</span>
                    <p className={`text-2xl font-bold tabular-nums mt-2 ${k.accent}`}>{k.value}</p>
                    <p className="text-xs text-[#64748B] mt-1">{k.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                  <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                    Recent Orders &amp; Tracking
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSection('orders')}
                    className="text-xs font-semibold text-[#0B7285] hover:underline cursor-pointer"
                  >
                    View All Orders →
                  </button>
                </div>
                {overview.recentOrders.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <p className="text-sm text-[#64748B]">
                      You haven&apos;t placed an order yet. Browse local tailors to schedule your first pickup.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSection('browse')}
                      className="px-4 py-2 rounded-xl bg-[#0B7285] text-white text-xs font-bold cursor-pointer"
                    >
                      Browse Verified Tailors
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F1F5F9]">
                    {overview.recentOrders.map((o) => (
                      <div
                        key={String(o.id)}
                        className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#0B1F3A]">
                            {String(o.order_code)} · {String(o.service_title)}
                          </p>
                          <p className="text-[#64748B]">
                            {o.tailor_shop_name ? String(o.tailor_shop_name) : 'Matching nearest tailor'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 tabular-nums">
                          <span className="font-semibold text-[#0B7285]">{String(o.status)}</span>
                          <span className="font-bold text-[#0B1F3A]">
                            ₹{Number(o.total_amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. BROWSE TAILORS & PLACE ORDER */}
          {section === 'browse' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tailorSearch}
                    onChange={(e) => setTailorSearch(e.target.value)}
                    placeholder="Search tailors by boutique name, specialty, locality..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-xs sm:text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
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
                  className="px-4 py-2.5 rounded-xl bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-semibold cursor-pointer"
                >
                  Auto-Match Nearest Tailor
                </button>
              </div>

              {tailors.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-3">
                  <Store className="w-8 h-8 text-[#0B7285] mx-auto" />
                  <h3 className="font-serif-accent text-lg font-bold text-[#0B1F3A]">
                    No tailor shops registered in MySQL yet
                  </h3>
                  <p className="text-xs text-[#64748B] max-w-md mx-auto">
                    You can still place an open doorstep booking right now — it enters the live pool for any tailor partner to accept!
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
                    className="px-4 py-2 rounded-xl bg-[#0B7285] text-white text-xs font-bold cursor-pointer"
                  >
                    Place Open Doorstep Order
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {tailors.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                              {t.shopName}
                            </h3>
                            <p className="text-xs text-[#64748B]">
                              Master: {t.masterTailor} · {t.experienceYears} yrs exp
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0B1F3A] tabular-nums">
                            <Star className="w-3.5 h-3.5 fill-[#C8922A] text-[#C8922A]" />
                            {t.rating.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-[#475569] flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#0B7285] shrink-0" />
                          {t.locality} · {t.workingHours}
                        </p>
                        {t.bio && <p className="text-xs text-[#64748B] line-clamp-2">{t.bio}</p>}

                        <div className="pt-2 border-t border-[#F1F5F9] space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                            Services &amp; Pricing
                          </span>
                          {t.services.slice(0, 3).map((sv) => (
                            <div
                              key={sv.id}
                              className="flex items-center justify-between gap-2 text-xs py-1"
                            >
                              <span className="text-[#0B1F3A] font-medium truncate">{sv.title}</span>
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
                                className="px-2.5 py-1 rounded-lg bg-[#F0F9FA] hover:bg-[#0B7285] text-[#0B7285] hover:text-white font-bold tabular-nums shrink-0 transition-colors cursor-pointer"
                              >
                                ₹{sv.basePrice.toLocaleString('en-IN')} · Book
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

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
                        className="w-full py-2.5 rounded-xl bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold cursor-pointer"
                      >
                        Schedule Pickup with {t.shopName}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. MY ORDERS & TRACKING */}
          {section === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-3">
                  <Package className="w-8 h-8 text-[#0B7285] mx-auto" />
                  <p className="text-sm font-semibold text-[#0B1F3A]">No orders found yet</p>
                  <button
                    type="button"
                    onClick={() => setSection('browse')}
                    className="px-4 py-2 rounded-xl bg-[#0B7285] text-white text-xs font-bold cursor-pointer"
                  >
                    Book Your First Service
                  </button>
                </div>
              ) : (
                orders.map((o) => {
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
                    <div
                      key={oid}
                      className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-[#0B1F3A] tabular-nums">
                              {String(o.order_code)}
                            </span>
                            <span className="text-[#CBD5E1]">·</span>
                            <span className="font-bold text-[#0B7285]">{String(o.status)}</span>
                            <span className="text-[#CBD5E1]">·</span>
                            <span
                              className={`font-semibold capitalize ${
                                o.payment_status === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              Payment: {String(o.payment_status)}
                            </span>
                          </div>
                          <h3 className="font-serif-accent text-base font-bold text-[#0B1F3A] mt-1">
                            {String(o.service_title)}
                          </h3>
                          <p className="text-xs text-[#475569] mt-0.5">
                            Tailor:{' '}
                            <strong>
                              {o.tailor_shop_name ? String(o.tailor_shop_name) : 'Matching in queue'}
                            </strong>{' '}
                            · Pickup: {o.pickup_date ? String(o.pickup_date).slice(0, 10) : 'TBD'} (
                            {String(o.pickup_slot || '')})
                          </p>
                        </div>

                        <div className="text-right tabular-nums text-xs">
                          <p className="text-lg font-bold text-[#0B1F3A]">
                            ₹{Number(o.total_amount).toLocaleString('en-IN')}
                          </p>
                          <p className="text-[#64748B]">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Est. Delivery:{' '}
                            {o.delivery_date ? String(o.delivery_date).slice(0, 10) : 'TBD'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={busyId === `timeline-${oid}`}
                          onClick={() => void handleOpenTimeline(oid)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] hover:border-[#0B7285] text-xs font-semibold text-[#0B1F3A] cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 text-[#0B7285]" />
                          Track Timeline
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          {canApprove && (
                            <button
                              type="button"
                              disabled={busyId === `approve-${oid}`}
                              onClick={() => void handleApproveQuote(oid)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#0B7285] hover:bg-[#085463] text-white text-xs font-bold cursor-pointer"
                            >
                              Approve Quote
                            </button>
                          )}
                          {canPay && (
                            <button
                              type="button"
                              onClick={() => setPayModalOrder(o)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold cursor-pointer"
                            >
                              Pay ₹{Number(o.total_amount).toLocaleString('en-IN')}
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              disabled={busyId === `cancel-${oid}`}
                              onClick={() => void handleCancelOrder(oid)}
                              className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 4. PAYMENTS */}
          {section === 'payments' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                  Payment History &amp; Receipts ({payments.length})
                </h2>
              </div>
              {payments.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#64748B]">No payment history yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
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
                        <tr key={String(p.id)}>
                          <td className="px-4 py-3 tabular-nums font-bold text-[#0B1F3A]">
                            {String(p.payment_code)}
                            <span className="block font-normal text-[#64748B]">
                              {String(p.order_code)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[#0B1F3A]">{String(p.service_title)}</p>
                            <p className="text-[11px] text-[#64748B]">
                              {p.tailor_shop_name ? String(p.tailor_shop_name) : 'Tailering'}
                            </p>
                          </td>
                          <td className="px-4 py-3 uppercase text-[#475569] tabular-nums">
                            {String(p.payment_method)}
                            {p.transaction_ref ? ` · ${String(p.transaction_ref)}` : ''}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#0B1F3A] tabular-nums">
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
              )}
            </div>
          )}

          {/* 5. MEASUREMENTS */}
          {section === 'measurements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {measurements.length === 0 ? (
                <div className="md:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-3">
                  <Ruler className="w-8 h-8 text-[#0B7285] mx-auto" />
                  <p className="text-sm text-[#64748B]">No saved measurement profiles yet.</p>
                  <button
                    type="button"
                    onClick={() => setMeasModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#0B7285] text-white text-xs font-bold cursor-pointer"
                  >
                    + Save First Measurement Profile
                  </button>
                </div>
              ) : (
                measurements.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                          {m.label}
                        </h3>
                        <p className="text-xs text-[#64748B]">
                          {m.garmentType} · For {m.ownerName}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyId === `del-meas-${m.id}`}
                        onClick={() => void handleDeleteMeasurement(m.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1F5F9] text-xs">
                      {Object.entries(m.values).map(([k, v]) => (
                        <div key={k} className="bg-[#F8FAFC] rounded-lg px-2.5 py-1.5">
                          <span className="text-[#64748B] block text-[10.5px]">{k}</span>
                          <span className="font-bold text-[#0B1F3A] tabular-nums">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 6. NOTIFICATIONS */}
          {section === 'notifications' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden max-w-3xl">
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                  Notifications ({unreadCount} unread)
                </h2>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await notificationApi.markAllRead();
                      await loadSectionData('notifications');
                    }}
                    className="text-xs font-semibold text-[#0B7285] hover:underline cursor-pointer"
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
                        n.isRead ? 'bg-white' : 'bg-[#F0F9FA]/60'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-[#0B1F3A]">{n.title}</p>
                        <p className="text-xs text-[#475569] mt-0.5">{n.message}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={async () => {
                            await notificationApi.markRead(n.id);
                            await loadSectionData('notifications');
                          }}
                          className="text-[11px] font-bold text-[#0B7285] shrink-0 cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. PROFILE & SECURITY */}
          {section === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
              <form
                onSubmit={handleSaveProfile}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 text-xs"
              >
                <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                  Personal Profile &amp; Delivery Address
                </h2>
                <div>
                  <label className="block font-bold text-[#0B1F3A] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0B1F3A] mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0B1F3A] mb-1">Locality</label>
                  <input
                    type="text"
                    required
                    value={profileForm.locality}
                    onChange={(e) => setProfileForm((f) => ({ ...f, locality: e.target.value }))}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0B1F3A] mb-1">Doorstep Pickup Address</label>
                  <textarea
                    rows={2}
                    value={profileForm.address}
                    onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busyId === 'save-profile'}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white font-bold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {busyId === 'save-profile' ? 'Saving...' : 'Save Profile'}
                </button>
              </form>

              <form
                onSubmit={handleChangePassword}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 text-xs h-fit"
              >
                <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A] flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#0B7285]" />
                  Change Password
                </h2>
                <div>
                  <label className="block font-bold text-[#0B1F3A] mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={pwForm.currentPassword}
                    onChange={(e) =>
                      setPwForm((f) => ({ ...f, currentPassword: e.target.value }))
                    }
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0B1F3A] mb-1">
                    New Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busyId === 'change-pw'}
                  className="px-4 py-2.5 rounded-xl bg-[#0B1F3A] hover:bg-[#15325B] text-white font-bold cursor-pointer"
                >
                  {busyId === 'change-pw' ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* PLACE ORDER MODAL */}
      {bookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F3A]/60 backdrop-blur-[2px]">
          <form
            onSubmit={handlePlaceOrder}
            className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#0B1F3A] text-white flex items-center justify-between">
              <div>
                <h3 className="font-serif-accent text-base font-bold">
                  {bookingModal.tailor ? bookingModal.tailor.shopName : 'Auto-Match Nearest Tailor'}
                </h3>
                <p className="text-[11px] text-[#5EEAD4]">
                  {bookingModal.serviceTitle} · ₹{bookingModal.basePrice.toLocaleString('en-IN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingModal(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBookingForm((f) => ({ ...f, pickupMode: 'doorstep_pickup' }))}
                  className={`py-2 rounded-xl border font-bold cursor-pointer ${
                    bookingForm.pickupMode === 'doorstep_pickup'
                      ? 'border-[#0B7285] bg-[#F0F9FA] text-[#0B7285]'
                      : 'border-[#CBD5E1] text-[#475569]'
                  }`}
                >
                  Doorstep Pickup
                </button>
                <button
                  type="button"
                  onClick={() => setBookingForm((f) => ({ ...f, pickupMode: 'shop_visit' }))}
                  className={`py-2 rounded-xl border font-bold cursor-pointer ${
                    bookingForm.pickupMode === 'shop_visit'
                      ? 'border-[#0B7285] bg-[#F0F9FA] text-[#0B7285]'
                      : 'border-[#CBD5E1] text-[#475569]'
                  }`}
                >
                  Visit Tailor Shop
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#0B1F3A] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.pickupDate}
                    onChange={(e) =>
                      setBookingForm((f) => ({ ...f, pickupDate: e.target.value }))
                    }
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0B1F3A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0B1F3A] mb-1">Time Slot</label>
                  <select
                    value={bookingForm.pickupSlot}
                    onChange={(e) =>
                      setBookingForm((f) => ({ ...f, pickupSlot: e.target.value }))
                    }
                    className="w-full border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-[#0B1F3A] bg-white"
                  >
                    {PICKUP_SLOTS.map((sl) => (
                      <option key={sl} value={sl}>
                        {sl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-[#0B1F3A] mb-1">Pickup Address</label>
                <input
                  type="text"
                  required
                  value={bookingForm.pickupAddress}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, pickupAddress: e.target.value }))
                  }
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0B1F3A]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#0B1F3A] mb-1">
                  Garment Requirements &amp; Notes
                </label>
                <textarea
                  rows={2}
                  value={bookingForm.garmentNotes}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, garmentNotes: e.target.value }))
                  }
                  placeholder="Neckline style, lining preference, urgent event date..."
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0B1F3A]"
                />
              </div>
              <button
                type="submit"
                disabled={busyId === 'place-order'}
                className="w-full py-2.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white font-bold cursor-pointer"
              >
                {busyId === 'place-order' ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ORDER TIMELINE MODAL */}
      {timelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F3A]/60 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-[#0B1F3A] text-white flex items-center justify-between">
              <h3 className="font-serif-accent text-base font-bold">
                Tracking {String(timelineModal.order.order_code)}
              </h3>
              <button
                type="button"
                onClick={() => setTimelineModal(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
              {timelineModal.history.map((h) => (
                <div key={String(h.id)} className="flex gap-3 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0B7285] mt-1 shrink-0" />
                  <div>
                    <p className="font-bold text-[#0B1F3A]">{String(h.to_status)}</p>
                    {Boolean(h.note) && <p className="text-[#475569]">{String(h.note)}</p>}
                    <p className="text-[10.5px] text-[#94A3B8] mt-0.5">
                      by {String(h.actor_name)} ({String(h.actor_role)}) ·{' '}
                      {new Date(String(h.created_at)).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAY ORDER MODAL */}
      {payModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F3A]/60 backdrop-blur-[2px]">
          <form
            onSubmit={handlePayOrder}
            className="w-full max-w-sm bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#0B1F3A] text-white flex items-center justify-between">
              <h3 className="font-serif-accent text-base font-bold">
                Pay for {String(payModalOrder.order_code)}
              </h3>
              <button
                type="button"
                onClick={() => setPayModalOrder(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex justify-between">
                <span className="text-[#64748B]">Payable Amount</span>
                <span className="text-base font-bold text-[#0B1F3A] tabular-nums">
                  ₹{Number(payModalOrder.total_amount).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <label className="block font-bold text-[#0B1F3A] mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) =>
                    setPayMethod(
                      e.target.value as 'upi' | 'card' | 'cash' | 'netbanking' | 'wallet',
                    )
                  }
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A] bg-white"
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="netbanking">NetBanking</option>
                  <option value="cash">Cash on Delivery / Pickup</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={busyId === `pay-${payModalOrder.id}`}
                className="w-full py-2.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white font-bold cursor-pointer"
              >
                {busyId === `pay-${payModalOrder.id}` ? 'Processing...' : 'Complete Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD MEASUREMENT MODAL */}
      {measModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F3A]/60 backdrop-blur-[2px]">
          <form
            onSubmit={handleAddMeasurement}
            className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#0B1F3A] text-white flex items-center justify-between">
              <h3 className="font-serif-accent text-base font-bold">Save Measurement Profile</h3>
              <button
                type="button"
                onClick={() => setMeasModalOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Profile Label (e.g. Festive Silk Blouse Fit)"
                value={measForm.label}
                onChange={(e) => setMeasForm((f) => ({ ...f, label: e.target.value }))}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
              />
              <select
                value={measForm.garmentType}
                onChange={(e) => setMeasForm((f) => ({ ...f, garmentType: e.target.value }))}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A] bg-white"
              >
                <option value="Blouse">Blouse</option>
                <option value="Kurti / Salwar">Kurti / Salwar</option>
                <option value="Men Shirt / Kurta">Men Shirt / Kurta</option>
                <option value="Trousers / Bottom">Trousers / Bottom</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Chest / Bust"
                  value={measForm.chestBust}
                  onChange={(e) => setMeasForm((f) => ({ ...f, chestBust: e.target.value }))}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0B1F3A]"
                />
                <input
                  type="text"
                  placeholder="Waist"
                  value={measForm.waist}
                  onChange={(e) => setMeasForm((f) => ({ ...f, waist: e.target.value }))}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0B1F3A]"
                />
                <input
                  type="text"
                  placeholder="Length"
                  value={measForm.length}
                  onChange={(e) => setMeasForm((f) => ({ ...f, length: e.target.value }))}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0B1F3A]"
                />
                <input
                  type="text"
                  placeholder="Shoulder"
                  value={measForm.shoulder}
                  onChange={(e) => setMeasForm((f) => ({ ...f, shoulder: e.target.value }))}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0B1F3A]"
                />
              </div>
              <button
                type="submit"
                disabled={busyId === 'add-meas'}
                className="w-full py-2.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white font-bold cursor-pointer"
              >
                {busyId === 'add-meas' ? 'Saving...' : 'Save Measurements'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
};

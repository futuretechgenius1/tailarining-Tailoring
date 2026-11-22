import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Calendar,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  Package,
  Plus,
  Scissors,
  Store,
  Trash2,
  XCircle,
} from 'lucide-react';
import { UserSession } from '../../types';
import { apiRequest, notificationApi, NotificationItem } from '../../services/api';
import { DashboardNavItem, DashboardShell } from './DashboardShell';

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
    pickupAvailable: true,
    isAvailable: true,
  });

  // Add Service Modal
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
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

  const loadSectionData = useCallback(async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      const notifRes = await notificationApi.list();
      setNotifications(notifRes.notifications);
      setUnreadCount(notifRes.unreadCount);

      if (target === 'overview') {
        const data = await apiRequest<{
          profile: Record<string, unknown>;
          kpis: Record<string, number>;
          recentOrders: Record<string, unknown>[];
        }>('/api/tailor/overview');
        setOverview(data);
      } else if (target === 'orders') {
        const data = await apiRequest<{
          assignedOrders: Record<string, unknown>[];
          openOrders: Record<string, unknown>[];
        }>('/api/tailor/orders');
        setAssignedOrders(data.assignedOrders);
        setOpenOrders(data.openOrders);
      } else if (target === 'services') {
        const data = await apiRequest<{ services: Record<string, unknown>[] }>('/api/tailor/services');
        setServices(data.services);
      } else if (target === 'profile') {
        const data = await apiRequest<{ profile: Record<string, unknown> }>('/api/tailor/profile');
        const p = data.profile;
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
          pickupAvailable: Boolean(p.pickupAvailable),
          isAvailable: Boolean(p.isAvailable),
        });
      } else if (target === 'earnings') {
        const data = await apiRequest<{
          commissionRate: number;
          summary: Record<string, number>;
          ledger: Record<string, unknown>[];
        }>('/api/tailor/earnings');
        setEarnings(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tailor data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSectionData(section);
  }, [section, loadSectionData]);

  const navItems: DashboardNavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'orders',
      label: 'Orders & Queue',
      icon: Package,
      badge: overview?.kpis.activeOrders || undefined,
    },
    { id: 'services', label: 'Pricing & Services', icon: Scissors },
    { id: 'profile', label: 'Shop Profile', icon: Store },
    { id: 'earnings', label: 'Earnings & Payouts', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount || undefined },
  ];

  const handleAcceptOpenOrder = async (orderId: number) => {
    setBusyId(`accept-${orderId}`);
    try {
      await apiRequest(`/api/tailor/orders/${orderId}/accept`, { method: 'POST' });
      onNotifyToast('Order accepted and added to your assigned queue!');
      await loadSectionData('orders');
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
      await loadSectionData('orders');
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Order update blocked by rule.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('add-service');
    try {
      await apiRequest('/api/tailor/services', {
        method: 'POST',
        body: {
          title: serviceForm.title,
          category: serviceForm.category,
          description: serviceForm.description,
          basePrice: Number(serviceForm.basePrice),
          turnaroundDays: Number(serviceForm.turnaroundDays),
          isActive: true,
        },
      });
      onNotifyToast(`Added "${serviceForm.title}" to your pricing menu.`);
      setServiceModalOpen(false);
      setServiceForm({
        title: '',
        category: 'custom',
        description: '',
        basePrice: '899',
        turnaroundDays: '3',
      });
      await loadSectionData('services');
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not add service.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteService = async (id: number) => {
    setBusyId(`del-svc-${id}`);
    try {
      await apiRequest(`/api/tailor/services/${id}`, { method: 'DELETE' });
      onNotifyToast('Service removed from your menu.');
      await loadSectionData('services');
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
          pickupAvailable: profileForm.pickupAvailable,
          isAvailable: profileForm.isAvailable,
        },
      });
      onNotifyToast('Shop profile & availability saved.');
      await loadSectionData('profile');
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
      await loadSectionData('overview');
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
      onSelectSection={setSection}
      unreadNotifications={unreadCount}
      onOpenNotifications={() => setSection('notifications')}
      onRefresh={() => void loadSectionData(section)}
      refreshing={loading}
      onBackToStorefront={onBackToStorefront}
      onLogout={onLogout}
      headerAction={
        section === 'services' ? (
          <button
            type="button"
            onClick={() => setServiceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Service
          </button>
        ) : section === 'overview' && overview ? (
          <button
            type="button"
            disabled={busyId === 'toggle-avail'}
            onClick={() => void handleToggleAvailabilityQuick()}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap ${
              Boolean(overview.profile.isAvailable)
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {Boolean(overview.profile.isAvailable) ? 'Accepting Bookings ●' : 'Paused ○'}
          </button>
        ) : null
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
                    sub: `${overview.kpis.openPoolOrders || 0} open in locality pool`,
                    accent: 'text-[#0B1F3A]',
                  },
                  {
                    label: 'Pending Quote Approval',
                    value: String(overview.kpis.pendingApproval || 0),
                    sub: `${overview.kpis.awaitingQuote || 0} awaiting your quote`,
                    accent: 'text-[#C8922A]',
                  },
                  {
                    label: 'Net Earnings Collected',
                    value: `₹${Number(overview.kpis.totalEarned || 0).toLocaleString('en-IN')}`,
                    sub: `Settled: ₹${Number(overview.kpis.settledEarnings || 0).toLocaleString('en-IN')}`,
                    accent: 'text-[#0B7285]',
                  },
                  {
                    label: 'Completed Orders',
                    value: String(overview.kpis.deliveredOrders || 0),
                    sub: `Rating ${Number(overview.profile.rating || 4.8).toFixed(1)}★ · Fee ${Number(overview.profile.commissionRate || 12)}%`,
                    accent: 'text-emerald-700',
                  },
                ].map((k) => (
                  <div key={k.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                    <span className="text-xs font-semibold text-[#64748B]">{k.label}</span>
                    <p className={`text-2xl font-bold tabular-nums mt-2 ${k.accent}`}>{k.value}</p>
                    <p className="text-xs text-[#64748B] mt-1 tabular-nums">{k.sub}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                  <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                    Recent Assigned Orders
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSection('orders')}
                    className="text-xs font-semibold text-[#0B7285] hover:underline cursor-pointer"
                  >
                    Open Full Queue →
                  </button>
                </div>
                {overview.recentOrders.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[#64748B]">
                    No assigned orders yet. Check <strong>Orders &amp; Queue</strong> to accept open customer requests.
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
                            {String(o.customer_name)} · {String(o.locality)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 tabular-nums">
                          <span className="font-semibold text-[#0B7285]">{String(o.status)}</span>
                          <span className="font-bold text-[#0B1F3A]">
                            ₹{Number(o.tailor_payout).toLocaleString('en-IN')} net
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. ORDERS & OPEN POOL */}
          {section === 'orders' && (
            <div className="space-y-6">
              {openOrders.length > 0 && (
                <div className="bg-[#F0F9FA] rounded-2xl border border-[#CBE7EC] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#CBE7EC]">
                    <h2 className="font-serif-accent text-sm font-bold text-[#0B1F3A]">
                      Open Customer Requests Available to Accept ({openOrders.length})
                    </h2>
                  </div>
                  <div className="divide-y divide-[#CBE7EC]/60">
                    {openOrders.map((o) => {
                      const oid = Number(o.id);
                      return (
                        <div
                          key={oid}
                          className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <p className="font-bold text-[#0B1F3A]">
                              {String(o.order_code)} · {String(o.service_title)}
                            </p>
                            <p className="text-[#475569] mt-0.5">
                              {String(o.customer_name)} · {String(o.pickup_address)} · Pickup:{' '}
                              {o.pickup_date ? String(o.pickup_date).slice(0, 10) : 'Flexible'} (
                              {String(o.pickup_slot || '')})
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={busyId === `accept-${oid}`}
                            onClick={() => void handleAcceptOpenOrder(oid)}
                            className="px-4 py-2 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white font-bold cursor-pointer"
                          >
                            {busyId === `accept-${oid}` ? 'Accepting...' : 'Accept Order'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E2E8F0]">
                  <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                    Assigned Orders ({assignedOrders.length})
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Submit quotes, update status &amp; delivery timelines. Stitching unlocks once customer approves the quote.
                  </p>
                </div>

                {assignedOrders.length === 0 ? (
                  <div className="p-10 text-center text-sm text-[#64748B]">
                    No assigned orders yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F1F5F9]">
                    {assignedOrders.map((o) => {
                      const oid = Number(o.id);
                      return (
                        <div key={oid} className="p-5 space-y-3">
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
                                  className={`font-semibold ${
                                    Boolean(o.quote_approved) ? 'text-emerald-700' : 'text-amber-700'
                                  }`}
                                >
                                  {Boolean(o.quote_approved)
                                    ? 'Quote Approved ✓'
                                    : 'Awaiting Quote Approval'}
                                </span>
                              </div>
                              <h3 className="text-sm font-bold text-[#0B1F3A] mt-1">
                                {String(o.service_title)}
                              </h3>
                              <p className="text-xs text-[#475569] mt-0.5">
                                Customer: <strong>{String(o.customer_name)}</strong>{' '}
                                {o.customer_phone ? `(${String(o.customer_phone)})` : ''} ·{' '}
                                {String(o.pickup_address || o.locality)}
                              </p>
                              {Boolean(o.garment_notes || o.customer_requirements) && (
                                <p className="text-xs text-[#64748B] mt-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5">
                                  <strong>Requirements:</strong>{' '}
                                  {String(o.customer_requirements || o.garment_notes)}
                                </p>
                              )}
                            </div>

                            <div className="text-right text-xs tabular-nums">
                              <p className="text-base font-bold text-[#0B1F3A]">
                                ₹{Number(o.total_amount).toLocaleString('en-IN')}
                              </p>
                              <p className="text-[#0B7285] font-semibold">
                                Your Payout: ₹{Number(o.tailor_payout).toLocaleString('en-IN')}
                              </p>
                              <p className="text-[#64748B] mt-0.5">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Due: {o.delivery_date ? String(o.delivery_date).slice(0, 10) : 'TBD'}
                              </p>
                            </div>
                          </div>

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
                              className="px-4 py-2 rounded-xl bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-semibold cursor-pointer"
                            >
                              Update Status, Quote &amp; Delivery
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. PRICING & SERVICES */}
          {section === 'services' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                  Your Atelier Price List ({services.length})
                </h2>
              </div>
              {services.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <p className="text-sm text-[#64748B]">
                    No custom services added yet. Add your first service to display pricing to customers.
                  </p>
                  <button
                    type="button"
                    onClick={() => setServiceModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#0B7285] text-white text-xs font-bold cursor-pointer"
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
                        className="px-5 py-4 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-bold text-[#0B1F3A]">{String(s.title)}</p>
                          <p className="text-xs text-[#64748B]">
                            <span className="capitalize font-semibold text-[#0B7285]">
                              {String(s.category)}
                            </span>{' '}
                            · {Number(s.turnaround_days)} days ·{' '}
                            {s.description ? String(s.description) : 'Standard tailoring'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 tabular-nums">
                          <span className="text-sm font-bold text-[#0B1F3A]">
                            ₹{Number(s.base_price).toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            disabled={busyId === `del-svc-${sid}`}
                            onClick={() => void handleDeleteService(sid)}
                            aria-label={`Delete ${s.title}`}
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. SHOP PROFILE & AVAILABILITY */}
          {section === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden max-w-3xl"
            >
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                  Atelier Business Profile &amp; Availability
                </h2>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#0B1F3A] mb-1">Shop / Boutique Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.shopName}
                    onChange={(e) => setProfileForm((f) => ({ ...f, shopName: e.target.value }))}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0B1F3A] mb-1">Master Tailor Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.masterTailor}
                    onChange={(e) => setProfileForm((f) => ({ ...f, masterTailor: e.target.value }))}
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
                  <label className="block font-bold text-[#0B1F3A] mb-1">Working Hours</label>
                  <input
                    type="text"
                    required
                    value={profileForm.workingHours}
                    onChange={(e) => setProfileForm((f) => ({ ...f, workingHours: e.target.value }))}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0B1F3A] mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min={0}
                    value={profileForm.experienceYears}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, experienceYears: e.target.value }))
                    }
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0B1F3A] mb-1">Home Visit Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={profileForm.homeVisitFee}
                    onChange={(e) => setProfileForm((f) => ({ ...f, homeVisitFee: e.target.value }))}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0B1F3A] mb-1">Shop Address</label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0B1F3A] mb-1">
                    Specialties (comma separated)
                  </label>
                  <input
                    type="text"
                    value={profileForm.specialtiesText}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, specialtiesText: e.target.value }))
                    }
                    placeholder="Maggam Blouses, Bridal Lehenga, Alterations"
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0B1F3A] mb-1">Atelier Bio</label>
                  <textarea
                    rows={3}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                  />
                </div>
                <label className="flex items-center gap-2 font-semibold text-[#0B1F3A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.pickupAvailable}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, pickupAvailable: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#0B7285]"
                  />
                  Offer Doorstep Measurement &amp; Pickup
                </label>
                <label className="flex items-center gap-2 font-semibold text-[#0B1F3A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.isAvailable}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, isAvailable: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#0B7285]"
                  />
                  Shop Open &amp; Accepting Orders
                </label>
              </div>
              <div className="px-5 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end">
                <button
                  type="submit"
                  disabled={busyId === 'save-profile'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white text-xs font-bold cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {busyId === 'save-profile' ? 'Saving...' : 'Save Shop Profile'}
                </button>
              </div>
            </form>
          )}

          {/* 5. EARNINGS & PAYOUTS */}
          {section === 'earnings' && earnings && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                  <span className="text-xs font-semibold text-[#64748B]">Gross Orders Value</span>
                  <p className="text-2xl font-bold text-[#0B1F3A] tabular-nums mt-1.5">
                    ₹{Number(earnings.summary.gross_billed || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[11px] text-[#64748B]">
                    Platform fee ({earnings.commissionRate}%): ₹
                    {Number(earnings.summary.total_platform_fee || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                  <span className="text-xs font-semibold text-[#64748B]">Settled to Your Bank</span>
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1.5">
                    ₹{Number(earnings.summary.settled_amount || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                  <span className="text-xs font-semibold text-[#64748B]">Ready for Next Payout</span>
                  <p className="text-2xl font-bold text-[#0B7285] tabular-nums mt-1.5">
                    ₹{Number(earnings.summary.ready_for_payout || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E2E8F0]">
                  <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                    Earnings &amp; Settlement History
                  </h2>
                </div>
                {earnings.ledger.length === 0 ? (
                  <p className="p-8 text-center text-sm text-[#64748B]">No earnings recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
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
                            <td className="px-4 py-3 font-bold text-[#0B1F3A] tabular-nums">
                              {String(row.order_code)}
                              <span className="block font-normal text-[#64748B]">
                                {String(row.service_title)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#334155]">{String(row.customer_name)}</td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              ₹{Number(row.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[#0B7285] tabular-nums">
                              ₹{Number(row.tailor_earning).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 capitalize">
                              <span className="font-semibold text-[#0B1F3A]">
                                {String(row.payment_status)}
                              </span>{' '}
                              ·{' '}
                              <span className="text-[#64748B]">{String(row.payout_status)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
        </>
      )}

      {/* EDIT ORDER STATUS / QUOTE MODAL */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F3A]/60 backdrop-blur-[2px]">
          <form
            onSubmit={handleSaveOrderUpdate}
            className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#0B1F3A] text-white flex items-center justify-between">
              <h3 className="font-serif-accent text-base font-bold">
                Update Order {editingOrder.orderCode}
              </h3>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#0B1F3A] mb-1">Order Stage</label>
                <select
                  value={editingOrder.status}
                  onChange={(e) =>
                    setEditingOrder((o) => (o ? { ...o, status: e.target.value } : null))
                  }
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A] bg-white"
                >
                  {TAILOR_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#0B1F3A] mb-1">
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
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#0B1F3A] mb-1">
                  Estimated Delivery Date
                </label>
                <input
                  type="date"
                  value={editingOrder.deliveryDate}
                  onChange={(e) =>
                    setEditingOrder((o) => (o ? { ...o, deliveryDate: e.target.value } : null))
                  }
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#0B1F3A] mb-1">Progress Note</label>
                <input
                  type="text"
                  placeholder="Optional update for customer..."
                  value={editingOrder.note}
                  onChange={(e) =>
                    setEditingOrder((o) => (o ? { ...o, note: e.target.value } : null))
                  }
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                />
              </div>
              <button
                type="submit"
                disabled={busyId === `edit-ord-${editingOrder.id}`}
                className="w-full py-2.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white font-bold cursor-pointer"
              >
                {busyId === `edit-ord-${editingOrder.id}` ? 'Saving...' : 'Save Order Update'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD SERVICE MODAL */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F3A]/60 backdrop-blur-[2px]">
          <form
            onSubmit={handleAddService}
            className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#0B1F3A] text-white flex items-center justify-between">
              <h3 className="font-serif-accent text-base font-bold">Add Tailor Service</h3>
              <button
                type="button"
                onClick={() => setServiceModalOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Service Title (e.g. Custom Lehenga Stitching)"
                value={serviceForm.title}
                onChange={(e) => setServiceForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
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
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A] bg-white"
              >
                <option value="custom">Custom Stitching</option>
                <option value="bridal">Bridal &amp; Maggam</option>
                <option value="alteration">Alteration</option>
                <option value="menswear">Menswear</option>
                <option value="uniform">Uniforms</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  required
                  min={20}
                  placeholder="Price (₹)"
                  value={serviceForm.basePrice}
                  onChange={(e) => setServiceForm((f) => ({ ...f, basePrice: e.target.value }))}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                />
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Days"
                  value={serviceForm.turnaroundDays}
                  onChange={(e) =>
                    setServiceForm((f) => ({ ...f, turnaroundDays: e.target.value }))
                  }
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                />
              </div>
              <textarea
                rows={3}
                placeholder="Description & inclusions..."
                value={serviceForm.description}
                onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
              />
              <button
                type="submit"
                disabled={busyId === 'add-service'}
                className="w-full py-2.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white font-bold cursor-pointer"
              >
                {busyId === 'add-service' ? 'Saving...' : 'Add to Price List'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
};

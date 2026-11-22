import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  Package,
  Plus,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { UserSession } from '../../types';
import { apiRequest, notificationApi } from '../../services/api';
import { DashboardNavItem, DashboardShell } from './DashboardShell';

interface OwnerDashboardProps {
  user: UserSession;
  onBackToStorefront: () => void;
  onLogout: () => void;
  onNotifyToast: (msg: string) => void;
}

const ORDER_STATUSES = [
  'Booking Created',
  'Tailor Accepted',
  'Visit Scheduled',
  'Measurements Completed',
  'Quotation Submitted',
  'Customer Approved',
  'Stitching Started',
  'Quality Check',
  'Ready for Delivery',
  'Delivered',
  'Cancelled',
] as const;

interface OwnerOverviewData {
  kpis: {
    totalUsers: number;
    totalCustomers: number;
    totalTailors: number;
    activeUsers: number;
    verifiedShops: number;
    availableShops: number;
    totalOrders: number;
    activeOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalGmv: number;
    totalCommission: number;
    collectedRevenue: number;
    pendingCollections: number;
    pendingPayouts: number;
    settledPayouts: number;
  };
  recentOrders: Record<string, unknown>[];
  topTailors: Record<string, unknown>[];
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  user,
  onBackToStorefront,
  onLogout,
  onNotifyToast,
}) => {
  const [section, setSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Live DB Data State
  const [overview, setOverview] = useState<OwnerOverviewData | null>(null);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [tailors, setTailors] = useState<Record<string, unknown>[]>([]);
  const [services, setServices] = useState<Record<string, unknown>[]>([]);
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [reports, setReports] = useState<{
    byCategory: Record<string, unknown>[];
    byStatus: Record<string, unknown>[];
    byLocality: Record<string, unknown>[];
    tailorPerformance: Record<string, unknown>[];
  } | null>(null);
  const [settings, setSettings] = useState<Record<string, unknown>[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({});

  // Search / Filter Controls
  const [userSearch, setUserSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  // Create User Modal
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'tailor' as 'owner' | 'tailor' | 'customer',
    locality: 'Alkapur Township, Manikonda',
    shopName: '',
  });

  // Create Service Modal
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [newServiceForm, setNewServiceForm] = useState({
    title: '',
    category: 'custom' as 'custom' | 'alteration' | 'uniform' | 'bridal' | 'menswear',
    description: '',
    basePrice: '999',
    turnaroundDays: '4',
  });

  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSectionData = useCallback(
    async (targetSection: string) => {
      setLoading(true);
      setError(null);
      try {
        const notifRes = await notificationApi.list().catch(() => ({ unreadCount: 0, notifications: [] }));
        setUnreadCount(notifRes.unreadCount);

        if (targetSection === 'overview') {
          const data = await apiRequest<OwnerOverviewData>('/api/owner/overview');
          setOverview(data);
        } else if (targetSection === 'tailors') {
          const data = await apiRequest<{ tailors: Record<string, unknown>[] }>('/api/owner/tailors');
          setTailors(data.tailors);
        } else if (targetSection === 'customers') {
          const q = userSearch ? `&q=${encodeURIComponent(userSearch)}` : '';
          const data = await apiRequest<{ users: Record<string, unknown>[] }>(
            `/api/owner/users?role=customer${q}`,
          );
          setUsers(data.users);
        } else if (targetSection === 'users') {
          const q = userSearch ? `?q=${encodeURIComponent(userSearch)}` : '';
          const data = await apiRequest<{ users: Record<string, unknown>[] }>(`/api/owner/users${q}`);
          setUsers(data.users);
        } else if (targetSection === 'services') {
          const data = await apiRequest<{ services: Record<string, unknown>[] }>('/api/owner/services');
          setServices(data.services);
        } else if (targetSection === 'orders') {
          const params = new URLSearchParams();
          if (orderStatusFilter) params.set('status', orderStatusFilter);
          if (orderSearch) params.set('q', orderSearch);
          const [ordRes, tRes] = await Promise.all([
            apiRequest<{ orders: Record<string, unknown>[] }>(
              `/api/owner/orders${params.toString() ? `?${params}` : ''}`,
            ),
            apiRequest<{ tailors: Record<string, unknown>[] }>('/api/owner/tailors'),
          ]);
          setOrders(ordRes.orders);
          setTailors(tRes.tailors);
        } else if (targetSection === 'payments') {
          const q = paymentStatusFilter ? `?status=${encodeURIComponent(paymentStatusFilter)}` : '';
          const data = await apiRequest<{ payments: Record<string, unknown>[] }>(
            `/api/owner/payments${q}`,
          );
          setPayments(data.payments);
        } else if (targetSection === 'reports') {
          const data = await apiRequest<{
            byCategory: Record<string, unknown>[];
            byStatus: Record<string, unknown>[];
            byLocality: Record<string, unknown>[];
            tailorPerformance: Record<string, unknown>[];
          }>('/api/owner/reports');
          setReports(data);
        } else if (targetSection === 'settings') {
          const data = await apiRequest<{ settings: Record<string, unknown>[] }>('/api/owner/settings');
          setSettings(data.settings);
          const draft: Record<string, string> = {};
          for (const s of data.settings) {
            draft[String(s.setting_key)] = String(s.setting_value);
          }
          setSettingsDraft(draft);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data from MySQL.');
      } finally {
        setLoading(false);
      }
    },
    [userSearch, orderSearch, orderStatusFilter, paymentStatusFilter],
  );

  useEffect(() => {
    void loadSectionData(section);
  }, [section, loadSectionData]);

  const navItems: DashboardNavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tailors', label: 'Tailor Partners', icon: Store },
    { id: 'customers', label: 'Customers', icon: UserCheck },
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'services', label: 'Services Catalog', icon: Scissors },
    { id: 'orders', label: 'Orders', icon: Package, badge: overview?.kpis.activeOrders },
    { id: 'payments', label: 'Payments & Payouts', icon: CreditCard },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Platform Settings', icon: Settings },
  ];

  // Action Handlers
  const handleToggleUserStatus = async (u: Record<string, unknown>) => {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    setBusyId(`user-${u.id}`);
    try {
      await apiRequest(`/api/owner/users/${u.id}`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      onNotifyToast(`User ${u.full_name} marked as ${nextStatus}.`);
      await loadSectionData(section);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleChangeUserRole = async (userId: number, role: 'owner' | 'tailor' | 'customer') => {
    setBusyId(`role-${userId}`);
    try {
      await apiRequest(`/api/owner/users/${userId}`, { method: 'PATCH', body: { role } });
      onNotifyToast(`User role updated to ${role}.`);
      await loadSectionData(section);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Role update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('create-user');
    try {
      await apiRequest('/api/owner/users', { method: 'POST', body: newUserForm });
      onNotifyToast(`Created ${newUserForm.role} account for ${newUserForm.fullName}.`);
      setCreateUserOpen(false);
      setNewUserForm({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'tailor',
        locality: 'Alkapur Township, Manikonda',
        shopName: '',
      });
      await loadSectionData(section);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not create user.');
    } finally {
      setBusyId(null);
    }
  };

  const handlePatchTailor = async (tailorId: number, body: Record<string, unknown>, msg: string) => {
    setBusyId(`tailor-${tailorId}`);
    try {
      await apiRequest(`/api/owner/tailors/${tailorId}`, { method: 'PATCH', body });
      onNotifyToast(msg);
      await loadSectionData('tailors');
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Tailor update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('create-service');
    try {
      await apiRequest('/api/owner/services', {
        method: 'POST',
        body: {
          title: newServiceForm.title,
          category: newServiceForm.category,
          description: newServiceForm.description,
          basePrice: Number(newServiceForm.basePrice),
          turnaroundDays: Number(newServiceForm.turnaroundDays),
          isActive: true,
        },
      });
      onNotifyToast(`Service "${newServiceForm.title}" added.`);
      setCreateServiceOpen(false);
      setNewServiceForm({
        title: '',
        category: 'custom',
        description: '',
        basePrice: '999',
        turnaroundDays: '4',
      });
      await loadSectionData('services');
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not add service.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleService = async (svc: Record<string, unknown>) => {
    setBusyId(`svc-${svc.id}`);
    try {
      await apiRequest(`/api/owner/services/${svc.id}`, {
        method: 'PATCH',
        body: { isActive: !Boolean(svc.is_active) },
      });
      onNotifyToast(`Service "${svc.title}" updated.`);
      await loadSectionData('services');
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteService = async (id: number) => {
    setBusyId(`svc-del-${id}`);
    try {
      await apiRequest(`/api/owner/services/${id}`, { method: 'DELETE' });
      onNotifyToast('Service removed from catalog.');
      await loadSectionData('services');
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateOrder = async (orderId: number, body: Record<string, unknown>) => {
    setBusyId(`order-${orderId}`);
    try {
      await apiRequest(`/api/owner/orders/${orderId}`, { method: 'PATCH', body });
      onNotifyToast('Order updated in database.');
      await loadSectionData('orders');
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Order update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdatePayment = async (
    paymentId: number,
    body: Record<string, unknown>,
    msg: string,
  ) => {
    setBusyId(`pay-${paymentId}`);
    try {
      await apiRequest(`/api/owner/payments/${paymentId}`, { method: 'PATCH', body });
      onNotifyToast(msg);
      await loadSectionData('payments');
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Payment update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('save-settings');
    try {
      const payload = Object.entries(settingsDraft).map(([key, value]) => ({ key, value }));
      await apiRequest('/api/owner/settings', { method: 'PUT', body: { settings: payload } });
      onNotifyToast('Platform settings saved to MySQL.');
      await loadSectionData('settings');
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardShell
      user={user}
      roleTitle="App Owner Console"
      roleSubtitle="Platform Operations & RBAC Control"
      navItems={navItems}
      activeSection={section}
      onSelectSection={setSection}
      unreadNotifications={unreadCount}
      onRefresh={() => void loadSectionData(section)}
      refreshing={loading}
      onBackToStorefront={onBackToStorefront}
      onLogout={onLogout}
      headerAction={
        section === 'users' || section === 'customers' ? (
          <button
            type="button"
            onClick={() => setCreateUserOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#5EEAD4]" />
            Add User
          </button>
        ) : section === 'services' ? (
          <button
            type="button"
            onClick={() => setCreateServiceOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Service
          </button>
        ) : null
      }
    >
      {error && (
        <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadSectionData(section)}
            className="text-xs font-bold underline cursor-pointer shrink-0"
          >
            Retry
          </button>
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
                    label: 'Total Platform GMV',
                    value: `₹${overview.kpis.totalGmv.toLocaleString('en-IN')}`,
                    sub: `Commission: ₹${overview.kpis.totalCommission.toLocaleString('en-IN')}`,
                    accent: 'text-[#0B7285]',
                  },
                  {
                    label: 'Total Orders',
                    value: String(overview.kpis.totalOrders),
                    sub: `${overview.kpis.activeOrders} active · ${overview.kpis.deliveredOrders} delivered`,
                    accent: 'text-[#0B1F3A]',
                  },
                  {
                    label: 'Verified Tailors',
                    value: `${overview.kpis.verifiedShops} / ${overview.kpis.totalTailors}`,
                    sub: `${overview.kpis.availableShops} currently open for pickup`,
                    accent: 'text-[#C8922A]',
                  },
                  {
                    label: 'Registered Customers',
                    value: String(overview.kpis.totalCustomers),
                    sub: `Collected: ₹${overview.kpis.collectedRevenue.toLocaleString('en-IN')}`,
                    accent: 'text-emerald-700',
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col justify-between"
                  >
                    <span className="text-xs font-semibold text-[#64748B]">{k.label}</span>
                    <span className={`text-2xl font-bold tabular-nums mt-2 ${k.accent}`}>
                      {k.value}
                    </span>
                    <span className="text-xs text-[#64748B] mt-1 tabular-nums">{k.sub}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Recent Orders */}
                <div className="xl:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                    <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                      Recent Platform Orders
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSection('orders')}
                      className="text-xs font-semibold text-[#0B7285] hover:underline cursor-pointer"
                    >
                      Manage All →
                    </button>
                  </div>
                  {overview.recentOrders.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#64748B]">
                      No orders placed yet. Orders created by customers appear here in real time.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Order</th>
                            <th className="px-4 py-3 font-semibold">Customer</th>
                            <th className="px-4 py-3 font-semibold">Tailor</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {overview.recentOrders.map((o) => (
                            <tr key={String(o.id)} className="hover:bg-[#F8FAFC]">
                              <td className="px-4 py-3 font-bold text-[#0B1F3A] tabular-nums">
                                {String(o.order_code)}
                                <span className="block font-normal text-[#64748B] truncate max-w-[180px]">
                                  {String(o.service_title)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[#334155]">{String(o.customer_name)}</td>
                              <td className="px-4 py-3 text-[#334155]">
                                {o.tailor_name ? String(o.tailor_name) : 'Unassigned'}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-semibold text-[#0B7285]">
                                  {String(o.status)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-[#0B1F3A] tabular-nums">
                                ₹{Number(o.total_amount).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Top Tailors */}
                <div className="xl:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                    <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                      Top Ateliers
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSection('tailors')}
                      className="text-xs font-semibold text-[#0B7285] hover:underline cursor-pointer"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="divide-y divide-[#F1F5F9]">
                    {overview.topTailors.length === 0 ? (
                      <p className="p-6 text-xs text-[#64748B] text-center">
                        No tailor partners registered yet.
                      </p>
                    ) : (
                      overview.topTailors.map((t) => (
                        <div key={String(t.id)} className="px-5 py-3.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#0B1F3A] truncate">
                              {String(t.shop_name)}
                            </p>
                            <p className="text-[11px] text-[#64748B] truncate">
                              {String(t.locality)} · {Number(t.order_count)} orders
                            </p>
                          </div>
                          <span className="text-xs font-bold text-[#0B7285] tabular-nums shrink-0">
                            ₹{Number(t.gross_volume).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. TAILOR PARTNERS */}
          {section === 'tailors' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                    Tailor Partners Directory ({tailors.length})
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Approve verification badges, toggle shop availability, and adjust commission rates.
                  </p>
                </div>
              </div>
              {tailors.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64748B]">
                  No tailor partners registered yet. Add a tailor via Users &amp; Roles or register from Sign Up.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Shop &amp; Master</th>
                        <th className="px-4 py-3 font-semibold">Locality</th>
                        <th className="px-4 py-3 font-semibold text-right">Orders / GMV</th>
                        <th className="px-4 py-3 font-semibold text-right">Commission %</th>
                        <th className="px-4 py-3 font-semibold">Verification &amp; Availability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {tailors.map((t) => {
                        const tid = Number(t.id);
                        return (
                          <tr key={tid} className="hover:bg-[#F8FAFC]">
                            <td className="px-4 py-3">
                              <p className="font-bold text-[#0B1F3A]">{String(t.shop_name)}</p>
                              <p className="text-[11px] text-[#64748B]">
                                {String(t.master_tailor)} · {String(t.email)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-[#334155]">{String(t.locality)}</td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              <span className="font-bold text-[#0B1F3A]">
                                {Number(t.total_orders)} orders
                              </span>
                              <span className="block text-[11px] text-[#0B7285]">
                                ₹{Number(t.total_gmv).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              <select
                                aria-label={`Commission rate for ${t.shop_name}`}
                                value={Number(t.commission_rate)}
                                disabled={busyId === `tailor-${tid}`}
                                onChange={(e) =>
                                  void handlePatchTailor(
                                    tid,
                                    { commissionRate: Number(e.target.value) },
                                    `Commission for ${t.shop_name} set to ${e.target.value}%.`,
                                  )
                                }
                                className="border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-semibold text-[#0B1F3A] bg-white"
                              >
                                {[8, 10, 12, 15, 18, 20].map((rate) => (
                                  <option key={rate} value={rate}>
                                    {rate}%
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  disabled={busyId === `tailor-${tid}`}
                                  onClick={() =>
                                    void handlePatchTailor(
                                      tid,
                                      { isVerified: !Boolean(t.is_verified) },
                                      Boolean(t.is_verified)
                                        ? `${t.shop_name} verification paused.`
                                        : `${t.shop_name} verified!`,
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                    Boolean(t.is_verified)
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : 'bg-amber-50 border-amber-200 text-amber-800'
                                  }`}
                                >
                                  {Boolean(t.is_verified) ? 'Verified ✓' : 'Verify Shop'}
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === `tailor-${tid}`}
                                  onClick={() =>
                                    void handlePatchTailor(
                                      tid,
                                      { isAvailable: !Boolean(t.is_available) },
                                      `Availability toggled for ${t.shop_name}.`,
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                                    Boolean(t.is_available)
                                      ? 'bg-[#F0F9FA] border-[#CBE7EC] text-[#0B7285]'
                                      : 'bg-slate-100 border-slate-200 text-slate-600'
                                  }`}
                                >
                                  {Boolean(t.is_available) ? 'Accepting Orders' : 'Paused'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3 & 4. CUSTOMERS & USERS / RBAC */}
          {(section === 'customers' || section === 'users') && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                  {section === 'customers' ? 'Customer Directory' : 'All Users & Role Control'} (
                  {users.length})
                </h2>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name, email, phone..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                  />
                </div>
              </div>
              {users.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64748B]">No matching users found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">User</th>
                        <th className="px-4 py-3 font-semibold">Locality</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold text-right">Orders / Spend</th>
                        <th className="px-4 py-3 font-semibold">Status &amp; Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {users.map((u) => {
                        const uid = Number(u.id);
                        const isSelf = uid === user.id;
                        return (
                          <tr key={uid} className="hover:bg-[#F8FAFC]">
                            <td className="px-4 py-3">
                              <p className="font-bold text-[#0B1F3A]">
                                {String(u.full_name)}{' '}
                                {isSelf && (
                                  <span className="text-[10px] font-bold text-[#0B7285]">(You)</span>
                                )}
                              </p>
                              <p className="text-[11px] text-[#64748B]">
                                {String(u.email)} {u.phone ? `· ${String(u.phone)}` : ''}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-[#334155]">{String(u.locality)}</td>
                            <td className="px-4 py-3">
                              {section === 'users' && !isSelf ? (
                                <select
                                  aria-label={`Role for ${u.full_name}`}
                                  value={String(u.role)}
                                  disabled={busyId === `role-${uid}`}
                                  onChange={(e) =>
                                    void handleChangeUserRole(
                                      uid,
                                      e.target.value as 'owner' | 'tailor' | 'customer',
                                    )
                                  }
                                  className="border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-semibold text-[#0B1F3A] capitalize bg-white"
                                >
                                  <option value="customer">customer</option>
                                  <option value="tailor">tailor</option>
                                  <option value="owner">owner</option>
                                </select>
                              ) : (
                                <span className="capitalize font-semibold text-[#0B1F3A]">
                                  {String(u.role)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              <span className="font-bold text-[#0B1F3A]">
                                {Number(u.order_count || 0)}
                              </span>
                              <span className="block text-[11px] text-[#64748B]">
                                ₹{Number(u.total_spent || 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {!isSelf ? (
                                <button
                                  type="button"
                                  disabled={busyId === `user-${uid}`}
                                  onClick={() => void handleToggleUserStatus(u)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                    u.status === 'active'
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700'
                                      : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-emerald-50 hover:text-emerald-800'
                                  }`}
                                >
                                  {u.status === 'active' ? 'Active (Suspend)' : 'Suspended (Activate)'}
                                </button>
                              ) : (
                                <span className="text-emerald-700 font-semibold">Active</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. SERVICES CATALOG CRUD */}
          {section === 'services' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                  Platform &amp; Tailor Services ({services.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Service Title</th>
                      <th className="px-4 py-3 font-semibold">Owner / Scope</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold text-right">Price &amp; SLA</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {services.map((s) => {
                      const sid = Number(s.id);
                      return (
                        <tr key={sid} className="hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3">
                            <p className="font-bold text-[#0B1F3A]">{String(s.title)}</p>
                            <p className="text-[11px] text-[#64748B] line-clamp-1">
                              {s.description ? String(s.description) : '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-[#334155]">
                            {s.tailor_shop_name ? String(s.tailor_shop_name) : 'Platform Master'}
                          </td>
                          <td className="px-4 py-3 capitalize font-semibold text-[#0B7285]">
                            {String(s.category)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className="font-bold text-[#0B1F3A]">
                              ₹{Number(s.base_price).toLocaleString('en-IN')}
                            </span>
                            <span className="block text-[11px] text-[#64748B]">
                              {Number(s.turnaround_days)} days
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                disabled={busyId === `svc-${sid}`}
                                onClick={() => void handleToggleService(s)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                  Boolean(s.is_active)
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-slate-100 border-slate-200 text-slate-600'
                                }`}
                              >
                                {Boolean(s.is_active) ? 'Active' : 'Inactive'}
                              </button>
                              <button
                                type="button"
                                disabled={busyId === `svc-del-${sid}`}
                                onClick={() => void handleDeleteService(sid)}
                                aria-label={`Delete ${s.title}`}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. ORDERS MANAGEMENT */}
          {section === 'orders' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                  All Orders ({orders.length})
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Order ID, customer, shop..."
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs text-[#0B1F3A]"
                    />
                  </div>
                  <select
                    aria-label="Filter orders by status"
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#0B1F3A] bg-white"
                  >
                    <option value="">All Statuses</option>
                    {ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {orders.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64748B]">
                  No orders match your filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Order &amp; Service</th>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Assigned Tailor</th>
                        <th className="px-4 py-3 font-semibold">Lifecycle Stage</th>
                        <th className="px-4 py-3 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {orders.map((o) => {
                        const oid = Number(o.id);
                        return (
                          <tr key={oid} className="hover:bg-[#F8FAFC]">
                            <td className="px-4 py-3">
                              <p className="font-bold text-[#0B1F3A] tabular-nums">
                                {String(o.order_code)}
                              </p>
                              <p className="text-[11px] text-[#64748B] truncate max-w-[200px]">
                                {String(o.service_title)}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[#0B1F3A]">{String(o.customer_name)}</p>
                              <p className="text-[11px] text-[#64748B]">{String(o.locality)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                aria-label={`Assign tailor for ${o.order_code}`}
                                value={o.tailor_id ? String(o.tailor_id) : ''}
                                disabled={busyId === `order-${oid}`}
                                onChange={(e) =>
                                  void handleUpdateOrder(oid, {
                                    tailorId: e.target.value ? Number(e.target.value) : null,
                                  })
                                }
                                className="border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs text-[#0B1F3A] bg-white max-w-[170px]"
                              >
                                <option value="">Unassigned Pool</option>
                                {tailors.map((t) => (
                                  <option key={String(t.id)} value={String(t.id)}>
                                    {String(t.shop_name)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                aria-label={`Order status for ${o.order_code}`}
                                value={String(o.status)}
                                disabled={busyId === `order-${oid}`}
                                onChange={(e) =>
                                  void handleUpdateOrder(oid, { status: e.target.value })
                                }
                                className="border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-semibold text-[#0B7285] bg-white"
                              >
                                {ORDER_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              <span className="font-bold text-[#0B1F3A]">
                                ₹{Number(o.total_amount).toLocaleString('en-IN')}
                              </span>
                              <span className="block text-[10.5px] uppercase font-semibold text-[#64748B]">
                                {String(o.payment_status)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 7. PAYMENTS & SETTLEMENTS */}
          {section === 'payments' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                  Payments &amp; Tailor Settlement Ledger ({payments.length})
                </h2>
                <select
                  aria-label="Filter payments"
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#0B1F3A] bg-white"
                >
                  <option value="">All Payments</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              {payments.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64748B]">
                  No payment records yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Payment / Order</th>
                        <th className="px-4 py-3 font-semibold">Customer &amp; Tailor</th>
                        <th className="px-4 py-3 font-semibold text-right">Amount / Fee / Payout</th>
                        <th className="px-4 py-3 font-semibold">Payment Status</th>
                        <th className="px-4 py-3 font-semibold">Tailor Settlement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {payments.map((p) => {
                        const pid = Number(p.id);
                        return (
                          <tr key={pid} className="hover:bg-[#F8FAFC]">
                            <td className="px-4 py-3 tabular-nums">
                              <p className="font-bold text-[#0B1F3A]">{String(p.payment_code)}</p>
                              <p className="text-[11px] text-[#64748B]">{String(p.order_code)}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[#0B1F3A]">{String(p.customer_name)}</p>
                              <p className="text-[11px] text-[#64748B]">
                                {p.tailor_shop_name ? String(p.tailor_shop_name) : 'Unassigned'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              <p className="font-bold text-[#0B1F3A]">
                                ₹{Number(p.amount).toLocaleString('en-IN')}
                              </p>
                              <p className="text-[11px] text-[#64748B]">
                                Fee ₹{Number(p.platform_fee).toLocaleString('en-IN')} · Payout ₹
                                {Number(p.tailor_earning).toLocaleString('en-IN')}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              {p.payment_status === 'pending' ? (
                                <button
                                  type="button"
                                  disabled={busyId === `pay-${pid}`}
                                  onClick={() =>
                                    void handleUpdatePayment(
                                      pid,
                                      { paymentStatus: 'completed' },
                                      `Marked ${p.payment_code} as completed.`,
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-[#0B7285] hover:bg-[#085463] text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Mark Collected
                                </button>
                              ) : (
                                <span
                                  className={`font-bold capitalize ${
                                    p.payment_status === 'completed'
                                      ? 'text-emerald-700'
                                      : 'text-rose-700'
                                  }`}
                                >
                                  {String(p.payment_status)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {p.payment_status === 'completed' && p.payout_status !== 'settled' ? (
                                <button
                                  type="button"
                                  disabled={busyId === `pay-${pid}`}
                                  onClick={() =>
                                    void handleUpdatePayment(
                                      pid,
                                      { payoutStatus: 'settled' },
                                      `Settled ₹${Number(p.tailor_earning).toLocaleString('en-IN')} to tailor.`,
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-[#0B1F3A] hover:bg-[#15325B] text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Settle Payout
                                </button>
                              ) : (
                                <span className="capitalize font-semibold text-[#475569]">
                                  {String(p.payout_status)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 8. REPORTS & ANALYTICS */}
          {section === 'reports' && reports && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
                  <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                    Revenue by Service Category
                  </h2>
                  {reports.byCategory.length === 0 ? (
                    <p className="text-xs text-[#64748B]">No order revenue recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {reports.byCategory.map((c) => {
                        const maxRev = Math.max(
                          ...reports.byCategory.map((x) => Number(x.revenue || 0)),
                          1,
                        );
                        const pct = Math.round((Number(c.revenue || 0) / maxRev) * 100);
                        return (
                          <div key={String(c.category)} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-[#0B1F3A] capitalize">
                                {String(c.category)} ({Number(c.order_count)} orders)
                              </span>
                              <span className="font-bold text-[#0B7285] tabular-nums">
                                ₹{Number(c.revenue).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                              <div
                                className="h-full bg-[#0B7285] rounded-full"
                                style={{ width: `${Math.max(pct, 6)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
                  <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                    Demand by Locality
                  </h2>
                  {reports.byLocality.length === 0 ? (
                    <p className="text-xs text-[#64748B]">No locality activity yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {reports.byLocality.map((loc) => (
                        <div
                          key={String(loc.locality)}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-[#F1F5F9] last:border-0"
                        >
                          <span className="font-semibold text-[#0B1F3A]">{String(loc.locality)}</span>
                          <span className="text-[#475569] tabular-nums">
                            {Number(loc.order_count)} orders ·{' '}
                            <strong className="text-[#0B7285]">
                              ₹{Number(loc.revenue).toLocaleString('en-IN')}
                            </strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E2E8F0]">
                  <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                    Tailor Partner Performance Leaderboard
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Atelier</th>
                        <th className="px-4 py-3 font-semibold">Locality</th>
                        <th className="px-4 py-3 font-semibold text-right">Orders</th>
                        <th className="px-4 py-3 font-semibold text-right">Delivered</th>
                        <th className="px-4 py-3 font-semibold text-right">Gross Volume</th>
                        <th className="px-4 py-3 font-semibold text-right">Platform Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {reports.tailorPerformance.map((tp) => (
                        <tr key={String(tp.id)}>
                          <td className="px-4 py-3 font-bold text-[#0B1F3A]">{String(tp.shop_name)}</td>
                          <td className="px-4 py-3 text-[#475569]">{String(tp.locality)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{Number(tp.total_orders)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {Number(tp.delivered_orders || 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#0B1F3A] tabular-nums">
                            ₹{Number(tp.gross_revenue).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#0B7285] tabular-nums">
                            ₹{Number(tp.commission_earned).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 9. PLATFORM SETTINGS */}
          {section === 'settings' && (
            <form
              onSubmit={handleSaveSettings}
              className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden max-w-3xl"
            >
              <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <h2 className="font-serif-accent text-base font-bold text-[#0B1F3A]">
                    Platform Configuration &amp; Business Rules
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Changes persist immediately to MySQL and govern order quotes, fees, and privacy.
                  </p>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#0B7285]" />
              </div>

              <div className="p-5 space-y-4">
                {settings.map((s) => {
                  const key = String(s.setting_key);
                  const val = settingsDraft[key] ?? String(s.setting_value);
                  const isBool = val === 'true' || val === 'false';
                  return (
                    <div
                      key={key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F1F5F9] last:border-0"
                    >
                      <div>
                        <label
                          htmlFor={`setting-${key}`}
                          className="block text-xs font-bold text-[#0B1F3A] font-mono"
                        >
                          {key}
                        </label>
                        <p className="text-[11px] text-[#64748B]">
                          {s.description ? String(s.description) : ''}
                        </p>
                      </div>
                      {isBool ? (
                        <select
                          id={`setting-${key}`}
                          value={val}
                          onChange={(e) =>
                            setSettingsDraft((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0B1F3A] bg-white sm:w-44"
                        >
                          <option value="true">Enabled (true)</option>
                          <option value="false">Disabled (false)</option>
                        </select>
                      ) : (
                        <input
                          id={`setting-${key}`}
                          type="text"
                          value={val}
                          onChange={(e) =>
                            setSettingsDraft((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0B1F3A] sm:w-64 focus:outline-none focus:border-[#0B7285]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end">
                <button
                  type="submit"
                  disabled={busyId === 'save-settings'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {busyId === 'save-settings' ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* CREATE USER MODAL */}
      {createUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F3A]/60 backdrop-blur-[2px]">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#0B1F3A] text-white flex items-center justify-between">
              <h3 className="font-serif-accent text-base font-bold">Create Platform User</h3>
              <button
                type="button"
                onClick={() => setCreateUserOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={newUserForm.fullName}
                onChange={(e) => setNewUserForm((f) => ({ ...f, fullName: e.target.value }))}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
              />
              <input
                type="email"
                required
                placeholder="Email Address"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
              />
              <input
                type="tel"
                placeholder="Mobile Number (optional)"
                value={newUserForm.phone}
                onChange={(e) => setNewUserForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Temporary Password (min 8 chars)"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
              />
              <select
                value={newUserForm.role}
                onChange={(e) =>
                  setNewUserForm((f) => ({
                    ...f,
                    role: e.target.value as 'owner' | 'tailor' | 'customer',
                  }))
                }
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A] bg-white"
              >
                <option value="tailor">Tailor Partner</option>
                <option value="customer">Customer</option>
                <option value="owner">App Owner</option>
              </select>
              {newUserForm.role === 'tailor' && (
                <input
                  type="text"
                  required
                  placeholder="Shop / Boutique Name"
                  value={newUserForm.shopName}
                  onChange={(e) => setNewUserForm((f) => ({ ...f, shopName: e.target.value }))}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                />
              )}
              <input
                type="text"
                required
                placeholder="Locality"
                value={newUserForm.locality}
                onChange={(e) => setNewUserForm((f) => ({ ...f, locality: e.target.value }))}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
              />
              <button
                type="submit"
                disabled={busyId === 'create-user'}
                className="w-full py-2.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white font-bold cursor-pointer"
              >
                {busyId === 'create-user' ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE SERVICE MODAL */}
      {createServiceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1F3A]/60 backdrop-blur-[2px]">
          <form
            onSubmit={handleCreateService}
            className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#0B1F3A] text-white flex items-center justify-between">
              <h3 className="font-serif-accent text-base font-bold">Add Master Catalog Service</h3>
              <button
                type="button"
                onClick={() => setCreateServiceOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Service Title (e.g. Bridal Zardosi Blouse)"
                value={newServiceForm.title}
                onChange={(e) => setNewServiceForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
              />
              <select
                value={newServiceForm.category}
                onChange={(e) =>
                  setNewServiceForm((f) => ({
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
                  placeholder="Base Price (₹)"
                  value={newServiceForm.basePrice}
                  onChange={(e) => setNewServiceForm((f) => ({ ...f, basePrice: e.target.value }))}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                />
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Turnaround Days"
                  value={newServiceForm.turnaroundDays}
                  onChange={(e) =>
                    setNewServiceForm((f) => ({ ...f, turnaroundDays: e.target.value }))
                  }
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
                />
              </div>
              <textarea
                rows={3}
                placeholder="Service details and inclusions..."
                value={newServiceForm.description}
                onChange={(e) => setNewServiceForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[#0B1F3A]"
              />
              <button
                type="submit"
                disabled={busyId === 'create-service'}
                className="w-full py-2.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white font-bold cursor-pointer"
              >
                {busyId === 'create-service' ? 'Saving...' : 'Create Service'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
};

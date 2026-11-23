import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  Package,
  Pencil,
  Plus,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { UserSession } from '../../types';
import {
  apiRequest,
  notificationApi,
  ownerTailorLogoApi,
  PaginationMeta,
} from '../../services/api';
import { DashboardNavItem, DashboardShell } from './DashboardShell';
import {
  CategoryThumbnail,
  DashboardSkeleton,
  MobileBottomSheetModal,
  PaginationBar,
} from './DashboardPrimitives';
import { SafeImage } from '../SafeImage';
import { ShopLogoUploader, TailorLogoBadge } from '../TailorLogoBadge';

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

  // Pagination state per active list
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  // Live DB Data State
  const [overview, setOverview] = useState<OwnerOverviewData | null>(null);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [tailors, setTailors] = useState<Record<string, unknown>[]>([]);
  const [allTailorsForSelect, setAllTailorsForSelect] = useState<Record<string, unknown>[]>([]);
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

  // Storefront Catalog State (Curated Designs & Doorstep Alterations)
  const [catalogTab, setCatalogTab] = useState<'designs' | 'alterations'>('designs');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [designs, setDesigns] = useState<Record<string, unknown>[]>([]);
  const [alterations, setAlterations] = useState<Record<string, unknown>[]>([]);

  // Search / Filter Controls
  const [userSearch, setUserSearch] = useState('');
  const [tailorSearch, setTailorSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
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

  // Create / Edit Service Modal
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [newServiceForm, setNewServiceForm] = useState({
    title: '',
    category: 'custom' as 'custom' | 'alteration' | 'uniform' | 'bridal' | 'menswear',
    description: '',
    basePrice: '999',
    turnaroundDays: '4',
  });

  // Edit Tailor Shop Modal & Inline Delete Confirm
  const [editingTailor, setEditingTailor] = useState<{
    id: number;
    shopName: string;
    masterTailor: string;
    locality: string;
    workingHours: string;
    experienceYears: string;
    homeVisitFee: string;
    turnaroundText: string;
    coverImageUrl: string;
    logoUrl: string;
    bio: string;
  } | null>(null);
  const [confirmDeleteTailorId, setConfirmDeleteTailorId] = useState<number | null>(null);

  // Add / Edit Curated Design Modal
  const [designModalOpen, setDesignModalOpen] = useState(false);
  const [editingDesignId, setEditingDesignId] = useState<number | null>(null);
  const [designForm, setDesignForm] = useState({
    title: '',
    category: 'Blouse Stitching',
    categoryId: 'blouse',
    gender: 'women' as 'women' | 'men',
    boutique: 'Tailering Master Atelier',
    price: '1299',
    originalPrice: '1599',
    imageUrl: '/src/assets/images/blouse-stitching.jpg',
    turnaroundDays: '5',
    description: '',
    fabricNote: '',
    isTrending: false,
    isActive: true,
  });

  // Add / Edit Alteration Service Modal
  const [alterationModalOpen, setAlterationModalOpen] = useState(false);
  const [editingAlterationId, setEditingAlterationId] = useState<number | null>(null);
  const [alterationForm, setAlterationForm] = useState({
    title: '',
    description: '',
    price: '149',
    unit: 'garment',
    badge: 'POPULAR',
    badgeColor: 'amber' as 'amber' | 'orange' | 'blue' | 'emerald' | 'rose' | 'purple',
    section: 'garment' as 'garment' | 'saree',
    iconType: 'waist' as
      | 'button'
      | 'tear'
      | 'waist'
      | 'length'
      | 'zip-small'
      | 'sleeve'
      | 'slim-fit'
      | 'zip-large'
      | 'jeans'
      | 'double-stitch'
      | 'saree-fall'
      | 'saree-pleat',
    isActive: true,
  });

  const [busyId, setBusyId] = useState<string | null>(null);

  const handleChangeSection = (nextSection: string) => {
    setSection(nextSection);
    setPage(1);
    setPagination(null);
  };

  const loadSectionData = useCallback(
    async (targetSection: string, targetPage = page, targetLimit = limit) => {
      setLoading(true);
      setError(null);
      try {
        const notifRes = await notificationApi
          .list(1, 5)
          .catch(() => ({ unreadCount: 0, notifications: [] }));
        setUnreadCount(notifRes.unreadCount);

        if (targetSection === 'overview') {
          const data = await apiRequest<OwnerOverviewData>('/api/owner/overview');
          setOverview(data);
          setPagination(null);
        } else if (targetSection === 'tailors') {
          const params = new URLSearchParams({
            page: String(targetPage),
            limit: String(targetLimit),
          });
          if (tailorSearch) params.set('q', tailorSearch);
          const data = await apiRequest<{
            tailors: Record<string, unknown>[];
            pagination?: PaginationMeta;
          }>(`/api/owner/tailors?${params}`);
          setTailors(data.tailors);
          setPagination(data.pagination ?? null);
        } else if (targetSection === 'customers') {
          const params = new URLSearchParams({
            role: 'customer',
            page: String(targetPage),
            limit: String(targetLimit),
          });
          if (userSearch) params.set('q', userSearch);
          const data = await apiRequest<{
            users: Record<string, unknown>[];
            pagination?: PaginationMeta;
          }>(`/api/owner/users?${params}`);
          setUsers(data.users);
          setPagination(data.pagination ?? null);
        } else if (targetSection === 'users') {
          const params = new URLSearchParams({
            page: String(targetPage),
            limit: String(targetLimit),
          });
          if (userSearch) params.set('q', userSearch);
          const data = await apiRequest<{
            users: Record<string, unknown>[];
            pagination?: PaginationMeta;
          }>(`/api/owner/users?${params}`);
          setUsers(data.users);
          setPagination(data.pagination ?? null);
        } else if (targetSection === 'services') {
          const params = new URLSearchParams({
            page: String(targetPage),
            limit: String(targetLimit),
          });
          if (serviceSearch) params.set('q', serviceSearch);
          const data = await apiRequest<{
            services: Record<string, unknown>[];
            pagination?: PaginationMeta;
          }>(`/api/owner/services?${params}`);
          setServices(data.services);
          setPagination(data.pagination ?? null);
        } else if (targetSection === 'orders') {
          const params = new URLSearchParams({
            page: String(targetPage),
            limit: String(targetLimit),
          });
          if (orderStatusFilter) params.set('status', orderStatusFilter);
          if (orderSearch) params.set('q', orderSearch);
          const [ordRes, tRes] = await Promise.all([
            apiRequest<{ orders: Record<string, unknown>[]; pagination?: PaginationMeta }>(
              `/api/owner/orders?${params}`,
            ),
            apiRequest<{ tailors: Record<string, unknown>[] }>('/api/owner/tailors?page=1&limit=50'),
          ]);
          setOrders(ordRes.orders);
          setPagination(ordRes.pagination ?? null);
          setAllTailorsForSelect(tRes.tailors);
        } else if (targetSection === 'payments') {
          const params = new URLSearchParams({
            page: String(targetPage),
            limit: String(targetLimit),
          });
          if (paymentStatusFilter) params.set('status', paymentStatusFilter);
          const data = await apiRequest<{
            payments: Record<string, unknown>[];
            pagination?: PaginationMeta;
          }>(`/api/owner/payments?${params}`);
          setPayments(data.payments);
          setPagination(data.pagination ?? null);
        } else if (targetSection === 'reports') {
          const data = await apiRequest<{
            byCategory: Record<string, unknown>[];
            byStatus: Record<string, unknown>[];
            byLocality: Record<string, unknown>[];
            tailorPerformance: Record<string, unknown>[];
          }>('/api/owner/reports');
          setReports(data);
          setPagination(null);
        } else if (targetSection === 'catalog') {
          const params = new URLSearchParams({
            page: String(targetPage),
            limit: String(targetLimit),
          });
          if (catalogSearch) params.set('q', catalogSearch);
          if (catalogTab === 'designs') {
            const data = await apiRequest<{
              designs: Record<string, unknown>[];
              pagination?: PaginationMeta;
            }>(`/api/owner/designs?${params}`);
            setDesigns(data.designs);
            setPagination(data.pagination ?? null);
          } else {
            const data = await apiRequest<{
              alterations: Record<string, unknown>[];
              pagination?: PaginationMeta;
            }>(`/api/owner/alterations?${params}`);
            setAlterations(data.alterations);
            setPagination(data.pagination ?? null);
          }
        } else if (targetSection === 'settings') {
          const data = await apiRequest<{ settings: Record<string, unknown>[] }>('/api/owner/settings');
          setSettings(data.settings);
          const draft: Record<string, string> = {};
          for (const s of data.settings) {
            draft[String(s.setting_key)] = String(s.setting_value);
          }
          setSettingsDraft(draft);
          setPagination(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data from MySQL.');
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      limit,
      userSearch,
      tailorSearch,
      serviceSearch,
      orderSearch,
      orderStatusFilter,
      paymentStatusFilter,
      catalogTab,
      catalogSearch,
    ],
  );

  useEffect(() => {
    void loadSectionData(section, page, limit);
  }, [section, page, limit, loadSectionData]);

  // First 4 items appear directly in Mobile Bottom Tab Bar; remaining live in the "More" sheet
  const navItems: DashboardNavItem[] = [
    { id: 'overview', label: 'Overview', shortLabel: 'Home', icon: LayoutDashboard },
    {
      id: 'orders',
      label: 'Orders',
      shortLabel: 'Orders',
      icon: Package,
      badge: overview?.kpis.activeOrders,
    },
    { id: 'tailors', label: 'Tailor Partners', shortLabel: 'Tailors', icon: Store },
    { id: 'payments', label: 'Payments & Payouts', shortLabel: 'Payments', icon: CreditCard },
    { id: 'catalog', label: 'Storefront Catalog', icon: Sparkles },
    { id: 'services', label: 'Services Catalog', icon: Scissors },
    { id: 'customers', label: 'Customers', icon: UserCheck },
    { id: 'users', label: 'Users & Roles', icon: Users },
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
      await loadSectionData(section, page, limit);
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
      await loadSectionData(section, page, limit);
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
      setPage(1);
      await loadSectionData(section, 1, limit);
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
      await loadSectionData('tailors', page, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Tailor update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveTailorEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTailor) return;
    setBusyId(`tailor-save-${editingTailor.id}`);
    try {
      await apiRequest(`/api/owner/tailors/${editingTailor.id}`, {
        method: 'PATCH',
        body: {
          shopName: editingTailor.shopName,
          masterTailor: editingTailor.masterTailor,
          locality: editingTailor.locality,
          workingHours: editingTailor.workingHours,
          experienceYears: Number(editingTailor.experienceYears) || 0,
          homeVisitFee: Number(editingTailor.homeVisitFee) || 0,
          turnaroundText: editingTailor.turnaroundText || '3–5 Days',
          coverImageUrl: editingTailor.coverImageUrl.trim(),
          bio: editingTailor.bio,
        },
      });
      onNotifyToast(`Updated "${editingTailor.shopName}" — live on storefront.`);
      setEditingTailor(null);
      await loadSectionData('tailors', page, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Failed to update tailor shop.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteTailor = async (tailorId: number, shopName: string) => {
    setBusyId(`tailor-del-${tailorId}`);
    try {
      await apiRequest(`/api/owner/tailors/${tailorId}`, { method: 'DELETE' });
      onNotifyToast(`Removed "${shopName}" from storefront.`);
      setConfirmDeleteTailorId(null);
      await loadSectionData('tailors', page, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not remove tailor.');
    } finally {
      setBusyId(null);
    }
  };

  const openAddServiceModal = () => {
    setEditingServiceId(null);
    setNewServiceForm({
      title: '',
      category: 'custom',
      description: '',
      basePrice: '999',
      turnaroundDays: '4',
    });
    setCreateServiceOpen(true);
  };

  const openEditServiceModal = (s: Record<string, unknown>) => {
    setEditingServiceId(Number(s.id));
    setNewServiceForm({
      title: String(s.title || ''),
      category: (String(s.category || 'custom') as
        | 'custom'
        | 'alteration'
        | 'uniform'
        | 'bridal'
        | 'menswear'),
      description: String(s.description || ''),
      basePrice: String(s.base_price ?? '999'),
      turnaroundDays: String(s.turnaround_days ?? '4'),
    });
    setCreateServiceOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('save-service');
    try {
      const payload = {
        title: newServiceForm.title,
        category: newServiceForm.category,
        description: newServiceForm.description,
        basePrice: Number(newServiceForm.basePrice),
        turnaroundDays: Number(newServiceForm.turnaroundDays),
        isActive: true,
      };
      if (editingServiceId) {
        await apiRequest(`/api/owner/services/${editingServiceId}`, {
          method: 'PATCH',
          body: payload,
        });
        onNotifyToast(`Service "${newServiceForm.title}" updated.`);
      } else {
        await apiRequest('/api/owner/services', {
          method: 'POST',
          body: payload,
        });
        onNotifyToast(`Service "${newServiceForm.title}" added.`);
      }
      setCreateServiceOpen(false);
      setEditingServiceId(null);
      setNewServiceForm({
        title: '',
        category: 'custom',
        description: '',
        basePrice: '999',
        turnaroundDays: '4',
      });
      await loadSectionData('services', editingServiceId ? page : 1, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Could not save service.');
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
      await loadSectionData('services', page, limit);
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
      await loadSectionData('services', page, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  // Storefront Curated Designs CRUD
  const openAddDesignModal = () => {
    setEditingDesignId(null);
    setDesignForm({
      title: '',
      category: 'Blouse Stitching',
      categoryId: 'blouse',
      gender: 'women',
      boutique: 'Tailering Master Atelier',
      price: '1299',
      originalPrice: '1599',
      imageUrl: '/src/assets/images/blouse-stitching.jpg',
      turnaroundDays: '5',
      description: '',
      fabricNote: '',
      isTrending: false,
      isActive: true,
    });
    setDesignModalOpen(true);
  };

  const openEditDesignModal = (d: Record<string, unknown>) => {
    setEditingDesignId(Number(d.id));
    setDesignForm({
      title: String(d.title || ''),
      category: String(d.category || 'Blouse Stitching'),
      categoryId: String(d.category_id || 'blouse'),
      gender: d.gender === 'men' ? 'men' : 'women',
      boutique: String(d.boutique || 'Tailering Master Atelier'),
      price: String(d.price ?? '1299'),
      originalPrice: d.original_price ? String(d.original_price) : '',
      imageUrl: String(d.image_url || '/src/assets/images/blouse-stitching.jpg'),
      turnaroundDays: String(d.turnaround_days ?? '5'),
      description: String(d.description || ''),
      fabricNote: String(d.fabric_note || ''),
      isTrending: Boolean(d.is_trending),
      isActive: Boolean(d.is_active),
    });
    setDesignModalOpen(true);
  };

  const handleSaveDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('save-design');
    try {
      const payload = {
        title: designForm.title,
        category: designForm.category,
        categoryId: designForm.categoryId,
        gender: designForm.gender,
        boutique: designForm.boutique,
        price: Number(designForm.price),
        originalPrice: designForm.originalPrice ? Number(designForm.originalPrice) : null,
        imageUrl: designForm.imageUrl.trim(),
        turnaroundDays: Number(designForm.turnaroundDays) || 5,
        description: designForm.description,
        fabricNote: designForm.fabricNote,
        isTrending: designForm.isTrending,
        isActive: designForm.isActive,
      };
      if (editingDesignId) {
        await apiRequest(`/api/owner/designs/${editingDesignId}`, {
          method: 'PATCH',
          body: payload,
        });
        onNotifyToast(`Updated design "${designForm.title}" on storefront.`);
      } else {
        await apiRequest('/api/owner/designs', { method: 'POST', body: payload });
        onNotifyToast(`Added design "${designForm.title}" to storefront.`);
      }
      setDesignModalOpen(false);
      setEditingDesignId(null);
      await loadSectionData('catalog', editingDesignId ? page : 1, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Failed to save design.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleDesignActive = async (d: Record<string, unknown>) => {
    setBusyId(`des-${d.id}`);
    try {
      await apiRequest(`/api/owner/designs/${d.id}`, {
        method: 'PATCH',
        body: { isActive: !Boolean(d.is_active) },
      });
      onNotifyToast(`Updated visibility for "${d.title}".`);
      await loadSectionData('catalog', page, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteDesign = async (id: number) => {
    setBusyId(`des-del-${id}`);
    try {
      await apiRequest(`/api/owner/designs/${id}`, { method: 'DELETE' });
      onNotifyToast('Design removed from storefront.');
      await loadSectionData('catalog', page, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  // Storefront Doorstep Alterations CRUD
  const openAddAlterationModal = () => {
    setEditingAlterationId(null);
    setAlterationForm({
      title: '',
      description: '',
      price: '149',
      unit: 'garment',
      badge: 'POPULAR',
      badgeColor: 'amber',
      section: 'garment',
      iconType: 'waist',
      isActive: true,
    });
    setAlterationModalOpen(true);
  };

  const openEditAlterationModal = (a: Record<string, unknown>) => {
    setEditingAlterationId(Number(a.id));
    setAlterationForm({
      title: String(a.title || ''),
      description: String(a.description || ''),
      price: String(a.price ?? '149'),
      unit: String(a.unit || 'garment'),
      badge: String(a.badge || 'POPULAR'),
      badgeColor: (String(a.badge_color || 'amber') as
        | 'amber'
        | 'orange'
        | 'blue'
        | 'emerald'
        | 'rose'
        | 'purple'),
      section: a.section === 'saree' ? 'saree' : 'garment',
      iconType: (String(a.icon_type || 'waist') as typeof alterationForm.iconType),
      isActive: Boolean(a.is_active),
    });
    setAlterationModalOpen(true);
  };

  const handleSaveAlteration = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('save-alt');
    try {
      const payload = {
        title: alterationForm.title,
        description: alterationForm.description,
        price: Number(alterationForm.price),
        unit: alterationForm.unit,
        badge: alterationForm.badge,
        badgeColor: alterationForm.badgeColor,
        section: alterationForm.section,
        iconType: alterationForm.iconType,
        isActive: alterationForm.isActive,
      };
      if (editingAlterationId) {
        await apiRequest(`/api/owner/alterations/${editingAlterationId}`, {
          method: 'PATCH',
          body: payload,
        });
        onNotifyToast(`Updated alteration "${alterationForm.title}".`);
      } else {
        await apiRequest('/api/owner/alterations', { method: 'POST', body: payload });
        onNotifyToast(`Added alteration "${alterationForm.title}".`);
      }
      setAlterationModalOpen(false);
      setEditingAlterationId(null);
      await loadSectionData('catalog', editingAlterationId ? page : 1, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Failed to save alteration.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleAlterationActive = async (a: Record<string, unknown>) => {
    setBusyId(`alt-${a.id}`);
    try {
      await apiRequest(`/api/owner/alterations/${a.id}`, {
        method: 'PATCH',
        body: { isActive: !Boolean(a.is_active) },
      });
      onNotifyToast(`Updated visibility for "${a.title}".`);
      await loadSectionData('catalog', page, limit);
    } catch (err) {
      onNotifyToast(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteAlteration = async (id: number) => {
    setBusyId(`alt-del-${id}`);
    try {
      await apiRequest(`/api/owner/alterations/${id}`, { method: 'DELETE' });
      onNotifyToast('Alteration service removed.');
      await loadSectionData('catalog', page, limit);
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
      await loadSectionData('orders', page, limit);
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
      await loadSectionData('payments', page, limit);
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
      await loadSectionData('settings', 1, limit);
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
      onSelectSection={handleChangeSection}
      unreadNotifications={unreadCount}
      onRefresh={() => void loadSectionData(section, page, limit)}
      refreshing={loading}
      onBackToStorefront={onBackToStorefront}
      onLogout={onLogout}
      headerAction={
        section === 'users' || section === 'customers' ? (
          <button
            type="button"
            onClick={() => setCreateUserOpen(true)}
            className="min-h-[44px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-3 sm:px-3.5 rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#C4B5FD]" />
            <span className="hidden xs:inline sm:inline">Add User</span>
          </button>
        ) : section === 'services' ? (
          <button
            type="button"
            onClick={openAddServiceModal}
            className="min-h-[44px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-3 sm:px-3.5 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">Add Service</span>
          </button>
        ) : section === 'catalog' ? (
          <button
            type="button"
            onClick={catalogTab === 'designs' ? openAddDesignModal : openAddAlterationModal}
            className="min-h-[44px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-3 sm:px-3.5 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">
              {catalogTab === 'designs' ? 'Add Design' : 'Add Alteration'}
            </span>
          </button>
        ) : null
      }
    >
      {error && (
        <div className="mb-4 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-800 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadSectionData(section, page, limit)}
            className="min-h-[36px] px-3 rounded-lg bg-white border border-rose-200 text-xs font-bold cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* 1. OVERVIEW */}
          {section === 'overview' && overview && (
            <div className="space-y-5">
              {/* Mobile 2-column compact KPI grid -> Desktop 4-column */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {[
                  {
                    label: 'Platform GMV',
                    value: `₹${overview.kpis.totalGmv.toLocaleString('en-IN')}`,
                    sub: `Fee: ₹${overview.kpis.totalCommission.toLocaleString('en-IN')}`,
                    accent: 'text-[#6B21D9]',
                  },
                  {
                    label: 'Total Orders',
                    value: String(overview.kpis.totalOrders),
                    sub: `${overview.kpis.activeOrders} active · ${overview.kpis.deliveredOrders} done`,
                    accent: 'text-[#1A103D]',
                  },
                  {
                    label: 'Verified Tailors',
                    value: `${overview.kpis.verifiedShops}/${overview.kpis.totalTailors}`,
                    sub: `${overview.kpis.availableShops} open now`,
                    accent: 'text-[#C8922A]',
                  },
                  {
                    label: 'Customers',
                    value: String(overview.kpis.totalCustomers),
                    sub: `Paid: ₹${overview.kpis.collectedRevenue.toLocaleString('en-IN')}`,
                    accent: 'text-emerald-700',
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="bg-white rounded-2xl border border-[#EAE0FA] p-4 sm:p-5 flex flex-col justify-between"
                  >
                    <span className="text-[11px] sm:text-xs font-semibold text-[#64748B] truncate">
                      {k.label}
                    </span>
                    <span className={`text-xl sm:text-2xl font-bold tabular-nums mt-1.5 ${k.accent}`}>
                      {k.value}
                    </span>
                    <span className="text-[11px] text-[#64748B] mt-1 tabular-nums truncate">
                      {k.sub}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                {/* Recent Orders: Mobile Cards + Desktop Table */}
                <div className="xl:col-span-8 bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
                  <div className="px-4 sm:px-5 py-3.5 border-b border-[#EAE0FA] flex items-center justify-between gap-2">
                    <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                      Recent Platform Orders
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleChangeSection('orders')}
                      className="min-h-[36px] px-2.5 text-xs font-semibold text-[#6B21D9] hover:underline cursor-pointer whitespace-nowrap"
                    >
                      Manage All →
                    </button>
                  </div>
                  {overview.recentOrders.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#64748B]">
                      No orders placed yet. Orders created by customers appear here in real time.
                    </div>
                  ) : (
                    <>
                      {/* Mobile Cards */}
                      <div className="md:hidden divide-y divide-[#F1F5F9]">
                        {overview.recentOrders.map((o) => (
                          <div key={String(o.id)} className="p-4 flex items-start gap-3">
                            <CategoryThumbnail
                              category={String(o.order_type || 'custom')}
                              alt={String(o.service_title)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-bold text-[#1A103D] tabular-nums">
                                  {String(o.order_code)}
                                </p>
                                <span className="text-xs font-bold text-[#1A103D] tabular-nums shrink-0">
                                  ₹{Number(o.total_amount).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-[#334155] truncate mt-0.5">
                                {String(o.service_title)}
                              </p>
                              <p className="text-[11px] text-[#64748B] mt-1 truncate">
                                {String(o.customer_name)} ·{' '}
                                {o.tailor_name ? String(o.tailor_name) : 'Unassigned'}
                              </p>
                              <p className="text-[11px] font-semibold text-[#6B21D9] mt-1">
                                {String(o.status)}
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
                              <th className="px-4 py-3 font-semibold">Tailor</th>
                              <th className="px-4 py-3 font-semibold">Status</th>
                              <th className="px-4 py-3 font-semibold text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {overview.recentOrders.map((o) => (
                              <tr key={String(o.id)} className="hover:bg-[#FAF8FF]">
                                <td className="px-4 py-3 font-bold text-[#1A103D] tabular-nums">
                                  {String(o.order_code)}
                                  <span className="block font-normal text-[#64748B] truncate max-w-[180px]">
                                    {String(o.service_title)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[#334155]">{String(o.customer_name)}</td>
                                <td className="px-4 py-3 text-[#334155]">
                                  {o.tailor_name ? String(o.tailor_name) : 'Unassigned'}
                                </td>
                                <td className="px-4 py-3 font-semibold text-[#6B21D9]">
                                  {String(o.status)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-[#1A103D] tabular-nums">
                                  ₹{Number(o.total_amount).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* Top Tailors with Lazy-Loaded Shop Thumbnails */}
                <div className="xl:col-span-4 bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
                  <div className="px-4 sm:px-5 py-3.5 border-b border-[#EAE0FA] flex items-center justify-between">
                    <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                      Top Ateliers
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleChangeSection('tailors')}
                      className="min-h-[36px] px-2 text-xs font-semibold text-[#6B21D9] hover:underline cursor-pointer"
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
                        <div
                          key={String(t.id)}
                          className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <TailorLogoBadge
                              logoUrl={String(t.logo_url || '') || undefined}
                              shopName={String(t.shop_name)}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#1A103D] truncate">
                                {String(t.shop_name)}
                              </p>
                              <p className="text-[11px] text-[#64748B] truncate">
                                {String(t.locality)} · {Number(t.order_count)} orders
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#6B21D9] tabular-nums shrink-0">
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

          {/* 2. TAILOR PARTNERS (Mobile Cards + Desktop Table + Search + Pagination) */}
          {section === 'tailors' && (
            <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                    Tailor Partners Directory ({pagination?.total ?? tailors.length})
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Verify shops, pause intake, and set commission rates.
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tailorSearch}
                    onChange={(e) => {
                      setTailorSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search shop, master, locality..."
                    className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-[#CBD5E1] text-xs text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                  />
                </div>
              </div>

              {tailors.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64748B]">
                  No tailor partners match your filter.
                </div>
              ) : (
                <>
                  {/* Mobile Card List */}
                  <div className="md:hidden divide-y divide-[#F1F5F9]">
                    {tailors.map((t) => {
                      const tid = Number(t.id);
                      const isConfirmDel = confirmDeleteTailorId === tid;
                      return (
                        <div key={tid} className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <TailorLogoBadge
                              logoUrl={String(t.logo_url || '') || undefined}
                              shopName={String(t.shop_name)}
                              size="md"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[#1A103D] truncate">
                                {String(t.shop_name)}
                              </p>
                              <p className="text-xs text-[#64748B] truncate">
                                {String(t.master_tailor)} · {String(t.locality)}
                              </p>
                              <p className="text-[11px] text-[#6B21D9] font-semibold mt-1 tabular-nums">
                                {Number(t.total_orders)} orders · GMV ₹
                                {Number(t.total_gmv).toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
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
                              className="min-h-[44px] border border-[#CBD5E1] rounded-xl px-2 text-xs font-bold text-[#1A103D] bg-white"
                            >
                              {[8, 10, 12, 15, 18, 20].map((rate) => (
                                <option key={rate} value={rate}>
                                  Fee {rate}%
                                </option>
                              ))}
                            </select>

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
                              className={`min-h-[44px] px-2 rounded-xl text-xs font-bold border cursor-pointer ${
                                Boolean(t.is_verified)
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : 'bg-amber-50 border-amber-200 text-amber-800'
                              }`}
                            >
                              {Boolean(t.is_verified) ? 'Verified ✓' : 'Verify'}
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
                              className={`min-h-[44px] px-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                                Boolean(t.is_available)
                                  ? 'bg-[#F4EEFF] border-[#DCD0F5] text-[#6B21D9]'
                                  : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}
                            >
                              {Boolean(t.is_available) ? 'Open' : 'Paused'}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingTailor({
                                  id: tid,
                                  shopName: String(t.shop_name || ''),
                                  masterTailor: String(t.master_tailor || ''),
                                  locality: String(t.locality || ''),
                                  workingHours: String(t.working_hours || '10:00 AM – 8:30 PM'),
                                  experienceYears: String(t.experience_years ?? 5),
                                  homeVisitFee: String(t.home_visit_fee ?? 0),
                                  turnaroundText: String(t.turnaround_text || '3–5 Days'),
                                  coverImageUrl: String(t.cover_image_url || ''),
                                  logoUrl: String(t.logo_url || ''),
                                  bio: String(t.bio || ''),
                                })
                              }
                              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DCD0F5] bg-[#F4EEFF] text-[#6B21D9] text-xs font-bold cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit Shop Details
                            </button>
                            {isConfirmDel ? (
                              <button
                                type="button"
                                disabled={busyId === `tailor-del-${tid}`}
                                onClick={() => void handleDeleteTailor(tid, String(t.shop_name))}
                                className="min-h-[44px] px-3 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                              >
                                Confirm?
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTailorId(tid)}
                                aria-label={`Remove ${t.shop_name}`}
                                className="min-h-[44px] min-w-[44px] rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8FF] border-b border-[#EAE0FA] text-[#64748B]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Shop &amp; Master</th>
                          <th className="px-4 py-3 font-semibold">Locality</th>
                          <th className="px-4 py-3 font-semibold text-right">Orders / GMV</th>
                          <th className="px-4 py-3 font-semibold text-right">Commission %</th>
                          <th className="px-4 py-3 font-semibold">Verification &amp; Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {tailors.map((t) => {
                          const tid = Number(t.id);
                          const isConfirmDel = confirmDeleteTailorId === tid;
                          return (
                            <tr key={tid} className="hover:bg-[#FAF8FF]">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <TailorLogoBadge
                                    logoUrl={String(t.logo_url || '') || undefined}
                                    shopName={String(t.shop_name)}
                                    size="sm"
                                  />
                                  <div>
                                    <p className="font-bold text-[#1A103D]">{String(t.shop_name)}</p>
                                    <p className="text-[11px] text-[#64748B]">
                                      {String(t.master_tailor)} · {String(t.email)}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[#334155]">{String(t.locality)}</td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                <span className="font-bold text-[#1A103D]">
                                  {Number(t.total_orders)} orders
                                </span>
                                <span className="block text-[11px] text-[#6B21D9]">
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
                                  className="min-h-[36px] border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-semibold text-[#1A103D] bg-white"
                                >
                                  {[8, 10, 12, 15, 18, 20].map((rate) => (
                                    <option key={rate} value={rate}>
                                      {rate}%
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap items-center gap-1.5">
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
                                    className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
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
                                    className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                                      Boolean(t.is_available)
                                        ? 'bg-[#F4EEFF] border-[#DCD0F5] text-[#6B21D9]'
                                        : 'bg-slate-100 border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {Boolean(t.is_available) ? 'Accepting' : 'Paused'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingTailor({
                                        id: tid,
                                        shopName: String(t.shop_name || ''),
                                        masterTailor: String(t.master_tailor || ''),
                                        locality: String(t.locality || ''),
                                        workingHours: String(t.working_hours || '10:00 AM – 8:30 PM'),
                                        experienceYears: String(t.experience_years ?? 5),
                                        homeVisitFee: String(t.home_visit_fee ?? 0),
                                        turnaroundText: String(t.turnaround_text || '3–5 Days'),
                                        coverImageUrl: String(t.cover_image_url || ''),
                                        logoUrl: String(t.logo_url || ''),
                                        bio: String(t.bio || ''),
                                      })
                                    }
                                    aria-label={`Edit ${t.shop_name}`}
                                    className="min-h-[36px] min-w-[36px] rounded-lg text-[#6B21D9] hover:bg-[#F4EEFF] inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  {isConfirmDel ? (
                                    <button
                                      type="button"
                                      disabled={busyId === `tailor-del-${tid}`}
                                      onClick={() => void handleDeleteTailor(tid, String(t.shop_name))}
                                      className="min-h-[36px] px-2.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                                    >
                                      Confirm Remove
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteTailorId(tid)}
                                      aria-label={`Remove ${t.shop_name}`}
                                      className="min-h-[36px] min-w-[36px] rounded-lg text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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
                itemLabel="tailors"
              />
            </div>
          )}

          {/* 3 & 4. CUSTOMERS & USERS / RBAC (Mobile Cards + Desktop Table + Pagination) */}
          {(section === 'customers' || section === 'users') && (
            <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                  {section === 'customers' ? 'Customer Directory' : 'All Users & Role Control'} (
                  {pagination?.total ?? users.length})
                </h2>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search name, email, phone..."
                    className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-[#CBD5E1] text-xs text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                  />
                </div>
              </div>

              {users.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64748B]">No matching users found.</div>
              ) : (
                <>
                  {/* Mobile User Cards */}
                  <div className="md:hidden divide-y divide-[#F1F5F9]">
                    {users.map((u) => {
                      const uid = Number(u.id);
                      const isSelf = uid === user.id;
                      return (
                        <div key={uid} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#1A103D] truncate">
                                {String(u.full_name)}{' '}
                                {isSelf && (
                                  <span className="text-[11px] font-bold text-[#6B21D9]">(You)</span>
                                )}
                              </p>
                              <p className="text-xs text-[#64748B] truncate">
                                {String(u.email)} {u.phone ? `· ${String(u.phone)}` : ''}
                              </p>
                              <p className="text-[11px] text-[#475569] mt-0.5 truncate">
                                {String(u.locality)} · {Number(u.order_count || 0)} orders · ₹
                                {Number(u.total_spent || 0).toLocaleString('en-IN')}
                              </p>
                            </div>
                            <span className="text-xs font-bold capitalize text-[#6B21D9] shrink-0">
                              {String(u.role)}
                            </span>
                          </div>

                          {!isSelf && (
                            <div className="grid grid-cols-2 gap-2">
                              {section === 'users' && (
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
                                  className="min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-xs font-semibold text-[#1A103D] capitalize bg-white"
                                >
                                  <option value="customer">Customer</option>
                                  <option value="tailor">Tailor</option>
                                  <option value="owner">Owner</option>
                                </select>
                              )}
                              <button
                                type="button"
                                disabled={busyId === `user-${uid}`}
                                onClick={() => void handleToggleUserStatus(u)}
                                className={`min-h-[44px] px-3 rounded-xl text-xs font-bold border cursor-pointer ${
                                  section !== 'users' ? 'col-span-2' : ''
                                } ${
                                  u.status === 'active'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-rose-50 border-rose-200 text-rose-700'
                                }`}
                              >
                                {u.status === 'active' ? 'Active (Suspend)' : 'Suspended (Activate)'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8FF] border-b border-[#EAE0FA] text-[#64748B]">
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
                            <tr key={uid} className="hover:bg-[#FAF8FF]">
                              <td className="px-4 py-3">
                                <p className="font-bold text-[#1A103D]">
                                  {String(u.full_name)}{' '}
                                  {isSelf && (
                                    <span className="text-[10px] font-bold text-[#6B21D9]">(You)</span>
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
                                    className="min-h-[36px] border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-semibold text-[#1A103D] capitalize bg-white"
                                  >
                                    <option value="customer">customer</option>
                                    <option value="tailor">tailor</option>
                                    <option value="owner">owner</option>
                                  </select>
                                ) : (
                                  <span className="capitalize font-semibold text-[#1A103D]">
                                    {String(u.role)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                <span className="font-bold text-[#1A103D]">
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
                                    className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                      u.status === 'active'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700'
                                        : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-emerald-50 hover:text-emerald-800'
                                    }`}
                                  >
                                    {u.status === 'active'
                                      ? 'Active (Suspend)'
                                      : 'Suspended (Activate)'}
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
                </>
              )}

              <PaginationBar
                pagination={pagination}
                onPageChange={setPage}
                onLimitChange={(n) => {
                  setLimit(n);
                  setPage(1);
                }}
                itemLabel="users"
              />
            </div>
          )}

          {/* 5. SERVICES CATALOG CRUD (Mobile Cards + Desktop Table + Pagination) */}
          {section === 'services' && (
            <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                  Platform &amp; Tailor Services ({pagination?.total ?? services.length})
                </h2>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={serviceSearch}
                    onChange={(e) => {
                      setServiceSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search service title or shop..."
                    className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-[#CBD5E1] text-xs text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                  />
                </div>
              </div>

              {services.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64748B]">No services found.</div>
              ) : (
                <>
                  {/* Mobile Service Cards */}
                  <div className="md:hidden divide-y divide-[#F1F5F9]">
                    {services.map((s) => {
                      const sid = Number(s.id);
                      return (
                        <div key={sid} className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <CategoryThumbnail
                              category={String(s.category)}
                              alt={String(s.title)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-bold text-[#1A103D] truncate">
                                  {String(s.title)}
                                </p>
                                <span className="text-sm font-bold text-[#1A103D] tabular-nums shrink-0">
                                  ₹{Number(s.base_price).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#64748B] mt-0.5">
                                <span className="capitalize font-semibold text-[#6B21D9]">
                                  {String(s.category)}
                                </span>{' '}
                                · {Number(s.turnaround_days)}d SLA ·{' '}
                                {s.tailor_shop_name ? String(s.tailor_shop_name) : 'Platform Master'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              disabled={busyId === `svc-${sid}`}
                              onClick={() => void handleToggleService(s)}
                              className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold border cursor-pointer ${
                                Boolean(s.is_active)
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}
                            >
                              {Boolean(s.is_active) ? 'Active · Tap to Disable' : 'Inactive · Tap to Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditServiceModal(s)}
                              aria-label={`Edit ${s.title}`}
                              className="min-h-[44px] min-w-[44px] rounded-xl border border-[#DCD0F5] text-[#6B21D9] hover:bg-[#F4EEFF] inline-flex items-center justify-center cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={busyId === `svc-del-${sid}`}
                              onClick={() => void handleDeleteService(sid)}
                              aria-label={`Delete ${s.title}`}
                              className="min-h-[44px] min-w-[44px] rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8FF] border-b border-[#EAE0FA] text-[#64748B]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Service</th>
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
                            <tr key={sid} className="hover:bg-[#FAF8FF]">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <CategoryThumbnail
                                    category={String(s.category)}
                                    alt={String(s.title)}
                                  />
                                  <div className="min-w-0">
                                    <p className="font-bold text-[#1A103D]">{String(s.title)}</p>
                                    <p className="text-[11px] text-[#64748B] line-clamp-1">
                                      {s.description ? String(s.description) : '—'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[#334155]">
                                {s.tailor_shop_name ? String(s.tailor_shop_name) : 'Platform Master'}
                              </td>
                              <td className="px-4 py-3 capitalize font-semibold text-[#6B21D9]">
                                {String(s.category)}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                <span className="font-bold text-[#1A103D]">
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
                                    className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                      Boolean(s.is_active)
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : 'bg-slate-100 border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {Boolean(s.is_active) ? 'Active' : 'Inactive'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditServiceModal(s)}
                                    aria-label={`Edit ${s.title}`}
                                    className="min-h-[36px] min-w-[36px] rounded-lg text-[#6B21D9] hover:bg-[#F4EEFF] inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busyId === `svc-del-${sid}`}
                                    onClick={() => void handleDeleteService(sid)}
                                    aria-label={`Delete ${s.title}`}
                                    className="min-h-[36px] min-w-[36px] rounded-lg text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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
                itemLabel="services"
              />
            </div>
          )}

          {/* 6. ORDERS MANAGEMENT (Mobile Cards + Desktop Table + Pagination) */}
          {section === 'orders' && (
            <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                  All Orders ({pagination?.total ?? orders.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-auto">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => {
                        setOrderSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Order ID, customer, shop..."
                      className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-[#CBD5E1] text-xs text-[#1A103D]"
                    />
                  </div>
                  <select
                    aria-label="Filter orders by status"
                    value={orderStatusFilter}
                    onChange={(e) => {
                      setOrderStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-xs font-semibold text-[#1A103D] bg-white"
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
                <>
                  {/* Mobile Order Cards */}
                  <div className="md:hidden divide-y divide-[#F1F5F9]">
                    {orders.map((o) => {
                      const oid = Number(o.id);
                      return (
                        <div key={oid} className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <CategoryThumbnail
                              category={String(o.order_type || 'custom')}
                              alt={String(o.service_title)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-bold text-[#1A103D] tabular-nums">
                                  {String(o.order_code)}
                                </p>
                                <span className="text-sm font-bold text-[#1A103D] tabular-nums">
                                  ₹{Number(o.total_amount).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-[#334155] truncate mt-0.5">
                                {String(o.service_title)}
                              </p>
                              <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
                                {String(o.customer_name)} · Payment:{' '}
                                <span className="capitalize font-semibold">
                                  {String(o.payment_status)}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              aria-label={`Assign tailor for ${o.order_code}`}
                              value={o.tailor_id ? String(o.tailor_id) : ''}
                              disabled={busyId === `order-${oid}`}
                              onChange={(e) =>
                                void handleUpdateOrder(oid, {
                                  tailorId: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-xs font-semibold text-[#1A103D] bg-white"
                            >
                              <option value="">Unassigned (Open Pool)</option>
                              {allTailorsForSelect.map((t) => (
                                <option key={String(t.id)} value={String(t.id)}>
                                  {String(t.shop_name)}
                                </option>
                              ))}
                            </select>

                            <select
                              aria-label={`Lifecycle stage for ${o.order_code}`}
                              value={String(o.status)}
                              disabled={busyId === `order-${oid}`}
                              onChange={(e) =>
                                void handleUpdateOrder(oid, { status: e.target.value })
                              }
                              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-xs font-semibold text-[#6B21D9] bg-white"
                            >
                              {ORDER_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8FF] border-b border-[#EAE0FA] text-[#64748B]">
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
                            <tr key={oid} className="hover:bg-[#FAF8FF]">
                              <td className="px-4 py-3">
                                <p className="font-bold text-[#1A103D] tabular-nums">
                                  {String(o.order_code)}
                                </p>
                                <p className="text-[11px] text-[#64748B] truncate max-w-[200px]">
                                  {String(o.service_title)}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-[#1A103D]">
                                  {String(o.customer_name)}
                                </p>
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
                                  className="min-h-[36px] border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-semibold text-[#1A103D] bg-white"
                                >
                                  <option value="">Unassigned</option>
                                  {allTailorsForSelect.map((t) => (
                                    <option key={String(t.id)} value={String(t.id)}>
                                      {String(t.shop_name)}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  aria-label={`Status for ${o.order_code}`}
                                  value={String(o.status)}
                                  disabled={busyId === `order-${oid}`}
                                  onChange={(e) =>
                                    void handleUpdateOrder(oid, { status: e.target.value })
                                  }
                                  className="min-h-[36px] border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-semibold text-[#6B21D9] bg-white"
                                >
                                  {ORDER_STATUSES.map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                <span className="font-bold text-[#1A103D]">
                                  ₹{Number(o.total_amount).toLocaleString('en-IN')}
                                </span>
                                <span className="block text-[10.5px] capitalize font-semibold text-[#64748B]">
                                  {String(o.payment_status)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
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
                itemLabel="orders"
              />
            </div>
          )}

          {/* 7. PAYMENTS & SETTLEMENTS (Mobile Cards + Desktop Table + Pagination) */}
          {section === 'payments' && (
            <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                  Payments &amp; Settlements ({pagination?.total ?? payments.length})
                </h2>
                <select
                  aria-label="Filter payments"
                  value={paymentStatusFilter}
                  onChange={(e) => {
                    setPaymentStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-48 min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-xs font-semibold text-[#1A103D] bg-white"
                >
                  <option value="">All Payments</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {payments.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64748B]">No payment records yet.</div>
              ) : (
                <>
                  {/* Mobile Payment Cards */}
                  <div className="md:hidden divide-y divide-[#F1F5F9]">
                    {payments.map((p) => {
                      const pid = Number(p.id);
                      return (
                        <div key={pid} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#1A103D] tabular-nums">
                                {String(p.payment_code)} · {String(p.order_code)}
                              </p>
                              <p className="text-xs font-semibold text-[#334155] truncate mt-0.5">
                                {String(p.customer_name)} →{' '}
                                {p.tailor_shop_name ? String(p.tailor_shop_name) : 'Unassigned'}
                              </p>
                              <p className="text-[11px] text-[#64748B] mt-0.5 tabular-nums">
                                Fee ₹{Number(p.platform_fee).toLocaleString('en-IN')} · Payout ₹
                                {Number(p.tailor_earning).toLocaleString('en-IN')}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-[#1A103D] tabular-nums shrink-0">
                              ₹{Number(p.amount).toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
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
                                className="min-h-[44px] px-3 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-bold cursor-pointer"
                              >
                                Mark Collected
                              </button>
                            ) : (
                              <div className="min-h-[44px] px-3 rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] flex items-center justify-center text-xs font-bold capitalize text-emerald-700">
                                {String(p.payment_status)}
                              </div>
                            )}

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
                                className="min-h-[44px] px-3 rounded-xl bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-bold cursor-pointer"
                              >
                                Settle Payout
                              </button>
                            ) : (
                              <div className="min-h-[44px] px-3 rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] flex items-center justify-center text-xs font-semibold capitalize text-[#475569]">
                                Payout: {String(p.payout_status)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8FF] border-b border-[#EAE0FA] text-[#64748B]">
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
                            <tr key={pid} className="hover:bg-[#FAF8FF]">
                              <td className="px-4 py-3 tabular-nums">
                                <p className="font-bold text-[#1A103D]">{String(p.payment_code)}</p>
                                <p className="text-[11px] text-[#64748B]">{String(p.order_code)}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-[#1A103D]">
                                  {String(p.customer_name)}
                                </p>
                                <p className="text-[11px] text-[#64748B]">
                                  {p.tailor_shop_name ? String(p.tailor_shop_name) : 'Unassigned'}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                <p className="font-bold text-[#1A103D]">
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
                                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-[11px] font-bold cursor-pointer"
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
                                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#1A103D] hover:bg-[#2E1065] text-white text-[11px] font-bold cursor-pointer"
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
                </>
              )}

              <PaginationBar
                pagination={pagination}
                onPageChange={setPage}
                onLimitChange={(n) => {
                  setLimit(n);
                  setPage(1);
                }}
                itemLabel="payments"
              />
            </div>
          )}

          {/* 8. REPORTS & ANALYTICS */}
          {section === 'reports' && reports && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-[#EAE0FA] p-4 sm:p-5 space-y-4">
                  <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
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
                              <span className="font-bold text-[#1A103D] capitalize">
                                {String(c.category)} ({Number(c.order_count)} orders)
                              </span>
                              <span className="font-bold text-[#6B21D9] tabular-nums">
                                ₹{Number(c.revenue).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                              <div
                                className="h-full bg-[#6B21D9] rounded-full"
                                style={{ width: `${Math.max(pct, 6)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#EAE0FA] p-4 sm:p-5 space-y-4">
                  <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                    Demand by Locality
                  </h2>
                  {reports.byLocality.length === 0 ? (
                    <p className="text-xs text-[#64748B]">No locality activity yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {reports.byLocality.map((loc) => (
                        <div
                          key={String(loc.locality)}
                          className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-[#F1F5F9] last:border-0"
                        >
                          <span className="font-semibold text-[#1A103D] truncate">
                            {String(loc.locality)}
                          </span>
                          <span className="text-[#475569] tabular-nums shrink-0">
                            {Number(loc.order_count)} ·{' '}
                            <strong className="text-[#6B21D9]">
                              ₹{Number(loc.revenue).toLocaleString('en-IN')}
                            </strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA]">
                  <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                    Tailor Partner Performance Leaderboard
                  </h2>
                </div>
                {reports.tailorPerformance.length === 0 ? (
                  <p className="p-8 text-center text-xs text-[#64748B]">No tailor metrics yet.</p>
                ) : (
                  <>
                    <div className="md:hidden divide-y divide-[#F1F5F9]">
                      {reports.tailorPerformance.map((tp) => (
                        <div key={String(tp.id)} className="p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#1A103D] truncate">
                              {String(tp.shop_name)}
                            </p>
                            <p className="text-xs text-[#64748B] truncate">
                              {String(tp.locality)} · {Number(tp.total_orders)} orders (
                              {Number(tp.delivered_orders || 0)} done)
                            </p>
                          </div>
                          <div className="text-right tabular-nums shrink-0">
                            <p className="text-xs font-bold text-[#1A103D]">
                              ₹{Number(tp.gross_revenue).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[11px] font-semibold text-[#6B21D9]">
                              Fee ₹{Number(tp.commission_earned).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF8FF] border-b border-[#EAE0FA] text-[#64748B]">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Atelier</th>
                            <th className="px-4 py-3 font-semibold">Locality</th>
                            <th className="px-4 py-3 font-semibold text-right">Orders</th>
                            <th className="px-4 py-3 font-semibold text-right">Delivered</th>
                            <th className="px-4 py-3 font-semibold text-right">Gross Volume</th>
                            <th className="px-4 py-3 font-semibold text-right">Platform Fee</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {reports.tailorPerformance.map((tp) => (
                            <tr key={String(tp.id)}>
                              <td className="px-4 py-3 font-bold text-[#1A103D]">
                                {String(tp.shop_name)}
                              </td>
                              <td className="px-4 py-3 text-[#475569]">{String(tp.locality)}</td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                {Number(tp.total_orders)}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">
                                {Number(tp.delivered_orders || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-[#1A103D] tabular-nums">
                                ₹{Number(tp.gross_revenue).toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-[#6B21D9] tabular-nums">
                                ₹{Number(tp.commission_earned).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 9. STOREFRONT CATALOG (Curated Designs & Doorstep Alterations CRUD) */}
          {section === 'catalog' && (
            <div className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-[#EAE0FA]/70 sm:inline-grid">
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogTab('designs');
                        setPage(1);
                      }}
                      className={`min-h-[40px] px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        catalogTab === 'designs'
                          ? 'bg-white text-[#1A103D] shadow-xs'
                          : 'text-[#475569] hover:text-[#1A103D]'
                      }`}
                    >
                      Curated Designs
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogTab('alterations');
                        setPage(1);
                      }}
                      className={`min-h-[40px] px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        catalogTab === 'alterations'
                          ? 'bg-white text-[#6B21D9] shadow-xs'
                          : 'text-[#475569] hover:text-[#1A103D]'
                      }`}
                    >
                      Doorstep Alterations
                    </button>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Live storefront items ({pagination?.total ?? (catalogTab === 'designs' ? designs.length : alterations.length)})
                  </p>
                </div>

                <div className="relative w-full lg:w-72">
                  <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => {
                      setCatalogSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder={
                      catalogTab === 'designs'
                        ? 'Search designs, category, boutique...'
                        : 'Search alteration services...'
                    }
                    className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-[#CBD5E1] text-xs text-[#1A103D] focus:outline-none focus:border-[#6B21D9]"
                  />
                </div>
              </div>

              {catalogTab === 'designs' ? (
                designs.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <p className="text-sm text-[#64748B]">No curated designs found.</p>
                    <button
                      type="button"
                      onClick={openAddDesignModal}
                      className="min-h-[44px] px-5 rounded-xl bg-[#6B21D9] text-white text-xs font-bold cursor-pointer"
                    >
                      + Add Curated Design
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Mobile Design Cards */}
                    <div className="md:hidden divide-y divide-[#F1F5F9]">
                      {designs.map((d) => {
                        const did = Number(d.id);
                        return (
                          <div key={did} className="p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <SafeImage
                                src={String(d.image_url || '')}
                                alt={String(d.title)}
                                className="w-14 h-14 rounded-xl border border-[#EAE0FA] shrink-0 object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-bold text-[#1A103D] truncate">
                                    {String(d.title)}
                                  </p>
                                  <span className="text-sm font-bold text-[#1A103D] tabular-nums shrink-0">
                                    ₹{Number(d.price).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                                  {String(d.category)} · {String(d.boutique)}
                                </p>
                                <p className="text-[11px] text-[#6B21D9] font-semibold mt-0.5 capitalize">
                                  {String(d.gender)} · {Number(d.turnaround_days)}d SLA
                                  {Boolean(d.is_trending) ? ' · Trending' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={busyId === `des-${did}`}
                                onClick={() => void handleToggleDesignActive(d)}
                                className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold border cursor-pointer ${
                                  Boolean(d.is_active)
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-slate-100 border-slate-200 text-slate-600'
                                }`}
                              >
                                {Boolean(d.is_active) ? 'Visible on Storefront' : 'Hidden'}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditDesignModal(d)}
                                aria-label={`Edit ${d.title}`}
                                className="min-h-[44px] min-w-[44px] rounded-xl border border-[#DCD0F5] text-[#6B21D9] hover:bg-[#F4EEFF] inline-flex items-center justify-center cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={busyId === `des-del-${did}`}
                                onClick={() => void handleDeleteDesign(did)}
                                aria-label={`Delete ${d.title}`}
                                className="min-h-[44px] min-w-[44px] rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Design Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF8FF] border-b border-[#EAE0FA] text-[#64748B]">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Design</th>
                            <th className="px-4 py-3 font-semibold">Boutique &amp; Category</th>
                            <th className="px-4 py-3 font-semibold text-right">Price</th>
                            <th className="px-4 py-3 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {designs.map((d) => {
                            const did = Number(d.id);
                            return (
                              <tr key={did} className="hover:bg-[#FAF8FF]">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <SafeImage
                                      src={String(d.image_url || '')}
                                      alt={String(d.title)}
                                      className="w-10 h-10 rounded-lg border border-[#EAE0FA] shrink-0 object-cover"
                                    />
                                    <div className="min-w-0">
                                      <p className="font-bold text-[#1A103D] truncate max-w-[240px]">
                                        {String(d.title)}
                                      </p>
                                      <p className="text-[11px] text-[#64748B] capitalize">
                                        {String(d.gender)} · {Number(d.turnaround_days)}d SLA
                                        {Boolean(d.is_trending) ? ' · Trending' : ''}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-[#334155]">{String(d.boutique)}</p>
                                  <p className="text-[11px] text-[#6B21D9]">{String(d.category)}</p>
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                  <span className="font-bold text-[#1A103D]">
                                    ₹{Number(d.price).toLocaleString('en-IN')}
                                  </span>
                                  {d.original_price ? (
                                    <span className="block text-[11px] text-[#94A3B8] line-through">
                                      ₹{Number(d.original_price).toLocaleString('en-IN')}
                                    </span>
                                  ) : null}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={busyId === `des-${did}`}
                                      onClick={() => void handleToggleDesignActive(d)}
                                      className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                        Boolean(d.is_active)
                                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                          : 'bg-slate-100 border-slate-200 text-slate-600'
                                      }`}
                                    >
                                      {Boolean(d.is_active) ? 'Visible' : 'Hidden'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditDesignModal(d)}
                                      aria-label={`Edit ${d.title}`}
                                      className="min-h-[36px] min-w-[36px] rounded-lg text-[#6B21D9] hover:bg-[#F4EEFF] inline-flex items-center justify-center cursor-pointer"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busyId === `des-del-${did}`}
                                      onClick={() => void handleDeleteDesign(did)}
                                      aria-label={`Delete ${d.title}`}
                                      className="min-h-[36px] min-w-[36px] rounded-lg text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              ) : alterations.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <p className="text-sm text-[#64748B]">No doorstep alteration services found.</p>
                  <button
                    type="button"
                    onClick={openAddAlterationModal}
                    className="min-h-[44px] px-5 rounded-xl bg-[#6B21D9] text-white text-xs font-bold cursor-pointer"
                  >
                    + Add Alteration Service
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile Alteration Cards */}
                  <div className="md:hidden divide-y divide-[#F1F5F9]">
                    {alterations.map((a) => {
                      const aid = Number(a.id);
                      return (
                        <div key={aid} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#1A103D] truncate">
                                {String(a.title)}
                              </p>
                              <p className="text-[11px] text-[#64748B] line-clamp-2 mt-0.5">
                                {String(a.description || '')}
                              </p>
                              <p className="text-[11px] font-semibold text-[#6B21D9] mt-1 uppercase">
                                {String(a.section)} · {String(a.badge)}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-[#1A103D] tabular-nums shrink-0">
                              ₹{Number(a.price).toLocaleString('en-IN')}/{String(a.unit)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busyId === `alt-${aid}`}
                              onClick={() => void handleToggleAlterationActive(a)}
                              className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold border cursor-pointer ${
                                Boolean(a.is_active)
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}
                            >
                              {Boolean(a.is_active) ? 'Visible on Storefront' : 'Hidden'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditAlterationModal(a)}
                              aria-label={`Edit ${a.title}`}
                              className="min-h-[44px] min-w-[44px] rounded-xl border border-[#DCD0F5] text-[#6B21D9] hover:bg-[#F4EEFF] inline-flex items-center justify-center cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={busyId === `alt-del-${aid}`}
                              onClick={() => void handleDeleteAlteration(aid)}
                              aria-label={`Delete ${a.title}`}
                              className="min-h-[44px] min-w-[44px] rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Alteration Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8FF] border-b border-[#EAE0FA] text-[#64748B]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Alteration Service</th>
                          <th className="px-4 py-3 font-semibold">Section &amp; Badge</th>
                          <th className="px-4 py-3 font-semibold text-right">Price</th>
                          <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {alterations.map((a) => {
                          const aid = Number(a.id);
                          return (
                            <tr key={aid} className="hover:bg-[#FAF8FF]">
                              <td className="px-4 py-3">
                                <p className="font-bold text-[#1A103D]">{String(a.title)}</p>
                                <p className="text-[11px] text-[#64748B] line-clamp-1 max-w-[300px]">
                                  {String(a.description || '')}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <span className="capitalize font-semibold text-[#6B21D9]">
                                  {String(a.section)}
                                </span>
                                <span className="block text-[11px] text-[#64748B]">
                                  {String(a.badge)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums font-bold text-[#1A103D]">
                                ₹{Number(a.price).toLocaleString('en-IN')}
                                <span className="font-normal text-[#64748B]">/{String(a.unit)}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={busyId === `alt-${aid}`}
                                    onClick={() => void handleToggleAlterationActive(a)}
                                    className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                      Boolean(a.is_active)
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : 'bg-slate-100 border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {Boolean(a.is_active) ? 'Visible' : 'Hidden'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditAlterationModal(a)}
                                    aria-label={`Edit ${a.title}`}
                                    className="min-h-[36px] min-w-[36px] rounded-lg text-[#6B21D9] hover:bg-[#F4EEFF] inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busyId === `alt-del-${aid}`}
                                    onClick={() => void handleDeleteAlteration(aid)}
                                    aria-label={`Delete ${a.title}`}
                                    className="min-h-[36px] min-w-[36px] rounded-lg text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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
                itemLabel={catalogTab === 'designs' ? 'designs' : 'alterations'}
              />
            </div>
          )}

          {/* 10. PLATFORM SETTINGS */}
          {section === 'settings' && (
            <form
              onSubmit={handleSaveSettings}
              className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden max-w-3xl"
            >
              <div className="px-4 sm:px-5 py-4 border-b border-[#EAE0FA] flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-serif-accent text-base font-bold text-[#1A103D]">
                    Platform Configuration &amp; Business Rules
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Persists immediately to MySQL and governs quotes, fees, and privacy.
                  </p>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#6B21D9] shrink-0" />
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {settings.map((s) => {
                  const key = String(s.setting_key);
                  const val = settingsDraft[key] ?? String(s.setting_value);
                  const isBool = val === 'true' || val === 'false';
                  return (
                    <div
                      key={key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#F1F5F9] last:border-0"
                    >
                      <div>
                        <label
                          htmlFor={`setting-${key}`}
                          className="block text-xs font-bold text-[#1A103D] font-mono"
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
                          className="min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-xs font-semibold text-[#1A103D] bg-white sm:w-44"
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
                          className="min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-xs font-semibold text-[#1A103D] sm:w-64 focus:outline-none focus:border-[#6B21D9]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="px-4 sm:px-5 py-4 bg-[#FAF8FF] border-t border-[#EAE0FA] flex justify-end">
                <button
                  type="submit"
                  disabled={busyId === 'save-settings'}
                  className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 px-5 rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {busyId === 'save-settings' ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* CREATE USER BOTTOM SHEET / MODAL */}
      <MobileBottomSheetModal
        open={createUserOpen}
        title="Create Platform User"
        subtitle="Password must be 8+ characters with a letter and a number"
        onClose={() => setCreateUserOpen(false)}
      >
        <form onSubmit={handleCreateUser} className="p-5 space-y-3 text-xs">
          <input
            type="text"
            required
            placeholder="Full Name"
            value={newUserForm.fullName}
            onChange={(e) => setNewUserForm((f) => ({ ...f, fullName: e.target.value }))}
            className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
          />
          <input
            type="email"
            required
            placeholder="Email Address"
            value={newUserForm.email}
            onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
          />
          <input
            type="tel"
            placeholder="Mobile Number (optional)"
            value={newUserForm.phone}
            onChange={(e) => setNewUserForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Temporary Password (8+ chars, letter + number)"
            value={newUserForm.password}
            onChange={(e) => setNewUserForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
          />
          <select
            value={newUserForm.role}
            onChange={(e) =>
              setNewUserForm((f) => ({
                ...f,
                role: e.target.value as 'owner' | 'tailor' | 'customer',
              }))
            }
            className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D] bg-white"
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
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
            />
          )}
          <input
            type="text"
            required
            placeholder="Locality"
            value={newUserForm.locality}
            onChange={(e) => setNewUserForm((f) => ({ ...f, locality: e.target.value }))}
            className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
          />
          <button
            type="submit"
            disabled={busyId === 'create-user'}
            className="w-full min-h-[48px] rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white font-bold cursor-pointer"
          >
            {busyId === 'create-user' ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </MobileBottomSheetModal>

      {/* CREATE / EDIT SERVICE BOTTOM SHEET / MODAL */}
      <MobileBottomSheetModal
        open={createServiceOpen}
        title={editingServiceId ? 'Edit Service Pricing & SLA' : 'Add Master Catalog Service'}
        subtitle="Changes update live on the customer storefront"
        onClose={() => {
          setCreateServiceOpen(false);
          setEditingServiceId(null);
        }}
      >
        <form onSubmit={handleSaveService} className="p-5 space-y-3 text-xs">
          <input
            type="text"
            required
            placeholder="Service Title (e.g. Bridal Zardosi Blouse)"
            value={newServiceForm.title}
            onChange={(e) => setNewServiceForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
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
              placeholder="Base Price (₹)"
              value={newServiceForm.basePrice}
              onChange={(e) => setNewServiceForm((f) => ({ ...f, basePrice: e.target.value }))}
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
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
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
            />
          </div>
          <textarea
            rows={3}
            placeholder="Service details and inclusions..."
            value={newServiceForm.description}
            onChange={(e) => setNewServiceForm((f) => ({ ...f, description: e.target.value }))}
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
                : 'Create Service'}
          </button>
        </form>
      </MobileBottomSheetModal>

      {/* EDIT TAILOR SHOP DETAILS MODAL */}
      <MobileBottomSheetModal
        open={Boolean(editingTailor)}
        title={editingTailor ? `Edit ${editingTailor.shopName}` : 'Edit Tailor Shop'}
        subtitle="Changes immediately reflect on the customer storefront"
        onClose={() => setEditingTailor(null)}
      >
        {editingTailor && (
          <form onSubmit={handleSaveTailorEdit} className="p-5 space-y-3 text-xs">
            <ShopLogoUploader
              compact
              currentLogoUrl={editingTailor.logoUrl || undefined}
              shopName={editingTailor.shopName || 'Tailor Shop'}
              onUpload={async (mimeType, imageBase64) => {
                const res = await ownerTailorLogoApi.upload(editingTailor.id, {
                  mimeType,
                  imageBase64,
                });
                setEditingTailor((t) => (t ? { ...t, logoUrl: res.logoUrl } : null));
                onNotifyToast(`Updated shop logo for "${editingTailor.shopName}".`);
                void loadSectionData('tailors', page, limit);
              }}
              onRemove={async () => {
                await ownerTailorLogoApi.remove(editingTailor.id);
                setEditingTailor((t) => (t ? { ...t, logoUrl: '' } : null));
                onNotifyToast(`Removed shop logo for "${editingTailor.shopName}".`);
                void loadSectionData('tailors', page, limit);
              }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                required
                placeholder="Shop / Boutique Name"
                value={editingTailor.shopName}
                onChange={(e) =>
                  setEditingTailor((t) => (t ? { ...t, shopName: e.target.value } : null))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
              />
              <input
                type="text"
                required
                placeholder="Master Tailor"
                value={editingTailor.masterTailor}
                onChange={(e) =>
                  setEditingTailor((t) => (t ? { ...t, masterTailor: e.target.value } : null))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                required
                placeholder="Locality"
                value={editingTailor.locality}
                onChange={(e) =>
                  setEditingTailor((t) => (t ? { ...t, locality: e.target.value } : null))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
              />
              <input
                type="text"
                placeholder="Working Hours"
                value={editingTailor.workingHours}
                onChange={(e) =>
                  setEditingTailor((t) => (t ? { ...t, workingHours: e.target.value } : null))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min={0}
                placeholder="Exp (yrs)"
                value={editingTailor.experienceYears}
                onChange={(e) =>
                  setEditingTailor((t) => (t ? { ...t, experienceYears: e.target.value } : null))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-[#1A103D]"
              />
              <input
                type="number"
                min={0}
                placeholder="Visit Fee (₹)"
                value={editingTailor.homeVisitFee}
                onChange={(e) =>
                  setEditingTailor((t) => (t ? { ...t, homeVisitFee: e.target.value } : null))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-[#1A103D]"
              />
              <input
                type="text"
                placeholder="Turnaround"
                value={editingTailor.turnaroundText}
                onChange={(e) =>
                  setEditingTailor((t) => (t ? { ...t, turnaroundText: e.target.value } : null))
                }
                className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-[#1A103D]"
              />
            </div>
            <input
              type="text"
              placeholder="Cover Image URL (/src/assets/images/... or https://...)"
              value={editingTailor.coverImageUrl}
              onChange={(e) =>
                setEditingTailor((t) => (t ? { ...t, coverImageUrl: e.target.value } : null))
              }
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
            />
            <textarea
              rows={2}
              placeholder="Atelier Bio"
              value={editingTailor.bio}
              onChange={(e) =>
                setEditingTailor((t) => (t ? { ...t, bio: e.target.value } : null))
              }
              className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-[#1A103D]"
            />
            <button
              type="submit"
              disabled={busyId === `tailor-save-${editingTailor.id}`}
              className="w-full min-h-[48px] rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white font-bold cursor-pointer"
            >
              {busyId === `tailor-save-${editingTailor.id}` ? 'Saving...' : 'Save Tailor Shop'}
            </button>
          </form>
        )}
      </MobileBottomSheetModal>

      {/* ADD / EDIT CURATED DESIGN MODAL */}
      <MobileBottomSheetModal
        open={designModalOpen}
        title={editingDesignId ? 'Edit Curated Design' : 'Add Curated Design'}
        subtitle="Displayed in Curated Designs Catalog & Alterations Carousel"
        onClose={() => {
          setDesignModalOpen(false);
          setEditingDesignId(null);
        }}
      >
        <form onSubmit={handleSaveDesign} className="p-5 space-y-3 text-xs">
          <input
            type="text"
            required
            placeholder="Design Title (e.g. Royal Zardosi Bridal Blouse)"
            value={designForm.title}
            onChange={(e) => setDesignForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <select
              value={designForm.gender}
              onChange={(e) =>
                setDesignForm((f) => ({
                  ...f,
                  gender: e.target.value === 'men' ? 'men' : 'women',
                }))
              }
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-[#1A103D] bg-white"
            >
              <option value="women">Women</option>
              <option value="men">Men</option>
            </select>
            <select
              value={designForm.categoryId}
              onChange={(e) => {
                const map: Record<string, string> = {
                  blouse: 'Blouse Stitching',
                  kurti: 'Kurti & Salwar',
                  bridal: 'Bridal & Maggam',
                  lehenga: 'Lehenga & Gown',
                  suit: 'Men Suits & Blazers',
                  shirt: 'Men Shirts & Kurta',
                };
                setDesignForm((f) => ({
                  ...f,
                  categoryId: e.target.value,
                  category: map[e.target.value] || f.category,
                }));
              }}
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-[#1A103D] bg-white"
            >
              <option value="blouse">Blouse Stitching</option>
              <option value="kurti">Kurti &amp; Salwar</option>
              <option value="bridal">Bridal &amp; Maggam</option>
              <option value="lehenga">Lehenga &amp; Gown</option>
              <option value="suit">Men Suits &amp; Blazers</option>
              <option value="shirt">Men Shirts &amp; Kurta</option>
            </select>
          </div>
          <input
            type="text"
            required
            placeholder="Boutique / Atelier Name"
            value={designForm.boutique}
            onChange={(e) => setDesignForm((f) => ({ ...f, boutique: e.target.value }))}
            className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              required
              min={20}
              placeholder="Price (₹)"
              value={designForm.price}
              onChange={(e) => setDesignForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-[#1A103D]"
            />
            <input
              type="number"
              min={20}
              placeholder="MRP (₹)"
              value={designForm.originalPrice}
              onChange={(e) => setDesignForm((f) => ({ ...f, originalPrice: e.target.value }))}
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-[#1A103D]"
            />
            <input
              type="number"
              required
              min={1}
              placeholder="Days SLA"
              value={designForm.turnaroundDays}
              onChange={(e) => setDesignForm((f) => ({ ...f, turnaroundDays: e.target.value }))}
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-[#1A103D]"
            />
          </div>
          <div className="flex items-center gap-2.5">
            {designForm.imageUrl && (
              <SafeImage
                src={designForm.imageUrl}
                alt="Design preview"
                className="w-11 h-11 rounded-lg border border-[#EAE0FA] shrink-0 object-cover"
              />
            )}
            <input
              type="text"
              required
              placeholder="Image URL (/src/assets/images/... or https://...)"
              value={designForm.imageUrl}
              onChange={(e) => setDesignForm((f) => ({ ...f, imageUrl: e.target.value }))}
              className="flex-1 min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
            />
          </div>
          <textarea
            rows={2}
            placeholder="Design description..."
            value={designForm.description}
            onChange={(e) => setDesignForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-[#1A103D]"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="min-h-[42px] flex items-center gap-2 px-3 rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] font-semibold text-[#1A103D] cursor-pointer">
              <input
                type="checkbox"
                checked={designForm.isTrending}
                onChange={(e) => setDesignForm((f) => ({ ...f, isTrending: e.target.checked }))}
                className="accent-[#6B21D9]"
              />
              Mark Trending
            </label>
            <label className="min-h-[42px] flex items-center gap-2 px-3 rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] font-semibold text-[#1A103D] cursor-pointer">
              <input
                type="checkbox"
                checked={designForm.isActive}
                onChange={(e) => setDesignForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="accent-[#6B21D9]"
              />
              Visible Live
            </label>
          </div>
          <button
            type="submit"
            disabled={busyId === 'save-design'}
            className="w-full min-h-[48px] rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white font-bold cursor-pointer"
          >
            {busyId === 'save-design'
              ? 'Saving...'
              : editingDesignId
                ? 'Update Design'
                : 'Add Design'}
          </button>
        </form>
      </MobileBottomSheetModal>

      {/* ADD / EDIT ALTERATION SERVICE MODAL */}
      <MobileBottomSheetModal
        open={alterationModalOpen}
        title={editingAlterationId ? 'Edit Doorstep Alteration' : 'Add Doorstep Alteration'}
        subtitle="Displayed live on the Doorstep Alterations storefront page"
        onClose={() => {
          setAlterationModalOpen(false);
          setEditingAlterationId(null);
        }}
      >
        <form onSubmit={handleSaveAlteration} className="p-5 space-y-3 text-xs">
          <input
            type="text"
            required
            placeholder="Alteration Title (e.g. Waist & Hip Taper)"
            value={alterationForm.title}
            onChange={(e) => setAlterationForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="number"
              required
              min={10}
              placeholder="Price (₹)"
              value={alterationForm.price}
              onChange={(e) => setAlterationForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
            />
            <input
              type="text"
              required
              placeholder="Unit (e.g. garment, saree)"
              value={alterationForm.unit}
              onChange={(e) => setAlterationForm((f) => ({ ...f, unit: e.target.value }))}
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <select
              value={alterationForm.section}
              onChange={(e) =>
                setAlterationForm((f) => ({
                  ...f,
                  section: e.target.value === 'saree' ? 'saree' : 'garment',
                }))
              }
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3 text-[#1A103D] bg-white"
            >
              <option value="garment">Garment Alteration</option>
              <option value="saree">Saree Finishing</option>
            </select>
            <input
              type="text"
              placeholder="Badge (e.g. POPULAR, 24 HRS)"
              value={alterationForm.badge}
              onChange={(e) => setAlterationForm((f) => ({ ...f, badge: e.target.value }))}
              className="w-full min-h-[44px] border border-[#CBD5E1] rounded-xl px-3.5 text-[#1A103D]"
            />
          </div>
          <textarea
            rows={2}
            placeholder="Alteration details..."
            value={alterationForm.description}
            onChange={(e) => setAlterationForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-[#1A103D]"
          />
          <label className="min-h-[42px] flex items-center gap-2 px-3 rounded-xl bg-[#FAF8FF] border border-[#EAE0FA] font-semibold text-[#1A103D] cursor-pointer">
            <input
              type="checkbox"
              checked={alterationForm.isActive}
              onChange={(e) => setAlterationForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="accent-[#6B21D9]"
            />
            Visible on Storefront
          </label>
          <button
            type="submit"
            disabled={busyId === 'save-alt'}
            className="w-full min-h-[48px] rounded-xl bg-[#6B21D9] hover:bg-[#5B21B6] text-white font-bold cursor-pointer"
          >
            {busyId === 'save-alt'
              ? 'Saving...'
              : editingAlterationId
                ? 'Update Alteration'
                : 'Add Alteration'}
          </button>
        </form>
      </MobileBottomSheetModal>
    </DashboardShell>
  );
};

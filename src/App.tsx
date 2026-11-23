import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  AlterationService,
  AuthMode,
  CartItem,
  CategoryItem,
  CraftReelScene,
  DesignProduct,
  FabricBookingPreset,
  MeasurementProfile,
  OrderLifecycleStage,
  OrderRecord,
  PageRoute,
  PlatformServiceItem,
  PromoOffer,
  ServiceLocality,
  StorefrontMediaMap,
  TailorPartner,
  UserSession,
} from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { AuthPage } from './components/AuthPage';
import {
  apiRequest,
  authApi,
  mapAuthUserToSession,
  mapPublicAlterationToService,
  mapPublicDesignToProduct,
  mapPublicTailorToPartner,
  publicApi,
  setAuthToken,
} from './services/api';
import { validateOrderTransition } from './utils/matchingRules';
import {
  CartDrawer,
  DesignDetailModal,
  LocationModal,
  ReferralModal,
  SupportDrawer,
  WishlistDrawer,
} from './components/OverlaysAndDrawers';
import {
  QuickBookModal,
  TailorProfileModal,
  TailorProfileTab,
} from './components/TailorModals';

const AlterationsPage = lazy(() =>
  import('./components/AlterationsPage').then((m) => ({ default: m.AlterationsPage })),
);
const UniformsPage = lazy(() =>
  import('./components/UniformsPage').then((m) => ({ default: m.UniformsPage })),
);
const DesignsCatalogPage = lazy(() =>
  import('./components/DesignsCatalogPage').then((m) => ({ default: m.DesignsCatalogPage })),
);
const CustomStitchingPage = lazy(() =>
  import('./components/CustomStitchingPage').then((m) => ({ default: m.CustomStitchingPage })),
);
const FabricCalculatorPage = lazy(() =>
  import('./components/FabricCalculatorPage').then((m) => ({ default: m.FabricCalculatorPage })),
);
const MeasurementsPage = lazy(() =>
  import('./components/MeasurementsPage').then((m) => ({ default: m.MeasurementsPage })),
);
const PartnerPortalPage = lazy(() =>
  import('./components/PartnerPortalPage').then((m) => ({ default: m.PartnerPortalPage })),
);
const NearbyShopsPage = lazy(() =>
  import('./components/NearbyShopsPage').then((m) => ({ default: m.NearbyShopsPage })),
);
const OwnerDashboard = lazy(() =>
  import('./components/dashboards/OwnerDashboard').then((m) => ({ default: m.OwnerDashboard })),
);
const TailorDashboard = lazy(() =>
  import('./components/dashboards/TailorDashboard').then((m) => ({ default: m.TailorDashboard })),
);
const CustomerDashboard = lazy(() =>
  import('./components/dashboards/CustomerDashboard').then((m) => ({
    default: m.CustomerDashboard,
  })),
);

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[60vh] flex items-center justify-center p-6">
    <div className="w-full max-w-md space-y-3">
      <div className="h-5 w-40 rounded-lg bg-[#EAE0FA] animate-pulse mx-auto" />
      <div className="h-28 rounded-2xl bg-white border border-[#EAE0FA] animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-2xl bg-white border border-[#EAE0FA] animate-pulse" />
        <div className="h-20 rounded-2xl bg-white border border-[#EAE0FA] animate-pulse" />
      </div>
    </div>
  </div>
);

function mapBackendOrderTypeToRecordType(
  orderType: string,
): OrderRecord['type'] {
  if (orderType === 'alteration') return 'alteration';
  if (orderType === 'uniform') return 'uniform';
  if (orderType === 'bridal' || orderType === 'menswear') return 'design';
  return 'custom';
}

function mapRecordTypeToBackendOrderType(
  recordType: OrderRecord['type'],
): 'custom' | 'alteration' | 'uniform' | 'bridal' | 'menswear' {
  if (recordType === 'alteration') return 'alteration';
  if (recordType === 'uniform') return 'uniform';
  if (recordType === 'design') return 'bridal';
  return 'custom';
}

function mapMeasurementGarmentType(
  raw: string,
): MeasurementProfile['garmentType'] {
  if (
    raw === 'Blouse' ||
    raw === 'Kurti / Salwar' ||
    raw === 'Men Shirt / Kurta' ||
    raw === 'Trousers / Bottom'
  ) {
    return raw;
  }
  const low = raw.toLowerCase();
  if (low.includes('blouse')) return 'Blouse';
  if (low.includes('shirt') || low.includes('men')) return 'Men Shirt / Kurta';
  if (low.includes('trouser') || low.includes('pant') || low.includes('bottom')) {
    return 'Trousers / Bottom';
  }
  return 'Kurti / Salwar';
}

function mapDbOrderRowToRecord(row: Record<string, unknown>): OrderRecord {
  const createdDate = row.created_at
    ? new Date(String(row.created_at)).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
  const deliveryRaw = row.delivery_date ? String(row.delivery_date).slice(0, 10) : 'TBD';
  const title = String(row.service_title || 'Tailoring Order');
  return {
    id: String(row.order_code || `ORD-${row.id}`),
    dbId: Number(row.id),
    serviceTitle: title,
    type: mapBackendOrderTypeToRecordType(String(row.order_type || 'custom')),
    tailorId: row.tailor_id ? Number(row.tailor_id) : null,
    serviceId: row.service_id ? Number(row.service_id) : null,
    createdAt: createdDate,
    itemsSummary: String(row.garment_notes || title),
    tailorName: row.tailor_shop_name ? String(row.tailor_shop_name) : 'Assigned Master Tailor',
    locality: String(row.locality || 'Hyderabad'),
    amount: Number(row.total_amount || row.quoted_amount || 0),
    stage: (String(row.status || 'Booking Created') as OrderLifecycleStage),
    deliveryDate: deliveryRaw,
    quoteApproved: Boolean(row.quote_approved),
    pickupMode:
      row.pickup_mode === 'shop_visit' ? 'shop_visit' : 'doorstep_pickup',
    pickupDate: row.pickup_date ? String(row.pickup_date).slice(0, 10) : undefined,
    pickupSlot: row.pickup_slot ? String(row.pickup_slot) : undefined,
    pickupAddress: row.pickup_address ? String(row.pickup_address) : undefined,
  };
}

export default function App() {
  const [activePage, setActivePage] = useState<PageRoute>('home');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [locality, setLocality] = useState('Alkapur Township, Manikonda');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Live Backend Storefront State (MySQL -> Node.js -> React, zero UI mock data)
  const [tailors, setTailors] = useState<TailorPartner[]>([]);
  const [designs, setDesigns] = useState<DesignProduct[]>([]);
  const [alterations, setAlterations] = useState<AlterationService[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [promos, setPromos] = useState<PromoOffer[]>([]);
  const [localities, setLocalities] = useState<ServiceLocality[]>([]);
  const [craftScenes, setCraftScenes] = useState<CraftReelScene[]>([]);
  const [platformServices, setPlatformServices] = useState<PlatformServiceItem[]>([]);
  const [media, setMedia] = useState<StorefrontMediaMap>({});
  const [storefrontLoading, setStorefrontLoading] = useState(true);

  // App Interactive State (Populated from MySQL when signed in)
  const [user, setUser] = useState<UserSession | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementProfile[]>([]);
  const [fabricPreset, setFabricPreset] = useState<FabricBookingPreset | null>(null);

  // Overlays & Modals
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<DesignProduct | null>(null);
  const [inspectedTailor, setInspectedTailor] = useState<{
    tailor: TailorPartner;
    tab: TailorProfileTab;
  } | null>(null);
  const [quickBookTailor, setQuickBookTailor] = useState<{
    tailor: TailorPartner;
    serviceId?: string;
    note?: string;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  const refreshStorefront = useCallback(async () => {
    setStorefrontLoading(true);
    try {
      const data = await publicApi.storefront();
      const mappedTailors = (data.tailors || []).map(mapPublicTailorToPartner);
      const mappedDesigns = (data.designs || []).map(mapPublicDesignToProduct);
      const mappedAlterations = (data.alterations || []).map(mapPublicAlterationToService);
      setTailors(mappedTailors);
      setDesigns(mappedDesigns);
      setAlterations(mappedAlterations);
      setCategories(data.categories || []);
      setPromos(data.promos || []);
      setLocalities(data.localities || []);
      setCraftScenes(data.craftScenes || []);
      setPlatformServices(data.platformServices || []);
      setMedia(data.media || {});
    } catch {
      // Keep any previously loaded state if transient error occurs
    } finally {
      setStorefrontLoading(false);
    }
  }, []);

  const refreshCustomerRecords = useCallback(async () => {
    try {
      const [ordRes, measRes] = await Promise.all([
        apiRequest<{ orders: Record<string, unknown>[] }>('/api/customer/orders?page=1&limit=50'),
        apiRequest<{
          measurements: {
            id: number;
            label: string;
            garmentType: string;
            ownerName: string;
            measuredBy: string;
            consentSaved: boolean;
            values: Record<string, string>;
            updatedAt?: string;
          }[];
        }>('/api/customer/measurements?page=1&limit=50'),
      ]);
      setOrders((ordRes.orders || []).map(mapDbOrderRowToRecord));
      setMeasurements(
        (measRes.measurements || []).map((m) => ({
          id: `db-m-${m.id}`,
          dbId: m.id,
          label: m.label,
          garmentType: mapMeasurementGarmentType(m.garmentType),
          ownerName: m.ownerName,
          measuredBy: m.measuredBy,
          updatedAt: m.updatedAt
            ? new Date(m.updatedAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'Saved',
          consentSaved: Boolean(m.consentSaved),
          values: m.values || {},
        })),
      );
    } catch {
      // Ignore if session expired
    }
  }, []);

  useEffect(() => {
    void refreshStorefront();
    // Restore active cookie session if present
    authApi
      .me()
      .then((res) => {
        const session = mapAuthUserToSession(res.user);
        setUser(session);
        if (session.locality) setLocality(session.locality);
      })
      .catch(() => undefined);
  }, [refreshStorefront]);

  useEffect(() => {
    if (user?.role === 'customer') {
      void refreshCustomerRecords();
    } else if (!user) {
      setOrders([]);
      setMeasurements([]);
    }
  }, [user, refreshCustomerRecords]);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const handleNavigate = useCallback(
    (page: PageRoute, opts?: { categoryId?: string; searchQuery?: string; authMode?: AuthMode }) => {
      if (opts?.categoryId !== undefined) setCatalogCategory(opts.categoryId);
      if (opts?.searchQuery !== undefined) setCatalogSearch(opts.searchQuery);
      if (opts?.authMode) setAuthMode(opts.authMode);
      setActivePage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [],
  );

  // Cart Handlers
  const handleAddAlteration = useCallback(
    (srv: AlterationService) => {
      setCart((prev) => {
        const existing = prev.find((item) => item.id === srv.id);
        if (existing) {
          return prev.map((item) =>
            item.id === srv.id ? { ...item, quantity: item.quantity + 1 } : item,
          );
        }
        return [
          ...prev,
          {
            id: srv.id,
            type: 'alteration',
            title: srv.title,
            subtitle: `Doorstep Alteration · ₹${srv.price}/${srv.unit}`,
            price: srv.price,
            quantity: 1,
          },
        ];
      });
      showToast(`Added "${srv.title}" to your Tailering bag.`);
    },
    [showToast],
  );

  const handleAddDesignToCart = useCallback(
    (design: DesignProduct) => {
      setCart((prev) => {
        const existing = prev.find((item) => item.id === design.id);
        if (existing) {
          return prev.map((item) =>
            item.id === design.id ? { ...item, quantity: item.quantity + 1 } : item,
          );
        }
        return [
          ...prev,
          {
            id: design.id,
            type: 'design',
            title: design.title,
            subtitle: `by ${design.boutique}`,
            price: design.price,
            quantity: 1,
            image: design.image,
          },
        ];
      });
      showToast(`Added "${design.title}" to your Tailering bag.`);
    },
    [showToast],
  );

  const handleUpdateQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Persist storefront orders to MySQL when logged in as customer
  const persistOrderToBackend = useCallback(
    async (order: OrderRecord) => {
      if (user?.role !== 'customer') return;
      const tomorrowIso = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      try {
        const created = await apiRequest<{ orderId: number; orderCode: string }>(
          '/api/customer/orders',
          {
            method: 'POST',
            body: {
              tailorId: order.tailorId ?? null,
              serviceId: order.serviceId ?? null,
              serviceTitle: (order.serviceTitle || order.itemsSummary).slice(0, 175),
              orderType: mapRecordTypeToBackendOrderType(order.type),
              quotedAmount: Math.max(20, Number(order.amount) || 499),
              pickupMode: order.pickupMode || 'doorstep_pickup',
              pickupDate: order.pickupDate || tomorrowIso,
              pickupSlot: order.pickupSlot || '10:00 AM – 12:00 PM',
              locality: order.locality || locality,
              pickupAddress: order.pickupAddress || order.locality || locality,
              garmentNotes: order.itemsSummary,
            },
          },
        );
        await refreshCustomerRecords();
        showToast(`Saved order ${created.orderCode} to your Tailering account.`);
      } catch (err) {
        showToast(
          err instanceof Error
            ? `Order recorded locally (${err.message})`
            : 'Order recorded locally.',
        );
      }
    },
    [user, locality, refreshCustomerRecords, showToast],
  );

  const handleCheckoutComplete = useCallback(
    (newOrder: OrderRecord) => {
      setOrders((prev) => [newOrder, ...prev]);
      setCart([]);
      if (user?.role === 'customer') {
        void persistOrderToBackend(newOrder);
      } else {
        showToast(`Booking ${newOrder.id} confirmed! Sign in to sync orders across devices.`);
      }
    },
    [user, persistOrderToBackend, showToast],
  );

  // Wishlist Toggle
  const handleToggleWishlist = useCallback(
    (designId: string) => {
      setWishlistIds((prev) => {
        const exists = prev.includes(designId);
        showToast(exists ? 'Removed from saved designs.' : 'Saved to your Tailering wishlist.');
        return exists ? prev.filter((id) => id !== designId) : [...prev, designId];
      });
    },
    [showToast],
  );

  // Order Actions
  const handleAddOrder = useCallback(
    (order: OrderRecord) => {
      setOrders((prev) => [order, ...prev]);
      if (user?.role === 'customer') {
        void persistOrderToBackend(order);
      }
    },
    [user, persistOrderToBackend],
  );

  const handleApproveQuote = useCallback(
    (orderId: string) => {
      const target = orders.find((o) => o.id === orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, quoteApproved: true, stage: 'Customer Approved' } : o,
        ),
      );
      if (user?.role === 'customer' && target?.dbId) {
        void apiRequest(`/api/customer/orders/${target.dbId}/approve-quote`, {
          method: 'PATCH',
        })
          .then(() => refreshCustomerRecords())
          .catch(() => undefined);
      }
      showToast(`Quote for ${orderId} approved! Your tailor can now begin stitching.`);
    },
    [orders, user, refreshCustomerRecords, showToast],
  );

  const handleAdvanceOrderStage = useCallback(
    (orderId: string, nextStage: OrderLifecycleStage) => {
      const targetOrder = orders.find((o) => o.id === orderId);
      if (!targetOrder) return;
      const check = validateOrderTransition(targetOrder, nextStage);
      if (!check.allowed) {
        showToast(check.reason);
        return;
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, stage: nextStage } : o)),
      );
      showToast(`Order ${orderId} updated to "${nextStage}".`);
    },
    [orders, showToast],
  );

  // Measurement Actions
  const handleAddMeasurement = useCallback(
    (prof: MeasurementProfile) => {
      setMeasurements((prev) => [prof, ...prev]);
      if (user?.role === 'customer') {
        void apiRequest('/api/customer/measurements', {
          method: 'POST',
          body: {
            label: prof.label,
            garmentType: prof.garmentType,
            ownerName: prof.ownerName,
            measuredBy: prof.measuredBy,
            consentSaved: prof.consentSaved,
            values: prof.values,
          },
        })
          .then(() => refreshCustomerRecords())
          .catch(() => undefined);
      }
    },
    [user, refreshCustomerRecords],
  );

  const handleDeleteMeasurement = useCallback(
    (id: string) => {
      const target = measurements.find((m) => m.id === id);
      setMeasurements((prev) => prev.filter((p) => p.id !== id));
      if (user?.role === 'customer' && target?.dbId) {
        void apiRequest(`/api/customer/measurements/${target.dbId}`, {
          method: 'DELETE',
        })
          .then(() => refreshCustomerRecords())
          .catch(() => undefined);
      }
      showToast('Measurement profile deleted.');
    },
    [measurements, user, refreshCustomerRecords, showToast],
  );

  const handleToggleMeasurementConsent = useCallback(
    (id: string) => {
      setMeasurements((prev) =>
        prev.map((p) => (p.id === id ? { ...p, consentSaved: !p.consentSaved } : p)),
      );
      showToast('Measurement reuse consent updated.');
    },
    [showToast],
  );

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = useCallback(() => {
    authApi.logout().catch(() => undefined);
    setAuthToken(null);
    setUser(null);
    setActivePage('home');
    showToast('Signed out of Tailering.');
  }, [showToast]);

  const handleReturnFromDashboard = useCallback(() => {
    void refreshStorefront();
    if (user?.role === 'customer') {
      void refreshCustomerRecords();
    }
    handleNavigate('home');
  }, [refreshStorefront, refreshCustomerRecords, user, handleNavigate]);

  // Role-Based Dashboards (App Owner, Tailor Partner, Customer) — Strict RBAC Gate
  if (activePage === 'dashboard') {
    if (!user) {
      return (
        <>
          <AuthPage
            initialMode="login"
            locality={locality}
            media={media}
            onLoginSuccess={(session, redirectTo) => {
              setUser(session);
              setLocality(session.locality || locality);
              showToast(`Welcome to Tailering, ${session.name}!`);
              handleNavigate(redirectTo || 'dashboard');
            }}
            onBackHome={() => handleNavigate('home')}
            onNotifyToast={showToast}
          />
          {toastMsg && (
            <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#1A103D] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full shadow-xl border border-[#6B21D9]/40 flex items-center gap-2 max-w-[92vw]">
              <CheckCircle2 className="w-4 h-4 text-[#C4B5FD] shrink-0" />
              <span className="truncate">{toastMsg}</span>
            </div>
          )}
        </>
      );
    }

    return (
      <>
        <Suspense fallback={<RouteLoadingFallback />}>
          {user.role === 'owner' && (
            <OwnerDashboard
              user={user}
              onBackToStorefront={handleReturnFromDashboard}
              onLogout={handleLogout}
              onNotifyToast={showToast}
            />
          )}
          {user.role === 'tailor' && (
            <TailorDashboard
              user={user}
              onBackToStorefront={handleReturnFromDashboard}
              onLogout={handleLogout}
              onNotifyToast={showToast}
            />
          )}
          {user.role === 'customer' && (
            <CustomerDashboard
              user={user}
              onUpdateUser={(next) => {
                setUser(next);
                setLocality(next.locality);
              }}
              onBackToStorefront={handleReturnFromDashboard}
              onLogout={handleLogout}
              onNotifyToast={showToast}
            />
          )}
        </Suspense>
        {toastMsg && (
          <div className="fixed bottom-20 lg:bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#1A103D] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full shadow-xl border border-[#6B21D9]/40 flex items-center gap-2 max-w-[92vw]">
            <CheckCircle2 className="w-4 h-4 text-[#C4B5FD] shrink-0" />
            <span className="truncate">{toastMsg}</span>
          </div>
        )}
      </>
    );
  }

  // Auth page renders full-bleed split screen
  if (activePage === 'auth') {
    return (
      <>
        <AuthPage
          initialMode={authMode}
          locality={locality}
          media={media}
          onLoginSuccess={(session, redirectTo) => {
            setUser(session);
            if (session.locality) setLocality(session.locality);
            showToast(`Welcome to Tailering, ${session.name}!`);
            handleNavigate(redirectTo || 'dashboard');
          }}
          onBackHome={() => handleNavigate('home')}
          onNotifyToast={showToast}
        />
        {toastMsg && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#1A103D] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full shadow-xl border border-[#6B21D9]/40 flex items-center gap-2 max-w-[92vw]">
            <CheckCircle2 className="w-4 h-4 text-[#C4B5FD] shrink-0" />
            <span className="truncate">{toastMsg}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8FF] text-[#1A103D]">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      <Navbar
        activePage={activePage}
        onNavigate={handleNavigate}
        locality={locality}
        onOpenLocationModal={() => setLocationModalOpen(true)}
        cartCount={totalCartItems}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => setCartOpen(true)}
        onOpenWishlist={() => setWishlistOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenSearch={() => {
          if (activePage !== 'home') {
            handleNavigate('home');
            setTimeout(() => {
              document.getElementById('homepage-tailor-search')?.focus();
            }, 120);
          } else {
            document.getElementById('homepage-tailor-search')?.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        <Suspense fallback={<RouteLoadingFallback />}>
          {activePage === 'home' && (
            <HomePage
              locality={locality}
              tailors={tailors}
              designs={designs}
              categories={categories}
              craftScenes={craftScenes}
              media={media}
              loadingTailors={storefrontLoading}
              user={user}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
              onSelectDesign={setSelectedDesign}
              onOpenLocationModal={() => setLocationModalOpen(true)}
              onRequireSignIn={() => handleNavigate('auth', { authMode: 'login' })}
              onReviewSubmitted={() => void refreshStorefront()}
              onNavigate={handleNavigate}
              onCreateOrder={handleAddOrder}
              onNotifyToast={showToast}
            />
          )}

          {activePage === 'alterations' && (
            <AlterationsPage
              initialSearch={catalogSearch}
              alterations={alterations}
              designs={designs}
              media={media}
              loading={storefrontLoading}
              cart={cart}
              onAddAlteration={handleAddAlteration}
              onUpdateQty={handleUpdateQty}
              onSelectDesign={setSelectedDesign}
              onQuickAddDesign={handleAddDesignToCart}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
              onNavigate={handleNavigate}
              orders={orders}
              onApproveQuote={handleApproveQuote}
            />
          )}

          {activePage === 'uniforms' && (
            <UniformsPage
              locality={locality}
              media={media}
              onOpenLocationModal={() => setLocationModalOpen(true)}
              onSubmitOrder={handleAddOrder}
              onNotifyToast={showToast}
            />
          )}

          {activePage === 'designs' && (
            <DesignsCatalogPage
              initialCategory={catalogCategory}
              initialSearch={catalogSearch}
              designs={designs}
              categories={categories}
              loading={storefrontLoading}
              wishlistIds={wishlistIds}
              onToggleWishlist={handleToggleWishlist}
              onSelectDesign={setSelectedDesign}
              onQuickAddDesign={handleAddDesignToCart}
            />
          )}

          {activePage === 'custom-stitching' && (
            <CustomStitchingPage
              locality={locality}
              tailors={tailors}
              platformServices={platformServices}
              media={media}
              fabricPreset={fabricPreset}
              onClearFabricPreset={() => setFabricPreset(null)}
              onOpenFabricCalculator={() => handleNavigate('fabric-calculator')}
              onOpenLocationModal={() => setLocationModalOpen(true)}
              onInspectTailor={(tailor, tab = 'services') =>
                setInspectedTailor({ tailor, tab })
              }
              onNavigate={handleNavigate}
              onSubmitOrder={handleAddOrder}
              onNotifyToast={showToast}
            />
          )}

          {activePage === 'fabric-calculator' && (
            <FabricCalculatorPage
              measurements={measurements}
              onProceedToBooking={(preset) => {
                setFabricPreset(preset);
                handleNavigate('custom-stitching');
                showToast('Fabric cut plan applied to your custom stitching booking.');
              }}
              onNavigate={handleNavigate}
              onNotifyToast={showToast}
            />
          )}

          {activePage === 'measurements' && (
            <MeasurementsPage
              profiles={measurements}
              media={media}
              onAddProfile={handleAddMeasurement}
              onDeleteProfile={handleDeleteMeasurement}
              onToggleConsent={handleToggleMeasurementConsent}
              onNavigate={handleNavigate}
              onOpenSupport={() => setSupportOpen(true)}
              onNotifyToast={showToast}
            />
          )}

          {activePage === 'nearby-shops' && (
            <NearbyShopsPage
              locality={locality}
              localities={localities}
              media={media}
              onUpdateLocality={setLocality}
              onCreateOrder={handleAddOrder}
              onNotifyToast={showToast}
            />
          )}

          {activePage === 'partner' && (
            <PartnerPortalPage
              tailors={tailors}
              orders={orders}
              onAdvanceOrderStage={handleAdvanceOrderStage}
              onInspectTailor={(tailor, tab = 'services') =>
                setInspectedTailor({ tailor, tab })
              }
              onNotifyToast={showToast}
            />
          )}
        </Suspense>
      </main>

      <Footer
        onNavigate={handleNavigate}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenReferral={() => setReferralOpen(true)}
        onNotifyToast={showToast}
      />

      {/* Modals & Slide-Over Drawers */}
      <LocationModal
        open={locationModalOpen}
        currentLocality={locality}
        localities={localities}
        onSelect={(loc) => {
          setLocality(loc);
          showToast(`Service location updated to ${loc}`);
        }}
        onChooseFromMap={() => {
          setLocationModalOpen(false);
          handleNavigate('nearby-shops');
        }}
        onClose={() => setLocationModalOpen(false)}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        promos={promos}
        locality={locality}
        defaultTailorName={tailors[0]?.shopName}
        defaultTailorId={tailors[0]?.dbId}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onCheckoutComplete={handleCheckoutComplete}
        onNotifyToast={showToast}
      />

      <WishlistDrawer
        open={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
        designs={designs}
        wishlistIds={wishlistIds}
        onToggleWishlist={handleToggleWishlist}
        onSelectDesign={setSelectedDesign}
      />

      <DesignDetailModal
        design={selectedDesign}
        onClose={() => setSelectedDesign(null)}
        onAddDesignToCart={handleAddDesignToCart}
        isWishlisted={selectedDesign ? wishlistIds.includes(selectedDesign.id) : false}
        onToggleWishlist={handleToggleWishlist}
      />

      <ReferralModal
        open={referralOpen}
        onClose={() => setReferralOpen(false)}
        onNotifyToast={showToast}
      />

      <SupportDrawer
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        locality={locality}
      />

      <TailorProfileModal
        tailor={inspectedTailor?.tailor || null}
        initialTab={inspectedTailor?.tab || 'services'}
        user={user}
        onRequireSignIn={() => handleNavigate('auth', { authMode: 'login' })}
        onNotifyToast={showToast}
        onReviewSubmitted={() => void refreshStorefront()}
        onClose={() => setInspectedTailor(null)}
        onBookTailor={(tailor, serviceId, note) => {
          setInspectedTailor(null);
          setQuickBookTailor({ tailor, serviceId, note });
        }}
      />

      <QuickBookModal
        tailor={quickBookTailor?.tailor || null}
        initialServiceId={quickBookTailor?.serviceId}
        initialNote={quickBookTailor?.note}
        locality={locality}
        onClose={() => setQuickBookTailor(null)}
        onConfirmBooking={handleAddOrder}
        onNotifyToast={showToast}
      />

      {/* Global Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#1A103D] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full shadow-xl border border-[#6B21D9]/40 flex items-center gap-2 max-w-[92vw]">
          <CheckCircle2 className="w-4 h-4 text-[#C4B5FD] shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

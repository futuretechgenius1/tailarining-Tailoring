import React, { useState, useCallback, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { INITIAL_MEASUREMENTS, INITIAL_ORDERS } from './data/catalogData';
import {
  AlterationService,
  AuthMode,
  CartItem,
  DesignProduct,
  MeasurementProfile,
  OrderLifecycleStage,
  OrderRecord,
  PageRoute,
  UserSession,
} from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { AlterationsPage } from './components/AlterationsPage';
import { UniformsPage } from './components/UniformsPage';
import { AuthPage } from './components/AuthPage';
import { DesignsCatalogPage } from './components/DesignsCatalogPage';
import { CustomStitchingPage } from './components/CustomStitchingPage';
import { MeasurementsPage } from './components/MeasurementsPage';
import { PartnerPortalPage } from './components/PartnerPortalPage';
import { NearbyShopsPage } from './components/NearbyShopsPage';
import { validateOrderTransition } from './utils/matchingRules';
import {
  CartDrawer,
  DesignDetailModal,
  LocationModal,
  ReferralModal,
  SupportDrawer,
  WishlistDrawer,
} from './components/OverlaysAndDrawers';

export default function App() {
  const [activePage, setActivePage] = useState<PageRoute>('home');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [locality, setLocality] = useState('Alkapur Township, Manikonda');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogSearch, setCatalogSearch] = useState('');

  // App Interactive State
  const [user, setUser] = useState<UserSession | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>(['des-02', 'des-03']);
  const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_ORDERS);
  const [measurements, setMeasurements] = useState<MeasurementProfile[]>(INITIAL_MEASUREMENTS);

  // Overlays & Modals
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<DesignProduct | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3200);
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

  const handleCheckoutComplete = useCallback(
    (newOrder: OrderRecord) => {
      setOrders((prev) => [newOrder, ...prev]);
      setCart([]);
      showToast(`Booking ${newOrder.id} confirmed! Free doorstep measurement scheduled.`);
    },
    [showToast],
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
  const handleAddOrder = useCallback((order: OrderRecord) => {
    setOrders((prev) => [order, ...prev]);
  }, []);

  const handleApproveQuote = useCallback(
    (orderId: string) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, quoteApproved: true, stage: 'Customer Approved' } : o,
        ),
      );
      showToast(`Quote for ${orderId} approved! Your tailor can now begin stitching.`);
    },
    [showToast],
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
  const handleAddMeasurement = useCallback((prof: MeasurementProfile) => {
    setMeasurements((prev) => [prof, ...prev]);
  }, []);

  const handleDeleteMeasurement = useCallback(
    (id: string) => {
      setMeasurements((prev) => prev.filter((p) => p.id !== id));
      showToast('Measurement profile deleted.');
    },
    [showToast],
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

  // Auth page renders full-bleed split screen (matching Screenshots 4 & 5)
  if (activePage === 'auth') {
    return (
      <>
        <AuthPage
          initialMode={authMode}
          locality={locality}
          onLoginSuccess={(session, redirectTo) => {
            setUser(session);
            showToast(`Welcome to Tailering, ${session.name}!`);
            handleNavigate(redirectTo || 'home');
          }}
          onBackHome={() => handleNavigate('home')}
          onNotifyToast={showToast}
        />
        {toastMsg && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#0B1F3A] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 max-w-[92vw]">
            <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
            <span className="truncate">{toastMsg}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0B1F3A]">
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
        onLogout={() => {
          setUser(null);
          showToast('Signed out of Tailering.');
        }}
      />

      <main className="flex-1">
        {activePage === 'home' && (
          <HomePage
            locality={locality}
            onOpenLocationModal={() => setLocationModalOpen(true)}
            onNavigate={handleNavigate}
            onCreateOrder={handleAddOrder}
            onNotifyToast={showToast}
          />
        )}

        {activePage === 'alterations' && (
          <AlterationsPage
            initialSearch={catalogSearch}
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
            onOpenLocationModal={() => setLocationModalOpen(true)}
            onSubmitOrder={handleAddOrder}
            onNotifyToast={showToast}
          />
        )}

        {activePage === 'designs' && (
          <DesignsCatalogPage
            initialCategory={catalogCategory}
            initialSearch={catalogSearch}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onSelectDesign={setSelectedDesign}
            onQuickAddDesign={handleAddDesignToCart}
          />
        )}

        {activePage === 'custom-stitching' && (
          <CustomStitchingPage
            locality={locality}
            onOpenLocationModal={() => setLocationModalOpen(true)}
            onSubmitOrder={handleAddOrder}
            onNotifyToast={showToast}
          />
        )}

        {activePage === 'measurements' && (
          <MeasurementsPage
            profiles={measurements}
            onAddProfile={handleAddMeasurement}
            onDeleteProfile={handleDeleteMeasurement}
            onToggleConsent={handleToggleMeasurementConsent}
            onNavigate={handleNavigate}
            onNotifyToast={showToast}
          />
        )}

        {activePage === 'nearby-shops' && (
          <NearbyShopsPage
            locality={locality}
            onUpdateLocality={setLocality}
            onCreateOrder={handleAddOrder}
            onNotifyToast={showToast}
          />
        )}

        {activePage === 'partner' && (
          <PartnerPortalPage
            orders={orders}
            onAdvanceOrderStage={handleAdvanceOrderStage}
            onNotifyToast={showToast}
          />
        )}
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
        onSelect={(loc) => {
          setLocality(loc);
          showToast(`Service location updated to ${loc}`);
        }}
        onClose={() => setLocationModalOpen(false)}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        locality={locality}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onCheckoutComplete={handleCheckoutComplete}
        onNotifyToast={showToast}
      />

      <WishlistDrawer
        open={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
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

      {/* Global Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#0B1F3A] text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 max-w-[92vw]">
          <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

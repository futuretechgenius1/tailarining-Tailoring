import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Scissors,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
} from 'lucide-react';
import { AuthMode, PageRoute, UserSession } from '../types';
import {
  authApi,
  BootstrapStatusResponse,
  mapAuthUserToSession,
  setAuthToken,
} from '../services/api';
import { TaileringLogo } from './TaileringLogo';

interface AuthPageProps {
  initialMode?: AuthMode;
  locality: string;
  onLoginSuccess: (session: UserSession, redirectTo?: PageRoute) => void;
  onBackHome: () => void;
  onNotifyToast: (msg: string) => void;
}

const PROCESS_STEPS = [
  {
    title: 'Browse & Customize',
    desc: 'Explore verified local tailors, services, and real-time pricing.',
    icon: Search,
    badgeClass: 'bg-[#0B7285]/25 text-[#5EEAD4] border border-[#0B7285]/40',
  },
  {
    title: 'Measure & Doorstep Pickup',
    desc: 'Schedule convenient home measurement & fabric pickup slots.',
    icon: Ruler,
    badgeClass: 'bg-[#C8922A]/20 text-[#E2B14B] border border-[#C8922A]/40',
  },
  {
    title: 'Quote Approval & Stitching',
    desc: 'Review transparent written quotes before master tailors cut fabric.',
    icon: Scissors,
    badgeClass: 'bg-[#0B7285]/25 text-[#5EEAD4] border border-[#0B7285]/40',
  },
  {
    title: 'Tracked Delivery & Receipts',
    desc: 'Live status timeline, digital payment receipts, and saved fit profiles.',
    icon: Truck,
    badgeClass: 'bg-[#C8922A]/20 text-[#E2B14B] border border-[#C8922A]/40',
  },
];

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  locality,
  onLoginSuccess,
  onBackHome,
  onNotifyToast,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'owner-setup'>(
    initialMode === 'signup' ? 'register' : 'login',
  );
  const [registerRole, setRegisterRole] = useState<'customer' | 'tailor'>('customer');

  const [bootstrap, setBootstrap] = useState<BootstrapStatusResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLocality, setRegLocality] = useState(locality);
  const [shopName, setShopName] = useState('');
  const [workingHours, setWorkingHours] = useState('10:00 AM – 08:30 PM');

  // First-Run App Owner Bootstrap State
  const [ownerSetupCode, setOwnerSetupCode] = useState('');

  useEffect(() => {
    authApi
      .bootstrapStatus()
      .then((res) => setBootstrap(res))
      .catch(() => {
        setBootstrap({
          dbConfigured: false,
          dbConnected: false,
          hasAppOwner: true,
          requiresSetupCode: false,
        });
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.login(identifier.trim(), password);
      setAuthToken(res.token);
      const session = mapAuthUserToSession(res.user);
      onLoginSuccess(session, 'dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: regPassword,
        role: registerRole,
        locality: regLocality.trim() || locality,
        shopName: registerRole === 'tailor' ? shopName.trim() : undefined,
        workingHours: registerRole === 'tailor' ? workingHours.trim() : undefined,
      });
      setAuthToken(res.token);
      const session = mapAuthUserToSession(res.user);
      onNotifyToast(
        registerRole === 'tailor'
          ? `Tailor shop "${shopName.trim()}" registered!`
          : `Welcome to Tailering, ${session.name}!`,
      );
      onLoginSuccess(session, 'dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.bootstrapOwner({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: regPassword,
        setupCode: ownerSetupCode.trim() || undefined,
      });
      setAuthToken(res.token);
      const session = mapAuthUserToSession(res.user);
      onNotifyToast('App Owner Console initialized and secured!');
      onLoginSuccess(session, 'dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'App Owner setup failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* LEFT PANEL */}
      <div className="relative overflow-hidden bg-[#0B1F3A] text-white px-6 sm:px-10 lg:px-14 py-8 sm:py-12 flex flex-col justify-between">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#0B7285]/25 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#C8922A]/15 blur-3xl pointer-events-none"
        />

        <div className="relative z-10">
          <button type="button" onClick={onBackHome} className="cursor-pointer">
            <TaileringLogo inverted />
          </button>
        </div>

        <div className="relative z-10 my-8 lg:my-0 max-w-md mx-auto w-full">
          <div className="mb-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E2B14B]">
              ROLE-BASED ATELIER PLATFORM
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif-accent">
              One Secure Account, Dedicated Dashboards
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300">
              Sign in as a Customer, Tailor Partner, or App Owner backed by live MySQL &amp; RBAC.
            </p>
          </div>

          <div className="relative space-y-3">
            {PROCESS_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative bg-white/[0.06] backdrop-blur-xs border border-white/10 rounded-2xl px-4 py-3.5 flex items-center gap-3.5"
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${step.badgeClass} flex items-center justify-center shrink-0`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-white font-serif-accent">
                      {step.title}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-300 leading-snug mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 pt-4 border-t border-white/10">
          <span>Encrypted Passwords · JWT Session · MySQL</span>
          <span className="text-[#E2B14B] font-semibold">RBAC Protected</span>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex flex-col items-center justify-center px-6 sm:px-10 py-10 sm:py-14 bg-[#F8FAFC] lg:bg-white">
        <div className="w-full max-w-[430px] space-y-5">
          {bootstrap && !bootstrap.dbConfigured && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Database Environment Secrets Required</p>
                <p className="mt-0.5 leading-relaxed">
                  Add <code className="font-mono">MYSQL_HOST</code>,{' '}
                  <code className="font-mono">MYSQL_PORT</code>,{' '}
                  <code className="font-mono">MYSQL_USER</code>,{' '}
                  <code className="font-mono">MYSQL_PASSWORD</code>, and{' '}
                  <code className="font-mono">MYSQL_DATABASE</code> in{' '}
                  <strong>Settings → Secrets</strong> to connect live MySQL authentication.
                </p>
              </div>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'login'
                  ? 'bg-white text-[#0B1F3A] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0B1F3A]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'register'
                  ? 'bg-white text-[#0B1F3A] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0B1F3A]'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* SIGN IN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#0B1F3A] font-serif-accent">
                  Welcome Back
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Automatically opens your Customer, Tailor, or App Owner Dashboard
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Email or Mobile Number
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="you@example.com or 9848012345"
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-4 py-3 text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-4 py-3 text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-[#0B1F3A] hover:bg-[#15325B] text-white font-bold text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Signing In...' : 'Sign In to Dashboard'}
              </button>

              {bootstrap?.dbConnected && !bootstrap.hasAppOwner && (
                <div className="pt-3 border-t border-dashed border-[#E2E8F0] text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('owner-setup');
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B7285] hover:underline cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    First-time setup? Claim App Owner Console
                  </button>
                </div>
              )}
            </form>
          )}

          {/* REGISTER FORM (CUSTOMER OR TAILOR) */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRegisterRole('customer')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    registerRole === 'customer'
                      ? 'border-[#0B7285] bg-[#F0F9FA]'
                      : 'border-[#E2E8F0] bg-white'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-[#0B7285] mb-1" />
                  <span className="block text-xs font-bold text-[#0B1F3A]">Customer</span>
                  <span className="block text-[10.5px] text-[#64748B]">Book &amp; track orders</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterRole('tailor')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    registerRole === 'tailor'
                      ? 'border-[#C8922A] bg-[#FBF5E6]'
                      : 'border-[#E2E8F0] bg-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#A67418] mb-1" />
                  <span className="block text-xs font-bold text-[#0B1F3A]">Tailor Partner</span>
                  <span className="block text-[10.5px] text-[#64748B]">Manage shop &amp; orders</span>
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="relative">
                  <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={
                      registerRole === 'tailor' ? 'Master Tailor Full Name' : 'Full Name'
                    }
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#0B1F3A]"
                  />
                </div>

                {registerRole === 'tailor' && (
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="Shop / Boutique Name"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#0B1F3A]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#0B1F3A]"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit Mobile"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#0B1F3A]"
                    />
                  </div>
                </div>

                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={regLocality}
                    onChange={(e) => setRegLocality(e.target.value)}
                    placeholder="Neighborhood / Locality"
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#0B1F3A]"
                  />
                </div>

                {registerRole === 'tailor' && (
                  <input
                    type="text"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="Working Hours (e.g. 10:00 AM – 08:30 PM)"
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A]"
                  />
                )}

                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create Password (min 8 characters)"
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#0B1F3A]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-[#0B7285] hover:bg-[#085463] text-white font-bold text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting
                  ? 'Creating Account...'
                  : registerRole === 'tailor'
                    ? 'Register Tailor Shop & Open Dashboard'
                    : 'Create Customer Account'}
              </button>
            </form>
          )}

          {/* FIRST-RUN APP OWNER SETUP */}
          {tab === 'owner-setup' && (
            <form onSubmit={handleOwnerBootstrap} className="space-y-3.5">
              <div className="rounded-xl bg-[#F0F9FA] border border-[#CBE7EC] p-3 text-xs text-[#0B1F3A]">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0B7285]" />
                  Initial App Owner Setup
                </p>
                <p className="text-[#475569] mt-0.5">
                  Create the primary App Owner account. This one-time setup locks automatically once claimed.
                </p>
              </div>

              <div className="space-y-2.5">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="App Owner Full Name"
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A]"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Owner Email Address"
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A]"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile Number (optional)"
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A]"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Choose Strong Password (min 8 chars)"
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A]"
                />
                {bootstrap?.requiresSetupCode && (
                  <input
                    type="password"
                    required
                    value={ownerSetupCode}
                    onChange={(e) => setOwnerSetupCode(e.target.value)}
                    placeholder="Server App Owner Setup Code"
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-sm text-[#0B1F3A]"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#0B1F3A] hover:bg-[#15325B] text-white font-bold text-sm cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Initializing...' : 'Create App Owner & Enter Console'}
              </button>
            </form>
          )}

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] hover:text-[#0B1F3A] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

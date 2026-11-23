import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Headphones,
  Lock,
  Mail,
  MapPin,
  Phone,
  Scissors,
  Settings,
  ShieldCheck,
  Store,
  Truck,
  User,
} from 'lucide-react';
import { AuthMode, PageRoute, StorefrontMediaMap, UserSession } from '../types';
import {
  authApi,
  BootstrapStatusResponse,
  mapAuthUserToSession,
  setAuthToken,
} from '../services/api';
import { SafeImage } from './SafeImage';
import { TaileringLogo } from './TaileringLogo';

interface AuthPageProps {
  initialMode?: AuthMode;
  locality: string;
  media?: StorefrontMediaMap;
  onLoginSuccess: (session: UserSession, redirectTo?: PageRoute) => void;
  onBackHome: () => void;
  onNotifyToast: (msg: string) => void;
}

type LoginRoleTab = 'customer' | 'tailor' | 'b2b' | 'admin';
type SignupRoleTab = 'customer' | 'tailor' | 'b2b';

const LOGIN_ROLE_OPTIONS: {
  id: LoginRoleTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  placeholder: string;
}[] = [
  {
    id: 'customer',
    label: 'Customer',
    icon: User,
    placeholder: 'Enter your email or mobile number',
  },
  {
    id: 'tailor',
    label: 'Tailor Partner',
    icon: Store,
    placeholder: 'Enter tailor partner email or mobile',
  },
  {
    id: 'b2b',
    label: 'Business (B2B)',
    icon: Building2,
    placeholder: 'Enter business email or mobile',
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Settings,
    placeholder: 'Enter app owner / admin email',
  },
];

const SIGNUP_ROLE_OPTIONS: {
  id: SignupRoleTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'customer', label: 'Customer', icon: User },
  { id: 'tailor', label: 'Tailor Partner', icon: Store },
  { id: 'b2b', label: 'Business (B2B)', icon: Building2 },
];

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  locality,
  media = {},
  onLoginSuccess,
  onBackHome,
  onNotifyToast,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'owner-setup'>(
    initialMode === 'signup' ? 'register' : 'login',
  );
  const [loginRole, setLoginRole] = useState<LoginRoleTab>('customer');
  const [signupRole, setSignupRole] = useState<SignupRoleTab>('customer');

  const [bootstrap, setBootstrap] = useState<BootstrapStatusResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const loginIdentifierRef = useRef<HTMLInputElement>(null);

  // Register State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [regLocality, setRegLocality] = useState(locality);
  const [shopName, setShopName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [workingHours] = useState('10:00 AM – 08:30 PM');

  // First-Run App Owner Bootstrap State
  const [ownerSetupCode, setOwnerSetupCode] = useState('');

  useEffect(() => {
    setTab(initialMode === 'signup' ? 'register' : 'login');
  }, [initialMode]);

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
      if (rememberMe) {
        try {
          window.localStorage.setItem('tailering_last_email', identifier.trim());
        } catch {
          // Ignore storage errors
        }
      }
      onLoginSuccess(
        session,
        loginRole === 'b2b' && session.role === 'customer' ? 'uniforms' : 'dashboard',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (regPassword.length < 8 || !/[A-Za-z]/.test(regPassword) || !/\d/.test(regPassword)) {
      setError('Password must be at least 8 characters with at least 1 letter and 1 number.');
      return;
    }

    if (regPassword !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    if (!agreedTerms) {
      setError('Please agree to the Terms & Conditions and Privacy Policy to continue.');
      return;
    }

    if (signupRole === 'tailor' && !shopName.trim()) {
      setError('Please enter your Tailor Shop / Boutique Name.');
      return;
    }

    setSubmitting(true);
    try {
      const backendRole = signupRole === 'tailor' ? 'tailor' : 'customer';
      const displayFullName =
        signupRole === 'b2b' && companyName.trim()
          ? `${fullName.trim()} (${companyName.trim()})`
          : fullName.trim();

      const res = await authApi.register({
        fullName: displayFullName,
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: regPassword,
        role: backendRole,
        locality: regLocality.trim() || locality,
        shopName: signupRole === 'tailor' ? shopName.trim() : undefined,
        workingHours: signupRole === 'tailor' ? workingHours.trim() : undefined,
      });
      setAuthToken(res.token);
      const session = mapAuthUserToSession(res.user);
      onNotifyToast(
        signupRole === 'tailor'
          ? `Tailor shop "${shopName.trim()}" registered!`
          : signupRole === 'b2b'
            ? `Business account created! Welcome to Tailering B2B.`
            : `Welcome to Tailering, ${session.name}!`,
      );
      onLoginSuccess(session, signupRole === 'b2b' ? 'uniforms' : 'dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (regPassword.length < 8 || !/[A-Za-z]/.test(regPassword) || !/\d/.test(regPassword)) {
      setError('Password must be at least 8 characters with at least 1 letter and 1 number.');
      return;
    }
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

  const handleSocialClick = (provider: 'Google' | 'Apple' | 'Facebook') => {
    onNotifyToast(
      `${provider} quick sign-in is coming soon — please sign in with your Tailering email or mobile number.`,
    );
    loginIdentifierRef.current?.focus();
  };

  const isSignInView = tab === 'login' || tab === 'owner-setup';
  const activeLoginRoleMeta =
    LOGIN_ROLE_OPTIONS.find((r) => r.id === loginRole) || LOGIN_ROLE_OPTIONS[0];

  const loginSideImage =
    media.authLoginMannequin || '/src/assets/images/auth_login_mannequin_1795430682920.jpg';
  const signupSideImage =
    media.authSignupMannequin || '/src/assets/images/auth_signup_mannequin_1795430684572.jpg';

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-[#FAF6FE] via-[#F7F0FC] to-[#F3EAFB] flex flex-col justify-between">
      {/* ====================================================================
          DEDICATED HIGH-RES MANNEQUIN STUDIO PANELS + PURPLE CURVED RIBBONS
          - Sign In: Left royal purple zari mannequin + silk fabrics & spools
          - Sign Up: Right cream linen mannequin + brocade fabric bolts
      ===================================================================== */}
      {isSignInView ? (
        <div
          aria-hidden="true"
          className="hidden lg:block pointer-events-none select-none fixed inset-y-0 left-0 w-[33%] xl:w-[35%] z-0 overflow-hidden"
        >
          <SafeImage
            src={loginSideImage}
            alt="Tailering royal purple silk saree mannequin"
            className="w-full h-full object-cover object-[48%_22%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#F7F0FC]/10 to-[#F8F2FD]" />
          <svg
            viewBox="0 0 240 900"
            preserveAspectRatio="none"
            className="absolute inset-y-0 right-0 h-full w-44 xl:w-56"
          >
            <defs>
              <linearGradient id="signInRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9333EA" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#C084FC" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#7E22CE" stopOpacity="0.68" />
              </linearGradient>
            </defs>
            <path d="M 240 0 L 145 0 C 35 200, 12 620, 190 900 L 240 900 Z" fill="#F8F2FD" />
            <path
              d="M 145 0 L 112 0 C 4 200, -18 620, 155 900 L 190 900 C 12 620, 35 200, 145 0 Z"
              fill="url(#signInRibbon)"
            />
          </svg>
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="hidden lg:block pointer-events-none select-none fixed inset-y-0 right-0 w-[32%] xl:w-[34%] z-0 overflow-hidden"
        >
          <SafeImage
            src={signupSideImage}
            alt="Tailering cream linen mannequin studio"
            className="w-full h-full object-cover object-[42%_22%]"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#F7F0FC]/10 to-[#F8F2FD]" />
          <svg
            viewBox="0 0 240 900"
            preserveAspectRatio="none"
            className="absolute inset-y-0 left-0 h-full w-44 xl:w-56"
          >
            <defs>
              <linearGradient id="signUpRibbon" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7E22CE" stopOpacity="0.68" />
                <stop offset="50%" stopColor="#C084FC" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#9333EA" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <path d="M 0 0 L 95 0 C 205 200, 228 620, 50 900 L 0 900 Z" fill="#F8F2FD" />
            <path
              d="M 95 0 L 128 0 C 236 200, 258 620, 85 900 L 50 900 C 228 620, 205 200, 95 0 Z"
              fill="url(#signUpRibbon)"
            />
          </svg>
        </div>
      )}

      {/* Compact Top Utility Strip */}
      <div className="relative z-20 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-3 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white border border-[#E6D8F6] text-xs font-bold text-[#3B1868] shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#6D1D9A]" />
          Back to Home
        </button>

        <div className="inline-flex items-center bg-white/90 p-0.5 rounded-full border border-[#E6D8F6] shadow-xs">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-gradient-to-r from-[#7B23B5] to-[#56148A] text-white shadow-xs'
                : 'text-[#4B3F6B] hover:text-[#6D1D9A]'
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
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-gradient-to-r from-[#7B23B5] to-[#56148A] text-white shadow-xs'
                : 'text-[#4B3F6B] hover:text-[#6D1D9A]'
            }`}
          >
            Sign Up
          </button>
        </div>
      </div>

      {/* ====================================================================
          MAIN SINGLE-VIEWPORT CENTERED AUTH CONTENT
      ===================================================================== */}
      <main
        className={`relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 ${
          isSignInView ? 'lg:pl-[25%] xl:pl-[24%]' : 'lg:pr-[24%] xl:pr-[22%]'
        }`}
      >
        <div className="w-full max-w-[515px] flex flex-col items-center">
          {/* Compact Brand Logo & Tagline */}
          <button
            type="button"
            onClick={onBackHome}
            className="flex flex-col items-center cursor-pointer focus:outline-none"
          >
            <TaileringLogo compact />
            <span className="mt-0.5 text-[11.5px] font-semibold text-[#1B1038]">
              Your Complete Tailoring Marketplace
            </span>
          </button>

          {/* Database Warning Banner if Env Missing */}
          {bootstrap && !bootstrap.dbConfigured && (
            <div className="mt-2.5 w-full rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11.5px] text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Configure MySQL secrets in <strong>Settings → Secrets</strong> for live database auth.
              </span>
            </div>
          )}

          {/* ==============================================================
              SIGN IN VIEW ("Welcome Back") — Fits 1 Desktop Screen Cleanly
          ============================================================== */}
          {tab === 'login' && (
            <motion.div
              key="login-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col items-center mt-2.5"
            >
              <h1 className="text-2xl sm:text-[32px] font-extrabold text-[#1B1038] tracking-tight text-center leading-tight">
                Welcome Back
              </h1>
              <p className="mt-1 text-xs sm:text-[13px] text-[#352A52] text-center max-w-sm leading-snug font-medium">
                Sign in to your Tailering account and manage your tailoring needs.
              </p>

              {/* 4-Role Selector Pill Bar */}
              <div className="mt-3 w-full bg-white/95 p-1 rounded-full border border-[#EAE0FA] shadow-[0_4px_18px_rgba(91,33,182,0.08)] flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
                {LOGIN_ROLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = loginRole === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setLoginRole(opt.id);
                        setError(null);
                      }}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? 'bg-gradient-to-r from-[#7B23B5] to-[#4E127D] text-white shadow-sm shadow-[#6D1D9A]/25'
                          : 'text-[#2E1A4D] hover:bg-[#F5EFFB] hover:text-[#6D1D9A]'
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          active ? 'text-white' : 'text-[#6D1D9A]'
                        }`}
                      />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Compact Elevated White Form Card */}
              <form
                onSubmit={handleLogin}
                className="mt-3 w-full bg-white/95 backdrop-blur-xs rounded-3xl border border-[#EFE6F9] shadow-[0_12px_36px_rgba(76,20,118,0.09)] px-5 py-4 sm:px-6 sm:py-5 space-y-3"
              >
                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-[11.5px] font-bold text-[#1B1038] mb-1"
                  >
                    Email or Mobile Number
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#5B4E7A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={loginIdentifierRef}
                      id="login-identifier"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={activeLoginRoleMeta.placeholder}
                      className="w-full bg-white border border-[#DCD2EC] focus:border-[#6D1D9A] focus:ring-2 focus:ring-[#6D1D9A]/15 rounded-xl pl-10 pr-4 py-2.5 text-[13.5px] text-[#1B1038] placeholder:text-[#8E7FA8] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-[11.5px] font-bold text-[#1B1038] mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#5B4E7A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-white border border-[#DCD2EC] focus:border-[#6D1D9A] focus:ring-2 focus:ring-[#6D1D9A]/15 rounded-xl pl-10 pr-10 py-2.5 text-[13.5px] text-[#1B1038] placeholder:text-[#8E7FA8] focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((s) => !s)}
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#5B4E7A] hover:text-[#6D1D9A] cursor-pointer"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setRememberMe((r) => !r)}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#1B1038] cursor-pointer"
                  >
                    <span
                      className={`w-4 h-4 rounded-[4px] flex items-center justify-center border transition-colors ${
                        rememberMe
                          ? 'bg-[#6D1D9A] border-[#6D1D9A] text-white'
                          : 'bg-white border-[#C9B8E6]'
                      }`}
                    >
                      {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    Remember me
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onNotifyToast(
                        'Password reset: contact support@tailering.in or your studio admin for instant account recovery.',
                      )
                    }
                    className="text-xs font-bold text-[#6D1D9A] hover:text-[#4E127D] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Primary Pill Sign In CTA */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-[#8628C2] via-[#6D1D9A] to-[#4E127D] hover:from-[#7B23B5] hover:to-[#3B0D63] text-white font-bold text-sm shadow-lg shadow-[#6D1D9A]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>{submitting ? 'Signing In...' : 'Sign In'}</span>
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>

                {/* Divider: or continue with */}
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-[#EAE0FA]" />
                  <span className="bg-white px-3 text-[11px] font-medium text-[#6B5E8A] whitespace-nowrap">
                    or continue with
                  </span>
                  <div className="w-full border-t border-[#EAE0FA]" />
                </div>

                {/* Social Sign In Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSocialClick('Google')}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-[#E4D9F4] bg-white hover:bg-[#FAF6FF] hover:border-[#C5AEEB] text-xs font-bold text-[#1B1038] transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                      />
                      <path
                        fill="#34A853"
                        d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                      />
                    </svg>
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialClick('Apple')}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-[#E4D9F4] bg-white hover:bg-[#FAF6FF] hover:border-[#C5AEEB] text-xs font-bold text-[#1B1038] transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M16.37 12.18c-.02-2.12 1.73-3.15 1.81-3.2-.99-1.45-2.52-1.64-3.06-1.66-1.3-.13-2.55.77-3.21.77-.67 0-1.69-.75-2.78-.73-1.43.02-2.75.83-3.49 2.11-1.49 2.58-.38 6.41 1.07 8.51.71 1.03 1.56 2.18 2.67 2.14 1.07-.04 1.48-.69 2.77-.69 1.3 0 1.66.69 2.79.67 1.15-.02 1.88-1.05 2.58-2.08.82-1.19 1.15-2.34 1.17-2.4-.03-.01-2.29-.88-2.32-3.44zM14.27 5.83c.59-.72.99-1.71.88-2.71-.85.03-1.88.57-2.49 1.28-.55.63-1.02 1.65-.89 2.62.95.07 1.91-.48 2.5-1.19z" />
                    </svg>
                    <span>Apple</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialClick('Facebook')}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border border-[#E4D9F4] bg-white hover:bg-[#FAF6FF] hover:border-[#C5AEEB] text-xs font-bold text-[#1B1038] transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="11" fill="#1877F2" />
                      <path
                        fill="#FFFFFF"
                        d="M15.12 12.67l.4-2.6h-2.5V8.38c0-.71.35-1.4 1.47-1.4h1.14V4.77s-1.03-.18-2.02-.18c-2.06 0-3.41 1.25-3.41 3.51v1.97H7.91v2.6h2.29V19a9.16 9.16 0 002.82 0v-6.33h2.1z"
                      />
                    </svg>
                    <span>Facebook</span>
                  </button>
                </div>

                {/* Switch to Sign Up */}
                <p className="text-center text-xs font-medium text-[#352A52]">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setTab('register');
                      setError(null);
                    }}
                    className="font-extrabold text-[#6D1D9A] underline underline-offset-2 hover:text-[#4E127D] cursor-pointer"
                  >
                    Sign Up
                  </button>
                </p>

                {bootstrap?.dbConnected && !bootstrap.hasAppOwner && (
                  <div className="pt-1.5 border-t border-dashed border-[#EAE0FA] text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setTab('owner-setup');
                        setError(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#6D1D9A] hover:underline cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      First-time setup? Claim App Owner Console
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          )}

          {/* ==============================================================
              SIGN UP VIEW ("Create Your Account") — Fits 1 Desktop Screen Cleanly
          ============================================================== */}
          {tab === 'register' && (
            <motion.div
              key="register-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col items-center mt-2.5"
            >
              <h1 className="text-2xl sm:text-[32px] font-extrabold text-[#1B1038] tracking-tight text-center leading-tight">
                Create Your <span className="text-[#6D1D9A]">Account</span>
              </h1>
              <p className="mt-1 text-xs sm:text-[13px] text-[#352A52] text-center max-w-md leading-snug font-medium">
                Join Tailering and get a seamless tailoring experience at your fingertips.
              </p>

              {/* 3-Role Selector Pill Bar */}
              <div className="mt-3 w-full max-w-[440px] bg-white/95 p-1 rounded-full border border-[#EAE0FA] shadow-[0_4px_18px_rgba(91,33,182,0.08)] flex items-center justify-between gap-1">
                {SIGNUP_ROLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = signupRole === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSignupRole(opt.id);
                        setError(null);
                      }}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? 'bg-gradient-to-r from-[#7B23B5] to-[#4E127D] text-white shadow-sm shadow-[#6D1D9A]/25'
                          : 'text-[#2E1A4D] hover:bg-[#F5EFFB] hover:text-[#6D1D9A]'
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          active ? 'text-white' : 'text-[#6D1D9A]'
                        }`}
                      />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Compact Elevated White Sign Up Card */}
              <form
                onSubmit={handleRegister}
                className="mt-3 w-full bg-white/95 backdrop-blur-xs rounded-3xl border border-[#EFE6F9] shadow-[0_12px_36px_rgba(76,20,118,0.09)] px-5 py-4 sm:px-6 sm:py-5 space-y-3"
              >
                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Row 1: Full Name + Mobile Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-fullname"
                      className="block text-[11.5px] font-bold text-[#1B1038] mb-1"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#5B4E7A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="reg-fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full bg-white border border-[#DCD2EC] focus:border-[#6D1D9A] focus:ring-2 focus:ring-[#6D1D9A]/15 rounded-xl pl-9 pr-3 py-2 text-[13.5px] text-[#1B1038] placeholder:text-[#8E7FA8] focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-phone"
                      className="block text-[11.5px] font-bold text-[#1B1038] mb-1"
                    >
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#5B4E7A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="reg-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter mobile number"
                        className="w-full bg-white border border-[#DCD2EC] focus:border-[#6D1D9A] focus:ring-2 focus:ring-[#6D1D9A]/15 rounded-xl pl-9 pr-3 py-2 text-[13.5px] text-[#1B1038] placeholder:text-[#8E7FA8] focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: Email Address */}
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-[11.5px] font-bold text-[#1B1038] mb-1"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#5B4E7A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full bg-white border border-[#DCD2EC] focus:border-[#6D1D9A] focus:ring-2 focus:ring-[#6D1D9A]/15 rounded-xl pl-9 pr-3 py-2 text-[13.5px] text-[#1B1038] placeholder:text-[#8E7FA8] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Conditional Role Fields (Only shown for Tailor Partner or Business B2B) */}
                {signupRole === 'tailor' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="reg-shopname"
                        className="block text-[11.5px] font-bold text-[#1B1038] mb-1"
                      >
                        Shop / Boutique Name
                      </label>
                      <div className="relative">
                        <Store className="w-4 h-4 text-[#5B4E7A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="reg-shopname"
                          type="text"
                          required
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          placeholder="e.g. Royal Silk Atelier"
                          className="w-full bg-white border border-[#DCD2EC] focus:border-[#6D1D9A] focus:ring-2 focus:ring-[#6D1D9A]/15 rounded-xl pl-9 pr-3 py-2 text-[13.5px] text-[#1B1038] placeholder:text-[#8E7FA8] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="reg-locality"
                        className="block text-[11.5px] font-bold text-[#1B1038] mb-1"
                      >
                        Locality / Area
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-[#5B4E7A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="reg-locality"
                          type="text"
                          required
                          value={regLocality}
                          onChange={(e) => setRegLocality(e.target.value)}
                          placeholder="Alkapur Township, Manikonda"
                          className="w-full bg-white border border-[#DCD2EC] focus:border-[#6D1D9A] focus:ring-2 focus:ring-[#6D1D9A]/15 rounded-xl pl-9 pr-3 py-2 text-[13.5px] text-[#1B1038] placeholder:text-[#8E7FA8] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {signupRole === 'b2b' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="reg-company"
                        className="block text-[11.5px] font-bold text-[#1B1038] mb-1"
                      >
                        Company / School Name
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-[#5B4E7A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="reg-company"
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Organization name"
                          className="w-full bg-white border border-[#DCD2EC] focus:border-[#6D1D9A] focus:ring-2 focus:ring-[#6D1D9A]/15 rounded-xl pl-9 pr-3 py-2 text-[13.5px] text-[#1B1038] placeholder:text-[#8E7FA8] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="reg-b2b-locality"
                        className="block text-[11.5px] font-bold text-[#1B1038] mb-1"
                      >
                        City / Location
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-[#5B4E7A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="reg-b2b-locality"
                          type="text"
                          value={regLocality}
                          onChange={(e) => setRegLocality(e.target.value)}
                          placeholder="Hyderabad"
                          className="w-full bg-white border border-[#DCD2EC] focus:border-[#6D1D9A] focus:ring-2 focus:ring-[#6D1D9A]/15 rounded-xl pl-9 pr-3 py-2 text-[13.5px] text-[#1B1038] placeholder:text-[#8E7FA8] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Row 3: Password + Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-password"
                      className="block text-[11.5px] font-bold text-[#1B1038] mb-1"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#5B4E7A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create a password"
                        className="w-full bg-white border border-[#DCD2EC] focus:border-[#6D1D9A] focus:ring-2 focus:ring-[#6D1D9A]/15 rounded-xl pl-9 pr-9 py-2 text-[13.5px] text-[#1B1038] placeholder:text-[#8E7FA8] focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((s) => !s)}
                        aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5B4E7A] hover:text-[#6D1D9A] cursor-pointer"
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-confirm-password"
                      className="block text-[11.5px] font-bold text-[#1B1038] mb-1"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#5B4E7A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="reg-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="w-full bg-white border border-[#DCD2EC] focus:border-[#6D1D9A] focus:ring-2 focus:ring-[#6D1D9A]/15 rounded-xl pl-9 pr-9 py-2 text-[13.5px] text-[#1B1038] placeholder:text-[#8E7FA8] focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5B4E7A] hover:text-[#6D1D9A] cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Terms & Privacy Checkbox */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAgreedTerms((v) => !v)}
                    aria-label="Agree to Terms and Conditions and Privacy Policy"
                    className={`w-4 h-4 rounded-[4px] flex items-center justify-center border shrink-0 transition-colors cursor-pointer ${
                      agreedTerms
                        ? 'bg-[#6D1D9A] border-[#6D1D9A] text-white'
                        : 'bg-white border-[#C9B8E6]'
                    }`}
                  >
                    {agreedTerms && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                  <p className="text-[11.5px] font-medium text-[#2E1A4D] leading-snug">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() =>
                        onNotifyToast(
                          'Terms & Conditions: Stitching starts only after customer approves final quote & delivery date.',
                        )
                      }
                      className="font-bold text-[#6D1D9A] underline underline-offset-2 hover:text-[#4E127D] cursor-pointer"
                    >
                      Terms &amp; Conditions
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() =>
                        onNotifyToast(
                          'Privacy Policy: Measurements & customer addresses stay encrypted and masked until tailor assignment.',
                        )
                      }
                      className="font-bold text-[#6D1D9A] underline underline-offset-2 hover:text-[#4E127D] cursor-pointer"
                    >
                      Privacy Policy
                    </button>
                  </p>
                </div>

                {/* Primary Pill Create Account CTA */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-[#8628C2] via-[#6D1D9A] to-[#4E127D] hover:from-[#7B23B5] hover:to-[#3B0D63] text-white font-bold text-sm shadow-lg shadow-[#6D1D9A]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>{submitting ? 'Creating Account...' : 'Create Account'}</span>
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>

                {/* Switch to Sign In */}
                <p className="text-center text-xs font-medium text-[#352A52]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setError(null);
                    }}
                    className="font-extrabold text-[#6D1D9A] underline underline-offset-2 hover:text-[#4E127D] cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              </form>
            </motion.div>
          )}

          {/* ==============================================================
              FIRST-RUN APP OWNER BOOTSTRAP VIEW
          ============================================================== */}
          {tab === 'owner-setup' && (
            <motion.div
              key="owner-setup-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col items-center mt-3"
            >
              <h1 className="text-2xl sm:text-[30px] font-extrabold text-[#1B1038] tracking-tight text-center">
                Claim <span className="text-[#6D1D9A]">App Owner</span> Console
              </h1>
              <p className="mt-1 text-xs text-[#352A52] text-center max-w-sm">
                One-time initialization to secure your Tailering marketplace administration.
              </p>

              <form
                onSubmit={handleOwnerBootstrap}
                className="mt-3 w-full bg-white/95 rounded-3xl border border-[#EFE6F9] shadow-[0_12px_36px_rgba(76,20,118,0.09)] p-5 space-y-3"
              >
                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                    {error}
                  </div>
                )}

                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="App Owner Full Name"
                  className="w-full bg-white border border-[#DCD2EC] rounded-xl px-3.5 py-2.5 text-sm text-[#1B1038] focus:outline-none focus:border-[#6D1D9A]"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Owner Email Address"
                  className="w-full bg-white border border-[#DCD2EC] rounded-xl px-3.5 py-2.5 text-sm text-[#1B1038] focus:outline-none focus:border-[#6D1D9A]"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile Number (optional)"
                  className="w-full bg-white border border-[#DCD2EC] rounded-xl px-3.5 py-2.5 text-sm text-[#1B1038] focus:outline-none focus:border-[#6D1D9A]"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Strong Password (8+ chars, letter & number)"
                  className="w-full bg-white border border-[#DCD2EC] rounded-xl px-3.5 py-2.5 text-sm text-[#1B1038] focus:outline-none focus:border-[#6D1D9A]"
                />
                {bootstrap?.requiresSetupCode && (
                  <input
                    type="password"
                    required
                    value={ownerSetupCode}
                    onChange={(e) => setOwnerSetupCode(e.target.value)}
                    placeholder="Server App Owner Setup Code"
                    className="w-full bg-white border border-[#DCD2EC] rounded-xl px-3.5 py-2.5 text-sm text-[#1B1038] focus:outline-none focus:border-[#6D1D9A]"
                  />
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#8628C2] via-[#6D1D9A] to-[#4E127D] text-white font-bold text-sm shadow-lg shadow-[#6D1D9A]/30 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Initializing...' : 'Create App Owner & Enter Console'}
                </button>

                <p className="text-center text-xs text-[#5B4E7A]">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setError(null);
                    }}
                    className="font-bold text-[#6D1D9A] hover:underline cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </p>
              </form>
            </motion.div>
          )}
        </div>
      </main>

      {/* ====================================================================
          COMPACT BOTTOM TRUST STRIPS (Sized to Keep 1-Screen Desktop Fit)
      ===================================================================== */}
      {isSignInView ? (
        <div className="relative z-10 w-full shrink-0">
          <svg
            aria-hidden="true"
            viewBox="0 0 1440 42"
            preserveAspectRatio="none"
            className="block w-full h-5 sm:h-7 -mb-px"
          >
            <path d="M0,18 C320,46 820,-6 1440,26 L1440,42 L0,42 Z" fill="#5B178E" />
          </svg>
          <div className="bg-gradient-to-r from-[#6D1D9A] via-[#5B178E] to-[#3B0D63] text-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:divide-x sm:divide-white/20">
              <div className="flex items-center justify-center gap-2 text-center">
                <ShieldCheck className="w-5 h-5 text-white/95 stroke-[1.7] shrink-0" />
                <span className="text-[11.5px] font-semibold text-white/95">Verified Tailors</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-center">
                <Truck className="w-5 h-5 text-white/95 stroke-[1.7] shrink-0" />
                <span className="text-[11.5px] font-semibold text-white/95">Doorstep Pickup</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-center">
                <Lock className="w-5 h-5 text-white/95 stroke-[1.7] shrink-0" />
                <span className="text-[11.5px] font-semibold text-white/95">Secure Payments</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-center">
                <Headphones className="w-5 h-5 text-white/95 stroke-[1.7] shrink-0" />
                <span className="text-[11.5px] font-semibold text-white/95">24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-3 pt-1 shrink-0">
          <div className="rounded-2xl bg-[#EFE6FA]/92 backdrop-blur-xs border border-[#E2D2F7] px-4 py-3 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:divide-x sm:divide-[#D8C5F2]">
              <div className="flex items-center justify-center gap-2 text-left">
                <svg
                  className="w-5 h-5 text-[#6D1D9A] shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 3h6l-1 5 4 11H6l4-11-1-5Z" />
                  <path d="M9 8h6" />
                </svg>
                <span className="text-[11.5px] font-bold text-[#1B1038] leading-tight">
                  Browse Trendy
                  <br />
                  Designs
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-left">
                <Scissors className="w-5 h-5 text-[#6D1D9A] stroke-[1.75] shrink-0" />
                <span className="text-[11.5px] font-bold text-[#1B1038] leading-tight">
                  Book Verified
                  <br />
                  Tailors
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-left">
                <Truck className="w-5 h-5 text-[#6D1D9A] stroke-[1.75] shrink-0" />
                <span className="text-[11.5px] font-bold text-[#1B1038] leading-tight">
                  Pickup &amp;
                  <br />
                  Delivery
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-left">
                <svg
                  className="w-5 h-5 text-[#6D1D9A] shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 17h18v3H3z" />
                  <path d="M6 17V9a2 2 0 0 1 2-2h7a3 3 0 0 1 3 3v7" />
                  <path d="M10 11v3" />
                  <circle cx="15" cy="11" r="1" />
                </svg>
                <span className="text-[11.5px] font-bold text-[#1B1038] leading-tight">
                  Custom
                  <br />
                  Stitching
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

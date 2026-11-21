import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Mail,
  Phone,
  Ruler,
  Scissors,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { AuthMode, PageRoute, UserRole, UserSession } from '../types';
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
    desc: 'Explore curated couture styles or upload your reference design.',
    icon: Search,
    badgeClass: 'bg-[#0B7285]/25 text-[#5EEAD4] border border-[#0B7285]/40',
  },
  {
    title: 'Measure & Doorstep Pickup',
    desc: 'Complimentary home measurement & fabric pickup by master tailors.',
    icon: Ruler,
    badgeClass: 'bg-[#C8922A]/20 text-[#E2B14B] border border-[#C8922A]/40',
  },
  {
    title: 'Artisanal Stitching',
    desc: 'Verified master craftspeople tailor your garment with precision.',
    icon: Scissors,
    badgeClass: 'bg-[#0B7285]/25 text-[#5EEAD4] border border-[#0B7285]/40',
  },
  {
    title: 'Insured Delivery & Refit',
    desc: 'Delivered ready-to-wear with a 7-day complimentary doorstep refit.',
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
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminCode, setAdminCode] = useState('');

  const handleGetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) {
      if (phone.length < 10) {
        onNotifyToast('Please enter a valid 10-digit mobile number.');
        return;
      }
      setOtpSent(true);
      onNotifyToast('6-digit OTP sent! Use any 6 digits (e.g. 123456) to verify.');
      return;
    }

    if (otpValue.length < 4) {
      onNotifyToast('Please enter the verification OTP.');
      return;
    }

    onLoginSuccess(
      {
        name: 'Ananya Sharma',
        phone: `+91 ${phone}`,
        role: 'customer',
        locality,
      },
      'home',
    );
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      onNotifyToast('Please enter your email address.');
      return;
    }
    const namePart = email.split('@')[0];
    onLoginSuccess(
      {
        name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
        email,
        role: 'customer',
        locality,
      },
      'home',
    );
  };

  const handleGoogleSignIn = () => {
    onLoginSuccess(
      {
        name: 'Priya Reddy',
        email: 'priya.reddy@gmail.com',
        role: 'customer',
        locality,
      },
      'home',
    );
  };

  const handleRoleSelect = (role: UserRole) => {
    if (role === 'tailor') {
      onLoginSuccess(
        {
          name: 'Radhika Designer Boutique',
          phone: '+91 98480 12345',
          role: 'tailor',
          locality,
        },
        'partner',
      );
    } else if (role === 'admin') {
      onLoginSuccess(
        {
          name: 'Tailering Ops Admin',
          email: 'ops@tailering.in',
          role: 'admin',
          locality,
        },
        'partner',
      );
    } else {
      setMode('login');
      onNotifyToast('Create your Tailering Customer account with Google or Mobile OTP.');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCode.trim()) {
      onNotifyToast('Enter an invite code (e.g. TAILERING2026) to access Admin Dashboard.');
      return;
    }
    handleRoleSelect('admin');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* LEFT PANEL: Deep Midnight Royal Navy Editorial Atelier Panel */}
      <div className="relative overflow-hidden bg-[#0B1F3A] text-white px-6 sm:px-10 lg:px-14 py-8 sm:py-12 flex flex-col justify-between">
        {/* Subtle Gold & Teal Atelier Ambient Glows */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#0B7285]/25 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#C8922A]/15 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="hidden sm:block absolute inset-0 atelier-grid-pattern opacity-15 pointer-events-none"
        />

        {/* Brand Mark Top Left */}
        <div className="relative z-10">
          <button type="button" onClick={onBackHome} className="cursor-pointer">
            <TaileringLogo inverted />
          </button>
        </div>

        {/* Center Process Steps */}
        <div className="relative z-10 my-8 lg:my-0 max-w-md mx-auto w-full">
          <div className="mb-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E2B14B]">
              BESPOKE ATELIER WORKFLOW
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif-accent">
              The Tailering Process
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300">
              Experience couture-grade doorstep tailoring in four seamless steps.
            </p>
          </div>

          <div className="relative space-y-3">
            {/* Vertical Connecting Line */}
            <div
              aria-hidden="true"
              className="absolute left-[29px] top-6 bottom-6 w-[1px] bg-gradient-to-b from-[#5EEAD4]/40 via-[#E2B14B]/40 to-[#5EEAD4]/20"
            />

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
          <span>Trusted by 1,000+ households across Hyderabad</span>
          <span className="text-[#E2B14B] font-semibold">4.9 ★ Rated</span>
        </div>
      </div>

      {/* RIGHT PANEL: Login OR Join Tailering Role Selector */}
      <div className="flex flex-col items-center justify-center px-6 sm:px-10 py-10 sm:py-14 bg-[#F8FAFC] lg:bg-white">
        <div className="w-full max-w-[410px]">
          {mode === 'login' ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B7285]">
                  MEMBER ACCESS
                </p>
                <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#0B1F3A] font-serif-accent">
                  Welcome Back
                </h2>
                <p className="mt-1.5 text-sm text-[#64748B]">Sign in to your Tailering account</p>
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F0F9FA] hover:border-[#0B7285] text-[#0B1F3A] font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4-3.1z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4 3.1c.95-2.84 3.6-4.95 6.72-4.95z"
                  />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-[#E2E8F0]" />
                <span className="bg-[#F8FAFC] lg:bg-white px-3 text-[10.5px] font-bold uppercase tracking-widest text-[#64748B] whitespace-nowrap">
                  OR SIGN IN WITH
                </span>
                <div className="w-full border-t border-[#E2E8F0]" />
              </div>

              {/* Phone | Email Segmented Control */}
              <div className="grid grid-cols-2 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  className={`py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    loginMethod === 'phone'
                      ? 'bg-white text-[#0B1F3A] shadow-2xs'
                      : 'text-[#64748B] hover:text-[#0B1F3A]'
                  }`}
                >
                  Phone OTP
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={`py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    loginMethod === 'email'
                      ? 'bg-white text-[#0B1F3A] shadow-2xs'
                      : 'text-[#64748B] hover:text-[#0B1F3A]'
                  }`}
                >
                  Email
                </button>
              </div>

              {loginMethod === 'phone' ? (
                <form onSubmit={handleGetOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#0B1F3A]">Mobile Number</label>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      We&apos;ll send a 6-digit OTP to verify your number.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <select
                      aria-label="Country code"
                      className="bg-white border border-[#CBD5E1] rounded-xl px-3 py-3 text-sm font-semibold text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                    >
                      <option value="+91">+91</option>
                    </select>
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-4 py-3 text-sm text-[#0B1F3A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0B7285]"
                      />
                    </div>
                  </div>

                  {otpSent && (
                    <div>
                      <label className="block text-xs font-bold text-[#334155] mb-1">
                        Enter 6-Digit OTP
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 123456"
                        className="w-full bg-[#F0F9FA] border border-[#0B7285]/40 rounded-xl px-4 py-3 text-sm font-bold tracking-[0.35em] text-center text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-[#0B1F3A] hover:bg-[#15325B] text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
                  >
                    {otpSent ? 'Verify & Sign In' : 'Get OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-4 py-3 text-sm text-[#0B1F3A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0B7285]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-[#0B1F3A] hover:bg-[#15325B] text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                </form>
              )}

              <div className="text-center space-y-2.5 pt-2">
                <p className="text-xs text-[#64748B]">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="font-bold text-[#0B7285] hover:underline cursor-pointer"
                  >
                    Sign up
                  </button>
                </p>
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
          ) : (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0B1F3A] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to login
              </button>

              <div className="text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B7285]">
                  GET STARTED
                </p>
                <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#0B1F3A] font-serif-accent">
                  Join Tailering
                </h2>
                <p className="mt-1.5 text-sm text-[#64748B]">
                  Choose how you want to use our bespoke platform
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Customer Card */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect('customer')}
                  className="w-full bg-white hover:bg-[#F0F9FA] border border-[#E2E8F0] hover:border-[#0B7285]/50 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#F0F9FA] border border-[#CBE7EC] text-[#0B7285] flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#0B1F3A] font-serif-accent">
                        Customer
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Book custom stitching, bridal couture &amp; doorstep alterations
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0B7285] group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* Tailor / Shop Card */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect('tailor')}
                  className="w-full bg-white hover:bg-[#FBF5E6]/70 border border-[#E2E8F0] hover:border-[#C8922A]/50 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#FBF5E6] border border-[#F0DFA8] text-[#A67418] flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#0B1F3A] font-serif-accent">
                        Tailor / Boutique Partner
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Manage custom orders, quotes, and weekly settlements
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#C8922A] group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>

              <div className="pt-4 border-t border-dashed border-[#E2E8F0] text-center space-y-3">
                {!showAdminInput ? (
                  <button
                    type="button"
                    onClick={() => setShowAdminInput(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0B7285] cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#64748B]" />
                    Have an admin invite code?
                  </button>
                ) : (
                  <form onSubmit={handleAdminSubmit} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      placeholder="Invite code (e.g. TAILERING2026)"
                      className="flex-1 bg-white border border-[#CBD5E1] rounded-xl px-3.5 py-2 text-xs text-[#0B1F3A] focus:outline-none focus:border-[#0B7285]"
                    />
                    <button
                      type="submit"
                      className="bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Verify
                    </button>
                  </form>
                )}

                <div>
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
          )}
        </div>
      </div>
    </div>
  );
};

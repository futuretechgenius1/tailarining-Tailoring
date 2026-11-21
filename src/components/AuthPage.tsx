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
import { StitchMateLogo } from './StitchMateLogo';

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
    desc: 'Explore curated styles or upload your reference design.',
    icon: Search,
    color: 'text-[#E11D48] bg-[#FFF1F2]',
  },
  {
    title: 'Measure and Pickup',
    desc: 'Home measurement collection & doorstep fabric pickup.',
    icon: Ruler,
    color: 'text-[#EA580C] bg-[#FFF7ED]',
  },
  {
    title: 'Expert Stitching',
    desc: 'Master tailors handcraft your garment with precision.',
    icon: Scissors,
    color: 'text-[#D97706] bg-[#FEF3C7]',
  },
  {
    title: 'Secure Delivery',
    desc: 'Your perfectly fitted custom outfit delivered.',
    icon: Truck,
    color: 'text-[#E11D48] bg-[#FFF1F2]',
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
          name: 'StitchMate Ops Admin',
          email: 'ops@stitchmate.in',
          role: 'admin',
          locality,
        },
        'partner',
      );
    } else {
      setMode('login');
      onNotifyToast('Create your StitchMate Customer account with Google or Mobile OTP.');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCode.trim()) {
      onNotifyToast('Enter an invite code (e.g. STITCH2026) to access Admin Dashboard.');
      return;
    }
    handleRoleSelect('admin');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* LEFT PANEL: Warm Peach-to-Gold Gradient with The StitchMate Process (Exact match to Screenshots 4 & 5) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FFF1E6] via-[#FFE5CC] to-[#FFD8AE] px-6 sm:px-10 lg:px-14 py-8 sm:py-12 flex flex-col justify-between">
        {/* Decorative Corner Dot Patterns */}
        <div
          aria-hidden="true"
          className="hidden sm:block absolute top-14 right-10 w-28 h-28 dot-pattern-peach opacity-70 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="hidden sm:block absolute bottom-12 left-8 w-28 h-28 dot-pattern-peach opacity-70 pointer-events-none"
        />

        {/* Brand Mark Top Left */}
        <div className="relative z-10">
          <button type="button" onClick={onBackHome} className="cursor-pointer">
            <StitchMateLogo />
          </button>
        </div>

        {/* Center Process Steps */}
        <div className="relative z-10 my-8 lg:my-0 max-w-md mx-auto w-full">
          <div className="text-center mb-7">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#E11D48] via-[#EA580C] to-[#D97706] bg-clip-text text-transparent">
              The StitchMate Process
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm font-medium text-[#57534E]">
              Experience premium tailoring in 4 simple steps.
            </p>
          </div>

          <div className="relative space-y-3.5">
            {/* Vertical Connecting Line */}
            <div
              aria-hidden="true"
              className="absolute left-7 top-6 bottom-6 w-[1.5px] bg-[#EA580C]/20"
            />

            {PROCESS_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative bg-white/65 backdrop-blur-sm border border-white/80 rounded-2xl px-4 py-3.5 flex items-center gap-3.5 shadow-2xs"
                >
                  <div
                    className={`w-9 h-9 rounded-full ${step.color} flex items-center justify-center shrink-0 shadow-2xs`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-[#1C1917] font-serif-accent">
                      {step.title}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-[#57534E] leading-snug mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-[#78716C] text-center lg:text-left">
          Trusted by 1,000+ households across Hyderabad
        </div>
      </div>

      {/* RIGHT PANEL: Login OR Join StitchMate Role Selector */}
      <div className="flex flex-col items-center justify-center px-6 sm:px-10 py-10 sm:py-14 bg-white">
        <div className="w-full max-w-[410px]">
          {mode === 'login' ? (
            /* SCREENSHOT 4: WELCOME BACK LOGIN */
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917]">Welcome Back</h2>
                <p className="mt-1.5 text-sm text-[#78716C]">Sign in to your StitchMate account</p>
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-full border-2 border-[#FB923C] hover:bg-[#FFF7ED] text-[#EA580C] font-bold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
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
                <div className="w-full border-t border-[#F0EAE3]" />
                <span className="bg-white px-3 text-[10.5px] font-bold uppercase tracking-widest text-[#78716C] whitespace-nowrap">
                  OR SIGN IN WITH
                </span>
                <div className="w-full border-t border-[#F0EAE3]" />
              </div>

              {/* Phone | Email Segmented Control */}
              <div className="grid grid-cols-2 bg-[#F7F5F3] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  className={`py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    loginMethod === 'phone'
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  Phone
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={`py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    loginMethod === 'email'
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  Email
                </button>
              </div>

              {loginMethod === 'phone' ? (
                <form onSubmit={handleGetOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1C1917]">Mobile Number</label>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      We&apos;ll send a 6-digit OTP to verify your number.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <select
                      aria-label="Country code"
                      className="bg-white border border-[#E7E5E4] rounded-xl px-3 py-3 text-sm font-semibold text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
                    >
                      <option value="+91">+91</option>
                    </select>
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-[#A8A29E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full bg-white border border-[#E7E5E4] rounded-xl pl-10 pr-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
                      />
                    </div>
                  </div>

                  {otpSent && (
                    <div>
                      <label className="block text-xs font-bold text-[#44403C] mb-1">
                        Enter 6-Digit OTP
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 123456"
                        className="w-full bg-[#FFF9F2] border border-[#FED7AA] rounded-xl px-4 py-3 text-sm font-bold tracking-[0.35em] text-center text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#FB923C] via-[#F97316] to-[#F59E0B] hover:from-[#EA580C] hover:to-[#D97706] text-white font-extrabold text-sm shadow-md shadow-[#F97316]/25 transition-all cursor-pointer"
                  >
                    {otpSent ? 'Verify & Sign In' : 'Get OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#44403C] mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#A8A29E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-white border border-[#E7E5E4] rounded-xl pl-10 pr-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#44403C] mb-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-[#E7E5E4] rounded-xl px-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#FB923C] via-[#F97316] to-[#F59E0B] hover:from-[#EA580C] hover:to-[#D97706] text-white font-extrabold text-sm shadow-md transition-all cursor-pointer"
                  >
                    Sign In
                  </button>
                </form>
              )}

              <div className="text-center space-y-2.5 pt-2">
                <p className="text-xs text-[#78716C]">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="font-bold text-[#EA580C] hover:underline cursor-pointer"
                  >
                    Sign up
                  </button>
                </p>
                <button
                  type="button"
                  onClick={onBackHome}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#78716C] hover:text-[#1C1917] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Home
                </button>
              </div>
            </div>
          ) : (
            /* SCREENSHOT 5: JOIN STITCHMATE ROLE SELECTION */
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to login
              </button>

              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
                  Join StitchMate
                </h2>
                <p className="mt-1.5 text-sm text-[#78716C]">
                  Choose how you want to use our platform
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Customer Card */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect('customer')}
                  className="w-full bg-white hover:bg-[#FFF9F2] border border-[#EFE6DC] hover:border-[#FED7AA] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#DCFCE7] text-[#059669] flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1C1917] font-serif-accent">
                        Customer
                      </h3>
                      <p className="text-xs text-[#78716C] mt-0.5">
                        Shop custom clothes and custom fittings
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#A8A29E] group-hover:text-[#EA580C] group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* Tailor / Shop Card */}
                <button
                  type="button"
                  onClick={() => handleRoleSelect('tailor')}
                  className="w-full bg-white hover:bg-[#FFF9F2] border border-[#EFE6DC] hover:border-[#FED7AA] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1C1917] font-serif-accent">
                        Tailor / Shop
                      </h3>
                      <p className="text-xs text-[#78716C] mt-0.5">
                        Manage your custom tailoring business
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#A8A29E] group-hover:text-[#EA580C] group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>

              <div className="pt-4 border-t border-dashed border-[#E7E5E4] text-center space-y-3">
                {!showAdminInput ? (
                  <button
                    type="button"
                    onClick={() => setShowAdminInput(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57534E] hover:text-[#EA580C] cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#78716C]" />
                    Have an admin invite code?
                  </button>
                ) : (
                  <form onSubmit={handleAdminSubmit} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      placeholder="Invite code (e.g. STITCH2026)"
                      className="flex-1 bg-[#FAF7F5] border border-[#E7DDD2] rounded-xl px-3.5 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
                    />
                    <button
                      type="submit"
                      className="bg-[#1C1917] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Verify
                    </button>
                  </form>
                )}

                <div>
                  <button
                    type="button"
                    onClick={onBackHome}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#78716C] hover:text-[#1C1917] cursor-pointer"
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

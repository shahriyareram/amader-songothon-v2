import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  Info,
  X,
  Mail,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { Member } from '../types';
import {
  AUTHORIZED_ADMIN_RECOVERY_EMAILS,
  requestGoogleAccessToken,
} from '../lib/googleAuth';

interface LoginScreenProps {
  members: Member[];
  onLogin: (
    identifier: string,
    password?: string
  ) => { success: boolean; error?: string } | Promise<{ success: boolean; error?: string }>;
  onBackToSplash?: () => void;
}

// Storage key for remembered login credentials
const STORAGE_REMEMBER_USER = 'amader_shongothon_remember_user_v1';

// Safe client-side credential encoding helper
const encodeCredential = (val: string): string => {
  try {
    return btoa(encodeURIComponent(val));
  } catch {
    return val;
  }
};

const decodeCredential = (val: string): string => {
  try {
    return decodeURIComponent(atob(val));
  } catch {
    return val;
  }
};

export const LoginScreen: React.FC<LoginScreenProps> = ({
  members,
  onLogin,
  onBackToSplash,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotPasswordInfo, setShowForgotPasswordInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Admin Gmail OTP Password Recovery State
  const [showAdminRecoveryModal, setShowAdminRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState<string>(AUTHORIZED_ADMIN_RECOVERY_EMAILS[0]);
  const [recoveryStep, setRecoveryStep] = useState<'select' | 'otp' | 'new_password'>('select');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryResetToken, setRecoveryResetToken] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  // Load remembered credentials safely on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REMEMBER_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.rememberMe) {
          setIdentifier(parsed.identifier || '');
          setPassword(parsed.password ? decodeCredential(parsed.password) : '');
          setRememberMe(true);
          return;
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  // Handle Gmail OTP Password Recovery Flow
  const handleSendOtp = async () => {
    setRecoveryError(null);
    setRecoverySuccess(null);
    setRecoveryLoading(true);

    try {
      // 1. Request Google OAuth Access Token via Google Identity Services Token Client popup
      let accessToken = '';
      try {
        accessToken = await requestGoogleAccessToken(recoveryEmail);
      } catch (authErr: any) {
        setRecoveryError(
          authErr?.message || 'Google অনুমোদন বাতিল করা হয়েছে। পাসওয়ার্ড রিকভারি করতে অনুমোদন প্রয়োজন।'
        );
        setRecoveryLoading(false);
        return;
      }

      // 2. Call backend to send OTP using the authorized token
      const resp = await fetch('/api/admin/send-recovery-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryEmail,
          accessToken,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'ওটিপি প্রেরণে ত্রুটি হয়েছে।');
      }

      setRecoverySuccess(data.message || 'রিকভারি ওটিপি আপনার ইমেইলে পাঠানো হয়েছে।');
      setRecoveryStep('otp');
    } catch (err: any) {
      setRecoveryError(err?.message || 'ওটিপি পাঠানো সম্ভব হয়নি। ইন্টারনেট সংযোগ ও অনুমতি পরীক্ষা করুন।');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setRecoveryError(null);
    setRecoverySuccess(null);

    const trimmedOtp = recoveryOtp.trim();
    if (!trimmedOtp || trimmedOtp.length < 6) {
      setRecoveryError('অনুগ্রহ করে ৬ সংখ্যার ওটিপি কোডটি লিখুন।');
      return;
    }

    setRecoveryLoading(true);
    try {
      const resp = await fetch('/api/admin/verify-recovery-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoveryEmail,
          otp: trimmedOtp,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'ওটিপি যাচাই ব্যর্থ হয়েছে।');
      }

      setRecoveryResetToken(data.resetToken);
      setRecoverySuccess('ওটিপি সফলভাবে যাচাই করা হয়েছে। এবার নতুন ৪-সংখ্যার পাসওয়ার্ড সেট করুন।');
      setRecoveryStep('new_password');
    } catch (err: any) {
      setRecoveryError(err?.message || 'ওটিপি যাচাই ব্যর্থ হয়েছে।');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setRecoveryError(null);
    setRecoverySuccess(null);

    const p1 = recoveryNewPassword.trim();
    const p2 = recoveryConfirmPassword.trim();

    if (!p1 || !p2) {
      setRecoveryError('উভয় ঘরেই পাসওয়ার্ড পূরণ করুন।');
      return;
    }

    if (!/^\d{4}$/.test(p1)) {
      setRecoveryError('নতুন পাসওয়ার্ড অবশ্যই ঠিক ৪ সংখ্যার (ডিজিট) হতে হবে (যেমন: ১২৩৪ বা ৯৬৭৮)।');
      return;
    }

    if (p1 !== p2) {
      setRecoveryError('দুটি পাসওয়ার্ড মেলেনি। সঠিকভাবে লিখুন।');
      return;
    }

    if (!recoveryResetToken) {
      setRecoveryError('রিকভারি সেশন মেয়াদোত্তীর্ণ। আবার চেষ্টা করুন।');
      return;
    }

    setRecoveryLoading(true);
    try {
      const resp = await fetch('/api/admin/reset-password-with-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken: recoveryResetToken,
          newPassword: p1,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।');
      }

      // Success: Close recovery modal and inform user to login with new password
      setShowAdminRecoveryModal(false);
      setRecoveryStep('select');
      setRecoveryOtp('');
      setRecoveryNewPassword('');
      setRecoveryConfirmPassword('');
      setRecoveryResetToken(null);
      setPassword(p1);
      setErrorMessage(null);
      alert('অ্যাডমিন পাসওয়ার্ড সফলভাবে আপডেট হয়েছে! নতুন পাসওয়ার্ড দিয়ে এখন লগইন করুন।');
    } catch (err: any) {
      setRecoveryError(err?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।');
    } finally {
      setRecoveryLoading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedId = identifier.trim();
    const trimmedPw = password.trim();

    if (!trimmedId) {
      setErrorMessage('অনুগ্রহ করে মোবাইল নম্বর লিখুন');
      return;
    }

    setIsLoading(true);
    try {
      const res = await onLogin(trimmedId, trimmedPw);
      if (!res.success) {
        setErrorMessage(
          res.error || 'মোবাইল নম্বর বা পাসওয়ার্ড মেলেনি। অনুগ্রহ করে সঠিক তথ্য লিখুন।'
        );
        setIsLoading(false);
        return;
      }

      // Successful Login -> Handle Remember Me persistence
      try {
        if (rememberMe) {
          const payload = {
            rememberMe: true,
            identifier: trimmedId,
            password: encodeCredential(trimmedPw),
            savedAt: Date.now(),
          };
          localStorage.setItem(STORAGE_REMEMBER_USER, JSON.stringify(payload));
        } else {
          localStorage.removeItem(STORAGE_REMEMBER_USER);
        }
      } catch (err) {
        console.error('Error handling credentials persistence', err);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center px-4 py-8 font-sans">
      <div className="w-full max-w-sm space-y-6">
        {/* Top Branding */}
        <div className="text-center space-y-2">
          {/* Organization Logo Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-700 text-white shadow-md mx-auto mb-1">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10 text-white drop-shadow-xs"
            >
              <circle cx="24" cy="14" r="5" fill="#ffffff" />
              <path
                d="M17 27C17 23.5 20 21 24 21C28 21 31 23.5 31 27V31H17V27Z"
                fill="#ffffff"
              />
              <circle cx="12" cy="17" r="3.5" fill="#a7f3d0" />
              <path
                d="M7 29C7 26 9.2 24 12 24C13.5 24 14.8 24.6 15.6 25.6C15.2 26.6 15 27.8 15 29V31H7V29Z"
                fill="#a7f3d0"
              />
              <circle cx="36" cy="17" r="3.5" fill="#a7f3d0" />
              <path
                d="M41 29C41 26 38.8 24 36 24C34.5 24 33.2 24.6 32.4 25.6C32.8 26.6 33 27.8 33 29V31H41V29Z"
                fill="#a7f3d0"
              />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            আমাদের সংগঠন
          </h1>
          <p className="text-sm font-semibold text-emerald-800">
            আপনার অ্যাকাউন্টে লগইন করুন
          </p>
        </div>

        {/* Clean Login Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field 1: মোবাইল নম্বর */}
            <div className="space-y-1.5">
              <label
                htmlFor="mobile-input"
                className="block text-sm font-bold text-slate-800"
              >
                মোবাইল নম্বর
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="mobile-input"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="মোবাইল নম্বর লিখুন"
                  required
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Field 2: পাসওয়ার্ড */}
            <div className="space-y-1.5">
              <label
                htmlFor="password-input"
                className="block text-sm font-bold text-slate-800"
              >
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="পাসওয়ার্ড লিখুন"
                  className="w-full h-14 pl-12 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                />
                {/* Password Show/Hide Toggle Button */}
                <button
                  type="button"
                  id="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* মনে রাখুন (Remember Me) Option & পাসওয়ার্ড ভুলে গেছেন লিংক */}
            <div className="flex items-center justify-between pt-1 select-none">
              <label
                htmlFor="remember-me-checkbox"
                className="inline-flex items-center gap-2.5 cursor-pointer group"
              >
                <input
                  id="remember-me-checkbox"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 accent-emerald-700 transition-colors cursor-pointer"
                />
                <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                  মনে রাখুন
                </span>
              </label>

              <button
                type="button"
                id="forgot-password-link"
                onClick={() => setShowForgotPasswordInfo((prev) => !prev)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>

            {/* পাসওয়ার্ড ভুলে গেছেন সংক্রান্ত তথ্য নোটিশ */}
            {showForgotPasswordInfo && (
              <div
                id="forgot-password-info-box"
                className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-950 leading-relaxed flex flex-col gap-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>
                      আপনি যদি পাসওয়ার্ড ভুলে যান, তাহলে Admin-এর সাথে যোগাযোগ করুন। Admin আপনার account-এর জন্য একটি অস্থায়ী পাসওয়ার্ড তৈরি করে দেবেন। সেই অস্থায়ী পাসওয়ার্ড দিয়ে Login করার পর আপনি নিজের পছন্দের নতুন পাসওয়ার্ড সেট করতে পারবেন।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordInfo(false)}
                    className="text-emerald-700 hover:text-emerald-900 p-0.5 cursor-pointer"
                    aria-label="বন্ধ করুন"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Admin Password Recovery Action */}
                <div className="pt-2 border-t border-emerald-200/70 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-800 font-medium">অ্যাডমিন রিকভারি?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPasswordInfo(false);
                      setShowAdminRecoveryModal(true);
                      setRecoveryStep('select');
                      setRecoveryError(null);
                      setRecoverySuccess(null);
                    }}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>জিমেইল ওটিপি (OTP) রিকভারি</span>
                  </button>
                </div>
              </div>
            )}

            {/* Error Message Notice */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Prominent Button: “লগইন করুন” */}
            <button
              type="submit"
              id="login-submit-button"
              disabled={isLoading}
              className="w-full h-14 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-75 text-white font-extrabold text-base rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>যাচাই করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <span>লগইন করুন</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Security notice */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>অনুমোদিত সদস্য ও অ্যাডমিন ছাড়া লগইন করতে পারবেন না</span>
            </p>
          </div>
        </div>

        {/* Bottom clean action: Return to Splash Screen if desired */}
        {onBackToSplash && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onBackToSplash}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>স্প্ল্যাশ স্ক্রিন দেখুন</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin Gmail OTP Password Recovery Modal */}
      {showAdminRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-100 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">অ্যাডমিন রিকভারি</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Gmail OTP যাচাইকরণ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminRecoveryModal(false);
                  setRecoveryStep('select');
                  setRecoveryError(null);
                  setRecoverySuccess(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error & Success Feedback */}
            {recoveryError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{recoveryError}</span>
              </div>
            )}
            {recoverySuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 mt-0.5" />
                <span>{recoverySuccess}</span>
              </div>
            )}

            {/* STEP 1: Select Authorized Recovery Email */}
            {recoveryStep === 'select' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  নির্ধারিত অনুমোদিত রিকভারি ইমেইল বেছে নিন। Google একাউন্টে লগইন ও অনুমোদন করার পর একটি ৬ সংখ্যার এককালীন OTP পাঠানো হবে:
                </p>

                <div className="space-y-2">
                  {AUTHORIZED_ADMIN_RECOVERY_EMAILS.map((em) => (
                    <label
                      key={em}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        recoveryEmail === em
                          ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="recovery_email"
                        checked={recoveryEmail === em}
                        onChange={() => setRecoveryEmail(em)}
                        className="w-4 h-4 text-emerald-700 accent-emerald-700"
                      />
                      <span className="truncate">{em}</span>
                    </label>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={recoveryLoading}
                    className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-75 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {recoveryLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>অনুমোদন ও ওটিপি প্রেরণ হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Google অনুমোদন দিন ও OTP পাঠান</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Enter 6-digit OTP */}
            {recoveryStep === 'otp' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  আপনার <span className="font-bold text-slate-900">{recoveryEmail}</span> ঠিকানায় প্রেরিত ৬-সংখ্যার OTP কোডটি লিখুন:
                </p>

                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={recoveryOtp}
                    onChange={(e) => setRecoveryOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="১২৩৪৫৬"
                    className="w-full h-12 text-center text-xl font-bold tracking-widest border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden"
                  />
                  <p className="text-[11px] text-slate-400 text-center mt-1 font-medium">মেয়াদ: ৫ মিনিট</p>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={recoveryLoading || recoveryOtp.length < 6}
                    className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-75 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {recoveryLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>যাচাই করা হচ্ছে...</span>
                      </>
                    ) : (
                      <span>OTP যাচাই করুন</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={recoveryLoading}
                    className="w-full text-xs font-semibold text-slate-600 hover:text-emerald-700 py-1.5 transition-colors cursor-pointer"
                  >
                    পুনরায় OTP পাঠান
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Set New 4-digit PIN/Password */}
            {recoveryStep === 'new_password' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  আপনার নতুন ৪-সংখ্যার অ্যাডমিন পাসওয়ার্ড / পিন লিখুন:
                </p>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">নতুন ৪-সংখ্যার পাসওয়ার্ড</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={recoveryNewPassword}
                      onChange={(e) => setRecoveryNewPassword(e.target.value.replace(/\D/g, ''))}
                      placeholder="যেমন: ১২৩৪"
                      className="w-full h-11 px-3.5 text-center text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">পুনরায় নিশ্চিত করুন</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={recoveryConfirmPassword}
                      onChange={(e) => setRecoveryConfirmPassword(e.target.value.replace(/\D/g, ''))}
                      placeholder="যেমন: ১২৩৪"
                      className="w-full h-11 px-3.5 text-center text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={recoveryLoading || recoveryNewPassword.length !== 4}
                    className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-75 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {recoveryLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>সংরক্ষণ করা হচ্ছে...</span>
                      </>
                    ) : (
                      <span>নতুন পাসওয়ার্ড সংরক্ষণ করুন</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

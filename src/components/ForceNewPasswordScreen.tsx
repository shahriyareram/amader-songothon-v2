import React, { useState, useCallback } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { UserSession } from '../types';

export interface ForceNewPasswordScreenProps {
  currentUser: UserSession;
  onSubmitNewPassword: (newPassword: string) => Promise<void>;
  onLogout: () => void;
}

const BN_TO_EN: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

function sanitize4Digits(val: string): string {
  return val
    .replace(/[০-৯]/g, (d) => BN_TO_EN[d] || d)
    .replace(/\D/g, '')
    .slice(0, 4);
}

export const ForceNewPasswordScreen: React.FC<ForceNewPasswordScreenProps> = React.memo(({
  currentUser,
  onSubmitNewPassword,
  onLogout,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitize4Digits(e.target.value);
    setNewPassword(cleaned);
    setErrorMessage((prev) => (prev ? null : prev));
  }, []);

  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitize4Digits(e.target.value);
    setConfirmPassword(cleaned);
    setErrorMessage((prev) => (prev ? null : prev));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (errorMessage) setErrorMessage(null);

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew) {
      setErrorMessage('অনুগ্রহ করে ঠিক ৪ সংখ্যার নতুন পাসওয়ার্ড লিখুন।');
      return;
    }

    if (!/^\d{4}$/.test(trimmedNew)) {
      setErrorMessage('নতুন পাসওয়ার্ড অবশ্যই ঠিক ৪ সংখ্যার (ডিজিট) হতে হবে (যেমন: ১২৩৪ বা ৯৬৭৮)।');
      return;
    }

    if (trimmedNew === '1234') {
      setErrorMessage('ডিফল্ট পাসওয়ার্ড "১২৩৪" ব্যবহার করা যাবে না। অন্য ৪ সংখ্যার নতুন ব্যক্তিগত পাসওয়ার্ড দিন।');
      return;
    }

    if (!trimmedConfirm) {
      setErrorMessage('অনুগ্রহ করে নিশ্চিতকরণ পাসওয়ার্ড লিখুন।');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setErrorMessage('নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মেলেনি।');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitNewPassword(trimmedNew);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="force-new-password-screen"
      className="min-h-screen bg-slate-100/70 flex items-center justify-center p-4 selection:bg-emerald-100 selection:text-emerald-900"
    >
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <KeyRound className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            নতুন পাসওয়ার্ড সেট করুন
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 max-w-sm mx-auto">
            নিরাপত্তার স্বার্থে আপনার অ্যাকাউন্টের জন্য ঠিক ৪ সংখ্যার একটি নতুন ব্যক্তিগত পাসওয়ার্ড নির্ধারণ করুন।
          </p>
        </div>

        {/* Member Profile Badge */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-500">সদস্যের নাম</p>
            <p className="text-sm font-black text-slate-900 truncate">
              {currentUser.name}
            </p>
          </div>
          {currentUser.phone && (
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-slate-500">মোবাইল নম্বর</p>
              <p className="text-xs font-mono font-bold text-emerald-800">
                {currentUser.phone}
              </p>
            </div>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">
              অস্থায়ী পাসওয়ার্ড দিয়ে লগইন সফল হয়েছে। সদস্য প্যানেলে প্রবেশ করতে এখনই একটি নতুন স্থায়ী ৪-সংখ্যার পাসওয়ার্ড সেট করা বাধ্যতামূলক।
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field: নতুন পাসওয়ার্ড */}
            <div className="space-y-1.5">
              <label
                htmlFor="force-new-password-input"
                className="block text-xs sm:text-sm font-bold text-slate-800"
              >
                নতুন পাসওয়ার্ড (ঠিক ৪ সংখ্যা)
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="force-new-password-input"
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  placeholder="ঠিক ৪ সংখ্যার পাসওয়ার্ড (যেমন: ১২৩৪)"
                  required
                  autoFocus
                  className="w-full h-13 pl-12 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  id="toggle-force-pw-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Field: নতুন পাসওয়ার্ড নিশ্চিত করুন */}
            <div className="space-y-1.5">
              <label
                htmlFor="force-confirm-password-input"
                className="block text-xs sm:text-sm font-bold text-slate-800"
              >
                নতুন পাসওয়ার্ড নিশ্চিত করুন
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="force-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder="পুনরায় ৪ সংখ্যার পাসওয়ার্ড লিখুন"
                  required
                  className="w-full h-13 pl-12 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  id="toggle-force-confirm-pw-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  title={showConfirmPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  {showConfirmPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Validation Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="submit-force-new-password-btn"
              disabled={isSubmitting || newPassword.length !== 4 || confirmPassword.length !== 4}
              className="w-full h-13 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-base rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.99] mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>সংরক্ষণ করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 stroke-[2.3]" />
                  <span>নতুন পাসওয়ার্ড সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Logout Fallback Action */}
        <div className="text-center">
          <button
            type="button"
            onClick={onLogout}
            id="force-password-logout-btn"
            className="text-xs font-bold text-slate-500 hover:text-rose-600 inline-flex items-center gap-1.5 cursor-pointer transition-colors py-1 px-3 rounded-lg hover:bg-white/60"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>লগআউট করে ফিরে যান</span>
          </button>
        </div>
      </div>
    </div>
  );
});


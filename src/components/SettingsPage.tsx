import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Lock,
  LogOut,
  Info,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Smartphone,
  Calendar,
  Layers
} from 'lucide-react';
import { Member, OrganizationSettings, UserSession } from '../types';
import { toBengaliNumber } from '../utils/bengali';

interface SettingsPageProps {
  currentUser: UserSession | null;
  isAdmin: boolean;
  members: Member[];
  settings: OrganizationSettings;
  onLogout: () => void;
  onUpdatePassword: (
    currentPassword?: string,
    newPassword?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  isAdmin,
  members,
  settings,
  onLogout,
  onUpdatePassword,
}) => {
  // Password change form states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Logout confirmation modal state
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // App info modal state
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Dynamic Admin Information Resolution
  // 1. Check if an admin member is configured in members list
  const adminMember = members.find(
    (m) =>
      (m.Role || m.role || '').toLowerCase() === 'admin' ||
      m.notes?.includes('সভাপতি') ||
      m.serialNumber === 1
  );

  const adminName =
    isAdmin && currentUser?.name && currentUser.name !== 'সংগঠন অ্যাডমিন'
      ? currentUser.name
      : adminMember?.name || 'মোঃ আব্দুল করিম';

  const adminPhone =
    isAdmin && currentUser?.phone
      ? currentUser.phone
      : adminMember?.phone || '০১৭১১-০০০০০১';

  // Handle password form submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew) {
      setPasswordError('অনুগ্রহ করে নতুন পাসওয়ার্ড লিখুন।');
      return;
    }

    if (trimmedNew.length < 6) {
      setPasswordError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setPasswordError('নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না।');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await onUpdatePassword(currentPassword.trim(), trimmedNew);
      if (res.success) {
        setPasswordSuccess('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordSuccess(null);
        }, 1800);
      } else {
        setPasswordError(res.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eaf4fc] text-slate-900 pb-24 font-sans">
      <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
        {/* ============================================================ */}
        {/* Header: ⚙️ সেটিংস                                            */}
        {/* ============================================================ */}
        <header className="bg-white rounded-3xl p-5 border border-[#d6e8f6] shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600" />
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  সেটিংস
                </h1>
              </div>
              <p className="text-xs font-semibold text-slate-600">
                অ্যাকাউন্ট, নিরাপত্তা ও অ্যাপ ব্যবস্থাপনা
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <Settings className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* Admin Information Card:                                      */}
        {/* - “অ্যাডমিন”                                                 */}
        {/* - অ্যাডমিনের নাম                                             */}
        {/* - অ্যাডমিনের মোবাইল নম্বর                                     */}
        {/* - “প্রধান অ্যাডমিন” status                                    */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-5 border border-[#d6e8f6] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                সংগঠন প্রশাসন
              </span>
            </div>

            {/* Status: প্রধান অ্যাডমিন */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>প্রধান অ্যাডমিন</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-xl font-black shadow-sm shrink-0">
              {adminName.slice(0, 1)}
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-400">অ্যাডমিনের নাম</div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                {adminName}
              </h2>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{adminPhone}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#f2f8fd] rounded-2xl p-3 border border-[#d6e8f6] flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">
              বর্তমান লগইন পদবী:
            </span>
            <span className="font-bold text-emerald-800">
              {isAdmin ? 'অ্যাডমিনিস্ট্রেটর' : currentUser?.name ? 'নিবন্ধিত সদস্য' : 'সদস্য'}
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* Settings Menu:                                               */}
        {/* 1. 🔐 পাসওয়ার্ড পরিবর্তন                                       */}
        {/* 2. 🚪 লগআউট                                                  */}
        {/* 3. ℹ️ অ্যাপ সম্পর্কে                                         */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-3 border border-[#d6e8f6] shadow-xs space-y-1">
          {/* 1. 🔐 পাসওয়ার্ড পরিবর্তন */}
          <button
            type="button"
            id="change-password-menu-btn"
            onClick={() => {
              setPasswordError(null);
              setPasswordSuccess(null);
              setIsPasswordModalOpen(true);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block">
                  পাসওয়ার্ড পরিবর্তন
                </span>
                <span className="text-xs text-slate-500">
                  অ্যাকাউন্টের নিরাপত্তা পাসওয়ার্ড আপডেট করুন
                </span>
              </div>
            </div>
            <span className="text-slate-400 group-hover:text-slate-600 font-bold text-sm">
              ›
            </span>
          </button>

          {/* 2. 🚪 লগআউট */}
          <button
            type="button"
            id="logout-menu-btn"
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-rose-50 active:bg-rose-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 group-hover:scale-105 transition-transform">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-rose-700 block">
                  লগআউট
                </span>
                <span className="text-xs text-rose-500">
                  বর্তমান সেশন থেকে বের হয়ে লগইন পেজে যান
                </span>
              </div>
            </div>
            <span className="text-rose-400 group-hover:text-rose-600 font-bold text-sm">
              ›
            </span>
          </button>

          {/* 3. ℹ️ অ্যাপ সম্পর্কে */}
          <button
            type="button"
            id="about-app-menu-btn"
            onClick={() => setIsAboutModalOpen(true)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100 group-hover:scale-105 transition-transform">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block">
                  অ্যাপ সম্পর্কে
                </span>
                <span className="text-xs text-slate-500">
                  অ্যাপের নাম, ভার্সন ও পরিচিতি
                </span>
              </div>
            </div>
            <span className="text-slate-400 group-hover:text-slate-600 font-bold text-sm">
              ›
            </span>
          </button>
        </div>

        {/* Organization summary footer */}
        <div className="text-center py-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-500">{settings.orgName}</p>
          <p className="text-[11px] mt-0.5">ভার্সন ২.১.০ • ক্লাউড সুরক্ষিত</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. Modal: পাসওয়ার্ড পরিবর্তন                                    */}
      {/* ============================================================ */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 border border-[#d6e8f6] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  পাসওয়ার্ড পরিবর্তন
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              {/* Current Password (Optional if member, but good practice) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  বর্তমান পাসওয়ার্ড:
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    placeholder="বর্তমান পাসওয়ার্ড দিন"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-[#d6e8f6] rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর): <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="নতুন পাসওয়ার্ড লিখুন"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-[#d6e8f6] rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  নতুন পাসওয়ার্ড পুনরায় লিখুন: <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-[#d6e8f6] rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  {isSubmittingPassword ? 'আপডেট হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. Modal: লগআউট Confirmation Dialog                          */}
      {/* ============================================================ */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-[#d6e8f6] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <LogOut className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">
                লগআউট নিশ্চিতকরণ
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                আপনি কি নিশ্চিতভাবে আপনার অ্যাকাউন্ট থেকে লগআউট করতে চান? পরবর্তী সময়ে লগইন করতে মোবাইল নম্বর ও পাসওয়ার্ড প্রয়োজন হবে।
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                id="cancel-logout-btn"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                id="confirm-logout-btn"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  onLogout();
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                হ্যাঁ, লগআউট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. Modal: অ্যাপ সম্পর্কে (About App)                          */}
      {/* ============================================================ */}
      {isAboutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-[#d6e8f6] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  অ্যাপ সম্পর্কে
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAboutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-center py-2 space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-700 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-700/20 text-2xl font-black">
                সং
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">
                  {settings.orgName || 'আমাদের সংগঠন'}
                </h4>
                <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                  ভার্সন ২.১.০
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="leading-relaxed font-medium">
                “আমাদের সংগঠন” হলো সদস্যদের সাপ্তাহিক সঞ্চয়, বকেয়া এবং আর্থিক হিসাব নিয়ন্ত্রণের একটি ডিজিটাল প্ল্যাটফর্ম।
              </p>
              <div className="pt-2 border-t border-slate-200 space-y-1.5 font-semibold text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">মোট সদস্য ধারণক্ষমতা:</span>
                  <span className="font-bold text-slate-900">
                    {toBengaliNumber(members.length)} জন
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">সাপ্তাহিক কিস্তির লক্ষ্য:</span>
                  <span className="font-bold text-emerald-700">
                    ৳ {toBengaliNumber(settings.weeklyTarget)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">নিরাপত্তা কাঠামো:</span>
                  <span className="font-bold text-sky-700">ফায়ারবেস ক্লাউড</span>
                </div>
              </div>
            </div>

            <div className="text-center text-[11px] text-slate-400">
              ২০২৬ © সর্বস্বত্ব সংরক্ষিত
            </div>

            <button
              type="button"
              onClick={() => setIsAboutModalOpen(false)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

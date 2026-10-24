import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Lock,
  User,
  Phone,
} from 'lucide-react';
import { Member } from '../../types';

export interface AdminPasswordResetModalProps {
  isOpen: boolean;
  member: Member | null;
  onClose: () => void;
  onConfirmReset: (memberId: string) => Promise<{
    temporaryPassword: string;
    memberName: string;
    memberCode: string;
    phone: string;
  }>;
}

export const AdminPasswordResetModal: React.FC<AdminPasswordResetModalProps> = ({
  isOpen,
  member,
  onClose,
  onConfirmReset,
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !member) return null;

  const handleReset = async () => {
    setErrorMessage(null);
    setIsResetting(true);
    try {
      const result = await onConfirmReset(member.id);
      setTemporaryPassword(result.temporaryPassword);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      // Fallback copy if clipboard api unavailable
      const textArea = document.createElement('textarea');
      textArea.value = temporaryPassword;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  const handleCloseModal = () => {
    setTemporaryPassword(null);
    setErrorMessage(null);
    setIsCopied(false);
    onClose();
  };

  return (
    <div
      id="admin-password-reset-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 border border-slate-200 shadow-xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                পাসওয়ার্ড রিসেট
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                অ্যাডমিন প্যানেল সিকিউরিটি
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Member Summary Card */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-500">সদস্যের নাম:</span>
            <span className="font-black text-slate-900 text-sm">{member.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-500">আইডি কোড:</span>
            <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
              {member.memberCode}
            </span>
          </div>
          {member.phone && (
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-500">মোবাইল নম্বর:</span>
              <span className="font-mono font-bold text-emerald-800">
                {member.phone}
              </span>
            </div>
          )}
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs font-bold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* State 1: Reset confirmation before execution */}
        {!temporaryPassword ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-1.5">
              <p className="font-bold leading-relaxed">
                এই সদস্যের জন্য একটি নতুন শক্তিশালী অস্থায়ী (Temporary) পাসওয়ার্ড তৈরি করা হবে।
              </p>
              <p className="text-[11px] text-amber-800 leading-normal">
                নিরাপত্তার কারণে বিদ্যমান পাসওয়ার্ড দেখা যায় না। সদস্য এই অস্থায়ী পাসওয়ার্ড দিয়ে লগইন করলে তাকে সঙ্গে সঙ্গে নতুন পাসওয়ার্ড সেট করতে হবে।
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isResetting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                id="confirm-admin-reset-pw-btn"
                onClick={handleReset}
                disabled={isResetting}
                className="px-4 sm:px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>রিসেট হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>পাসওয়ার্ড রিসেট করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Reset successful with temporary password */
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center gap-2 font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!</span>
            </div>

            {/* Highlighted Temporary Password Box */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                অস্থায়ী পাসওয়ার্ড (Temporary Password):
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl font-mono text-base font-extrabold text-slate-900 tracking-wider select-all break-all">
                  {temporaryPassword}
                </div>
                <button
                  type="button"
                  id="copy-temp-pw-btn"
                  onClick={handleCopyPassword}
                  className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                  title="পাসওয়ার্ড কপি করুন"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>কপি হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>কপি করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 bg-sky-50 border border-sky-200/80 rounded-2xl text-sky-950 text-xs space-y-1">
              <p className="font-bold">সদস্যের করণীয়:</p>
              <p className="text-[11px] text-sky-900 leading-normal">
                ১. এই অস্থায়ী পাসওয়ার্ডটি সদস্যকে দিন।<br />
                ২. সদস্য তার মোবাইল নম্বর ও এই পাসওয়ার্ড দিয়ে লগইন করবেন।<br />
                ৩. লগইন করার সাথে সাথে সদস্যকে তার নিজস্ব স্থায়ী নতুন পাসওয়ার্ড সেট করতে হবে।
              </p>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                id="close-temp-pw-modal-btn"
                onClick={handleCloseModal}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                ঠিক আছে, বন্ধ করুন
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

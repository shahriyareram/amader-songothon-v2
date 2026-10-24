import React from 'react';
import { ShieldCheck, User, ArrowRight } from 'lucide-react';
import { Member } from '../types';

interface PanelSelectionScreenProps {
  member?: Member | null;
  onSelectAdmin: () => void;
  onSelectMember: () => void;
}

export const PanelSelectionScreen: React.FC<PanelSelectionScreenProps> = ({
  member,
  onSelectAdmin,
  onSelectMember,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center px-4 py-8 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-2">
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
            প্যানেল নির্বাচন করুন
          </h1>
          <p className="text-sm font-semibold text-slate-600">
            স্বাগতম, <strong className="text-emerald-800 font-extrabold">{member?.name || 'অ্যাডমিন'}</strong>!
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-50 border border-emerald-200/90 rounded-full text-xs font-bold text-emerald-800">
            <span>সদস্য কোড: {member?.memberCode || 'সো-০১'}</span>
            <span>•</span>
            <span className="text-emerald-700 font-extrabold">অ্যাডমিন ও সদস্য</span>
          </div>
        </div>

        {/* Selection Cards */}
        <div className="space-y-4">
          {/* 1. Admin Panel Card: Deep Green background, white text/icon */}
          <button
            id="select-admin-panel-btn"
            type="button"
            onClick={onSelectAdmin}
            className="w-full text-left p-6 bg-[#064e3b] hover:bg-[#054131] border border-emerald-700/60 rounded-3xl shadow-md hover:shadow-xl transition-all group cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-13 h-13 rounded-2xl bg-white/15 border border-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-7 h-7 stroke-[2.2] text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                      অ্যাডমিন প্যানেল
                    </h3>
                    <span className="text-[11px] font-bold bg-white/20 text-emerald-100 px-2.5 py-0.5 rounded-full border border-white/20">
                      পূর্ণ নিয়ন্ত্রণ
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-1 leading-relaxed">
                    সংগঠনের হিসাব-নিকাশ, জমার এন্ট্রি, সকল সদস্যের তালিকা ও কেন্দ্রীয় সেটিংস।
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/15 border border-white/20 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-[#064e3b] transition-all">
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
          </button>

          {/* 2. Member Panel Card: Deep Blue background, white text/icon */}
          <button
            id="select-member-panel-btn"
            type="button"
            onClick={onSelectMember}
            className="w-full text-left p-6 bg-[#1e3a8a] hover:bg-[#172554] border border-blue-700/60 rounded-3xl shadow-md hover:shadow-xl transition-all group cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-500/30"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-13 h-13 rounded-2xl bg-white/15 border border-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <User className="w-7 h-7 stroke-[2.2] text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                      সদস্য প্যানেল
                    </h3>
                    <span className="text-[11px] font-bold bg-white/20 text-blue-100 px-2.5 py-0.5 rounded-full border border-white/20">
                      ব্যক্তিগত
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-blue-100/90 font-medium mt-1 leading-relaxed">
                    নিজের ৫২ সপ্তাহের জমার অবস্থা, বকেয়া, অগ্রিম এবং ব্যক্তিগত তথ্য বিবরণী।
                  </p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/15 border border-white/20 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-[#1e3a8a] transition-all">
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

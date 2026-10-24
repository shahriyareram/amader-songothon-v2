import React, { useMemo } from 'react';
import {
  ShieldCheck,
  Users,
  UserCheck,
  AlertCircle,
  Sparkles,
  Calendar,
  CheckCircle2,
  PlusCircle,
  BarChart3,
  ChevronRight,
  Clock,
  Bell,
} from 'lucide-react';
import { Member, OrganizationSettings, ActiveTab } from '../types';
import { toBengaliNumber, formatBengaliCurrency } from '../utils/bengali';
import { calculateMemberFinances } from '../utils/calculations';

interface AdminHomeOverviewProps {
  members: Member[];
  settings: OrganizationSettings;
  onNavigateTab: (tab: ActiveTab) => void;
  onRecordDeposit: (memberId?: string, weekNumber?: number) => void;
  onNavigateFridayNotification?: () => void;
}

export const AdminHomeOverview: React.FC<AdminHomeOverviewProps> = ({
  members = [],
  settings,
  onNavigateTab,
  onRecordDeposit,
  onNavigateFridayNotification,
}) => {
  // Current Week Number
  const currentWeek = Number(settings?.currentWeek) || 1;

  // Safe non-null members list
  const safeMembers = useMemo(() => {
    return Array.isArray(members)
      ? members.filter((m): m is Member => Boolean(m && typeof m === 'object' && m.id))
      : [];
  }, [members]);

  // Compute individual finances for all members dynamically
  const memberSummaries = useMemo(() => {
    return safeMembers.map((m) => ({
      member: m,
      summary: calculateMemberFinances(m, currentWeek),
    }));
  }, [safeMembers, currentWeek]);

  // 1. All-time Organization Totals
  const totalMembersCount = safeMembers.length;
  const activeMembersCount = useMemo(() => {
    return safeMembers.filter((m) => (m as any)?.status !== 'inactive').length;
  }, [safeMembers]);

  const totalOrgDue = useMemo(() => {
    return memberSummaries.reduce((sum, item) => sum + (item?.summary?.totalDue || 0), 0);
  }, [memberSummaries]);

  const totalOrgAdvance = useMemo(() => {
    return memberSummaries.reduce((sum, item) => sum + (item?.summary?.advanceAmount || 0), 0);
  }, [memberSummaries]);

  // 2. Current Week Stats
  const thisWeekDeposited = useMemo(() => {
    return safeMembers.reduce((acc, m) => {
      const records = Array.isArray(m?.weeklyRecords) ? m.weeklyRecords : [];
      const rec = records.find((r) => r && r.weekNumber === currentWeek);
      return acc + (rec?.paidAmount || 0);
    }, 0);
  }, [safeMembers, currentWeek]);

  const thisWeekPaidCount = useMemo(() => {
    return safeMembers.filter((m) => {
      const records = Array.isArray(m?.weeklyRecords) ? m.weeklyRecords : [];
      const rec = records.find((r) => r && r.weekNumber === currentWeek);
      return (rec?.paidAmount || 0) > 0 && Boolean(rec?.paymentDate);
    }).length;
  }, [safeMembers, currentWeek]);

  const thisWeekDueCount = Math.max(0, totalMembersCount - thisWeekPaidCount);

  // Defaulters (সদস্য যাদের মোট বকেয়া আছে)
  const defaulters = useMemo(() => {
    return memberSummaries.filter((item) => Boolean(item?.summary?.isDefaulter));
  }, [memberSummaries]);
  const defaulterCount = defaulters.length;

  return (
    <section
      id="admin-home-overview-section"
      className="bg-white rounded-3xl p-3.5 sm:p-4 border border-[#d6e8f6] shadow-xs space-y-3.5"
      aria-label="প্রশাসনিক সারাংশ"
    >
      {/* ============================================================ */}
      {/* 1. Header: প্রশাসনিক সারাংশ                                    */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <ShieldCheck className="w-4 h-4 stroke-[2.3]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-none">
              প্রশাসনিক সারাংশ
            </h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-none">
              সংগঠনের সার্বিক ও চলতি সপ্তাহের অবস্থা
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2.5 py-0.5 rounded-full">
          অ্যাডমিন ভিউ
        </span>
      </div>

      {/* ============================================================ */}
      {/* 2. সংগঠনের সার্বিক তথ্য (৪টি Compact Card)                     */}
      {/*    - মোট সদস্য                                               */}
      {/*    - সক্রিয় সদস্য                                            */}
      {/*    - মোট বকেয়া                                              */}
      {/*    - মোট অগ্রিম                                               */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* মোট সদস্য */}
        <div className="bg-slate-50/80 rounded-2xl p-2.5 border border-slate-200/70 flex flex-col justify-between min-h-[64px]">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[11px] font-bold">মোট সদস্য</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-none mt-1">
            {toBengaliNumber(totalMembersCount)} জন
          </div>
        </div>

        {/* সক্রিয় সদস্য */}
        <div className="bg-emerald-50/60 rounded-2xl p-2.5 border border-emerald-100 flex flex-col justify-between min-h-[64px]">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold">সক্রিয় সদস্য</span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-800 tracking-tight leading-none mt-1">
            {toBengaliNumber(activeMembersCount)} জন
          </div>
        </div>

        {/* মোট বকেয়া (Soft light pink) */}
        <div className="bg-[#fff1f2] rounded-2xl p-2.5 border border-rose-200/80 flex flex-col justify-between min-h-[64px]">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold">মোট বকেয়া</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-base sm:text-lg font-black text-rose-700 tracking-tight leading-none mt-1">
            {formatBengaliCurrency(totalOrgDue)}
          </div>
        </div>

        {/* মোট অগ্রিম */}
        <div className="bg-sky-50/70 rounded-2xl p-2.5 border border-sky-100 flex flex-col justify-between min-h-[64px]">
          <div className="flex items-center justify-between text-sky-800">
            <span className="text-[11px] font-bold">মোট অগ্রিম</span>
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-base sm:text-lg font-black text-sky-800 tracking-tight leading-none mt-1">
            {formatBengaliCurrency(totalOrgAdvance)}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. বর্তমান সপ্তাহের সংক্ষিপ্ত হিসাব                             */}
      {/*    - এই সপ্তাহে মোট জমা                                       */}
      {/*    - কতজন সদস্য জমা দিয়েছেন                                  */}
      {/*    - কতজন সদস্যের জমা বাকি                                   */}
      {/* ============================================================ */}
      <div className="bg-slate-50/70 rounded-2xl p-3 border border-[#d6e8f6] space-y-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>চলতি সপ্তাহ ({toBengaliNumber(currentWeek)})-এর জমা হিসাব</span>
          </span>
          <span className="text-[11px] font-bold text-emerald-800 font-mono">
            {thisWeekPaidCount}/{totalMembersCount} জন
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          {/* এই সপ্তাহে মোট জমা */}
          <div className="bg-white rounded-xl p-2 border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] font-semibold text-slate-500">এই সপ্তাহে মোট জমা</div>
            <div className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5 tracking-tight">
              {formatBengaliCurrency(thisWeekDeposited)}
            </div>
          </div>

          {/* কতজন সদস্য জমা দিয়েছেন */}
          <div className="bg-white rounded-xl p-2 border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] font-semibold text-slate-500">জমা দিয়েছেন</div>
            <div className="text-xs sm:text-sm font-black text-emerald-800 mt-0.5 tracking-tight">
              {toBengaliNumber(thisWeekPaidCount)} জন
            </div>
          </div>

          {/* কতজন সদস্যের জমা বাকি */}
          <div className="bg-white rounded-xl p-2 border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] font-semibold text-slate-500">জমা বাকি</div>
            <div className={`text-xs sm:text-sm font-black mt-0.5 tracking-tight ${thisWeekDueCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {toBengaliNumber(thisWeekDueCount)} জন
            </div>
          </div>
        </div>
      </div>

      {/* নতুন শুক্রবারের নোটিফিকেশন Card */}
      <div
        id="admin-home-friday-notification-card-alt"
        onClick={onNavigateFridayNotification}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onNavigateFridayNotification?.();
          }
        }}
        className="bg-gradient-to-r from-[#f5f3ff] via-[#faf5ff] to-[#fdf4ff] hover:from-[#ede9fe] hover:to-[#fae8ff] active:scale-[0.99] border border-purple-200/90 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-2xs"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-100/90 border border-purple-200/80 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Bell className="w-5 h-5 text-purple-700" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight leading-snug">
              শুক্রবারের নোটিফিকেশন
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed truncate mt-0.5">
              সকল সদস্যের সাপ্তাহিক জমা, বকেয়া ও অগ্রিমের হিসাবভিত্তিক নোটিফিকেশন পাঠান
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-purple-500 shrink-0" />
      </div>

      {/* ============================================================ */}
      {/* 4. “মনোযোগ প্রয়োজন” অংশ                                        */}
      {/*    - এই সপ্তাহের জমা বাকি সদস্য সংখ্যা                         */}
      {/*    - বকেয়া থাকা সদস্য সংখ্যা                                 */}
      {/*    - কোনো alert না থাকলে: "এই মুহূর্তে কোনো জরুরি বিষয় নেই"   */}
      {/* ============================================================ */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>মনোযোগ প্রয়োজন</span>
        </div>

        {thisWeekDueCount === 0 && defaulterCount === 0 ? (
          /* সব ক্লিয়ার স্ট্যাটাস */
          <div className="bg-emerald-50/80 rounded-2xl p-3 border border-emerald-200/90 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold text-emerald-900 leading-tight">
              এই মুহূর্তে কোনো জরুরি বিষয় নেই। সংগঠনের সকল জমা সন্তোষজনক ও হালনাগাদ।
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* চলতি সপ্তাহের জমা বাকি Alert */}
            {thisWeekDueCount > 0 && (
              <div
                onClick={() => onNavigateTab('members')}
                className="bg-amber-50/80 hover:bg-amber-100/70 border border-amber-200/90 rounded-2xl p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs font-bold text-amber-900 leading-tight truncate">
                    চলতি সপ্তাহে এখনো <span className="font-black text-amber-950">{toBengaliNumber(thisWeekDueCount)} জন</span> সদস্য জমা দেননি
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              </div>
            )}

            {/* সার্বিক বকেয়া থাকা সদস্য Alert */}
            {defaulterCount > 0 && (
              <div
                onClick={() => onNavigateTab('due')}
                className="bg-[#fff1f2] hover:bg-rose-100/70 border border-rose-200/90 rounded-2xl p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <p className="text-xs font-bold text-rose-900 leading-tight truncate">
                    সংগঠনের মোট <span className="font-black text-rose-950">{toBengaliNumber(defaulterCount)} জন</span> সদস্যের সর্বমোট {formatBengaliCurrency(totalOrgDue)} বকেয়া রয়েছে
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. Admin-এর জন্য “দ্রুত কাজ” (Quick Actions)                   */}
      {/*    সর্বোচ্চ ৪টি shortcut:                                     */}
      {/*    - জমা যোগ করুন                                             */}
      {/*    - সদস্য তালিকা                                             */}
      {/*    - বকেয়া দেখুন                                              */}
      {/*    - রিপোর্ট দেখুন                                            */}
      {/* ============================================================ */}
      <div className="space-y-1.5 pt-1 border-t border-slate-100">
        <div className="text-xs font-bold text-slate-700">দ্রুত কাজ</div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* ১. জমা যোগ করুন */}
          <button
            id="admin-quick-action-deposit"
            type="button"
            onClick={() => onRecordDeposit()}
            className="flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 active:scale-[0.98] border border-emerald-200/80 text-emerald-900 transition-all cursor-pointer shadow-2xs text-left"
          >
            <div className="w-7 h-7 rounded-xl bg-white text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
              <PlusCircle className="w-4 h-4 stroke-[2.3]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black tracking-tight leading-tight truncate">জমা যোগ করুন</div>
              <div className="text-[10px] text-emerald-700/80 leading-none truncate mt-0.5">সাপ্তাহিক জমা</div>
            </div>
          </button>

          {/* ২. সদস্য তালিকা */}
          <button
            id="admin-quick-action-members"
            type="button"
            onClick={() => onNavigateTab('members')}
            className="flex items-center gap-2 p-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100/80 active:scale-[0.98] border border-sky-200/80 text-sky-900 transition-all cursor-pointer shadow-2xs text-left"
          >
            <div className="w-7 h-7 rounded-xl bg-white text-sky-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-4 h-4 stroke-[2.3]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black tracking-tight leading-tight truncate">সদস্য তালিকা</div>
              <div className="text-[10px] text-sky-700/80 leading-none truncate mt-0.5">{toBengaliNumber(totalMembersCount)} জন সদস্য</div>
            </div>
          </button>

          {/* ৩. বকেয়া দেখুন */}
          <button
            id="admin-quick-action-due"
            type="button"
            onClick={() => onNavigateTab('due')}
            className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#fff1f2] hover:bg-rose-100/80 active:scale-[0.98] border border-rose-200/80 text-rose-900 transition-all cursor-pointer shadow-2xs text-left"
          >
            <div className="w-7 h-7 rounded-xl bg-white text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertCircle className="w-4 h-4 stroke-[2.3]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black tracking-tight leading-tight truncate">বকেয়া দেখুন</div>
              <div className="text-[10px] text-rose-700/80 leading-none truncate mt-0.5">{toBengaliNumber(defaulterCount)} জন বকেয়া</div>
            </div>
          </button>

          {/* ৪. রিপোর্ট দেখুন */}
          <button
            id="admin-quick-action-report"
            type="button"
            onClick={() => onNavigateTab('report')}
            className="flex items-center gap-2 p-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 active:scale-[0.98] border border-indigo-200/80 text-indigo-900 transition-all cursor-pointer shadow-2xs text-left"
          >
            <div className="w-7 h-7 rounded-xl bg-white text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
              <BarChart3 className="w-4 h-4 stroke-[2.3]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black tracking-tight leading-tight truncate">রিপোর্ট দেখুন</div>
              <div className="text-[10px] text-indigo-700/80 leading-none truncate mt-0.5">আয়-ব্যয় হিসাব</div>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Users, 
  UserPlus, 
  Edit3, 
  Wallet, 
  AlertCircle, 
  History, 
  TrendingUp, 
  Search, 
  PlusCircle, 
  Sliders, 
  LogOut, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  Phone, 
  Calendar,
  ArrowRight,
  ChevronRight,
  Coins
} from 'lucide-react';
import { Member, OrganizationSettings, DepositTransaction } from '../types';
import { 
  toBengaliNumber, 
  formatBengaliCurrency, 
  getBengaliDate,
  getShortBengaliDate 
} from '../utils/bengali';
import { calculateMemberFinances, calculateOrgTotals } from '../utils/calculations';

interface AdminDashboardPageProps {
  members: Member[];
  settings: OrganizationSettings;
  transactions: DepositTransaction[];
  isAdmin: boolean;
  onLogin: (pin: string) => boolean;
  onLogout: () => void;
  onSelectMember: (memberId: string) => void;
  onAddNewMember: () => void;
  onEditMember: (member: Member) => void;
  onRecordDeposit: (memberId?: string, weekNumber?: number) => void;
  onUpdateSettings: (newSettings: Partial<OrganizationSettings>) => void;
  onResetDefaultData: () => void;
  onExportData: () => void;
  onNavigateToHistory: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  members,
  settings,
  transactions,
  isAdmin,
  onLogin,
  onLogout,
  onSelectMember,
  onAddNewMember,
  onEditMember,
  onRecordDeposit,
  onUpdateSettings,
  onResetDefaultData,
  onExportData,
  onNavigateToHistory,
}) => {
  // Login states
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Admin view sub-tab
  const [adminSection, setAdminSection] = useState<'overview' | 'weekly' | 'dues' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWeekForView, setSelectedWeekForView] = useState<number>(settings.currentWeek);

  // Settings form states
  const [weeklyTarget, setWeeklyTarget] = useState(settings.weeklyTarget);
  const [currentWeek, setCurrentWeek] = useState(settings.currentWeek);
  const [newPin, setNewPin] = useState(settings.adminPin);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const totals = calculateOrgTotals(members, settings.currentWeek);
  const todayBengali = getBengaliDate();

  // Due members list
  const dueMembers = members.filter(
    (m) => calculateMemberFinances(m, settings.currentWeek).isDefaulter
  );

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(pinInput);
    if (!success) {
      setPinError(true);
    } else {
      setPinError(false);
      setPinInput('');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      weeklyTarget: Number(weeklyTarget),
      currentWeek: Number(currentWeek),
      adminPin: newPin.trim() || settings.adminPin,
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  // If Admin is NOT logged in: Show PIN login screen
  if (!isAdmin) {
    return (
      <div className="pb-24 pt-6 px-4 max-w-sm mx-auto">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            অ্যাডমিন ড্যাশবোর্ডে স্বাগতম
          </h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            সংগঠনের সদস্য ও আর্থিক ব্যবস্থাপনা পরিচালনা করতে অ্যাডমিন পিন কোড প্রদান করুন।
          </p>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-left">
                অ্যাডমিন সিকিউরিটি পিন:
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="পিন কোড লিখুন..."
                className="w-full text-center text-xl tracking-widest font-bold py-3 bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                autoFocus
                required
              />
              {pinError && (
                <p className="text-rose-600 font-semibold text-xs mt-2">
                  ভুল পিন কোড! আবার চেষ্টা করুন।
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-sm transition-colors text-sm"
            >
              ড্যাশবোর্ডে প্রবেশ করুন
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filtered members for admin search
  const filteredMembers = members.filter((m) => {
    const query = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(query) ||
      m.memberCode.toLowerCase().includes(query) ||
      m.phone.includes(query) ||
      toBengaliNumber(m.serialNumber).includes(query)
    );
  });

  return (
    <div className="pb-28 pt-2 px-3.5 max-w-lg mx-auto space-y-4">
      {/* Top Admin Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 text-white rounded-2xl p-4 shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  অ্যাডমিন ড্যাশবোর্ড
                </h2>
                <span className="text-[10px] bg-amber-500/80 text-amber-950 font-bold px-2 py-0.2 rounded-full">
                  সক্রিয়
                </span>
              </div>
              <p className="text-[11px] text-amber-200">
                আমাদের সংগঠন • পূর্ণ নিয়ন্ত্রণ প্যানেল
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="লগআউট করুন"
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/15 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>লগআউট</span>
          </button>
        </div>

        {/* Current status pill */}
        <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-xs text-amber-100">
          <span>চলতি সপ্তাহ: <strong className="text-white font-bold">সপ্তাহ {toBengaliNumber(settings.currentWeek)}</strong></span>
          <span>সাপ্তাহিক কিস্তি: <strong className="text-white font-bold">{formatBengaliCurrency(settings.weeklyTarget)}</strong></span>
        </div>
      </div>

      {/* 
        REQUIREMENT 7 & 8: 
        7. মোট জমা 
        8. মোট বকেয়া
      */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* মোট জমা (7) */}
        <div className="bg-white rounded-2xl p-3.5 border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500">৭. মোট সংগৃহীত জমা</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-emerald-700 leading-tight">
            {formatBengaliCurrency(totals.totalDepositAllTime)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>৫২ সপ্তাহের সঞ্চয়</span>
            <span className="text-emerald-600 font-bold">✓ চলমান</span>
          </div>
        </div>

        {/* মোট বকেয়া (8) */}
        <div className="bg-white rounded-2xl p-3.5 border border-rose-100 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500">৮. মোট বকেয়া</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-rose-600 leading-tight">
            {formatBengaliCurrency(totals.totalDueAllTime)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">বকেয়া সদস্য:</span>
            <span className="text-rose-600 font-bold">{toBengaliNumber(totals.membersWithDueCount)} জন</span>
          </div>
        </div>
      </div>

      {/* 
        MAIN ADMIN ACTION BUTTONS GRID 
        Directly covering options 1 through 6:
        1. সদস্য তালিকা
        2. নতুন সদস্য যোগ
        3. সদস্যের তথ্য পরিবর্তন
        4. সাপ্তাহিক জমা
        5. বকেয়া সদস্য
        6. জমার ইতিহাস
      */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>অ্যাডমিন প্রধান মেনু ও অ্যাকশন</span>
          <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            সকল অপশন
          </span>
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {/* 4. সাপ্তাহিক জমা (Weekly Deposit) */}
          <button
            id="admin-menu-weekly-deposit"
            onClick={() => setAdminSection('weekly')}
            className={`p-3 rounded-xl text-left shadow-xs transition-all flex flex-col justify-between active:scale-[0.98] ${
              adminSection === 'weekly'
                ? 'bg-emerald-800 text-white ring-2 ring-emerald-500'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <PlusCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-medium">
                সপ্তাহ {toBengaliNumber(settings.currentWeek)}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">৪. সাপ্তাহিক জমা</p>
              <p className="text-[10px] text-emerald-100 mt-0.5">কিস্তির টাকা গ্রহণ করুন</p>
            </div>
          </button>

          {/* 2. নতুন সদস্য যোগ (Add New Member) */}
          <button
            id="admin-menu-add-member"
            onClick={onAddNewMember}
            className="p-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-left shadow-xs transition-all flex flex-col justify-between active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-medium">
                নতুন
              </span>
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">২. নতুন সদস্য যোগ</p>
              <p className="text-[10px] text-slate-300 mt-0.5">আইডি সহ সদস্য তৈরি</p>
            </div>
          </button>

          {/* 5. বকেয়া সদস্য (Due Members) */}
          <button
            id="admin-menu-due-members"
            onClick={() => setAdminSection('dues')}
            className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between active:scale-[0.98] ${
              adminSection === 'dues'
                ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                : 'bg-rose-50/70 hover:bg-rose-100/70 text-slate-900 border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${adminSection === 'dues' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'}`}>
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${adminSection === 'dues' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-800'}`}>
                {toBengaliNumber(dueMembers.length)} জন
              </span>
            </div>
            <div>
              <p className={`text-xs font-bold leading-tight ${adminSection === 'dues' ? 'text-white' : 'text-rose-950'}`}>৫. বকেয়া সদস্য</p>
              <p className={`text-[10px] mt-0.5 ${adminSection === 'dues' ? 'text-rose-100' : 'text-rose-600'}`}>যাদের টাকা বাকি আছে</p>
            </div>
          </button>

          {/* 6. জমার ইতিহাস (Deposit History) */}
          <button
            id="admin-menu-deposit-history"
            onClick={onNavigateToHistory}
            className="p-3 bg-teal-50 hover:bg-teal-100 text-slate-900 rounded-xl text-left border border-teal-200 shadow-xs transition-all flex flex-col justify-between active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">
                {toBengaliNumber(transactions.length)} টি
              </span>
            </div>
            <div>
              <p className="text-xs font-bold leading-tight text-teal-950">৬. জমার ইতিহাস</p>
              <p className="text-[10px] text-teal-700 mt-0.5">সব লেনদেনের লেজার</p>
            </div>
          </button>
        </div>
      </div>

      {/* Sub-navigation tabs for the Dashboard views */}
      <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl text-xs overflow-x-auto">
        <button
          onClick={() => setAdminSection('overview')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
            adminSection === 'overview'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ১. সদস্য তালিকা ({toBengaliNumber(members.length)})
        </button>

        <button
          onClick={() => setAdminSection('weekly')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 shrink-0 ${
            adminSection === 'weekly'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-700'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>৪. সাপ্তাহিক জমা (৫২ সপ্তাহ)</span>
        </button>

        <button
          onClick={() => setAdminSection('dues')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 shrink-0 ${
            adminSection === 'dues'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-rose-700'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>৫. বকেয়া সদস্য ({toBengaliNumber(dueMembers.length)})</span>
        </button>

        <button
          onClick={() => setAdminSection('settings')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 shrink-0 ${
            adminSection === 'settings'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>হিসাব সেটিংস</span>
        </button>
      </div>

      {/* SECTION 1: 1. সদস্য তালিকা (Member List) & 3. সদস্যের তথ্য পরিবর্তন (Edit Member Info) */}
      {adminSection === 'overview' && (
        <div className="space-y-3">
          {/* Section header and search */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>১. সদস্য তালিকা ({toBengaliNumber(members.length)} জন)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                প্রতিটি সদস্যের জন্য Member ID, মোট জমা ও ৫২ সপ্তাহের হিসাব
              </p>
            </div>

            <button
              onClick={onAddNewMember}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition-colors shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>২. নতুন সদস্য</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="সদস্যের নাম, আইডি (সো-০১) বা ফোন নম্বর দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs"
            />
          </div>

          {/* Members List Items */}
          <div className="space-y-2">
            {filteredMembers.map((member) => {
              const summary = calculateMemberFinances(member, settings.currentWeek);

              return (
                <div
                  key={member.id}
                  id={`admin-member-card-${member.id}`}
                  className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Left: Code, Name, Phone */}
                    <div 
                      onClick={() => onSelectMember(member.id)}
                      className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0"
                    >
                      <div className={`w-10 h-10 rounded-xl ${member.avatarColor} text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-xs`}>
                        <span className="text-[11px]">#{toBengaliNumber(member.serialNumber)}</span>
                        <span className="text-[8px] opacity-90">{member.memberCode}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate hover:text-emerald-800">
                            {member.name}
                          </h4>
                          <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold border border-slate-200 shrink-0">
                            {member.memberCode}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{member.phone}</span>
                          {member.notes && (
                            <span className="text-slate-400">• {member.notes}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Deposit & Due */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-900">
                        জমা: <span className="text-emerald-700">{formatBengaliCurrency(summary.totalPaid)}</span>
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {summary.isDefaulter ? (
                          <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            বকেয়া: {formatBengaliCurrency(summary.totalDue)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">
                            ✓ বকেয়ামুক্ত
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Row: Edit Member Info (#3) & Record Deposit (#4) */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="text-[10px] text-slate-500">
                      চলতি সপ্তাহ: {summary.currentWeekPaid ? (
                        <span className="text-emerald-600 font-semibold">আদায়</span>
                      ) : (
                        <span className="text-rose-600 font-semibold">বাকি</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* ৩. সদস্যের তথ্য পরিবর্তন */}
                      <button
                        id={`edit-member-btn-${member.id}`}
                        onClick={() => onEditMember(member)}
                        className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3 h-3 text-slate-600" />
                        <span>৩. তথ্য পরিবর্তন</span>
                      </button>

                      {/* ৪. সাপ্তাহিক জমা */}
                      <button
                        id={`record-deposit-btn-${member.id}`}
                        onClick={() => onRecordDeposit(member.id, settings.currentWeek)}
                        className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors shadow-xs"
                      >
                        <Coins className="w-3 h-3" />
                        <span>৪. জমা নিন</span>
                      </button>

                      {/* View 52 weeks details */}
                      <button
                        onClick={() => onSelectMember(member.id)}
                        className="p-1 text-slate-400 hover:text-emerald-800 transition-colors"
                        title="৫২ সপ্তাহের বিবরণী"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: ৪. সাপ্তাহিক জমা (Weekly Deposit - 52 Weeks Ledger Manager) */}
      {adminSection === 'weekly' && (() => {
        const weekTargetTotal = members.length * settings.weeklyTarget;
        const weekRecords = members.map((m) => {
          const records = Array.isArray(m?.weeklyRecords) ? m.weeklyRecords : [];
          const rec = records.find((r) => r && r.weekNumber === selectedWeekForView);
          const paid = rec?.paidAmount || 0;
          const target = rec?.targetAmount || settings.weeklyTarget;
          const isPaid = paid >= target;
          const isPartial = paid > 0 && paid < target;
          const isDue = paid < target && selectedWeekForView <= settings.currentWeek;
          const isUpcoming = paid === 0 && selectedWeekForView > settings.currentWeek;
          
          return {
            member: m,
            paidAmount: paid,
            targetAmount: target,
            dueAmount: Math.max(0, target - paid),
            status: isPaid ? 'paid' : isPartial ? 'partial' : isDue ? 'due' : 'upcoming',
            paymentDate: rec?.paymentDate,
            paymentMethod: rec?.paymentMethod,
          };
        });

        const weekCollectedTotal = weekRecords.reduce((sum, r) => sum + r.paidAmount, 0);
        const weekPaidCount = weekRecords.filter((r) => r.status === 'paid').length;
        const weekDueCount = weekRecords.filter((r) => r.status === 'due' || r.status === 'partial').length;

        return (
          <div className="space-y-3">
            {/* Week Selector Bar */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-700" />
                  <span>৪. সপ্তাহভিত্তিক জমা ও বকেয়া লেজার</span>
                </h3>
                <button
                  onClick={() => setSelectedWeekForView(settings.currentWeek)}
                  className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  চলতি সপ্তাহে যান
                </button>
              </div>

              {/* Selector controls */}
              <div className="flex items-center gap-2">
                <button
                  disabled={selectedWeekForView <= 1}
                  onClick={() => setSelectedWeekForView((w) => Math.max(1, w - 1))}
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl font-bold text-xs"
                >
                  ‹ পূর্ববর্তী
                </button>

                <select
                  value={selectedWeekForView}
                  onChange={(e) => setSelectedWeekForView(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      সপ্তাহ {toBengaliNumber(w)} {w === settings.currentWeek ? '★ (চলতি সপ্তাহ)' : ''}
                    </option>
                  ))}
                </select>

                <button
                  disabled={selectedWeekForView >= 52}
                  onClick={() => setSelectedWeekForView((w) => Math.min(52, w + 1))}
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl font-bold text-xs"
                >
                  পরবর্তী ›
                </button>
              </div>

              {/* Week progress card */}
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">এই সপ্তাহের আদায়</span>
                  <span className="font-bold text-emerald-700 text-xs">
                    {formatBengaliCurrency(weekCollectedTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">পরিশোধ করেছেন</span>
                  <span className="font-bold text-emerald-700 text-xs">
                    {toBengaliNumber(weekPaidCount)} জন
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">বকেয়া রয়েছে</span>
                  <span className={`font-bold text-xs ${weekDueCount > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {toBengaliNumber(weekDueCount)} জন
                  </span>
                </div>
              </div>
            </div>

            {/* List of members for this week */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-semibold">
                <span>সদস্য ও জমার বিবরণী (সপ্তাহ {toBengaliNumber(selectedWeekForView)})</span>
                <span>স্ট্যাটাস / অ্যাকশন</span>
              </div>

              {weekRecords.map(({ member, paidAmount, dueAmount, status, paymentDate, paymentMethod }) => (
                <div
                  key={member.id}
                  className={`bg-white rounded-xl p-3 border transition-all flex items-center justify-between ${
                    status === 'due' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                  }`}
                >
                  <div 
                    onClick={() => onSelectMember(member.id)}
                    className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                  >
                    <div className={`w-9 h-9 rounded-lg ${member.avatarColor} text-white flex flex-col items-center justify-center font-bold shrink-0 text-[10px]`}>
                      <span>#{toBengaliNumber(member.serialNumber)}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {member.name}
                        </span>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded">
                          {member.memberCode}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {paymentDate ? (
                          <span>জমা: {getShortBengaliDate(paymentDate)}</span>
                        ) : (
                          <span>টাকা জমা হয়নি</span>
                        )}
                        {paymentMethod && (
                          <span className="text-slate-400"> • {paymentMethod === 'cash' ? 'নগদ' : paymentMethod === 'bkash' ? 'বিকাশ' : paymentMethod === 'nagad' ? 'নগদ' : 'ব্যাংক'}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {paidAmount > 0 ? (
                          <span className="text-emerald-700">{formatBengaliCurrency(paidAmount)}</span>
                        ) : (
                          <span className="text-slate-400">৳০</span>
                        )}
                      </div>

                      {/* Status Badge */}
                      {status === 'paid' && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                          পরিশোধিত
                        </span>
                      )}
                      {status === 'partial' && (
                        <span className="text-[9px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                          বাকি {formatBengaliCurrency(dueAmount)}
                        </span>
                      )}
                      {status === 'due' && (
                        <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.2 rounded border border-rose-200">
                          বকেয়া {formatBengaliCurrency(dueAmount)}
                        </span>
                      )}
                      {status === 'upcoming' && (
                        <span className="text-[9px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded">
                          ভবিষ্যত
                        </span>
                      )}
                    </div>

                    {/* Deposit Action */}
                    <button
                      onClick={() => onRecordDeposit(member.id, selectedWeekForView)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors shadow-xs ${
                        status === 'paid'
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      }`}
                    >
                      {status === 'paid' ? 'সম্পাদনা' : 'জমা নিন'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* SECTION 5: ৫. বকেয়া সদস্য (Due Members) */}
      {adminSection === 'dues' && (
        <div className="space-y-3">
          <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>৫. বকেয়া সদস্যের তালিকা</span>
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                মোট {toBengaliNumber(dueMembers.length)} জন সদস্যের মোট বকেয়া {formatBengaliCurrency(totals.totalDueAllTime)}
              </p>
            </div>
            <button
              onClick={() => onRecordDeposit()}
              className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-colors"
            >
              বকেয়া জমা নিন
            </button>
          </div>

          {dueMembers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-slate-900">মাশাআল্লাহ! কোনো সদস্যের বকেয়া নেই</p>
              <p className="text-xs text-slate-500 mt-1">সব সদস্যের চলতি সপ্তাহ পর্যন্ত হিসাব পরিশোধিত।</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dueMembers.map((member) => {
                const summary = calculateMemberFinances(member, settings.currentWeek);

                return (
                  <div
                    key={member.id}
                    className="bg-white rounded-xl p-3 border border-rose-200 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        onClick={() => onSelectMember(member.id)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                            #{toBengaliNumber(member.serialNumber)}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 hover:text-rose-700">
                            {member.name}
                          </h4>
                          <span className="text-[10px] text-slate-500">({member.memberCode})</span>
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                          <span>ফোন: {member.phone}</span>
                          <span>•</span>
                          <span className="text-rose-600 font-semibold">{toBengaliNumber(summary.dueWeeksCount)} সপ্তাহের কিস্তি বাকি</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-rose-600 block">
                          {formatBengaliCurrency(summary.totalDue)}
                        </span>
                        <button
                          onClick={() => onRecordDeposit(member.id, settings.currentWeek)}
                          className="mt-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors shadow-xs inline-flex items-center gap-1"
                        >
                          <Coins className="w-3 h-3" />
                          <span>জমা নিন</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION: Settings & System Controls */}
      {adminSection === 'settings' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
            <Sliders className="w-4 h-4 text-emerald-700" />
            <span>সংগঠনের হিসাব ও সিস্টেম সেটিংস</span>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  সাপ্তাহিক কিস্তির পরিমাণ (টাকা):
                </label>
                <input
                  type="number"
                  step="10"
                  min="10"
                  value={weeklyTarget}
                  onChange={(e) => setWeeklyTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">ডিফল্ট: ৳২০০</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  বর্তমান হিসাব সপ্তাহ:
                </label>
                <select
                  value={currentWeek}
                  onChange={(e) => setCurrentWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      সপ্তাহ {toBengaliNumber(w)}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">১ থেকে ৫২ সপ্তাহ</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                অ্যাডমিন পিন কোড পরিবর্তন:
              </label>
              <input
                type="text"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="নতুন ৪ সংখ্যার পিন লিখুন..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-colors text-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{settingsSaved ? 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' : 'সেটিংস সংরক্ষণ করুন'}</span>
            </button>
          </form>

          {/* Backup and Reset */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-xs font-bold text-slate-800">তথ্য ব্যাকআপ ও ডাটা রিকভারি</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onExportData}
                className="flex items-center justify-center gap-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ব্যাকআপ ডাউনলোড</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('আপনি কি নিশ্চিত যে পূর্বনির্ধারিত ২৫ জন সদস্যের ডিফল্ট তথ্যে ফিরে যেতে চান?')) {
                    onResetDefaultData();
                  }
                }}
                className="flex items-center justify-center gap-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs border border-rose-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ডিফল্ট রিসেট</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

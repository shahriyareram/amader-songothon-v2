import React, { useState, useMemo } from 'react';
import { 
  Phone, 
  Calendar, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Check, 
  X,
  Wallet,
  ShieldCheck,
  Download,
  Camera,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { Member, OrganizationSettings, ActiveTab } from '../types';
import { 
  toBengaliNumber, 
  formatBengaliCurrency, 
  getShortBengaliDate,
  getMonthDayBengali,
  getBangladeshDateString,
  getWeekStartFridayDate,
  getFixedWeekBengaliDate,
} from '../utils/bengali';
import { MemberAvatar } from './MemberAvatar';
import { AvatarUploadModal } from './AvatarUploadModal';
import { AdminHomeOverview } from './AdminHomeOverview';
import { processMember52Weeks } from '../utils/calculations';

interface MemberDetailsPageProps {
  member: Member;
  settings: OrganizationSettings;
  isAdmin: boolean;
  currentUserMemberId?: string | null;
  isAdminHome?: boolean;
  allMembers?: Member[];
  onNavigateTab?: (tab: ActiveTab) => void;
  onBack?: () => void;
  onRecordDeposit: (memberId: string, weekNumber?: number) => void;
  onEditMember: (member: Member) => void;
  onUpdateMemberAvatar?: (memberId: string, photoUrl?: string) => void;
  onUpdateWeeklyDeposit?: (data: {
    memberId: string;
    weekNumber: number;
    amount: number;
    date?: string;
    status: 'paid' | 'due';
    method?: 'cash' | 'bkash' | 'nagad' | 'bank';
    notes?: string;
  }) => void;
}

export const MemberDetailsPage: React.FC<MemberDetailsPageProps> = ({
  member,
  settings,
  isAdmin,
  currentUserMemberId,
  isAdminHome = false,
  allMembers,
  onNavigateTab,
  onBack,
  onRecordDeposit,
  onEditMember,
  onUpdateMemberAvatar,
  onUpdateWeeklyDeposit,
}) => {
  // Ownership check: only admin or the member owner can change avatar
  const canEditAvatar = isAdmin || (Boolean(currentUserMemberId) && currentUserMemberId === member.id);
  // Avatar upload/generator modal state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Filter for weekly list: 'all' | 'paid' | 'due'
  const [filter, setFilter] = useState<'all' | 'paid' | 'due'>('all');
  const [selectedJumpWeek, setSelectedJumpWeek] = useState<number | ''>('');

  // Admin week deposit edit modal state
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<number>(settings.weeklyTarget);
  const [editDate, setEditDate] = useState<string>(() => getBangladeshDateString());
  const [editStatus, setEditStatus] = useState<'paid' | 'due'>('paid');
  const [editMethod, setEditMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank'>('cash');
  const [editNotes, setEditNotes] = useState<string>('');

  // -------------------------------------------------------------
  // Process 52 Weeks using centralized financial calculation:
  // - Week Number: Week 1 থেকে Week 52
  // - Deposit Amount & Due Amount
  // - Deposit Status ("জমা হয়েছে" বা "বকেয়া" বা "বাকি সপ্তাহ")
  // - Advance handling & chronological deficit offset
  // -------------------------------------------------------------
  const detailedFinances = useMemo(() => {
    return processMember52Weeks(member, settings.currentWeek, settings.weeklyTarget);
  }, [member, settings.currentWeek, settings.weeklyTarget]);

  const {
    all52Weeks,
    totalDeposit,
    totalAdvance,
    totalDue,
    paidWeeksCount,
    dueWeeksCount,
    totalWeeksCount,
    remainingWeeksCount,
    paidPercentage,
  } = detailedFinances;

  // Filtered weeks: "বকেয়া" ফিল্টারে শুধু প্রযোজ্য সপ্তাহের বকেয়া দেখাবে, ভবিষ্যৎ সপ্তাহ নয়
  const filteredWeeks = all52Weeks.filter((week) => {
    if (filter === 'paid') return week.status === 'paid';
    if (filter === 'due') return week.weekNumber <= settings.currentWeek && week.status === 'due';
    return true;
  });

  // Dynamic Bengali current month and date: e.g. "সেপ্টেম্বর ০৫"
  const todayMonthDay = useMemo(() => getMonthDayBengali(), []);

  // Sorted weeks in descending order:
  // Latest/Current week (settings.currentWeek) at top down to week 1 (e.g. সপ্তাহ ২৪, ২৩, ২২... ১)
  // Followed by any upcoming weeks (২৫, ২৬...)
  const sortedWeeks = useMemo(() => {
    return [...filteredWeeks].sort((a, b) => {
      const aIsActive = a.weekNumber <= settings.currentWeek;
      const bIsActive = b.weekNumber <= settings.currentWeek;
      if (aIsActive && bIsActive) {
        return b.weekNumber - a.weekNumber; // 24 -> 23 -> 22 ... -> 1
      }
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      return a.weekNumber - b.weekNumber;
    });
  }, [filteredWeeks, settings.currentWeek]);

  // Open Admin Edit Modal for a specific week
  const handleOpenWeekEdit = (weekNumber: number) => {
    const record = all52Weeks.find((w) => w.weekNumber === weekNumber);
    if (!record) return;

    setEditingWeek(weekNumber);
    if (record.status === 'paid') {
      setEditAmount(record.paidAmount || settings.weeklyTarget);
      setEditDate(record.paymentDate || getBangladeshDateString());
      setEditStatus('paid');
      setEditMethod(record.paymentMethod || 'cash');
      setEditNotes(record.notes || '');
    } else {
      setEditAmount(settings.weeklyTarget);
      setEditDate(getBangladeshDateString());
      setEditStatus('paid');
      setEditMethod('cash');
      setEditNotes('');
    }
  };

  // Save Admin Week Edit
  const handleSaveWeekEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWeek === null) return;

    if (onUpdateWeeklyDeposit) {
      onUpdateWeeklyDeposit({
        memberId: member.id,
        weekNumber: editingWeek,
        amount: editStatus === 'due' ? 0 : Number(editAmount),
        date: editStatus === 'due' ? undefined : editDate,
        status: editStatus,
        method: editMethod,
        notes: editNotes,
      });
    } else {
      onRecordDeposit(member.id, editingWeek);
    }

    setEditingWeek(null);
  };

  // Mark week as due (reset deposit)
  const handleMarkAsDue = () => {
    if (editingWeek === null) return;
    if (onUpdateWeeklyDeposit) {
      onUpdateWeeklyDeposit({
        memberId: member.id,
        weekNumber: editingWeek,
        amount: 0,
        date: undefined,
        status: 'due',
      });
    }
    setEditingWeek(null);
  };

  return (
    <div className="pb-28 pt-2.5 px-3.5 max-w-md mx-auto space-y-3 font-sans text-slate-800">
      {/* Back to members list button if onBack provided */}
      {onBack && (
        <div className="pt-1">
          <button
            id="member-details-back-btn"
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2.5 text-sm sm:text-base font-extrabold text-slate-800 hover:text-emerald-900 bg-white hover:bg-slate-50 border border-[#d6e8f6] px-4 sm:px-5 py-2.5 rounded-2xl shadow-xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-700 stroke-[2.5]" />
            <span>সকল সদস্য তালিকায় ফিরে যান</span>
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* সদস্যের নাম, ID, Phone, Date, ও বড় প্রোফাইল ছবি             */}
      {/* ============================================================ */}
      <header className="bg-white rounded-3xl p-3.5 sm:p-4 border border-[#d6e8f6] shadow-xs space-y-2.5">
        <div className="flex items-center gap-3 sm:gap-3.5">
          {/* Member Profile Avatar (বড় ও সুন্দর) with Edit Capability */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <MemberAvatar
              member={member}
              size="3xl"
              editable={canEditAvatar}
              onEdit={() => {
                if (canEditAvatar) setIsAvatarModalOpen(true);
              }}
              onClick={() => {
                if (canEditAvatar) setIsAvatarModalOpen(true);
              }}
            />
            {canEditAvatar && (
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="text-[10px] sm:text-[11px] font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 px-2 py-0.5 rounded-full cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
              >
                ছবি পরিবর্তন
              </button>
            )}
          </div>

          {/* Right Area: Left Column (ID, Name, Phone) + Right Column (সক্রিয় সদস্য centered above চলমান সপ্তাহ) */}
          <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
            {/* Left: ID, Name, Phone with increased vertical spacing */}
            <div className="min-w-0 flex-1 space-y-2">
              {/* Member ID */}
              <div>
                <span className="inline-block font-mono text-xs font-bold bg-sky-50 text-sky-800 px-2.5 py-0.5 rounded-lg border border-sky-100/90">
                  আইডি : {member.memberCode}
                </span>
              </div>

              {/* Member Name */}
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug break-words">
                {member.name}
              </h1>

              {/* Member Phone */}
              {member.phone && (
                <div>
                  <a
                    href={`tel:${member.phone}`}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-mono">{member.phone}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Right Column: "সক্রিয় সদস্য" center-aligned above "চলমান সপ্তাহ" with clean spacing */}
            <div className="shrink-0 flex flex-col items-center gap-1.5 self-center">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full whitespace-nowrap text-center">
                সক্রিয় সদস্য
              </span>

              {/* Dynamic Current Date & Ongoing Week Compact Rounded Box - Original Position */}
              <div className="flex flex-col items-center justify-center bg-emerald-50/80 border border-emerald-200/90 rounded-2xl px-2.5 py-1.5 text-center">
                <span className="text-xs sm:text-[13px] font-bold text-slate-700 leading-tight">
                  {todayMonthDay}
                </span>
                <span className="text-sm sm:text-base font-black text-emerald-900 tracking-tight leading-tight mt-0.5 whitespace-nowrap">
                  চলমান সপ্তাহ {toBengaliNumber(settings.currentWeek)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Quick Action Button */}
        {isAdmin && (
          <div className="pt-2 border-t border-slate-100">
            <button
              id="member-details-add-current-week-btn"
              type="button"
              onClick={() => handleOpenWeekEdit(settings.currentWeek)}
              className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.3]" />
              <span>চলতি সপ্তাহ ({toBengaliNumber(settings.currentWeek)})-এর জমা যোগ করুন</span>
            </button>
          </div>
        )}
      </header>

      {/* ============================================================ */}
      {/* Admin Home Only: প্রশাসনিক সারাংশ, মনোযোগ প্রয়োজন ও দ্রুত কাজ */}
      {/* ============================================================ */}
      {isAdminHome && allMembers && allMembers.length > 0 && onNavigateTab && (
        <AdminHomeOverview
          members={allMembers}
          settings={settings}
          onNavigateTab={onNavigateTab}
          onRecordDeposit={(mId, wNum) =>
            onRecordDeposit(mId || member?.id || '', wNum || settings?.currentWeek || 1)
          }
        />
      )}

      {/* ============================================================ */}
      {/* 3. Summary Boxes: মোট জমা | অগ্রিম | মোট বকেয়া (১ লাইনে ৩টি Box) */}
      {/* ============================================================ */}
      <section className="grid grid-cols-3 gap-2 sm:gap-2.5" aria-label="Member Financial Summary">
        {/* Card 1: মোট জমা */}
        <div className="bg-white rounded-2xl px-2.5 py-2.5 sm:px-3.5 border border-[#d6e8f6] shadow-2xs flex flex-col justify-between min-h-[72px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] sm:text-sm font-bold text-slate-700 whitespace-nowrap">মোট জমা</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 stroke-[2.4]" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-base sm:text-xl font-black text-emerald-700 tracking-tight leading-none">
              {formatBengaliCurrency(totalDeposit)}
            </div>
          </div>
        </div>

        {/* Card 2: অগ্রিম (মোট জমা ও মোট বকেয়ার মাঝখানে) */}
        <div className="bg-white rounded-2xl px-2.5 py-2.5 sm:px-3.5 border border-[#d6e8f6] shadow-2xs flex flex-col justify-between min-h-[72px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] sm:text-sm font-bold text-slate-700 whitespace-nowrap">অগ্রিম</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 stroke-[2.4]" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-base sm:text-xl font-black text-blue-700 tracking-tight leading-none">
              {formatBengaliCurrency(totalAdvance)}
            </div>
          </div>
        </div>

        {/* Card 3: মোট বকেয়া (Soft light pink if due > 0, clean neutral if no due) */}
        <div className={`rounded-2xl px-2.5 py-2.5 sm:px-3.5 border shadow-2xs flex flex-col justify-between min-h-[72px] ${
          totalDue > 0 ? 'bg-[#fff1f2] border-rose-200/80' : 'bg-white border-[#d6e8f6]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] sm:text-sm font-bold text-slate-700 whitespace-nowrap">মোট বকেয়া</span>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              totalDue > 0 ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400'
            }`}>
              <AlertCircle className="w-3.5 h-3.5 stroke-[2.4]" />
            </div>
          </div>
          <div className="mt-1">
            {totalDue > 0 ? (
              <div className="text-base sm:text-xl font-black text-rose-600 tracking-tight leading-none">
                {formatBengaliCurrency(totalDue)}
              </div>
            ) : (
              <div className="text-xs sm:text-sm font-bold text-slate-500 tracking-tight leading-none">
                বকেয়া নেই
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. তার নিচে: “সপ্তাহের হিসাব” (পূর্বে ৪টি বক্সের নিচে ছিল)     */}
      {/* ============================================================ */}
      {/* Week 1 থেকে Week 52 পর্যন্ত পরিষ্কার তালিকা দেখাবে।           */}
      {/* প্রতিটি Week-এ:                                             */}
      {/* - Week Number                                               */}
      {/* - Amount                                                    */}
      {/* - Date                                                      */}
      {/* - Status                                                    */}
      {/* ============================================================ */}
      <section className="bg-white rounded-3xl p-4 sm:p-5 border border-[#d6e8f6] shadow-xs space-y-4" aria-label="52 Weeks Records">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                সপ্তাহের হিসাব
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                ১ থেকে ৫২ সপ্তাহ পর্যন্ত প্রতিটি সপ্তাহের জমা বিবরণ
              </p>
            </div>
          </div>

          <span className="text-xs sm:text-sm font-black text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full shrink-0">
            {toBengaliNumber(paidWeeksCount)}/৫২ সপ্তাহ
          </span>
        </div>

        {/* Filter Chips & Jump-to-Week Selector in a Single Line */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto text-xs sm:text-sm pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            সকল (৫২)
          </button>
          <button
            type="button"
            onClick={() => setFilter('paid')}
            className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
              filter === 'paid'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
            }`}
          >
            জমা হয়েছে ({toBengaliNumber(paidWeeksCount)})
          </button>
          <button
            type="button"
            onClick={() => setFilter('due')}
            className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
              filter === 'due'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            বকেয়া ({toBengaliNumber(dueWeeksCount)})
          </button>

          {/* Jump to Week Select - directly next to বকেয়া badge on the same line */}
          <select
            value={selectedJumpWeek}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : '';
              setSelectedJumpWeek(val);
              if (val) {
                const elem = document.getElementById(`week-item-${val}`);
                if (elem) {
                  elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            }}
            className="bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer shrink-0"
          >
            <option value="">সপ্তাহে যান...</option>
            {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                সপ্তাহ {toBengaliNumber(w)}
              </option>
            ))}
          </select>
        </div>

        {/* 52 Weeks List Items (In Descending Order: সপ্তাহ ২৪ -> সপ্তাহ ১) */}
        <div className="space-y-2.5 pt-1">
          {sortedWeeks.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl text-slate-500 text-sm font-bold">
              এই ফিল্টারে কোনো সপ্তাহের তথ্য পাওয়া যায়নি।
            </div>
          ) : (
            sortedWeeks.map((week) => {
              const isCurrent = week.weekNumber === settings.currentWeek;
              const isPaid = week.status === 'paid';
              const isDue = week.status === 'due';
              
              // Fixed Week Date System:
              // Formula: Week Date = 27/03/2026 + (Week Number - 1) * 7 days
              // Payment Date and Week Date are completely separate; always shows Fixed Date
              const weekDateFormatted = getFixedWeekBengaliDate(week.weekNumber);

              return (
                <div
                  key={week.weekNumber}
                  id={`week-item-${week.weekNumber}`}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isCurrent
                      ? isDue
                        ? 'border-rose-300 ring-2 ring-rose-400/20 bg-[#fff5f6]'
                        : 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30'
                      : isPaid
                      ? 'border-[#d6e8f6] bg-white hover:border-emerald-200'
                      : isDue
                      ? 'border-rose-200/80 bg-[#fff8f8] hover:border-rose-300'
                      : 'border-slate-200/70 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Week Number & Date */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Week Badge */}
                      <div
                        className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 font-black shadow-2xs ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : isDue
                            ? 'bg-rose-100/90 text-rose-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className={`text-[9px] font-bold leading-none ${isDue ? 'text-rose-400' : 'text-slate-500'}`}>সপ্তাহ</span>
                        <span className="text-sm font-black leading-tight mt-0.5">{toBengaliNumber(week.weekNumber)}</span>
                      </div>

                      <div className="min-w-0">
                        {/* Week Number Label & Current Week Badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-black text-slate-900 leading-tight">
                            সপ্তাহ {toBengaliNumber(week.weekNumber)}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] bg-emerald-700 text-white font-black px-2 py-0.5 rounded-full">
                              চলতি সপ্তাহ
                            </span>
                          )}
                        </div>

                        {/* Date (তারিখ) - বাংলা ফরম্যাটে */}
                        <div className="text-xs sm:text-sm text-slate-500 flex items-center gap-1 mt-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>তারিখ: </span>
                          <strong className={isPaid ? "text-slate-800 font-bold" : "text-slate-600 font-semibold"}>
                            {weekDateFormatted}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Status */}
                    <div className="text-right shrink-0">
                      {/* Amount (জমার পরিমাণ বা বকেয়ার পরিমাণ) */}
                      <div className="text-base sm:text-lg font-black text-slate-900">
                        {isPaid ? (
                          <span className="text-emerald-700">
                            {formatBengaliCurrency(week.paidAmount)}
                          </span>
                        ) : isDue ? (
                          <span className="text-rose-600">
                            {formatBengaliCurrency(week.dueAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400">৳০</span>
                        )}
                      </div>

                      {/* Status (স্ট্যাটাস ব্যাজ) */}
                      <div className="mt-1">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                            <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-700" />
                            <span>{week.weekNumber > settings.currentWeek ? 'অগ্রিম জমা' : 'জমা হয়েছে'}</span>
                          </span>
                        ) : isDue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-600 bg-rose-100/90 border border-rose-200/90 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>বকেয়া</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 rounded-full">
                            <span>বাকি সপ্তাহ</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin Action for this week */}
                  {isAdmin && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">
                        {week.notes ? `নোট: ${week.notes}` : isPaid ? 'পরিশোধিত রেকর্ড' : isDue ? `বকেয়া: ${formatBengaliCurrency(week.dueAmount)}` : `ধার্য: ${formatBengaliCurrency(week.targetAmount)}`}
                      </span>

                      <button
                        id={`edit-week-${week.weekNumber}-btn`}
                        type="button"
                        onClick={() => handleOpenWeekEdit(week.weekNumber)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs flex items-center gap-1.5 ${
                          isPaid
                            ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700'
                        }`}
                      >
                        {isPaid ? (
                          <>
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>পরিবর্তন করুন</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>+ জমা যোগ করুন</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. Admin Week Edit / Add Deposit Modal                       */}
      {/* ============================================================ */}
      {editingWeek !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div 
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-200" />
                <div>
                  <h3 className="font-black text-base leading-tight">সাপ্তাহিক জমা এন্ট্রি</h3>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    সপ্তাহ {toBengaliNumber(editingWeek)} • {member.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWeek(null)}
                className="w-8 h-8 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveWeekEdit} className="p-5 space-y-4 text-sm">
              {/* Week Display */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-xs block">সপ্তাহ নম্বর:</span>
                  <span className="font-black text-slate-900 text-base">
                    সপ্তাহ {toBengaliNumber(editingWeek)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-xs block">সাপ্তাহিক ধার্য:</span>
                  <span className="font-black text-emerald-800 text-base">
                    {formatBengaliCurrency(settings.weeklyTarget)}
                  </span>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  স্ট্যাটাস নির্বাচন:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditStatus('paid');
                      if (editAmount === 0) setEditAmount(settings.weeklyTarget);
                      if (!editDate) setEditDate(getBangladeshDateString());
                    }}
                    className={`h-11 px-3 rounded-xl font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editStatus === 'paid'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>জমা হয়েছে</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditStatus('due');
                      setEditAmount(0);
                    }}
                    className={`h-11 px-3 rounded-xl font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      editStatus === 'due'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>বকেয়া</span>
                  </button>
                </div>
              </div>

              {/* Deposit Amount Input */}
              {editStatus === 'paid' && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Deposit Amount (জমার পরিমাণ ৳):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-base">৳</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={editAmount || ''}
                      onChange={(e) => setEditAmount(Number(e.target.value))}
                      className="w-full h-12 pl-9 pr-3 bg-white border border-slate-200/90 rounded-2xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs"
                      placeholder="200"
                      required={editStatus === 'paid'}
                    />
                  </div>
                </div>
              )}

              {/* Deposit Date Input */}
              {editStatus === 'paid' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-800">
                      Deposit Date (জমার তারিখ):
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditDate(getBangladeshDateString())}
                      className="text-xs text-emerald-700 hover:underline font-bold cursor-pointer"
                    >
                      আজকের তারিখ
                    </button>
                  </div>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full h-12 bg-white border border-slate-200/90 rounded-2xl px-3.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs"
                    required={editStatus === 'paid'}
                  />
                </div>
              )}

              {/* Payment Method */}
              {editStatus === 'paid' && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    পরিশোধ মাধ্যম:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    {[
                      { id: 'cash', label: 'নগদ' },
                      { id: 'bkash', label: 'বিকাশ' },
                      { id: 'nagad', label: 'নগদ (Nagad)' },
                      { id: 'bank', label: 'ব্যাংক' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setEditMethod(m.id as 'cash' | 'bkash' | 'nagad' | 'bank')}
                        className={`h-10 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          editMethod === m.id
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Input */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  মন্তব্য / নোট (ঐচ্ছিক):
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="যেমন: সরাসরি জমা"
                  className="w-full h-11 px-3.5 bg-white border border-slate-200/90 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingWeek(null)}
                    className="w-1/3 h-12 text-sm font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 h-12 text-sm sm:text-base font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-2xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                    <span>সংরক্ষণ করুন</span>
                  </button>
                </div>

                {all52Weeks.find((w) => w.weekNumber === editingWeek)?.status === 'paid' && (
                  <button
                    type="button"
                    onClick={handleMarkAsDue}
                    className="w-full py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-2xl transition-colors cursor-pointer"
                  >
                    এই সপ্তাহকে বকেয়া হিসেবে চিহ্নিত করুন
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Avatar Upload & Generation Modal */}
      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        memberName={member.name}
        currentPhotoUrl={member.photoUrl}
        avatarColor={member.avatarColor}
        serialNumber={member.serialNumber}
        onSaveAvatar={(newPhotoUrl) => {
          if (!canEditAvatar) {
            console.warn('Ownership validation blocked: Not permitted to change another member avatar');
            return;
          }
          if (onUpdateMemberAvatar) {
            onUpdateMemberAvatar(member.id, newPhotoUrl);
          }
        }}
      />
    </div>
  );
};

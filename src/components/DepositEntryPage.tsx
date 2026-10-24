import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Calendar,
  CheckCircle2,
  AlertCircle,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  ArrowRight,
  Check,
  CreditCard,
  FileText,
  Phone,
  Sparkles,
  Bell,
  BellOff,
  Send,
  CheckCheck,
} from 'lucide-react';
import { Member, OrganizationSettings, DepositTransaction, NotificationEvent } from '../types';
import {
  saveNotificationEventToFirestore,
  updateNotificationEventStatusInFirestore,
} from '../services/firebaseService';
import {
  toBengaliNumber,
  formatBengaliCurrency,
  getShortBengaliDate,
  getBangladeshDateString,
  getCurrentWeekNumber,
  getCalculatedDisplayMemberMap,
} from '../utils/bengali';
import { processMember52Weeks } from '../utils/calculations';
import {
  buildWeeklyPaymentNotificationMessage,
  generateNotificationFromLedgerState,
} from '../utils/notificationMessageHelper';

interface DepositEntryPageProps {
  members: Member[];
  settings: OrganizationSettings;
  transactions: DepositTransaction[];
  initialMemberId?: string | null;
  initialWeekNumber?: number | null;
  onSaveDeposit: (data: {
    memberId: string;
    weekNumber: number;
    amount: number;
    date?: string;
    method?: 'cash' | 'bkash' | 'nagad' | 'bank';
    notes?: string;
    status: 'paid' | 'due' | 'advance' | 'partial' | 'upcoming';
  }) => void;
  onSelectMember: (memberId: string) => void;
  isAdmin?: boolean;
}

export const DepositEntryPage: React.FC<DepositEntryPageProps> = ({
  members,
  settings,
  transactions,
  initialMemberId,
  initialWeekNumber,
  onSaveDeposit,
  onSelectMember,
}) => {
  // 1. Member selection state
  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => {
    if (initialMemberId && members.some((m) => m.id === initialMemberId)) {
      return initialMemberId;
    }
    return members[0]?.id || '';
  });

  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // 2. Week selection state (1 to 52)
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    if (initialWeekNumber && initialWeekNumber >= 1 && initialWeekNumber <= 52) {
      return initialWeekNumber;
    }
    return settings.currentWeek || getCurrentWeekNumber();
  });

  // 3. Form input states
  const [depositStatus, setDepositStatus] = useState<'paid' | 'due'>('paid');
  const [amount, setAmount] = useState<number>(() => {
    const target = settings.weeklyTarget;
    return target && target !== 200 ? target : 100;
  });
  const [date, setDate] = useState<string>(() => getBangladeshDateString());
  const [method, setMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank'>('cash');
  const [notes, setNotes] = useState<string>('');

  // 4. Feedback / Toast state & Notification Event confirmation state
  const [successInfo, setSuccessInfo] = useState<{
    memberId: string;
    memberName: string;
    memberCode: string;
    weekNumber: number;
    amount: number;
    date?: string;
    status: 'paid' | 'due' | 'advance';
    isUpdate: boolean;
    notificationEventId?: string;
    isNotificationConfirmed?: boolean;
    notificationsEnabled?: boolean;
    notificationMessage?: string;
  } | null>(null);
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  // Sync if initial props change
  useEffect(() => {
    if (initialMemberId && members.some((m) => m.id === initialMemberId)) {
      setSelectedMemberId(initialMemberId);
    }
  }, [initialMemberId, members]);

  useEffect(() => {
    if (initialWeekNumber && initialWeekNumber >= 1 && initialWeekNumber <= 52) {
      setSelectedWeek(initialWeekNumber);
    }
  }, [initialWeekNumber]);

  // Selected member object
  const selectedMember = useMemo(() => {
    return members.find((m) => m.id === selectedMemberId) || members[0] || null;
  }, [members, selectedMemberId]);

  // Selected member's record for the selected week
  const weekRecord = useMemo(() => {
    if (!selectedMember) return null;
    const records = Array.isArray(selectedMember.weeklyRecords)
      ? selectedMember.weeklyRecords
      : [];
    return records.find((r) => r && r.weekNumber === selectedWeek) || null;
  }, [selectedMember, selectedWeek]);

  // Pre-fill existing data if already recorded for this week
  useEffect(() => {
    const member = members.find((m) => m.id === selectedMemberId);
    const rec = Array.isArray(member?.weeklyRecords)
      ? member?.weeklyRecords.find((r) => r && r.weekNumber === selectedWeek)
      : null;

    const targetDeposit = settings.weeklyTarget && settings.weeklyTarget !== 200 ? settings.weeklyTarget : 100;

    if (rec) {
      if (rec.status === 'due') {
        setDepositStatus('due');
        setAmount(targetDeposit);
        setDate(getBangladeshDateString());
        setNotes(rec.notes || '');
      } else if (rec.status === 'advance' || rec.status === 'paid' || (rec.paidAmount || 0) > 0) {
        setDepositStatus('paid');
        const effectivePaid = rec.paidAmount === 200 && rec.targetAmount === 100 ? 100 : (rec.paidAmount || targetDeposit);
        setAmount(effectivePaid);
        setDate(rec.paymentDate || getBangladeshDateString());
        if (rec.paymentMethod) {
          setMethod(rec.paymentMethod);
        }
        setNotes(rec.notes || '');
      } else {
        setDepositStatus('paid');
        setAmount(targetDeposit);
        setDate(getBangladeshDateString());
        setNotes('');
      }
    } else {
      setDepositStatus('paid');
      setAmount(targetDeposit);
      setDate(getBangladeshDateString());
      setNotes('');
    }
    setSuccessInfo(null);
  }, [selectedMemberId, selectedWeek, settings.weeklyTarget]);

  // Financial summary for the currently selected member
  const memberFinance = useMemo(() => {
    if (!selectedMember) {
      return { totalPaid: 0, paidWeeksCount: 0, dueWeeksCount: 0, advanceWeeksCount: 0, totalAdvance: 0, all52Weeks: [] };
    }
    const detailed = processMember52Weeks(selectedMember, settings.currentWeek, settings.weeklyTarget);
    return {
      totalPaid: detailed.totalDeposit,
      paidWeeksCount: detailed.paidWeeksCount,
      dueWeeksCount: detailed.dueWeeksCount,
      advanceWeeksCount: detailed.totalAdvance / 100,
      totalAdvance: detailed.totalAdvance,
      all52Weeks: detailed.all52Weeks,
    };
  }, [selectedMember, settings.currentWeek, settings.weeklyTarget]);

  const selectedWeekProcessed = useMemo(() => {
    return memberFinance.all52Weeks.find((w) => w.weekNumber === selectedWeek) || null;
  }, [memberFinance, selectedWeek]);

  // Continuous display map for active members
  const displayMap = useMemo(() => {
    return getCalculatedDisplayMemberMap(members);
  }, [members]);

  // Filtered members for dropdown search
  const filteredMemberList = useMemo(() => {
    if (!memberSearchQuery.trim()) return members;
    const q = memberSearchQuery.toLowerCase().trim();
    return members.filter((m) => {
      const name = m?.name || '';
      const code = m?.memberCode || '';
      const displayCode = displayMap.get(m.id)?.displayMemberCode || '';
      const displaySerial = displayMap.get(m.id)?.displaySerialPadded || '';
      const serial = m?.serialNumber != null ? m.serialNumber.toString() : '';
      const phone = m?.phone || '';
      return (
        name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        displayCode.toLowerCase().includes(q) ||
        serial.includes(q) ||
        phone.includes(q) ||
        toBengaliNumber(serial).includes(q) ||
        displaySerial.includes(q) ||
        toBengaliNumber(displaySerial).includes(q)
      );
    });
  }, [members, memberSearchQuery, displayMap]);

  // Recent transactions list
  const recentTransactions = useMemo(() => {
    return (transactions || []).slice(0, 10);
  }, [transactions]);

  // Is the current selected week already paid?
  const isCurrentWeekPaid =
    (weekRecord?.paidAmount || 0) > 0 && Boolean(weekRecord?.paymentDate);

  // Form submit handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    if (depositStatus === 'due') {
      onSaveDeposit({
        memberId: selectedMember.id,
        weekNumber: selectedWeek,
        amount: 0,
        date: undefined,
        method: undefined,
        notes: notes.trim() || undefined,
        status: 'due',
      });

      setSuccessInfo({
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        memberCode: displayMap.get(selectedMember.id)?.displayMemberCode || selectedMember.memberCode,
        weekNumber: selectedWeek,
        amount: 0,
        status: 'due',
        isUpdate: isCurrentWeekPaid,
      });

      setTimeout(() => {
        setSuccessInfo((prev) => (prev?.weekNumber === selectedWeek ? null : prev));
      }, 8000);
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('অনুগ্রহ করে সঠিক জমার পরিমাণ লিখুন (কমপক্ষে ১ টাকা)');
      return;
    }

    if (!date) {
      alert('অনুগ্রহ করে জমার তারিখ নির্বাচন করুন');
      return;
    }

    // Rule 1: Arrears must be cleared first.
    // If a member has any current/past unpaid weeks (বকেয়া), future weeks cannot be saved as advance/paid.
    if (selectedWeek > settings.currentWeek) {
      const detailed = processMember52Weeks(selectedMember, settings.currentWeek, settings.weeklyTarget);
      const hasArrears = detailed.all52Weeks.some(
        (w) => w.weekNumber <= settings.currentWeek && w.status === 'due'
      );
      if (hasArrears) {
        alert('আপনার বকেয়া পরিশোধ করুন।');
        return;
      }
    }

    const isUpdate = isCurrentWeekPaid;

    // Call save handler (Payment data saved without automatically firing notification)
    onSaveDeposit({
      memberId: selectedMember.id,
      weekNumber: selectedWeek,
      amount: numAmount,
      date,
      method,
      notes: notes.trim() || undefined,
      status: depositStatus,
    });

    // Derive the accurate payment notification message using existing ledger calculation
    // 1. Existing before state (read-only)
    const beforeDetailed = processMember52Weeks(selectedMember, settings.currentWeek, settings.weeklyTarget);

    // 2. Projected after state using the exact same payment distribution logic
    const weeksToCover = Math.max(1, Math.floor(numAmount / 100));
    let projectedWeeklyRecords = Array.isArray(selectedMember.weeklyRecords)
      ? [...selectedMember.weeklyRecords]
      : [];

    const transactedWeeks: number[] = [];
    for (let i = 0; i < weeksToCover; i++) {
      const currentWk = selectedWeek + i;
      if (currentWk > 52) break;
      transactedWeeks.push(currentWk);
      const existingIdx = projectedWeeklyRecords.findIndex((r) => r.weekNumber === currentWk);
      const weekStatus = currentWk <= settings.currentWeek ? 'paid' : 'advance';
      const updatedRec = {
        weekNumber: currentWk,
        targetAmount: 100,
        paidAmount: 100,
        dueAmount: 0,
        paymentDate: date,
        status: weekStatus as any,
        paymentMethod: method,
      };
      if (existingIdx >= 0) {
        projectedWeeklyRecords = projectedWeeklyRecords.map((r, idx) => (idx === existingIdx ? updatedRec : r));
      } else {
        projectedWeeklyRecords = [...projectedWeeklyRecords, updatedRec];
      }
    }

    const projectedMember: Member = {
      ...selectedMember,
      weeklyRecords: projectedWeeklyRecords,
      totalDeposited: projectedWeeklyRecords.reduce((acc, r) => acc + (r.paidAmount || 0), 0),
    };

    const afterDetailed = processMember52Weeks(projectedMember, settings.currentWeek, settings.weeklyTarget);

    const generatedNotificationMessage = generateNotificationFromLedgerState(
      beforeDetailed.all52Weeks,
      afterDetailed.all52Weeks,
      settings.currentWeek,
      transactedWeeks
    );

    // Create a pending NotificationEvent record in Cloud Firestore
    const eventId = `notif-evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newEvent: NotificationEvent = {
      id: eventId,
      memberId: selectedMember.id,
      type: 'deposit_confirmation',
      memberName: selectedMember.name,
      memberPhone: selectedMember.phone,
      weekNumber: selectedWeek,
      amount: numAmount,
      paymentDate: date,
      message: generatedNotificationMessage,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    saveNotificationEventToFirestore(newEvent);

    setSuccessInfo({
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      memberCode: displayMap.get(selectedMember.id)?.displayMemberCode || selectedMember.memberCode,
      weekNumber: selectedWeek,
      amount: numAmount,
      date,
      status: depositStatus,
      isUpdate,
      notificationEventId: eventId,
      isNotificationConfirmed: false,
      notificationsEnabled: selectedMember.notificationsEnabled !== false,
      notificationMessage: generatedNotificationMessage,
    });

    // Auto dismiss after 15 seconds so admin has ample time to click "Confirm Notification"
    setTimeout(() => {
      setSuccessInfo((prev) => (prev?.weekNumber === selectedWeek ? null : prev));
    }, 15000);
  };

  // Dedicated "Confirm & Send Notification" handler triggered strictly on explicit Admin action
  const handleConfirmSendNotification = async () => {
    if (!successInfo || !successInfo.notificationEventId || isSendingNotification) return;

    setIsSendingNotification(true);
    try {
      const eventId = successInfo.notificationEventId;

      // 1. Mark event as confirmed in Cloud Firestore
      await updateNotificationEventStatusInFirestore(eventId, {
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
      });

      // 2. Call server-side notification confirmation endpoint
      try {
        await fetch('/api/notifications/confirm-and-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            memberId: successInfo.memberId,
            memberName: successInfo.memberName,
            weekNumber: successInfo.weekNumber,
            amount: successInfo.amount,
            date: successInfo.date,
            message: successInfo.notificationMessage,
          }),
        });
      } catch (srvErr) {
        console.warn('Server notification trigger call note:', srvErr);
      }

      setSuccessInfo((prev) => (prev ? { ...prev, isNotificationConfirmed: true } : null));
    } catch (err) {
      console.error('Failed to confirm notification:', err);
    } finally {
      setIsSendingNotification(false);
    }
  };

  const goToPrevWeek = () => {
    setSelectedWeek((prev) => Math.max(1, prev - 1));
  };

  const goToNextWeek = () => {
    setSelectedWeek((prev) => Math.min(52, prev + 1));
  };

  return (
    <div className="pb-28 pt-2.5 px-3.5 max-w-md mx-auto space-y-4 font-sans text-slate-800">
      {/* ============================================================ */}
      {/* 1. উপরে বড় Header থাকবে: “সাপ্তাহিক জমা”                       */}
      {/* ============================================================ */}
      <header className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                সাপ্তাহিক জমা
              </h1>
            </div>
            <p className="text-sm sm:text-base font-semibold text-slate-500 mt-1">
              সদস্যের কিস্তি জমা ও ৫২ সপ্তাহের হিসাব হালনাগাদ
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200/70">
            <Wallet className="w-6 h-6 stroke-[2.3]" />
          </div>
        </div>

        {/* Current Org Week Banner */}
        <div className="bg-slate-50 rounded-2xl px-4 py-2.5 flex items-center justify-between border border-slate-200/80">
          <span className="text-xs sm:text-sm font-bold text-slate-700">
            চলতি সপ্তাহ: <strong className="text-emerald-800 font-black">সপ্তাহ {toBengaliNumber(settings.currentWeek)}</strong> (মোট ৫২ সপ্তাহ)
          </span>
          <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
            ধার্য: {formatBengaliCurrency(settings.weeklyTarget)}
          </span>
        </div>
      </header>

      {/* Success Notification Banner (After Save) */}
      {successInfo && (
        <div
          id="deposit-success-banner"
          className={`${
            successInfo.status === 'due'
              ? 'bg-rose-50 border-2 border-rose-500'
              : successInfo.status === 'advance'
              ? 'bg-sky-50 border-2 border-sky-500'
              : 'bg-emerald-50 border-2 border-emerald-600'
          } rounded-3xl p-4 shadow-sm space-y-2 animate-in fade-in slide-in-from-top-2 duration-300`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full text-white flex items-center justify-center shrink-0 ${
                  successInfo.status === 'due'
                    ? 'bg-rose-600'
                    : successInfo.status === 'advance'
                    ? 'bg-sky-600'
                    : 'bg-emerald-600'
                }`}
              >
                {successInfo.status === 'due' ? (
                  <AlertCircle className="w-5 h-5 stroke-[2.5]" />
                ) : successInfo.status === 'advance' ? (
                  <Sparkles className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                )}
              </div>
              <div>
                <h2
                  className={`text-base font-black ${
                    successInfo.status === 'due'
                      ? 'text-rose-950'
                      : successInfo.status === 'advance'
                      ? 'text-sky-950'
                      : 'text-emerald-950'
                  }`}
                >
                  {successInfo.status === 'due'
                    ? 'বকেয়া সফলভাবে সংরক্ষিত হয়েছে!'
                    : successInfo.status === 'advance'
                    ? 'অগ্রিম জমা সফলভাবে সংরক্ষিত হয়েছে!'
                    : successInfo.isUpdate
                    ? 'সাপ্তাহিক জমা সফল হয়েছে'
                    : 'সাপ্তাহিক জমা সফল হয়েছে'}
                </h2>
                <p
                  className={`text-xs font-bold ${
                    successInfo.status === 'due'
                      ? 'text-rose-800'
                      : successInfo.status === 'advance'
                      ? 'text-sky-800'
                      : 'text-emerald-800'
                  }`}
                >
                  সপ্তাহ {toBengaliNumber(successInfo.weekNumber)}-এর স্ট্যাটাস এখন{' '}
                  <span
                    className={`px-1.5 py-0.5 rounded font-black ${
                      successInfo.status === 'due'
                        ? 'bg-rose-200 text-rose-900'
                        : successInfo.status === 'advance'
                        ? 'bg-sky-200 text-sky-900'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {successInfo.status === 'due'
                      ? '“বকেয়া আছে”'
                      : successInfo.status === 'advance'
                      ? '“অগ্রিম”'
                      : '“জমা হয়েছে”'}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessInfo(null)}
              className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div
            className={`bg-white/80 rounded-2xl p-3 border text-xs sm:text-sm space-y-1 ${
              successInfo.status === 'due'
                ? 'border-rose-200'
                : successInfo.status === 'advance'
                ? 'border-sky-200'
                : 'border-emerald-200/80'
            }`}
          >
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">সদস্য:</span>
              <strong className="text-slate-900 font-bold">
                {successInfo.memberName} ({successInfo.memberCode})
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">সপ্তাহ:</span>
              <strong className="text-slate-900 font-bold">
                সপ্তাহ {toBengaliNumber(successInfo.weekNumber)}
              </strong>
            </div>
            {successInfo.status === 'due' ? (
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">স্ট্যাটাস:</span>
                <strong className="text-rose-600 font-black text-sm">
                  বকেয়া আছে (৳{toBengaliNumber(settings.weeklyTarget || 100)})
                </strong>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">
                    {successInfo.status === 'advance' ? 'অগ্রিম জমার পরিমাণ:' : 'জমার পরিমাণ:'}
                  </span>
                  <strong
                    className={`font-black text-base ${
                      successInfo.status === 'advance' ? 'text-sky-800' : 'text-emerald-800'
                    }`}
                  >
                    {formatBengaliCurrency(successInfo.amount)}
                  </strong>
                </div>
                {successInfo.date && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">জমার তারিখ:</span>
                    <span className="text-slate-700 font-semibold">
                      {getShortBengaliDate(successInfo.date)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Direct link to view 52-week ledger */}
          <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-semibold">হালনাগাদ ৫২ সপ্তাহের হিসাব দেখুন:</span>
            <button
              type="button"
              onClick={() => onSelectMember && onSelectMember(successInfo.memberId)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
            >
              <span>বিবরণী দেখুন</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dedicated Notification Confirm Save Section */}
          {successInfo.status !== 'due' && (
            <div className="pt-2.5 border-t border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    successInfo.notificationsEnabled === false
                      ? 'bg-slate-100 text-slate-500'
                      : successInfo.isNotificationConfirmed
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {successInfo.notificationsEnabled === false ? (
                    <BellOff className="w-4 h-4 stroke-[2.3]" />
                  ) : successInfo.isNotificationConfirmed ? (
                    <CheckCheck className="w-4 h-4 stroke-[2.3]" />
                  ) : (
                    <Bell className="w-4 h-4 stroke-[2.3]" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>পুশ নোটিফিকেশন</span>
                    {successInfo.notificationsEnabled === false ? (
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                        সদস্যের বন্ধ আছে
                      </span>
                    ) : successInfo.isNotificationConfirmed ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">
                        পাঠানো হয়েছে
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-medium">
                        নিশ্চিতকরণ বাকি
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    {successInfo.notificationsEnabled === false
                      ? 'এই সদস্যের নোটিফিকেশন বন্ধ থাকায় মেসেজ যাবে না'
                      : successInfo.isNotificationConfirmed
                      ? 'সদস্যের ডিভাইসে সফলভাবে নোটিফিকেশন পাঠানো হয়েছে'
                      : successInfo.notificationMessage || 'জমা সংরক্ষিত হয়েছে। নোটিফিকেশন পাঠাতে নিচের বাটনে চাপ দিন'}
                  </span>
                </div>
              </div>

              {successInfo.notificationsEnabled !== false && !successInfo.isNotificationConfirmed && (
                <button
                  id="confirm-send-notification-btn"
                  type="button"
                  onClick={handleConfirmSendNotification}
                  disabled={isSendingNotification}
                  className="w-full sm:w-auto px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 active:scale-[0.98] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isSendingNotification ? (
                    <span>পাঠানো হচ্ছে...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>নোটিফিকেশন নিশ্চিত করুন</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. তার নিচে একটি পরিষ্কার form থাকবে:                          */}
      {/* 1. “সদস্য নির্বাচন করুন”                                     */}
      {/* 2. “সপ্তাহ নির্বাচন করুন”                                     */}
      {/* 3. “জমার পরিমাণ”                                            */}
      {/* 4. “জমার তারিখ”                                             */}
      {/* 5. বড় “জমা সংরক্ষণ করুন” button                            */}
      {/* ============================================================ */}
      <form
        onSubmit={handleFormSubmit}
        className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-5"
      >
        {/* ------------------------------------------------------------ */}
        {/* FORM STEP 1: “সদস্য নির্বাচন করুন” (25 জন সদস্যের তালিকা)   */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-2.5">
          <label className="block text-sm sm:text-base font-black text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>১. সদস্য নির্বাচন করুন</span>
            </span>
            <span className="text-xs font-bold text-slate-500">
              মোট {toBengaliNumber(members.length)} জন
            </span>
          </label>

          {/* Quick Search Filter if typing */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="নাম, মেম্বার আইডি বা সিরিয়াল দিয়ে খুঁজুন..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-9 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
            />
            {memberSearchQuery && (
              <button
                type="button"
                onClick={() => setMemberSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search match drawer if filtering */}
          {memberSearchQuery.trim() && (
            <div className="max-h-48 overflow-y-auto space-y-1 p-1.5 bg-slate-50 rounded-2xl border border-slate-200/90 shadow-inner">
              {filteredMemberList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3 font-semibold">কোনো সদস্য পাওয়া যায়নি</p>
              ) : (
                filteredMemberList.map((m) => {
                  const displayInfo = displayMap.get(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMemberId(m.id);
                        setMemberSearchQuery('');
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-between transition-colors cursor-pointer ${
                        selectedMemberId === m.id
                          ? 'bg-emerald-700 text-white font-bold'
                          : 'hover:bg-slate-200/80 text-slate-800'
                      }`}
                    >
                      <span className="font-bold">
                        {toBengaliNumber(displayInfo?.displayIndex || m.serialNumber)}. {m.name}
                      </span>
                      <span className={`font-mono text-xs px-2 py-0.5 rounded-md font-bold ${
                        selectedMemberId === m.id ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {displayInfo?.displayMemberCode || m.memberCode}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Member Selection Dropdown (25 Members) */}
          <div className="relative">
            <select
              id="deposit-member-select"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full h-14 pl-4 pr-10 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 rounded-2xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all cursor-pointer"
            >
              {members.map((m) => {
                const displayInfo = displayMap.get(m.id);
                return (
                  <option key={m.id} value={m.id}>
                    {toBengaliNumber(displayInfo?.displayIndex || m.serialNumber)}. {m.name} — {displayInfo?.displayMemberCode || m.memberCode}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected Member Display Card (Member ID ও সদস্যের নাম বড় ও পরিষ্কার) */}
          {selectedMember && (
            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl text-white font-black text-base flex items-center justify-center shadow-xs shrink-0 ${
                    selectedMember.avatarColor || 'bg-emerald-700'
                  }`}
                >
                  {toBengaliNumber(displayMap.get(selectedMember.id)?.displayIndex || selectedMember.serialNumber)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 truncate leading-tight">
                      {selectedMember.name}
                    </h2>
                    <span className="font-mono text-xs font-black bg-emerald-700 text-white px-2 py-0.5 rounded-lg shrink-0">
                      {displayMap.get(selectedMember.id)?.displayMemberCode || selectedMember.memberCode}
                    </span>
                  </div>
                  {selectedMember.phone && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{selectedMember.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Quick totals of selected member */}
              <div className="text-right shrink-0">
                <span className="text-[11px] font-bold text-slate-500 block">বর্তমান মোট জমা</span>
                <span className="text-sm sm:text-base font-black text-emerald-800 block leading-tight">
                  {formatBengaliCurrency(memberFinance.totalPaid)}
                </span>
                <span className="text-[10px] font-bold text-slate-500 block mt-0.5">
                  জমা: {toBengaliNumber(memberFinance.paidWeeksCount)} | বকেয়া: {toBengaliNumber(memberFinance.dueWeeksCount)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100" />

        {/* ------------------------------------------------------------ */}
        {/* FORM STEP 2: “সপ্তাহ নির্বাচন করুন” (Week 1 থেকে Week 52)    */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>২. সপ্তাহ নির্বাচন করুন</span>
            </label>

            <button
              type="button"
              onClick={() => setSelectedWeek(settings.currentWeek)}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
            >
              চলতি সপ্তাহ ({toBengaliNumber(settings.currentWeek)})
            </button>
          </div>

          {/* Stepper with Previous, Select & Next */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPrevWeek}
              disabled={selectedWeek <= 1}
              className="h-14 px-3.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-slate-700 flex items-center justify-center font-bold transition-colors shrink-0 cursor-pointer"
              title="পূর্ববর্তী সপ্তাহ"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            <select
              id="deposit-week-select"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="flex-1 h-14 px-4 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 rounded-2xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all cursor-pointer"
            >
              {Array.from({ length: 52 }, (_, i) => {
                const wNum = i + 1;
                const pw = memberFinance.all52Weeks.find((w) => w.weekNumber === wNum);
                const isPaid = pw?.status === 'paid';
                const isAdv = pw?.status === 'advance';
                const isDue = pw?.status === 'due';
                return (
                  <option key={wNum} value={wNum}>
                    Week {toBengaliNumber(wNum)} (সপ্তাহ {toBengaliNumber(wNum)}){' '}
                    {isPaid
                      ? '— ✓ জমা হয়েছে (৳১০০)'
                      : isAdv
                      ? '— ✦ অগ্রিম জমা (৳১০০)'
                      : isDue
                      ? '— ⚠ বকেয়া (৳১০০)'
                      : '— বাকি সপ্তাহ'}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={goToNextWeek}
              disabled={selectedWeek >= 52}
              className="h-14 px-3.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl text-slate-700 flex items-center justify-center font-bold transition-colors shrink-0 cursor-pointer"
              title="পরবর্তী সপ্তাহ"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Current Status of Selected Week Indicator */}
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs sm:text-sm ${
              selectedWeekProcessed?.status === 'due'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : selectedWeekProcessed?.status === 'advance'
                ? 'bg-sky-50 border-sky-200 text-sky-900'
                : selectedWeekProcessed?.status === 'paid'
                ? 'bg-emerald-50 border-emerald-200/90 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {selectedWeekProcessed?.status === 'due' ? (
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              ) : selectedWeekProcessed?.status === 'advance' ? (
                <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />
              ) : selectedWeekProcessed?.status === 'paid' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-slate-400 shrink-0" />
              )}
              <span className="font-bold">
                সপ্তাহ {toBengaliNumber(selectedWeek)}-এর বর্তমান অবস্থা:
              </span>
            </div>

            <span
              className={`font-black px-3 py-1 rounded-full text-xs ${
                selectedWeekProcessed?.status === 'due'
                  ? 'bg-rose-600 text-white'
                  : selectedWeekProcessed?.status === 'advance'
                  ? 'bg-sky-600 text-white'
                  : selectedWeekProcessed?.status === 'paid'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-300 text-slate-800'
              }`}
            >
              {selectedWeekProcessed?.status === 'due'
                ? 'বকেয়া আছে (৳১০০)'
                : selectedWeekProcessed?.status === 'advance'
                ? 'অগ্রিম জমা (৳১০০)'
                : selectedWeekProcessed?.status === 'paid'
                ? 'জমা হয়েছে (৳১০০)'
                : 'বাকি সপ্তাহ'}
            </span>
          </div>
          {weekRecord && (
            <p className="text-xs text-slate-500 font-medium">
              * তথ্য: এই সপ্তাহে পূর্বে{' '}
              {weekRecord.status === 'due'
                ? 'বকেয়া হিসেবে'
                : weekRecord.status === 'advance'
                ? `অগ্রিম ৳${toBengaliNumber(weekRecord.paidAmount || 0)} টাকা`
                : `৳${toBengaliNumber(weekRecord.paidAmount || 0)} টাকা জমা`}
              {' '}সংরক্ষিত হয়েছিল। পুনরায় সংরক্ষণ করলে আগের রেকর্ড আপডেট হবে।
            </p>
          )}
        </div>

        <div className="border-t border-slate-100" />

        {/* ------------------------------------------------------------ */}
        {/* FORM STEP 3: স্ট্যাটাস নির্বাচন (“জমা হয়েছে”, “বকেয়া”)        */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-2">
          <label className="block text-sm sm:text-base font-black text-slate-900">
            ৩. স্ট্যাটাস নির্ধারণ করুন *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="deposit-status-paid-btn"
              type="button"
              onClick={() => setDepositStatus('paid')}
              className={`h-13 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                depositStatus === 'paid'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>জমা হয়েছে</span>
            </button>

            <button
              id="deposit-status-due-btn"
              type="button"
              onClick={() => setDepositStatus('due')}
              className={`h-13 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                depositStatus === 'due'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/20'
                  : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
              }`}
            >
              <AlertCircle className="w-4 h-4 stroke-[2.5]" />
              <span>বকেয়া</span>
            </button>
          </div>
        </div>

        {depositStatus !== 'due' ? (
          <>
            {/* ------------------------------------------------------------ */}
            {/* FORM STEP 4 & 5: “জমার পরিমাণ” ও “জমার তারিখ”                 */}
            {/* ------------------------------------------------------------ */}
            <div className="space-y-4 pt-1">
              {/* ৪. “জমার পরিমাণ” */}
              <div className="space-y-2">
                <label className="block text-sm sm:text-base font-black text-slate-900">
                  ৪. জমার পরিমাণ (টাকা) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">
                    ৳
                  </span>
                  <input
                    id="deposit-amount-input"
                    type="number"
                    min="1"
                    step="1"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    placeholder="যেমন: 100"
                    className="w-full h-14 pl-10 pr-4 bg-slate-50 border border-slate-200/90 rounded-2xl text-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                  />
                </div>

                {/* Quick preset amount chips */}
                <div className="grid grid-cols-4 gap-2 pt-0.5">
                  {[100, 500, 1000, 2000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`py-2 px-1 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                        amount === preset
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      ৳{toBengaliNumber(preset)}
                    </button>
                  ))}
                </div>

                {amount > 100 && (
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-2.5 text-xs sm:text-sm text-sky-900 font-medium">
                    <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sky-950">
                        স্বয়ংক্রিয় সাপ্তাহিক বণ্টন: ৳{toBengaliNumber(amount)} = {toBengaliNumber(Math.round(amount / 100))} সপ্তাহের কিস্তি
                      </p>
                      <p className="text-sky-800 text-xs mt-0.5">
                        সপ্তাহ {toBengaliNumber(selectedWeek)} থেকে সপ্তাহ {toBengaliNumber(Math.min(52, selectedWeek + Math.round(amount / 100) - 1))} পর্যন্ত প্রতি সপ্তাহে পৃথকভাবে ৳১০০ টাকা করে জমা হবে।
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ৫. “জমার তারিখ” (Date picker) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm sm:text-base font-black text-slate-900">
                    ৫. জমার তারিখ *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = getBangladeshDateString();
                      setDate(todayStr);
                      if (!initialWeekNumber) {
                        setSelectedWeek(getCurrentWeekNumber(todayStr));
                      }
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                  >
                    আজকের তারিখ
                  </button>
                </div>
                <input
                  id="deposit-date-picker"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setDate(newDate);
                    if (newDate && !initialWeekNumber) {
                      setSelectedWeek(getCurrentWeekNumber(newDate));
                    }
                  }}
                  required
                  className="w-full h-14 px-4 bg-slate-50 border border-slate-200/90 rounded-2xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all cursor-pointer"
                />
              </div>

              {/* Optional Method & Notes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">
                  পরিশোধ মাধ্যম
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: 'নগদ' },
                    { id: 'bkash', label: 'বিকাশ' },
                    { id: 'nagad', label: 'নগদ (Nagad)' },
                    { id: 'bank', label: 'ব্যাংক' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id as 'cash' | 'bkash' | 'nagad' | 'bank')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        method === m.id
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600">
                  মন্তব্য / রসিদ নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: সরাসরি অফিসে জমা..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* FORM STEP 6: জমা সংরক্ষণ বাটন                                 */}
            {/* ------------------------------------------------------------ */}
            <div className="pt-2">
              <button
                id="btn-save-deposit"
                type="submit"
                className="w-full h-15 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-black text-lg rounded-2xl shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <Check className="w-6 h-6 stroke-[3]" />
                <span>জমা সংরক্ষণ করুন</span>
              </button>
              <p className="text-xs text-slate-500 text-center mt-2.5 font-medium">
                সংরক্ষণ করলে নির্বাচিত সপ্তাহের স্ট্যাটাস অবিলম্বে <strong className="text-emerald-800 font-bold">“জমা হয়েছে”</strong> হবে এবং সদস্যের মোট জমা ও বকেয়া স্বয়ংক্রিয়ভাবে হালনাগাদ হবে।
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Due Information Box */}
            <div className="space-y-3 pt-1">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-black text-sm sm:text-base">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>সপ্তাহ {toBengaliNumber(selectedWeek)}-কে বকেয়া হিসেবে চিহ্নিত করা হচ্ছে</span>
                </div>
                <p className="text-xs sm:text-sm text-rose-800 font-medium leading-relaxed">
                  এই সদস্যের জন্য সপ্তাহ {toBengaliNumber(selectedWeek)}-এর ধার্য পরিমাণ <strong>৳{toBengaliNumber(settings.weeklyTarget || 100)}</strong> টাকা। বকেয়া হিসেবে সংরক্ষণ করলে এই সপ্তাহের স্ট্যাটাস অবিলম্বে <strong className="text-rose-700">“বকেয়া আছে”</strong> হিসেবে প্রদর্শিত হবে।
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600">
                  মন্তব্য / নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: পরবর্তীতে একবারে পরিশোধ করবে..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Save Due Button */}
            <div className="pt-2">
              <button
                id="btn-save-due"
                type="submit"
                className="w-full h-15 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-black text-lg rounded-2xl shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <AlertCircle className="w-6 h-6 stroke-[2.5]" />
                <span>বকেয়া হিসেবে সংরক্ষণ করুন</span>
              </button>
              <p className="text-xs text-slate-500 text-center mt-2.5 font-medium">
                সংরক্ষণ করলে নির্বাচিত সপ্তাহের স্ট্যাটাস অবিলম্বে <strong className="text-rose-700 font-bold">“বকেয়া আছে”</strong> হবে এবং সদস্যের মোট বকেয়া ৳{toBengaliNumber(settings.weeklyTarget || 100)} যোগ হবে।
              </p>
            </div>
          </>
        )}
      </form>

      {/* Quick link to Member Profile */}
      {selectedMember && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-500 block">বিস্তারিত দেখতে চান?</span>
            <p className="text-sm sm:text-base font-black text-slate-900 truncate">
              {selectedMember.name}-এর ৫২ সপ্তাহের বিবরণী
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectMember(selectedMember.id)}
            className="h-11 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-xs sm:text-sm flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
          >
            <span>প্রোফাইল খুলুন</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. Form-এর নিচে “সাম্প্রতিক জমা” section থাকবে:               */}
      {/* প্রতিটি entry:                                               */}
      {/* - সদস্যের নাম                                                */}
      {/* - Member ID                                                 */}
      {/* - Week                                                      */}
      {/* - Amount                                                    */}
      {/* - Date                                                      */}
      {/* ============================================================ */}
      <section className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4" aria-label="Recent Deposits">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                সাম্প্রতিক জমা
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                সর্বশেষ কিস্তি জমার বিবরণী
              </p>
            </div>
          </div>

          <span className="text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-full">
            {toBengaliNumber(recentTransactions.length)}টি জমা
          </span>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">এখনো কোনো জমার তথ্য এন্ট্রি করা হয়নি</p>
            <p className="text-xs text-slate-400 mt-1">উপরের ফর্ম থেকে জমা সংরক্ষণ করুন</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-emerald-200 transition-all space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {/* সদস্যের নাম ও Member ID */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-base text-slate-900 truncate leading-tight">
                        {tx.memberName}
                      </h3>
                      <span className="font-mono text-xs font-bold bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded-lg">
                        {tx.memberCode}
                      </span>
                    </div>

                    {/* Week ও Date */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 font-medium flex-wrap">
                      <span className="bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded-md">
                        সপ্তাহ {toBengaliNumber(tx.weekNumber)}
                      </span>
                      <span>•</span>
                      <span>তারিখ: <strong className="text-slate-800 font-bold">{getShortBengaliDate(tx.date)}</strong></span>
                      {tx.paymentMethod && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500">
                            {tx.paymentMethod === 'cash' ? 'নগদ' : tx.paymentMethod}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount (টাকা) & Status (জমা হয়েছে) */}
                  <div className="text-right shrink-0">
                    <span className="text-base sm:text-lg font-black text-emerald-800 block leading-tight">
                      + {formatBengaliCurrency(tx.amount)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full mt-1">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      <span>জমা হয়েছে</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

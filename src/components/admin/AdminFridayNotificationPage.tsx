import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Calendar,
  Users,
  Send,
  Edit3,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { Member, OrganizationSettings, NotificationEvent } from '../../types';
import { toBengaliNumber, formatBengaliCurrency } from '../../utils/bengali';
import { processMember52Weeks } from '../../utils/calculations';
import { saveNotificationEventToFirestore } from '../../services/firebaseService';
import { AdminAvatar } from './AdminAvatar';

export interface AdminFridayNotificationPageProps {
  onBack: () => void;
  members?: Member[];
  settings?: OrganizationSettings;
}

/**
 * Generates accurate Friday notification message based strictly on member's payment records.
 * Rules:
 * - Single newline spacing between sentences (no extra blank lines).
 * - Always starts with "প্রিয় সদস্য,".
 * - Never includes member's personal name.
 * - Never uses "সম্মানিত".
 * - Never uses "হালনাগাদ".
 * - Priority A: Advance with no dues.
 * - Priority B: Current week paid with no dues.
 * - Priority C: Only current week is due.
 * - Priority D: Prior weeks + current week due (or prior weeks due).
 */
export function generateFridayNotificationMessage(
  member: Member,
  currentWeek: number
): string {
  const finances = processMember52Weeks(member, currentWeek);
  const { summary, all52Weeks } = finances;
  const { totalDue, currentWeekPaid } = summary;

  // Due weeks among past and current weeks (<= currentWeek)
  const dueWeekRecords = all52Weeks.filter(
    (w) => w.weekNumber <= currentWeek && w.status === 'due'
  );
  const dueWeekNumbers = dueWeekRecords.map((w) => w.weekNumber);

  // Highest week covered by advance (> currentWeek)
  const advanceWeekNumbers = all52Weeks
    .filter((w) => w.weekNumber > currentWeek && w.status === 'advance')
    .map((w) => w.weekNumber);
  const maxAdvanceWeek =
    advanceWeekNumbers.length > 0 ? Math.max(...advanceWeekNumbers) : null;

  // PRIORITY A: Advance with NO dues
  if (totalDue === 0 && maxAdvanceWeek !== null && maxAdvanceWeek > currentWeek) {
    return `প্রিয় সদস্য,\nআপনার ${toBengaliNumber(maxAdvanceWeek)} তম সপ্তাহ পর্যন্ত অগ্রিম জমা আছে, সাথে থাকার জন্য ধন্যবাদ।`;
  }

  // PRIORITY B: Current week paid with NO dues
  if (totalDue === 0 && currentWeekPaid) {
    return `প্রিয় সদস্য,\nআপনার চলতি সপ্তাহ ${toBengaliNumber(currentWeek)} এর সাপ্তাহিক টাকা জমা আছে, সাথে থাকার জন্য ধন্যবাদ।`;
  }

  // PRIORITY C: Only current week is due (no prior weeks due)
  if (dueWeekNumbers.length === 1 && dueWeekNumbers[0] === currentWeek) {
    return `প্রিয় সদস্য,\nআপনার চলতি সপ্তাহ ${toBengaliNumber(currentWeek)} এর সাপ্তাহিক টাকা এখনও জমা হয়নি।\nনির্দিষ্ট সময়মতো আপনার সাপ্তাহিক জমা পরিশোধ করুন।`;
  }

  // PRIORITY D: Prior weeks + current week due, or multiple weeks due
  if (dueWeekNumbers.length > 0) {
    let weeksText = '';
    const hasCurrentWeekDue = dueWeekNumbers.includes(currentWeek);
    const pastDueWeeks = dueWeekNumbers.filter((w) => w !== currentWeek);

    if (hasCurrentWeekDue) {
      if (pastDueWeeks.length > 0) {
        const pastStr = pastDueWeeks.map((w) => toBengaliNumber(w)).join(', ');
        weeksText = `${pastStr} ও চলতি সপ্তাহ ${toBengaliNumber(currentWeek)}`;
      } else {
        weeksText = `চলতি সপ্তাহ ${toBengaliNumber(currentWeek)}`;
      }
    } else {
      if (pastDueWeeks.length === 1) {
        weeksText = `${toBengaliNumber(pastDueWeeks[0])} নম্বর সপ্তাহের`;
      } else {
        const last = pastDueWeeks[pastDueWeeks.length - 1];
        const rest = pastDueWeeks.slice(0, -1);
        weeksText = `${rest.map((w) => toBengaliNumber(w)).join(', ')} ও ${toBengaliNumber(last)} নম্বর সপ্তাহের`;
      }
    }

    return `প্রিয় সদস্য,\nআপনার ${weeksText} এর মোট ${toBengaliNumber(totalDue)} টাকা বকেয়া রয়েছে।\nনির্দিষ্ট সময়মতো আপনার বকেয়া পরিশোধ করুন।`;
  }

  // Fallback
  return `প্রিয় সদস্য,\nআপনার চলতি সপ্তাহ ${toBengaliNumber(currentWeek)} এর সাপ্তাহিক টাকা জমা আছে, সাথে থাকার জন্য ধন্যবাদ।`;
}

export const AdminFridayNotificationPage: React.FC<AdminFridayNotificationPageProps> = ({
  onBack,
  members = [],
  settings,
}) => {
  const currentWeek = Number(settings?.currentWeek) || 1;

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Map of memberId -> customized edited message
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});

  // Map of memberId -> boolean indicating if textarea is currently expanded/editing
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Sending status per member: null | 'sending' | { type: 'success' | 'error' | 'skipped', message: string }
  const [sendingMemberId, setSendingMemberId] = useState<string | null>(null);
  const [memberStatus, setMemberStatus] = useState<
    Record<string, { type: 'success' | 'error' | 'skipped'; message: string }>
  >({});

  // Bulk sending state for "সকল সদস্যকে নোটিফিকেশন পাঠান"
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkSummaryMessage, setBulkSummaryMessage] = useState<string | null>(null);

  const safeMembers = useMemo(() => {
    return Array.isArray(members)
      ? members.filter((m): m is Member => Boolean(m && typeof m === 'object' && m.id))
      : [];
  }, [members]);

  const activeMembers = useMemo(() => {
    return safeMembers.filter((m) => (m as any)?.status !== 'inactive');
  }, [safeMembers]);

  // Order active members by serial number
  const sortedActiveMembers = useMemo(() => {
    return [...activeMembers].sort((a, b) => (a.serialNumber || 0) - (b.serialNumber || 0));
  }, [activeMembers]);

  // Compute finance details for each member
  const processedMembers = useMemo(() => {
    return sortedActiveMembers.map((m) => {
      const finance = processMember52Weeks(m, currentWeek);
      const autoMessage = generateFridayNotificationMessage(m, currentWeek);
      return {
        member: m,
        finance,
        autoMessage,
      };
    });
  }, [sortedActiveMembers, currentWeek]);

  // Filter based on search query
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return processedMembers;
    return processedMembers.filter(({ member }) => {
      const name = (member.name || '').toLowerCase();
      const phone = (member.phone || '').toLowerCase();
      const serial = String(member.serialNumber || '');
      return name.includes(q) || phone.includes(q) || serial.includes(q);
    });
  }, [processedMembers, searchQuery]);

  // Retrieve current active message for a member (custom edited or auto-generated)
  const getActiveMessage = useCallback(
    (memberId: string, autoMessage: string): string => {
      if (editedMessages[memberId] !== undefined) {
        return editedMessages[memberId];
      }
      return autoMessage;
    },
    [editedMessages]
  );

  // Helper to dispatch notification for an individual member
  const dispatchSingleNotification = async (
    member: Member,
    messageToSend: string,
    totalDue: number
  ): Promise<{ success: boolean; skipped?: boolean; error?: string }> => {
    const eventId = `notif-fri-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newEvent: NotificationEvent = {
      id: eventId,
      memberId: member.id,
      type: 'weekly_reminder',
      memberName: member.name,
      memberPhone: member.phone,
      weekNumber: currentWeek,
      amount: totalDue || settings?.weeklyTarget || 100,
      message: messageToSend,
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // 1. Save in Firestore notificationEvents
    await saveNotificationEventToFirestore(newEvent);

    // 2. Dispatch via server-side confirm-and-send endpoint
    const response = await fetch('/api/notifications/confirm-and-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        memberId: member.id,
        memberName: member.name,
        weekNumber: currentWeek,
        amount: totalDue || settings?.weeklyTarget || 100,
        message: messageToSend,
      }),
    });

    const resData = await response.json().catch(() => ({}));
    if (response.ok && resData.success) {
      return { success: true };
    }
    if (resData.skipped) {
      return { success: false, skipped: true, error: resData.message };
    }
    return { success: false, error: resData.error || 'নোটিফিকেশন পাঠানো সম্পন্ন করা যায়নি।' };
  };

  // Handle individual notification send
  const handleSendIndividual = async (
    member: Member,
    messageToSend: string,
    totalDue: number
  ) => {
    const trimmed = messageToSend.trim();
    if (!trimmed || sendingMemberId || isBulkSending) return;

    setSendingMemberId(member.id);
    setMemberStatus((prev) => {
      const next = { ...prev };
      delete next[member.id];
      return next;
    });

    try {
      const result = await dispatchSingleNotification(member, trimmed, totalDue);
      if (result.success) {
        setMemberStatus((prev) => ({
          ...prev,
          [member.id]: {
            type: 'success',
            message: '✓ নোটিফিকেশন সফলভাবে পাঠানো হয়েছে',
          },
        }));
      } else if (result.skipped) {
        setMemberStatus((prev) => ({
          ...prev,
          [member.id]: {
            type: 'skipped',
            message: result.error || 'এই সদস্যের নোটিফিকেশন বন্ধ রয়েছে।',
          },
        }));
      } else {
        setMemberStatus((prev) => ({
          ...prev,
          [member.id]: {
            type: 'error',
            message: result.error || 'নোটিফিকেশন পাঠানো সম্পন্ন করা যায়নি।',
          },
        }));
      }
    } catch (err: any) {
      console.error('Failed to send Friday notification:', err);
      setMemberStatus((prev) => ({
        ...prev,
        [member.id]: {
          type: 'error',
          message: 'নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।',
        },
      }));
    } finally {
      setSendingMemberId(null);
    }
  };

  // Handle Send All Active Members with their respective individual messages
  const handleSendAllActive = async () => {
    if (isBulkSending || sendingMemberId || activeMembers.length === 0) return;

    setIsBulkSending(true);
    setBulkSummaryMessage(null);
    setBulkProgress({ current: 0, total: activeMembers.length });

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < activeMembers.length; i++) {
      const member = activeMembers[i];
      setBulkProgress({ current: i + 1, total: activeMembers.length });

      const finance = processMember52Weeks(member, currentWeek);
      const autoMessage = generateFridayNotificationMessage(member, currentWeek);
      const messageToSend = (editedMessages[member.id] || autoMessage).trim();

      try {
        const result = await dispatchSingleNotification(
          member,
          messageToSend,
          finance.summary.totalDue
        );

        if (result.success) {
          successCount++;
          setMemberStatus((prev) => ({
            ...prev,
            [member.id]: {
              type: 'success',
              message: '✓ নোটিফিকেশন সফলভাবে পাঠানো হয়েছে',
            },
          }));
        } else if (result.skipped) {
          skippedCount++;
          setMemberStatus((prev) => ({
            ...prev,
            [member.id]: {
              type: 'skipped',
              message: result.error || 'এই সদস্যের নোটিফিকেশন বন্ধ রয়েছে।',
            },
          }));
        } else {
          failedCount++;
          setMemberStatus((prev) => ({
            ...prev,
            [member.id]: {
              type: 'error',
              message: result.error || 'নোটিফিকেশন পাঠানো সম্পন্ন করা যায়নি।',
            },
          }));
        }
      } catch (err: any) {
        failedCount++;
        setMemberStatus((prev) => ({
          ...prev,
          [member.id]: {
            type: 'error',
            message: 'নোটিফিকেশন পাঠাতে সমস্যা হয়েছে।',
          },
        }));
      }

      // 120ms interval between dispatches to maintain balanced connection flow
      if (i < activeMembers.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
    }

    setIsBulkSending(false);
    setBulkProgress(null);
    setBulkSummaryMessage(
      `সকল সক্রিয় সদস্যকে নোটিফিকেশন পাঠানো সম্পন্ন হয়েছে (সফল: ${toBengaliNumber(successCount)} জন, নোটিফিকেশন বন্ধ: ${toBengaliNumber(skippedCount)} জন${failedCount > 0 ? `, ব্যর্থ: ${toBengaliNumber(failedCount)} জন` : ''})`
    );
  };

  return (
    <div
      id="admin-friday-notification-page"
      className="min-h-screen bg-[#eaf4fc] text-slate-900 pb-28 font-sans"
    >
      <div className="w-full max-w-md mx-auto px-3.5 sm:px-4 py-3 sm:py-4 space-y-3">
        {/* ============================================================ */}
        {/* 1. Header Bar                                                */}
        {/* ============================================================ */}
        <header className="bg-white rounded-3xl p-3.5 sm:p-4 border border-[#d6e8f6] shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="friday-notification-back-btn"
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="ফিরে যান"
              aria-label="ফিরে যান"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
                <span className="text-xl">🔔</span>
                <span>শুক্রবারের নোটিফিকেশন</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate">
                সকল সদস্যের সাপ্তাহিক জমা, বকেয়া ও অগ্রিম নোটিফিকেশন
              </p>
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* 2. Compact Green Info Card                                   */}
        {/* ============================================================ */}
        <div className="bg-gradient-to-r from-[#007a55] to-[#005a3e] rounded-2xl p-2.5 sm:p-3 text-white shadow-xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-black tracking-tight leading-snug truncate">
              সাপ্তাহিক হিসাবভিত্তিক পুশ নোটিফিকেশন
            </h2>
            <p className="text-[11px] text-emerald-100/90 leading-tight truncate mt-0.5">
              সদস্যদের জমা, বকেয়া ও অগ্রিমের স্বয়ংক্রিয় নোটিফিকেশন
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-[10px] sm:text-[11px] font-bold text-emerald-100">
            <span className="bg-white/15 px-2 py-0.5 rounded-lg border border-white/20 whitespace-nowrap">
              সপ্তাহ {toBengaliNumber(currentWeek)}
            </span>
            <span className="bg-white/15 px-2 py-0.5 rounded-lg border border-white/20 whitespace-nowrap">
              {toBengaliNumber(activeMembers.length)} জন
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. Search Bar                                                */}
        {/* ============================================================ */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="সদস্যের নাম, নম্বর বা ক্রম দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200/90 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
          />
        </div>

        {/* ============================================================ */}
        {/* 4. Members List & Editable Notification Draft Cards          */}
        {/* ============================================================ */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>সদস্য তালিকা ও নোটিফিকেশন বার্তা</span>
            </span>
            <span className="text-[11px] font-bold text-slate-500 font-mono">
              {toBengaliNumber(filteredMembers.length)} জন
            </span>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80 shadow-2xs">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-500">কোনো সদস্য পাওয়া যায়নি</p>
            </div>
          ) : (
            filteredMembers.map(({ member, finance, autoMessage }) => {
              const currentMessage = getActiveMessage(member.id, autoMessage);
              const isEdited =
                editedMessages[member.id] !== undefined &&
                editedMessages[member.id] !== autoMessage;
              const isCardEditing = editingCardId === member.id;
              const isSending = sendingMemberId === member.id;
              const status = memberStatus[member.id];

              const isDue = finance.summary.totalDue > 0;
              const isAdvance = finance.summary.advanceAmount > 0;

              return (
                <div
                  key={member.id}
                  id={`friday-notif-member-${member.id}`}
                  className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 shadow-2xs space-y-2 transition-all"
                >
                  {/* Member Identity Header */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="shrink-0">
                        <AdminAvatar member={member} size="sm" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                            #{toBengaliNumber(member.serialNumber || 0)}
                          </span>
                          <h3 className="text-xs sm:text-sm font-black text-slate-800 truncate">
                            {member.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono truncate">
                          {member.phone}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 text-right">
                      {isDue ? (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-rose-800 bg-rose-50 border border-rose-200 whitespace-nowrap">
                          বকেয়া {formatBengaliCurrency(finance.summary.totalDue)}
                        </span>
                      ) : isAdvance ? (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-blue-800 bg-blue-50 border border-blue-200 whitespace-nowrap">
                          অগ্রিম {formatBengaliCurrency(finance.summary.advanceAmount)}
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-800 bg-emerald-50 border border-emerald-200 whitespace-nowrap">
                          সাপ্তাহিক টাকা জমা আছে
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Draft / Editor Box */}
                  <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-500 flex items-center gap-1">
                        <span>বার্তা:</span>
                        {isEdited && (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md">
                            সম্পাদিত
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {isEdited && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditedMessages((prev) => {
                                const next = { ...prev };
                                delete next[member.id];
                                return next;
                              });
                            }}
                            className="text-slate-500 hover:text-slate-800 flex items-center gap-0.5 transition-colors cursor-pointer"
                            title="মূল স্বয়ংক্রিয় বার্তায় ফিরিয়ে নিন"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>রিসেট</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setEditingCardId(isCardEditing ? null : member.id)
                          }
                          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isCardEditing ? 'সম্পন্ন' : 'এডিট'}</span>
                        </button>
                      </div>
                    </div>

                    {isCardEditing ? (
                      <textarea
                        rows={3}
                        value={currentMessage}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditedMessages((prev) => ({
                            ...prev,
                            [member.id]: val,
                          }));
                        }}
                        className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-xs text-slate-800 leading-snug font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="নোটিফিকেশন বার্তা লিখুন..."
                      />
                    ) : (
                      <div
                        onClick={() => setEditingCardId(member.id)}
                        className="text-xs text-slate-700 leading-snug whitespace-pre-line font-sans cursor-pointer hover:text-slate-900 transition-colors"
                        title="বার্তা এডিট করতে ক্লিক করুন"
                      >
                        {currentMessage}
                      </div>
                    )}
                  </div>

                  {/* Send Action and Status Feedback */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    {/* Status Feedback */}
                    <div className="min-w-0 flex-1">
                      {status && (
                        <div
                          className={`text-[11px] font-bold flex items-center gap-1.5 truncate ${
                            status.type === 'success'
                              ? 'text-emerald-700'
                              : status.type === 'skipped'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {status.type === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{status.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Individual "পাঠান" Button */}
                    <button
                      type="button"
                      id={`send-friday-notif-${member.id}`}
                      onClick={() =>
                        handleSendIndividual(
                          member,
                          currentMessage,
                          finance.summary.totalDue
                        )
                      }
                      disabled={isSending || isBulkSending}
                      className="px-3 py-1.5 rounded-xl bg-[#007a55] hover:bg-[#006848] active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSending ? (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      <span>{isSending ? 'পাঠানো হচ্ছে...' : 'পাঠান'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ============================================================ */}
        {/* 5. Full-width "সকল সদস্যকে নোটিফিকেশন পাঠান" Action Card      */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-[#d6e8f6] shadow-xs space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📣</span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-tight">
                  সকল সক্রিয় সদস্যের বাল্ক নোটিফিকেশন
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  প্রত্যেক সক্রিয় সদস্য তার নিজস্ব ব্যক্তিগত হিসাবের বার্তা পাবেন
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
              {toBengaliNumber(activeMembers.length)} জন
            </span>
          </div>

          {bulkSummaryMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 text-xs font-bold text-emerald-900 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{bulkSummaryMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setBulkSummaryMessage(null)}
                className="text-emerald-700 hover:text-emerald-950 font-black px-1.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <button
            type="button"
            id="send-all-friday-notif-btn"
            onClick={handleSendAllActive}
            disabled={isBulkSending || Boolean(sendingMemberId) || activeMembers.length === 0}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#007a55] to-[#005a3e] hover:from-[#006848] hover:to-[#004a32] active:scale-[0.99] text-white text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isBulkSending ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>
                  পাঠানো হচ্ছে... ({toBengaliNumber(bulkProgress?.current || 0)}/
                  {toBengaliNumber(bulkProgress?.total || 0)})
                </span>
              </>
            ) : (
              <>
                <span className="text-base leading-none">📣</span>
                <span>সকল সদস্যকে নোটিফিকেশন পাঠান</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

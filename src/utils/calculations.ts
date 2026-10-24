import { Member } from '../types';

export interface MemberFinanceSummary {
  totalTargetUpToCurrent: number;
  totalPaid: number;
  totalDue: number;
  advanceAmount: number;
  isDefaulter: boolean; // has due
  dueWeeksCount: number;
  paidWeeksCount: number;
  currentWeekPaid: boolean;
  currentWeekAmount: number;
}

export interface ProcessedWeekRecord {
  weekNumber: number;
  targetAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentDate?: string;
  status: 'paid' | 'due' | 'advance' | 'upcoming';
  statusLabel: string;
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'bank';
  receiptNo?: string;
  notes?: string;
}

export interface MemberDetailedFinances {
  summary: MemberFinanceSummary;
  all52Weeks: ProcessedWeekRecord[];
  totalWeeksCount: number;
  paidWeeksCount: number;
  dueWeeksCount: number;
  totalDeposit: number;
  totalAdvance: number;
  totalDue: number;
  remainingWeeksCount: number;
  paidPercentage: number;
}

/**
 * Process 52-week ledger for a member.
 * Single source of truth for weekly records, due amount, advance, and status.
 */
export function processMember52Weeks(
  member: Member | null | undefined,
  currentWeek: number,
  _weeklyTarget: number = 100
): MemberDetailedFinances {
  // 1. Maximum payment cycle = 52 weeks.
  // Weekly amount = ৳100.
  // Therefore maximum contribution for the complete cycle = 52 × ৳100 = ৳5,200.
  // Never create or display Week 53 or any week beyond Week 52.
  const targetPerWeek = 100;
  const MAX_WEEKS = 52;
  const MAX_CYCLE_AMOUNT = MAX_WEEKS * targetPerWeek; // ৳5,200
  const safeCurrentWeek = Math.min(MAX_WEEKS, Math.max(1, currentWeek));

  if (!member) {
    const emptySummary: MemberFinanceSummary = {
      totalTargetUpToCurrent: 0,
      totalPaid: 0,
      totalDue: 0,
      advanceAmount: 0,
      isDefaulter: false,
      dueWeeksCount: 0,
      paidWeeksCount: 0,
      currentWeekPaid: false,
      currentWeekAmount: 0,
    };
    return {
      summary: emptySummary,
      all52Weeks: [],
      totalWeeksCount: MAX_WEEKS,
      paidWeeksCount: 0,
      dueWeeksCount: 0,
      totalDeposit: 0,
      totalAdvance: 0,
      totalDue: 0,
      remainingWeeksCount: Math.max(0, MAX_WEEKS - safeCurrentWeek),
      paidPercentage: 0,
    };
  }

  const records = Array.isArray(member.weeklyRecords) ? member.weeklyRecords : [];
  const recordsByWeek = new Map<number, any>();
  records.forEach((r) => {
    if (r && typeof r.weekNumber === 'number' && r.weekNumber >= 1 && r.weekNumber <= MAX_WEEKS) {
      recordsByWeek.set(r.weekNumber, r);
    }
  });

  const usableRecords = records.filter(
    (r) => r && typeof r.weekNumber === 'number' && r.weekNumber >= 1 && r.weekNumber <= MAX_WEEKS
  );
  const hasUsableRecords = usableRecords.length > 0;
  const fallbackPaidWeeks = hasUsableRecords
    ? 0
    : Math.min(MAX_WEEKS, Math.floor((Number(member.totalDeposited) || 0) / targetPerWeek));

  const all52Weeks: ProcessedWeekRecord[] = [];
  let currentWeekAmount = 0;
  let currentWeekPaid = false;

  // Step 1: Normal / Current weeks (1 to safeCurrentWeek)
  // Only weeks that have already arrived (weekNumber <= currentWeek) can be “বকেয়া”.
  // A current/past week is due when that specific week has NOT been paid.
  for (let w = 1; w <= safeCurrentWeek; w++) {
    const rec = recordsByWeek.get(w);
    const paymentDate = rec?.paymentDate ? String(rec.paymentDate).trim() : undefined;
    const paymentMethod = rec?.paymentMethod || 'cash';
    const receiptNo = rec?.receiptNo;
    const notes = rec?.notes;

    const isExplicitDue = rec && (rec.status === 'due' || (Number(rec.paidAmount) === 0 && !rec.paymentDate && Number(rec.dueAmount) > 0));
    const isWeekPaid = hasUsableRecords
      ? Boolean(rec && !isExplicitDue && (rec.status === 'paid' || rec.status === 'advance' || Number(rec.paidAmount) > 0))
      : (w <= fallbackPaidWeeks);

    if (isWeekPaid) {
      all52Weeks.push({
        weekNumber: w,
        targetAmount: targetPerWeek,
        paidAmount: targetPerWeek, // ALWAYS ৳100
        dueAmount: 0,
        paymentDate,
        status: 'paid',
        statusLabel: 'জমা হয়েছে',
        paymentMethod,
        receiptNo,
        notes,
      });
      if (w === safeCurrentWeek) {
        currentWeekAmount = targetPerWeek;
        currentWeekPaid = true;
      }
    } else {
      // Unpaid current/past week is DUE
      all52Weeks.push({
        weekNumber: w,
        targetAmount: targetPerWeek,
        paidAmount: 0,
        dueAmount: targetPerWeek, // ALWAYS ৳100
        paymentDate: undefined,
        status: 'due',
        statusLabel: 'বকেয়া',
        paymentMethod,
        receiptNo: undefined,
        notes,
      });
      if (w === safeCurrentWeek) {
        currentWeekAmount = 0;
        currentWeekPaid = false;
      }
    }
  }

  // Step 2: Future weeks (safeCurrentWeek + 1 to MAX_WEEKS)
  // A future week can display “অগ্রিম জমা” ONLY if that EXACT future week has an explicit paid weekly record.
  // Future weeks 27–52 must NOT be included in due.
  for (let w = safeCurrentWeek + 1; w <= MAX_WEEKS; w++) {
    const rec = recordsByWeek.get(w);
    const paymentDate = rec?.paymentDate ? String(rec.paymentDate).trim() : undefined;
    const paymentMethod = rec?.paymentMethod || 'cash';
    const receiptNo = rec?.receiptNo;
    const notes = rec?.notes;

    const isExplicitFuturePaid = hasUsableRecords
      ? Boolean(rec && rec.status !== 'due' && (rec.status === 'advance' || rec.status === 'paid' || Number(rec.paidAmount) > 0))
      : (w <= fallbackPaidWeeks);

    if (isExplicitFuturePaid) {
      all52Weeks.push({
        weekNumber: w,
        targetAmount: targetPerWeek,
        paidAmount: targetPerWeek, // ALWAYS ৳100
        dueAmount: 0,
        paymentDate,
        status: 'advance',
        statusLabel: 'অগ্রিম জমা',
        paymentMethod,
        receiptNo,
        notes,
      });
    } else {
      // Future unpaid week is upcoming
      all52Weeks.push({
        weekNumber: w,
        targetAmount: targetPerWeek,
        paidAmount: 0,
        dueAmount: 0,
        paymentDate: undefined,
        status: 'upcoming',
        statusLabel: 'বাকি সপ্তাহ',
        paymentMethod,
        receiptNo: undefined,
        notes,
      });
    }
  }

  // Calculate totals strictly from the 52-week ledger
  const paidWeeksCount = all52Weeks.filter((w) => w.status === 'paid' || w.status === 'advance').length;
  const totalDeposit = Math.min(MAX_CYCLE_AMOUNT, paidWeeksCount * targetPerWeek);

  const dueWeeksCount = all52Weeks.filter((w) => w.weekNumber <= safeCurrentWeek && w.status === 'due').length;
  const totalDue = dueWeeksCount * targetPerWeek;

  const advanceWeeksCount = all52Weeks.filter((w) => w.weekNumber > safeCurrentWeek && w.status === 'advance').length;
  const totalAdvance = advanceWeeksCount * targetPerWeek;

  const required = safeCurrentWeek * targetPerWeek;
  const isDefaulter = totalDue > 0;
  const remainingWeeksCount = Math.max(0, MAX_WEEKS - safeCurrentWeek - advanceWeeksCount);
  const paidPercentage = Math.min(100, Math.round((paidWeeksCount / MAX_WEEKS) * 100));

  const summary: MemberFinanceSummary = {
    totalTargetUpToCurrent: required,
    totalPaid: totalDeposit,
    totalDue,
    advanceAmount: totalAdvance,
    isDefaulter,
    dueWeeksCount,
    paidWeeksCount,
    currentWeekPaid,
    currentWeekAmount,
  };

  return {
    summary,
    all52Weeks,
    totalWeeksCount: MAX_WEEKS,
    paidWeeksCount,
    dueWeeksCount,
    totalDeposit,
    totalAdvance,
    totalDue,
    remainingWeeksCount,
    paidPercentage,
  };
}

export function calculateMemberFinances(
  member: Member | null | undefined,
  currentWeek: number = 24
): MemberFinanceSummary {
  return processMember52Weeks(member, currentWeek).summary;
}

export interface OrganizationTotals {
  totalMembers: number;
  totalDepositAllTime: number;
  totalDueAllTime: number;
  currentWeekCollected: number;
  currentWeekTarget: number;
  currentWeekPaidMembersCount: number;
  membersWithDueCount: number;
}

export function calculateOrgTotals(members: Member[], currentWeek: number): OrganizationTotals {
  let totalDepositAllTime = 0;
  let totalDueAllTime = 0;
  let currentWeekCollected = 0;
  let currentWeekTarget = 0;
  let currentWeekPaidMembersCount = 0;
  let membersWithDueCount = 0;

  if (Array.isArray(members)) {
    members.forEach((member) => {
      if (!member) return;
      const detailed = processMember52Weeks(member, currentWeek);
      const summary = detailed.summary;
      totalDepositAllTime += summary.totalPaid;
      totalDueAllTime += summary.totalDue;
      currentWeekCollected += summary.currentWeekAmount;
      currentWeekTarget += 100;

      if (summary.currentWeekPaid) {
        currentWeekPaidMembersCount++;
      }

      if (summary.isDefaulter) {
        membersWithDueCount++;
      }
    });
  }

  return {
    totalMembers: Array.isArray(members) ? members.length : 0,
    totalDepositAllTime,
    totalDueAllTime,
    currentWeekCollected,
    currentWeekTarget,
    currentWeekPaidMembersCount,
    membersWithDueCount,
  };
}

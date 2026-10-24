import { toBengaliNumber } from './bengali';

/**
 * Formats a list of week numbers with Bengali numerals, applying "তম" strictly to the last number.
 * 
 * Rules:
 * - Single week: "৩০তম"
 * - Two weeks: "২৪ ও ২৫তম"
 * - Three weeks: "২৬, ২৭ ও ২৮তম"
 * - Four or more: "২১, ২২, ২৩, ২৪ ও ২৫তম"
 * - Never: "২৫তম, ২৬তম, ২৭তম ও ২৮তম"
 */
export function formatWeekNumbersList(weeks: number[]): string {
  if (!weeks || weeks.length === 0) return '';
  const sorted = Array.from(new Set(weeks)).sort((a, b) => a - b);
  const bnWeeks = sorted.map((w) => toBengaliNumber(w));

  if (bnWeeks.length === 1) {
    return `${bnWeeks[0]} তম`;
  }
  if (bnWeeks.length === 2) {
    return `${bnWeeks[0]} ও ${bnWeeks[1]} তম`;
  }

  const allExceptLastTwo = bnWeeks.slice(0, bnWeeks.length - 2);
  const secondLast = bnWeeks[bnWeeks.length - 2];
  const last = bnWeeks[bnWeeks.length - 1];

  return `${allExceptLastTwo.join(', ')}, ${secondLast} ও ${last} তম`;
}

export interface PaymentNotificationParams {
  clearedArrearWeeks?: number[];
  currentWeekPaid?: boolean;
  remainingDueWeeks?: number[];
  advanceWeeks?: number[];
}

/**
 * Builds the exact weekly payment notification message based on:
 * - clearedArrearWeeks: পুরোনো বকেয়া সপ্তাহ যা পরিশোধ হয়েছে
 * - currentWeekPaid: চলতি সপ্তাহের জমা পরিশোধ/যোগ হয়েছে কি না
 * - advanceWeeks: বর্তমান বা অতিরিক্ত টাকার কারণে Advance জমা হওয়া ভবিষ্যৎ সপ্তাহ
 * - remainingDueWeeks: যে সপ্তাহগুলো এখনো বকেয়া রয়ে গেছে
 *
 * Rules & Examples:
 * 1. Arrears + Current Week:
 *    "আপনার ১, ২, ৩ ও ৪ তম সপ্তাহের বকেয়া পরিশোধ হয়েছে এবং চলতি সপ্তাহের জমা যোগ হয়েছে। সাথে থাকার জন্য ধন্যবাদ।"
 * 2. Arrears + Current Week + Advance:
 *    "আপনার ১, ২, ৩ ও ৪ তম সপ্তাহের বকেয়া পরিশোধ হয়েছে এবং চলতি সপ্তাহের জমাসহ ৬ ও ৭ তম সপ্তাহের অগ্রিম জমা হয়েছে। সাথে থাকার জন্য ধন্যবাদ।"
 * 3. Current Week + Advance (No Arrears):
 *    "আপনার চলতি সপ্তাহের জমাসহ ৬ ও ৭ তম সপ্তাহের অগ্রিম জমা হয়েছে। সাথে থাকার জন্য ধন্যবাদ।"
 * 4. Only Cleared Arrears:
 *    "আপনার ১, ২, ৩ ও ৪ তম সপ্তাহের বকেয়া পরিশোধ হয়েছে। সাথে থাকার জন্য ধন্যবাদ।"
 * 5. Only Current Week:
 *    "আপনার চলতি সপ্তাহের জমা যোগ হয়েছে। সাথে থাকার জন্য ধন্যবাদ।"
 * 6. Only Advance:
 *    "আপনার ৬ ও ৭ তম সপ্তাহের অগ্রিম জমা হয়েছে। সাথে থাকার জন্য ধন্যবাদ।"
 * 7. Arrears cleared + Remaining Due:
 *    "আপনার ১ ও ২ তম সপ্তাহের বকেয়া পরিশোধ হয়েছে। ৩ ও ৪ তম সপ্তাহের টাকা বকেয়া রয়েছে।"
 */
export function buildWeeklyPaymentNotificationMessage(params: PaymentNotificationParams): string {
  const clearedArrears = (params.clearedArrearWeeks || []).filter((w) => w > 0).sort((a, b) => a - b);
  const remainingDue = (params.remainingDueWeeks || []).filter((w) => w > 0).sort((a, b) => a - b);
  const advance = (params.advanceWeeks || []).filter((w) => w > 0).sort((a, b) => a - b);
  const currentWeekPaid = Boolean(params.currentWeekPaid);

  const hasCleared = clearedArrears.length > 0;
  const hasRemaining = remainingDue.length > 0;
  const hasAdvance = advance.length > 0;

  // Case 1: Cleared Arrears + Current Week + Advance
  if (hasCleared && currentWeekPaid && hasAdvance) {
    const clearedStr = formatWeekNumbersList(clearedArrears);
    const advanceStr = formatWeekNumbersList(advance);
    return `আপনার ${clearedStr} সপ্তাহের বকেয়া পরিশোধ হয়েছে এবং চলতি সপ্তাহের জমাসহ ${advanceStr} সপ্তাহের অগ্রিম জমা হয়েছে। সাথে থাকার জন্য ধন্যবাদ।`;
  }

  // Case 2: Cleared Arrears + Current Week (No Advance)
  if (hasCleared && currentWeekPaid && !hasAdvance) {
    const clearedStr = formatWeekNumbersList(clearedArrears);
    return `আপনার ${clearedStr} সপ্তাহের বকেয়া পরিশোধ হয়েছে এবং চলতি সপ্তাহের জমা যোগ হয়েছে। সাথে থাকার জন্য ধন্যবাদ।`;
  }

  // Case 3: Current Week + Advance (No Arrears Cleared)
  if (!hasCleared && currentWeekPaid && hasAdvance) {
    const advanceStr = formatWeekNumbersList(advance);
    return `আপনার চলতি সপ্তাহের জমাসহ ${advanceStr} সপ্তাহের অগ্রিম জমা হয়েছে। সাথে থাকার জন্য ধন্যবাদ।`;
  }

  // Case 4: Cleared Arrears + Advance (without Current Week)
  if (hasCleared && !currentWeekPaid && hasAdvance) {
    const clearedStr = formatWeekNumbersList(clearedArrears);
    const advanceStr = formatWeekNumbersList(advance);
    return `আপনার ${clearedStr} সপ্তাহের বকেয়া পরিশোধ হয়েছে এবং ${advanceStr} সপ্তাহের অগ্রিম জমা হয়েছে। সাথে থাকার জন্য ধন্যবাদ।`;
  }

  // Case 5: Cleared Arrears + Remaining Due (Partial Arrears Cleared)
  if (hasCleared && hasRemaining) {
    const clearedStr = formatWeekNumbersList(clearedArrears);
    const dueStr = formatWeekNumbersList(remainingDue);
    if (currentWeekPaid) {
      return `আপনার ${clearedStr} সপ্তাহের বকেয়া পরিশোধ হয়েছে এবং চলতি সপ্তাহের জমা যোগ হয়েছে। তবে ${dueStr} সপ্তাহের টাকা বকেয়া রয়েছে।`;
    }
    return `আপনার ${clearedStr} সপ্তাহের বকেয়া পরিশোধ হয়েছে। ${dueStr} সপ্তাহের টাকা বকেয়া রয়েছে।`;
  }

  // Case 6: Cleared Arrears only (All arrears cleared, no advance, no remaining due)
  if (hasCleared && !currentWeekPaid && !hasAdvance && !hasRemaining) {
    const clearedStr = formatWeekNumbersList(clearedArrears);
    return `আপনার ${clearedStr} সপ্তাহের বকেয়া পরিশোধ হয়েছে। সাথে থাকার জন্য ধন্যবাদ।`;
  }

  // Case 7: Only Current Week
  if (!hasCleared && currentWeekPaid && !hasAdvance && !hasRemaining) {
    return 'আপনার চলতি সপ্তাহের জমা যোগ হয়েছে। সাথে থাকার জন্য ধন্যবাদ।';
  }

  // Case 8: Only Advance
  if (hasAdvance && !hasCleared && !currentWeekPaid && !hasRemaining) {
    const advanceStr = formatWeekNumbersList(advance);
    return `আপনার ${advanceStr} সপ্তাহের অগ্রিম জমা হয়েছে। সাথে থাকার জন্য ধন্যবাদ।`;
  }

  // Case 9: Only Arrears / Remaining Due
  if (hasRemaining && !hasCleared && !currentWeekPaid && !hasAdvance) {
    const dueStr = formatWeekNumbersList(remainingDue);
    return `আপনার ${dueStr} সপ্তাহের টাকা বকেয়া রয়েছে। নির্দিষ্ট সময়ে আপনার টাকা জমা দিন।`;
  }

  // Case 10: Fallback if advance + remaining due without cleared arrears
  if (hasAdvance && hasRemaining) {
    const advanceStr = formatWeekNumbersList(advance);
    const dueStr = formatWeekNumbersList(remainingDue);
    return `আপনার ${advanceStr} সপ্তাহের টাকা অগ্রিম জমা হয়েছে। তবে ${dueStr} সপ্তাহের টাকা বকেয়া রয়েছে।`;
  }

  return 'আপনার জমার তথ্য সফলভাবে সংরক্ষিত হয়েছে। সাথে থাকার জন্য ধন্যবাদ।';
}

/**
 * Derives cleared arrears, current week payment, remaining due weeks, and advance weeks
 * purely by inspecting the member's existing processed weeks before and after a payment is applied.
 *
 * It uses the existing processMember52Weeks output and optional transactedWeeks as truth:
 * - Cleared Arrears: weeks < currentWeek that were due/unpaid before, but are now paid.
 * - Current Week: week == currentWeek paid in this transaction.
 * - Remaining Due: weeks < currentWeek that remain due after the payment.
 * - Advance: weeks > currentWeek that are paid (advance) in this transaction.
 */
export function generateNotificationFromLedgerState(
  beforeWeeks: Array<{ weekNumber: number; status: string }>,
  afterWeeks: Array<{ weekNumber: number; status: string }>,
  currentWeek: number,
  transactedWeeks?: number[]
): string {
  const transactedSet = transactedWeeks && transactedWeeks.length > 0 ? new Set(transactedWeeks) : null;

  const dueOrUnpaidBefore = new Set<number>();
  for (const w of beforeWeeks) {
    if (w.weekNumber < currentWeek && (w.status === 'due' || w.status === 'upcoming' || w.status !== 'paid')) {
      dueOrUnpaidBefore.add(w.weekNumber);
    }
  }

  const clearedArrears: number[] = [];
  const remainingDue: number[] = [];
  const advanceWeeks: number[] = [];

  for (const w of afterWeeks) {
    if (w.weekNumber < currentWeek) {
      if (w.status === 'due' || w.status !== 'paid') {
        remainingDue.push(w.weekNumber);
      } else if (w.status === 'paid') {
        const wasCleared = transactedSet ? transactedSet.has(w.weekNumber) : dueOrUnpaidBefore.has(w.weekNumber);
        if (wasCleared) {
          clearedArrears.push(w.weekNumber);
        }
      }
    } else if (w.weekNumber > currentWeek && (w.status === 'advance' || w.status === 'paid')) {
      const isAdvanceTx = transactedSet
        ? transactedSet.has(w.weekNumber)
        : (beforeWeeks.find((b) => b.weekNumber === w.weekNumber)?.status !== 'advance' &&
           beforeWeeks.find((b) => b.weekNumber === w.weekNumber)?.status !== 'paid');
      if (isAdvanceTx) {
        advanceWeeks.push(w.weekNumber);
      }
    }
  }

  // Check if current week was paid in this transaction
  const beforeCurrentWeek = beforeWeeks.find((w) => w.weekNumber === currentWeek);
  const afterCurrentWeek = afterWeeks.find((w) => w.weekNumber === currentWeek);
  const isCurrentPaidInTx = transactedSet
    ? transactedSet.has(currentWeek)
    : (beforeCurrentWeek?.status !== 'paid' && afterCurrentWeek?.status === 'paid');

  return buildWeeklyPaymentNotificationMessage({
    clearedArrearWeeks: clearedArrears,
    currentWeekPaid: isCurrentPaidInTx,
    remainingDueWeeks: remainingDue,
    advanceWeeks: advanceWeeks,
  });
}

/**
 * Returns the exact notification title based on weekly payment params:
 * 1. Due / Arrears: "সাপ্তাহিক জমা বকেয়া রয়েছে"
 * 2. Advance deposit: "অগ্রিম জমা সফল হয়েছে"
 * 3. Successful weekly deposit / cleared arrears: "সাপ্তাহিক জমা সফল হয়েছে"
 */
export function getWeeklyPaymentNotificationTitle(params: PaymentNotificationParams): string {
  const clearedArrears = (params.clearedArrearWeeks || []).filter((w) => w > 0);
  const remainingDue = (params.remainingDueWeeks || []).filter((w) => w > 0);
  const advance = (params.advanceWeeks || []).filter((w) => w > 0);
  const currentWeekPaid = Boolean(params.currentWeekPaid);

  // If there are remaining due weeks and NO arrears were cleared and NO current week was paid, it is a due notification
  if (remainingDue.length > 0 && clearedArrears.length === 0 && !currentWeekPaid) {
    return 'সাপ্তাহিক জমা বকেয়া রয়েছে';
  }

  // If only advance weeks are present (no arrears cleared and no remaining due and no current week paid)
  if (advance.length > 0 && clearedArrears.length === 0 && remainingDue.length === 0 && !currentWeekPaid) {
    return 'অগ্রিম জমা সফল হয়েছে';
  }

  // When weekly payment is successful or arrears are cleared or current week was paid:
  return 'সাপ্তাহিক জমা সফল হয়েছে';
}

/**
 * Determines notification title from notification body text if explicit params are not available:
 * - If body indicates due / arrears: "সাপ্তাহিক জমা বকেয়া রয়েছে"
 * - If body indicates advance deposit: "অগ্রিম জমা সফল হয়েছে"
 * - Default / successful deposit: "সাপ্তাহিক জমা সফল হয়েছে"
 */
export function deriveNotificationTitleFromMessage(message: string): string {
  const text = (message || '').trim();
  if (!text) return 'সাপ্তাহিক জমা সফল হয়েছে';

  const isPureDue =
    (text.includes('বকেয়া রয়েছে') ||
      text.includes('বকেয়া রয়েছে') ||
      text.includes('টাকা এখনও জমা হয়নি') ||
      text.includes('বকেয়া পরিশোধ করুন') ||
      text.includes('বকেয়া পরিশোধ করুন')) &&
    !text.includes('বকেয়া পরিশোধ হয়েছে') &&
    !text.includes('বকেয়া পরিশোধ হয়েছে');

  if (isPureDue) {
    return 'সাপ্তাহিক জমা বকেয়া রয়েছে';
  }

  const isAdvance =
    (text.includes('অগ্রিম জমা হয়েছে') ||
      text.includes('অগ্রিম জমা আছে')) &&
    !text.includes('বকেয়া') &&
    !text.includes('বকেয়া');

  if (isAdvance) {
    return 'অগ্রিম জমা সফল হয়েছে';
  }

  return 'সাপ্তাহিক জমা সফল হয়েছে';
}

export function generateNotificationTitleFromLedgerState(
  beforeWeeks: Array<{ weekNumber: number; status: string }>,
  afterWeeks: Array<{ weekNumber: number; status: string }>,
  currentWeek: number,
  transactedWeeks?: number[]
): string {
  const transactedSet = transactedWeeks && transactedWeeks.length > 0 ? new Set(transactedWeeks) : null;

  const dueOrUnpaidBefore = new Set<number>();
  for (const w of beforeWeeks) {
    if (w.weekNumber < currentWeek && (w.status === 'due' || w.status === 'upcoming' || w.status !== 'paid')) {
      dueOrUnpaidBefore.add(w.weekNumber);
    }
  }

  const clearedArrears: number[] = [];
  const remainingDue: number[] = [];
  const advanceWeeks: number[] = [];

  for (const w of afterWeeks) {
    if (w.weekNumber < currentWeek) {
      if (w.status === 'due' || w.status !== 'paid') {
        remainingDue.push(w.weekNumber);
      } else if (w.status === 'paid') {
        const wasCleared = transactedSet ? transactedSet.has(w.weekNumber) : dueOrUnpaidBefore.has(w.weekNumber);
        if (wasCleared) {
          clearedArrears.push(w.weekNumber);
        }
      }
    } else if (w.weekNumber > currentWeek && (w.status === 'advance' || w.status === 'paid')) {
      const isAdvanceTx = transactedSet
        ? transactedSet.has(w.weekNumber)
        : (beforeWeeks.find((b) => b.weekNumber === w.weekNumber)?.status !== 'advance' &&
           beforeWeeks.find((b) => b.weekNumber === w.weekNumber)?.status !== 'paid');
      if (isAdvanceTx) {
        advanceWeeks.push(w.weekNumber);
      }
    }
  }

  const beforeCurrentWeek = beforeWeeks.find((w) => w.weekNumber === currentWeek);
  const afterCurrentWeek = afterWeeks.find((w) => w.weekNumber === currentWeek);
  const isCurrentPaidInTx = transactedSet
    ? transactedSet.has(currentWeek)
    : (beforeCurrentWeek?.status !== 'paid' && afterCurrentWeek?.status === 'paid');

  return getWeeklyPaymentNotificationTitle({
    clearedArrearWeeks: clearedArrears,
    currentWeekPaid: isCurrentPaidInTx,
    remainingDueWeeks: remainingDue,
    advanceWeeks: advanceWeeks,
  });
}


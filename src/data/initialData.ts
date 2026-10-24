import { Member, WeeklyRecord, DepositTransaction, OrganizationSettings } from '../types';
import { getCurrentWeekNumber } from '../utils/bengali';
import { PRESET_AVATARS } from '../utils/avatarUtils';

const DEFAULT_WEEKLY_TARGET = 100;
export const CURRENT_YEAR = 2026;
export const INITIAL_CURRENT_WEEK = getCurrentWeekNumber(); // Dynamically calculated based on Asia/Dhaka date and 27/03/2026 reference

export const initialSettings: OrganizationSettings = {
  orgName: 'আমাদের সংগঠন',
  weeklyTarget: DEFAULT_WEEKLY_TARGET,
  currentWeek: INITIAL_CURRENT_WEEK,
  currentYear: CURRENT_YEAR,
  adminPin: '1962',
  whatsappGroupUrl: 'https://chat.whatsapp.com/DfrtIDj9qRd4kZJ80czlFU',
  splashEnabled: true,
  splashDuration: 3,
  splashTransition: 'fade',
  splashLogo: 'default',
  popupEnabled: true,
  popupDuration: 5,
};

const memberNames = [
  'শাহরিয়ার ইরাম',
  'জনজীর হাসান',
  'মো: রফিকুল ইসলাম',
  'নাজমুল হুদা',
  'তানভীর রহমান',
  'আফরিন আক্তার',
  'আরিফুল হক',
  'মোঃ মেহেদী হাসান',
  'মাহমুদুর রহমান',
  'মোঃ আল-আমিন',
  'সোহেল রানা',
  'মোঃ কামরুল ইসলাম',
  'ইমরান হোসেন',
  'মোঃ মিজানুর রহমান',
  'মোস্তাফিজুর রহমান',
  'মোঃ জাহিদ হাসান',
  'হাসান মাহমুদ',
  'মোঃ আশরাফুল ইসলাম',
  'সাখাওয়াত হোসেন',
  'মোঃ ফারুক হোসেন',
  'আতিকুর রহমান',
  'তারেক জামান',
  'সাজ্জাদ হোসেন',
  'রেজাউল করিম',
  'নূর মোহাম্মদ',
];

const avatarColors = [
  'bg-emerald-600',
  'bg-teal-600',
  'bg-blue-600',
  'bg-indigo-600',
  'bg-cyan-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-purple-600',
];

// Helper to generate 52 weeks for a member
function generate52Weeks(memberSerial: number, weeklyTarget: number, currentWeek: number): {
  weeks: WeeklyRecord[];
  transactions: DepositTransaction[];
} {
  const weeks: WeeklyRecord[] = [];
  const transactions: DepositTransaction[] = [];

  // Deterministic realistic variation for test data
  const regularity = (memberSerial % 5); // 0=always paid, 1=mostly paid with 2 dues, 2=some partials, 3=regular, 4=new member

  for (let w = 1; w <= 52; w++) {
    let paidAmount = 0;
    let status: WeeklyRecord['status'] = 'upcoming';
    let paymentDate: string | undefined;
    let paymentMethod: WeeklyRecord['paymentMethod'] = 'cash';
    let receiptNo: string | undefined;

    if (w <= currentWeek) {
      if (regularity === 0) {
        // Always paid
        paidAmount = weeklyTarget;
        status = 'paid';
      } else if (regularity === 1) {
        // Missed last 2 weeks
        if (w >= currentWeek - 1) {
          paidAmount = 0;
          status = 'due';
        } else {
          paidAmount = weeklyTarget;
          status = 'paid';
        }
      } else if (regularity === 2) {
        // Some partial payments
        if (w === currentWeek) {
          paidAmount = 50;
          status = 'partial';
        } else if (w === currentWeek - 2) {
          paidAmount = 0;
          status = 'due';
        } else {
          paidAmount = weeklyTarget;
          status = 'paid';
        }
      } else if (regularity === 3) {
        // Missed 1 week in middle
        if (w === 12) {
          paidAmount = 0;
          status = 'due';
        } else {
          paidAmount = weeklyTarget;
          status = 'paid';
        }
      } else {
        // Good standing, paid advance for current week
        paidAmount = weeklyTarget;
        status = 'paid';
      }

      if (paidAmount > 0) {
        // Generate realistic date for this week in the cycle (starts 2026-03-27)
        const startUtc = Date.UTC(2026, 2, 27);
        const dayOffset = (memberSerial + w) % 6; // within Friday to Wednesday of that week
        const paymentUtc = startUtc + (w - 1) * 7 * 86400000 + dayOffset * 86400000;
        const dateObj = new Date(paymentUtc);
        paymentDate = dateObj.toISOString().split('T')[0];
        paymentMethod = (w + memberSerial) % 3 === 0 ? 'bkash' : (w + memberSerial) % 4 === 0 ? 'nagad' : 'cash';
        receiptNo = `REC-26-${String(w).padStart(2, '0')}-${String(memberSerial).padStart(2, '0')}`;
      }
    } else {
      // Future week (w > currentWeek)
      // Occasionally a member paid in advance for next week
      if (regularity === 4 && w === currentWeek + 1) {
        paidAmount = weeklyTarget;
        status = 'paid';
        const startUtc = Date.UTC(2026, 2, 27);
        const paymentUtc = startUtc + (currentWeek - 1) * 7 * 86400000 + 3 * 86400000;
        const dateObj = new Date(paymentUtc);
        paymentDate = dateObj.toISOString().split('T')[0];
        paymentMethod = 'bkash';
        receiptNo = `REC-26-${String(w).padStart(2, '0')}-${String(memberSerial).padStart(2, '0')}`;
      } else {
        status = 'upcoming';
      }
    }

    const record: WeeklyRecord = {
      weekNumber: w,
      targetAmount: weeklyTarget,
      paidAmount,
      paymentDate,
      status,
      paymentMethod: paidAmount > 0 ? paymentMethod : undefined,
      receiptNo,
    };

    weeks.push(record);

    if (paidAmount > 0 && paymentDate) {
      transactions.push({
        id: `tx-${memberSerial}-${w}`,
        memberId: `mem-${memberSerial}`,
        memberName: memberNames[memberSerial - 1],
        memberCode: `সো-${String(memberSerial).padStart(2, '0')}`,
        weekNumber: w,
        amount: paidAmount,
        date: paymentDate,
        timestamp: new Date(paymentDate).getTime(),
        paymentMethod,
        receiptNo: receiptNo || `REC-26-${w}-${memberSerial}`,
        note: `সপ্তাহ ${w}-এর নিয়মিত জমা`,
      });
    }
  }

  return { weeks, transactions };
}

export function getInitialMembers(): { members: Member[]; allTransactions: DepositTransaction[] } {
  const members: Member[] = [];
  let allTransactions: DepositTransaction[] = [];

  for (let i = 1; i <= 25; i++) {
    const { weeks, transactions } = generate52Weeks(i, DEFAULT_WEEKLY_TARGET, INITIAL_CURRENT_WEEK);
    allTransactions = allTransactions.concat(transactions);

    members.push({
      id: `mem-${i}`,
      serialNumber: i,
      memberCode: `সো-${String(i).padStart(2, '0')}`,
      name: memberNames[i - 1],
      phone: i === 1 ? '01907006460' : `017${String(10000000 + i * 35432).substring(0, 8)}`,
      role: i === 1 ? 'admin' : 'member',
      Role: i === 1 ? 'admin' : 'member',
      joinedDate: '২০২৪-০১-০১',
      avatarColor: avatarColors[(i - 1) % avatarColors.length],
      photoUrl: PRESET_AVATARS[(i - 1) % PRESET_AVATARS.length].url,
      weeklyRecords: weeks,
      notes: i === 1 ? 'সভাপতি' : i === 2 ? 'সাধারণ সম্পাদক' : i === 3 ? 'কোষাধ্যক্ষ' : 'সাধারণ সদস্য',
    });
  }

  // Sort transactions by date descending
  allTransactions.sort((a, b) => b.timestamp - a.timestamp);

  return { members, allTransactions };
}

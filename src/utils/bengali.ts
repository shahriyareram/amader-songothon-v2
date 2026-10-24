// Bengali utilities for "আমাদের সংগঠন"

const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return '০';
  const str = val.toString();
  return str.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
}

export function formatBengaliCurrency(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString('en-IN');
  const bn = toBengaliNumber(formatted);
  return amount < 0 ? `-৳${bn}` : `৳${bn}`;
}

const bengaliMonths = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

const bengaliDays = [
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
];

export interface BangladeshDateParts {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
  dateString: string; // YYYY-MM-DD
}

/**
 * Parse any date input or current timestamp strictly according to Bangladesh timezone (Asia/Dhaka)
 */
export function parseDateToDhakaParts(dateInput?: Date | string | null): BangladeshDateParts {
  if (!dateInput) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    });
    const parts = formatter.formatToParts(new Date());
    const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
    const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10);
    const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10);
    const weekdayStr = parts.find((p) => p.type === 'weekday')!.value;
    const daysMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const dayOfWeek = daysMap[weekdayStr] ?? 0;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, dayOfWeek, dateString };
  }

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      return parseDateToDhakaParts();
    }
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    });
    const parts = formatter.formatToParts(dateInput);
    const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
    const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10);
    const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10);
    const weekdayStr = parts.find((p) => p.type === 'weekday')!.value;
    const daysMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const dayOfWeek = daysMap[weekdayStr] ?? 0;
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { year, month, day, dayOfWeek, dateString };
  }

  if (typeof dateInput === 'string') {
    const clean = dateInput.trim();
    // Format: YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(clean)) {
      const parts = clean.split(/[-/T ]/);
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const dt = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = dt.getUTCDay();
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { year, month, day, dayOfWeek, dateString };
    }
    // Format: DD/MM/YYYY or DD-MM-YYYY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(clean)) {
      const parts = clean.split(/[-/T ]/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      const dt = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = dt.getUTCDay();
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { year, month, day, dayOfWeek, dateString };
    }
    const dObj = new Date(clean);
    if (!isNaN(dObj.getTime())) {
      return parseDateToDhakaParts(dObj);
    }
  }

  return parseDateToDhakaParts();
}

/**
 * Returns YYYY-MM-DD string for Bangladesh timezone
 */
export function getBangladeshDateString(dateInput?: Date | string | null): string {
  return parseDateToDhakaParts(dateInput).dateString;
}

export function getBengaliDate(dateInput?: Date | string | null): string {
  const parts = parseDateToDhakaParts(dateInput);
  const dayName = bengaliDays[parts.dayOfWeek];
  const day = toBengaliNumber(String(parts.day).padStart(2, '0'));
  const monthName = bengaliMonths[parts.month - 1];
  const year = toBengaliNumber(parts.year);

  return `${dayName}, ${day} ${monthName} ${year}`;
}

export function getShortBengaliDate(dateInput?: Date | string | null): string {
  const parts = parseDateToDhakaParts(dateInput);
  const day = toBengaliNumber(String(parts.day).padStart(2, '0'));
  const monthName = bengaliMonths[parts.month - 1];
  const year = toBengaliNumber(parts.year);

  return `${day} ${monthName} ${year}`;
}

// Returns format: "সেপ্টেম্বর ০৫"
export function getMonthDayBengali(dateInput?: Date | string | null): string {
  const parts = parseDateToDhakaParts(dateInput);
  const monthName = bengaliMonths[parts.month - 1];
  const day = toBengaliNumber(String(parts.day).padStart(2, '0'));

  return `${monthName} ${day}`;
}

/**
 * Weekly System Rule:
 * Reference Start Date: 27/03/2026 (Friday) = Week 1
 * Every Friday starts a new week (Week increases by 1).
 * Total weeks per cycle: 52.
 * Week 52 runs from 19/03/2027 (Friday) to 25/03/2027 (Thursday).
 * Next Friday 26/03/2027 starts a new cycle at Week 1.
 */
export function getCurrentWeekNumber(dateInput?: Date | string | null): number {
  const parts = parseDateToDhakaParts(dateInput);
  const targetUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const startUtc = Date.UTC(2026, 2, 27); // March 27, 2026 (Friday)

  const diffMs = targetUtc - startUtc;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const rawWeek = Math.floor(diffDays / 7) + 1;
  const cycleWeek = (((rawWeek - 1) % 52) + 52) % 52 + 1;
  return cycleWeek;
}

/**
 * Fixed Week Date System:
 * Week 1 = 27/03/2026 (Friday)
 * Formula: Week Date = 27/03/2026 + (Week Number - 1) * 7 days
 * Fixed week date based strictly on weekNumber.
 */
export function getFixedWeekDateString(weekNumber: number): string {
  const startUtc = Date.UTC(2026, 2, 27); // 27 March 2026
  const weekStartMs = startUtc + (weekNumber - 1) * 7 * 86400000;
  const d = new Date(weekStartMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getFixedWeekBengaliDate(weekNumber: number): string {
  const startUtc = Date.UTC(2026, 2, 27); // 27 March 2026
  const weekStartMs = startUtc + (weekNumber - 1) * 7 * 86400000;
  const d = new Date(weekStartMs);
  const day = toBengaliNumber(String(d.getUTCDate()).padStart(2, '0'));
  const monthName = bengaliMonths[d.getUTCMonth()];
  const year = toBengaliNumber(d.getUTCFullYear());
  return `${day} ${monthName} ${year}`;
}

/**
 * Returns a Map of memberId to calculated display number and display memberCode
 * based on active members sorted by their permanent serialNumber ascending.
 * This guarantees gapless, continuous UI numbering (e.g. সো-০১, সো-০২, ...)
 * without mutating member.id, member.serialNumber or any database records.
 */
export function getCalculatedDisplayMemberMap(
  allActiveMembers: { id: string; serialNumber?: number; memberCode?: string }[]
): Map<string, { displayIndex: number; displaySerialPadded: string; displayMemberCode: string }> {
  const map = new Map<string, { displayIndex: number; displaySerialPadded: string; displayMemberCode: string }>();
  if (!allActiveMembers || allActiveMembers.length === 0) return map;

  const sorted = [...allActiveMembers].sort(
    (a, b) => (a.serialNumber || 0) - (b.serialNumber || 0)
  );

  sorted.forEach((m, idx) => {
    const displayIndex = idx + 1;
    const displaySerialPadded = String(displayIndex).padStart(2, '0');
    const bnNum = toBengaliNumber(displaySerialPadded);
    const displayMemberCode = `সো-${bnNum}`;
    map.set(m.id, {
      displayIndex,
      displaySerialPadded,
      displayMemberCode,
    });
  });

  return map;
}

/**
 * Returns the starting Friday date (YYYY-MM-DD) for a given week number in the cycle
 */
export function getWeekStartFridayDate(weekNumber: number, cycleYear: number = 2026): string {
  if (cycleYear === 2026) {
    return getFixedWeekDateString(weekNumber);
  }
  const startUtc = Date.UTC(cycleYear, 2, 27);
  const weekStartMs = startUtc + (weekNumber - 1) * 7 * 86400000;
  const d = new Date(weekStartMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const bnToEnMap: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};
const enToBnMap: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

export function toEnglishDigits(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[০-৯]/g, (d) => bnToEnMap[d] || d);
}

export function toBengaliDigits(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[0-9]/g, (d) => enToBnMap[d] || d);
}

function normalizeForCodeMatch(str: string | undefined | null): string {
  if (!str) return '';
  return toEnglishDigits(str).toLowerCase().replace(/[\s\-_.:]/g, '');
}

/**
 * Matches a member against a search query supporting:
 * - Bengali or English member ID / serial (e.g. '05', '০৫', '5', '৫')
 * - Full member codes (e.g. 'সো-05', 'সো-০৫', 'সো 05', 'so-05')
 * - Member name in Bengali or English
 * - Phone numbers (for queries of 4+ digits)
 */
export function matchesMemberSearch(
  member: {
    id?: string;
    name?: string;
    memberCode?: string;
    serialNumber?: number;
    phone?: string;
  },
  searchQuery: string,
  displayInfo?: {
    displayMemberCode?: string;
    displaySerialPadded?: string;
  }
): boolean {
  if (!searchQuery || !searchQuery.trim()) return true;

  const rawQ = searchQuery.trim().toLowerCase();
  const qEn = toEnglishDigits(rawQ);
  const qBn = toBengaliDigits(rawQ);
  const qNorm = normalizeForCodeMatch(rawQ);

  // 1. Name match (Bengali or English)
  const name = (member.name || '').toLowerCase();
  if (name.includes(rawQ) || name.includes(qEn) || name.includes(qBn)) {
    return true;
  }

  // 2. Member ID / Serial Number match
  const serial = member.serialNumber != null ? member.serialNumber : null;
  const serialStr = serial != null ? String(serial) : '';
  const displaySerial = displayInfo?.displaySerialPadded || (serial != null ? String(serial).padStart(2, '0') : '');
  const displaySerialBn = toBengaliDigits(displaySerial);
  const serialBn = toBengaliDigits(serialStr);

  const isPureNumber = /^[0-9]+$/.test(qEn);
  if (isPureNumber) {
    // If user entered with leading zero like "05" or "০৫", match against padded serial
    if (qEn.startsWith('0') && qEn.length > 1) {
      if (qEn === displaySerial || qBn === displaySerialBn) {
        return true;
      }
    } else {
      // Single digit or unpadded number, e.g. "5", "৫", "15", "১৫"
      if (
        qEn === serialStr ||
        qBn === serialBn ||
        qEn === displaySerial ||
        qBn === displaySerialBn
      ) {
        return true;
      }
    }
  }

  // 3. Member Code match (e.g. 'সো-05', 'সো-০৫', 'সো 05', 'so-05', 'mem-5')
  const code = member.memberCode || '';
  const displayCode = displayInfo?.displayMemberCode || '';
  const id = member.id || '';

  const codeNorm = normalizeForCodeMatch(code);
  const displayCodeNorm = normalizeForCodeMatch(displayCode);
  const idNorm = normalizeForCodeMatch(id);

  if (
    codeNorm.includes(qNorm) ||
    displayCodeNorm.includes(qNorm) ||
    idNorm.includes(qNorm) ||
    qNorm.includes(codeNorm) ||
    qNorm.includes(displayCodeNorm)
  ) {
    if (!isPureNumber) {
      return true;
    }
  }

  // 4. Phone search: only if search query has at least 4 digits
  const cleanDigits = qEn.replace(/\D/g, '');
  if (cleanDigits.length >= 4) {
    const phone = (member.phone || '').replace(/\D/g, '');
    if (phone.includes(cleanDigits)) {
      return true;
    }
  }

  return false;
}


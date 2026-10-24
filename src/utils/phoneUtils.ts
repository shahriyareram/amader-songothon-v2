/**
 * Utility functions for Bangladeshi phone number validation and Firebase internal email conversion.
 */

// Bengali numerals to English digits mapping
const BENGALI_TO_ENGLISH_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

/**
 * Normalizes any Bangladeshi phone number input into standard 11-digit "01XXXXXXXXX" format.
 * - Converts Bengali numerals (০-৯) to English digits (0-9)
 * - Removes spaces, dashes, parentheses
 * - Strips "+88" or "88" prefix
 * Returns null if the number is not a valid 11-digit Bangladeshi mobile number starting with 01[3-9].
 */
export function normalizeBangladeshiPhone(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  // Convert Bengali numerals to English
  let normalized = input.replace(/[০-৯]/g, (char) => BENGALI_TO_ENGLISH_DIGITS[char] || char);

  // Remove spaces, hyphens, parentheses, and other punctuation
  normalized = normalized.trim().replace(/[\s\-\(\)\.]/g, '');

  // Strip international prefixes: "+880" -> "0", "880" -> "0", "+88" -> ""
  if (normalized.startsWith('+880')) {
    normalized = normalized.slice(3); // e.g. +8801745197109 -> 01745197109
  } else if (normalized.startsWith('+88')) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith('880') && normalized.length === 13) {
    normalized = normalized.slice(2);
  } else if (normalized.startsWith('88') && normalized.length === 13) {
    normalized = normalized.slice(2);
  }

  // Standard Bangladeshi mobile regex: 11 digits, starts with 01 and 3,4,5,6,7,8,9
  const bdRegex = /^01[3-9]\d{8}$/;
  if (bdRegex.test(normalized)) {
    return normalized;
  }

  return null;
}

/**
 * Converts a phone number to an internal Firebase email identifier.
 * Example: "01745197109" -> "01745197109@ourorganization.local"
 */
export function phoneToInternalEmail(phone: string): string {
  const cleanPhone = normalizeBangladeshiPhone(phone) || phone.replace(/\D/g, '');
  return `${cleanPhone}@ourorganization.local`;
}

/**
 * Extracts the phone number from an internal Firebase email identifier.
 * Example: "01745197109@ourorganization.local" -> "01745197109"
 */
export function internalEmailToPhone(email: string): string {
  if (email.includes('@ourorganization.local')) {
    return email.replace('@ourorganization.local', '');
  }
  return email;
}

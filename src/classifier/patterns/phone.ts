import type { Finding } from '../types';

/**
 * Phone number pattern — matches common international formats.
 * Requires at least 7 digits and some formatting (separators or + prefix)
 * to avoid matching bare digit sequences that are order IDs, zip codes, etc.
 *
 * Formats matched:
 *   +1-555-123-4567, (555) 123-4567, 555.123.4567,
 *   +45 12 34 56 78, +44 7911 123456, 555-123-4567
 */
const PHONE_PATTERN =
  /(?<!\d)(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]\d{2,4}[\s.-]\d{2,4}(?:[\s.-]\d{1,4})?(?!\d)/g;

/** Count actual digits in a string */
function countDigits(str: string): number {
  let count = 0;
  for (const ch of str) {
    if (ch >= '0' && ch <= '9') count++;
  }
  return count;
}

/** Detect phone numbers in text */
export function detectPhones(text: string): Finding[] {
  const findings: Finding[] = [];
  let match: RegExpExecArray | null;

  PHONE_PATTERN.lastIndex = 0;

  while ((match = PHONE_PATTERN.exec(text)) !== null) {
    const value = match[0];
    const startIndex = match.index;
    const digits = countDigits(value);

    // Require 7-12 digits to be a phone number.
    // Fewer than 7 is too short; more than 12 is likely a credit card.
    if (digits < 7 || digits > 12) continue;

    // Skip if it looks like a date (YYYY-MM-DD or DD-MM-YYYY pattern)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) continue;
    if (/^\d{2}-\d{2}-\d{4}$/.test(value.trim())) continue;

    // Skip if it looks like a US SSN (XXX-XX-XXXX)
    if (/^\d{3}-\d{2}-\d{4}$/.test(value.trim())) continue;

    findings.push({
      type: 'phone',
      value: value.trim(),
      startIndex,
      endIndex: startIndex + value.length,
      confidence: 'MEDIUM',
      label: 'Phone Number',
      placeholder: '', // assigned by engine
    });
  }

  return findings;
}

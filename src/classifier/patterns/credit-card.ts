import type { Finding } from '../types';

/**
 * Matches 13-19 digit sequences with optional spaces or dashes as separators.
 * Uses word boundaries to avoid matching inside larger numbers.
 */
const CC_PATTERN =
  /\b(\d[\d .-]{11,22}\d)\b/g;

/** Extract only digits from a string */
function extractDigits(str: string): string {
  return str.replace(/\D/g, '');
}

/**
 * Luhn algorithm validation.
 * Returns true if the digit string passes the Luhn checksum.
 */
export function luhnCheck(digits: string): boolean {
  const len = digits.length;
  let sum = 0;
  let isSecond = false;

  // Walk from rightmost digit to leftmost
  for (let i = len - 1; i >= 0; i--) {
    let d = Number(digits[i]);

    if (isSecond) {
      d *= 2;
      if (d > 9) d -= 9;
    }

    sum += d;
    isSecond = !isSecond;
  }

  return sum % 10 === 0;
}

/** Detect credit card numbers in text */
export function detectCreditCards(text: string): Finding[] {
  const findings: Finding[] = [];
  let match: RegExpExecArray | null;

  CC_PATTERN.lastIndex = 0;

  while ((match = CC_PATTERN.exec(text)) !== null) {
    const raw = match[1] ?? match[0];
    const digits = extractDigits(raw);
    const startIndex = match.index;

    // Must be 13-19 digits
    if (digits.length < 13 || digits.length > 19) continue;

    // Must pass Luhn validation
    if (!luhnCheck(digits)) continue;

    findings.push({
      type: 'credit-card',
      value: raw,
      startIndex,
      endIndex: startIndex + raw.length,
      confidence: 'HIGH',
      label: 'Credit Card Number',
      placeholder: '', // assigned by engine
    });
  }

  return findings;
}

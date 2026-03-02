import type { Finding } from '../types';

// ── US Social Security Number ───────────────────────────────────────────

/** Dashed SSN: XXX-XX-XXXX */
const SSN_DASHED = /\b(\d{3})-(\d{2})-(\d{4})\b/g;

/** Context keywords that signal a dashless 9-digit number is likely an SSN */
const SSN_CONTEXT =
  /(?:ssn|social\s+security|tax\s+id|social)\s*(?:number)?\s*[:#]?\s*(\d{9})\b/gi;

function isValidSSN(area: string, group: string, serial: string): boolean {
  const a = Number(area);
  const g = Number(group);
  const s = Number(serial);

  // Area: 001-899 (not 000, not 900-999)
  if (a < 1 || a > 899) return false;
  // Group: 01-99 (not 00)
  if (g < 1 || g > 99) return false;
  // Serial: 0001-9999 (not 0000)
  if (s < 1 || s > 9999) return false;

  return true;
}

function detectSSN(text: string): Finding[] {
  const findings: Finding[] = [];

  // Dashed format → HIGH confidence
  SSN_DASHED.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = SSN_DASHED.exec(text)) !== null) {
    const area = match[1] ?? '';
    const group = match[2] ?? '';
    const serial = match[3] ?? '';

    if (!isValidSSN(area, group, serial)) continue;

    findings.push({
      type: 'ssn',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      confidence: 'HIGH',
      label: 'US Social Security Number',
      placeholder: '',
    });
  }

  // Dashless with context → MEDIUM confidence
  SSN_CONTEXT.lastIndex = 0;

  while ((match = SSN_CONTEXT.exec(text)) !== null) {
    const digits = match[1] ?? '';
    const area = digits.slice(0, 3);
    const group = digits.slice(3, 5);
    const serial = digits.slice(5, 9);

    if (!isValidSSN(area, group, serial)) continue;

    // Find the position of the 9-digit number within the full match
    const digitsOffset = match[0].lastIndexOf(digits);
    const startIndex = match.index + digitsOffset;

    findings.push({
      type: 'ssn',
      value: digits,
      startIndex,
      endIndex: startIndex + digits.length,
      confidence: 'MEDIUM',
      label: 'US Social Security Number',
      placeholder: '',
    });
  }

  return findings;
}

// ── Danish CPR Number ───────────────────────────────────────────────────

/** CPR format: DDMMYY-XXXX */
const CPR_PATTERN = /\b(\d{2})(\d{2})(\d{2})-(\d{4})\b/g;

/** Days per month (non-leap). Index 0 unused. */
const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isPlausibleCPRDate(day: number, month: number): boolean {
  if (month < 1 || month > 12) return false;
  const maxDay = DAYS_IN_MONTH[month] ?? 31;
  if (day < 1 || day > maxDay) return false;
  return true;
}

function detectCPR(text: string): Finding[] {
  const findings: Finding[] = [];
  let match: RegExpExecArray | null;

  CPR_PATTERN.lastIndex = 0;

  while ((match = CPR_PATTERN.exec(text)) !== null) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    // match[3] is year (2 digits) — accept any since century is ambiguous
    // match[4] is the serial

    if (!isPlausibleCPRDate(day, month)) continue;

    findings.push({
      type: 'cpr',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      confidence: 'HIGH',
      label: 'Danish CPR Number',
      placeholder: '',
    });
  }

  return findings;
}

// ── UK National Insurance Number ────────────────────────────────────────

/**
 * NI format: XX 99 99 99 X
 * Prefix: two letters (with restrictions), Suffix: A-D only.
 * Allows spaces or no spaces between groups.
 */
const NI_PATTERN =
  /\b([A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z])\s?(\d{2})\s?(\d{2})\s?(\d{2})\s?([A-D])\b/gi;

/** Explicitly invalid two-letter prefixes */
const INVALID_NI_PREFIXES = new Set(['BG', 'GB', 'NK', 'KN', 'TN', 'NT', 'ZZ']);

function detectNI(text: string): Finding[] {
  const findings: Finding[] = [];
  let match: RegExpExecArray | null;

  NI_PATTERN.lastIndex = 0;

  while ((match = NI_PATTERN.exec(text)) !== null) {
    const prefix = (match[1] ?? '').toUpperCase();

    if (INVALID_NI_PREFIXES.has(prefix)) continue;

    findings.push({
      type: 'ni-number',
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      confidence: 'HIGH',
      label: 'UK National Insurance Number',
      placeholder: '',
    });
  }

  return findings;
}

// ── Combined detector ───────────────────────────────────────────────────

/** Detect national ID numbers (US SSN, Danish CPR, UK NI) */
export function detectNationalIds(text: string): Finding[] {
  return [...detectSSN(text), ...detectCPR(text), ...detectNI(text)];
}

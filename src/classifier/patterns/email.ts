import type { Finding } from '../types';

/** Well-known non-personal email prefixes to exclude */
const EXCLUDED_PREFIXES = ['git', 'noreply', 'no-reply'];

/**
 * Practical email regex — catches 95%+ of real-world emails.
 * Not RFC 5322 compliant (intentionally — RFC patterns produce too many false positives).
 * Uses a global match to find all occurrences.
 */
const EMAIL_PATTERN =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Detect email addresses in text */
export function detectEmails(text: string): Finding[] {
  const findings: Finding[] = [];
  let match: RegExpExecArray | null;

  EMAIL_PATTERN.lastIndex = 0;

  while ((match = EMAIL_PATTERN.exec(text)) !== null) {
    const value = match[0];
    const startIndex = match.index;

    // Skip if preceded by :// (URL authority context, e.g. https://user@host)
    if (startIndex >= 3) {
      const before = text.slice(Math.max(0, startIndex - 3), startIndex);
      if (before.includes('://')) continue;
    }

    // Skip well-known non-personal prefixes
    const localPart = value.split('@')[0]?.toLowerCase() ?? '';
    if (EXCLUDED_PREFIXES.includes(localPart)) continue;

    findings.push({
      type: 'email',
      value,
      startIndex,
      endIndex: startIndex + value.length,
      confidence: 'HIGH',
      label: 'Email Address',
      placeholder: '', // assigned by engine
    });
  }

  return findings;
}

import type { Finding } from './types';

/** Escape regex metacharacters in a string so it can be used in new RegExp() */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Match user-configured keywords against text.
 * Keywords are pre-fetched from chrome.storage.local and passed in.
 *
 * - Case-insensitive matching
 * - Word boundary detection (keyword must be a standalone word/phrase)
 * - Regex metacharacters in keywords are escaped
 * - Multi-word phrases supported
 */
export function detectKeywords(text: string, keywords: string[]): Finding[] {
  const findings: Finding[] = [];

  for (const keyword of keywords) {
    if (keyword.length === 0) continue;

    const escaped = escapeRegExp(keyword);
    const pattern = new RegExp(`\\b${escaped}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      findings.push({
        type: 'keyword',
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 'MEDIUM',
        label: `Custom Keyword: ${keyword}`,
        placeholder: '',
      });
    }
  }

  return findings;
}

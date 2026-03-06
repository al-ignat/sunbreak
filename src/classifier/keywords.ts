import type { Finding } from './types';

/** Escape regex metacharacters in a string so it can be used in new RegExp() */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Cache compiled keyword regexes to avoid re-creation on every classify() call */
const regexCache = new Map<string, RegExp>();

/** Get or create a cached regex for a keyword */
function getKeywordRegex(keyword: string): RegExp {
  let regex = regexCache.get(keyword);
  if (!regex) {
    const escaped = escapeRegExp(keyword);
    regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    regexCache.set(keyword, regex);
  }
  // Reset lastIndex since the regex is global and reused
  regex.lastIndex = 0;
  return regex;
}

/** Clear the keyword regex cache (call when keywords change) */
export function clearKeywordCache(): void {
  regexCache.clear();
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

    const pattern = getKeywordRegex(keyword);
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

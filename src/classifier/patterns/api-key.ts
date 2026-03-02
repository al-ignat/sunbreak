import type { Finding } from '../types';

interface KeyPattern {
  readonly pattern: RegExp;
  readonly label: string;
  readonly confidence: 'HIGH' | 'MEDIUM';
}

/** Provider-specific key patterns — HIGH confidence */
const PROVIDER_PATTERNS: readonly KeyPattern[] = [
  {
    pattern: /AKIA[0-9A-Z]{16}/g,
    label: 'AWS Access Key',
    confidence: 'HIGH',
  },
  {
    pattern: /gh[ps]_[A-Za-z0-9_]{36,}/g,
    label: 'GitHub Token',
    confidence: 'HIGH',
  },
  {
    pattern: /sk_live_[A-Za-z0-9]{24,}/g,
    label: 'Stripe Secret Key',
    confidence: 'HIGH',
  },
  {
    pattern: /pk_live_[A-Za-z0-9]{24,}/g,
    label: 'Stripe Publishable Key',
    confidence: 'HIGH',
  },
  {
    pattern: /sk-[A-Za-z0-9]{32,}/g,
    label: 'OpenAI API Key',
    confidence: 'HIGH',
  },
];

/** Azure connection string — match the AccountKey portion */
const AZURE_PATTERN =
  /DefaultEndpointsProtocol=[^;]+;AccountName=[^;]+;AccountKey=([A-Za-z0-9+/=]{20,});?/g;

/**
 * Generic key pattern: keyword followed by = or : then a value of 16+ chars.
 * The keyword must appear as a standalone word or after common delimiters.
 */
const GENERIC_KEY_PATTERN =
  /(?:api[_-]?key|token|secret|password|apikey|access[_-]?token)\s*[=:]\s*["']?([A-Za-z0-9_\-+/=.]{16,})["']?/gi;

/** Detect API keys and tokens in text */
export function detectApiKeys(text: string): Finding[] {
  const findings: Finding[] = [];

  // Provider-specific patterns
  for (const { pattern, label, confidence } of PROVIDER_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      findings.push({
        type: 'api-key',
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence,
        label,
        placeholder: '',
      });
    }
  }

  // Azure connection strings
  AZURE_PATTERN.lastIndex = 0;
  let azMatch: RegExpExecArray | null;
  while ((azMatch = AZURE_PATTERN.exec(text)) !== null) {
    findings.push({
      type: 'api-key',
      value: azMatch[0],
      startIndex: azMatch.index,
      endIndex: azMatch.index + azMatch[0].length,
      confidence: 'HIGH',
      label: 'Azure Connection String',
      placeholder: '',
    });
  }

  // Generic key=value patterns
  GENERIC_KEY_PATTERN.lastIndex = 0;
  let genMatch: RegExpExecArray | null;
  while ((genMatch = GENERIC_KEY_PATTERN.exec(text)) !== null) {
    // Only flag if the value is long enough (16+ chars already enforced by regex)
    findings.push({
      type: 'api-key',
      value: genMatch[0],
      startIndex: genMatch.index,
      endIndex: genMatch.index + genMatch[0].length,
      confidence: 'MEDIUM',
      label: 'Possible API Key',
      placeholder: '',
    });
  }

  return findings;
}

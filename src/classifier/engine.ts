import type {
  Finding,
  FindingType,
  ClassificationResult,
  ClassifyOptions,
  Detector,
  ExcludeRange,
} from './types';
import { DETECTOR_PRIORITY } from './types';
import { generateDescriptiveToken, createTokenContext } from './smart-tokens';
import { scoreFindingsWithContext } from './context-scorer';
import { CONTEXT_SCORERS } from './context-rules';
import {
  detectEmails,
  detectPhones,
  detectCreditCards,
  detectNationalIds,
  detectIpAddresses,
  detectApiKeys,
} from './patterns/index';
import { detectKeywords } from './keywords';

/** Maximum input length the engine will process */
const MAX_INPUT_LENGTH = 50_000;

/**
 * Registry mapping finding types to their detector functions.
 * The keyword matcher is handled separately (needs the keywords argument).
 */
const DETECTOR_REGISTRY: ReadonlyArray<{ types: ReadonlyArray<FindingType>; detect: Detector }> = [
  { types: ['email'], detect: detectEmails },
  { types: ['phone'], detect: detectPhones },
  { types: ['credit-card'], detect: detectCreditCards },
  { types: ['ssn', 'cpr', 'ni-number'], detect: detectNationalIds },
  { types: ['ip-address'], detect: detectIpAddresses },
  { types: ['api-key'], detect: detectApiKeys },
];

/** Check if two findings overlap */
function overlaps(a: Finding, b: Finding): boolean {
  return a.startIndex < b.endIndex && b.startIndex < a.endIndex;
}

/**
 * Compare two findings for deduplication priority.
 * Returns positive if `a` should be kept over `b`.
 */
function comparePriority(a: Finding, b: Finding): number {
  // Higher confidence wins
  const confOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const confDiff = (confOrder[a.confidence] ?? 0) - (confOrder[b.confidence] ?? 0);
  if (confDiff !== 0) return confDiff;

  // Longer span wins (more specific match)
  const lenDiff = (a.endIndex - a.startIndex) - (b.endIndex - b.startIndex);
  if (lenDiff !== 0) return lenDiff;

  // Higher detector priority wins
  return (DETECTOR_PRIORITY[a.type] ?? 0) - (DETECTOR_PRIORITY[b.type] ?? 0);
}

/**
 * Deduplicate overlapping findings using winner-takes-all strategy.
 * Sweep-line: sort by startIndex, resolve overlaps greedily.
 * Post-condition: no two findings in the result overlap.
 */
function deduplicate(findings: Finding[]): Finding[] {
  if (findings.length <= 1) return findings;

  // Sort by startIndex, then by priority (higher priority first for same start)
  const sorted = [...findings].sort((a, b) => {
    const startDiff = a.startIndex - b.startIndex;
    if (startDiff !== 0) return startDiff;
    return -comparePriority(a, b); // higher priority first
  });

  const result: Finding[] = [];

  for (const candidate of sorted) {
    // Check if candidate overlaps with the last kept finding
    const last = result[result.length - 1];
    if (last && overlaps(last, candidate)) {
      // Keep the one with higher priority
      if (comparePriority(candidate, last) > 0) {
        result[result.length - 1] = candidate;
      }
      // Otherwise, skip candidate (last wins)
    } else {
      result.push(candidate);
    }
  }

  return result;
}

/** Check if a finding overlaps any excluded range */
function overlapsExcludeRange(
  finding: Finding,
  ranges: ReadonlyArray<ExcludeRange>,
): boolean {
  for (const range of ranges) {
    if (finding.startIndex < range.end && range.start < finding.endIndex) {
      return true;
    }
  }
  return false;
}

/**
 * Assign descriptive redaction placeholders to findings.
 * Same value gets same placeholder (per D4).
 * Example: [John S. email], [card ending 4242], [internal IP]
 */
function assignPlaceholders(findings: Finding[]): Finding[] {
  const context = createTokenContext();

  return findings.map((finding) => {
    const placeholder = generateDescriptiveToken(finding, context);
    return { ...finding, placeholder };
  });
}

/**
 * Classify text for sensitive data.
 *
 * Runs all enabled detectors and the keyword matcher against the input,
 * deduplicates overlapping findings, sorts by position, and assigns
 * redaction placeholders.
 *
 * Pure function: no side effects, no chrome.* calls, no network requests.
 */
export function classify(text: string, options: ClassifyOptions): ClassificationResult {
  const start = performance.now();

  // Early-return for empty/whitespace-only input
  if (text.trim().length === 0) {
    return {
      findings: [],
      durationMs: 0,
      hasHighConfidence: false,
      truncated: false,
    };
  }

  // Truncate if input exceeds max length
  let truncated = false;
  let input = text;
  if (text.length > MAX_INPUT_LENGTH) {
    input = text.slice(0, MAX_INPUT_LENGTH);
    truncated = true;
  }

  const { keywords, enabledDetectors, excludeRanges } = options;
  const allFindings: Finding[] = [];

  // Run pattern detectors
  for (const entry of DETECTOR_REGISTRY) {
    // Check if any of the detector's types are enabled
    const shouldRun = enabledDetectors
      ? entry.types.some((t) => enabledDetectors.has(t))
      : true;

    if (shouldRun) {
      allFindings.push(...entry.detect(input));
    }
  }

  // Run keyword matcher if enabled
  const keywordEnabled = enabledDetectors ? enabledDetectors.has('keyword') : true;
  if (keywordEnabled && keywords.length > 0) {
    allFindings.push(...detectKeywords(input, keywords));
  }

  // Deduplicate overlapping findings
  const deduped = deduplicate(allFindings);

  // Filter out findings that overlap excluded ranges
  const filtered = excludeRanges && excludeRanges.length > 0
    ? deduped.filter((f) => !overlapsExcludeRange(f, excludeRanges))
    : deduped;

  // Sort by startIndex
  filtered.sort((a, b) => a.startIndex - b.startIndex);

  // Apply context-aware scoring and explanation metadata
  const withContext = scoreFindingsWithContext(input, filtered, CONTEXT_SCORERS);

  // Assign placeholders
  const withPlaceholders = assignPlaceholders(withContext);

  const durationMs = performance.now() - start;

  return {
    findings: withPlaceholders,
    durationMs,
    hasHighConfidence: withPlaceholders.some((f) => f.confidence === 'HIGH'),
    truncated,
  };
}

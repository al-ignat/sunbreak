import { sanitizeCustomPatternFlags } from './custom-patterns';

export interface PatternPreviewMatch {
  readonly value: string;
  readonly startIndex: number;
  readonly endIndex: number;
}

export interface PatternValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
  readonly sanitizedFlags: string;
}

export interface PatternSamplePreview {
  readonly sample: string;
  readonly matches: ReadonlyArray<PatternPreviewMatch>;
}

export interface PatternSampleEvaluation {
  readonly positive: ReadonlyArray<PatternSamplePreview>;
  readonly negative: ReadonlyArray<PatternSamplePreview>;
}

const MAX_PATTERN_LENGTH = 250;
const MAX_MATCHES_PER_SAMPLE = 50;
const BROAD_PATTERN_WARNINGS = new Set([
  '.*',
  '.+',
  '\\w+',
  '[A-Za-z0-9]+',
  '[\\s\\S]+',
]);

function hasPotentialBacktrackingRisk(pattern: string): boolean {
  return /(\([^)]*[+*][^)]*\))[+*]/.test(pattern)
    || /(\.\*|\.\+)\+/.test(pattern);
}

function scanPatternMatches(
  pattern: string,
  flags: string,
  sample: string,
): PatternPreviewMatch[] {
  const regex = new RegExp(pattern, flags);
  const matches: PatternPreviewMatch[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(sample)) !== null) {
    matches.push({
      value: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });

    if (matches.length >= MAX_MATCHES_PER_SAMPLE) {
      break;
    }

    if (match[0].length === 0) {
      regex.lastIndex += 1;
    }
  }

  return matches;
}

export function validateCustomPatternDefinition(input: {
  label: string;
  pattern: string;
  flags?: string | null;
  samples?: {
    positive?: ReadonlyArray<string>;
    negative?: ReadonlyArray<string>;
  };
}): PatternValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const label = input.label.trim();
  const pattern = input.pattern.trim();
  const sanitizedFlags = sanitizeCustomPatternFlags(input.flags);

  if (label.length === 0) {
    errors.push('Label is required.');
  }

  if (pattern.length === 0) {
    errors.push('Pattern is required.');
  }

  if (pattern.length > MAX_PATTERN_LENGTH) {
    errors.push(`Pattern must be ${MAX_PATTERN_LENGTH} characters or less.`);
  }

  if (BROAD_PATTERN_WARNINGS.has(pattern)) {
    warnings.push('Pattern is extremely broad and may match too much prompt text.');
  }

  if (hasPotentialBacktrackingRisk(pattern)) {
    warnings.push('Pattern may be vulnerable to catastrophic backtracking.');
  }

  try {
    if (errors.length === 0) {
      void new RegExp(pattern, sanitizedFlags);
    }
  } catch {
    errors.push('Pattern is not a valid regular expression.');
  }

  const positiveSamples = input.samples?.positive ?? [];
  const negativeSamples = input.samples?.negative ?? [];
  if (positiveSamples.length === 0 && negativeSamples.length === 0) {
    warnings.push('Add sample text so the pattern can be tested before enabling it.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedFlags,
  };
}

export function evaluatePatternSamples(input: {
  pattern: string;
  flags?: string | null;
  positive?: ReadonlyArray<string>;
  negative?: ReadonlyArray<string>;
}): PatternSampleEvaluation {
  const sanitizedFlags = sanitizeCustomPatternFlags(input.flags);

  const positive = (input.positive ?? []).map((sample) => ({
    sample,
    matches: scanPatternMatches(input.pattern, sanitizedFlags, sample),
  }));

  const negative = (input.negative ?? []).map((sample) => ({
    sample,
    matches: scanPatternMatches(input.pattern, sanitizedFlags, sample),
  }));

  return { positive, negative };
}

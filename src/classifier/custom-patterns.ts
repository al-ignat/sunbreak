import type {
  CustomPattern,
  CustomPatternCategory,
  CustomPatternSeverity,
  CustomPatternSourceMode,
  CustomPatternTemplateId,
} from '../storage/types';

export interface CompiledCustomPattern {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly severity: CustomPatternSeverity;
  readonly category: CustomPatternCategory;
  readonly sourceMode: CustomPatternSourceMode;
  readonly templateId: CustomPatternTemplateId | null;
  readonly pattern: string;
  readonly flags: string;
  readonly regex: RegExp;
}

export const DEFAULT_CUSTOM_PATTERN_FLAGS = 'gi';

const FLAG_ORDER = ['g', 'i', 'm', 's', 'u'] as const;
const ALLOWED_FLAGS = new Set<string>(FLAG_ORDER);

function createPatternId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function trimUniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function sanitizeCustomPatternFlags(flags: string | null | undefined): string {
  const input = flags?.trim() ?? '';
  const sanitized = FLAG_ORDER.filter((flag) => input.includes(flag));
  const unique = sanitized.filter((flag, index) => sanitized.indexOf(flag) === index);

  if (!unique.includes('g')) {
    unique.unshift('g');
  }
  if (unique.length === 1) {
    unique.push('i');
  }

  return unique.filter((flag) => ALLOWED_FLAGS.has(flag)).join('');
}

export function normalizeCustomPattern(
  input: Partial<CustomPattern> & Pick<CustomPattern, 'label' | 'pattern'>,
  nowIso = new Date().toISOString(),
): CustomPattern {
  const templateId = input.templateId ?? null;
  const sourceMode: CustomPatternSourceMode = input.sourceMode
    ?? (templateId !== null ? 'template' : 'advanced-regex');

  return {
    id: input.id?.trim() || createPatternId(),
    label: input.label.trim(),
    description: input.description?.trim() ?? '',
    enabled: input.enabled ?? true,
    severity: input.severity ?? 'warning',
    category: input.category ?? 'other',
    sourceMode,
    templateId,
    pattern: input.pattern.trim(),
    flags: sanitizeCustomPatternFlags(input.flags),
    samples: {
      positive: trimUniqueStrings(input.samples?.positive),
      negative: trimUniqueStrings(input.samples?.negative),
    },
    createdAt: input.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
}

export function normalizeCustomPatterns(input: unknown): CustomPattern[] {
  if (!Array.isArray(input)) return [];

  const normalized: CustomPattern[] = [];
  for (const value of input) {
    if (!value || typeof value !== 'object') continue;
    const candidate = value as Partial<CustomPattern>;
    if (typeof candidate.label !== 'string' || typeof candidate.pattern !== 'string') {
      continue;
    }
    normalized.push(normalizeCustomPattern({
      ...candidate,
      label: candidate.label,
      pattern: candidate.pattern,
    }));
  }

  return normalized;
}

export function compileCustomPattern(
  pattern: CustomPattern,
): CompiledCustomPattern | null {
  try {
    return {
      ...pattern,
      regex: new RegExp(pattern.pattern, sanitizeCustomPatternFlags(pattern.flags)),
    };
  } catch {
    return null;
  }
}

export function compileCustomPatterns(
  patterns: ReadonlyArray<CustomPattern>,
): CompiledCustomPattern[] {
  const compiled: CompiledCustomPattern[] = [];

  for (const pattern of patterns) {
    if (!pattern.enabled) continue;
    const runtime = compileCustomPattern(pattern);
    if (runtime) {
      compiled.push(runtime);
    }
  }

  return compiled;
}

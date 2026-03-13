import type {
  ContextCategory,
  ContextSignal,
  FindingExplanation,
} from './types';

const SUMMARY_BY_CATEGORY: Record<ContextCategory, string> = {
  confidentiality: 'Flagged because nearby wording suggests confidential internal content.',
  financial: 'Flagged because this appears in a financial context.',
  'legal-privilege': 'Flagged because nearby wording suggests legal privilege.',
  'hr-compensation': 'Flagged because this looks like compensation or HR information.',
  'code-structure': 'Flagged because this appears inside code or a connection-string context.',
  'security-infrastructure': 'Flagged because this appears in a security or infrastructure context.',
  'example-data': 'Flagged with lower confidence because this appears in example-style content.',
};

function uniqueCategories(
  signals: ReadonlyArray<ContextSignal>,
): ContextCategory[] {
  return [...new Set(signals.map((signal) => signal.category))];
}

function reasonForSignal(signal: ContextSignal): string {
  if (signal.direction === 'suppress') {
    return `${signal.label} lowered confidence.`;
  }
  return `${signal.label} increased confidence.`;
}

export function buildFindingExplanation(
  signals: ReadonlyArray<ContextSignal>,
): FindingExplanation | null {
  if (signals.length === 0) return null;

  const categories = uniqueCategories(signals);
  const primaryCategory = categories[0];
  if (!primaryCategory) return null;

  return {
    summary: SUMMARY_BY_CATEGORY[primaryCategory],
    reasons: signals.map(reasonForSignal),
    categories,
  };
}

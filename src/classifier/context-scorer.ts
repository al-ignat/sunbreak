import type {
  Confidence,
  ContextScoreResult,
  ContextScorer,
  ContextScorerInput,
  ContextWindow,
  Finding,
  FindingContext,
} from './types';

const CONTEXT_WINDOW_RADIUS = 80;

const CONFIDENCE_ORDER: Confidence[] = ['LOW', 'MEDIUM', 'HIGH'];

function clampConfidenceIndex(index: number): number {
  return Math.max(0, Math.min(index, CONFIDENCE_ORDER.length - 1));
}

function toConfidenceIndex(confidence: Confidence): number {
  return CONFIDENCE_ORDER.indexOf(confidence);
}

function applyScoreToConfidence(
  confidence: Confidence,
  scoreDelta: number,
): Confidence {
  const baseIndex = toConfidenceIndex(confidence);
  if (scoreDelta >= 1) {
    return CONFIDENCE_ORDER[clampConfidenceIndex(baseIndex + 1)] ?? confidence;
  }
  if (scoreDelta <= -1) {
    return CONFIDENCE_ORDER[clampConfidenceIndex(baseIndex - 1)] ?? confidence;
  }
  return confidence;
}

export function buildContextWindow(
  text: string,
  finding: Pick<Finding, 'startIndex' | 'endIndex' | 'value'>,
  radius: number = CONTEXT_WINDOW_RADIUS,
): ContextWindow {
  const beforeStart = Math.max(0, finding.startIndex - radius);
  const afterEnd = Math.min(text.length, finding.endIndex + radius);
  return {
    before: text.slice(beforeStart, finding.startIndex),
    match: text.slice(finding.startIndex, finding.endIndex) || finding.value,
    after: text.slice(finding.endIndex, afterEnd),
    nearby: text.slice(beforeStart, afterEnd),
  };
}

function mergeScoreResults(
  results: ReadonlyArray<ContextScoreResult>,
): Omit<FindingContext, 'baseConfidence'> {
  const score = results.reduce((sum, result) => sum + result.scoreDelta, 0);
  const categories = [
    ...new Set(
      results.flatMap((result) => result.categories ?? []),
    ),
  ];
  const signals = results.flatMap((result) => result.signals ?? []);
  const explanation =
    results.find((result) => result.explanation)?.explanation ?? null;

  return {
    score,
    categories,
    signals,
    explanation,
  };
}

export function scoreFindingWithContext(
  text: string,
  finding: Finding,
  siblings: ReadonlyArray<Finding>,
  scorers: ReadonlyArray<ContextScorer> = [],
): Finding {
  const input: ContextScorerInput = {
    text,
    finding,
    siblings,
    window: buildContextWindow(text, finding),
  };

  const results = scorers
    .map((scorer) => scorer(input))
    .filter((result): result is ContextScoreResult => result !== null);

  const merged = mergeScoreResults(results);
  const confidence = applyScoreToConfidence(finding.confidence, merged.score);

  return {
    ...finding,
    confidence,
    context: {
      baseConfidence: finding.confidence,
      ...merged,
    },
  };
}

export function scoreFindingsWithContext(
  text: string,
  findings: ReadonlyArray<Finding>,
  scorers: ReadonlyArray<ContextScorer> = [],
): Finding[] {
  return findings.map((finding) =>
    scoreFindingWithContext(text, finding, findings, scorers),
  );
}

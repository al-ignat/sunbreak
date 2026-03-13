import { describe, it, expect } from 'vitest';
import {
  buildContextWindow,
  scoreFindingWithContext,
  scoreFindingsWithContext,
} from '../../../src/classifier/context-scorer';
import type { ContextScorer, Finding } from '../../../src/classifier/types';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    type: 'email',
    value: 'john@example.com',
    startIndex: 8,
    endIndex: 24,
    confidence: 'HIGH',
    label: 'Email Address',
    placeholder: "[John's email]",
    ...overrides,
  };
}

describe('context-scorer foundation', () => {
  it('builds a nearby context window around a finding', () => {
    const text = 'Please review john@example.com for payroll follow-up';
    const startIndex = text.indexOf('john@example.com');
    const finding = makeFinding({
      startIndex,
      endIndex: startIndex + 'john@example.com'.length,
    });
    const window = buildContextWindow(text, finding, 12);

    expect(window.match).toBe('john@example.com');
    expect(window.before).toContain('review ');
    expect(window.after).toContain(' for payroll');
    expect(window.nearby).toContain('john@example.com');
  });

  it('attaches neutral context metadata when no scorers run', () => {
    const finding = scoreFindingWithContext(
      'Contact john@example.com for details',
      makeFinding(),
      [],
    );

    expect(finding.context).toEqual({
      baseConfidence: 'HIGH',
      score: 0,
      categories: [],
      signals: [],
      explanation: null,
    });
    expect(finding.confidence).toBe('HIGH');
  });

  it('promotes confidence when the aggregate context score crosses the boost threshold', () => {
    const scorer: ContextScorer = () => ({
      scoreDelta: 1,
      categories: ['hr-compensation'],
      signals: [
        {
          category: 'hr-compensation',
          label: 'salary language',
          direction: 'boost',
          weight: 1,
        },
      ],
      explanation: {
        summary: 'Flagged because this looks like compensation information.',
        reasons: ['Nearby salary wording increased confidence.'],
        categories: ['hr-compensation'],
      },
    });

    const finding = scoreFindingWithContext(
      'Email john@example.com about salary bands',
      makeFinding({ confidence: 'MEDIUM' }),
      [],
      [scorer],
    );

    expect(finding.confidence).toBe('HIGH');
    expect(finding.context?.score).toBe(1);
    expect(finding.context?.explanation?.summary).toContain('compensation');
  });

  it('scores every finding in the list while preserving order', () => {
    const findings = scoreFindingsWithContext(
      'Email john@example.com and jane@example.com',
      [
        makeFinding(),
        makeFinding({
          value: 'jane@example.com',
          startIndex: 29,
          endIndex: 45,
          placeholder: "[Jane's email]",
        }),
      ],
    );

    expect(findings).toHaveLength(2);
    expect(findings[0]?.value).toBe('john@example.com');
    expect(findings[1]?.value).toBe('jane@example.com');
    expect(findings.every((finding) => finding.context?.score === 0)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { buildFindingExplanation } from '../../../src/classifier/explanations';

describe('buildFindingExplanation', () => {
  it('returns null when no signals are present', () => {
    expect(buildFindingExplanation([])).toBeNull();
  });

  it('builds a user-facing explanation summary and reasons from boost signals', () => {
    const explanation = buildFindingExplanation([
      {
        category: 'confidentiality',
        label: 'confidential wording',
        direction: 'boost',
        weight: 1,
      },
      {
        category: 'legal-privilege',
        label: 'legal privilege wording',
        direction: 'boost',
        weight: 1,
      },
    ]);

    expect(explanation?.summary).toContain('confidential');
    expect(explanation?.reasons).toEqual([
      'confidential wording increased confidence.',
      'legal privilege wording increased confidence.',
    ]);
    expect(explanation?.categories).toEqual(['confidentiality', 'legal-privilege']);
  });

  it('uses suppressor-specific wording for example-style content', () => {
    const explanation = buildFindingExplanation([
      {
        category: 'example-data',
        label: 'example-style content',
        direction: 'suppress',
        weight: -1,
      },
    ]);

    expect(explanation?.summary).toContain('lower confidence');
    expect(explanation?.reasons).toEqual(['example-style content lowered confidence.']);
  });
});

import { describe, it, expect } from 'vitest';
import { classify } from '../../../src/classifier/engine';

describe('classify with excludeRanges', () => {
  it('filters out findings inside an excluded range', () => {
    const text = 'Contact john@example.com for details';
    // Exclude the range covering the email (8..24)
    const result = classify(text, {
      keywords: [],
      excludeRanges: [{ start: 8, end: 24 }],
    });
    expect(result.findings).toHaveLength(0);
  });

  it('filters out keyword inside excluded range', () => {
    const text = 'This has [John S. email] in it';
    const result = classify(text, {
      keywords: ['email'],
      excludeRanges: [{ start: 9, end: 24 }],
    });
    expect(result.findings).toHaveLength(0);
  });

  it('filters out finding partially overlapping excluded range', () => {
    const text = 'Contact john@example.com for details';
    // Overlap the start of the email
    const result = classify(text, {
      keywords: [],
      excludeRanges: [{ start: 5, end: 15 }],
    });
    expect(result.findings).toHaveLength(0);
  });

  it('keeps findings fully outside excluded range', () => {
    const text = 'Call 555-123-4567 or email john@example.com';
    // Exclude only the phone range (5..17)
    const result = classify(text, {
      keywords: [],
      excludeRanges: [{ start: 5, end: 17 }],
    });
    // Email should still be detected
    const emails = result.findings.filter((f) => f.type === 'email');
    expect(emails).toHaveLength(1);
    // Phone should be excluded
    const phones = result.findings.filter((f) => f.type === 'phone');
    expect(phones).toHaveLength(0);
  });

  it('handles multiple excluded ranges', () => {
    const text = 'Email john@a.com and phone 555-123-4567 and card 4111111111111111';
    const result = classify(text, {
      keywords: [],
      excludeRanges: [
        { start: 6, end: 16 },  // covers email
        { start: 27, end: 39 }, // covers phone
      ],
    });
    // Only credit card should remain
    const types = result.findings.map((f) => f.type);
    expect(types).not.toContain('email');
    expect(types).not.toContain('phone');
    expect(types).toContain('credit-card');
  });

  it('behaves identically with empty excludeRanges', () => {
    const text = 'Contact john@example.com for details';
    const withEmpty = classify(text, {
      keywords: [],
      excludeRanges: [],
    });
    const without = classify(text, {
      keywords: [],
    });
    expect(withEmpty.findings).toHaveLength(without.findings.length);
    expect(withEmpty.findings[0]?.type).toBe(without.findings[0]?.type);
  });

  it('behaves identically with no excludeRanges option', () => {
    const text = 'Contact john@example.com for details';
    const result = classify(text, { keywords: [] });
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.type).toBe('email');
  });
});

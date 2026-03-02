import { describe, it, expect } from 'vitest';
import { classify } from '../../../src/classifier/engine';

describe('classify', () => {
  describe('empty input', () => {
    it('returns empty findings for empty string', () => {
      const result = classify('', { keywords: [] });
      expect(result.findings).toHaveLength(0);
      expect(result.hasHighConfidence).toBe(false);
      expect(result.truncated).toBe(false);
    });

    it('returns empty findings for whitespace-only', () => {
      const result = classify('   \n\t  ', { keywords: [] });
      expect(result.findings).toHaveLength(0);
    });
  });

  describe('single detector findings', () => {
    it('detects an email address', () => {
      const result = classify('Contact john@example.com for details', { keywords: [] });
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.type).toBe('email');
      expect(result.findings[0]?.value).toBe('john@example.com');
      expect(result.hasHighConfidence).toBe(true);
    });

    it('detects a phone number', () => {
      const result = classify('Call 555-123-4567 today', { keywords: [] });
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.type).toBe('phone');
      expect(result.hasHighConfidence).toBe(false); // phone is MEDIUM
    });

    it('detects a credit card', () => {
      const result = classify('Card: 4111111111111111', { keywords: [] });
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.type).toBe('credit-card');
      expect(result.hasHighConfidence).toBe(true);
    });
  });

  describe('multiple detector findings', () => {
    it('finds email and phone in same text', () => {
      const result = classify(
        'Email john@example.com or call 555-123-4567',
        { keywords: [] },
      );
      expect(result.findings).toHaveLength(2);
      expect(result.findings[0]?.type).toBe('email');
      expect(result.findings[1]?.type).toBe('phone');
    });

    it('sorts findings by startIndex', () => {
      const result = classify(
        'Call 555-123-4567 or email john@example.com',
        { keywords: [] },
      );
      expect(result.findings).toHaveLength(2);
      expect(result.findings[0]?.startIndex).toBeLessThan(result.findings[1]?.startIndex ?? 0);
    });
  });

  describe('deduplication', () => {
    it('deduplicates overlapping findings (higher confidence wins)', () => {
      // SSN 123-45-6789 (HIGH) overlaps with a phone pattern 123-456-789 (MEDIUM)
      // The SSN should win since it has higher confidence
      const result = classify('Employee SSN: 123-45-6789 on file', { keywords: [] });
      const ssn = result.findings.filter(f => f.type === 'ssn');
      expect(ssn).toHaveLength(1);
      expect(ssn[0]?.confidence).toBe('HIGH');
    });

    it('guarantees no overlapping findings in output', () => {
      const result = classify(
        'Contact john@example.com at 555-123-4567 with card 4111111111111111',
        { keywords: ['example'] },
      );
      // Verify no overlaps
      for (let i = 0; i < result.findings.length - 1; i++) {
        const current = result.findings[i];
        const next = result.findings[i + 1];
        if (current && next) {
          expect(current.endIndex).toBeLessThanOrEqual(next.startIndex);
        }
      }
    });
  });

  describe('placeholder assignment', () => {
    it('assigns placeholders per type', () => {
      const result = classify('Email john@a.com and jane@b.com', { keywords: [] });
      expect(result.findings).toHaveLength(2);
      expect(result.findings[0]?.placeholder).toBe('[EMAIL_1]');
      expect(result.findings[1]?.placeholder).toBe('[EMAIL_2]');
    });

    it('same value gets same placeholder number', () => {
      const result = classify('john@a.com then john@a.com again', { keywords: [] });
      expect(result.findings).toHaveLength(2);
      expect(result.findings[0]?.placeholder).toBe('[EMAIL_1]');
      expect(result.findings[1]?.placeholder).toBe('[EMAIL_1]');
    });

    it('different types get independent numbering', () => {
      const result = classify(
        'Email john@a.com and call 555-123-4567',
        { keywords: [] },
      );
      expect(result.findings).toHaveLength(2);
      expect(result.findings[0]?.placeholder).toBe('[EMAIL_1]');
      expect(result.findings[1]?.placeholder).toBe('[PHONE_1]');
    });
  });

  describe('keyword matching', () => {
    it('detects keyword matches', () => {
      const result = classify('This is a confidential report', {
        keywords: ['confidential'],
      });
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.type).toBe('keyword');
      expect(result.findings[0]?.placeholder).toBe('[KEYWORD_1]');
    });

    it('does not run keyword matcher when keywords is empty', () => {
      const result = classify('This is confidential', { keywords: [] });
      const keywords = result.findings.filter(f => f.type === 'keyword');
      expect(keywords).toHaveLength(0);
    });
  });

  describe('enabledDetectors', () => {
    it('only runs enabled detectors', () => {
      const result = classify('john@example.com and 555-123-4567', {
        keywords: [],
        enabledDetectors: new Set(['email'] as const),
      });
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]?.type).toBe('email');
    });

    it('skips disabled detectors', () => {
      const result = classify('john@example.com', {
        keywords: [],
        enabledDetectors: new Set(['phone'] as const),
      });
      expect(result.findings).toHaveLength(0);
    });

    it('runs all detectors when enabledDetectors is not provided', () => {
      const result = classify(
        'Email john@test.com and call 555-123-4567',
        { keywords: [] },
      );
      expect(result.findings.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('truncation', () => {
    it('sets truncated flag for very long input', () => {
      const longText = 'a'.repeat(60_000);
      const result = classify(longText, { keywords: [] });
      expect(result.truncated).toBe(true);
    });

    it('does not set truncated flag for normal input', () => {
      const result = classify('Normal text here', { keywords: [] });
      expect(result.truncated).toBe(false);
    });
  });

  describe('performance', () => {
    it('classifies 10K character input in under 50ms', () => {
      // Build a realistic 10K character prompt with some PII
      const segments = [
        'Please help me debug my application. ',
        'The server at 192.168.1.100 is not responding. ',
        'My colleague john@example.com reported the issue. ',
        'Here is the error log from the production system. ',
        'The user called from 555-123-4567 about this problem. ',
        'We need to check the database configuration. ',
        'The API endpoint returns a 500 error when called. ',
        'Lorem ipsum dolor sit amet consectetur adipiscing. ',
      ];

      let text = '';
      while (text.length < 10_000) {
        text += segments[text.length % segments.length] ?? segments[0];
      }
      text = text.slice(0, 10_000);

      const result = classify(text, { keywords: ['database', 'production'] });
      expect(result.durationMs).toBeLessThan(50);
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  describe('durationMs', () => {
    it('reports classification duration', () => {
      const result = classify('john@example.com', { keywords: [] });
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe('number');
    });
  });

  describe('clean input', () => {
    it('returns no findings for clean developer prompt', () => {
      const result = classify(
        'How do I implement a binary search tree in TypeScript? I want it to support insert, delete, and search operations with O(log n) complexity.',
        { keywords: [] },
      );
      expect(result.findings).toHaveLength(0);
      expect(result.hasHighConfidence).toBe(false);
    });
  });
});

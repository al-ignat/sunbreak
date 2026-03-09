import { describe, it, expect } from 'vitest';
import { classify } from '../../../src/classifier/engine';

/**
 * Token Re-Detection Safety Tests
 *
 * Verifies that no descriptive token format triggers any detector.
 * After a "Fix" action, the scanner re-classifies text containing tokens.
 * If a token matches a detector, it creates an infinite fix loop.
 */

/** All possible descriptive token formats the engine can produce */
const TOKEN_FORMATS = [
  // Email tokens
  '[John S. email]',
  "[John's email]",
  '[J. Smith email]',
  '[email]',
  '[email 2]',
  '[A. D. email]',

  // Phone tokens
  '[phone ending 67]',
  '[phone ending 78]',
  '[phone ending 00]',

  // Credit card tokens
  '[card ending 4242]',
  '[card ending 1111]',
  '[card ending 0004]',

  // National ID tokens
  '[SSN redacted]',
  '[SSN redacted 2]',
  '[CPR redacted]',
  '[NI number redacted]',

  // API key tokens
  '[OpenAI API key]',
  '[AWS access key]',
  '[GitHub token]',
  '[Stripe secret key]',
  '[Stripe publishable key]',
  '[Azure connection string]',
  '[API key]',

  // IP address tokens
  '[internal IP]',
  '[IP address]',
  '[internal IP 2]',

  // Keyword tokens
  '[custom keyword]',
  '[custom keyword 2]',
];

describe('token re-detection safety', () => {
  describe('no detector matches any descriptive token format', () => {
    for (const token of TOKEN_FORMATS) {
      it(`"${token}" produces zero findings`, () => {
        const result = classify(`Some text with ${token} in it`, {
          keywords: [],
        });
        expect(result.findings).toHaveLength(0);
      });
    }
  });

  describe('tokens are safe even with common keywords enabled', () => {
    const dangerousKeywords = [
      'email', 'phone', 'card', 'key', 'IP', 'SSN', 'CPR',
      'token', 'secret', 'password', 'address', 'number',
      'redacted', 'ending', 'internal', 'custom', 'keyword',
    ];

    it('email token not re-detected with "email" keyword', () => {
      const result = classify('Here is [John S. email] for reference', {
        keywords: ['email'],
        excludeRanges: [{ start: 8, end: 24 }],
      });
      expect(result.findings).toHaveLength(0);
    });

    it('phone token not re-detected with "phone" keyword', () => {
      const result = classify('Call [phone ending 67] back', {
        keywords: ['phone'],
        excludeRanges: [{ start: 5, end: 22 }],
      });
      expect(result.findings).toHaveLength(0);
    });

    it('card token not re-detected with "card" keyword', () => {
      const result = classify('Use [card ending 4242] to pay', {
        keywords: ['card'],
        excludeRanges: [{ start: 4, end: 22 }],
      });
      expect(result.findings).toHaveLength(0);
    });

    it('API key token not re-detected with "key" keyword', () => {
      const result = classify('The [OpenAI API key] was leaked', {
        keywords: ['key'],
        excludeRanges: [{ start: 4, end: 20 }],
      });
      expect(result.findings).toHaveLength(0);
    });

    it('SSN token not re-detected with "SSN" keyword', () => {
      const result = classify('Employee [SSN redacted] on file', {
        keywords: ['SSN'],
        excludeRanges: [{ start: 9, end: 23 }],
      });
      expect(result.findings).toHaveLength(0);
    });

    it('IP token not re-detected with "IP" keyword', () => {
      const result = classify('Server at [internal IP] is down', {
        keywords: ['IP'],
        excludeRanges: [{ start: 10, end: 23 }],
      });
      expect(result.findings).toHaveLength(0);
    });

    it('keyword token not re-detected with "keyword" keyword', () => {
      const result = classify('Found [custom keyword] in text', {
        keywords: ['keyword'],
        excludeRanges: [{ start: 6, end: 22 }],
      });
      expect(result.findings).toHaveLength(0);
    });

    it('all tokens safe with all dangerous keywords at once', () => {
      const text = TOKEN_FORMATS.join(' ');
      // Build exclude ranges for all tokens
      let offset = 0;
      const excludeRanges = TOKEN_FORMATS.map((token) => {
        const start = text.indexOf(token, offset);
        const end = start + token.length;
        offset = end;
        return { start, end };
      });

      const result = classify(text, {
        keywords: dangerousKeywords,
        excludeRanges,
      });
      expect(result.findings).toHaveLength(0);
    });
  });

  describe('tokens without excludeRanges (format-level safety)', () => {
    it('no token format contains a valid email address', () => {
      for (const token of TOKEN_FORMATS) {
        const result = classify(token, {
          keywords: [],
          enabledDetectors: new Set(['email']),
        });
        expect(result.findings).toHaveLength(0);
      }
    });

    it('no token format contains a valid credit card number', () => {
      for (const token of TOKEN_FORMATS) {
        const result = classify(token, {
          keywords: [],
          enabledDetectors: new Set(['credit-card']),
        });
        expect(result.findings).toHaveLength(0);
      }
    });

    it('no token format contains a valid SSN/CPR/NI', () => {
      for (const token of TOKEN_FORMATS) {
        const result = classify(token, {
          keywords: [],
          enabledDetectors: new Set(['ssn', 'cpr', 'ni-number']),
        });
        expect(result.findings).toHaveLength(0);
      }
    });

    it('no token format contains a valid API key', () => {
      for (const token of TOKEN_FORMATS) {
        const result = classify(token, {
          keywords: [],
          enabledDetectors: new Set(['api-key']),
        });
        expect(result.findings).toHaveLength(0);
      }
    });

    it('no token format contains a valid phone number', () => {
      for (const token of TOKEN_FORMATS) {
        const result = classify(token, {
          keywords: [],
          enabledDetectors: new Set(['phone']),
        });
        expect(result.findings).toHaveLength(0);
      }
    });

    it('no token format contains a valid IP address', () => {
      for (const token of TOKEN_FORMATS) {
        const result = classify(token, {
          keywords: [],
          enabledDetectors: new Set(['ip-address']),
        });
        expect(result.findings).toHaveLength(0);
      }
    });
  });
});

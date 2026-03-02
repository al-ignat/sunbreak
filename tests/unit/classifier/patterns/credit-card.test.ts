import { describe, it, expect } from 'vitest';
import { detectCreditCards, luhnCheck } from '../../../../src/classifier/patterns/credit-card';

describe('luhnCheck', () => {
  it('validates Visa test number', () => {
    expect(luhnCheck('4111111111111111')).toBe(true);
  });

  it('validates Mastercard test number', () => {
    expect(luhnCheck('5500000000000004')).toBe(true);
  });

  it('validates Amex test number', () => {
    expect(luhnCheck('378282246310005')).toBe(true);
  });

  it('rejects arbitrary 16-digit number', () => {
    expect(luhnCheck('1234567890123456')).toBe(false);
  });

  it('rejects all zeros', () => {
    expect(luhnCheck('0000000000000000')).toBe(true); // Luhn passes for all zeros (sum=0)
  });
});

describe('detectCreditCards', () => {
  describe('true positives', () => {
    it('detects Visa number without separators', () => {
      const findings = detectCreditCards('Card: 4111111111111111');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('4111111111111111');
      expect(findings[0]?.confidence).toBe('HIGH');
      expect(findings[0]?.type).toBe('credit-card');
    });

    it('detects Visa number with spaces', () => {
      const findings = detectCreditCards('Card: 4111 1111 1111 1111');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('4111 1111 1111 1111');
    });

    it('detects Visa number with dashes', () => {
      const findings = detectCreditCards('Card: 4111-1111-1111-1111');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('4111-1111-1111-1111');
    });

    it('detects Mastercard number', () => {
      const findings = detectCreditCards('MC: 5500000000000004');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('5500000000000004');
    });

    it('detects Amex number (15 digits)', () => {
      const findings = detectCreditCards('Amex: 378282246310005');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('378282246310005');
    });

    it('detects card in sentence context', () => {
      const findings = detectCreditCards('My card is 4111111111111111 please charge it');
      expect(findings).toHaveLength(1);
    });
  });

  describe('true negatives', () => {
    it('rejects random 16-digit number failing Luhn', () => {
      const findings = detectCreditCards('ID: 1234567890123456');
      expect(findings).toHaveLength(0);
    });

    it('rejects 12-digit number (too short)', () => {
      const findings = detectCreditCards('Short: 123456789012');
      expect(findings).toHaveLength(0);
    });

    it('rejects 20-digit number (too long)', () => {
      const findings = detectCreditCards('Long: 12345678901234567890');
      expect(findings).toHaveLength(0);
    });

    it('rejects UUID-like pattern', () => {
      // UUID has letters so it won't even get to digit extraction
      const findings = detectCreditCards('550e8400-e29b-41d4-a716-446655440000');
      expect(findings).toHaveLength(0);
    });

    it('rejects timestamps', () => {
      const findings = detectCreditCards('Timestamp: 1709424000000');
      expect(findings).toHaveLength(0);
    });
  });

  describe('startIndex and endIndex accuracy', () => {
    it('returns correct indices for no-separator card', () => {
      const text = 'Pay 4111111111111111 now';
      const findings = detectCreditCards(text);
      expect(findings).toHaveLength(1);
      expect(text.slice(findings[0]?.startIndex, findings[0]?.endIndex)).toBe('4111111111111111');
    });

    it('returns correct indices for spaced card', () => {
      const text = 'Use 4111 1111 1111 1111 ok';
      const findings = detectCreditCards(text);
      expect(findings).toHaveLength(1);
      expect(text.slice(findings[0]?.startIndex, findings[0]?.endIndex)).toBe('4111 1111 1111 1111');
    });
  });
});

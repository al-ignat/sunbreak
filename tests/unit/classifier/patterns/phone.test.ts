import { describe, it, expect } from 'vitest';
import { detectPhones } from '../../../../src/classifier/patterns/phone';

describe('detectPhones', () => {
  describe('true positives', () => {
    it('detects US format with dashes', () => {
      const findings = detectPhones('Call me at 555-123-4567');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('555-123-4567');
      expect(findings[0]?.confidence).toBe('MEDIUM');
      expect(findings[0]?.type).toBe('phone');
    });

    it('detects US format with parentheses', () => {
      const findings = detectPhones('Phone: (555) 123-4567');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('(555) 123-4567');
    });

    it('detects US format with dots', () => {
      const findings = detectPhones('Reach me at 555.123.4567');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('555.123.4567');
    });

    it('detects international format with +', () => {
      const findings = detectPhones('Call +1-555-123-4567');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('+1-555-123-4567');
    });

    it('detects Danish phone number', () => {
      const findings = detectPhones('Ring +45 12 34 56 78');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('+45 12 34 56 78');
    });

    it('detects UK phone number', () => {
      const findings = detectPhones('Text +44 7911 123 456');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('+44 7911 123 456');
    });

    it('detects phone with spaces', () => {
      const findings = detectPhones('Number: 555 123 4567');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('555 123 4567');
    });
  });

  describe('true negatives', () => {
    it('does not match short numbers (< 7 digits)', () => {
      const findings = detectPhones('Code: 12-34');
      expect(findings).toHaveLength(0);
    });

    it('does not match bare digit sequence without separators', () => {
      const findings = detectPhones('Order ID: 1234567890');
      expect(findings).toHaveLength(0);
    });

    it('does not match dates in YYYY-MM-DD format', () => {
      const findings = detectPhones('Date: 2024-03-02');
      expect(findings).toHaveLength(0);
    });

    it('does not match version numbers', () => {
      const findings = detectPhones('Version 2.0.1');
      expect(findings).toHaveLength(0);
    });

    it('does not match IP-like numbers', () => {
      const findings = detectPhones('IP: 192.168.1.1');
      expect(findings).toHaveLength(0);
    });

    it('does not match credit card numbers (13+ digits)', () => {
      const findings = detectPhones('Card: 1234-5678-9012-3456');
      expect(findings).toHaveLength(0);
    });

    it('does not match SSN format (XXX-XX-XXXX)', () => {
      const findings = detectPhones('SSN: 000-00-0000');
      expect(findings).toHaveLength(0);
    });

    it('does not match SSN-like numbers even without SSN label', () => {
      const findings = detectPhones('Number: 123-45-6789');
      expect(findings).toHaveLength(0);
    });
  });

  describe('startIndex and endIndex accuracy', () => {
    it('returns correct indices', () => {
      const text = 'Call 555-123-4567 now';
      const findings = detectPhones(text);
      expect(findings).toHaveLength(1);
      expect(text.slice(findings[0]?.startIndex, findings[0]?.endIndex)).toBe('555-123-4567');
    });
  });
});

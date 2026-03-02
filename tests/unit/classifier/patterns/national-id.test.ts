import { describe, it, expect } from 'vitest';
import { detectNationalIds } from '../../../../src/classifier/patterns/national-id';

describe('detectNationalIds', () => {
  // ── US SSN ──────────────────────────────────────────────────────────

  describe('US SSN — dashed format (HIGH confidence)', () => {
    it('detects standard SSN', () => {
      const findings = detectNationalIds('SSN: 123-45-6789');
      const ssn = findings.filter(f => f.type === 'ssn');
      expect(ssn).toHaveLength(1);
      expect(ssn[0]?.value).toBe('123-45-6789');
      expect(ssn[0]?.confidence).toBe('HIGH');
    });

    it('detects SSN at area boundary 899', () => {
      const findings = detectNationalIds('Number: 899-99-9999');
      const ssn = findings.filter(f => f.type === 'ssn');
      expect(ssn).toHaveLength(1);
    });

    it('detects SSN at minimum valid values', () => {
      const findings = detectNationalIds('ID: 001-01-0001');
      const ssn = findings.filter(f => f.type === 'ssn');
      expect(ssn).toHaveLength(1);
    });

    it('rejects area 000', () => {
      const findings = detectNationalIds('Bad: 000-12-3456');
      const ssn = findings.filter(f => f.type === 'ssn');
      expect(ssn).toHaveLength(0);
    });

    it('rejects area 900+', () => {
      const findings = detectNationalIds('Bad: 900-12-3456');
      const ssn = findings.filter(f => f.type === 'ssn');
      expect(ssn).toHaveLength(0);
    });

    it('rejects group 00', () => {
      const findings = detectNationalIds('Bad: 123-00-4567');
      const ssn = findings.filter(f => f.type === 'ssn');
      expect(ssn).toHaveLength(0);
    });

    it('rejects serial 0000', () => {
      const findings = detectNationalIds('Bad: 123-45-0000');
      const ssn = findings.filter(f => f.type === 'ssn');
      expect(ssn).toHaveLength(0);
    });
  });

  describe('US SSN — dashless with context (MEDIUM confidence)', () => {
    it('detects dashless SSN preceded by "SSN"', () => {
      const findings = detectNationalIds('SSN 123456789');
      const ssn = findings.filter(f => f.type === 'ssn');
      expect(ssn).toHaveLength(1);
      expect(ssn[0]?.value).toBe('123456789');
      expect(ssn[0]?.confidence).toBe('MEDIUM');
    });

    it('detects with "social security number" context', () => {
      const findings = detectNationalIds('social security number: 123456789');
      const ssn = findings.filter(f => f.type === 'ssn');
      expect(ssn).toHaveLength(1);
      expect(ssn[0]?.confidence).toBe('MEDIUM');
    });

    it('does NOT match bare 9-digit number without context', () => {
      const findings = detectNationalIds('Reference: 123456789');
      const ssn = findings.filter(f => f.type === 'ssn');
      expect(ssn).toHaveLength(0);
    });
  });

  // ── Danish CPR ──────────────────────────────────────────────────────

  describe('Danish CPR (HIGH confidence)', () => {
    it('detects valid CPR', () => {
      const findings = detectNationalIds('CPR: 010190-1234');
      const cpr = findings.filter(f => f.type === 'cpr');
      expect(cpr).toHaveLength(1);
      expect(cpr[0]?.value).toBe('010190-1234');
      expect(cpr[0]?.confidence).toBe('HIGH');
    });

    it('detects CPR with different date', () => {
      const findings = detectNationalIds('150585-5678');
      const cpr = findings.filter(f => f.type === 'cpr');
      expect(cpr).toHaveLength(1);
    });

    it('detects leap day CPR (Feb 29)', () => {
      const findings = detectNationalIds('290200-9999');
      const cpr = findings.filter(f => f.type === 'cpr');
      expect(cpr).toHaveLength(1);
    });

    it('rejects invalid day 32', () => {
      const findings = detectNationalIds('320190-1234');
      const cpr = findings.filter(f => f.type === 'cpr');
      expect(cpr).toHaveLength(0);
    });

    it('rejects invalid month 13', () => {
      const findings = detectNationalIds('011390-1234');
      const cpr = findings.filter(f => f.type === 'cpr');
      expect(cpr).toHaveLength(0);
    });

    it('rejects day 00', () => {
      const findings = detectNationalIds('000190-1234');
      const cpr = findings.filter(f => f.type === 'cpr');
      expect(cpr).toHaveLength(0);
    });

    it('rejects month 00', () => {
      const findings = detectNationalIds('010090-1234');
      const cpr = findings.filter(f => f.type === 'cpr');
      expect(cpr).toHaveLength(0);
    });
  });

  // ── UK NI Number ────────────────────────────────────────────────────

  describe('UK National Insurance Number (HIGH confidence)', () => {
    it('detects NI with spaces', () => {
      const findings = detectNationalIds('NI: AB 12 34 56 C');
      const ni = findings.filter(f => f.type === 'ni-number');
      expect(ni).toHaveLength(1);
      expect(ni[0]?.value).toBe('AB 12 34 56 C');
      expect(ni[0]?.confidence).toBe('HIGH');
    });

    it('detects NI without spaces', () => {
      const findings = detectNationalIds('NI: AB123456C');
      const ni = findings.filter(f => f.type === 'ni-number');
      expect(ni).toHaveLength(1);
      expect(ni[0]?.value).toBe('AB123456C');
    });

    it('detects NI with suffix D', () => {
      const findings = detectNationalIds('CE 12 34 56 D');
      const ni = findings.filter(f => f.type === 'ni-number');
      expect(ni).toHaveLength(1);
    });

    it('rejects invalid prefix BG', () => {
      const findings = detectNationalIds('BG 12 34 56 A');
      const ni = findings.filter(f => f.type === 'ni-number');
      expect(ni).toHaveLength(0);
    });

    it('rejects invalid prefix GB', () => {
      const findings = detectNationalIds('GB 12 34 56 A');
      const ni = findings.filter(f => f.type === 'ni-number');
      expect(ni).toHaveLength(0);
    });

    it('rejects invalid suffix E', () => {
      const findings = detectNationalIds('AB 12 34 56 E');
      const ni = findings.filter(f => f.type === 'ni-number');
      expect(ni).toHaveLength(0);
    });

    it('rejects prefix starting with D', () => {
      // D is excluded from first letter by the regex character class
      const findings = detectNationalIds('DA 12 34 56 A');
      const ni = findings.filter(f => f.type === 'ni-number');
      expect(ni).toHaveLength(0);
    });

    it('rejects prefix starting with F', () => {
      const findings = detectNationalIds('FA 12 34 56 A');
      const ni = findings.filter(f => f.type === 'ni-number');
      expect(ni).toHaveLength(0);
    });
  });

  // ── Combined ────────────────────────────────────────────────────────

  describe('multiple national IDs in same text', () => {
    it('finds SSN and CPR in same text', () => {
      const findings = detectNationalIds('US: 123-45-6789, DK: 010190-1234');
      expect(findings).toHaveLength(2);
      expect(findings.some(f => f.type === 'ssn')).toBe(true);
      expect(findings.some(f => f.type === 'cpr')).toBe(true);
    });
  });
});

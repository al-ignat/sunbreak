import { describe, it, expect } from 'vitest';
import {
  compileCustomPattern,
  compileCustomPatterns,
  normalizeCustomPattern,
  normalizeCustomPatterns,
  sanitizeCustomPatternFlags,
} from '../../../src/classifier/custom-patterns';
import type { CustomPattern } from '../../../src/storage/types';

function makePattern(overrides: Partial<CustomPattern> = {}): CustomPattern {
  return {
    id: 'pattern-1',
    label: 'Employee ID',
    description: '',
    enabled: true,
    severity: 'warning',
    category: 'internal-identifier',
    sourceMode: 'advanced-regex',
    templateId: null,
    pattern: 'EMP-[0-9]{5}',
    flags: 'gi',
    samples: { positive: [], negative: [] },
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z',
    ...overrides,
  };
}

describe('custom-pattern runtime contract', () => {
  describe('sanitizeCustomPatternFlags', () => {
    it('keeps only allowed flags and guarantees global matching', () => {
      expect(sanitizeCustomPatternFlags('migx')).toBe('gim');
    });

    it('defaults to gi when no valid flags are present', () => {
      expect(sanitizeCustomPatternFlags('')).toBe('gi');
    });
  });

  describe('normalizeCustomPattern', () => {
    it('fills in defaults for missing fields', () => {
      const pattern = normalizeCustomPattern({
        label: 'Invoice Number',
        pattern: 'INV-[0-9]{6}',
      }, '2026-03-14T00:00:00.000Z');

      expect(pattern).toEqual(expect.objectContaining({
        label: 'Invoice Number',
        pattern: 'INV-[0-9]{6}',
        enabled: true,
        severity: 'warning',
        category: 'other',
        sourceMode: 'advanced-regex',
        templateId: null,
        flags: 'gi',
      }));
    });

    it('keeps template provenance when present', () => {
      const pattern = normalizeCustomPattern({
        label: 'Employee ID',
        pattern: 'EMP-[0-9]{5}',
        templateId: 'employee-id',
      }, '2026-03-14T00:00:00.000Z');

      expect(pattern.sourceMode).toBe('template');
      expect(pattern.templateId).toBe('employee-id');
    });
  });

  describe('normalizeCustomPatterns', () => {
    it('filters out invalid stored items', () => {
      const normalized = normalizeCustomPatterns([
        { id: 'ok', label: 'Employee ID', pattern: 'EMP-[0-9]{5}' },
        { id: 'missing-label', pattern: 'INV-[0-9]{6}' },
        'not-an-object',
      ]);

      expect(normalized).toHaveLength(1);
      expect(normalized[0]?.id).toBe('ok');
    });
  });

  describe('compileCustomPattern', () => {
    it('compiles a valid custom pattern to a RegExp runtime contract', () => {
      const compiled = compileCustomPattern(makePattern());
      expect(compiled?.regex).toBeInstanceOf(RegExp);
      expect(compiled?.regex.flags).toContain('g');
      expect(compiled?.regex.flags).toContain('i');
    });

    it('returns null for invalid regex patterns', () => {
      const compiled = compileCustomPattern(makePattern({ pattern: '(' }));
      expect(compiled).toBeNull();
    });
  });

  describe('compileCustomPatterns', () => {
    it('skips disabled and invalid patterns', () => {
      const compiled = compileCustomPatterns([
        makePattern(),
        makePattern({ id: 'disabled', enabled: false }),
        makePattern({ id: 'invalid', pattern: '(' }),
      ]);

      expect(compiled).toHaveLength(1);
      expect(compiled[0]?.id).toBe('pattern-1');
    });
  });
});

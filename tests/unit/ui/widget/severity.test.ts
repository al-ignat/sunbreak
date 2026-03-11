import { describe, it, expect } from 'vitest';
import {
  findingSeverity,
  maxSeverity,
} from '../../../../src/ui/widget/severity';
import type { TrackedFinding } from '../../../../src/content/findings-state';
import type { Finding } from '../../../../src/classifier/types';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    type: 'email',
    value: 'john@example.com',
    startIndex: 0,
    endIndex: 16,
    confidence: 'HIGH',
    label: 'Email Address',
    placeholder: '[EMAIL_1]',
    ...overrides,
  };
}

function makeTracked(overrides: Partial<TrackedFinding> = {}): TrackedFinding {
  return {
    id: 'tf-1',
    finding: makeFinding(),
    status: 'active',
    ...overrides,
  };
}

describe('findingSeverity', () => {
  it('maps api-key to critical', () => {
    expect(findingSeverity('api-key')).toBe('critical');
  });

  it('maps ssn to concern', () => {
    expect(findingSeverity('ssn')).toBe('concern');
  });

  it('maps cpr to concern', () => {
    expect(findingSeverity('cpr')).toBe('concern');
  });

  it('maps ni-number to concern', () => {
    expect(findingSeverity('ni-number')).toBe('concern');
  });

  it('maps credit-card to concern', () => {
    expect(findingSeverity('credit-card')).toBe('concern');
  });

  it('maps email to warning', () => {
    expect(findingSeverity('email')).toBe('warning');
  });

  it('maps phone to warning', () => {
    expect(findingSeverity('phone')).toBe('warning');
  });

  it('maps ip-address to warning', () => {
    expect(findingSeverity('ip-address')).toBe('warning');
  });

  it('maps keyword to warning', () => {
    expect(findingSeverity('keyword')).toBe('warning');
  });
});

describe('maxSeverity', () => {
  it('returns clean for empty list', () => {
    expect(maxSeverity([])).toBe('clean');
  });

  it('returns clean when all findings are fixed', () => {
    const tracked = [
      makeTracked({ status: 'fixed' }),
      makeTracked({ id: 'tf-2', status: 'ignored' }),
    ];
    expect(maxSeverity(tracked)).toBe('clean');
  });

  it('returns warning for email-only findings', () => {
    const tracked = [makeTracked()];
    expect(maxSeverity(tracked)).toBe('warning');
  });

  it('returns concern for credit-card findings', () => {
    const tracked = [
      makeTracked({
        finding: makeFinding({ type: 'credit-card', value: '4111111111111111' }),
      }),
    ];
    expect(maxSeverity(tracked)).toBe('concern');
  });

  it('returns critical for api-key findings', () => {
    const tracked = [
      makeTracked({
        finding: makeFinding({ type: 'api-key', value: 'sk-proj-abc123' }),
      }),
    ];
    expect(maxSeverity(tracked)).toBe('critical');
  });

  it('returns highest severity across mixed findings', () => {
    const tracked = [
      makeTracked({ id: 'tf-1' }), // email → warning
      makeTracked({
        id: 'tf-2',
        finding: makeFinding({ type: 'credit-card', value: '4111111111111111' }),
      }), // concern
      makeTracked({
        id: 'tf-3',
        finding: makeFinding({ type: 'api-key', value: 'sk-proj-abc' }),
      }), // critical
    ];
    expect(maxSeverity(tracked)).toBe('critical');
  });

  it('ignores non-active findings when determining severity', () => {
    const tracked = [
      makeTracked({
        id: 'tf-1',
        status: 'fixed',
        finding: makeFinding({ type: 'api-key', value: 'sk-proj-abc' }),
      }),
      makeTracked({ id: 'tf-2' }), // email → warning (active)
    ];
    expect(maxSeverity(tracked)).toBe('warning');
  });
});

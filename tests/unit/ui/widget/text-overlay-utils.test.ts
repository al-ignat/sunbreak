import { describe, it, expect } from 'vitest';
import {
  severityColor,
  createRangeFromOffsets,
  findingAtPoint,
  calculateUnderlines,
} from '../../../../src/ui/widget/text-overlay-utils';
import type { UnderlineSegment } from '../../../../src/ui/widget/text-overlay-utils';
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

function makeTracked(overrides: Partial<TrackedFinding> & { id?: string } = {}): TrackedFinding {
  return {
    id: overrides.id ?? 'tf-1',
    finding: makeFinding(),
    status: 'active',
    ...overrides,
  };
}

describe('severityColor', () => {
  it('returns red for api-key', () => {
    expect(severityColor('api-key')).toBe('#EF4444');
  });

  it('returns orange for ssn', () => {
    expect(severityColor('ssn')).toBe('#F97316');
  });

  it('returns orange for credit-card', () => {
    expect(severityColor('credit-card')).toBe('#F97316');
  });

  it('returns orange for cpr', () => {
    expect(severityColor('cpr')).toBe('#F97316');
  });

  it('returns orange for ni-number', () => {
    expect(severityColor('ni-number')).toBe('#F97316');
  });

  it('returns amber for email', () => {
    expect(severityColor('email')).toBe('#F59E0B');
  });

  it('returns amber for phone', () => {
    expect(severityColor('phone')).toBe('#F59E0B');
  });

  it('returns blue for keyword', () => {
    expect(severityColor('keyword')).toBe('#3B82F6');
  });

  it('returns blue for ip-address', () => {
    expect(severityColor('ip-address')).toBe('#3B82F6');
  });
});

describe('createRangeFromOffsets', () => {
  function createDiv(text: string): HTMLDivElement {
    const div = document.createElement('div');
    div.textContent = text;
    document.body.appendChild(div);
    return div;
  }

  it('creates a range for a substring', () => {
    const div = createDiv('Hello World');
    const range = createRangeFromOffsets(div, 6, 11);
    if (!range) throw new Error('Range should not be null');
    expect(range.toString()).toBe('World');
  });

  it('creates a range at the start of text', () => {
    const div = createDiv('Hello World');
    const range = createRangeFromOffsets(div, 0, 5);
    if (!range) throw new Error('Range should not be null');
    expect(range.toString()).toBe('Hello');
  });

  it('creates a range at the end of text', () => {
    const div = createDiv('Hello World');
    const range = createRangeFromOffsets(div, 6, 11);
    if (!range) throw new Error('Range should not be null');
    expect(range.toString()).toBe('World');
  });

  it('handles multiple text nodes', () => {
    const div = document.createElement('div');
    const span1 = document.createElement('span');
    span1.textContent = 'Hello ';
    const span2 = document.createElement('span');
    span2.textContent = 'World';
    div.appendChild(span1);
    div.appendChild(span2);
    document.body.appendChild(div);

    // Range spanning across text nodes
    const range = createRangeFromOffsets(div, 4, 8);
    if (!range) throw new Error('Range should not be null');
    expect(range.toString()).toBe('o Wo');
  });

  it('returns null for out-of-bounds offsets', () => {
    const div = createDiv('Hi');
    const range = createRangeFromOffsets(div, 0, 100);
    expect(range).toBeNull();
  });

  it('returns null for empty element', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const range = createRangeFromOffsets(div, 0, 5);
    expect(range).toBeNull();
  });
});

describe('findingAtPoint', () => {
  it('returns matching finding when point is within segment', () => {
    const tracked = [makeTracked({ id: 'tf-1' })];
    const segments: UnderlineSegment[] = [
      { top: 24, left: 20, width: 100, color: '#F59E0B', findingId: 'tf-1' },
    ];

    const result = findingAtPoint(segments, tracked, 50, 24);
    if (!result) throw new Error('Expected a result');
    expect(result.id).toBe('tf-1');
  });

  it('returns null when point is outside all segments', () => {
    const tracked = [makeTracked({ id: 'tf-1' })];
    const segments: UnderlineSegment[] = [
      { top: 24, left: 20, width: 100, color: '#F59E0B', findingId: 'tf-1' },
    ];

    const result = findingAtPoint(segments, tracked, 200, 200);
    expect(result).toBeNull();
  });

  it('uses hitSlop for vertical tolerance', () => {
    const tracked = [makeTracked({ id: 'tf-1' })];
    const segments: UnderlineSegment[] = [
      { top: 24, left: 20, width: 100, color: '#F59E0B', findingId: 'tf-1' },
    ];

    // 3px above the segment top — within default 4px hitSlop
    const result = findingAtPoint(segments, tracked, 50, 21);
    if (!result) throw new Error('Expected a result');
  });

  it('returns null when beyond hitSlop', () => {
    const tracked = [makeTracked({ id: 'tf-1' })];
    const segments: UnderlineSegment[] = [
      { top: 24, left: 20, width: 100, color: '#F59E0B', findingId: 'tf-1' },
    ];

    // 10px above — beyond default 4px hitSlop
    const result = findingAtPoint(segments, tracked, 50, 14);
    expect(result).toBeNull();
  });

  it('returns first matching segment when overlapping', () => {
    const tracked = [
      makeTracked({ id: 'tf-1' }),
      makeTracked({ id: 'tf-2', finding: makeFinding({ type: 'phone', value: '555-1234', startIndex: 20, endIndex: 28 }) }),
    ];
    const segments: UnderlineSegment[] = [
      { top: 24, left: 20, width: 100, color: '#F59E0B', findingId: 'tf-1' },
      { top: 24, left: 50, width: 80, color: '#F59E0B', findingId: 'tf-2' },
    ];

    const result = findingAtPoint(segments, tracked, 60, 24);
    if (!result) throw new Error('Expected a result');
    expect(result.id).toBe('tf-1');
  });

  it('returns null for empty segments', () => {
    const result = findingAtPoint([], [], 50, 50);
    expect(result).toBeNull();
  });
});

describe('calculateUnderlines', () => {
  it('returns empty array when no active findings', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    document.body.appendChild(div);

    const tracked: TrackedFinding[] = [
      makeTracked({ status: 'fixed' }),
    ];

    const result = calculateUnderlines(div, tracked);
    expect(result).toEqual([]);
  });

  it('returns empty array for empty tracked list', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    document.body.appendChild(div);

    const result = calculateUnderlines(div, []);
    expect(result).toEqual([]);
  });
});

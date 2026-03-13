import { describe, it, expect } from 'vitest';
import {
  createRangeFromOffsets,
  findingAtPoint,
  calculateUnderlines,
  getVisibleEditorRect,
} from '../../../../src/ui/widget/text-overlay-utils';
import type { UnderlineSegment } from '../../../../src/ui/widget/text-overlay-utils';
import type { TrackedFinding } from '../../../../src/content/findings-state';
import type { Finding } from '../../../../src/classifier/types';
import { buildEditorTextModel } from '../../../../src/content/sites/dom-utils';

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

  it('handles paragraph-based editors with \\n boundaries', () => {
    const div = document.createElement('div');
    const p1 = document.createElement('p');
    p1.textContent = 'first line';
    const p2 = document.createElement('p');
    p2.textContent = 'second line';
    div.appendChild(p1);
    div.appendChild(p2);
    document.body.appendChild(div);

    // Extracted text: "first line\nsecond line"
    // "second" starts at offset 11 (10 + 1 for \n)
    const range = createRangeFromOffsets(div, 11, 17);
    if (!range) throw new Error('Range should not be null');
    expect(range.toString()).toBe('second');
  });

  it('handles range spanning across paragraphs', () => {
    const div = document.createElement('div');
    const p1 = document.createElement('p');
    p1.textContent = 'hello';
    const p2 = document.createElement('p');
    p2.textContent = 'world';
    div.appendChild(p1);
    div.appendChild(p2);
    document.body.appendChild(div);

    // Extracted text: "hello\nworld"
    // offset 3 = 'l' in "hello", offset 8 = 'r' in "world"
    const range = createRangeFromOffsets(div, 3, 8);
    if (!range) throw new Error('Range should not be null');
    // Verify start/end positions directly (jsdom toString skips paragraph breaks)
    expect(range.startOffset).toBe(3);
    expect(range.endOffset).toBe(2); // offset 8 - 6 (p2 starts at 6)
    expect(range.startContainer.textContent).toBe('hello');
    expect(range.endContainer.textContent).toBe('world');
  });

  it('preserves leading and trailing spaces in the canonical text model', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p>  john@example.com  </p>';
    document.body.appendChild(div);

    expect(buildEditorTextModel(div).text).toBe('  john@example.com  ');

    const range = createRangeFromOffsets(div, 2, 18);
    if (!range) throw new Error('Range should not be null');
    expect(range.toString()).toBe('john@example.com');
  });

  it('preserves blank edge paragraphs when computing offsets', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p><br></p><p>john@example.com</p><p><br></p>';
    document.body.appendChild(div);

    expect(buildEditorTextModel(div).text).toBe('\njohn@example.com\n');

    const range = createRangeFromOffsets(div, 1, 17);
    if (!range) throw new Error('Range should not be null');
    expect(range.toString()).toBe('john@example.com');
  });
});

describe('findingAtPoint', () => {
  it('returns matching finding when point is within segment', () => {
    const tracked = [makeTracked({ id: 'tf-1' })];
    const segments: UnderlineSegment[] = [
      { top: 24, left: 20, width: 100, severity: 'warning', findingId: 'tf-1' },
    ];

    const result = findingAtPoint(segments, tracked, 50, 24);
    if (!result) throw new Error('Expected a result');
    expect(result.id).toBe('tf-1');
  });

  it('returns null when point is outside all segments', () => {
    const tracked = [makeTracked({ id: 'tf-1' })];
    const segments: UnderlineSegment[] = [
      { top: 24, left: 20, width: 100, severity: 'warning', findingId: 'tf-1' },
    ];

    const result = findingAtPoint(segments, tracked, 200, 200);
    expect(result).toBeNull();
  });

  it('uses hitSlop for vertical tolerance', () => {
    const tracked = [makeTracked({ id: 'tf-1' })];
    const segments: UnderlineSegment[] = [
      { top: 24, left: 20, width: 100, severity: 'warning', findingId: 'tf-1' },
    ];

    // 3px above the segment top — within default 4px hitSlop
    const result = findingAtPoint(segments, tracked, 50, 21);
    if (!result) throw new Error('Expected a result');
  });

  it('returns null when beyond hitSlop', () => {
    const tracked = [makeTracked({ id: 'tf-1' })];
    const segments: UnderlineSegment[] = [
      { top: 24, left: 20, width: 100, severity: 'warning', findingId: 'tf-1' },
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
      { top: 24, left: 20, width: 100, severity: 'warning', findingId: 'tf-1' },
      { top: 24, left: 50, width: 80, severity: 'warning', findingId: 'tf-2' },
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

    const result = calculateUnderlines(div, tracked, {
      top: 0,
      left: 0,
      right: 400,
      bottom: 200,
      width: 400,
      height: 200,
    });
    expect(result).toEqual([]);
  });

  it('returns empty array for empty tracked list', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    document.body.appendChild(div);

    const result = calculateUnderlines(div, [], {
      top: 0,
      left: 0,
      right: 400,
      bottom: 200,
      width: 400,
      height: 200,
    });
    expect(result).toEqual([]);
  });

  it('clips underline segments to the visible editor viewport', () => {
    const parent = document.createElement('div');
    parent.style.overflow = 'hidden';
    const div = document.createElement('div');
    div.textContent = 'john@example.com';
    parent.appendChild(div);
    document.body.appendChild(parent);

    parent.getBoundingClientRect = () => ({
      top: 100,
      left: 50,
      right: 250,
      bottom: 180,
      width: 200,
      height: 80,
      x: 50,
      y: 100,
      toJSON: () => ({}),
    }) as DOMRect;
    div.getBoundingClientRect = () => ({
      top: 60,
      left: 20,
      right: 420,
      bottom: 260,
      width: 400,
      height: 200,
      x: 20,
      y: 60,
      toJSON: () => ({}),
    }) as DOMRect;
    Range.prototype.getClientRects = () => ([
      {
        top: 120,
        left: 70,
        right: 230,
        bottom: 134,
        width: 160,
        height: 14,
        x: 70,
        y: 120,
        toJSON: () => ({}),
      },
      {
        top: 190,
        left: 70,
        right: 230,
        bottom: 204,
        width: 160,
        height: 14,
        x: 70,
        y: 190,
        toJSON: () => ({}),
      },
    ]) as unknown as DOMRectList;

    const visible = getVisibleEditorRect(div);
    if (!visible) throw new Error('Visible rect should not be null');

    const result = calculateUnderlines(div, [makeTracked()], visible);
    expect(result).toEqual([
      {
        top: 134,
        left: 70,
        width: 160,
        severity: 'warning',
        findingId: 'tf-1',
      },
    ]);
  });
});

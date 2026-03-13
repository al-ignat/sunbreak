import type { TrackedFinding } from '../../content/findings-state';
import { findingSeverity } from './severity';
import type { SeverityLevel } from './severity';
import { buildEditorTextModel } from '../../content/sites/dom-utils';

export interface ViewportRect {
  readonly top: number;
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

const CLIPPING_OVERFLOWS = new Set(['auto', 'scroll', 'hidden', 'clip']);

function toViewportRect(rect: Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom'>): ViewportRect {
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: Math.max(0, rect.right - rect.left),
    height: Math.max(0, rect.bottom - rect.top),
  };
}

function intersectRects(a: ViewportRect, b: Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom'>): ViewportRect | null {
  const top = Math.max(a.top, b.top);
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);

  if (right <= left || bottom <= top) {
    return null;
  }

  return {
    top,
    left,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function clipsDescendants(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  return [style.overflow, style.overflowX, style.overflowY].some((value) =>
    CLIPPING_OVERFLOWS.has(value),
  );
}

/**
 * Compute the visible editor viewport by intersecting the editor box with the
 * viewport and any clipping ancestors.
 */
export function getVisibleEditorRect(editorEl: HTMLElement): ViewportRect | null {
  let visible: ViewportRect | null = toViewportRect(
    editorEl.getBoundingClientRect(),
  );

  visible = intersectRects(visible, {
    top: 0,
    left: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
  });
  if (!visible) return null;

  let parent = editorEl.parentElement;
  while (parent && visible) {
    if (clipsDescendants(parent)) {
      visible = intersectRects(visible, parent.getBoundingClientRect());
    }
    parent = parent.parentElement;
  }

  return visible;
}

/**
 * Map string offsets to a DOM Range.
 *
 * Handles both paragraph-based editors (where getText joins `<p>` with `\n`)
 * and plain text editors. Returns a Range spanning [startOffset, endOffset)
 * in the extracted text, or null if offsets are out of bounds.
 */
export function createRangeFromOffsets(
  root: HTMLElement,
  startOffset: number,
  endOffset: number,
): Range | null {
  const { segments } = buildEditorTextModel(root);
  let startNode: Text | null = null;
  let startNodeOffset = 0;
  let endNode: Text | null = null;
  let endNodeOffset = 0;

  for (const seg of segments) {
    if (!startNode && seg.endInText > startOffset) {
      startNode = seg.node;
      startNodeOffset = startOffset - seg.startInText;
    }
    if (!endNode && seg.endInText >= endOffset) {
      endNode = seg.node;
      endNodeOffset = endOffset - seg.startInText;
      break;
    }
  }

  if (!startNode || !endNode) return null;

  const range = new Range();
  range.setStart(startNode, startNodeOffset);
  range.setEnd(endNode, endNodeOffset);
  return range;
}

/** A positioned underline rect with its associated finding */
export interface UnderlineSegment {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly severity: SeverityLevel;
  readonly findingId: string;
}

/**
 * Calculate underline segments for active findings.
 *
 * Uses the read-then-write batch pattern: first creates all Ranges
 * and reads getClientRects() (one forced reflow), then builds the
 * segment array (no further reflows).
 */
export function calculateUnderlines(
  editorEl: HTMLElement,
  tracked: ReadonlyArray<TrackedFinding>,
  visibleRect: ViewportRect,
): UnderlineSegment[] {
  const active = tracked.filter((t) => t.status === 'active');
  if (active.length === 0) return [];

  // READ phase — one forced reflow at most
  const allRects: Array<{ tf: TrackedFinding; rects: DOMRect[] }> = [];
  for (const tf of active) {
    const range = createRangeFromOffsets(
      editorEl,
      tf.finding.startIndex,
      tf.finding.endIndex,
    );
    allRects.push({
      tf,
      rects: range ? Array.from(range.getClientRects()) : [],
    });
  }

  // WRITE phase — build segments, no reflows
  const segments: UnderlineSegment[] = [];
  for (const { tf, rects } of allRects) {
    const sev = findingSeverity(tf.finding);
    for (const rect of rects) {
      if (rect.width < 1) continue; // skip zero-width rects
      if (rect.bottom <= visibleRect.top || rect.top >= visibleRect.bottom) {
        continue;
      }

      const left = Math.max(rect.left, visibleRect.left);
      const right = Math.min(rect.right, visibleRect.right);
      const width = right - left;
      if (width < 1) continue;

      segments.push({
        top: Math.min(Math.max(rect.bottom, visibleRect.top), visibleRect.bottom),
        left,
        width,
        severity: sev,
        findingId: tf.id,
      });
    }
  }

  return segments;
}

/**
 * Find which tracked finding (if any) is at the given viewport point.
 *
 * Used by Phase 6 hover cards to map mouse position to a finding.
 */
export function findingAtPoint(
  segments: ReadonlyArray<UnderlineSegment>,
  tracked: ReadonlyArray<TrackedFinding>,
  x: number,
  y: number,
  hitSlop: number = 4,
): TrackedFinding | null {
  for (const seg of segments) {
    if (
      x >= seg.left &&
      x <= seg.left + seg.width &&
      y >= seg.top - hitSlop &&
      y <= seg.top + hitSlop
    ) {
      return tracked.find((t) => t.id === seg.findingId) ?? null;
    }
  }
  return null;
}

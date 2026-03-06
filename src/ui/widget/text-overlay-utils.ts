import type { FindingType } from '../../classifier/types';
import type { TrackedFinding } from '../../content/findings-state';

/** Underline color categories */
const SEVERITY_COLORS: Record<string, string> = {
  'api-key': '#EF4444',      // Red — credentials & secrets
  ssn: '#F97316',            // Orange — identity data
  cpr: '#F97316',
  'ni-number': '#F97316',
  'credit-card': '#F97316',
  email: '#F59E0B',          // Amber — contact info
  phone: '#F59E0B',
  keyword: '#3B82F6',        // Blue — custom patterns
  'ip-address': '#3B82F6',
};

/** Map a finding type to its underline color */
export function severityColor(type: FindingType): string {
  return SEVERITY_COLORS[type] ?? '#F59E0B';
}

/**
 * Map string offsets to a DOM Range using TreeWalker.
 *
 * Walks all text nodes under `root`, accumulating character offsets.
 * Returns a Range spanning [startOffset, endOffset) in the concatenated
 * text content, or null if offsets are out of bounds.
 */
export function createRangeFromOffsets(
  root: HTMLElement,
  startOffset: number,
  endOffset: number,
): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let charIndex = 0;
  let startNode: Text | null = null;
  let startNodeOffset = 0;
  let endNode: Text | null = null;
  let endNodeOffset = 0;

  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    const nodeLen = textNode.textContent?.length ?? 0;

    if (!startNode && charIndex + nodeLen > startOffset) {
      startNode = textNode;
      startNodeOffset = startOffset - charIndex;
    }
    if (!endNode && charIndex + nodeLen >= endOffset) {
      endNode = textNode;
      endNodeOffset = endOffset - charIndex;
      break;
    }
    charIndex += nodeLen;
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
  readonly color: string;
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
    const color = severityColor(tf.finding.type);
    for (const rect of rects) {
      if (rect.width < 1) continue; // skip zero-width rects
      segments.push({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
        color,
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

import type { TrackedFinding } from '../../content/findings-state';
import { severityColor } from './severity';
export { severityColor };

/**
 * Build a list of text segments with their cumulative offsets.
 *
 * For paragraph-based editors (ProseMirror, etc.) where getText() joins
 * `<p>` elements with `\n`, we walk paragraphs and insert virtual `\n`
 * boundaries to keep offsets aligned with the classifier output.
 *
 * For plain editors without `<p>` elements, walks all text nodes directly.
 */
function buildTextSegments(
  root: HTMLElement,
): Array<{ node: Text; startInText: number }> {
  const segments: Array<{ node: Text; startInText: number }> = [];
  const paragraphs = root.querySelectorAll('p');

  if (paragraphs.length > 0) {
    let charIndex = 0;
    for (let pi = 0; pi < paragraphs.length; pi++) {
      if (pi > 0) charIndex += 1; // virtual \n between paragraphs
      const walker = document.createTreeWalker(
        paragraphs[pi] as HTMLElement,
        NodeFilter.SHOW_TEXT,
      );
      while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        segments.push({ node: textNode, startInText: charIndex });
        charIndex += textNode.textContent?.length ?? 0;
      }
    }
  } else {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let charIndex = 0;
    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      segments.push({ node: textNode, startInText: charIndex });
      charIndex += textNode.textContent?.length ?? 0;
    }
  }

  return segments;
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
  const segments = buildTextSegments(root);
  let startNode: Text | null = null;
  let startNodeOffset = 0;
  let endNode: Text | null = null;
  let endNodeOffset = 0;

  for (const seg of segments) {
    const nodeLen = seg.node.textContent?.length ?? 0;
    const nodeEnd = seg.startInText + nodeLen;

    if (!startNode && nodeEnd > startOffset) {
      startNode = seg.node;
      startNodeOffset = startOffset - seg.startInText;
    }
    if (!endNode && nodeEnd >= endOffset) {
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

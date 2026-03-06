import type { JSX } from 'preact';
import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import type { TrackedFinding, FindingsState } from '../../content/findings-state';
import {
  calculateUnderlines,
  findingAtPoint as findingAtPointUtil,
} from './text-overlay-utils';
import type { UnderlineSegment } from './text-overlay-utils';

/** Handle exposed for Phase 6 hover card coupling */
export interface TextOverlayHandle {
  findingAtPoint(x: number, y: number): TrackedFinding | null;
}

export interface TextOverlayProps {
  findingsState: FindingsState;
  editorEl: HTMLElement | null;
  onHandleReady?: (handle: TextOverlayHandle | null) => void;
}

/** Find the nearest scroll ancestor of an element */
function findScrollParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    const overflow = getComputedStyle(parent).overflowY;
    if (overflow === 'auto' || overflow === 'scroll') return parent;
    parent = parent.parentElement;
  }
  return null;
}

export default function TextOverlay({
  findingsState,
  editorEl,
  onHandleReady,
}: TextOverlayProps): JSX.Element | null {
  const [segments, setSegments] = useState<UnderlineSegment[]>([]);
  const [editorRect, setEditorRect] = useState<DOMRect | null>(null);
  const [scrollDelta, setScrollDelta] = useState(0);
  const trackedRef = useRef<ReadonlyArray<TrackedFinding>>([]);
  const segmentsRef = useRef<UnderlineSegment[]>([]);
  const baseScrollRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Full recalc: create ranges, get rects, update segments
  const recalculate = useCallback((): void => {
    if (!editorEl || !editorEl.isConnected) {
      setSegments([]);
      setEditorRect(null);
      return;
    }

    const tracked = trackedRef.current;
    const newSegments = calculateUnderlines(editorEl, tracked);
    const rect = editorEl.getBoundingClientRect();

    // Reset scroll baseline
    const scrollParent = findScrollParent(editorEl);
    baseScrollRef.current = scrollParent?.scrollTop ?? 0;
    setScrollDelta(0);

    segmentsRef.current = newSegments;
    setSegments(newSegments);
    setEditorRect(rect);
  }, [editorEl]);

  // Subscribe to findings state changes
  useEffect(() => {
    const unsub = findingsState.subscribe((snap) => {
      trackedRef.current = snap.tracked;
      recalculate();
    });
    // Initial sync
    trackedRef.current = findingsState.getSnapshot().tracked;
    recalculate();
    return unsub;
  }, [findingsState, recalculate]);

  // Scroll handler — compositor-only transform
  useEffect(() => {
    if (!editorEl) return;
    const scrollParent = findScrollParent(editorEl);
    if (!scrollParent) return;

    function onScroll(): void {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const currentScroll = scrollParent.scrollTop;
        setScrollDelta(currentScroll - baseScrollRef.current);
      });
    }

    scrollParent.addEventListener('scroll', onScroll, { passive: true });
    return (): void => {
      scrollParent.removeEventListener('scroll', onScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [editorEl]);

  // Resize handler — full recalc
  useEffect(() => {
    if (!editorEl) return;

    let resizeRaf: number | null = null;
    function onResize(): void {
      if (resizeRaf !== null) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        recalculate();
      });
    }

    window.addEventListener('resize', onResize);
    return (): void => {
      window.removeEventListener('resize', onResize);
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
    };
  }, [editorEl, recalculate]);

  // Expose findingAtPoint handle for Phase 6
  useEffect(() => {
    if (!onHandleReady) return;
    const handle: TextOverlayHandle = {
      findingAtPoint(x: number, y: number): TrackedFinding | null {
        return findingAtPointUtil(
          segmentsRef.current,
          trackedRef.current,
          x,
          y,
        );
      },
    };
    onHandleReady(handle);
    return (): void => {
      onHandleReady(null);
    };
  }, [onHandleReady]);

  if (!editorEl || !editorRect || segments.length === 0) return null;

  return (
    <div
      class="sb-text-overlay"
      style={{
        position: 'fixed',
        top: `${editorRect.top}px`,
        left: `${editorRect.left}px`,
        width: `${editorRect.width}px`,
        height: `${editorRect.height}px`,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 2147483645,
        transform: `translateY(${-scrollDelta}px)`,
        willChange: 'transform',
      }}
    >
      {segments.map((seg, i) => (
        <div
          key={`${seg.findingId}-${i}`}
          class="sb-underline"
          style={{
            position: 'absolute',
            top: `${seg.top - editorRect.top}px`,
            left: `${seg.left - editorRect.left}px`,
            width: `${seg.width}px`,
            height: '0px',
            borderBottom: `2px dotted ${seg.color}`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
}

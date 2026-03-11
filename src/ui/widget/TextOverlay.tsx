import type { JSX } from 'preact';
import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import type { TrackedFinding, FindingsState } from '../../content/findings-state';
import {
  calculateUnderlines,
  findingAtPoint as findingAtPointUtil,
} from './text-overlay-utils';
import type { UnderlineSegment } from './text-overlay-utils';
import HoverCard from './HoverCard';

/** Handle exposed for Phase 6 hover card coupling */
export interface TextOverlayHandle {
  findingAtPoint(x: number, y: number): TrackedFinding | null;
}

export interface TextOverlayProps {
  findingsState: FindingsState;
  editorEl: HTMLElement | null;
  onHandleReady?: (handle: TextOverlayHandle | null) => void;
  onFix?: (id: string) => void;
  onIgnore?: (id: string) => void;
  onIgnoreAllOfType?: (type: string) => void;
  onDisableType?: (type: string) => void;
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

/** Delay before hiding hover card after mouse leaves */
const HOVER_LEAVE_DELAY = 200;

interface HoverState {
  finding: TrackedFinding;
  anchorX: number;
  anchorY: number;
}

export default function TextOverlay({
  findingsState,
  editorEl,
  onHandleReady,
  onFix,
  onIgnore,
  onIgnoreAllOfType,
  onDisableType,
}: TextOverlayProps): JSX.Element | null {
  const [segments, setSegments] = useState<UnderlineSegment[]>([]);
  const [editorRect, setEditorRect] = useState<DOMRect | null>(null);
  const [scrollDelta, setScrollDelta] = useState(0);
  const [hover, setHover] = useState<HoverState | null>(null);
  const trackedRef = useRef<ReadonlyArray<TrackedFinding>>([]);
  const segmentsRef = useRef<UnderlineSegment[]>([]);
  const baseScrollRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverFindingIdRef = useRef<string | null>(null);

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

  // Clear hover when the hovered finding is no longer active
  useEffect(() => {
    if (!hover) return;
    const tf = trackedRef.current.find((t) => t.id === hover.finding.id);
    if (!tf || tf.status !== 'active') {
      setHover(null);
      hoverFindingIdRef.current = null;
    }
  }, [hover, segments]); // segments changes when findings update

  // Hover detection — mousemove/mouseleave on editor element
  useEffect(() => {
    if (!editorEl) return;

    function cancelHoverTimer(): void {
      if (hoverTimerRef.current !== null) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    }

    function onMouseMove(e: MouseEvent): void {
      const found = findingAtPointUtil(
        segmentsRef.current,
        trackedRef.current,
        e.clientX,
        e.clientY,
      );

      if (found) {
        cancelHoverTimer();
        if (hoverFindingIdRef.current !== found.id) {
          hoverFindingIdRef.current = found.id;
          // Find the segment for anchor positioning
          const seg = segmentsRef.current.find((s) => s.findingId === found.id);
          const anchorX = seg ? seg.left + seg.width / 2 : e.clientX;
          const anchorY = seg ? seg.top : e.clientY;
          setHover({ finding: found, anchorX, anchorY });
        }
      } else {
        // Mouse moved off underline — start leave timer
        if (hoverFindingIdRef.current !== null) {
          cancelHoverTimer();
          hoverTimerRef.current = setTimeout(() => {
            setHover(null);
            hoverFindingIdRef.current = null;
          }, HOVER_LEAVE_DELAY);
        }
      }
    }

    function onMouseLeave(): void {
      cancelHoverTimer();
      hoverTimerRef.current = setTimeout(() => {
        setHover(null);
        hoverFindingIdRef.current = null;
      }, HOVER_LEAVE_DELAY);
    }

    editorEl.addEventListener('mousemove', onMouseMove);
    editorEl.addEventListener('mouseleave', onMouseLeave);
    return (): void => {
      editorEl.removeEventListener('mousemove', onMouseMove);
      editorEl.removeEventListener('mouseleave', onMouseLeave);
      cancelHoverTimer();
    };
  }, [editorEl]);

  // Hover card mouse enter/leave — cancels or starts the leave timer
  const handleHoverCardEnter = useCallback((): void => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const handleHoverCardLeave = useCallback((): void => {
    hoverTimerRef.current = setTimeout(() => {
      setHover(null);
      hoverFindingIdRef.current = null;
    }, HOVER_LEAVE_DELAY);
  }, []);

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

  if (!editorEl || !editorRect || segments.length === 0) {
    // Still render hover card if it's visible (finding may have just been cleared)
    if (hover && onFix && onIgnore && onIgnoreAllOfType && onDisableType) {
      return (
        <HoverCard
          finding={hover.finding}
          anchorX={hover.anchorX}
          anchorY={hover.anchorY}
          onFix={onFix}
          onIgnore={onIgnore}
          onIgnoreAllOfType={onIgnoreAllOfType}
          onDisableType={onDisableType}
          onMouseEnter={handleHoverCardEnter}
          onMouseLeave={handleHoverCardLeave}
        />
      );
    }
    return null;
  }

  return (
    <>
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
            data-severity={seg.severity}
            style={{
              position: 'absolute',
              top: `${seg.top - editorRect.top}px`,
              left: `${seg.left - editorRect.left}px`,
              width: `${seg.width}px`,
              height: '0px',
              borderBottom: '2px dotted currentColor',
              pointerEvents: 'none',
            }}
          />
        ))}
      </div>
      {hover && onFix && onIgnore && onIgnoreAllOfType && onDisableType && (
        <HoverCard
          finding={hover.finding}
          anchorX={hover.anchorX}
          anchorY={hover.anchorY}
          onFix={onFix}
          onIgnore={onIgnore}
          onIgnoreAllOfType={onIgnoreAllOfType}
          onDisableType={onDisableType}
          onMouseEnter={handleHoverCardEnter}
          onMouseLeave={handleHoverCardLeave}
        />
      )}
    </>
  );
}

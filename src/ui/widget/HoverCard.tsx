import type { JSX } from 'preact';
import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import type { TrackedFinding } from '../../content/findings-state';
import { ArrowDownIcon, MoreHorizontalIcon } from './icons';
import { findingSeverity } from './severity';

export interface HoverCardProps {
  finding: TrackedFinding;
  /** Viewport X where the card should anchor */
  anchorX: number;
  /** Viewport Y of the underline */
  anchorY: number;
  onFix?: (id: string) => void;
  onIgnore: (id: string) => void;
  onIgnoreAllOfType: (type: string) => void;
  onDisableType: (type: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/** Gap between underline and card edge */
const CARD_GAP = 6;

export default function HoverCard({
  finding,
  anchorX,
  anchorY,
  onFix,
  onIgnore,
  onIgnoreAllOfType,
  onDisableType,
  onMouseEnter,
  onMouseLeave,
}: HoverCardProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [finding.id]);

  useEffect(() => {
    function updateTop(): void {
      const el = cardRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const minTop = 8;
      const maxTop = Math.max(minTop, window.innerHeight - rect.height - 8);
      const aboveTop = anchorY - rect.height - CARD_GAP;
      const belowTop = anchorY + CARD_GAP;
      const preferredTop = aboveTop >= minTop ? aboveTop : belowTop;

      setTop(Math.min(Math.max(preferredTop, minTop), maxTop));
    }

    updateTop();
    window.addEventListener('resize', updateTop);

    return (): void => {
      window.removeEventListener('resize', updateTop);
    };
  }, [anchorY, finding.id, menuOpen]);

  const handleFix = useCallback((): void => {
    onFix?.(finding.id);
  }, [onFix, finding.id]);

  const handleIgnore = useCallback((): void => {
    onIgnore(finding.id);
  }, [onIgnore, finding.id]);

  const handleIgnoreAll = useCallback((): void => {
    setMenuOpen(false);
    onIgnoreAllOfType(finding.finding.type);
  }, [onIgnoreAllOfType, finding.finding.type]);

  const handleDisable = useCallback((): void => {
    setMenuOpen(false);
    onDisableType(finding.finding.type);
  }, [onDisableType, finding.finding.type]);

  const toggleMenu = useCallback((): void => {
    setMenuOpen((v) => !v);
  }, []);

  // Close menu on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (menuOpen) {
          e.stopPropagation();
          setMenuOpen(false);
        }
      }
    },
    [menuOpen],
  );

  // Clamp horizontal position to viewport
  const cardWidth = 280;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  let left = anchorX - cardWidth / 2;
  if (left < 8) left = 8;
  if (left + cardWidth > viewportWidth - 8) left = viewportWidth - 8 - cardWidth;

  const style: Record<string, string> = {
    left: `${left}px`,
    top: `${top ?? Math.max(8, anchorY + CARD_GAP)}px`,
    width: `${cardWidth}px`,
  };

  return (
    <div
      ref={cardRef}
      class="sb-hover-card"
      role="tooltip"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={handleKeyDown}
    >
      <div class="sb-hover-card__header">
        <span
          class="sb-hover-card__dot"
          data-severity={findingSeverity(finding.finding.type)}
          aria-hidden="true"
        />
        {finding.finding.label}
      </div>

      <div class="sb-hover-card__body">
        <div class="sb-hover-card__original">{finding.finding.value}</div>
        <div class="sb-hover-card__arrow" aria-hidden="true"><ArrowDownIcon size={12} /></div>
        <div class="sb-hover-card__masked">{finding.finding.placeholder}</div>
        {finding.finding.context?.explanation?.summary && (
          <div class="sb-hover-card__explanation">
            {finding.finding.context.explanation.summary}
          </div>
        )}
      </div>

      <div class="sb-hover-card__actions">
        {onFix && (
          <button
            class="sb-hover-card__btn sb-hover-card__btn--fix"
            type="button"
            aria-label={`Fix ${finding.finding.label}`}
            onClick={handleFix}
          >
            Fix
          </button>
        )}
        <button
          class="sb-hover-card__btn sb-hover-card__btn--ignore"
          type="button"
          aria-label={`Ignore ${finding.finding.label}`}
          onClick={handleIgnore}
        >
          Ignore
        </button>
        <button
          class="sb-hover-card__overflow"
          type="button"
          aria-label="More actions"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={toggleMenu}
        >
          <MoreHorizontalIcon size={14} />
        </button>
      </div>

      {menuOpen && (
        <div class="sb-hover-card__menu" role="menu">
          <button
            class="sb-hover-card__menu-item"
            role="menuitem"
            type="button"
            onClick={handleIgnoreAll}
          >
            Ignore all {finding.finding.label.toLowerCase()} in this prompt
          </button>
          <button
            class="sb-hover-card__menu-item"
            role="menuitem"
            type="button"
            onClick={handleDisable}
          >
            Turn off {finding.finding.label.toLowerCase()} detection
          </button>
        </div>
      )}
    </div>
  );
}

import type { JSX } from 'preact';
import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import type { TrackedFinding } from '../../content/findings-state';
import type { FindingType } from '../../classifier/types';

type Severity = 'red' | 'orange' | 'amber' | 'blue';

const SEVERITY_MAP: Record<FindingType, Severity> = {
  'api-key': 'red',
  ssn: 'orange',
  cpr: 'orange',
  'ni-number': 'orange',
  'credit-card': 'orange',
  email: 'amber',
  phone: 'amber',
  keyword: 'blue',
  'ip-address': 'blue',
};

function getSeverity(type: FindingType): Severity {
  return SEVERITY_MAP[type] ?? 'blue';
}

export interface HoverCardProps {
  finding: TrackedFinding;
  /** Viewport X where the card should anchor */
  anchorX: number;
  /** Viewport Y of the underline */
  anchorY: number;
  onFix: (id: string) => void;
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
  const [flipped, setFlipped] = useState(false);

  const severity = getSeverity(finding.finding.type);

  // After first render, measure card and decide above/below
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // If card would overflow above viewport, flip below
    if (anchorY - rect.height - CARD_GAP < 0) {
      setFlipped(true);
    }
  }, [anchorY]);

  const handleFix = useCallback((): void => {
    onFix(finding.id);
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
    width: `${cardWidth}px`,
  };

  if (flipped) {
    // Position below the underline
    style.top = `${anchorY + CARD_GAP}px`;
  } else {
    // Position above the underline
    style.bottom = `${window.innerHeight - anchorY + CARD_GAP}px`;
  }

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
          class={`sb-hover-card__dot sb-hover-card__dot--${severity}`}
          aria-hidden="true"
        />
        {finding.finding.label}
      </div>

      <div class="sb-hover-card__body">
        <div class="sb-hover-card__original">{finding.finding.value}</div>
        <div class="sb-hover-card__arrow" aria-hidden="true">&darr;</div>
        <div class="sb-hover-card__masked">{finding.finding.placeholder}</div>
      </div>

      <div class="sb-hover-card__actions">
        <button
          class="sb-hover-card__btn sb-hover-card__btn--fix"
          type="button"
          aria-label={`Fix ${finding.finding.label}`}
          onClick={handleFix}
        >
          Fix
        </button>
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
          &hellip;
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

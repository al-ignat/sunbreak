import type { JSX } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import type { FindingsSnapshot, FindingsState } from '../../content/findings-state';

export interface WidgetProps {
  findingsState: FindingsState;
  onClick: () => void;
  panelOpen: boolean;
}

type WidgetStatus = 'clean' | 'findings';

function deriveStatus(snapshot: FindingsSnapshot): WidgetStatus {
  if (snapshot.activeCount > 0) return 'findings';
  return 'clean';
}

function buildAriaLabel(status: WidgetStatus, count: number): string {
  if (status === 'findings') {
    const plural = count === 1 ? '' : 's';
    return `Sunbreak: ${count} finding${plural} detected`;
  }
  return 'Sunbreak: no issues detected';
}

export default function Widget({ findingsState, onClick, panelOpen }: WidgetProps): JSX.Element {
  const [snapshot, setSnapshot] = useState<FindingsSnapshot>(findingsState.getSnapshot());

  useEffect(() => {
    // Sync initial state
    setSnapshot(findingsState.getSnapshot());
    return findingsState.subscribe((snap) => {
      setSnapshot(snap);
    });
  }, [findingsState]);

  const status = deriveStatus(snapshot);

  const handleClick = useCallback((): void => {
    onClick();
  }, [onClick]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  return (
    <div
      class={`sb-widget sb-widget--${status}`}
      role="button"
      tabIndex={0}
      aria-label={buildAriaLabel(status, snapshot.activeCount)}
      aria-expanded={panelOpen}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span class="sb-widget__icon" aria-hidden="true">
        <SunIcon />
      </span>
      <span class="sb-widget__label">Sunbreak</span>
      <span class="sb-widget__status" role="status" aria-live="polite">
        {status === 'findings' && (
          <span class="sb-widget__badge">{snapshot.activeCount}</span>
        )}
        {status === 'clean' && (
          <span class="sb-widget__check" aria-hidden="true">
            <CheckIcon />
          </span>
        )}
      </span>
    </div>
  );
}

function SunIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  );
}

function CheckIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3.5 7l2.5 2.5L10.5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

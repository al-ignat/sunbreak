import type { JSX } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import type { FindingsSnapshot, FindingsState } from '../../content/findings-state';
import { maxSeverity } from './severity';
import type { SeverityLevel } from './severity';
import FindingsPanel from './FindingsPanel';
import SendToast from './SendToast';
import RestoreToast from './RestoreToast';
import TextOverlay from './TextOverlay';
import type { TextOverlayHandle } from './TextOverlay';

/** Toast display state passed from the widget controller */
export interface ToastDisplayState {
  activeCount: number;
  paused: boolean;
  visible: boolean;
}

/** Restore toast display state for clipboard token restoration */
export interface RestoreToastDisplayState {
  count: number;
  visible: boolean;
  generation: number;
}

/** Masked entries for display in the findings panel */
export interface MaskedEntry {
  readonly token: string;
  readonly originalValue: string;
}

export interface WidgetProps {
  findingsState: FindingsState;
  editorEl: HTMLElement | null;
  supportsOverlay: boolean;
  onClick: () => void;
  panelOpen: boolean;
  onFix?: (id: string) => void;
  onIgnore?: (id: string) => void;
  onFixAll?: () => void;
  onClose?: () => void;
  toastState?: ToastDisplayState | null;
  onToastReview?: () => void;
  onToastSendAnyway?: () => void;
  onToastTimeout?: () => void;
  onOverlayHandleReady?: (handle: TextOverlayHandle | null) => void;
  onIgnoreAllOfType?: (type: string) => void;
  onDisableType?: (type: string) => void;
  restoreToastState?: RestoreToastDisplayState | null;
  onRestoreAccept?: () => void;
  onRestoreDecline?: () => void;
  maskedCount?: number;
  maskedEntries?: ReadonlyArray<MaskedEntry>;
  maskedExpiresAt?: number | null;
  onClearMasked?: () => void;
}

function buildAriaLabel(
  severity: SeverityLevel,
  activeCount: number,
  maskedCount: number,
): string {
  const parts: string[] = [];
  if (activeCount > 0) {
    const plural = activeCount === 1 ? '' : 's';
    parts.push(`${activeCount} ${severity} finding${plural}`);
  }
  if (maskedCount > 0) {
    parts.push(`${maskedCount} masked locally`);
  }
  if (parts.length === 0) return 'Sunbreak: no issues detected';
  return `Sunbreak: ${parts.join(', ')}`;
}

export default function Widget({
  findingsState,
  editorEl,
  supportsOverlay,
  onClick,
  panelOpen,
  onFix,
  onIgnore,
  onFixAll,
  onClose,
  toastState,
  onToastReview,
  onToastSendAnyway,
  onToastTimeout,
  onOverlayHandleReady,
  onIgnoreAllOfType,
  onDisableType,
  restoreToastState,
  onRestoreAccept,
  onRestoreDecline,
  maskedCount = 0,
  maskedEntries,
  maskedExpiresAt,
  onClearMasked,
}: WidgetProps): JSX.Element {
  const [snapshot, setSnapshot] = useState<FindingsSnapshot>(findingsState.getSnapshot());

  useEffect(() => {
    setSnapshot(findingsState.getSnapshot());
    return findingsState.subscribe((snap) => {
      setSnapshot(snap);
    });
  }, [findingsState]);

  const severity = maxSeverity(snapshot.tracked);

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

  const showToast = toastState?.visible === true && onToastReview && onToastSendAnyway && onToastTimeout;
  const showRestoreToast = restoreToastState?.visible === true && onRestoreAccept && onRestoreDecline;

  const hasSeverityBadge = snapshot.activeCount > 0;
  const hasMaskedBadge = maskedCount > 0;
  const hasBothBadges = hasSeverityBadge && hasMaskedBadge;

  return (
    <div class="sb-widget-container">
      <div
        class="sb-widget"
        data-severity={severity}
        role="button"
        tabIndex={0}
        aria-label={buildAriaLabel(severity, snapshot.activeCount, maskedCount)}
        aria-expanded={panelOpen}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <span class="sb-widget__icon" aria-hidden="true">
          <SunIcon />
        </span>
        <span class="sb-widget__badges" role="status" aria-live="polite">
          {hasSeverityBadge && (
            <span class="sb-widget__severity-badge">{snapshot.activeCount}</span>
          )}
          {hasBothBadges && (
            <span class="sb-widget__divider" aria-hidden="true" />
          )}
          {hasMaskedBadge && (
            <span
              class="sb-widget__masked-badge"
            >
              {maskedCount}
            </span>
          )}
        </span>
      </div>
      {panelOpen && onIgnore && onClose && (
        <FindingsPanel
          tracked={snapshot.tracked}
          activeCount={snapshot.activeCount}
          onFix={onFix}
          onIgnore={onIgnore}
          onFixAll={onFixAll}
          onClose={onClose}
          maskedEntries={maskedEntries}
          maskedExpiresAt={maskedExpiresAt}
          onClearMasked={onClearMasked}
        />
      )}
      {showToast && (
        <SendToast
          activeCount={toastState.activeCount}
          paused={toastState.paused}
          onReview={onToastReview}
          onSendAnyway={onToastSendAnyway}
          onTimeout={onToastTimeout}
        />
      )}
      {showRestoreToast && (
        <RestoreToast
          key={restoreToastState.generation}
          count={restoreToastState.count}
          onAccept={onRestoreAccept}
          onDecline={onRestoreDecline}
        />
      )}
      {supportsOverlay && (
        <TextOverlay
          findingsState={findingsState}
          editorEl={editorEl}
          onHandleReady={onOverlayHandleReady}
          onFix={onFix}
          onIgnore={onIgnore}
          onIgnoreAllOfType={onIgnoreAllOfType}
          onDisableType={onDisableType}
        />
      )}
    </div>
  );
}

function SunIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="4" stroke="currentColor" stroke-width="1.5" />
      <path d="M9 1v2.5M9 14.5V17M1 9h2.5M14.5 9H17M3.34 3.34l1.77 1.77M12.89 12.89l1.77 1.77M3.34 14.66l1.77-1.77M12.89 5.11l1.77-1.77" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  );
}

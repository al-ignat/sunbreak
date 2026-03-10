import type { JSX } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import type { FindingsSnapshot, FindingsState } from '../../content/findings-state';
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

type WidgetStatus = 'clean' | 'findings';

function deriveStatus(snapshot: FindingsSnapshot): WidgetStatus {
  if (snapshot.activeCount > 0) return 'findings';
  return 'clean';
}

function buildAriaLabel(status: WidgetStatus, count: number, maskedCount: number): string {
  const parts: string[] = [];
  if (status === 'findings') {
    const plural = count === 1 ? '' : 's';
    parts.push(`${count} finding${plural} detected`);
  }
  if (maskedCount > 0) {
    parts.push(`${maskedCount} masked`);
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

  const showToast = toastState?.visible === true && onToastReview && onToastSendAnyway && onToastTimeout;
  const showRestoreToast = restoreToastState?.visible === true && onRestoreAccept && onRestoreDecline;

  return (
    <div class="sb-widget-container">
      <div
        class={`sb-widget sb-widget--${status}`}
        role="button"
        tabIndex={0}
        aria-label={buildAriaLabel(status, snapshot.activeCount, maskedCount)}
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
          {status === 'clean' && maskedCount === 0 && (
            <span class="sb-widget__check" aria-hidden="true">
              <CheckIcon />
            </span>
          )}
          {maskedCount > 0 && (
            <>
              {status === 'findings' && <span class="sb-widget__sep" aria-hidden="true">|</span>}
              <span class="sb-widget__masked">{maskedCount} masked</span>
            </>
          )}
        </span>
      </div>
      {panelOpen && onFix && onIgnore && onFixAll && onClose && (
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

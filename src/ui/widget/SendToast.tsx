import type { JSX } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { TriangleAlertIcon, ClockIcon, SearchIcon } from './icons';

export interface SendToastProps {
  activeCount: number;
  paused: boolean;
  onSendAnyway: () => void;
  onReview: () => void;
  onTimeout: () => void;
}

const TOTAL_SECONDS = 3;

export default function SendToast({
  activeCount,
  paused,
  onSendAnyway,
  onReview,
  onTimeout,
}: SendToastProps): JSX.Element {
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // 1-second tick. Only recreated when paused changes.
  useEffect(() => {
    if (paused || seconds <= 0) return;

    const id = setTimeout(() => {
      const next = seconds - 1;
      if (next <= 0) {
        setSeconds(0);
        onTimeoutRef.current();
      } else {
        setSeconds(next);
      }
    }, 1000);

    return (): void => {
      clearTimeout(id);
    };
  }, [paused, seconds]);
  const plural = activeCount === 1 ? '' : 's';

  const handleReview = useCallback((): void => {
    onReview();
  }, [onReview]);

  const handleSendAnyway = useCallback((): void => {
    onSendAnyway();
  }, [onSendAnyway]);

  return (
    <div
      class="sb-toast"
      role="alertdialog"
      aria-label={`${activeCount} unfixed finding${plural}. Sending in ${seconds} seconds.`}
      aria-live="assertive"
    >
      <div class="sb-toast__message">
        <span class="sb-toast__icon" aria-hidden="true">
          <TriangleAlertIcon size={16} />
        </span>
        <span class="sb-toast__text">
          {activeCount} unfixed finding{plural}
        </span>
        <span class="sb-toast__countdown" aria-hidden="true">
          <ClockIcon size={12} />
          {seconds}s
        </span>
      </div>
      <div class="sb-toast__actions">
        <button
          class="sb-toast__btn sb-toast__btn--review"
          type="button"
          onClick={handleReview}
        >
          <SearchIcon size={14} />
          Review
        </button>
        <button
          class="sb-toast__btn sb-toast__btn--send"
          type="button"
          onClick={handleSendAnyway}
        >
          Send Anyway
        </button>
      </div>
    </div>
  );
}


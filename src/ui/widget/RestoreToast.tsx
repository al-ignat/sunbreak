import type { JSX } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { ClipboardCopyIcon, ClockIcon } from './icons';

export interface RestoreToastProps {
  count: number;
  onAccept: () => void;
  onDecline: () => void;
}

const TOTAL_SECONDS = 8;

export default function RestoreToast({
  count,
  onAccept,
  onDecline,
}: RestoreToastProps): JSX.Element {
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const onDeclineRef = useRef(onDecline);
  onDeclineRef.current = onDecline;

  useEffect(() => {
    if (seconds <= 0) return;

    const id = setTimeout(() => {
      const next = seconds - 1;
      if (next <= 0) {
        setSeconds(0);
        onDeclineRef.current();
      } else {
        setSeconds(next);
      }
    }, 1000);

    return (): void => {
      clearTimeout(id);
    };
  }, [seconds]);

  const plural = count === 1 ? '' : 's';

  const handleAccept = useCallback((): void => {
    onAccept();
  }, [onAccept]);

  const handleDecline = useCallback((): void => {
    onDecline();
  }, [onDecline]);

  return (
    <div
      class="sb-restore-toast"
      role="alertdialog"
      aria-label={`Restore ${count} masked value${plural}? Auto-dismissing in ${seconds} seconds.`}
      aria-live="polite"
    >
      <div class="sb-restore-toast__message">
        <span class="sb-restore-toast__icon" aria-hidden="true">
          <ClipboardCopyIcon size={16} />
        </span>
        <span class="sb-restore-toast__text">
          Restore {count} masked value{plural}?
        </span>
        <span class="sb-restore-toast__countdown" aria-hidden="true">
          <ClockIcon size={12} />
          {seconds}s
        </span>
      </div>
      <div class="sb-restore-toast__actions">
        <button
          class="sb-restore-toast__btn sb-restore-toast__btn--restore"
          type="button"
          onClick={handleAccept}
        >
          Restore
        </button>
        <button
          class="sb-restore-toast__btn sb-restore-toast__btn--keep"
          type="button"
          onClick={handleDecline}
        >
          Keep masked
        </button>
      </div>
    </div>
  );
}

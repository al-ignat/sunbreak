import type { JSX } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { TriangleAlertIcon, ClockIcon } from './icons';

export interface FileWarningToastProps {
  count: number;
  onDismiss: () => void;
}

const TOTAL_SECONDS = 8;

export default function FileWarningToast({
  count,
  onDismiss,
}: FileWarningToastProps): JSX.Element {
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (seconds <= 0) return;

    const id = setTimeout(() => {
      const next = seconds - 1;
      if (next <= 0) {
        setSeconds(0);
        onDismissRef.current();
      } else {
        setSeconds(next);
      }
    }, 1000);

    return (): void => {
      clearTimeout(id);
    };
  }, [seconds]);

  const plural = count === 1 ? '' : 's';

  const handleDismiss = useCallback((): void => {
    onDismiss();
  }, [onDismiss]);

  return (
    <div
      class="sb-file-warning"
      role="alert"
      aria-live="polite"
      aria-label={`File upload detected. Review ${count} attachment${plural} manually. Auto-dismissing in ${seconds} seconds.`}
    >
      <div class="sb-file-warning__message">
        <span class="sb-file-warning__icon" aria-hidden="true">
          <TriangleAlertIcon size={16} />
        </span>
        <span class="sb-file-warning__content">
          <span class="sb-file-warning__eyebrow">File upload detected</span>
          <span class="sb-file-warning__text">
            Review {count} attachment{plural} manually before sending.
          </span>
          <span class="sb-file-warning__note">
            Sunbreak can detect the upload event, but it cannot inspect file contents.
          </span>
        </span>
        <span class="sb-file-warning__countdown" aria-hidden="true">
          <ClockIcon size={12} />
          {seconds}s
        </span>
      </div>
      <div class="sb-file-warning__actions">
        <button
          class="sb-file-warning__btn"
          type="button"
          onClick={handleDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

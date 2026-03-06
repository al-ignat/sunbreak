import type { JSX } from 'preact';
import { useEffect, useRef, useCallback } from 'preact/hooks';
import type { TrackedFinding } from '../../content/findings-state';
import type { FindingType } from '../../classifier/types';

export interface FindingsPanelProps {
  tracked: ReadonlyArray<TrackedFinding>;
  activeCount: number;
  onFix: (id: string) => void;
  onIgnore: (id: string) => void;
  onFixAll: () => void;
  onClose: () => void;
}

type Severity = 'red' | 'orange' | 'amber' | 'blue';

const SEVERITY_MAP: Record<FindingType, Severity> = {
  'api-key': 'red',
  'ssn': 'orange',
  'cpr': 'orange',
  'ni-number': 'orange',
  'credit-card': 'orange',
  'email': 'amber',
  'phone': 'amber',
  'keyword': 'blue',
  'ip-address': 'blue',
};

function getSeverity(type: FindingType): Severity {
  return SEVERITY_MAP[type] ?? 'blue';
}

function truncateValue(value: string, type: string): string {
  if (type === 'email' || type === 'keyword' || value.length <= 16) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function FindingsPanel({
  tracked,
  activeCount,
  onFix,
  onIgnore,
  onFixAll,
  onClose,
}: FindingsPanelProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the panel on mount
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Escape to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  const activeFindings = tracked.filter((t) => t.status === 'active');

  const plural = activeCount === 1 ? '' : 's';
  const headerText = `${activeCount} finding${plural}`;

  return (
    <div
      ref={panelRef}
      class="sb-panel"
      role="dialog"
      aria-label="Sunbreak findings"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div class="sb-panel__header">
        <span class="sb-panel__count">{headerText}</span>
        {activeCount > 1 && (
          <button
            class="sb-panel__fix-all"
            type="button"
            onClick={onFixAll}
          >
            Fix All
          </button>
        )}
      </div>

      {activeFindings.length === 0 && (
        <div class="sb-panel__empty">No active findings</div>
      )}

      {activeFindings.length > 0 && (
        <ul class="sb-panel__list" role="list">
          {activeFindings.map((tf) => {
            const severity = getSeverity(tf.finding.type);
            return (
              <li key={tf.id} class="sb-panel__row" role="listitem">
                <span
                  class={`sb-panel__dot sb-panel__dot--${severity}`}
                  aria-hidden="true"
                />
                <span class="sb-panel__value" title={tf.finding.value}>
                  {truncateValue(tf.finding.value, tf.finding.type)}
                </span>
                <span class="sb-panel__actions">
                  <button
                    class="sb-panel__btn sb-panel__btn--fix"
                    type="button"
                    aria-label={`Fix ${tf.finding.label} ${truncateValue(tf.finding.value, tf.finding.type)}`}
                    onClick={(): void => onFix(tf.id)}
                  >
                    Fix
                  </button>
                  <button
                    class="sb-panel__btn sb-panel__btn--ignore"
                    type="button"
                    aria-label={`Ignore ${tf.finding.label} ${truncateValue(tf.finding.value, tf.finding.type)}`}
                    onClick={(): void => onIgnore(tf.id)}
                  >
                    Ignore
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div class="sb-panel__footer">
        Fix All = mask &amp; safe to send
      </div>
    </div>
  );
}

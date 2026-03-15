import type { JSX } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type { TrackedFinding } from '../../content/findings-state';
import { ShieldCheckIcon, EyeOffIcon, InfoIcon, ClockIcon } from './icons';
import { findingSeverity } from './severity';
import type { MaskedEntry } from './Widget';

function isMaskableFinding(tf: TrackedFinding): boolean {
  return tf.finding.type !== 'custom-pattern';
}

export interface FindingsPanelProps {
  tracked: ReadonlyArray<TrackedFinding>;
  activeCount: number;
  onFix?: (id: string) => void;
  onIgnore: (id: string) => void;
  onFixAll?: () => void;
  onClose: () => void;
  maskedEntries?: ReadonlyArray<MaskedEntry>;
  maskedExpiresAt?: number | null;
  onClearMasked?: () => void;
}

function truncateValue(value: string, type: string): string {
  if (type === 'email' || type === 'keyword' || value.length <= 16) {
    return value;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function truncateOriginal(value: string): string {
  if (value.length <= 10) return value;
  return `${value.slice(0, 8)}...`;
}

function explanationSummary(tf: TrackedFinding): string | null {
  return tf.finding.context?.explanation?.summary ?? null;
}

function placeholderPreview(tf: TrackedFinding): string | null {
  if (tf.finding.type === 'custom-pattern' || tf.finding.placeholder.length === 0) return null;
  return `Masks to ${tf.finding.placeholder}`;
}

function formatRemainingTime(expiresAt: number): string {
  const remaining = Math.max(0, expiresAt - Date.now());
  const minutes = Math.ceil(remaining / 60_000);
  if (minutes <= 0) return 'expiring';
  return `${minutes} min`;
}

function useCountdown(expiresAt: number | null | undefined): string | null {
  const [label, setLabel] = useState<string | null>(
    expiresAt != null ? formatRemainingTime(expiresAt) : null,
  );

  useEffect(() => {
    if (expiresAt == null) {
      setLabel(null);
      return;
    }
    setLabel(formatRemainingTime(expiresAt));
    const id = setInterval(() => {
      setLabel(formatRemainingTime(expiresAt));
    }, 30_000); // update every 30s — minute-level precision
    return (): void => { clearInterval(id); };
  }, [expiresAt]);

  return label;
}

export default function FindingsPanel({
  tracked,
  activeCount,
  onFix,
  onIgnore,
  onFixAll,
  onClose,
  maskedEntries,
  maskedExpiresAt,
  onClearMasked,
}: FindingsPanelProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const hasMasked = maskedEntries != null && maskedEntries.length > 0;
  const countdown = useCountdown(maskedExpiresAt);

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
  const maskableActiveCount = activeFindings.filter(isMaskableFinding).length;

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
        <span class="sb-panel__count">
          {headerText} <span class="sb-panel__count-suffix">in this prompt</span>
        </span>
        {maskableActiveCount > 1 && onFixAll && (
          <button
            class="sb-panel__fix-all"
            type="button"
            onClick={onFixAll}
          >
            <ShieldCheckIcon size={14} />
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
            return (
              <li key={tf.id} class="sb-panel__row" role="listitem">
                <span
                  class="sb-panel__dot"
                  data-severity={findingSeverity(tf.finding)}
                  aria-hidden="true"
                />
                <span class="sb-panel__info">
                  <span class="sb-panel__type">{tf.finding.label}</span>
                  <span class="sb-panel__value" title={tf.finding.value}>
                    {truncateValue(tf.finding.value, tf.finding.type)}
                  </span>
                  {placeholderPreview(tf) && (
                    <span class="sb-panel__placeholder">
                      {placeholderPreview(tf)}
                    </span>
                  )}
                  {explanationSummary(tf) && (
                    <span class="sb-panel__explanation">
                      {explanationSummary(tf)}
                    </span>
                  )}
                </span>
                <span class="sb-panel__actions">
                  {onFix && isMaskableFinding(tf) && (
                    <button
                      class="sb-panel__btn sb-panel__btn--fix"
                      type="button"
                      aria-label={`Fix ${tf.finding.label} ${truncateValue(tf.finding.value, tf.finding.type)}`}
                      onClick={(): void => onFix(tf.id)}
                    >
                      Fix
                    </button>
                  )}
                  <button
                    class="sb-panel__btn sb-panel__btn--ignore"
                    type="button"
                    aria-label={`Ignore ${tf.finding.label} ${truncateValue(tf.finding.value, tf.finding.type)}`}
                    onClick={(): void => onIgnore(tf.id)}
                  >
                    <EyeOffIcon size={14} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {hasMasked && (
        <div class="sb-panel__masked">
          <div class="sb-panel__masked-header">
            <span class="sb-panel__masked-title">
              {maskedEntries.length} value{maskedEntries.length === 1 ? '' : 's'} masked locally
            </span>
            {onClearMasked && (
              <button
                class="sb-panel__btn sb-panel__btn--clear"
                type="button"
                onClick={onClearMasked}
              >
                Clear All
              </button>
            )}
          </div>
          <ul class="sb-panel__masked-list" role="list">
            {maskedEntries.map((entry) => (
              <li key={entry.token} class="sb-panel__masked-row" role="listitem">
                <span class="sb-panel__masked-token">{entry.token}</span>
                <span class="sb-panel__masked-original" title={entry.originalValue}>
                  {truncateOriginal(entry.originalValue)}
                </span>
              </li>
            ))}
          </ul>
          <div class="sb-panel__masked-note">
            Originals stay in memory only and never replace the clipboard unless you confirm restore.
          </div>
          {countdown != null && (
            <div class="sb-panel__masked-ttl">
              <ClockIcon size={12} />
              Auto-clears in {countdown}
            </div>
          )}
        </div>
      )}

      <div class="sb-panel__footer">
        <InfoIcon size={12} />
        {maskableActiveCount > 0
          ? 'Fix actions mask values locally before sending'
          : 'Sensitive data or company identifiers detected'}
      </div>
    </div>
  );
}

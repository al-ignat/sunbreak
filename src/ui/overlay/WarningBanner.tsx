import type { JSX } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import type { WarningBannerProps, OverlayAction, OverlayFinding } from './types';

/** Truncate a sensitive value for display: show first 4 + last 4 chars */
function truncateValue(value: string, type: string): string {
  // Show full value for short items (emails, short keywords)
  if (type === 'email' || type === 'keyword' || value.length <= 12) {
    return value;
  }
  // For API keys, credit cards, etc.: first 4 ... last 4
  return `${value.slice(0, 4)}${'...'}${value.slice(-4)}`;
}

/** Build a plain-language summary like "2 email addresses and 1 API key detected" */
function buildSummary(findings: ReadonlyArray<OverlayFinding>): string {
  const counts = new Map<string, number>();
  for (const f of findings) {
    counts.set(f.label, (counts.get(f.label) ?? 0) + 1);
  }

  const parts: string[] = [];
  for (const [label, count] of counts) {
    const plural = count > 1 ? 's' : '';
    parts.push(`${count} ${label.toLowerCase()}${plural}`);
  }

  if (parts.length === 0) return 'Sensitive data detected';
  if (parts.length === 1) return `${parts[0]} detected`;
  const last = parts[parts.length - 1] ?? '';
  const rest = parts.slice(0, -1);
  return `${rest.join(', ')} and ${last} detected`;
}

export default function WarningBanner({ findings, onAction }: WarningBannerProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleAction = useCallback(
    (action: OverlayAction): void => {
      setExiting(true);
      // Wait for exit animation before calling onAction
      setTimeout(() => onAction(action), 150);
    },
    [onAction],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleAction('cancel');
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleAction('redact');
      }
    };

    document.addEventListener('keydown', handleKeydown, true);
    return (): void => {
      document.removeEventListener('keydown', handleKeydown, true);
    };
  }, [handleAction]);

  const summary = buildSummary(findings);

  return (
    <div
      class={`byoai-banner ${exiting ? 'byoai-banner--exit' : ''}`}
      role="alertdialog"
      aria-label="Sensitive data detected in your prompt"
      aria-describedby="byoai-summary"
    >
      <div class="byoai-banner__header">
        <span class="byoai-banner__icon" aria-hidden="true">
          &#9888;
        </span>
        <span id="byoai-summary" class="byoai-banner__summary">
          {summary}
        </span>
        <button
          class="byoai-banner__toggle"
          onClick={(): void => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="byoai-details"
          type="button"
        >
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      </div>

      {expanded && (
        <ul id="byoai-details" class="byoai-banner__details" role="list">
          {findings.map((f: OverlayFinding, i: number) => (
            <li key={i} class="byoai-banner__finding">
              <span class="byoai-banner__finding-label">{f.label}</span>
              <code class="byoai-banner__finding-value">
                {truncateValue(f.value, f.type)}
              </code>
              <span class="byoai-banner__finding-arrow">→</span>
              <code class="byoai-banner__finding-placeholder">{f.placeholder}</code>
            </li>
          ))}
        </ul>
      )}

      <div class="byoai-banner__actions">
        <button
          class="byoai-btn byoai-btn--primary"
          onClick={(): void => handleAction('redact')}
          type="button"
        >
          Redact &amp; Send
        </button>
        <button
          class="byoai-btn byoai-btn--secondary"
          onClick={(): void => handleAction('edit')}
          type="button"
        >
          Edit
        </button>
        <button
          class="byoai-btn byoai-btn--danger"
          onClick={(): void => handleAction('send-anyway')}
          type="button"
        >
          Send Anyway
        </button>
        <button
          class="byoai-btn byoai-btn--tertiary"
          onClick={(): void => handleAction('cancel')}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

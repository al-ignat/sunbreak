import type { JSX } from 'preact';
import { Sun, ArrowRight } from 'lucide-preact';
import { TrustFooter } from './TrustFooter';

export interface ProtectionStatusProps {
  readonly enabled: boolean;
  readonly weeklyFindingCount: number;
  readonly onOpenDashboard: () => void;
  readonly onOpenSandbox: () => void;
  readonly onOpenSettings: () => void;
}

export function ProtectionStatus({
  enabled,
  weeklyFindingCount,
  onOpenDashboard,
  onOpenSandbox,
  onOpenSettings,
}: ProtectionStatusProps): JSX.Element {
  const statusColor = enabled ? 'var(--color-safe)' : 'var(--color-text-muted)';
  const statusLabel = enabled ? 'Protection active' : 'Protection paused';
  const statusClass = enabled
    ? 'popup-status__label popup-status__label--active'
    : 'popup-status__label popup-status__label--paused';

  const summary =
    weeklyFindingCount > 0
      ? `${weeklyFindingCount} finding${weeklyFindingCount === 1 ? '' : 's'} caught this week`
      : 'All clear this week';

  return (
    <div className="popup-container">
      <div className="popup-header">
        <div className="popup-brand">
          <Sun size={20} color="var(--color-warning)" aria-hidden="true" />
          <span className="popup-title">Sunbreak</span>
        </div>
      </div>

      <div className="popup-status">
        <div className="popup-status__indicator">
          <ShieldIcon color={statusColor} />
          <span className={statusClass}>{statusLabel}</span>
        </div>

        <p className="popup-status__summary">{summary}</p>

        <div className="popup-actions">
          <button
            type="button"
            className="popup-actions__btn popup-actions__btn--primary"
            onClick={onOpenDashboard}
          >
            Open Dashboard
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            className="popup-actions__btn popup-actions__btn--secondary"
            onClick={onOpenSandbox}
          >
            Try Sandbox
          </button>
          <button
            type="button"
            className="popup-actions__btn popup-actions__btn--secondary"
            onClick={onOpenSettings}
          >
            Settings
          </button>
        </div>

        <TrustFooter />
      </div>
    </div>
  );
}

function ShieldIcon({ color }: { readonly color: string }): JSX.Element {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="popup-status__shield"
    >
      <path
        d="M12 2l7 3.5v5c0 4.7-3 8.9-7 10.5-4-1.6-7-5.8-7-10.5v-5L12 2z"
        stroke={color}
        strokeWidth="1.8"
        fill="none"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

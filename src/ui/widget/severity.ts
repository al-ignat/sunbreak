import type { FindingType } from '../../classifier/types';
import type { TrackedFinding } from '../../content/findings-state';

/** Four-level severity for the widget badge */
export type SeverityLevel = 'clean' | 'warning' | 'concern' | 'critical';

/** Numeric order for comparison (higher = more severe) */
const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  clean: 0,
  warning: 1,
  concern: 2,
  critical: 3,
};

/** Design tokens per severity level (from Pencil spec) */
export interface SeverityColors {
  readonly icon: string;
  readonly badge: string;
  readonly badgeText: string;
  readonly border: string;
  readonly borderHover: string;
  readonly shadow: string;
}

export const SEVERITY_COLORS: Record<SeverityLevel, SeverityColors> = {
  clean: {
    icon: '#34D399',
    badge: '',
    badgeText: '',
    border: '#065F46',
    borderHover: '#34D399',
    shadow: 'rgba(0, 0, 0, 0.12)',
  },
  warning: {
    icon: '#FBBF24',
    badge: '#FBBF24',
    badgeText: '#1E1D21',
    border: '#92700A',
    borderHover: '#FBBF24',
    shadow: 'rgba(251, 191, 36, 0.08)',
  },
  concern: {
    icon: '#FB923C',
    badge: '#FB923C',
    badgeText: '#1E1D21',
    border: '#9A4A12',
    borderHover: '#FB923C',
    shadow: 'rgba(251, 146, 60, 0.08)',
  },
  critical: {
    icon: '#F87171',
    badge: '#F87171',
    badgeText: '#FFFFFF',
    border: '#991B1B',
    borderHover: '#F87171',
    shadow: 'rgba(248, 113, 113, 0.08)',
  },
};

/** Masked badge colors */
export const MASKED_COLORS = {
  badge: '#1E40AF',
  badgeText: '#60A5FA',
} as const;

/** Map a finding type to its severity level */
export function findingSeverity(type: FindingType): SeverityLevel {
  switch (type) {
    case 'api-key':
      return 'critical';
    case 'ssn':
    case 'cpr':
    case 'ni-number':
    case 'credit-card':
      return 'concern';
    case 'email':
    case 'phone':
    case 'ip-address':
    case 'keyword':
      return 'warning';
    default:
      return 'warning';
  }
}

/** Determine the highest severity across active findings */
export function maxSeverity(tracked: ReadonlyArray<TrackedFinding>): SeverityLevel {
  let max: SeverityLevel = 'clean';
  for (const f of tracked) {
    if (f.status !== 'active') continue;
    const level = findingSeverity(f.finding.type);
    if (SEVERITY_ORDER[level] > SEVERITY_ORDER[max]) {
      max = level;
    }
  }
  return max;
}

/**
 * Map a FindingType to its underline/dot color.
 * Used by TextOverlay and FindingsPanel for per-finding coloring.
 */
export function severityColor(type: FindingType): string {
  return SEVERITY_COLORS[findingSeverity(type)].icon;
}

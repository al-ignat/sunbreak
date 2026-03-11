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

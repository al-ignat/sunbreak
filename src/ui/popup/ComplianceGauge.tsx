import type { JSX } from 'preact';

export interface ComplianceGaugeProps {
  readonly rate: number | null;
}

/** Mini SVG ring gauge showing compliance percentage */
export function ComplianceGauge({ rate }: ComplianceGaugeProps): JSX.Element {
  const size = 40;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const isNull = rate === null;
  const pct = isNull ? 0 : rate;
  const offset = circumference - (pct / 100) * circumference;

  const color = isNull
    ? 'var(--color-text-muted)'
    : pct >= 80
      ? 'var(--color-safe)'
      : pct >= 50
        ? 'var(--color-warning)'
        : 'var(--color-danger)';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={isNull ? 'No compliance data' : `${pct.toFixed(0)}% compliance`}>
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        stroke-width={strokeWidth}
      />
      {/* Progress ring */}
      {!isNull && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          stroke-width={strokeWidth}
          stroke-dasharray={circumference}
          stroke-dashoffset={offset}
          stroke-linecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      {/* Center text */}
      <text
        x={size / 2}
        y={size / 2}
        text-anchor="middle"
        dominant-baseline="central"
        fill={color}
        font-size="10"
        font-weight="600"
        font-family="var(--font-mono)"
      >
        {isNull ? '\u2014' : `${pct.toFixed(0)}%`}
      </text>
    </svg>
  );
}

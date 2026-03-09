import type { JSX } from 'preact';

export interface ComplianceGaugeProps {
  readonly rate: number | null;
  readonly size?: number;
}

/** Mini SVG ring gauge showing compliance percentage */
export function ComplianceGauge({ rate, size = 64 }: ComplianceGaugeProps): JSX.Element {
  const strokeWidth = 5;
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

  const fontSize = Math.round(size * 0.25);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={isNull ? 'No compliance data' : `${pct.toFixed(0)}% compliance`}>
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-bg-elevated)"
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
        font-size={fontSize}
        font-weight="700"
        font-family="var(--font-body)"
      >
        {isNull ? '\u2014' : `${pct.toFixed(0)}%`}
      </text>
    </svg>
  );
}

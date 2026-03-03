import type { JSX } from 'preact';

export interface ToggleButtonProps {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: string;
}

export function ToggleButton({ active, onClick, children }: ToggleButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: active ? 600 : 400,
        background: active ? '#FF9800' : 'white',
        color: active ? 'white' : '#666',
        border: `1px solid ${active ? '#FF9800' : '#DDD'}`,
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

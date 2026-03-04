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
      className={`toggle-btn ${active ? 'toggle-btn--active' : ''}`}
    >
      {children}
    </button>
  );
}

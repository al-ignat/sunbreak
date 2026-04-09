import type { JSX } from 'preact';

export interface OnboardingCompleteProps {
  readonly onDone: () => void;
  readonly onOpenDashboard: () => void;
}

export function OnboardingComplete({ onDone, onOpenDashboard }: OnboardingCompleteProps): JSX.Element {
  return (
    <div className="popup-onboarding__step popup-onboarding__step--center">
      <div className="popup-onboarding__icon">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="20" r="18" stroke="var(--color-safe)" strokeWidth="2.5" fill="none" />
          <path d="M13 20l5 5 9-9" stroke="var(--color-safe)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
      <h2 className="popup-onboarding__headline">You're protected</h2>
      <p className="popup-onboarding__body">
        Sunbreak is already scanning your prompts. You're good to go.
      </p>
      <button
        type="button"
        className="popup-onboarding__primary-btn"
        onClick={onDone}
      >
        Done
      </button>
      <button
        type="button"
        className="popup-onboarding__secondary-btn"
        onClick={onOpenDashboard}
      >
        Open Dashboard
      </button>
    </div>
  );
}

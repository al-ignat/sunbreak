import type { JSX } from 'preact';
import { SandboxCore } from '../shared/SandboxCore';

export interface OnboardingSandboxProps {
  readonly onNext: () => void;
  readonly onSkip: () => void;
}

export function OnboardingSandbox({ onNext, onSkip }: OnboardingSandboxProps): JSX.Element {
  return (
    <div className="popup-onboarding__step">
      <h2 className="popup-onboarding__headline popup-onboarding__headline--sm">
        See it in action
      </h2>
      <p className="popup-onboarding__body">
        Try typing or select a sample to see what Sunbreak detects.
      </p>
      <SandboxCore compact />
      <div className="popup-onboarding__actions">
        <button
          type="button"
          className="popup-onboarding__primary-btn"
          onClick={onNext}
        >
          Next
        </button>
        <button
          type="button"
          className="popup-onboarding__skip"
          onClick={onSkip}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

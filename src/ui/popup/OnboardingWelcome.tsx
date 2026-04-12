import type { JSX } from 'preact';
import { Sun } from 'lucide-preact';
import { TRUST_LOCAL, TRUST_NO_STORAGE, TRUST_METADATA } from '../trust-copy';

export interface OnboardingWelcomeProps {
  readonly onNext: () => void;
  readonly onSkip: () => void;
}

export function OnboardingWelcome({ onNext, onSkip }: OnboardingWelcomeProps): JSX.Element {
  return (
    <div className="popup-onboarding__step">
      <div className="popup-onboarding__icon">
        <Sun size={32} color="var(--color-warning)" aria-hidden="true" />
      </div>
      <h1 className="popup-onboarding__headline">Welcome to Sunbreak</h1>
      <p className="popup-onboarding__body">
        Sunbreak scans your prompts before they reach AI tools — catching
        sensitive data so you can fix it first.
      </p>
      <ul className="popup-onboarding__bullets">
        <li className="popup-onboarding__bullet">
          <span className="popup-onboarding__bullet-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.3 5.3l-4 4a.5.5 0 01-.7 0l-2-2a.5.5 0 01.7-.7L7 9.3l3.6-3.6a.5.5 0 01.7.7z" fill="var(--color-safe)"/></svg>
          </span>
          {TRUST_LOCAL}
        </li>
        <li className="popup-onboarding__bullet">
          <span className="popup-onboarding__bullet-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.3 5.3l-4 4a.5.5 0 01-.7 0l-2-2a.5.5 0 01.7-.7L7 9.3l3.6-3.6a.5.5 0 01.7.7z" fill="var(--color-safe)"/></svg>
          </span>
          {TRUST_NO_STORAGE}
        </li>
        <li className="popup-onboarding__bullet">
          <span className="popup-onboarding__bullet-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.3 5.3l-4 4a.5.5 0 01-.7 0l-2-2a.5.5 0 01.7-.7L7 9.3l3.6-3.6a.5.5 0 01.7.7z" fill="var(--color-safe)"/></svg>
          </span>
          {TRUST_METADATA}
        </li>
      </ul>
      <button
        type="button"
        className="popup-onboarding__primary-btn"
        onClick={onNext}
      >
        Get Started
      </button>
      <button
        type="button"
        className="popup-onboarding__skip"
        onClick={onSkip}
      >
        Skip
      </button>
    </div>
  );
}

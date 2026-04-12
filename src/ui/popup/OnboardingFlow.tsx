import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { completeOnboarding, skipOnboarding } from '../../storage/onboarding';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingSandbox } from './OnboardingSandbox';
import { OnboardingComplete } from './OnboardingComplete';

export interface OnboardingFlowProps {
  readonly onComplete: () => void;
}

type Step = 1 | 2 | 3;

export function OnboardingFlow({ onComplete }: OnboardingFlowProps): JSX.Element {
  const [step, setStep] = useState<Step>(1);

  function handleSkip(): void {
    void skipOnboarding().then(onComplete);
  }

  function handleDone(): void {
    void completeOnboarding().then(onComplete);
  }

  function handleOpenDashboard(): void {
    const url = chrome.runtime.getURL('dashboard.html');
    void chrome.tabs.create({ url });
    void completeOnboarding().then(onComplete);
  }

  return (
    <div className="popup-onboarding">
      <StepDots current={step} />
      {step === 1 && (
        <OnboardingWelcome
          onNext={(): void => setStep(2)}
          onSkip={handleSkip}
        />
      )}
      {step === 2 && (
        <OnboardingSandbox
          onNext={(): void => setStep(3)}
          onSkip={handleSkip}
        />
      )}
      {step === 3 && (
        <OnboardingComplete
          onDone={handleDone}
          onOpenDashboard={handleOpenDashboard}
        />
      )}
    </div>
  );
}

function StepDots({ current }: { readonly current: Step }): JSX.Element {
  return (
    <div className="popup-onboarding__dots" aria-hidden="true">
      {([1, 2, 3] as const).map((n) => (
        <span
          key={n}
          className={`popup-onboarding__dot${n === current ? ' popup-onboarding__dot--active' : ''}`}
        />
      ))}
    </div>
  );
}

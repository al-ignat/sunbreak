import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { OnboardingFlow } from '../../../../src/ui/popup/OnboardingFlow';

vi.mock('../../../../src/storage/onboarding', () => ({
  completeOnboarding: vi.fn(() => Promise.resolve()),
  skipOnboarding: vi.fn(() => Promise.resolve()),
}));

import { completeOnboarding, skipOnboarding } from '../../../../src/storage/onboarding';

describe('OnboardingFlow', () => {
  let onComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onComplete = vi.fn();
    vi.clearAllMocks();
  });

  it('renders step 1 (Welcome) initially', () => {
    const { container } = render(<OnboardingFlow onComplete={onComplete} />);
    expect(container.textContent).toContain('Welcome to Sunbreak');
    expect(container.textContent).toContain('Get Started');
  });

  it('shows step indicators with first dot active', () => {
    const { container } = render(<OnboardingFlow onComplete={onComplete} />);
    const dots = container.querySelectorAll('.popup-onboarding__dot');
    expect(dots).toHaveLength(3);
    expect(dots[0].classList.contains('popup-onboarding__dot--active')).toBe(true);
    expect(dots[1].classList.contains('popup-onboarding__dot--active')).toBe(false);
  });

  it('shows trust bullets on step 1', () => {
    const { container } = render(<OnboardingFlow onComplete={onComplete} />);
    expect(container.textContent).toContain('locally in your browser');
    expect(container.textContent).toContain('No prompt text');
    expect(container.textContent).toContain('metadata');
  });

  it('advances to step 2 on Get Started click', () => {
    const { container } = render(<OnboardingFlow onComplete={onComplete} />);
    const getStartedBtn = findButton(container, 'Get Started');
    if (!getStartedBtn) throw new Error('Get Started button not found');
    fireEvent.click(getStartedBtn);

    expect(container.textContent).toContain('See it in action');
    // Step 2 dot should be active
    const dots = container.querySelectorAll('.popup-onboarding__dot');
    expect(dots[1].classList.contains('popup-onboarding__dot--active')).toBe(true);
  });

  it('advances to step 3 from step 2', () => {
    const { container } = render(<OnboardingFlow onComplete={onComplete} />);
    // Go to step 2
    clickButton(container, 'Get Started');
    // Go to step 3
    clickButton(container, 'Next');

    expect(container.textContent).toContain("You're protected");
  });

  it('renders sandbox on step 2', () => {
    const { container } = render(<OnboardingFlow onComplete={onComplete} />);
    clickButton(container, 'Get Started');

    // Should have the compact sandbox
    expect(container.querySelector('.popup-sandbox')).not.toBeNull();
  });

  it('calls skipOnboarding and onComplete when skip clicked on step 1', async () => {
    const { container } = render(<OnboardingFlow onComplete={onComplete} />);
    const skipBtn = findButton(container, 'Skip');
    if (!skipBtn) throw new Error('Skip button not found');
    fireEvent.click(skipBtn);

    await vi.waitFor(() => {
      expect(skipOnboarding).toHaveBeenCalledOnce();
      expect(onComplete).toHaveBeenCalledOnce();
    });
  });

  it('calls skipOnboarding and onComplete when skip clicked on step 2', async () => {
    const { container } = render(<OnboardingFlow onComplete={onComplete} />);
    clickButton(container, 'Get Started');
    clickButton(container, 'Skip');

    await vi.waitFor(() => {
      expect(skipOnboarding).toHaveBeenCalledOnce();
      expect(onComplete).toHaveBeenCalledOnce();
    });
  });

  it('calls completeOnboarding and onComplete when Done clicked on step 3', async () => {
    const { container } = render(<OnboardingFlow onComplete={onComplete} />);
    clickButton(container, 'Get Started');
    clickButton(container, 'Next');
    clickButton(container, 'Done');

    await vi.waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledOnce();
      expect(onComplete).toHaveBeenCalledOnce();
    });
  });

  it('calls completeOnboarding when Open Dashboard clicked on step 3', async () => {
    const { container } = render(<OnboardingFlow onComplete={onComplete} />);
    clickButton(container, 'Get Started');
    clickButton(container, 'Next');
    clickButton(container, 'Open Dashboard');

    await vi.waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledOnce();
      expect(onComplete).toHaveBeenCalledOnce();
    });
  });
});

function findButton(
  container: HTMLElement,
  text: string,
): HTMLButtonElement | null {
  const buttons = container.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent?.trim() === text) return btn;
  }
  return null;
}

function clickButton(container: HTMLElement, text: string): void {
  const btn = findButton(container, text);
  if (!btn) throw new Error(`Button "${text}" not found`);
  fireEvent.click(btn);
}

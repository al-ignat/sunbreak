import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/preact';
import { SandboxCore } from '../../../../src/ui/shared/SandboxCore';

/** Helper: set textarea value and fire input event */
function setTextareaValue(textarea: HTMLTextAreaElement, value: string): void {
  // Set the DOM value, then fire input so the handler reads currentTarget.value
  Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype, 'value',
  )?.set?.call(textarea, value);
  fireEvent.input(textarea);
}

describe('SandboxCore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with the first sample preloaded', () => {
    const { container } = render(<SandboxCore />);
    const textarea = container.querySelector('textarea');
    if (!textarea) throw new Error('textarea not found');
    expect(textarea.value).toContain('john.smith@acme.com');
  });

  it('displays findings for the default sample text', () => {
    const { container } = render(<SandboxCore />);
    // Default sample has email and phone — should find at least 2 findings
    const findings = container.querySelectorAll('.sandbox__finding');
    expect(findings.length).toBeGreaterThanOrEqual(2);
  });

  it('renders sample buttons', () => {
    const { container } = render(<SandboxCore />);
    const buttons = container.querySelectorAll('.sandbox__sample-btn');
    expect(buttons.length).toBe(4); // 4 sample prompts
  });

  it('updates text and findings when a sample button is clicked', () => {
    const { container } = render(<SandboxCore />);
    const buttons = container.querySelectorAll('.sandbox__sample-btn');
    // Click the SSN sample (last one)
    const ssnButton = buttons[3];
    if (!ssnButton) throw new Error('SSN button not found');
    fireEvent.click(ssnButton);

    const textarea = container.querySelector('textarea');
    if (!textarea) throw new Error('textarea not found');
    expect(textarea.value).toContain('123-45-6789');

    // Should find SSN
    const findingTexts = container.textContent ?? '';
    expect(findingTexts).toContain('SSN');
  });

  it('shows empty message for text with no sensitive data', () => {
    const { container } = render(<SandboxCore />);
    const textarea = container.querySelector('textarea');
    if (!textarea) throw new Error('textarea not found');

    act(() => {
      setTextareaValue(textarea, 'Hello, how are you today?');
      vi.advanceTimersByTime(200);
    });

    expect(container.textContent).toContain('No sensitive data detected');
  });

  it('shows placeholder message for empty text', () => {
    const { container } = render(<SandboxCore />);
    const textarea = container.querySelector('textarea');
    if (!textarea) throw new Error('textarea not found');

    act(() => {
      setTextareaValue(textarea, '');
      vi.advanceTimersByTime(200);
    });

    expect(container.textContent).toContain('Type or select a sample');
  });

  it('uses compact CSS prefix when compact prop is true', () => {
    const { container } = render(<SandboxCore compact />);
    expect(container.querySelector('.popup-sandbox')).not.toBeNull();
    expect(container.querySelector('.sandbox')).toBeNull();
  });

  it('uses dashboard CSS prefix by default', () => {
    const { container } = render(<SandboxCore />);
    expect(container.querySelector('.sandbox')).not.toBeNull();
  });

  it('debounces classification on rapid input', () => {
    const { container } = render(<SandboxCore />);
    const textarea = container.querySelector('textarea');
    if (!textarea) throw new Error('textarea not found');

    // Rapid typing — classifier should not run between each keystroke
    act(() => {
      setTextareaValue(textarea, 'a');
      vi.advanceTimersByTime(50);
      setTextareaValue(textarea, 'ab');
      vi.advanceTimersByTime(50);
      setTextareaValue(textarea, 'abc');
    });

    // Before full debounce fires, results should not have updated to clean
    // (still showing initial sample findings)
    const beforeDebounce = container.textContent ?? '';
    expect(beforeDebounce).toContain('finding');

    // After debounce, should update to clean
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(container.textContent).toContain('No sensitive data detected');
  });

  it('shows finding count and duration', () => {
    const { container } = render(<SandboxCore />);
    // Default sample should produce findings
    const resultsCount = container.querySelector('.sandbox__results-count');
    if (!resultsCount) throw new Error('results count not found');
    expect(resultsCount.textContent).toContain('finding');
    expect(resultsCount.textContent).toMatch(/\d+ms/);
  });

  it('displays placeholder token for each finding', () => {
    const { container } = render(<SandboxCore />);
    const tokens = container.querySelectorAll('.sandbox__finding-token');
    expect(tokens.length).toBeGreaterThanOrEqual(1);
    // Placeholder tokens are like [EMAIL_1], [PHONE_1]
    const firstToken = tokens[0];
    if (!firstToken) throw new Error('token not found');
    expect(firstToken.textContent).toMatch(/^\[.+\]$/);
  });
});

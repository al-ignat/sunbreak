import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/preact';
import WarningBanner from '../../../../src/ui/overlay/WarningBanner';
import type { OverlayFinding, OverlayAction } from '../../../../src/ui/overlay/types';

const EMAIL_FINDING: OverlayFinding = {
  type: 'email',
  label: 'Email Address',
  value: 'john@example.com',
  placeholder: '[EMAIL_1]',
  confidence: 'HIGH',
};

const API_KEY_FINDING: OverlayFinding = {
  type: 'api-key',
  label: 'API Key',
  value: 'sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234',
  placeholder: '[API_KEY_1]',
  confidence: 'HIGH',
};

const PHONE_FINDING: OverlayFinding = {
  type: 'phone',
  label: 'Phone Number',
  value: '555-123-4567',
  placeholder: '[PHONE_1]',
  confidence: 'MEDIUM',
};

function renderBanner(
  findings: ReadonlyArray<OverlayFinding> = [EMAIL_FINDING],
  onAction: (action: OverlayAction) => void = vi.fn(),
): ReturnType<typeof render> {
  return render(<WarningBanner findings={findings} onAction={onAction} />);
}

describe('WarningBanner', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('summary text', () => {
    it('shows single finding type summary', () => {
      renderBanner([EMAIL_FINDING]);
      expect(screen.getByText('1 email address detected')).toBeTruthy();
    });

    it('shows plural for multiple same-type findings', () => {
      const secondEmail: OverlayFinding = {
        ...EMAIL_FINDING,
        value: 'jane@example.com',
        placeholder: '[EMAIL_2]',
      };
      renderBanner([EMAIL_FINDING, secondEmail]);
      expect(screen.getByText('2 email addresss detected')).toBeTruthy();
    });

    it('joins multiple types with "and"', () => {
      renderBanner([EMAIL_FINDING, API_KEY_FINDING]);
      expect(
        screen.getByText('1 email address and 1 api key detected'),
      ).toBeTruthy();
    });

    it('joins three types with commas and "and"', () => {
      renderBanner([EMAIL_FINDING, API_KEY_FINDING, PHONE_FINDING]);
      expect(
        screen.getByText(
          '1 email address, 1 api key and 1 phone number detected',
        ),
      ).toBeTruthy();
    });
  });

  describe('action buttons', () => {
    let onAction: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onAction = vi.fn();
      vi.useFakeTimers();
    });

    it('renders all four action buttons', () => {
      renderBanner([EMAIL_FINDING], onAction);
      expect(screen.getByText('Redact & Send')).toBeTruthy();
      expect(screen.getByText('Edit')).toBeTruthy();
      expect(screen.getByText('Send Anyway')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('calls onAction with "redact" after animation delay', () => {
      renderBanner([EMAIL_FINDING], onAction);
      fireEvent.click(screen.getByText('Redact & Send'));
      expect(onAction).not.toHaveBeenCalled();
      vi.advanceTimersByTime(150);
      expect(onAction).toHaveBeenCalledWith('redact');
    });

    it('calls onAction with "edit" after animation delay', () => {
      renderBanner([EMAIL_FINDING], onAction);
      fireEvent.click(screen.getByText('Edit'));
      vi.advanceTimersByTime(150);
      expect(onAction).toHaveBeenCalledWith('edit');
    });

    it('calls onAction with "send-anyway" after animation delay', () => {
      renderBanner([EMAIL_FINDING], onAction);
      fireEvent.click(screen.getByText('Send Anyway'));
      vi.advanceTimersByTime(150);
      expect(onAction).toHaveBeenCalledWith('send-anyway');
    });

    it('calls onAction with "cancel" after animation delay', () => {
      renderBanner([EMAIL_FINDING], onAction);
      fireEvent.click(screen.getByText('Cancel'));
      vi.advanceTimersByTime(150);
      expect(onAction).toHaveBeenCalledWith('cancel');
    });
  });

  describe('keyboard shortcuts', () => {
    let onAction: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onAction = vi.fn();
      vi.useFakeTimers();
    });

    it('Escape triggers cancel action', () => {
      renderBanner([EMAIL_FINDING], onAction);
      fireEvent.keyDown(document, { key: 'Escape' });
      vi.advanceTimersByTime(150);
      expect(onAction).toHaveBeenCalledWith('cancel');
    });

    it('Enter triggers redact action', () => {
      renderBanner([EMAIL_FINDING], onAction);
      fireEvent.keyDown(document, { key: 'Enter' });
      vi.advanceTimersByTime(150);
      expect(onAction).toHaveBeenCalledWith('redact');
    });

    it('Shift+Enter does not trigger redact action', () => {
      renderBanner([EMAIL_FINDING], onAction);
      fireEvent.keyDown(document, { key: 'Enter', shiftKey: true });
      vi.advanceTimersByTime(150);
      expect(onAction).not.toHaveBeenCalled();
    });
  });

  describe('detail section', () => {
    it('is collapsed by default', () => {
      renderBanner([EMAIL_FINDING]);
      expect(screen.queryByRole('list')).toBeNull();
      expect(screen.getByText('Show details')).toBeTruthy();
    });

    it('expands when toggle is clicked', () => {
      renderBanner([EMAIL_FINDING]);
      fireEvent.click(screen.getByText('Show details'));
      expect(screen.getByRole('list')).toBeTruthy();
      expect(screen.getByText('Hide details')).toBeTruthy();
    });

    it('shows finding label and value when expanded', () => {
      renderBanner([EMAIL_FINDING]);
      fireEvent.click(screen.getByText('Show details'));
      expect(screen.getByText('Email Address')).toBeTruthy();
      expect(screen.getByText('john@example.com')).toBeTruthy();
      expect(screen.getByText('[EMAIL_1]')).toBeTruthy();
    });

    it('truncates long values (API keys)', () => {
      renderBanner([API_KEY_FINDING]);
      fireEvent.click(screen.getByText('Show details'));
      // Long API key should be truncated: first 4 + ... + last 4
      expect(screen.getByText('sk-p...x234')).toBeTruthy();
    });

    it('shows full value for emails', () => {
      renderBanner([EMAIL_FINDING]);
      fireEvent.click(screen.getByText('Show details'));
      expect(screen.getByText('john@example.com')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has alertdialog role', () => {
      const { container } = renderBanner([EMAIL_FINDING]);
      const banner = container.querySelector('[role="alertdialog"]');
      expect(banner).toBeTruthy();
    });

    it('has aria-label on the banner', () => {
      const { container } = renderBanner([EMAIL_FINDING]);
      const banner = container.querySelector('[role="alertdialog"]');
      expect(banner?.getAttribute('aria-label')).toBe(
        'Sensitive data detected in your prompt',
      );
    });

    it('toggle button has aria-expanded', () => {
      renderBanner([EMAIL_FINDING]);
      const toggle = screen.getByText('Show details');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('toggle aria-expanded updates on click', () => {
      renderBanner([EMAIL_FINDING]);
      const toggle = screen.getByText('Show details');
      fireEvent.click(toggle);
      expect(screen.getByText('Hide details').getAttribute('aria-expanded')).toBe('true');
    });
  });
});

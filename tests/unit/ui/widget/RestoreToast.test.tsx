import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/preact';
import RestoreToast from '../../../../src/ui/widget/RestoreToast';

describe('RestoreToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  function renderToast(overrides: {
    count?: number;
    onAccept?: () => void;
    onDecline?: () => void;
  } = {}): ReturnType<typeof render> {
    return render(
      <RestoreToast
        count={overrides.count ?? 2}
        onAccept={overrides.onAccept ?? vi.fn()}
        onDecline={overrides.onDecline ?? vi.fn()}
      />,
    );
  }

  describe('display', () => {
    it('shows masked value count', () => {
      renderToast({ count: 3 });
      expect(screen.getByText('Restore 3 masked values?')).toBeTruthy();
    });

    it('shows singular for one value', () => {
      renderToast({ count: 1 });
      expect(screen.getByText('Restore 1 masked value?')).toBeTruthy();
    });

    it('shows countdown starting at 8s', () => {
      renderToast();
      expect(screen.getByText('8s')).toBeTruthy();
    });

    it('has role="alertdialog"', () => {
      const { container } = renderToast();
      expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();
    });

    it('has aria-live="polite"', () => {
      const { container } = renderToast();
      expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
    });
  });

  describe('countdown', () => {
    it('counts down over time', () => {
      renderToast();
      expect(screen.getByText('8s')).toBeTruthy();

      act(() => { vi.advanceTimersByTime(1000); });
      expect(screen.getByText('7s')).toBeTruthy();

      act(() => { vi.advanceTimersByTime(1000); });
      expect(screen.getByText('6s')).toBeTruthy();
    });

    it('calls onDecline when countdown reaches 0 (safe default)', () => {
      const onDecline = vi.fn();
      renderToast({ onDecline });

      for (let i = 0; i < 8; i++) {
        act(() => { vi.advanceTimersByTime(1000); });
      }

      expect(onDecline).toHaveBeenCalledTimes(1);
    });
  });

  describe('actions', () => {
    it('calls onAccept when Restore is clicked', () => {
      const onAccept = vi.fn();
      renderToast({ onAccept });

      fireEvent.click(screen.getByText('Restore'));
      expect(onAccept).toHaveBeenCalledTimes(1);
    });

    it('calls onDecline when Keep masked is clicked', () => {
      const onDecline = vi.fn();
      renderToast({ onDecline });

      fireEvent.click(screen.getByText('Keep masked'));
      expect(onDecline).toHaveBeenCalledTimes(1);
    });
  });
});

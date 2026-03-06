import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/preact';
import SendToast from '../../../../src/ui/widget/SendToast';

describe('SendToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  function renderToast(overrides: {
    activeCount?: number;
    paused?: boolean;
    onSendAnyway?: () => void;
    onReview?: () => void;
    onTimeout?: () => void;
  } = {}): ReturnType<typeof render> {
    return render(
      <SendToast
        activeCount={overrides.activeCount ?? 2}
        paused={overrides.paused ?? false}
        onSendAnyway={overrides.onSendAnyway ?? vi.fn()}
        onReview={overrides.onReview ?? vi.fn()}
        onTimeout={overrides.onTimeout ?? vi.fn()}
      />,
    );
  }

  describe('display', () => {
    it('shows finding count', () => {
      renderToast({ activeCount: 3 });
      expect(screen.getByText('3 unfixed findings')).toBeTruthy();
    });

    it('shows singular for one finding', () => {
      renderToast({ activeCount: 1 });
      expect(screen.getByText('1 unfixed finding')).toBeTruthy();
    });

    it('shows countdown starting at 3s', () => {
      renderToast();
      expect(screen.getByText('3s')).toBeTruthy();
    });

    it('has role="alertdialog"', () => {
      const { container } = renderToast();
      expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();
    });

    it('has aria-live="assertive"', () => {
      const { container } = renderToast();
      expect(container.querySelector('[aria-live="assertive"]')).toBeTruthy();
    });
  });

  describe('countdown', () => {
    it('counts down over time', () => {
      renderToast();
      expect(screen.getByText('3s')).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('2s')).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('1s')).toBeTruthy();
    });

    it('calls onTimeout when countdown reaches 0', () => {
      const onTimeout = vi.fn();
      renderToast({ onTimeout });

      // Advance through 3 one-second ticks
      act(() => { vi.advanceTimersByTime(1000); });
      act(() => { vi.advanceTimersByTime(1000); });
      act(() => { vi.advanceTimersByTime(1000); });

      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('pauses countdown when paused is true', () => {
      const onTimeout = vi.fn();
      const { rerender } = render(
        <SendToast
          activeCount={2}
          paused={false}
          onSendAnyway={vi.fn()}
          onReview={vi.fn()}
          onTimeout={onTimeout}
        />,
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('2s')).toBeTruthy();

      // Pause
      rerender(
        <SendToast
          activeCount={2}
          paused={true}
          onSendAnyway={vi.fn()}
          onReview={vi.fn()}
          onTimeout={onTimeout}
        />,
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should still show 2s — paused
      expect(screen.getByText('2s')).toBeTruthy();
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('actions', () => {
    it('calls onReview when Review is clicked', () => {
      const onReview = vi.fn();
      renderToast({ onReview });

      fireEvent.click(screen.getByText('Review'));
      expect(onReview).toHaveBeenCalledTimes(1);
    });

    it('calls onSendAnyway when Send Anyway is clicked', () => {
      const onSendAnyway = vi.fn();
      renderToast({ onSendAnyway });

      fireEvent.click(screen.getByText('Send Anyway'));
      expect(onSendAnyway).toHaveBeenCalledTimes(1);
    });
  });
});

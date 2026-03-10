import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup, act } from '@testing-library/preact';
import Widget from '../../../../src/ui/widget/Widget';
import { createFindingsState } from '../../../../src/content/findings-state';
import type { Finding } from '../../../../src/classifier/types';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    type: 'email',
    value: 'john@example.com',
    startIndex: 0,
    endIndex: 16,
    confidence: 'HIGH',
    label: 'Email Address',
    placeholder: '[EMAIL_1]',
    ...overrides,
  };
}

function renderWidget(
  overrides: {
    findings?: Finding[];
    onClick?: () => void;
    panelOpen?: boolean;
    maskedCount?: number;
  } = {},
): ReturnType<typeof render> {
  const state = createFindingsState();
  if (overrides.findings) {
    state.update(overrides.findings);
  }
  return render(
    <Widget
      findingsState={state}
      onClick={overrides.onClick ?? vi.fn()}
      panelOpen={overrides.panelOpen ?? false}
      maskedCount={overrides.maskedCount}
    />,
  );
}

describe('Widget', () => {
  afterEach(() => {
    cleanup();
  });

  describe('clean state', () => {
    it('renders with clean state when no findings', () => {
      const { container } = renderWidget();
      const widget = container.querySelector('.sb-widget');
      expect(widget).toBeTruthy();
      expect(widget?.classList.contains('sb-widget--clean')).toBe(true);
    });

    it('shows checkmark icon in clean state', () => {
      const { container } = renderWidget();
      expect(container.querySelector('.sb-widget__check')).toBeTruthy();
    });

    it('does not show badge in clean state', () => {
      const { container } = renderWidget();
      expect(container.querySelector('.sb-widget__badge')).toBeNull();
    });

    it('has correct aria-label in clean state', () => {
      const { container } = renderWidget();
      const widget = container.querySelector('.sb-widget');
      expect(widget?.getAttribute('aria-label')).toBe(
        'Sunbreak: no issues detected',
      );
    });
  });

  describe('findings state', () => {
    it('shows findings status when active findings exist', () => {
      const { container } = renderWidget({
        findings: [makeFinding()],
      });
      const widget = container.querySelector('.sb-widget');
      expect(widget?.classList.contains('sb-widget--findings')).toBe(true);
    });

    it('shows badge with count', () => {
      const { container } = renderWidget({
        findings: [makeFinding(), makeFinding({ value: 'jane@example.com' })],
      });
      const badge = container.querySelector('.sb-widget__badge');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toBe('2');
    });

    it('has correct aria-label with count', () => {
      const { container } = renderWidget({
        findings: [makeFinding()],
      });
      const widget = container.querySelector('.sb-widget');
      expect(widget?.getAttribute('aria-label')).toBe(
        'Sunbreak: 1 finding detected',
      );
    });

    it('pluralizes findings in aria-label', () => {
      const { container } = renderWidget({
        findings: [makeFinding(), makeFinding({ value: 'x@y.com' })],
      });
      const widget = container.querySelector('.sb-widget');
      expect(widget?.getAttribute('aria-label')).toBe(
        'Sunbreak: 2 findings detected',
      );
    });
  });

  describe('reactive updates', () => {
    it('updates badge when findings state changes', () => {
      const state = createFindingsState();
      const { container } = render(
        <Widget findingsState={state} onClick={vi.fn()} panelOpen={false} />,
      );

      // Initially clean
      expect(container.querySelector('.sb-widget__badge')).toBeNull();

      // Add a finding
      act(() => {
        state.update([makeFinding()]);
      });

      const badge = container.querySelector('.sb-widget__badge');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toBe('1');
    });

    it('returns to clean state when findings cleared', () => {
      const state = createFindingsState();
      state.update([makeFinding()]);

      const { container } = render(
        <Widget findingsState={state} onClick={vi.fn()} panelOpen={false} />,
      );

      expect(container.querySelector('.sb-widget__badge')).toBeTruthy();

      act(() => {
        state.clear();
      });

      expect(container.querySelector('.sb-widget__badge')).toBeNull();
      expect(
        container.querySelector('.sb-widget--clean'),
      ).toBeTruthy();
    });

    it('does not count fixed findings in badge', () => {
      const state = createFindingsState();
      state.update([
        makeFinding({ value: 'a@b.com' }),
        makeFinding({ value: 'c@d.com' }),
      ]);

      const { container } = render(
        <Widget findingsState={state} onClick={vi.fn()} panelOpen={false} />,
      );

      // Fix one finding
      const tracked = state.getSnapshot().tracked;
      const firstId = tracked[0];
      if (!firstId) throw new Error('no tracked finding');

      act(() => {
        state.fix(firstId.id);
      });

      const badge = container.querySelector('.sb-widget__badge');
      expect(badge?.textContent).toBe('1');
    });
  });

  describe('masked badge', () => {
    it('shows "N masked" when maskedCount > 0 and no findings', () => {
      const { container } = renderWidget({ maskedCount: 2 });
      const masked = container.querySelector('.sb-widget__masked');
      expect(masked).toBeTruthy();
      expect(masked?.textContent).toBe('2 masked');
    });

    it('shows both badge and masked count when findings and masked values exist', () => {
      const { container } = renderWidget({
        findings: [makeFinding()],
        maskedCount: 3,
      });
      expect(container.querySelector('.sb-widget__badge')).toBeTruthy();
      expect(container.querySelector('.sb-widget__masked')).toBeTruthy();
      expect(container.querySelector('.sb-widget__sep')).toBeTruthy();
    });

    it('hides checkmark when maskedCount > 0 even with no findings', () => {
      const { container } = renderWidget({ maskedCount: 1 });
      expect(container.querySelector('.sb-widget__check')).toBeNull();
    });

    it('does not show masked label when maskedCount is 0', () => {
      const { container } = renderWidget({ maskedCount: 0 });
      expect(container.querySelector('.sb-widget__masked')).toBeNull();
    });

    it('includes masked count in aria-label', () => {
      const { container } = renderWidget({ maskedCount: 2 });
      const widget = container.querySelector('.sb-widget');
      expect(widget?.getAttribute('aria-label')).toBe('Sunbreak: 2 masked');
    });

    it('includes both findings and masked in aria-label', () => {
      const { container } = renderWidget({
        findings: [makeFinding()],
        maskedCount: 3,
      });
      const widget = container.querySelector('.sb-widget');
      expect(widget?.getAttribute('aria-label')).toBe(
        'Sunbreak: 1 finding detected, 3 masked',
      );
    });
  });

  describe('interaction', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      renderWidget({ onClick });

      const widget = screen.getByRole('button');
      fireEvent.click(widget);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick on Enter key', () => {
      const onClick = vi.fn();
      renderWidget({ onClick });

      const widget = screen.getByRole('button');
      fireEvent.keyDown(widget, { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick on Space key', () => {
      const onClick = vi.fn();
      renderWidget({ onClick });

      const widget = screen.getByRole('button');
      fireEvent.keyDown(widget, { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has role="button"', () => {
      renderWidget();
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('has tabIndex=0 for keyboard focus', () => {
      const { container } = renderWidget();
      const widget = container.querySelector('.sb-widget');
      expect(widget?.getAttribute('tabindex')).toBe('0');
    });

    it('has aria-expanded reflecting panel state', () => {
      const { container } = renderWidget({ panelOpen: false });
      const widget = container.querySelector('.sb-widget');
      expect(widget?.getAttribute('aria-expanded')).toBe('false');
    });

    it('has aria-expanded=true when panel open', () => {
      const { container } = renderWidget({ panelOpen: true });
      const widget = container.querySelector('.sb-widget');
      expect(widget?.getAttribute('aria-expanded')).toBe('true');
    });

    it('has role="status" with aria-live on status area', () => {
      const { container } = renderWidget();
      const status = container.querySelector('[role="status"]');
      expect(status).toBeTruthy();
      expect(status?.getAttribute('aria-live')).toBe('polite');
    });

    it('shows Sunbreak label text', () => {
      renderWidget();
      expect(screen.getByText('Sunbreak')).toBeTruthy();
    });
  });
});

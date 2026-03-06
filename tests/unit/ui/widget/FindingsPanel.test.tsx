import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/preact';
import FindingsPanel from '../../../../src/ui/widget/FindingsPanel';
import type { TrackedFinding } from '../../../../src/content/findings-state';
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

function makeTracked(
  overrides: Partial<TrackedFinding> & { finding?: Partial<Finding> } = {},
): TrackedFinding {
  const { finding: findingOverrides, ...rest } = overrides;
  return {
    id: `tf-${Math.random().toString(36).slice(2, 6)}`,
    finding: makeFinding(findingOverrides),
    status: 'active',
    ...rest,
  };
}

function renderPanel(
  overrides: {
    tracked?: TrackedFinding[];
    activeCount?: number;
    onFix?: (id: string) => void;
    onIgnore?: (id: string) => void;
    onFixAll?: () => void;
    onClose?: () => void;
  } = {},
): ReturnType<typeof render> {
  const tracked = overrides.tracked ?? [makeTracked()];
  return render(
    <FindingsPanel
      tracked={tracked}
      activeCount={overrides.activeCount ?? tracked.filter((t) => t.status === 'active').length}
      onFix={overrides.onFix ?? vi.fn()}
      onIgnore={overrides.onIgnore ?? vi.fn()}
      onFixAll={overrides.onFixAll ?? vi.fn()}
      onClose={overrides.onClose ?? vi.fn()}
    />,
  );
}

describe('FindingsPanel', () => {
  afterEach(() => {
    cleanup();
  });

  describe('header', () => {
    it('shows finding count', () => {
      renderPanel({ activeCount: 3 });
      expect(screen.getByText('3 findings')).toBeTruthy();
    });

    it('shows singular for one finding', () => {
      renderPanel({ activeCount: 1 });
      expect(screen.getByText('1 finding')).toBeTruthy();
    });

    it('shows Fix All button when multiple active findings', () => {
      const tracked = [
        makeTracked({ id: 'a' }),
        makeTracked({ id: 'b', finding: { value: 'jane@example.com' } }),
      ];
      renderPanel({ tracked, activeCount: 2 });
      expect(screen.getByText('Fix All')).toBeTruthy();
    });

    it('hides Fix All button when only one active finding', () => {
      renderPanel({ activeCount: 1 });
      expect(screen.queryByText('Fix All')).toBeNull();
    });
  });

  describe('finding rows', () => {
    it('renders a row for each active finding', () => {
      const tracked = [
        makeTracked({ id: 'a' }),
        makeTracked({ id: 'b', finding: { value: 'jane@example.com' } }),
      ];
      renderPanel({ tracked });
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });

    it('does not render fixed findings', () => {
      const tracked = [
        makeTracked({ id: 'a', status: 'fixed' }),
        makeTracked({ id: 'b', finding: { value: 'jane@example.com' } }),
      ];
      renderPanel({ tracked, activeCount: 1 });
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(1);
    });

    it('does not render ignored findings', () => {
      const tracked = [
        makeTracked({ id: 'a', status: 'ignored' }),
        makeTracked({ id: 'b', finding: { value: 'jane@example.com' } }),
      ];
      renderPanel({ tracked, activeCount: 1 });
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(1);
    });

    it('shows truncated value for long API keys', () => {
      const tracked = [
        makeTracked({
          id: 'a',
          finding: {
            type: 'api-key',
            value: 'sk-proj-abc123def456ghi789jkl012',
            label: 'API Key',
          },
        }),
      ];
      renderPanel({ tracked });
      expect(screen.getByText('sk-pro...l012')).toBeTruthy();
    });

    it('shows full value for emails', () => {
      renderPanel();
      expect(screen.getByText('john@example.com')).toBeTruthy();
    });
  });

  describe('severity colors', () => {
    it('uses red dot for api-key findings', () => {
      const tracked = [
        makeTracked({ id: 'a', finding: { type: 'api-key' } }),
      ];
      const { container } = renderPanel({ tracked });
      expect(container.querySelector('.sb-panel__dot--red')).toBeTruthy();
    });

    it('uses orange dot for ssn findings', () => {
      const tracked = [
        makeTracked({ id: 'a', finding: { type: 'ssn' } }),
      ];
      const { container } = renderPanel({ tracked });
      expect(container.querySelector('.sb-panel__dot--orange')).toBeTruthy();
    });

    it('uses amber dot for email findings', () => {
      const { container } = renderPanel();
      expect(container.querySelector('.sb-panel__dot--amber')).toBeTruthy();
    });

    it('uses blue dot for keyword findings', () => {
      const tracked = [
        makeTracked({ id: 'a', finding: { type: 'keyword' } }),
      ];
      const { container } = renderPanel({ tracked });
      expect(container.querySelector('.sb-panel__dot--blue')).toBeTruthy();
    });
  });

  describe('actions', () => {
    it('calls onFix with finding id when Fix is clicked', () => {
      const onFix = vi.fn();
      const tracked = [makeTracked({ id: 'test-id-123' })];
      renderPanel({ tracked, onFix });

      fireEvent.click(screen.getByText('Fix'));
      expect(onFix).toHaveBeenCalledWith('test-id-123');
    });

    it('calls onIgnore with finding id when Ignore is clicked', () => {
      const onIgnore = vi.fn();
      const tracked = [makeTracked({ id: 'test-id-456' })];
      renderPanel({ tracked, onIgnore });

      fireEvent.click(screen.getByText('Ignore'));
      expect(onIgnore).toHaveBeenCalledWith('test-id-456');
    });

    it('calls onFixAll when Fix All is clicked', () => {
      const onFixAll = vi.fn();
      const tracked = [
        makeTracked({ id: 'a' }),
        makeTracked({ id: 'b', finding: { value: 'jane@example.com' } }),
      ];
      renderPanel({ tracked, activeCount: 2, onFixAll });

      fireEvent.click(screen.getByText('Fix All'));
      expect(onFixAll).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      const { container } = renderPanel({ onClose });

      const panel = container.querySelector('.sb-panel');
      if (!panel) throw new Error('panel not found');
      fireEvent.keyDown(panel, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty state', () => {
    it('shows empty message when no active findings', () => {
      const tracked = [makeTracked({ id: 'a', status: 'fixed' })];
      renderPanel({ tracked, activeCount: 0 });
      expect(screen.getByText('No active findings')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('has role="dialog"', () => {
      const { container } = renderPanel();
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });

    it('has aria-label on panel', () => {
      const { container } = renderPanel();
      const panel = container.querySelector('[role="dialog"]');
      expect(panel?.getAttribute('aria-label')).toBe('Sunbreak findings');
    });

    it('has role="list" for findings list', () => {
      renderPanel();
      expect(screen.getByRole('list')).toBeTruthy();
    });

    it('Fix button has contextual aria-label', () => {
      renderPanel();
      const fixBtn = screen.getByText('Fix');
      expect(fixBtn.getAttribute('aria-label')).toContain('Fix');
      expect(fixBtn.getAttribute('aria-label')).toContain('Email Address');
    });

    it('Ignore button has contextual aria-label', () => {
      renderPanel();
      const ignoreBtn = screen.getByText('Ignore');
      expect(ignoreBtn.getAttribute('aria-label')).toContain('Ignore');
      expect(ignoreBtn.getAttribute('aria-label')).toContain('Email Address');
    });
  });
});

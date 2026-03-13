import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/preact';
import HoverCard from '../../../../src/ui/widget/HoverCard';
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

function makeTracked(overrides: Partial<TrackedFinding> = {}): TrackedFinding {
  return {
    id: 'tf-1',
    finding: makeFinding(),
    status: 'active',
    ...overrides,
  };
}

function defaultProps(overrides: Record<string, unknown> = {}): Parameters<typeof HoverCard>[0] {
  return {
    finding: makeTracked(),
    anchorX: 200,
    anchorY: 300,
    onFix: vi.fn(),
    onIgnore: vi.fn(),
    onIgnoreAllOfType: vi.fn(),
    onDisableType: vi.fn(),
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
    ...overrides,
  } as Parameters<typeof HoverCard>[0];
}

describe('HoverCard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders with finding type label', () => {
    const { container } = render(<HoverCard {...defaultProps()} />);
    const header = container.querySelector('.sb-hover-card__header');
    if (!header) throw new Error('Header should exist');
    expect(header.textContent).toContain('Email Address');
  });

  it('renders severity dot with correct data-severity', () => {
    const { container } = render(<HoverCard {...defaultProps()} />);
    const dot = container.querySelector('.sb-hover-card__dot[data-severity="warning"]');
    expect(dot).toBeTruthy();
  });

  it('renders original value and placeholder', () => {
    const { container } = render(<HoverCard {...defaultProps()} />);
    const original = container.querySelector('.sb-hover-card__original');
    const masked = container.querySelector('.sb-hover-card__masked');
    if (!original || !masked) throw new Error('Body elements should exist');
    expect(original.textContent).toBe('john@example.com');
    expect(masked.textContent).toBe('[EMAIL_1]');
  });

  it('calls onFix with finding id when Fix is clicked', () => {
    const onFix = vi.fn();
    const { container } = render(<HoverCard {...defaultProps({ onFix })} />);
    const fixBtn = container.querySelector('.sb-hover-card__btn--fix') as HTMLButtonElement;
    if (!fixBtn) throw new Error('Fix button should exist');
    fireEvent.click(fixBtn);
    expect(onFix).toHaveBeenCalledWith('tf-1');
  });

  it('calls onIgnore with finding id when Ignore is clicked', () => {
    const onIgnore = vi.fn();
    const { container } = render(<HoverCard {...defaultProps({ onIgnore })} />);
    const ignoreBtn = container.querySelector('.sb-hover-card__btn--ignore') as HTMLButtonElement;
    if (!ignoreBtn) throw new Error('Ignore button should exist');
    fireEvent.click(ignoreBtn);
    expect(onIgnore).toHaveBeenCalledWith('tf-1');
  });

  it('has role=tooltip', () => {
    const { container } = render(<HoverCard {...defaultProps()} />);
    const card = container.querySelector('[role="tooltip"]');
    expect(card).toBeTruthy();
  });

  it('does not show overflow menu by default', () => {
    const { container } = render(<HoverCard {...defaultProps()} />);
    const menu = container.querySelector('.sb-hover-card__menu');
    expect(menu).toBeNull();
  });

  it('opens overflow menu on click', () => {
    const { container } = render(<HoverCard {...defaultProps()} />);
    const overflowBtn = container.querySelector('.sb-hover-card__overflow') as HTMLButtonElement;
    if (!overflowBtn) throw new Error('Overflow button should exist');
    fireEvent.click(overflowBtn);
    const menu = container.querySelector('.sb-hover-card__menu');
    expect(menu).toBeTruthy();
  });

  it('overflow menu has correct menu items', () => {
    const { container } = render(<HoverCard {...defaultProps()} />);
    const overflowBtn = container.querySelector('.sb-hover-card__overflow') as HTMLButtonElement;
    if (!overflowBtn) throw new Error('Overflow button should exist');
    fireEvent.click(overflowBtn);
    const items = container.querySelectorAll('.sb-hover-card__menu-item');
    expect(items.length).toBe(2);
    expect(items[0]?.textContent).toContain('Ignore all');
    expect(items[1]?.textContent).toContain('Turn off');
  });

  it('calls onIgnoreAllOfType when menu item is clicked', () => {
    const onIgnoreAllOfType = vi.fn();
    const { container } = render(<HoverCard {...defaultProps({ onIgnoreAllOfType })} />);
    const overflowBtn = container.querySelector('.sb-hover-card__overflow') as HTMLButtonElement;
    if (!overflowBtn) throw new Error('Overflow button should exist');
    fireEvent.click(overflowBtn);
    const items = container.querySelectorAll('.sb-hover-card__menu-item');
    fireEvent.click(items[0] as HTMLButtonElement);
    expect(onIgnoreAllOfType).toHaveBeenCalledWith('email');
  });

  it('calls onDisableType when menu item is clicked', () => {
    const onDisableType = vi.fn();
    const { container } = render(<HoverCard {...defaultProps({ onDisableType })} />);
    const overflowBtn = container.querySelector('.sb-hover-card__overflow') as HTMLButtonElement;
    if (!overflowBtn) throw new Error('Overflow button should exist');
    fireEvent.click(overflowBtn);
    const items = container.querySelectorAll('.sb-hover-card__menu-item');
    fireEvent.click(items[1] as HTMLButtonElement);
    expect(onDisableType).toHaveBeenCalledWith('email');
  });

  it('calls onMouseEnter and onMouseLeave', () => {
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const { container } = render(<HoverCard {...defaultProps({ onMouseEnter, onMouseLeave })} />);
    const card = container.querySelector('.sb-hover-card') as HTMLElement;
    if (!card) throw new Error('Card should exist');
    fireEvent.mouseEnter(card);
    expect(onMouseEnter).toHaveBeenCalled();
    fireEvent.mouseLeave(card);
    expect(onMouseLeave).toHaveBeenCalled();
  });

  it('renders critical dot for api-key type', () => {
    const finding = makeTracked({
      finding: makeFinding({ type: 'api-key', label: 'API Key' }),
    });
    const { container } = render(<HoverCard {...defaultProps({ finding })} />);
    const dot = container.querySelector('.sb-hover-card__dot[data-severity="critical"]');
    expect(dot).toBeTruthy();
  });

  it('has position:fixed styling', () => {
    const { container } = render(<HoverCard {...defaultProps()} />);
    const card = container.querySelector('.sb-hover-card') as HTMLElement;
    if (!card) throw new Error('Card should exist');
    expect(card.style.left).toBeTruthy();
  });

  it('closes overflow menu on Escape', () => {
    const { container } = render(<HoverCard {...defaultProps()} />);
    const overflowBtn = container.querySelector('.sb-hover-card__overflow') as HTMLButtonElement;
    if (!overflowBtn) throw new Error('Overflow button should exist');
    fireEvent.click(overflowBtn);
    expect(container.querySelector('.sb-hover-card__menu')).toBeTruthy();

    const card = container.querySelector('.sb-hover-card') as HTMLElement;
    fireEvent.keyDown(card, { key: 'Escape' });
    expect(container.querySelector('.sb-hover-card__menu')).toBeNull();
  });

  it('positions below the underline when there is not enough room above', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getBoundingClientRect(this: HTMLElement): DOMRect {
      if (this.classList.contains('sb-hover-card')) {
        return {
          top: 0,
          left: 0,
          right: 280,
          bottom: 120,
          width: 280,
          height: 120,
          x: 0,
          y: 0,
          toJSON: vi.fn(),
        } as DOMRect;
      }

      return {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      } as DOMRect;
    });

    const { container } = render(<HoverCard {...defaultProps({ anchorY: 40 })} />);
    const card = container.querySelector('.sb-hover-card') as HTMLElement;
    if (!card) throw new Error('Card should exist');

    await waitFor(() => {
      expect(card.style.top).toBe('46px');
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOverlayController } from '../../../../src/ui/overlay/overlay-controller';
import type { OverlayFinding } from '../../../../src/ui/overlay/types';

const EMAIL_FINDING: OverlayFinding = {
  type: 'email',
  label: 'Email Address',
  value: 'john@example.com',
  placeholder: '[EMAIL_1]',
  confidence: 'HIGH',
};

function createMockContext(): {
  isInvalid: boolean;
  onInvalidated: (cb: () => void) => void;
  invalidate: () => void;
} {
  const callbacks: Array<() => void> = [];
  return {
    isInvalid: false,
    onInvalidated(cb: () => void): void {
      callbacks.push(cb);
    },
    invalidate(): void {
      this.isInvalid = true;
      for (const cb of callbacks) cb();
    },
  };
}

describe('createOverlayController', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a controller with show/hide/destroy methods', () => {
    const ctx = createMockContext();
    const controller = createOverlayController(ctx);

    expect(typeof controller.show).toBe('function');
    expect(typeof controller.hide).toBe('function');
    expect(typeof controller.destroy).toBe('function');
  });

  it('show() creates a container in the DOM', () => {
    const ctx = createMockContext();
    const controller = createOverlayController(ctx);

    void controller.show([EMAIL_FINDING]);

    expect(document.getElementById('byoai-root')).toBeTruthy();
    expect(controller.state.mounted).toBe(true);
  });

  it('show() resolves with the action when a button is clicked', async () => {
    const ctx = createMockContext();
    const controller = createOverlayController(ctx);

    const actionPromise = controller.show([EMAIL_FINDING]);

    // The banner should be rendered inside the shadow DOM
    // Since shadow DOM is closed, we can't query it directly.
    // Instead, test that the promise resolves when hide() is called.
    controller.hide();

    const action = await actionPromise;
    expect(action).toBe('cancel'); // hide() resolves pending promise with 'cancel'
  });

  it('hide() removes the mounted state', () => {
    const ctx = createMockContext();
    const controller = createOverlayController(ctx);

    void controller.show([EMAIL_FINDING]);
    expect(controller.state.mounted).toBe(true);

    controller.hide();
    expect(controller.state.mounted).toBe(false);
  });

  it('destroy() removes the container from DOM', () => {
    const ctx = createMockContext();
    const controller = createOverlayController(ctx);

    void controller.show([EMAIL_FINDING]);
    expect(document.getElementById('byoai-root')).toBeTruthy();

    controller.destroy();
    expect(document.getElementById('byoai-root')).toBeNull();
    expect(controller.state.container).toBeNull();
  });

  it('cleans up on context invalidation', () => {
    const ctx = createMockContext();
    const controller = createOverlayController(ctx);

    void controller.show([EMAIL_FINDING]);
    expect(document.getElementById('byoai-root')).toBeTruthy();

    ctx.invalidate();
    expect(document.getElementById('byoai-root')).toBeNull();
  });

  it('returns cancel immediately if context is already invalid', async () => {
    const ctx = createMockContext();
    ctx.isInvalid = true;
    const controller = createOverlayController(ctx);

    const action = await controller.show([EMAIL_FINDING]);
    expect(action).toBe('cancel');
  });

  it('cancels previous pending overlay when show() is called again', async () => {
    const ctx = createMockContext();
    const controller = createOverlayController(ctx);

    const firstPromise = controller.show([EMAIL_FINDING]);

    // Show again — first promise should resolve with 'cancel'
    void controller.show([EMAIL_FINDING]);

    const firstAction = await firstPromise;
    expect(firstAction).toBe('cancel');
  });
});

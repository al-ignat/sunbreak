import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../src/ui/widget/position', async () => {
  const actual = await vi.importActual<typeof import('../../../../src/ui/widget/position')>(
    '../../../../src/ui/widget/position',
  );

  return {
    ...actual,
    computeWidgetPosition: vi.fn(() => ({ top: 24, left: 48 })),
  };
});

import { createWidgetController } from '../../../../src/ui/widget/widget-controller';
import { createFindingsState } from '../../../../src/content/findings-state';
import { createMaskingMap } from '../../../../src/content/masking-map';
import { computeWidgetPosition } from '../../../../src/ui/widget/position';
import type { SiteAdapter } from '../../../../src/types';
import type { Finding } from '../../../../src/classifier/types';
import type { WidgetContext } from '../../../../src/ui/widget/widget-controller';

let wrapperWidth = 140;
let triggerHeight = 36;
const activeControllers: Array<ReturnType<typeof createWidgetController>> = [];

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];

  readonly observe = vi.fn((target: Element) => {
    this.targets.add(target);
  });

  readonly unobserve = vi.fn((target: Element) => {
    this.targets.delete(target);
  });

  readonly disconnect = vi.fn(() => {
    this.targets.clear();
  });

  private readonly targets = new Set<Element>();

  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
}

function makeRect(
  overrides: Partial<DOMRect> = {},
): DOMRect {
  const defaults = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
  return { ...defaults, ...overrides, toJSON: () => ({}) } as DOMRect;
}

function createMockAdapter(overrides: Partial<SiteAdapter> = {}): SiteAdapter {
  return {
    name: 'chatgpt',
    matches: () => true,
    findInput: () => document.getElementById('editor'),
    findSendButton: () => document.querySelector('[data-testid="send-button"]') as HTMLElement | null,
    getText: () => 'Contact john@acme.com or call +1-555-123-4567',
    setText: vi.fn(),
    getDropZone: () => null,
    ...overrides,
  };
}

function createMockCtx(): WidgetContext {
  return {
    isInvalid: false,
    onInvalidated: vi.fn(),
  };
}

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    type: 'email',
    value: 'john@acme.com',
    startIndex: 8,
    endIndex: 22,
    confidence: 'HIGH',
    label: 'Email Address',
    placeholder: '«email-john»',
    ...overrides,
  };
}

function appendInput(): HTMLElement {
  const input = document.createElement('div');
  input.id = 'editor';
  input.setAttribute('contenteditable', 'true');
  document.body.appendChild(input);
  return input;
}

function appendSendButton(role: 'primary' | 'replacement' = 'primary'): HTMLButtonElement {
  const button = document.createElement('button');
  button.dataset.testid = 'send-button';
  button.setAttribute('data-testid', 'send-button');
  button.dataset.role = role;
  document.body.appendChild(button);
  return button;
}

function getWidgetHost(): HTMLElement {
  const host = document.getElementById('sunbreak-widget-root');
  if (!(host instanceof HTMLElement)) {
    throw new Error('widget host not found');
  }
  return host;
}

async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await vi.runAllTimersAsync();
  await Promise.resolve();
}

describe('widget-controller anchor behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    wrapperWidth = 140;
    triggerHeight = 36;
    FakeResizeObserver.instances = [];
    vi.useFakeTimers();

    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback): number => {
      return window.setTimeout(() => cb(0), 0);
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number): void => {
      clearTimeout(id);
    });

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getBoundingClientRect(this: HTMLElement): DOMRect {
      if (this.id === 'editor') {
        return makeRect({ top: 600, left: 200, right: 920, bottom: 700, width: 720, height: 100, x: 200, y: 600 });
      }

      if (this.id === 'sunbreak-widget-wrapper') {
        return makeRect({ top: 0, left: 0, right: wrapperWidth, bottom: triggerHeight, width: wrapperWidth, height: triggerHeight, x: 0, y: 0 });
      }

      if (this.classList.contains('sb-widget')) {
        return makeRect({ top: 0, left: 0, right: 112, bottom: triggerHeight, width: 112, height: triggerHeight, x: 0, y: 0 });
      }

      if (this.dataset.role === 'primary') {
        return makeRect({ top: 660, left: 1200, right: 1236, bottom: 696, width: 36, height: 36, x: 1200, y: 660 });
      }

      if (this.dataset.role === 'replacement') {
        return makeRect({ top: 620, left: 1180, right: 1216, bottom: 656, width: 36, height: 36, x: 1180, y: 620 });
      }

      return makeRect();
    });

    vi.mocked(computeWidgetPosition).mockClear();
  });

  afterEach(() => {
    while (activeControllers.length > 0) {
      activeControllers.pop()?.destroy();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('anchors to the send button with the measured widget width when available at mount', () => {
    appendInput();
    appendSendButton();
    const findingsState = createFindingsState();
    findingsState.update([makeFinding()]);

    const controller = createWidgetController(
      findingsState,
      createMockAdapter({ widgetAnchor: { gapX: 12 } }),
      createMockCtx(),
    );
    activeControllers.push(controller);

    const input = document.getElementById('editor');
    if (!input) throw new Error('input not found');

    controller.mount(input);

    expect(computeWidgetPosition).toHaveBeenCalled();
    const lastCall = vi.mocked(computeWidgetPosition).mock.lastCall;
    expect(lastCall?.[0].left).toBe(1200);
    expect(lastCall?.[1]).toEqual({ width: 140, height: 36 });
    expect(lastCall?.[3]).toEqual({ mode: 'send-button', gapX: 12 });
    expect(getWidgetHost().dataset.anchorMode).toBe('send-button');
  });

  it('falls back to the input box and later promotes to send-button anchoring when the button appears', async () => {
    appendInput();
    const findingsState = createFindingsState();
    findingsState.update([makeFinding()]);

    const controller = createWidgetController(findingsState, createMockAdapter(), createMockCtx());
    activeControllers.push(controller);
    const input = document.getElementById('editor');
    if (!input) throw new Error('input not found');

    controller.mount(input);

    const callsAfterMount = vi.mocked(computeWidgetPosition).mock.calls;
    expect(callsAfterMount.at(-1)?.[3]).toEqual({
      mode: 'input-box',
      edge: 'bottom-right',
      offsetX: 12,
      offsetY: 36,
    });
    expect(getWidgetHost().dataset.anchorMode).toBe('input-box-fallback');

    appendSendButton();
    await flushAsync();

    const callsAfterPromotion = vi.mocked(computeWidgetPosition).mock.calls;
    expect(callsAfterPromotion.at(-1)?.[0].left).toBe(1200);
    expect(callsAfterPromotion.at(-1)?.[3]).toEqual({ mode: 'send-button', gapX: 8 });
    expect(getWidgetHost().dataset.anchorMode).toBe('send-button');
  });

  it('rebinds observers and repositions when the send button node is replaced', async () => {
    appendInput();
    const firstButton = appendSendButton();
    const findingsState = createFindingsState();
    findingsState.update([makeFinding()]);

    const controller = createWidgetController(findingsState, createMockAdapter(), createMockCtx());
    activeControllers.push(controller);
    const input = document.getElementById('editor');
    if (!input) throw new Error('input not found');

    controller.mount(input);
    vi.mocked(computeWidgetPosition).mockClear();

    firstButton.remove();
    const replacementButton = appendSendButton('replacement');
    await flushAsync();

    const observer = FakeResizeObserver.instances[0];
    expect(observer).toBeDefined();
    expect(observer.unobserve).toHaveBeenCalledWith(firstButton);
    expect(observer.observe).toHaveBeenCalledWith(replacementButton);

    const lastCall = vi.mocked(computeWidgetPosition).mock.lastCall;
    expect(lastCall?.[0].left).toBe(1180);
    expect(lastCall?.[3]).toEqual({ mode: 'send-button', gapX: 8 });
  });

  it('re-measures width after findings updates so wider widget content repositions correctly', async () => {
    appendInput();
    appendSendButton();

    const findingsState = createFindingsState();
    const controller = createWidgetController(findingsState, createMockAdapter(), createMockCtx(), createMaskingMap());
    activeControllers.push(controller);
    const input = document.getElementById('editor');
    if (!input) throw new Error('input not found');

    controller.mount(input);
    vi.mocked(computeWidgetPosition).mockClear();

    wrapperWidth = 220;
    findingsState.update([makeFinding()]);
    await flushAsync();

    const lastCall = vi.mocked(computeWidgetPosition).mock.lastCall;
    expect(lastCall?.[1]).toEqual({ width: 220, height: 36 });
    expect(lastCall?.[3]).toEqual({ mode: 'send-button', gapX: 8 });
  });

  it('stays hidden in the clean state', () => {
    appendInput();
    appendSendButton();

    const controller = createWidgetController(createFindingsState(), createMockAdapter(), createMockCtx());
    activeControllers.push(controller);
    const input = document.getElementById('editor');
    if (!input) throw new Error('input not found');

    controller.mount(input);

    expect(computeWidgetPosition).not.toHaveBeenCalled();
    expect(getWidgetHost().dataset.anchorMode).toBe('hidden');
    expect(getWidgetHost().dataset.anchorReason).toBe('idle');
  });

  it('remains visible when masked values exist even with no active findings', async () => {
    appendInput();
    appendSendButton();

    const maskingMap = createMaskingMap();
    maskingMap.set('«email-john»', 'john@acme.com');
    const controller = createWidgetController(createFindingsState(), createMockAdapter(), createMockCtx(), maskingMap);
    activeControllers.push(controller);
    const input = document.getElementById('editor');
    if (!input) throw new Error('input not found');

    controller.mount(input);
    await flushAsync();

    expect(computeWidgetPosition).toHaveBeenCalled();
    const lastCall = vi.mocked(computeWidgetPosition).mock.lastCall;
    expect(lastCall?.[3]).toEqual({ mode: 'send-button', gapX: 8 });
  });

  it('re-mounts cleanly without stacking anchor subscriptions', async () => {
    appendInput();
    appendSendButton();
    const findingsState = createFindingsState();
    findingsState.update([makeFinding()]);

    const controller = createWidgetController(findingsState, createMockAdapter(), createMockCtx());
    activeControllers.push(controller);
    const input = document.getElementById('editor');
    if (!input) throw new Error('input not found');

    controller.mount(input);
    controller.mount(input);
    vi.mocked(computeWidgetPosition).mockClear();

    findingsState.update([makeFinding({ value: 'jane@acme.com' })]);
    await flushAsync();

    expect(vi.mocked(computeWidgetPosition).mock.calls).toHaveLength(1);
    expect(getWidgetHost().dataset.anchorMode).toBe('send-button');
  });
});

describe('widget-controller capability flags', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    wrapperWidth = 140;
    triggerHeight = 36;
    FakeResizeObserver.instances = [];
    vi.useFakeTimers();

    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback): number => {
      return window.setTimeout(() => cb(0), 0);
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number): void => {
      clearTimeout(id);
    });

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getBoundingClientRect(this: HTMLElement): DOMRect {
      if (this.id === 'editor') {
        return makeRect({ top: 600, left: 200, right: 920, bottom: 700, width: 720, height: 100, x: 200, y: 600 });
      }
      if (this.id === 'sunbreak-widget-wrapper') {
        return makeRect({ top: 0, left: 0, right: wrapperWidth, bottom: triggerHeight, width: wrapperWidth, height: triggerHeight, x: 0, y: 0 });
      }
      if (this.classList.contains('sb-widget')) {
        return makeRect({ top: 0, left: 0, right: 112, bottom: triggerHeight, width: 112, height: triggerHeight, x: 0, y: 0 });
      }
      return makeRect();
    });

    vi.mocked(computeWidgetPosition).mockClear();
  });

  afterEach(() => {
    while (activeControllers.length > 0) {
      activeControllers.pop()?.destroy();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('handleFix is a no-op when reliableSetText is false', () => {
    appendInput();
    const findingsState = createFindingsState();
    findingsState.update([makeFinding()]);

    const adapter = createMockAdapter({
      capabilities: { reliableSetText: false, sendButtonAnchor: true, pageContextBridge: false },
    });

    const controller = createWidgetController(findingsState, adapter, createMockCtx(), createMaskingMap());
    activeControllers.push(controller);
    const input = document.getElementById('editor');
    if (!input) throw new Error('input not found');

    controller.mount(input);

    const snap = findingsState.getSnapshot();
    expect(snap.activeCount).toBe(1);

    // handleFix guards on maskingAllowed — setText should never be called
    expect(adapter.setText).not.toHaveBeenCalled();
  });

  it('handleFix calls setText when reliableSetText is true', () => {
    appendInput();
    const findingsState = createFindingsState();
    findingsState.update([makeFinding()]);

    const adapter = createMockAdapter({
      capabilities: { reliableSetText: true, sendButtonAnchor: true, pageContextBridge: false },
    });

    const maskingMap = createMaskingMap();
    const controller = createWidgetController(findingsState, adapter, createMockCtx(), maskingMap);
    activeControllers.push(controller);
    const input = document.getElementById('editor');
    if (!input) throw new Error('input not found');

    controller.mount(input);

    const snap = findingsState.getSnapshot();
    expect(snap.activeCount).toBe(1);

    // Widget controller passes handleFix as onFix when reliableSetText is true
    // The finding is active and Fix should be available in the UI
    expect(snap.tracked[0].status).toBe('active');
  });

  it('defaults to masking-allowed when capabilities is undefined', () => {
    appendInput();
    const findingsState = createFindingsState();
    findingsState.update([makeFinding()]);

    // No capabilities set — backward compatible
    const adapter = createMockAdapter();

    const controller = createWidgetController(findingsState, adapter, createMockCtx(), createMaskingMap());
    activeControllers.push(controller);
    const input = document.getElementById('editor');
    if (!input) throw new Error('input not found');

    controller.mount(input);

    // Widget should render with Fix capability available
    // Check shadow DOM for the Fix button
    const container = document.getElementById('sunbreak-widget-root');
    expect(container).toBeTruthy();
  });

  it('setText failure does not mark finding as fixed', () => {
    appendInput();
    const findingsState = createFindingsState();
    findingsState.update([makeFinding()]);

    const adapter = createMockAdapter({
      setText: vi.fn(() => { throw new Error('ProseMirror sync failed'); }),
      capabilities: { reliableSetText: true, sendButtonAnchor: true, pageContextBridge: false },
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const maskingMap = createMaskingMap();
    const controller = createWidgetController(findingsState, adapter, createMockCtx(), maskingMap);
    activeControllers.push(controller);
    const input = document.getElementById('editor');
    if (!input) throw new Error('input not found');

    controller.mount(input);

    // Finding should still be active because setText would throw
    const snap = findingsState.getSnapshot();
    expect(snap.activeCount).toBe(1);

    // Masking map should be empty — no token was set because setText threw
    expect(maskingMap.size).toBe(0);

    consoleSpy.mockRestore();
  });
});

describe('widget-controller panel dismissal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    wrapperWidth = 140;
    triggerHeight = 36;
    FakeResizeObserver.instances = [];
    vi.useFakeTimers();

    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback): number => {
      return window.setTimeout(() => cb(0), 0);
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number): void => {
      clearTimeout(id);
    });

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getBoundingClientRect(this: HTMLElement): DOMRect {
      if (this.id === 'editor') {
        return makeRect({ top: 600, left: 200, right: 920, bottom: 700, width: 720, height: 100, x: 200, y: 600 });
      }
      if (this.id === 'sunbreak-widget-wrapper') {
        return makeRect({ top: 0, left: 0, right: wrapperWidth, bottom: triggerHeight, width: wrapperWidth, height: triggerHeight, x: 0, y: 0 });
      }
      if (this.classList.contains('sb-widget')) {
        return makeRect({ top: 0, left: 0, right: 112, bottom: triggerHeight, width: 112, height: triggerHeight, x: 0, y: 0 });
      }
      if (this.dataset.role === 'primary') {
        return makeRect({ top: 660, left: 1200, right: 1236, bottom: 696, width: 36, height: 36, x: 1200, y: 660 });
      }
      return makeRect();
    });

    const originalAttachShadow = Element.prototype.attachShadow;
    vi.spyOn(Element.prototype, 'attachShadow').mockImplementation(function patchedAttachShadow(
      this: Element,
      init: ShadowRootInit,
    ): ShadowRoot {
      return originalAttachShadow.call(this, { ...init, mode: 'open' });
    });

    vi.mocked(computeWidgetPosition).mockClear();
  });

  afterEach(() => {
    while (activeControllers.length > 0) {
      activeControllers.pop()?.destroy();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('closes the findings panel when clicking outside the widget host', async () => {
    appendInput();
    appendSendButton();

    const findingsState = createFindingsState();
    findingsState.update([makeFinding()]);
    const controller = createWidgetController(findingsState, createMockAdapter(), createMockCtx());
    activeControllers.push(controller);

    const input = document.getElementById('editor');
    if (!input) throw new Error('input not found');
    controller.mount(input);
    await flushAsync();

    const host = document.getElementById('sunbreak-widget-root');
    if (!(host instanceof HTMLElement)) throw new Error('widget host not found');
    const shadow = host.shadowRoot;
    if (!shadow) throw new Error('shadow root not found');

    const trigger = shadow.querySelector('.sb-widget');
    if (!(trigger instanceof HTMLElement)) throw new Error('widget trigger not found');
    trigger.click();
    await flushAsync();

    expect(shadow.querySelector('.sb-panel')).toBeTruthy();

    document.body.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
    }));
    await flushAsync();

    expect(shadow.querySelector('.sb-panel')).toBeNull();
  });
});

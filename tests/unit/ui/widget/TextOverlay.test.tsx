import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/preact';
import TextOverlay from '../../../../src/ui/widget/TextOverlay';
import type { TextOverlayHandle } from '../../../../src/ui/widget/TextOverlay';
import { createFindingsState } from '../../../../src/content/findings-state';
import type { FindingsState } from '../../../../src/content/findings-state';
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

function createEditorWithText(text: string): HTMLDivElement {
  const editor = document.createElement('div');
  editor.setAttribute('contenteditable', 'true');
  editor.textContent = text;
  document.body.appendChild(editor);
  return editor;
}

describe('TextOverlay', () => {
  let findingsState: FindingsState;
  let editor: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    findingsState = createFindingsState();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback): number => {
      cb(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((): void => {});
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders nothing when no active findings', () => {
    editor = createEditorWithText('hello world');
    const { container } = render(
      <TextOverlay
        findingsState={findingsState}
        editorEl={editor}
      />,
    );
    expect(container.querySelector('.sb-text-overlay')).toBeNull();
  });

  it('renders nothing when editorEl is null', () => {
    findingsState.update([makeFinding()]);
    const { container } = render(
      <TextOverlay
        findingsState={findingsState}
        editorEl={null}
      />,
    );
    expect(container.querySelector('.sb-text-overlay')).toBeNull();
  });

  it('renders overlay container when active findings exist', () => {
    editor = createEditorWithText('john@example.com is here');

    // Mock getClientRects and getBoundingClientRect for jsdom
    const mockRect = { top: 10, left: 20, width: 100, height: 14, bottom: 24, right: 120, x: 20, y: 10, toJSON: vi.fn() };
    Range.prototype.getClientRects = vi.fn(() => [mockRect] as unknown as DOMRectList);
    editor.getBoundingClientRect = vi.fn(() => ({ top: 0, left: 0, width: 400, height: 200, bottom: 200, right: 400, x: 0, y: 0, toJSON: vi.fn() }));

    findingsState.update([makeFinding()]);

    const { container } = render(
      <TextOverlay
        findingsState={findingsState}
        editorEl={editor}
      />,
    );

    const overlay = container.querySelector('.sb-text-overlay');
    expect(overlay).toBeTruthy();
  });

  it('renders underline divs for each finding rect', () => {
    editor = createEditorWithText('john@example.com is here');

    const mockRect1 = { top: 10, left: 20, width: 80, height: 14, bottom: 24, right: 100, x: 20, y: 10, toJSON: vi.fn() };
    const mockRect2 = { top: 28, left: 20, width: 40, height: 14, bottom: 42, right: 60, x: 20, y: 28, toJSON: vi.fn() };
    Range.prototype.getClientRects = vi.fn(() => [mockRect1, mockRect2] as unknown as DOMRectList);
    editor.getBoundingClientRect = vi.fn(() => ({ top: 0, left: 0, width: 400, height: 200, bottom: 200, right: 400, x: 0, y: 0, toJSON: vi.fn() }));

    findingsState.update([makeFinding()]);

    const { container } = render(
      <TextOverlay
        findingsState={findingsState}
        editorEl={editor}
      />,
    );

    const underlines = container.querySelectorAll('.sb-underline');
    expect(underlines.length).toBe(2);
  });

  it('clears underlines when findings are fixed', () => {
    editor = createEditorWithText('john@example.com is here');

    const mockRect = { top: 10, left: 20, width: 100, height: 14, bottom: 24, right: 120, x: 20, y: 10, toJSON: vi.fn() };
    Range.prototype.getClientRects = vi.fn(() => [mockRect] as unknown as DOMRectList);
    editor.getBoundingClientRect = vi.fn(() => ({ top: 0, left: 0, width: 400, height: 200, bottom: 200, right: 400, x: 0, y: 0, toJSON: vi.fn() }));

    findingsState.update([makeFinding()]);

    const { container } = render(
      <TextOverlay
        findingsState={findingsState}
        editorEl={editor}
      />,
    );

    expect(container.querySelectorAll('.sb-underline').length).toBe(1);

    // Fix the finding
    const snap = findingsState.getSnapshot();
    const id = snap.tracked[0]?.id;
    if (!id) throw new Error('No tracked finding');
    act(() => {
      findingsState.fix(id);
    });

    expect(container.querySelectorAll('.sb-underline').length).toBe(0);
  });

  it('exposes findingAtPoint handle', () => {
    editor = createEditorWithText('john@example.com is here');

    const mockRect = { top: 10, left: 20, width: 100, height: 14, bottom: 24, right: 120, x: 20, y: 10, toJSON: vi.fn() };
    Range.prototype.getClientRects = vi.fn(() => [mockRect] as unknown as DOMRectList);
    editor.getBoundingClientRect = vi.fn(() => ({ top: 0, left: 0, width: 400, height: 200, bottom: 200, right: 400, x: 0, y: 0, toJSON: vi.fn() }));

    findingsState.update([makeFinding()]);

    let handle: TextOverlayHandle | null = null;
    render(
      <TextOverlay
        findingsState={findingsState}
        editorEl={editor}
        onHandleReady={(h) => { handle = h; }}
      />,
    );

    if (!handle) throw new Error('Handle should not be null');
    expect(typeof handle.findingAtPoint).toBe('function');
  });

  it('has pointer-events:none on overlay container', () => {
    editor = createEditorWithText('john@example.com is here');

    const mockRect = { top: 10, left: 20, width: 100, height: 14, bottom: 24, right: 120, x: 20, y: 10, toJSON: vi.fn() };
    Range.prototype.getClientRects = vi.fn(() => [mockRect] as unknown as DOMRectList);
    editor.getBoundingClientRect = vi.fn(() => ({ top: 0, left: 0, width: 400, height: 200, bottom: 200, right: 400, x: 0, y: 0, toJSON: vi.fn() }));

    findingsState.update([makeFinding()]);

    const { container } = render(
      <TextOverlay
        findingsState={findingsState}
        editorEl={editor}
      />,
    );

    const overlay = container.querySelector('.sb-text-overlay') as HTMLElement;
    expect(overlay.style.pointerEvents).toBe('none');
  });

  it('recalculates overlay position on scroll-driven layout changes without new findings', () => {
    editor = createEditorWithText('john@example.com is here');

    let editorRect = {
      top: 0,
      left: 0,
      width: 400,
      height: 200,
      bottom: 200,
      right: 400,
      x: 0,
      y: 0,
    };
    let underlineRect = {
      top: 10,
      left: 20,
      width: 100,
      height: 14,
      bottom: 24,
      right: 120,
      x: 20,
      y: 10,
    };

    Range.prototype.getClientRects = vi.fn(
      () => [{ ...underlineRect, toJSON: vi.fn() }] as unknown as DOMRectList,
    );
    editor.getBoundingClientRect = vi.fn(
      () => ({ ...editorRect, toJSON: vi.fn() }) as DOMRect,
    );

    findingsState.update([makeFinding()]);

    const { container } = render(
      <TextOverlay
        findingsState={findingsState}
        editorEl={editor}
      />,
    );

    const overlayBefore = container.querySelector('.sb-text-overlay') as HTMLElement;
    const underlineBefore = container.querySelector('.sb-underline') as HTMLElement;
    expect(overlayBefore.style.top).toBe('0px');
    expect(underlineBefore.style.top).toBe('24px');

    editorRect = {
      ...editorRect,
      top: 50,
      bottom: 250,
      y: 50,
    };
    underlineRect = {
      ...underlineRect,
      top: 60,
      bottom: 74,
      y: 60,
    };

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    const overlayAfter = container.querySelector('.sb-text-overlay') as HTMLElement;
    const underlineAfter = container.querySelector('.sb-underline') as HTMLElement;
    expect(overlayAfter.style.top).toBe('50px');
    expect(underlineAfter.style.top).toBe('24px');
  });

  it('clips overlay bounds and underlines to the visible composer viewport', () => {
    const parent = document.createElement('div');
    parent.style.overflow = 'hidden';
    document.body.appendChild(parent);

    editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    editor.textContent = 'john@example.com';
    parent.appendChild(editor);

    parent.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 50,
      right: 250,
      bottom: 180,
      width: 200,
      height: 80,
      x: 50,
      y: 100,
      toJSON: vi.fn(),
    }));
    editor.getBoundingClientRect = vi.fn(() => ({
      top: 60,
      left: 20,
      right: 420,
      bottom: 260,
      width: 400,
      height: 200,
      x: 20,
      y: 60,
      toJSON: vi.fn(),
    }));
    Range.prototype.getClientRects = vi.fn(() => ([
      {
        top: 120,
        left: 70,
        right: 230,
        bottom: 134,
        width: 160,
        height: 14,
        x: 70,
        y: 120,
        toJSON: vi.fn(),
      },
      {
        top: 190,
        left: 70,
        right: 230,
        bottom: 204,
        width: 160,
        height: 14,
        x: 70,
        y: 190,
        toJSON: vi.fn(),
      },
    ]) as unknown as DOMRectList);

    findingsState.update([makeFinding()]);

    const { container } = render(
      <TextOverlay
        findingsState={findingsState}
        editorEl={editor}
      />,
    );

    const overlay = container.querySelector('.sb-text-overlay') as HTMLElement;
    const underlines = container.querySelectorAll('.sb-underline');
    expect(overlay.style.top).toBe('100px');
    expect(overlay.style.left).toBe('50px');
    expect(overlay.style.width).toBe('200px');
    expect(overlay.style.height).toBe('80px');
    expect(underlines).toHaveLength(1);
  });

  it('recalculates underline placement when the editor DOM mutates', async () => {
    editor = createEditorWithText('john@example.com is here');

    let underlineRect = {
      top: 10,
      left: 20,
      width: 100,
      height: 14,
      bottom: 24,
      right: 120,
      x: 20,
      y: 10,
    };

    Range.prototype.getClientRects = vi.fn(
      () => [{ ...underlineRect, toJSON: vi.fn() }] as unknown as DOMRectList,
    );
    editor.getBoundingClientRect = vi.fn(() => ({
      top: 0,
      left: 0,
      width: 400,
      height: 200,
      bottom: 200,
      right: 400,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    }));

    findingsState.update([makeFinding()]);

    const { container } = render(
      <TextOverlay
        findingsState={findingsState}
        editorEl={editor}
      />,
    );

    const underlineBefore = container.querySelector('.sb-underline') as HTMLElement;
    expect(underlineBefore.style.top).toBe('24px');

    underlineRect = {
      ...underlineRect,
      top: 42,
      bottom: 56,
      y: 42,
    };

    await act(async () => {
      editor.textContent = 'john@example.com is here now';
      await Promise.resolve();
    });

    const underlineAfter = container.querySelector('.sb-underline') as HTMLElement;
    expect(underlineAfter.style.top).toBe('56px');
  });

  it('clears the hover card when the hovered finding becomes inactive', () => {
    editor = createEditorWithText('john@example.com is here');

    const mockRect = { top: 10, left: 20, width: 100, height: 14, bottom: 24, right: 120, x: 20, y: 10, toJSON: vi.fn() };
    Range.prototype.getClientRects = vi.fn(() => [mockRect] as unknown as DOMRectList);
    editor.getBoundingClientRect = vi.fn(() => ({ top: 0, left: 0, width: 400, height: 200, bottom: 200, right: 400, x: 0, y: 0, toJSON: vi.fn() }));

    findingsState.update([makeFinding()]);

    const { container } = render(
      <TextOverlay
        findingsState={findingsState}
        editorEl={editor}
        onFix={vi.fn()}
        onIgnore={vi.fn()}
        onIgnoreAllOfType={vi.fn()}
        onDisableType={vi.fn()}
      />,
    );

    fireEvent.mouseMove(editor, { clientX: 60, clientY: 24 });
    expect(container.querySelector('.sb-hover-card')).toBeTruthy();

    const hoveredId = findingsState.getSnapshot().tracked[0]?.id;
    if (!hoveredId) throw new Error('hovered finding missing');

    act(() => {
      findingsState.fix(hoveredId);
    });

    expect(container.querySelector('.sb-hover-card')).toBeNull();
  });
});

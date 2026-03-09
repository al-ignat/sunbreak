import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/preact';
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
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
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
});

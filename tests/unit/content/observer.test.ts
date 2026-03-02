import { describe, it, expect, vi, beforeEach } from 'vitest';
import { selectAdapter } from '../../../src/content/sites';

describe('selectAdapter', () => {
  it('returns chatgpt adapter for chatgpt.com', () => {
    const adapter = selectAdapter('chatgpt.com');
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe('chatgpt');
  });

  it('returns claude adapter for claude.ai', () => {
    const adapter = selectAdapter('claude.ai');
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe('claude');
  });

  it('returns gemini adapter for gemini.google.com', () => {
    const adapter = selectAdapter('gemini.google.com');
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe('gemini');
  });

  it('returns null for unsupported sites', () => {
    expect(selectAdapter('google.com')).toBeNull();
    expect(selectAdapter('facebook.com')).toBeNull();
    expect(selectAdapter('')).toBeNull();
  });
});

describe('observer module integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('adapter findInput returns element when present', () => {
    const editor = document.createElement('div');
    editor.id = 'prompt-textarea';
    editor.setAttribute('contenteditable', 'true');
    document.body.appendChild(editor);

    const adapter = selectAdapter('chatgpt.com');
    expect(adapter?.findInput()).toBe(editor);
  });

  it('adapter findInput returns null when element absent', () => {
    const adapter = selectAdapter('chatgpt.com');
    expect(adapter?.findInput()).toBeNull();
  });

  it('adapters correctly extract multi-line text', () => {
    const editor = document.createElement('div');
    editor.innerHTML =
      '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>';

    const chatgpt = selectAdapter('chatgpt.com');
    expect(chatgpt?.getText(editor)).toBe(
      'First paragraph\nSecond paragraph\nThird paragraph',
    );

    const claude = selectAdapter('claude.ai');
    expect(claude?.getText(editor)).toBe(
      'First paragraph\nSecond paragraph\nThird paragraph',
    );

    const gemini = selectAdapter('gemini.google.com');
    expect(gemini?.getText(editor)).toBe(
      'First paragraph\nSecond paragraph\nThird paragraph',
    );
  });
});

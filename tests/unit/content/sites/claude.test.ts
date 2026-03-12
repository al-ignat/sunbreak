import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { claudeAdapter } from '../../../../src/content/sites/claude';

describe('claudeAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('matches()', () => {
    it('matches claude.ai', () => {
      expect(claudeAdapter.matches('claude.ai')).toBe(true);
    });

    it('does not match chatgpt.com', () => {
      expect(claudeAdapter.matches('chatgpt.com')).toBe(false);
    });

    it('does not match gemini.google.com', () => {
      expect(claudeAdapter.matches('gemini.google.com')).toBe(false);
    });

    it('does not match www.claude.ai', () => {
      expect(claudeAdapter.matches('www.claude.ai')).toBe(false);
    });

    it('does not match claude.ai.evil.com', () => {
      expect(claudeAdapter.matches('claude.ai.evil.com')).toBe(false);
    });

    it('does not match anthropic.com', () => {
      expect(claudeAdapter.matches('anthropic.com')).toBe(false);
    });

    it('does not match api.claude.ai', () => {
      expect(claudeAdapter.matches('api.claude.ai')).toBe(false);
    });
  });

  it('has correct name', () => {
    expect(claudeAdapter.name).toBe('claude');
  });

  describe('getText()', () => {
    it('extracts text from ProseMirror paragraphs', () => {
      const editor = document.createElement('div');
      editor.innerHTML = '<p>Hello from Claude</p><p>Line 2</p>';
      expect(claudeAdapter.getText(editor)).toBe('Hello from Claude\nLine 2');
    });

    it('returns empty string for empty editor', () => {
      const editor = document.createElement('div');
      expect(claudeAdapter.getText(editor)).toBe('');
    });
  });

  describe('findInput()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('finds ProseMirror contenteditable', () => {
      const el = document.createElement('div');
      el.className = 'ProseMirror';
      el.setAttribute('contenteditable', 'true');
      document.body.appendChild(el);
      expect(claudeAdapter.findInput()).toBe(el);
    });

    it('falls back to role=textbox', () => {
      const el = document.createElement('div');
      el.setAttribute('role', 'textbox');
      el.setAttribute('contenteditable', 'true');
      document.body.appendChild(el);
      expect(claudeAdapter.findInput()).toBe(el);
    });

    it('returns null when no input exists', () => {
      expect(claudeAdapter.findInput()).toBeNull();
    });
  });

  describe('findSendButton()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('falls back to the rightmost visible action button in the active composer', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function mockRect(this: HTMLElement): DOMRect {
        if (this.getAttribute('data-testid') === 'claude-attach') {
          return { top: 0, left: 20, right: 60, bottom: 40, width: 40, height: 40, x: 20, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        if (this.getAttribute('data-testid') === 'claude-voice') {
          return { top: 0, left: 260, right: 300, bottom: 40, width: 40, height: 40, x: 260, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      });

      const composer = document.createElement('fieldset');
      const editor = document.createElement('div');
      editor.className = 'ProseMirror';
      editor.setAttribute('contenteditable', 'true');
      const attach = document.createElement('button');
      attach.setAttribute('data-testid', 'claude-attach');
      const voice = document.createElement('button');
      voice.setAttribute('data-testid', 'claude-voice');
      composer.append(editor, attach, voice);
      document.body.appendChild(composer);

      expect(claudeAdapter.findSendButton()).toBe(voice);
    });

    it('finds button by aria-label "Send message"', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
        { top: 0, left: 0, right: 40, bottom: 40, width: 40, height: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
      );
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Send message');
      document.body.appendChild(btn);
      expect(claudeAdapter.findSendButton()).toBe(btn);
    });

    it('finds button by capitalized "Send Message"', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
        { top: 0, left: 0, right: 40, bottom: 40, width: 40, height: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
      );
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Send Message');
      document.body.appendChild(btn);
      expect(claudeAdapter.findSendButton()).toBe(btn);
    });

    it('prefers the active composer action button over a stray page-level send button', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function mockRect(this: HTMLElement): DOMRect {
        if (this.getAttribute('data-testid') === 'claude-voice') {
          return { top: 0, left: 260, right: 300, bottom: 40, width: 40, height: 40, x: 260, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        if (this.getAttribute('aria-label') === 'Send message') {
          return { top: 0, left: 20, right: 60, bottom: 40, width: 40, height: 40, x: 20, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      });

      const composer = document.createElement('fieldset');
      const editor = document.createElement('div');
      editor.className = 'ProseMirror';
      editor.setAttribute('contenteditable', 'true');
      const voice = document.createElement('button');
      voice.setAttribute('data-testid', 'claude-voice');
      composer.append(editor, voice);
      document.body.appendChild(composer);

      const straySend = document.createElement('button');
      straySend.setAttribute('aria-label', 'Send message');
      document.body.appendChild(straySend);

      expect(claudeAdapter.findSendButton()).toBe(voice);
    });

    it('returns null when no button exists', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
        { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
      );
      expect(claudeAdapter.findSendButton()).toBeNull();
    });
  });

  describe('getDropZone()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('returns closest fieldset', () => {
      const fieldset = document.createElement('fieldset');
      const editor = document.createElement('div');
      editor.className = 'ProseMirror';
      editor.setAttribute('contenteditable', 'true');
      fieldset.appendChild(editor);
      document.body.appendChild(fieldset);
      expect(claudeAdapter.getDropZone()).toBe(fieldset);
    });
  });
});

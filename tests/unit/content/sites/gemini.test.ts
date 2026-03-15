import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { geminiAdapter } from '../../../../src/content/sites/gemini';

describe('geminiAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('matches()', () => {
    it('matches gemini.google.com', () => {
      expect(geminiAdapter.matches('gemini.google.com')).toBe(true);
    });

    it('does not match chatgpt.com', () => {
      expect(geminiAdapter.matches('chatgpt.com')).toBe(false);
    });

    it('does not match claude.ai', () => {
      expect(geminiAdapter.matches('claude.ai')).toBe(false);
    });

    it('does not match google.com', () => {
      expect(geminiAdapter.matches('google.com')).toBe(false);
    });

    it('does not match bard.google.com', () => {
      expect(geminiAdapter.matches('bard.google.com')).toBe(false);
    });

    it('does not match gemini.google.com.evil.com', () => {
      expect(geminiAdapter.matches('gemini.google.com.evil.com')).toBe(false);
    });

    it('does not match www.gemini.google.com', () => {
      expect(geminiAdapter.matches('www.gemini.google.com')).toBe(false);
    });
  });

  it('has correct name', () => {
    expect(geminiAdapter.name).toBe('gemini');
  });

  describe('getText()', () => {
    it('extracts text from Quill paragraphs', () => {
      const editor = document.createElement('div');
      editor.innerHTML = '<p>Gemini prompt</p><p>More text</p>';
      expect(geminiAdapter.getText(editor)).toBe('Gemini prompt\nMore text');
    });

    it('falls back to textContent', () => {
      const editor = document.createElement('div');
      editor.textContent = 'raw text';
      expect(geminiAdapter.getText(editor)).toBe('raw text');
    });

    it('returns empty string for empty editor', () => {
      const editor = document.createElement('div');
      expect(geminiAdapter.getText(editor)).toBe('');
    });
  });

  describe('findInput()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('finds element by .ql-editor', () => {
      const el = document.createElement('div');
      el.className = 'ql-editor';
      el.setAttribute('contenteditable', 'true');
      document.body.appendChild(el);
      expect(geminiAdapter.findInput()).toBe(el);
    });

    it('falls back to rich-textarea div', () => {
      const richTextarea = document.createElement('rich-textarea');
      const el = document.createElement('div');
      el.setAttribute('contenteditable', 'true');
      richTextarea.appendChild(el);
      document.body.appendChild(richTextarea);
      expect(geminiAdapter.findInput()).toBe(el);
    });

    it('returns null when no input exists', () => {
      expect(geminiAdapter.findInput()).toBeNull();
    });
  });

  describe('findSendButton()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('falls back to the rightmost visible action button in the active composer', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function mockRect(this: HTMLElement): DOMRect {
        if (this.getAttribute('data-testid') === 'gemini-attach') {
          return { top: 0, left: 20, right: 60, bottom: 40, width: 40, height: 40, x: 20, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        if (this.getAttribute('data-testid') === 'gemini-mic') {
          return { top: 0, left: 260, right: 300, bottom: 40, width: 40, height: 40, x: 260, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      });

      const composer = document.createElement('form');
      const editor = document.createElement('div');
      editor.className = 'ql-editor';
      editor.setAttribute('contenteditable', 'true');
      const attach = document.createElement('button');
      attach.setAttribute('data-testid', 'gemini-attach');
      const mic = document.createElement('button');
      mic.setAttribute('data-testid', 'gemini-mic');
      composer.append(editor, attach, mic);
      document.body.appendChild(composer);

      expect(geminiAdapter.findSendButton()).toBe(mic);
    });

    it('finds button by .send-button class', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
        { top: 0, left: 0, right: 40, bottom: 40, width: 40, height: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
      );
      const btn = document.createElement('button');
      btn.className = 'send-button';
      document.body.appendChild(btn);
      expect(geminiAdapter.findSendButton()).toBe(btn);
    });

    it('falls back to aria-label', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
        { top: 0, left: 0, right: 40, bottom: 40, width: 40, height: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
      );
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Send message');
      document.body.appendChild(btn);
      expect(geminiAdapter.findSendButton()).toBe(btn);
    });

    it('prefers the active composer action button over a stray page-level send button', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function mockRect(this: HTMLElement): DOMRect {
        if (this.getAttribute('data-testid') === 'gemini-mic') {
          return { top: 0, left: 260, right: 300, bottom: 40, width: 40, height: 40, x: 260, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        if (this.classList.contains('send-button')) {
          return { top: 0, left: 20, right: 60, bottom: 40, width: 40, height: 40, x: 20, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      });

      const composer = document.createElement('form');
      const editor = document.createElement('div');
      editor.className = 'ql-editor';
      editor.setAttribute('contenteditable', 'true');
      const mic = document.createElement('button');
      mic.setAttribute('data-testid', 'gemini-mic');
      composer.append(editor, mic);
      document.body.appendChild(composer);

      const straySend = document.createElement('button');
      straySend.className = 'send-button';
      document.body.appendChild(straySend);

      expect(geminiAdapter.findSendButton()).toBe(mic);
    });

    it('ignores hidden send buttons and keeps the visible composer action', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function mockRect(this: HTMLElement): DOMRect {
        if (this.classList.contains('send-button')) {
          return { top: 0, left: 20, right: 20, bottom: 0, width: 0, height: 0, x: 20, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        if (this.getAttribute('data-testid') === 'gemini-mic') {
          return { top: 0, left: 260, right: 300, bottom: 40, width: 40, height: 40, x: 260, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      });

      const composer = document.createElement('form');
      const editor = document.createElement('div');
      editor.className = 'ql-editor';
      editor.setAttribute('contenteditable', 'true');
      const hiddenSend = document.createElement('button');
      hiddenSend.className = 'send-button';
      const mic = document.createElement('button');
      mic.setAttribute('data-testid', 'gemini-mic');
      composer.append(editor, hiddenSend, mic);
      document.body.appendChild(composer);

      expect(geminiAdapter.findSendButton()).toBe(mic);
    });

    it('returns null when no button exists', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
        { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
      );
      expect(geminiAdapter.findSendButton()).toBeNull();
    });
  });

  describe('getDropZone()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('finds .xap-uploader-dropzone', () => {
      const zone = document.createElement('div');
      zone.className = 'xap-uploader-dropzone';
      document.body.appendChild(zone);
      expect(geminiAdapter.getDropZone()).toBe(zone);
    });

    it('falls back to editor parent', () => {
      const parent = document.createElement('div');
      const editor = document.createElement('div');
      editor.className = 'ql-editor';
      editor.setAttribute('contenteditable', 'true');
      parent.appendChild(editor);
      document.body.appendChild(parent);
      expect(geminiAdapter.getDropZone()).toBe(parent);
    });
  });

  describe('getPendingAttachmentCount()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('counts visible attachment remove controls in the active composer', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function mockRect(this: HTMLElement): DOMRect {
        if (this.getAttribute('aria-label')?.startsWith('Remove ') === true) {
          return { top: 0, left: 0, right: 24, bottom: 24, width: 24, height: 24, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        return { top: 0, left: 0, right: 40, bottom: 40, width: 40, height: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
      });

      const form = document.createElement('form');
      const editor = document.createElement('div');
      editor.className = 'ql-editor';
      editor.setAttribute('contenteditable', 'true');
      const remove = document.createElement('button');
      remove.setAttribute('aria-label', 'Remove report.pdf');
      form.append(editor, remove);
      document.body.appendChild(form);

      expect(geminiAdapter.getPendingAttachmentCount?.()).toBe(1);
    });

    it('returns zero when no visible attachment control remains', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
        { top: 0, left: 0, right: 40, bottom: 40, width: 40, height: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
      );

      const form = document.createElement('form');
      const editor = document.createElement('div');
      editor.className = 'ql-editor';
      editor.setAttribute('contenteditable', 'true');
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      form.append(editor, fileInput);
      document.body.appendChild(form);

      expect(geminiAdapter.getPendingAttachmentCount?.()).toBe(0);
    });
  });
});

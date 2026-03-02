import { describe, it, expect, beforeEach } from 'vitest';
import { geminiAdapter } from '../../../../src/content/sites/gemini';

describe('geminiAdapter', () => {
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

    it('finds button by .send-button class', () => {
      const btn = document.createElement('button');
      btn.className = 'send-button';
      document.body.appendChild(btn);
      expect(geminiAdapter.findSendButton()).toBe(btn);
    });

    it('falls back to aria-label', () => {
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Send message');
      document.body.appendChild(btn);
      expect(geminiAdapter.findSendButton()).toBe(btn);
    });

    it('returns null when no button exists', () => {
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
});

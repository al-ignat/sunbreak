import { describe, it, expect, beforeEach } from 'vitest';
import { chatgptAdapter } from '../../../../src/content/sites/chatgpt';

describe('chatgptAdapter', () => {
  describe('matches()', () => {
    // True positives
    it('matches chatgpt.com', () => {
      expect(chatgptAdapter.matches('chatgpt.com')).toBe(true);
    });

    it('matches chat.openai.com', () => {
      expect(chatgptAdapter.matches('chat.openai.com')).toBe(true);
    });

    // True negatives
    it('does not match claude.ai', () => {
      expect(chatgptAdapter.matches('claude.ai')).toBe(false);
    });

    it('does not match gemini.google.com', () => {
      expect(chatgptAdapter.matches('gemini.google.com')).toBe(false);
    });

    it('does not match openai.com (no chat prefix)', () => {
      expect(chatgptAdapter.matches('openai.com')).toBe(false);
    });

    it('does not match www.chatgpt.com', () => {
      expect(chatgptAdapter.matches('www.chatgpt.com')).toBe(false);
    });

    it('does not match chatgpt.com.evil.com', () => {
      expect(chatgptAdapter.matches('chatgpt.com.evil.com')).toBe(false);
    });
  });

  it('has correct name', () => {
    expect(chatgptAdapter.name).toBe('chatgpt');
  });

  describe('getText()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('extracts text from ProseMirror paragraphs', () => {
      const editor = document.createElement('div');
      editor.innerHTML = '<p>Hello world</p><p>Second line</p>';
      expect(chatgptAdapter.getText(editor)).toBe('Hello world\nSecond line');
    });

    it('extracts single paragraph', () => {
      const editor = document.createElement('div');
      editor.innerHTML = '<p>Just one line</p>';
      expect(chatgptAdapter.getText(editor)).toBe('Just one line');
    });

    it('falls back to textContent when no paragraphs', () => {
      const editor = document.createElement('div');
      editor.textContent = 'plain text';
      expect(chatgptAdapter.getText(editor)).toBe('plain text');
    });

    it('returns empty string for empty editor', () => {
      const editor = document.createElement('div');
      expect(chatgptAdapter.getText(editor)).toBe('');
    });

    it('trims whitespace', () => {
      const editor = document.createElement('div');
      editor.innerHTML = '<p>  spaced  </p>';
      expect(chatgptAdapter.getText(editor)).toBe('spaced');
    });
  });

  describe('findInput()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('finds element by #prompt-textarea', () => {
      const el = document.createElement('div');
      el.id = 'prompt-textarea';
      el.setAttribute('contenteditable', 'true');
      document.body.appendChild(el);
      expect(chatgptAdapter.findInput()).toBe(el);
    });

    it('falls back to .ProseMirror selector', () => {
      const el = document.createElement('div');
      el.className = 'ProseMirror';
      el.setAttribute('contenteditable', 'true');
      document.body.appendChild(el);
      expect(chatgptAdapter.findInput()).toBe(el);
    });

    it('returns null when no input exists', () => {
      expect(chatgptAdapter.findInput()).toBeNull();
    });
  });

  describe('findSendButton()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('finds button by data-testid', () => {
      const btn = document.createElement('button');
      btn.setAttribute('data-testid', 'send-button');
      document.body.appendChild(btn);
      expect(chatgptAdapter.findSendButton()).toBe(btn);
    });

    it('falls back to aria-label', () => {
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Send prompt');
      document.body.appendChild(btn);
      expect(chatgptAdapter.findSendButton()).toBe(btn);
    });

    it('returns null when no button exists', () => {
      expect(chatgptAdapter.findSendButton()).toBeNull();
    });
  });

  describe('setText()', () => {
    it('sets text with paragraph wrapping', () => {
      const editor = document.createElement('div');
      chatgptAdapter.setText(editor, 'line one\nline two');
      expect(editor.querySelectorAll('p').length).toBe(2);
      expect(editor.querySelectorAll('p')[0]?.textContent).toBe('line one');
      expect(editor.querySelectorAll('p')[1]?.textContent).toBe('line two');
    });

    it('escapes HTML entities', () => {
      const editor = document.createElement('div');
      chatgptAdapter.setText(editor, '<script>alert("xss")</script>');
      expect(editor.innerHTML).not.toContain('<script>');
      expect(editor.textContent).toContain('<script>alert("xss")</script>');
    });
  });

  describe('getDropZone()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('returns the parent form element', () => {
      const form = document.createElement('form');
      const editor = document.createElement('div');
      editor.id = 'prompt-textarea';
      form.appendChild(editor);
      document.body.appendChild(form);
      expect(chatgptAdapter.getDropZone()).toBe(form);
    });

    it('returns null when no input exists', () => {
      expect(chatgptAdapter.getDropZone()).toBeNull();
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { claudeAdapter } from '../../../../src/content/sites/claude';

describe('claudeAdapter', () => {
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

    it('finds button by aria-label "Send message"', () => {
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Send message');
      document.body.appendChild(btn);
      expect(claudeAdapter.findSendButton()).toBe(btn);
    });

    it('finds button by capitalized "Send Message"', () => {
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Send Message');
      document.body.appendChild(btn);
      expect(claudeAdapter.findSendButton()).toBe(btn);
    });

    it('returns null when no button exists', () => {
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

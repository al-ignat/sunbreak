import { describe, it, expect } from 'vitest';
import { selectAdapter } from '../../../../src/content/sites';

describe('selectAdapter()', () => {
  it('selects chatgpt adapter for chatgpt.com', () => {
    expect(selectAdapter('chatgpt.com')?.name).toBe('chatgpt');
  });

  it('selects chatgpt adapter for chat.openai.com', () => {
    expect(selectAdapter('chat.openai.com')?.name).toBe('chatgpt');
  });

  it('selects claude adapter for claude.ai', () => {
    expect(selectAdapter('claude.ai')?.name).toBe('claude');
  });

  it('selects gemini adapter for gemini.google.com', () => {
    expect(selectAdapter('gemini.google.com')?.name).toBe('gemini');
  });

  it('returns null for unknown hostname', () => {
    expect(selectAdapter('example.com')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(selectAdapter('')).toBeNull();
  });
});

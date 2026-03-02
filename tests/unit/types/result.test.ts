import { describe, it, expect } from 'vitest';
import { ok, err } from '../../../src/types/result';
import type { Result } from '../../../src/types/result';

describe('Result type', () => {
  it('ok() creates a success result', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(42);
  });

  it('err() creates a failure result', () => {
    const result = err('something went wrong');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('something went wrong');
  });

  it('narrows correctly in conditional', () => {
    const result: Result<number, string> = ok(10);
    if (result.ok) {
      expect(result.value).toBe(10);
    } else {
      // This branch should not execute
      expect.unreachable('should be ok');
    }
  });

  it('narrows error branch correctly', () => {
    const result: Result<number, string> = err('fail');
    if (!result.ok) {
      expect(result.error).toBe('fail');
    } else {
      expect.unreachable('should be err');
    }
  });
});

import { describe, it, expect } from 'vitest';
import {
  buildPatternFromTemplate,
  CUSTOM_PATTERN_TEMPLATES,
  getCustomPatternTemplate,
} from '../../../src/classifier/custom-pattern-templates';

describe('custom-pattern templates', () => {
  it('defines the initial company-pattern template library', () => {
    expect(CUSTOM_PATTERN_TEMPLATES.map((template) => template.id)).toEqual([
      'employee-id',
      'customer-id',
      'invoice-number',
      'project-code',
      'ticket-reference',
      'matter-reference',
    ]);
  });

  it('returns template metadata by id', () => {
    const template = getCustomPatternTemplate('invoice-number');
    expect(template).toEqual(expect.objectContaining({
      id: 'invoice-number',
      category: 'finance',
      severity: 'concern',
    }));
  });

  it('builds prefix-and-digits regexes from template values', () => {
    const pattern = buildPatternFromTemplate('employee-id', {
      prefix: 'TEAM-',
      digits: '4',
    });

    expect(pattern).toBe('TEAM-[0-9]{4}');
  });

  it('builds project-code regexes with structured fields', () => {
    const pattern = buildPatternFromTemplate('project-code', {
      prefix: 'WORK-',
      letters: '4',
      digits: '3',
    });

    expect(pattern).toBe('WORK-[A-Z]{4}-[0-9]{3}');
  });

  it('returns null for unknown template ids', () => {
    expect(buildPatternFromTemplate('missing-template' as never, {})).toBeNull();
    expect(getCustomPatternTemplate('missing-template' as never)).toBeNull();
  });
});

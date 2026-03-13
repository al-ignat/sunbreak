import { describe, it, expect } from 'vitest';
import {
  extractNameFromEmail,
  generateDescriptiveToken,
  createTokenContext,
  TOKEN_POLICY_BY_TYPE,
} from '../../../src/classifier/smart-tokens';
import type { Finding } from '../../../src/classifier/types';

/** Helper to create a minimal finding for token generation */
function makeFinding(overrides: Partial<Finding> & Pick<Finding, 'type' | 'value'>): Finding {
  return {
    startIndex: 0,
    endIndex: overrides.value.length,
    confidence: 'HIGH',
    label: '',
    placeholder: '',
    ...overrides,
  };
}

describe('extractNameFromEmail', () => {
  describe('standard dot-separated names', () => {
    it('extracts "John S." from "john.smith"', () => {
      expect(extractNameFromEmail('john.smith')).toBe('John S.');
    });

    it('extracts "Jane D." from "jane.doe"', () => {
      expect(extractNameFromEmail('jane.doe')).toBe('Jane D.');
    });

    it('handles underscore separator', () => {
      expect(extractNameFromEmail('john_smith')).toBe('John S.');
    });

    it('handles hyphen separator', () => {
      expect(extractNameFromEmail('john-smith')).toBe('John S.');
    });
  });

  describe('single name parts', () => {
    it('returns single name for non-role single part', () => {
      expect(extractNameFromEmail('jsmith')).toBe('Jsmith');
    });

    it('returns single name for common first name', () => {
      expect(extractNameFromEmail('john')).toBe('John');
    });
  });

  describe('single-character first name', () => {
    it('treats single char as initial + full last name', () => {
      expect(extractNameFromEmail('j.smith')).toBe('J. Smith');
    });

    it('handles single char with underscore', () => {
      expect(extractNameFromEmail('j_doe')).toBe('J. Doe');
    });
  });

  describe('3+ parts', () => {
    it('uses first + last initial for 3 parts', () => {
      expect(extractNameFromEmail('john_smith_jr')).toBe('John J.');
    });

    it('uses first + last initial for 4 parts', () => {
      expect(extractNameFromEmail('a.b.c.d')).toBe('A. D.');
    });

    it('handles long multi-part names', () => {
      expect(extractNameFromEmail('maria.garcia.lopez')).toBe('Maria L.');
    });
  });

  describe('role/non-personal addresses', () => {
    it('returns null for "support"', () => {
      expect(extractNameFromEmail('support')).toBeNull();
    });

    it('returns null for "admin"', () => {
      expect(extractNameFromEmail('admin')).toBeNull();
    });

    it('returns null for "info"', () => {
      expect(extractNameFromEmail('info')).toBeNull();
    });

    it('returns null for "noreply"', () => {
      expect(extractNameFromEmail('noreply')).toBeNull();
    });

    it('returns null for "marketing"', () => {
      expect(extractNameFromEmail('marketing')).toBeNull();
    });

    it('returns null for "security"', () => {
      expect(extractNameFromEmail('security')).toBeNull();
    });

    it('returns null for multi-part role mailboxes', () => {
      expect(extractNameFromEmail('support-team')).toBeNull();
      expect(extractNameFromEmail('security.ops')).toBeNull();
      expect(extractNameFromEmail('billing_desk')).toBeNull();
    });

    it('drops trailing role qualifiers from person-like addresses', () => {
      expect(extractNameFromEmail('john.smith.hr')).toBe('John S.');
      expect(extractNameFromEmail('j.smith.support')).toBe('J. Smith');
    });

    it('keeps prefixed shared mailboxes generic even when a name appears later', () => {
      expect(extractNameFromEmail('support.jane')).toBeNull();
      expect(extractNameFromEmail('security_alice')).toBeNull();
    });
  });

  describe('digits and non-standard formats', () => {
    it('returns null for all-digit local part', () => {
      expect(extractNameFromEmail('12345')).toBeNull();
    });

    it('strips trailing digits from name', () => {
      expect(extractNameFromEmail('john123')).toBe('John');
    });

    it('strips trailing digits from both parts', () => {
      expect(extractNameFromEmail('john123.smith456')).toBe('John S.');
    });

    it('returns null when digits leave no alphabetic parts', () => {
      expect(extractNameFromEmail('123.456')).toBeNull();
    });
  });

  describe('plus-addressing', () => {
    it('strips plus-addressed tag', () => {
      expect(extractNameFromEmail('john+newsletter')).toBe('John');
    });

    it('strips tag and extracts name from remainder', () => {
      expect(extractNameFromEmail('john.smith+work')).toBe('John S.');
    });
  });

  describe('edge cases', () => {
    it('returns null for empty string', () => {
      expect(extractNameFromEmail('')).toBeNull();
    });

    it('handles single character', () => {
      // Single alphabetic char, not a role name
      expect(extractNameFromEmail('x')).toBe('X');
    });
  });
});

describe('TOKEN_POLICY_BY_TYPE', () => {
  it('defines explicit policy metadata for every supported finding type', () => {
    expect(TOKEN_POLICY_BY_TYPE.email).toEqual({
      style: 'identity',
      genericBase: 'email',
      safeHints: ['person'],
      disclosure: 'bounded',
    });
    expect(TOKEN_POLICY_BY_TYPE.phone).toEqual({
      style: 'trailing-digits',
      genericBase: 'phone',
      safeHints: ['last-digits'],
      disclosure: 'bounded',
    });
    expect(TOKEN_POLICY_BY_TYPE['credit-card']).toEqual({
      style: 'trailing-digits',
      genericBase: 'card',
      safeHints: ['last-digits'],
      disclosure: 'bounded',
    });
    expect(TOKEN_POLICY_BY_TYPE.ssn.disclosure).toBe('generic-only');
    expect(TOKEN_POLICY_BY_TYPE.cpr.disclosure).toBe('generic-only');
    expect(TOKEN_POLICY_BY_TYPE['ni-number'].disclosure).toBe('generic-only');
    expect(TOKEN_POLICY_BY_TYPE['ip-address'].safeHints).toEqual(['network-scope']);
    expect(TOKEN_POLICY_BY_TYPE['api-key'].safeHints).toEqual(['provider-label']);
    expect(TOKEN_POLICY_BY_TYPE.keyword.disclosure).toBe('generic-only');
  });
});

describe('generateDescriptiveToken', () => {
  describe('email tokens', () => {
    it('generates name-based token for standard email', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'email',
        value: 'john.smith@example.com',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[John S. email]');
    });

    it('generates possessive token for single-name email', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'email',
        value: 'john@example.com',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe("[John's email]");
    });

    it('generates generic token for role email', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'email',
        value: 'support@example.com',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[email]');
    });

    it('generates generic token for all-digit email', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'email',
        value: '123@example.com',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[email]');
    });

    it('generates initial + last name token', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'email',
        value: 'j.smith@example.com',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[J. Smith email]');
    });

    it('keeps team mailboxes generic even when they contain readable words', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'email',
        value: 'security.ops@example.com',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[email]');
    });

    it('preserves person identity when a trailing role qualifier is present', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'email',
        value: 'john.smith.hr@example.com',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[John S. email]');
    });
  });

  describe('phone tokens', () => {
    it('extracts last 2 digits from US format', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'phone',
        value: '+1-555-123-4567',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[phone ending 67]');
    });

    it('extracts last 2 digits from parenthesized format', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'phone',
        value: '(555) 123-4567',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[phone ending 67]');
    });

    it('extracts last 2 digits from plain digits', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'phone',
        value: '5551234567',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[phone ending 67]');
    });

    it('extracts last 2 digits from international format', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'phone',
        value: '+45 12 34 56 78',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[phone ending 78]');
    });

    it('extracts last 2 digits from dotted format', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'phone',
        value: '555.123.4567',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[phone ending 67]');
    });
  });

  describe('credit card tokens', () => {
    it('extracts last 4 digits from spaced format', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'credit-card',
        value: '4111 1111 1111 1111',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[card ending 1111]');
    });

    it('extracts last 4 digits from plain format', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'credit-card',
        value: '4111111111111111',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[card ending 1111]');
    });

    it('extracts last 4 digits from hyphenated format', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'credit-card',
        value: '5500-0000-0000-0004',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[card ending 0004]');
    });

    it('extracts last 4 from Amex format', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'credit-card',
        value: '3782 822463 10005',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[card ending 0005]');
    });

    it('extracts last 4 from 13-digit card', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'credit-card',
        value: '4222222222225',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[card ending 2225]');
    });
  });

  describe('national ID tokens', () => {
    it('generates SSN token', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({ type: 'ssn', value: '123-45-6789' });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[SSN redacted]');
    });

    it('generates CPR token', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({ type: 'cpr', value: '010185-1234' });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[CPR redacted]');
    });

    it('generates NI number token', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({ type: 'ni-number', value: 'AB 12 34 56 C' });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[NI number redacted]');
    });
  });

  describe('API key tokens', () => {
    it('generates OpenAI token', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'api-key',
        value: 'sk-abc123',
        label: 'OpenAI API Key',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[OpenAI API key]');
    });

    it('generates AWS token', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'api-key',
        value: 'AKIA1234567890ABCDEF',
        label: 'AWS Access Key',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[AWS access key]');
    });

    it('generates GitHub token', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'api-key',
        value: 'ghp_abc123',
        label: 'GitHub Token',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[GitHub token]');
    });

    it('generates Stripe secret key token', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'api-key',
        value: 'sk_live_abc123',
        label: 'Stripe Secret Key',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[Stripe secret key]');
    });

    it('generates Stripe publishable key token', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'api-key',
        value: 'pk_live_abc123',
        label: 'Stripe Publishable Key',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[Stripe publishable key]');
    });

    it('generates Azure connection string token', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'api-key',
        value: 'DefaultEndpointsProtocol=...',
        label: 'Azure Connection String',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[Azure connection string]');
    });

    it('generates generic token for unknown key', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'api-key',
        value: 'api_key=abc123...',
        label: 'Possible API Key',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[API key]');
    });
  });

  describe('IP address tokens', () => {
    it('generates internal token for 10.x.x.x', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({ type: 'ip-address', value: '10.0.1.50' });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[internal IP]');
    });

    it('generates internal token for 172.16.x.x', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({ type: 'ip-address', value: '172.16.0.1' });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[internal IP]');
    });

    it('generates internal token for 192.168.x.x', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({ type: 'ip-address', value: '192.168.1.100' });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[internal IP]');
    });

    it('generates external token for public IPv4', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({ type: 'ip-address', value: '8.8.8.8' });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[IP address]');
    });

    it('generates external token for another public IPv4', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({ type: 'ip-address', value: '203.0.113.1' });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[IP address]');
    });

    it('generates internal token for IPv6 ULA', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({ type: 'ip-address', value: 'fd12:3456:789a::1' });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[internal IP]');
    });

    it('generates external token for public IPv6', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({ type: 'ip-address', value: '2001:db8::1' });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[IP address]');
    });
  });

  describe('keyword tokens', () => {
    it('generates generic keyword token', () => {
      const ctx = createTokenContext();
      const finding = makeFinding({
        type: 'keyword',
        value: 'Project Phoenix',
        label: 'Custom Keyword: Project Phoenix',
      });
      expect(generateDescriptiveToken(finding, ctx)).toBe('[custom keyword]');
    });
  });

  describe('deduplication and disambiguation', () => {
    it('same value gets same token', () => {
      const ctx = createTokenContext();
      const f1 = makeFinding({ type: 'email', value: 'john@a.com', startIndex: 0 });
      const f2 = makeFinding({ type: 'email', value: 'john@a.com', startIndex: 20 });
      const t1 = generateDescriptiveToken(f1, ctx);
      const t2 = generateDescriptiveToken(f2, ctx);
      expect(t1).toBe(t2);
      expect(t1).toBe("[John's email]");
    });

    it('different values with same base get disambiguated', () => {
      const ctx = createTokenContext();
      const f1 = makeFinding({ type: 'email', value: 'john.s@a.com' });
      const f2 = makeFinding({ type: 'email', value: 'john.s@b.com' });
      const t1 = generateDescriptiveToken(f1, ctx);
      const t2 = generateDescriptiveToken(f2, ctx);
      expect(t1).toBe('[John S. email]');
      expect(t2).toBe('[John S. email 2]');
    });

    it('different types with same base are independent', () => {
      const ctx = createTokenContext();
      const f1 = makeFinding({ type: 'ssn', value: '123-45-6789' });
      const f2 = makeFinding({ type: 'ssn', value: '987-65-4321' });
      const t1 = generateDescriptiveToken(f1, ctx);
      const t2 = generateDescriptiveToken(f2, ctx);
      expect(t1).toBe('[SSN redacted]');
      expect(t2).toBe('[SSN redacted 2]');
    });

    it('multiple role emails get sequential numbers', () => {
      const ctx = createTokenContext();
      const f1 = makeFinding({ type: 'email', value: 'support@a.com' });
      const f2 = makeFinding({ type: 'email', value: 'admin@b.com' });
      const t1 = generateDescriptiveToken(f1, ctx);
      const t2 = generateDescriptiveToken(f2, ctx);
      expect(t1).toBe('[email]');
      expect(t2).toBe('[email 2]');
    });
  });
});

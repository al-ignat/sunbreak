import { describe, it, expect } from 'vitest';
import { detectApiKeys } from '../../../../src/classifier/patterns/api-key';

// Build test keys dynamically to avoid GitHub push protection false positives
const STRIPE_SK = ['sk', 'live', 'TESTKEY00000000000000000x'].join('_');
const STRIPE_PK = ['pk', 'live', 'TESTKEY00000000000000000x'].join('_');
const STRIPE_SK_TEST = ['sk', 'test', '4eC39HqLyjWDarhtT657Cd7x'].join('_');
const STRIPE_RK = ['rk', 'live', 'TESTKEY00000000000000000x'].join('_');

describe('detectApiKeys', () => {
  describe('true positives — provider-specific', () => {
    it('detects AWS access key', () => {
      const findings = detectApiKeys('Key: AKIAIOSFODNN7EXAMPLE');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.label).toBe('AWS Access Key');
      expect(findings[0]?.confidence).toBe('HIGH');
    });

    it('detects GitHub personal access token', () => {
      const token = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk';
      const findings = detectApiKeys(`Token: ${token}`);
      const gh = findings.filter(f => f.label === 'GitHub Token');
      expect(gh).toHaveLength(1);
      expect(gh[0]?.confidence).toBe('HIGH');
    });

    it('detects GitHub secret token', () => {
      const token = 'ghs_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk';
      const findings = detectApiKeys(`Secret: ${token}`);
      const gh = findings.filter(f => f.label === 'GitHub Token');
      expect(gh).toHaveLength(1);
    });

    it('detects Stripe secret key', () => {
      const findings = detectApiKeys(`Stripe: ${STRIPE_SK}`);
      const stripe = findings.filter(f => f.label === 'Stripe Secret Key');
      expect(stripe).toHaveLength(1);
      expect(stripe[0]?.confidence).toBe('HIGH');
    });

    it('detects Stripe publishable key', () => {
      const findings = detectApiKeys(`Public: ${STRIPE_PK}`);
      const stripe = findings.filter(f => f.label === 'Stripe Publishable Key');
      expect(stripe).toHaveLength(1);
    });

    it('detects Stripe test mode secret key', () => {
      const findings = detectApiKeys(`Stripe test: ${STRIPE_SK_TEST}`);
      const stripe = findings.filter(f => f.label === 'Stripe Secret Key');
      expect(stripe).toHaveLength(1);
      expect(stripe[0]?.confidence).toBe('HIGH');
    });

    it('detects Stripe restricted key (rk_live_)', () => {
      const findings = detectApiKeys(`Restricted: ${STRIPE_RK}`);
      const stripe = findings.filter(f => f.label === 'Stripe Secret Key');
      expect(stripe).toHaveLength(1);
    });

    it('detects OpenAI API key (legacy format)', () => {
      const key = 'sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh';
      const findings = detectApiKeys(`OpenAI: ${key}`);
      const oai = findings.filter(f => f.label === 'OpenAI API Key');
      expect(oai).toHaveLength(1);
      expect(oai[0]?.confidence).toBe('HIGH');
    });

    it('detects OpenAI API key (sk-proj- format)', () => {
      const key = 'sk-proj-abc123def456ghi789jkl012mno345pqr678';
      const findings = detectApiKeys(`key: ${key}`);
      const oai = findings.filter(f => f.label === 'OpenAI API Key');
      expect(oai).toHaveLength(1);
      expect(oai[0]?.value).toBe(key);
    });

    it('detects OpenAI API key (sk-svcacct- format)', () => {
      const key = 'sk-svcacct-abc123def456ghi789jkl012mno345';
      const findings = detectApiKeys(`key: ${key}`);
      const oai = findings.filter(f => f.label === 'OpenAI API Key');
      expect(oai).toHaveLength(1);
    });
  });

  describe('true positives — Azure', () => {
    it('detects Azure connection string', () => {
      const connStr =
        'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=ABCDEFGHIJKLMNOPQRSTUVWXYZabcde==;';
      const findings = detectApiKeys(connStr);
      const azure = findings.filter(f => f.label === 'Azure Connection String');
      expect(azure).toHaveLength(1);
      expect(azure[0]?.confidence).toBe('HIGH');
    });
  });

  describe('true positives — generic', () => {
    it('detects generic api_key with long value', () => {
      const findings = detectApiKeys('api_key=ABCDEFGHIJKLMNOP1234');
      const generic = findings.filter(f => f.label === 'Possible API Key');
      expect(generic).toHaveLength(1);
      expect(generic[0]?.confidence).toBe('MEDIUM');
    });

    it('detects token: with long value', () => {
      const findings = detectApiKeys('token: "ABCDEFGHIJKLMNOPqrstuvwx"');
      const generic = findings.filter(f => f.label === 'Possible API Key');
      expect(generic).toHaveLength(1);
    });

    it('detects secret= with long value', () => {
      const findings = detectApiKeys("secret='ABCDEFGHIJKLMNOP12345678'");
      const generic = findings.filter(f => f.label === 'Possible API Key');
      expect(generic).toHaveLength(1);
    });
  });

  describe('true negatives', () => {
    it('does not flag api_key=test (too short)', () => {
      const findings = detectApiKeys('api_key=test');
      expect(findings).toHaveLength(0);
    });

    it('does not flag short token values', () => {
      const findings = detectApiKeys('token: "abc123"');
      expect(findings).toHaveLength(0);
    });

    it('does not flag password=changeme (too short)', () => {
      const findings = detectApiKeys('password=changeme');
      expect(findings).toHaveLength(0);
    });

    it('does not flag random text starting with sk-', () => {
      // sk- followed by less than 32 chars
      const findings = detectApiKeys('Variable: sk-shortvalue');
      const oai = findings.filter(f => f.label === 'OpenAI API Key');
      expect(oai).toHaveLength(0);
    });

    it('does not flag partial AWS key pattern', () => {
      // AKIA followed by less than 16 uppercase chars
      const findings = detectApiKeys('prefix: AKIA1234');
      const aws = findings.filter(f => f.label === 'AWS Access Key');
      expect(aws).toHaveLength(0);
    });
  });

  describe('startIndex and endIndex accuracy', () => {
    it('returns correct indices for AWS key', () => {
      const text = 'Use AKIAIOSFODNN7EXAMPLE here';
      const findings = detectApiKeys(text);
      const aws = findings.filter(f => f.label === 'AWS Access Key');
      expect(aws).toHaveLength(1);
      expect(text.slice(aws[0]?.startIndex, aws[0]?.endIndex)).toBe('AKIAIOSFODNN7EXAMPLE');
    });
  });
});

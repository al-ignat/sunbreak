import { describe, it, expect } from 'vitest';
import { detectEmails } from '../../../../src/classifier/patterns/email';

describe('detectEmails', () => {
  describe('true positives', () => {
    it('detects a standard email', () => {
      const findings = detectEmails('Contact john@example.com for info');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('john@example.com');
      expect(findings[0]?.confidence).toBe('HIGH');
      expect(findings[0]?.type).toBe('email');
    });

    it('detects email with plus sign', () => {
      const findings = detectEmails('Send to user+tag@gmail.com');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('user+tag@gmail.com');
    });

    it('detects email with subdomain', () => {
      const findings = detectEmails('Email: admin@mail.company.co.uk');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('admin@mail.company.co.uk');
    });

    it('detects email with long TLD', () => {
      const findings = detectEmails('curator@national.museum is valid');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('curator@national.museum');
    });

    it('detects email with hyphens in domain', () => {
      const findings = detectEmails('Reply to info@my-company.org');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('info@my-company.org');
    });

    it('detects multiple emails in text', () => {
      const findings = detectEmails('From alice@a.com to bob@b.com');
      expect(findings).toHaveLength(2);
      expect(findings[0]?.value).toBe('alice@a.com');
      expect(findings[1]?.value).toBe('bob@b.com');
    });

    it('detects email with dots in local part', () => {
      const findings = detectEmails('first.last@domain.com');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('first.last@domain.com');
    });
  });

  describe('true negatives', () => {
    it('does not match incomplete email (no domain)', () => {
      const findings = detectEmails('user@ is not valid');
      expect(findings).toHaveLength(0);
    });

    it('does not match incomplete email (no local part)', () => {
      const findings = detectEmails('@domain.com is incomplete');
      expect(findings).toHaveLength(0);
    });

    it('does not match code decorators', () => {
      const findings = detectEmails('@Component class Foo {}');
      expect(findings).toHaveLength(0);
    });

    it('excludes git@ addresses', () => {
      const findings = detectEmails('git clone git@github.com:org/repo.git');
      expect(findings).toHaveLength(0);
    });

    it('excludes noreply@ addresses', () => {
      const findings = detectEmails('From: noreply@company.com');
      expect(findings).toHaveLength(0);
    });

    it('excludes no-reply@ addresses', () => {
      const findings = detectEmails('no-reply@notifications.example.com');
      expect(findings).toHaveLength(0);
    });

    it('excludes email in URL authority (preceded by ://)', () => {
      const findings = detectEmails('Visit https://user@example.com:8080/path');
      expect(findings).toHaveLength(0);
    });

    it('does not match @ in isolation', () => {
      const findings = detectEmails('Type @ to mention someone');
      expect(findings).toHaveLength(0);
    });
  });

  describe('startIndex and endIndex accuracy', () => {
    it('returns correct indices', () => {
      const text = 'Hello john@test.com world';
      const findings = detectEmails(text);
      expect(findings).toHaveLength(1);
      expect(findings[0]?.startIndex).toBe(6);
      expect(findings[0]?.endIndex).toBe(19);
      expect(text.slice(findings[0]?.startIndex, findings[0]?.endIndex)).toBe('john@test.com');
    });
  });
});

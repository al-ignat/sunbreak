import { describe, it, expect } from 'vitest';
import { detectIpAddresses } from '../../../../src/classifier/patterns/ip-address';

describe('detectIpAddresses', () => {
  // ── IPv4 ────────────────────────────────────────────────────────────

  describe('IPv4 true positives', () => {
    it('detects standard private IP', () => {
      const findings = detectIpAddresses('Server at 192.168.1.100');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('192.168.1.100');
      expect(findings[0]?.confidence).toBe('MEDIUM');
      expect(findings[0]?.type).toBe('ip-address');
    });

    it('detects public IP', () => {
      const findings = detectIpAddresses('DNS: 8.8.8.8');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('8.8.8.8');
    });

    it('detects 10.x range', () => {
      const findings = detectIpAddresses('Internal: 10.0.0.1');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('10.0.0.1');
    });

    it('detects IP with max octets', () => {
      const findings = detectIpAddresses('Edge: 255.255.255.0');
      expect(findings).toHaveLength(1);
    });

    it('detects multiple IPs', () => {
      const findings = detectIpAddresses('From 10.0.0.1 to 10.0.0.2');
      expect(findings).toHaveLength(2);
    });

    it('detects IP at end of sentence (before period)', () => {
      const findings = detectIpAddresses('The server is at 10.0.0.42.');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('10.0.0.42');
    });

    it('detects IP followed by comma', () => {
      const findings = detectIpAddresses('Host 192.168.50.11, port 443');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('192.168.50.11');
    });

    it('detects IP at end of text', () => {
      const findings = detectIpAddresses('monitoring node at 192.168.50.11');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('192.168.50.11');
    });
  });

  describe('IPv4 true negatives', () => {
    it('skips localhost 127.0.0.1', () => {
      const findings = detectIpAddresses('localhost: 127.0.0.1');
      expect(findings).toHaveLength(0);
    });

    it('skips unspecified 0.0.0.0', () => {
      const findings = detectIpAddresses('bind: 0.0.0.0');
      expect(findings).toHaveLength(0);
    });

    it('rejects out-of-range octet (256)', () => {
      const findings = detectIpAddresses('Bad: 256.1.1.1');
      expect(findings).toHaveLength(0);
    });

    it('skips version numbers preceded by v', () => {
      const findings = detectIpAddresses('Running v2.0.0.1');
      expect(findings).toHaveLength(0);
    });

    it('skips version numbers preceded by "version"', () => {
      const findings = detectIpAddresses('Use version2.0.0.1');
      expect(findings).toHaveLength(0);
    });

    it('skips version numbers with space after "version"', () => {
      const findings = detectIpAddresses('version 1.2.3.4');
      expect(findings).toHaveLength(0);
    });

    it('skips version numbers preceded by "v"', () => {
      const findings = detectIpAddresses('Update to v1.2.3.4 now');
      expect(findings).toHaveLength(0);
    });

    it('skips version numbers preceded by "ver."', () => {
      const findings = detectIpAddresses('Using ver. 2.0.0.1');
      expect(findings).toHaveLength(0);
    });

    it('rejects leading zeros in octets', () => {
      const findings = detectIpAddresses('IP: 192.168.01.1');
      expect(findings).toHaveLength(0);
    });

    it('still rejects longer dotted sequences (5+ groups)', () => {
      const findings = detectIpAddresses('OID: 1.2.3.4.5');
      expect(findings).toHaveLength(0);
    });
  });

  // ── IPv6 ────────────────────────────────────────────────────────────

  describe('IPv6 true positives', () => {
    it('detects full IPv6 address', () => {
      const findings = detectIpAddresses('Host: 2001:0db8:85a3:0000:0000:8a2e:0370:7334');
      expect(findings).toHaveLength(1);
      expect(findings[0]?.value).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it('detects compressed IPv6', () => {
      const findings = detectIpAddresses('DNS: 2001:db8::1');
      expect(findings).toHaveLength(1);
    });

    it('detects link-local fe80', () => {
      const findings = detectIpAddresses('Link: fe80::1');
      expect(findings).toHaveLength(1);
    });
  });

  describe('IPv6 true negatives', () => {
    it('skips loopback ::1', () => {
      const findings = detectIpAddresses('localhost: ::1');
      expect(findings).toHaveLength(0);
    });
  });

  // ── Index accuracy ──────────────────────────────────────────────────

  describe('startIndex and endIndex accuracy', () => {
    it('returns correct indices for IPv4', () => {
      const text = 'IP is 192.168.1.1 ok';
      const findings = detectIpAddresses(text);
      expect(findings).toHaveLength(1);
      expect(text.slice(findings[0]?.startIndex, findings[0]?.endIndex)).toBe('192.168.1.1');
    });
  });
});

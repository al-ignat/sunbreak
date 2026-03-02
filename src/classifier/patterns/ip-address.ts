import type { Finding } from '../types';

/**
 * IPv4 pattern: four octets separated by dots, with word boundaries.
 * Each octet captured for 0-255 validation.
 */
const IPV4_PATTERN =
  /(?<!\d)(?<!\.)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?!\d)(?!\.)/g;

/** IPv4 addresses to skip (loopback, unspecified) */
const IPV4_SKIP = new Set(['127.0.0.1', '0.0.0.0']);

/**
 * IPv6 patterns — match common forms:
 * - Full: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
 * - Compressed: 2001:db8:85a3::8a2e:370:7334
 * - Simple compressed: ::1, fe80::1, ::ffff:192.168.1.1
 */
const IPV6_PATTERN =
  /(?<![:\w])(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(?![:\w])|(?<![:\w])(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}(?![:\w])|(?<![:\w])(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}(?![:\w])|(?<![:\w])(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}(?![:\w])|(?<![:\w])(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}(?![:\w])|(?<![:\w])(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}(?![:\w])|(?<![:\w])[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}(?![:\w])|(?<![:\w])::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}(?![:\w])|(?<![:\w])(?:[0-9a-fA-F]{1,4}:){1,7}:(?![:\w])/g;

/** IPv6 addresses to skip (loopback) */
const IPV6_SKIP = new Set(['::1']);

function isValidOctet(str: string): boolean {
  const n = Number(str);
  return n >= 0 && n <= 255 && String(n) === str; // reject leading zeros like "01"
}

function detectIPv4(text: string): Finding[] {
  const findings: Finding[] = [];
  let match: RegExpExecArray | null;

  IPV4_PATTERN.lastIndex = 0;

  while ((match = IPV4_PATTERN.exec(text)) !== null) {
    const value = match[0];

    // Skip loopback/unspecified
    if (IPV4_SKIP.has(value)) continue;

    // Validate each octet is 0-255 (and no leading zeros)
    const o1 = match[1] ?? '';
    const o2 = match[2] ?? '';
    const o3 = match[3] ?? '';
    const o4 = match[4] ?? '';
    if (!isValidOctet(o1) || !isValidOctet(o2) || !isValidOctet(o3) || !isValidOctet(o4)) {
      continue;
    }

    // Skip if preceded by 'v' or 'version' (likely a version number)
    if (match.index > 0) {
      const charBefore = text[match.index - 1];
      if (charBefore === 'v' || charBefore === 'V') continue;
    }
    if (match.index >= 8) {
      const wordBefore = text.slice(Math.max(0, match.index - 8), match.index).toLowerCase();
      if (wordBefore.endsWith('version')) continue;
    }

    findings.push({
      type: 'ip-address',
      value,
      startIndex: match.index,
      endIndex: match.index + value.length,
      confidence: 'MEDIUM',
      label: 'IP Address',
      placeholder: '',
    });
  }

  return findings;
}

function detectIPv6(text: string): Finding[] {
  const findings: Finding[] = [];
  let match: RegExpExecArray | null;

  IPV6_PATTERN.lastIndex = 0;

  while ((match = IPV6_PATTERN.exec(text)) !== null) {
    const value = match[0];

    // Skip loopback
    if (IPV6_SKIP.has(value)) continue;

    findings.push({
      type: 'ip-address',
      value,
      startIndex: match.index,
      endIndex: match.index + value.length,
      confidence: 'MEDIUM',
      label: 'IP Address',
      placeholder: '',
    });
  }

  return findings;
}

/** Detect IP addresses (IPv4 and IPv6) in text */
export function detectIpAddresses(text: string): Finding[] {
  return [...detectIPv4(text), ...detectIPv6(text)];
}

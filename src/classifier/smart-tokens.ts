import type { Finding } from './types';

/** Well-known role/non-personal email prefixes */
const ROLE_PREFIXES = new Set([
  'admin', 'support', 'info', 'sales', 'billing', 'marketing', 'team',
  'hello', 'contact', 'help', 'noreply', 'no-reply', 'git', 'postmaster',
  'webmaster', 'office', 'hr', 'careers', 'press', 'media', 'abuse',
  'security', 'feedback', 'newsletter', 'notifications', 'mailer-daemon',
  'hostmaster', 'root', 'sysadmin', 'ops', 'devops', 'engineering',
]);

/** Capitalize first letter, lowercase rest */
function capitalize(str: string): string {
  const first = str[0];
  if (first === undefined) return str;
  return first.toUpperCase() + str.slice(1).toLowerCase();
}

/** Strip trailing digits from a string: "john123" -> "john" */
function stripTrailingDigits(str: string): string {
  return str.replace(/\d+$/, '');
}

/** Check if a string is purely alphabetic */
function isAlphabetic(str: string): boolean {
  return /^[a-zA-Z]+$/.test(str);
}

/**
 * Extract a human name from an email local part.
 * Returns null if no name can be extracted (role address, all digits, etc).
 */
export function extractNameFromEmail(localPart: string): string | null {
  // Strip plus-addressing: "john+tag" -> "john"
  const stripped = localPart.split('+')[0] ?? localPart;
  const lower = stripped.toLowerCase();

  // Check for role/non-personal prefixes (on the full stripped part)
  if (ROLE_PREFIXES.has(lower)) return null;

  // Split on ".", "_", or "-"
  const parts = stripped.split(/[._-]/).filter((p) => p.length > 0);

  // Strip trailing digits from each part
  const cleaned = parts.map(stripTrailingDigits).filter((p) => p.length > 0);

  // If no usable parts remain (all digits), return null
  if (cleaned.length === 0) return null;

  // Filter to alphabetic-only parts for name construction
  const alphaParts = cleaned.filter(isAlphabetic);

  if (alphaParts.length === 0) return null;

  if (alphaParts.length === 1) {
    const name = alphaParts[0];
    if (name === undefined) return null;
    // Check role again after splitting (e.g., "support-team" splits to "support", "team")
    if (ROLE_PREFIXES.has(name.toLowerCase())) return null;
    return capitalize(name);
  }

  if (alphaParts.length === 2) {
    const first = alphaParts[0];
    const last = alphaParts[1];
    if (first === undefined || last === undefined) return null;

    // Single-char first name = treat as initial + full last name
    if (first.length === 1) {
      return `${first.toUpperCase()}. ${capitalize(last)}`;
    }

    // Standard: "John S."
    const lastInitial = last[0];
    if (lastInitial === undefined) return null;
    return `${capitalize(first)} ${lastInitial.toUpperCase()}.`;
  }

  // 3+ parts: use first + last initial
  const first = alphaParts[0];
  const last = alphaParts[alphaParts.length - 1];
  if (first === undefined || last === undefined) return null;
  const lastChar = last[0];
  if (lastChar === undefined) return null;

  if (first.length === 1) {
    return `${first.toUpperCase()}. ${lastChar.toUpperCase()}.`;
  }

  return `${capitalize(first)} ${lastChar.toUpperCase()}.`;
}

/** Extract last N digits from a string (stripping non-digits) */
function lastDigits(value: string, count: number): string {
  const digits = value.replace(/\D/g, '');
  return digits.slice(-count);
}

/** RFC 1918 private IPv4 ranges */
function isPrivateIPv4(value: string): boolean {
  const parts = value.split('.').map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts as [number, number, number, number];
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  return false;
}

/** Check if an IPv6 address is ULA (fd00::/8) */
function isULAIPv6(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.startsWith('fd');
}

/** Check if an IP address is private/internal */
function isPrivateIP(value: string): boolean {
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return isPrivateIPv4(value);
  }
  // IPv6 ULA
  return isULAIPv6(value);
}

/**
 * Token generation context — tracks existing tokens for disambiguation.
 */
export interface TokenContext {
  /** Map of descriptive base -> count of values using that base */
  readonly usedTokens: Map<string, number>;
  /** Map of type:value -> already-assigned token */
  readonly valueTokens: Map<string, string>;
}

export function createTokenContext(): TokenContext {
  return {
    usedTokens: new Map(),
    valueTokens: new Map(),
  };
}

/**
 * Generate a descriptive token for a finding.
 *
 * Returns a bracket-enclosed human-readable placeholder like
 * `[John S. email]`, `[card ending 4242]`, `[internal IP]`.
 *
 * The context is used to deduplicate: same type+value always gets the same
 * token, and collisions (different values producing the same base) get a
 * disambiguating counter.
 */
export function generateDescriptiveToken(
  finding: Finding,
  context: TokenContext,
): string {
  const key = `${finding.type}:${finding.value}`;

  // Return cached token if same value was already seen
  const existing = context.valueTokens.get(key);
  if (existing !== undefined) return existing;

  const base = generateTokenBase(finding);
  const count = (context.usedTokens.get(base) ?? 0) + 1;
  context.usedTokens.set(base, count);

  // First occurrence: no counter. Second+: append counter.
  const token = count === 1 ? `[${base}]` : `[${base} ${count}]`;
  context.valueTokens.set(key, token);

  return token;
}

/** Generate the base descriptive text (without brackets) for a finding */
function generateTokenBase(finding: Finding): string {
  switch (finding.type) {
    case 'email':
      return generateEmailToken(finding.value);
    case 'phone':
      return `phone ending ${lastDigits(finding.value, 2)}`;
    case 'credit-card':
      return `card ending ${lastDigits(finding.value, 4)}`;
    case 'ssn':
      return 'SSN redacted';
    case 'cpr':
      return 'CPR redacted';
    case 'ni-number':
      return 'NI number redacted';
    case 'api-key':
      return generateApiKeyToken(finding.label);
    case 'ip-address':
      return isPrivateIP(finding.value) ? 'internal IP' : 'IP address';
    case 'keyword':
      return 'custom keyword';
  }
}

/** Generate email token base from email value */
function generateEmailToken(value: string): string {
  const localPart = value.split('@')[0] ?? '';
  const name = extractNameFromEmail(localPart);

  if (name === null) {
    return 'email';
  }

  // Single-word name: "John's email"
  if (!name.includes(' ') && !name.includes('.')) {
    return `${name}'s email`;
  }

  // Multi-part name: "John S. email"
  return `${name} email`;
}

/** Words to keep uppercase in API key tokens */
const UPPERCASE_WORDS = new Set(['API', 'AWS', 'SSH', 'SSL', 'TLS']);

/** Generate API key token base from label */
function generateApiKeyToken(label: string): string {
  // Map known labels to concise token bases
  if (label === 'Possible API Key') return 'API key';
  // For provider-specific labels, selectively lowercase
  // "OpenAI API Key" -> "OpenAI API key"
  // "AWS Access Key" -> "AWS access key"
  const parts = label.split(' ');
  if (parts.length <= 1) return 'API key';
  // Keep first word as-is (provider name), selectively lowercase the rest
  return parts[0] + ' ' + parts.slice(1).map((p) =>
    UPPERCASE_WORDS.has(p) ? p : p.toLowerCase(),
  ).join(' ');
}

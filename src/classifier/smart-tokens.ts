import type { Finding, FindingType } from './types';

/** Well-known role/non-personal email prefixes */
const ROLE_PREFIXES = new Set([
  'admin', 'support', 'info', 'sales', 'billing', 'marketing', 'team',
  'hello', 'contact', 'help', 'noreply', 'no-reply', 'git', 'postmaster',
  'webmaster', 'office', 'hr', 'careers', 'press', 'media', 'abuse',
  'security', 'feedback', 'newsletter', 'notifications', 'mailer-daemon',
  'hostmaster', 'root', 'sysadmin', 'ops', 'devops', 'engineering',
]);

/** Non-personal mailbox suffixes/parts that should never be presented as names */
const ROLE_QUALIFIERS = new Set([
  'team', 'desk', 'group', 'shared', 'distribution', 'mailbox', 'inbox',
  'ops', 'devops', 'engineering', 'support', 'security', 'admin', 'help',
  'contact', 'office', 'careers', 'billing', 'sales', 'press', 'media',
]);

export interface TokenPolicy {
  readonly style: 'identity' | 'trailing-digits' | 'static';
  readonly genericBase: string;
  readonly safeHints: ReadonlyArray<'person' | 'last-digits' | 'network-scope' | 'provider-label'>;
  readonly disclosure: 'generic-only' | 'bounded';
}

/**
 * Product-standard token taxonomy.
 * This is the safety contract for placeholder generation.
 */
export const TOKEN_POLICY_BY_TYPE: Record<FindingType, TokenPolicy> = {
  email: {
    style: 'identity',
    genericBase: 'email',
    safeHints: ['person'],
    disclosure: 'bounded',
  },
  phone: {
    style: 'trailing-digits',
    genericBase: 'phone',
    safeHints: ['last-digits'],
    disclosure: 'bounded',
  },
  'credit-card': {
    style: 'trailing-digits',
    genericBase: 'card',
    safeHints: ['last-digits'],
    disclosure: 'bounded',
  },
  ssn: {
    style: 'static',
    genericBase: 'SSN redacted',
    safeHints: [],
    disclosure: 'generic-only',
  },
  cpr: {
    style: 'static',
    genericBase: 'CPR redacted',
    safeHints: [],
    disclosure: 'generic-only',
  },
  'ni-number': {
    style: 'static',
    genericBase: 'NI number redacted',
    safeHints: [],
    disclosure: 'generic-only',
  },
  'ip-address': {
    style: 'static',
    genericBase: 'IP address',
    safeHints: ['network-scope'],
    disclosure: 'bounded',
  },
  'api-key': {
    style: 'static',
    genericBase: 'API key',
    safeHints: ['provider-label'],
    disclosure: 'bounded',
  },
  keyword: {
    style: 'static',
    genericBase: 'custom keyword',
    safeHints: [],
    disclosure: 'generic-only',
  },
  'custom-pattern': {
    style: 'static',
    genericBase: 'company identifier',
    safeHints: [],
    disclosure: 'generic-only',
  },
};

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

function trimTrailingRoleQualifiers(parts: ReadonlyArray<string>): string[] {
  let end = parts.length;
  while (end > 1) {
    const part = parts[end - 1];
    const lower = part?.toLowerCase();
    if (
      lower === undefined ||
      (!ROLE_QUALIFIERS.has(lower) && !ROLE_PREFIXES.has(lower))
    ) {
      break;
    }
    end--;
  }
  return parts.slice(0, end);
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

  const normalizedAlphaParts = alphaParts.map((part) => part.toLowerCase());
  const firstAlpha = normalizedAlphaParts[0];

  if (firstAlpha !== undefined && ROLE_PREFIXES.has(firstAlpha) && normalizedAlphaParts.length > 1) {
    return null;
  }

  const trimmedAlphaParts = trimTrailingRoleQualifiers(alphaParts);
  const normalizedTrimmedAlphaParts = trimmedAlphaParts.map((part) => part.toLowerCase());
  const allRoleLike = normalizedAlphaParts.every((part) =>
    ROLE_PREFIXES.has(part) || ROLE_QUALIFIERS.has(part)
  );
  if (allRoleLike) return null;

  if (
    firstAlpha !== undefined &&
    ROLE_PREFIXES.has(firstAlpha) &&
    normalizedAlphaParts.some((part) => ROLE_QUALIFIERS.has(part))
  ) {
    return null;
  }

  if (trimmedAlphaParts.length === 1) {
    const name = trimmedAlphaParts[0];
    if (name === undefined) return null;
    // Check role again after splitting (e.g., "support-team" splits to "support", "team")
    if (ROLE_PREFIXES.has(name.toLowerCase())) return null;
    return capitalize(name);
  }

  if (trimmedAlphaParts.length === 2) {
    const first = trimmedAlphaParts[0];
    const last = trimmedAlphaParts[1];
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
  const first = trimmedAlphaParts[0];
  const last = normalizedTrimmedAlphaParts[normalizedTrimmedAlphaParts.length - 1];
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
  const policy = TOKEN_POLICY_BY_TYPE[finding.type];
  switch (finding.type) {
    case 'email':
      return generateEmailToken(finding.value, policy.genericBase);
    case 'phone':
      return `${policy.genericBase} ending ${lastDigits(finding.value, 2)}`;
    case 'credit-card':
      return `${policy.genericBase} ending ${lastDigits(finding.value, 4)}`;
    case 'ssn':
      return policy.genericBase;
    case 'cpr':
      return policy.genericBase;
    case 'ni-number':
      return policy.genericBase;
    case 'api-key':
      return generateApiKeyToken(finding.label, policy.genericBase);
    case 'ip-address':
      return isPrivateIP(finding.value) ? 'internal IP' : policy.genericBase;
    case 'keyword':
      return policy.genericBase;
    case 'custom-pattern':
      return policy.genericBase;
  }
}

/** Generate email token base from email value */
function generateEmailToken(value: string, genericBase: string): string {
  const localPart = value.split('@')[0] ?? '';
  const name = extractNameFromEmail(localPart);

  if (name === null) {
    return genericBase;
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
function generateApiKeyToken(label: string, genericBase: string): string {
  // Map known labels to concise token bases
  if (label === 'Possible API Key') return genericBase;
  // For provider-specific labels, selectively lowercase
  // "OpenAI API Key" -> "OpenAI API key"
  // "AWS Access Key" -> "AWS access key"
  const parts = label.split(' ');
  if (parts.length <= 1) return genericBase;
  // Keep first word as-is (provider name), selectively lowercase the rest
  return parts[0] + ' ' + parts.slice(1).map((p) =>
    UPPERCASE_WORDS.has(p) ? p : p.toLowerCase(),
  ).join(' ');
}

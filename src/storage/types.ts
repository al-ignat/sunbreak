import type { FindingType } from '../classifier/types';

/** A flagged event record — metadata only, NEVER stores prompt text */
export interface FlaggedEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly tool: string;
  readonly categories: ReadonlyArray<string>;
  readonly findingCount: number;
  readonly action: 'redacted' | 'sent-anyway' | 'cancelled' | 'edited' | 'fixed' | 'ignored';
}

/** Daily interaction counter */
export interface DailyStats {
  readonly totalInteractions: number;
  readonly flaggedCount: number;
  readonly redactedCount: number;
  readonly sentAnywayCount: number;
  readonly cancelledCount: number;
  readonly editedCount: number;
  readonly fixedCount: number;
  readonly ignoredCount: number;
  readonly byTool: Record<string, number>;
}

/** Extension-level on/off and mode settings */
export interface ExtensionSettings {
  readonly enabled: boolean;
  readonly interventionMode: 'warn' | 'log-only';
  readonly maskingEnabled: boolean;
}

/** Per-category detection toggles */
export type DetectionSettings = Record<FindingType, boolean>;

/** All detection categories with human-readable descriptions */
export const DETECTION_CATEGORIES: ReadonlyArray<{
  readonly type: FindingType;
  readonly label: string;
  readonly description: string;
}> = [
  { type: 'email', label: 'Email Addresses', description: 'Detects email addresses in prompts' },
  { type: 'phone', label: 'Phone Numbers', description: 'Detects phone numbers (US and international formats)' },
  { type: 'credit-card', label: 'Credit Card Numbers', description: 'Detects credit card numbers with Luhn validation' },
  { type: 'ssn', label: 'Social Security Numbers', description: 'Detects US SSN patterns (XXX-XX-XXXX)' },
  { type: 'cpr', label: 'Danish CPR Numbers', description: 'Detects Danish CPR numbers (DDMMYY-XXXX)' },
  { type: 'ni-number', label: 'UK National Insurance', description: 'Detects UK NI numbers (XX 99 99 99 X)' },
  { type: 'ip-address', label: 'IP Addresses', description: 'Detects IPv4 and IPv6 addresses' },
  { type: 'api-key', label: 'API Keys & Tokens', description: 'Detects AWS, GitHub, Stripe, OpenAI, and generic API keys' },
  { type: 'keyword', label: 'Custom Keywords', description: 'Matches your custom keyword list' },
  { type: 'custom-pattern', label: 'Company Patterns', description: 'Runs your company-specific identifier patterns' },
];

/** Default detection settings — all categories enabled */
export const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
  'email': true,
  'phone': true,
  'credit-card': true,
  'ssn': true,
  'cpr': true,
  'ni-number': true,
  'ip-address': true,
  'api-key': true,
  'keyword': true,
  'custom-pattern': true,
};

/** Default extension settings */
export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  enabled: true,
  interventionMode: 'warn',
  maskingEnabled: true,
};

/** Filter options for querying flagged events */
export interface EventFilter {
  readonly days?: number;
  readonly tool?: string;
}

/** Aggregated stats for a time period */
export interface AggregatedStats {
  readonly totalInteractions: number;
  readonly flaggedCount: number;
  readonly redactedCount: number;
  readonly sentAnywayCount: number;
  readonly cancelledCount: number;
  readonly editedCount: number;
  readonly fixedCount: number;
  readonly ignoredCount: number;
  readonly byTool: Record<string, number>;
  readonly dailyBreakdown: ReadonlyArray<{
    readonly date: string;
    readonly total: number;
    readonly flagged: number;
    readonly clean: number;
    readonly byTool: Record<string, number>;
  }>;
  readonly complianceRate: number | null;
}

export type CustomPatternSeverity = 'warning' | 'concern' | 'critical';

export type CustomPatternCategory =
  | 'internal-identifier'
  | 'finance'
  | 'hr'
  | 'legal'
  | 'security'
  | 'operations'
  | 'other';

export type CustomPatternSourceMode = 'template' | 'advanced-regex';

export type CustomPatternTemplateId =
  | 'employee-id'
  | 'customer-id'
  | 'invoice-number'
  | 'project-code'
  | 'ticket-reference'
  | 'matter-reference';

export interface CustomPatternSamples {
  readonly positive: ReadonlyArray<string>;
  readonly negative: ReadonlyArray<string>;
}

/** Stored editable company-specific pattern definition */
export interface CustomPattern {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly severity: CustomPatternSeverity;
  readonly category: CustomPatternCategory;
  readonly sourceMode: CustomPatternSourceMode;
  readonly templateId: CustomPatternTemplateId | null;
  readonly pattern: string;
  readonly flags: string;
  readonly samples: CustomPatternSamples;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CustomPatternBundle {
  readonly version: 1;
  readonly exportedAt: string;
  readonly patterns: ReadonlyArray<CustomPattern>;
}

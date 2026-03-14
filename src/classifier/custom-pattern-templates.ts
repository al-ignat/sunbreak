import { escapeRegExp } from './keywords';
import type {
  CustomPatternCategory,
  CustomPatternSeverity,
  CustomPatternTemplateId,
} from '../storage/types';

export interface CustomPatternTemplateField {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly defaultValue: string;
}

export interface CustomPatternTemplate {
  readonly id: CustomPatternTemplateId;
  readonly title: string;
  readonly description: string;
  readonly category: CustomPatternCategory;
  readonly severity: CustomPatternSeverity;
  readonly fields: ReadonlyArray<CustomPatternTemplateField>;
  readonly examples: {
    readonly positive: ReadonlyArray<string>;
    readonly negative: ReadonlyArray<string>;
  };
  buildPattern(values: Record<string, string>): string;
}

function positiveInteger(values: Record<string, string>, key: string, fallback: number): number {
  const value = Number.parseInt(values[key] ?? '', 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function textValue(values: Record<string, string>, key: string, fallback: string): string {
  const value = values[key]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function prefixDigitsTemplate(
  id: CustomPatternTemplateId,
  title: string,
  description: string,
  category: CustomPatternCategory,
  severity: CustomPatternSeverity,
  prefix: string,
  digits: number,
): CustomPatternTemplate {
  return {
    id,
    title,
    description,
    category,
    severity,
    fields: [
      {
        id: 'prefix',
        label: 'Prefix',
        description: 'Static prefix that appears before the numeric identifier.',
        defaultValue: prefix,
      },
      {
        id: 'digits',
        label: 'Digits',
        description: 'Number of digits after the prefix.',
        defaultValue: String(digits),
      },
    ],
    examples: {
      positive: [`${prefix}${'1'.repeat(digits)}`],
      negative: [`${prefix}${'1'.repeat(Math.max(1, digits - 1))}`],
    },
    buildPattern(values): string {
      const resolvedPrefix = escapeRegExp(textValue(values, 'prefix', prefix));
      const resolvedDigits = positiveInteger(values, 'digits', digits);
      return `${resolvedPrefix}[0-9]{${resolvedDigits}}`;
    },
  };
}

export const CUSTOM_PATTERN_TEMPLATES: ReadonlyArray<CustomPatternTemplate> = [
  prefixDigitsTemplate(
    'employee-id',
    'Employee ID',
    'Matches internal employee identifiers with a static prefix and numeric suffix.',
    'internal-identifier',
    'warning',
    'EMP-',
    5,
  ),
  prefixDigitsTemplate(
    'customer-id',
    'Customer ID',
    'Matches customer identifiers used in CRM or support workflows.',
    'operations',
    'warning',
    'CUST-',
    6,
  ),
  prefixDigitsTemplate(
    'invoice-number',
    'Invoice Number',
    'Matches invoice or billing references with a fixed prefix.',
    'finance',
    'concern',
    'INV-',
    6,
  ),
  {
    id: 'project-code',
    title: 'Project Code',
    description: 'Matches project codes made from a fixed prefix, uppercase segment, and numeric suffix.',
    category: 'internal-identifier',
    severity: 'warning',
    fields: [
      {
        id: 'prefix',
        label: 'Prefix',
        description: 'Static project code prefix.',
        defaultValue: 'PROJ-',
      },
      {
        id: 'letters',
        label: 'Letters',
        description: 'Number of uppercase letters in the middle segment.',
        defaultValue: '3',
      },
      {
        id: 'digits',
        label: 'Digits',
        description: 'Number of trailing digits.',
        defaultValue: '2',
      },
    ],
    examples: {
      positive: ['PROJ-ABC-12'],
      negative: ['PROJ-AB12'],
    },
    buildPattern(values): string {
      const prefix = escapeRegExp(textValue(values, 'prefix', 'PROJ-'));
      const letters = positiveInteger(values, 'letters', 3);
      const digits = positiveInteger(values, 'digits', 2);
      return `${prefix}[A-Z]{${letters}}-[0-9]{${digits}}`;
    },
  },
  prefixDigitsTemplate(
    'ticket-reference',
    'Ticket Reference',
    'Matches support or incident ticket identifiers.',
    'operations',
    'warning',
    'CASE-',
    7,
  ),
  prefixDigitsTemplate(
    'matter-reference',
    'Matter Reference',
    'Matches contract, legal matter, or case references with a static prefix.',
    'legal',
    'concern',
    'MAT-',
    6,
  ),
];

export function getCustomPatternTemplate(
  templateId: CustomPatternTemplateId,
): CustomPatternTemplate | null {
  return CUSTOM_PATTERN_TEMPLATES.find((template) => template.id === templateId) ?? null;
}

export function buildPatternFromTemplate(
  templateId: CustomPatternTemplateId,
  values: Record<string, string>,
): string | null {
  const template = getCustomPatternTemplate(templateId);
  if (!template) return null;
  return template.buildPattern(values);
}

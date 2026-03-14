/** Shared display helpers for tool and action labels/colors */

const TOOL_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
};

const TOOL_COLORS: Record<string, string> = {
  chatgpt: '#10A37F',
  claude: '#D97706',
  gemini: '#4285F4',
};

/** Lighter tool colors for dark backgrounds (WCAG AA on #1E1D21) */
const TOOL_COLORS_DARK: Record<string, string> = {
  chatgpt: '#34D399',
  claude: '#F59E0B',
  gemini: '#60A5FA',
};

const ACTION_LABELS: Record<string, string> = {
  redacted: 'Redacted',
  'sent-anyway': 'Sent Anyway',
  cancelled: 'Cancelled',
  edited: 'Edited',
  fixed: 'Fixed',
  ignored: 'Ignored',
  'file-warning': 'File Warning',
};

const ACTION_COLORS: Record<string, string> = {
  redacted: '#2E7D32',
  'sent-anyway': '#E65100',
  cancelled: '#888',
  edited: '#1565C0',
  fixed: '#2E7D32',
  ignored: '#6B6869',
  'file-warning': '#E65100',
};

/** Lighter action colors for dark backgrounds (WCAG AA on #1E1D21) */
const ACTION_COLORS_DARK: Record<string, string> = {
  redacted: '#34D399',
  'sent-anyway': '#F59E0B',
  cancelled: '#6B6869',
  edited: '#60A5FA',
  fixed: '#34D399',
  ignored: '#9B9898',
  'file-warning': '#F59E0B',
};

/** Tinted background for tool pill badges */
const TOOL_BG: Record<string, string> = {
  chatgpt: '#0A2A1F',
  claude: '#1A1510',
  gemini: '#0D1528',
};

/** Per-category detection colors for badge accents */
const CATEGORY_COLORS: Record<string, string> = {
  'credit-card': '#EF4444',
  credit_card: '#EF4444',
  ssn: '#EF4444',
  email: '#F59E0B',
  phone: '#F59E0B',
  'ip-address': '#3B82F6',
  ip_address: '#3B82F6',
  'api-key': '#8B5CF6',
  api_key: '#8B5CF6',
  keyword: '#6B7280',
  custom_keyword: '#6B7280',
  'custom-pattern': '#14B8A6',
  'file-upload': '#F59E0B',
  danish_cpr: '#EF4444',
  uk_ni: '#EF4444',
  cpr: '#EF4444',
  'ni-number': '#EF4444',
};

/** Category colors for dark backgrounds (WCAG AA on #1E1D21) */
const CATEGORY_COLORS_DARK: Record<string, string> = {
  'credit-card': '#FB923C',
  credit_card: '#FB923C',
  ssn: '#FB923C',
  email: '#FBBF24',
  phone: '#FBBF24',
  'ip-address': '#60A5FA',
  ip_address: '#60A5FA',
  'api-key': '#F87171',
  api_key: '#F87171',
  keyword: '#60A5FA',
  custom_keyword: '#60A5FA',
  'custom-pattern': '#2DD4BF',
  'file-upload': '#FBBF24',
  danish_cpr: '#FB923C',
  uk_ni: '#FB923C',
  cpr: '#FB923C',
  'ni-number': '#FB923C',
};

/** Tinted background for category pill badges */
const CATEGORY_BG: Record<string, string> = {
  'credit-card': '#2A2010',
  credit_card: '#2A2010',
  ssn: '#2A2010',
  email: '#2A2010',
  phone: '#2A2010',
  'ip-address': '#101828',
  ip_address: '#101828',
  'api-key': '#2A1010',
  api_key: '#2A1010',
  keyword: '#101828',
  custom_keyword: '#101828',
  'custom-pattern': '#0E2325',
  'file-upload': '#2A2010',
  danish_cpr: '#2A2010',
  uk_ni: '#2A2010',
  cpr: '#2A2010',
  'ni-number': '#2A2010',
};

/** Display labels for category types */
const CATEGORY_LABELS: Record<string, string> = {
  'credit-card': 'Credit Card',
  credit_card: 'Credit Card',
  ssn: 'SSN',
  email: 'Email',
  phone: 'Phone',
  'ip-address': 'IP Address',
  ip_address: 'IP Address',
  'api-key': 'API Key',
  api_key: 'API Key',
  keyword: 'Keyword',
  custom_keyword: 'Keyword',
  'file-upload': 'File Upload',
  danish_cpr: 'CPR',
  uk_ni: 'NI Number',
  cpr: 'CPR',
  'ni-number': 'NI Number',
};

export function toolLabel(tool: string): string {
  return TOOL_LABELS[tool] ?? tool;
}

export function toolColor(tool: string, dark = false): string {
  const colors = dark ? TOOL_COLORS_DARK : TOOL_COLORS;
  return colors[tool] ?? '#6B6869';
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function actionColor(action: string, dark = false): string {
  const colors = dark ? ACTION_COLORS_DARK : ACTION_COLORS;
  return colors[action] ?? '#6B6869';
}

export function toolBgColor(tool: string): string {
  return TOOL_BG[tool] ?? '#1E1D21';
}

export function categoryColor(category: string, dark = false): string {
  if (category.startsWith('custom-pattern:')) {
    const colors = dark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS;
    return colors['custom-pattern'] ?? (dark ? '#9B9898' : '#6B7280');
  }
  const colors = dark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS;
  return colors[category] ?? (dark ? '#9B9898' : '#6B7280');
}

export function categoryBgColor(category: string): string {
  if (category.startsWith('custom-pattern:')) {
    return CATEGORY_BG['custom-pattern'] ?? '#1E1D21';
  }
  return CATEGORY_BG[category] ?? '#1E1D21';
}

export function categoryLabel(category: string): string {
  if (category.startsWith('custom-pattern:')) {
    const bucket = category.split(':')[1] ?? 'other';
    return `Company Pattern: ${bucket.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`;
  }
  return CATEGORY_LABELS[category]
    ?? category.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

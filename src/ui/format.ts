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
};

const ACTION_COLORS: Record<string, string> = {
  redacted: '#2E7D32',
  'sent-anyway': '#E65100',
  cancelled: '#888',
  edited: '#1565C0',
};

/** Lighter action colors for dark backgrounds (WCAG AA on #1E1D21) */
const ACTION_COLORS_DARK: Record<string, string> = {
  redacted: '#34D399',
  'sent-anyway': '#F59E0B',
  cancelled: '#6B6869',
  edited: '#60A5FA',
};

/** Tinted background for tool pill badges */
const TOOL_BG: Record<string, string> = {
  chatgpt: '#0A2A1F',
  claude: '#1A1510',
  gemini: '#0D1528',
};

/** Per-category detection colors for badge accents */
const CATEGORY_COLORS: Record<string, string> = {
  credit_card: '#EF4444',
  ssn: '#EF4444',
  email: '#F59E0B',
  phone: '#F59E0B',
  ip_address: '#3B82F6',
  api_key: '#8B5CF6',
  custom_keyword: '#6B7280',
  danish_cpr: '#EF4444',
  uk_ni: '#EF4444',
};

/** Category colors for dark backgrounds (WCAG AA on #1E1D21) */
const CATEGORY_COLORS_DARK: Record<string, string> = {
  credit_card: '#FB923C',
  ssn: '#FB923C',
  email: '#FBBF24',
  phone: '#FBBF24',
  ip_address: '#60A5FA',
  api_key: '#F87171',
  custom_keyword: '#60A5FA',
  danish_cpr: '#FB923C',
  uk_ni: '#FB923C',
};

/** Tinted background for category pill badges */
const CATEGORY_BG: Record<string, string> = {
  credit_card: '#2A2010',
  ssn: '#2A2010',
  email: '#2A2010',
  phone: '#2A2010',
  ip_address: '#101828',
  api_key: '#2A1010',
  custom_keyword: '#101828',
  danish_cpr: '#2A2010',
  uk_ni: '#2A2010',
};

/** Display labels for category types */
const CATEGORY_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  ssn: 'SSN',
  email: 'Email',
  phone: 'Phone',
  ip_address: 'IP Address',
  api_key: 'API Key',
  custom_keyword: 'Keyword',
  danish_cpr: 'CPR',
  uk_ni: 'NI Number',
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
  const colors = dark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS;
  return colors[category] ?? (dark ? '#9B9898' : '#6B7280');
}

export function categoryBgColor(category: string): string {
  return CATEGORY_BG[category] ?? '#1E1D21';
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

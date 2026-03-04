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

/** Lighter tool colors for dark backgrounds (WCAG AA on #242938) */
const TOOL_COLORS_DARK: Record<string, string> = {
  chatgpt: '#34D399',
  claude: '#FBBF24',
  gemini: '#93C5FD',
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

/** Lighter action colors for dark backgrounds (WCAG AA on #242938) */
const ACTION_COLORS_DARK: Record<string, string> = {
  redacted: '#4ADE80',
  'sent-anyway': '#FB923C',
  cancelled: '#9CA3AF',
  edited: '#93C5FD',
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

/** Lighter category colors for dark backgrounds */
const CATEGORY_COLORS_DARK: Record<string, string> = {
  credit_card: '#FCA5A5',
  ssn: '#FCA5A5',
  email: '#FDE68A',
  phone: '#FDE68A',
  ip_address: '#93C5FD',
  api_key: '#C4B5FD',
  custom_keyword: '#D1D5DB',
  danish_cpr: '#FCA5A5',
  uk_ni: '#FCA5A5',
};

export function toolLabel(tool: string): string {
  return TOOL_LABELS[tool] ?? tool;
}

export function toolColor(tool: string, dark = false): string {
  const colors = dark ? TOOL_COLORS_DARK : TOOL_COLORS;
  return colors[tool] ?? '#555';
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function actionColor(action: string, dark = false): string {
  const colors = dark ? ACTION_COLORS_DARK : ACTION_COLORS;
  return colors[action] ?? '#555';
}

export function categoryColor(category: string, dark = false): string {
  const colors = dark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS;
  return colors[category] ?? (dark ? '#9CA3AF' : '#6B7280');
}

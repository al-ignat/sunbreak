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

export function toolLabel(tool: string): string {
  return TOOL_LABELS[tool] ?? tool;
}

export function toolColor(tool: string): string {
  return TOOL_COLORS[tool] ?? '#555';
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function actionColor(action: string): string {
  return ACTION_COLORS[action] ?? '#555';
}

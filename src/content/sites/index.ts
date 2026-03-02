import type { SiteAdapter } from '../../types';
import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { geminiAdapter } from './gemini';

/** All registered site adapters */
export const adapters: readonly SiteAdapter[] = [
  chatgptAdapter,
  claudeAdapter,
  geminiAdapter,
];

/** Find the adapter matching the given hostname, or null */
export function selectAdapter(hostname: string): SiteAdapter | null {
  return adapters.find((a) => a.matches(hostname)) ?? null;
}

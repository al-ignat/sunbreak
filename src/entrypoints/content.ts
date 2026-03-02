import { startObserving } from '../content/observer';
import type { SiteName } from '../types';

// Match patterns must stay in sync with host_permissions in wxt.config.ts
export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://chat.openai.com/*',
    '*://claude.ai/*',
    '*://gemini.google.com/*',
  ],
  runAt: 'document_idle',
  main(ctx) {
    startObserving(
      ctx,
      (text: string, adapterName: SiteName) => {
        console.log(
          `[BYOAI] Prompt captured on ${adapterName}: ${text.length} chars`,
        );
      },
      (filename: string, adapterName: SiteName) => {
        console.log(
          `[BYOAI] File detected on ${adapterName}: ${filename}`,
        );
      },
    );
  },
});

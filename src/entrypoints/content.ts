import { startObserving } from '../content/observer';
import { selectAdapter } from '../content/sites';
import { createOrchestrator } from '../content/orchestrator';

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
    const adapter = selectAdapter(window.location.hostname);
    if (!adapter) return;

    const { onPromptIntercepted, onFileDetected, findingsState, scannerConfig } =
      createOrchestrator(adapter, ctx);

    startObserving(ctx, onPromptIntercepted, onFileDetected, {
      config: scannerConfig,
      state: findingsState,
    });
  },
});

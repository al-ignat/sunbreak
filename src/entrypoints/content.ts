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

    const { submitConfig, onFileDetected, onAttachmentRemoved, findingsState, scannerConfig, widgetController, maskingMap, clipboardInterceptor } =
      createOrchestrator(adapter, ctx);

    startObserving(ctx, submitConfig, onFileDetected, onAttachmentRemoved, {
      config: scannerConfig,
      state: findingsState,
    }, widgetController, maskingMap, clipboardInterceptor);
  },
});

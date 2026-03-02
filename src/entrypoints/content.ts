// Match patterns must stay in sync with host_permissions in wxt.config.ts
export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://chat.openai.com/*',
    '*://claude.ai/*',
    '*://gemini.google.com/*',
  ],
  runAt: 'document_idle',
  main() {
    // TODO: Remove before production — reveals extension presence to host page
    console.log('BYOAI loaded');
  },
});

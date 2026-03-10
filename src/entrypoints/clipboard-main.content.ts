/**
 * MAIN world content script — intercepts navigator.clipboard.writeText()
 * to detect when site "Copy" buttons write masked tokens to clipboard.
 *
 * Runs in the page's main world (not the extension's isolated world)
 * so it can monkey-patch the real clipboard API that site code uses.
 *
 * Communication: uses window.postMessage() which reliably crosses the
 * MAIN→ISOLATED world boundary via structured cloning.
 */
export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://chat.openai.com/*',
    '*://claude.ai/*',
    '*://gemini.google.com/*',
  ],
  runAt: 'document_start',
  world: 'MAIN',

  main(): void {
    const original = navigator.clipboard.writeText.bind(navigator.clipboard);

    navigator.clipboard.writeText = async function writeText(
      text: string,
    ): Promise<void> {
      // Let the original write proceed first (non-blocking for the site)
      const result = original(text);

      // Notify the isolated world about the write
      window.postMessage(
        { type: 'sunbreak:clipboard-write', text },
        '*',
      );

      return result;
    };
  },
});

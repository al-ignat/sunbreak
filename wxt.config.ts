import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Sunbreak',
    version: '1.0.0',
    description:
      'Use AI tools at work — safely. Detects sensitive data before you send it.',
    icons: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
    action: {
      default_icon: {
        '16': 'icons/icon-16.png',
        '32': 'icons/icon-32.png',
      },
      default_popup: 'popup.html',
    },
    permissions: ['storage'],
    // Must stay in sync with matches in src/entrypoints/content.ts
    host_permissions: [
      '*://chatgpt.com/*',
      '*://chat.openai.com/*',
      '*://claude.ai/*',
      '*://gemini.google.com/*',
    ],
  },
  vite: () => ({
    plugins: [preact()],
  }),
});

import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Secure BYOAI',
    version: '0.1.0',
    description:
      'Use AI tools at work — safely. Detects sensitive data before you send it.',
    permissions: ['storage'],
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

// Minimal chrome API mock for test environment.
// Expand as needed when tests import code that uses chrome.* APIs.
globalThis.chrome = {
  runtime: {
    onInstalled: { addListener: (): void => {} },
    onStartup: { addListener: (): void => {} },
    getURL: (path: string): string => `chrome-extension://test-id/${path}`,
  },
  storage: {
    local: {
      get: (): Promise<Record<string, unknown>> => Promise.resolve({}),
      set: (): Promise<void> => Promise.resolve(),
    },
    onChanged: {
      addListener: (): void => {},
      removeListener: (): void => {},
    },
  },
  tabs: {
    create: (): Promise<chrome.tabs.Tab> =>
      Promise.resolve({} as chrome.tabs.Tab),
  },
} as unknown as typeof chrome;

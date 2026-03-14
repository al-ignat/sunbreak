import {
  DEFAULT_DETECTION_SETTINGS,
  DEFAULT_EXTENSION_SETTINGS,
} from '../storage/types';
import { pruneOldStats } from '../storage/dashboard';

async function initializeDefaults(): Promise<void> {
  try {
    const data = await chrome.storage.local.get([
      'detectionSettings',
      'settings',
      'keywords',
      'customPatterns',
    ]);
    const defaults: Record<string, unknown> = {};

    if (!data['detectionSettings']) {
      defaults['detectionSettings'] = DEFAULT_DETECTION_SETTINGS;
    }
    if (!data['settings']) {
      defaults['settings'] = DEFAULT_EXTENSION_SETTINGS;
    }
    if (!data['keywords']) {
      defaults['keywords'] = [];
    }
    if (!data['customPatterns']) {
      defaults['customPatterns'] = [];
    }

    if (Object.keys(defaults).length > 0) {
      await chrome.storage.local.set(defaults);
    }
  } catch {
    // Storage init errors must not crash the extension
  }
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    void initializeDefaults();
    void pruneOldStats(90);
  });

  chrome.runtime.onStartup.addListener(() => {
    void pruneOldStats(90);
  });
});

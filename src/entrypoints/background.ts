import {
  DEFAULT_DETECTION_SETTINGS,
  DEFAULT_EXTENSION_SETTINGS,
} from '../storage/types';
import { pruneOldStats } from '../storage/dashboard';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    // Initialize default storage values on install/update
    chrome.storage.local.get(
      ['detectionSettings', 'settings', 'keywords'],
      (data: Record<string, unknown>) => {
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

        if (Object.keys(defaults).length > 0) {
          chrome.storage.local.set(defaults).catch(() => {
            // Storage init errors must not crash the extension
          });
        }
      },
    );

    // Prune old stats on install/update
    void pruneOldStats(90);
  });

  // Prune old stats on browser startup
  chrome.runtime.onStartup.addListener(() => {
    void pruneOldStats(90);
  });
});

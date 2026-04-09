import type { JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { OnboardingStatus } from '../../storage/types';
import { getOnboardingState } from '../../storage/onboarding';
import { getExtensionSettings, getWeeklyStats } from '../../storage/dashboard';
import { OnboardingFlow } from '../../ui/popup/OnboardingFlow';
import { ProtectionStatus } from '../../ui/popup/ProtectionStatus';

export default function App(): JSX.Element {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [weeklyFindingCount, setWeeklyFindingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadState();
  }, []);

  async function loadState(): Promise<void> {
    try {
      const onboarding = await getOnboardingState();
      setOnboardingStatus(onboarding.status);

      if (onboarding.status !== 'not-started') {
        const [settings, stats] = await Promise.all([
          getExtensionSettings(),
          getWeeklyStats(7),
        ]);
        setEnabled(settings.enabled);
        setWeeklyFindingCount(stats.flaggedCount);
      }
    } catch {
      // Storage errors should not crash the popup
      setOnboardingStatus('completed');
    } finally {
      setLoading(false);
    }
  }

  function handleOnboardingComplete(): void {
    void loadState();
  }

  const dashboardUrl = chrome.runtime.getURL('dashboard.html');
  const sandboxUrl = chrome.runtime.getURL('dashboard.html#sandbox');
  const settingsUrl = chrome.runtime.getURL('dashboard.html#settings');

  function openUrl(url: string): void {
    void chrome.tabs.create({ url });
  }

  if (loading) {
    return (
      <div className="popup-container">
        <p className="popup-loading">Loading...</p>
      </div>
    );
  }

  if (onboardingStatus === 'not-started') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <ProtectionStatus
      enabled={enabled}
      weeklyFindingCount={weeklyFindingCount}
      onOpenDashboard={(): void => openUrl(dashboardUrl)}
      onOpenSandbox={(): void => openUrl(sandboxUrl)}
      onOpenSettings={(): void => openUrl(settingsUrl)}
    />
  );
}

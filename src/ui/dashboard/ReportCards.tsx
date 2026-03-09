import type { JSX } from 'preact';

/** Brand dot colors for each tool */
const TOOL_ACCENT: Record<string, string> = {
  ChatGPT: '#10A37F',
  Claude: '#D97706',
  Gemini: '#4285F4',
};

export function ReportCards(): JSX.Element {
  return (
    <div className="reports-layout">
      <p className="reports-desc">
        Privacy and data handling information for each supported AI tool.
      </p>

      <div className="reports-grid">
        <ReportCard
          name="ChatGPT"
          sections={[
            {
              title: 'Data Retention',
              content: 'Prompts retained for 30 days by default. Opt-out available in settings.',
            },
            {
              title: 'Training Usage',
              content: 'Free tier data may be used for training. Plus/Team/Enterprise excluded.',
            },
            {
              title: 'Privacy Mode',
              content: 'Temporary Chat disables history and training. API usage has separate terms.',
            },
          ]}
        />
        <ReportCard
          name="Claude"
          sections={[
            {
              title: 'Data Retention',
              content: 'Conversations retained during session. No long-term storage by default.',
            },
            {
              title: 'Training Usage',
              content: 'Free tier may contribute to training. Pro plan excludes data from training.',
            },
            {
              title: 'Privacy Mode',
              content: 'API usage has zero-retention policy. Enterprise offers full data isolation.',
            },
          ]}
        />
        <ReportCard
          name="Gemini"
          sections={[
            {
              title: 'Data Retention',
              content: 'Google retains conversations for up to 18 months. Workspace admins configure.',
            },
            {
              title: 'Training Usage',
              content: 'Free conversations used to improve products. Google Workspace excluded.',
            },
            {
              title: 'Enterprise Features',
              content: 'Workspace plans offer data residency controls and admin privacy settings.',
            },
          ]}
        />
      </div>
    </div>
  );
}

interface ReportCardProps {
  readonly name: string;
  readonly sections: ReadonlyArray<{
    readonly title: string;
    readonly content: string;
  }>;
}

function ReportCard({ name, sections }: ReportCardProps): JSX.Element {
  const accent = TOOL_ACCENT[name] ?? 'var(--color-text-muted)';

  return (
    <div className="report-card">
      <div className="report-card__accent" style={{ background: accent }} />
      <div className="report-card__body">
        <div className="report-card__head">
          <span className="report-card__dot" style={{ background: accent }} />
          <span className="report-card__name">{name}</span>
        </div>
        {sections.map((section) => (
          <div key={section.title} className="report-card__section">
            <h4 className="report-card__section-title">{section.title}</h4>
            <p className="report-card__section-text">{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

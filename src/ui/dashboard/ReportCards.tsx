import type { JSX } from 'preact';

export function ReportCards(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
        Information current as of March 2026. Check provider websites for latest policies.
      </p>

      <ReportCard
        name="ChatGPT"
        provider="OpenAI"
        color="#10A37F"
        sections={[
          {
            title: 'Data Retention',
            content: 'Free tier conversations may be used for model training unless opted out. ChatGPT Plus/Team/Enterprise have different retention policies. Conversations are stored for 30 days for abuse monitoring even after deletion.',
          },
          {
            title: 'Training Data Usage',
            content: 'By default, conversations with free and Plus plans may be used to train models. Users can opt out via Settings > Data Controls > "Improve the model for everyone." Team and Enterprise plans do not use conversations for training by default.',
          },
          {
            title: 'Privacy Mode',
            content: 'Temporary Chat mode does not save conversations to history and is not used for training. API usage is not used for training by default.',
          },
          {
            title: 'Enterprise vs Personal',
            content: 'Enterprise and Team plans offer: no training on business data, SSO, admin console, higher usage caps, and dedicated support. Business data is encrypted at rest and in transit.',
          },
        ]}
      />

      <ReportCard
        name="Claude"
        provider="Anthropic"
        color="#D97706"
        sections={[
          {
            title: 'Data Retention',
            content: 'Conversations are retained for up to 90 days for safety monitoring, then deleted. Anthropic retains the right to review conversations flagged by automated safety systems.',
          },
          {
            title: 'Training Data Usage',
            content: 'Free tier conversations may be used for training. Pro plan conversations are not used for training by default. Users can opt out of training data usage in account settings.',
          },
          {
            title: 'Privacy Commitments',
            content: 'Anthropic does not sell user data. API usage is not used for training. Claude for Enterprise offers zero data retention options.',
          },
          {
            title: 'Enterprise Features',
            content: 'Claude for Business and Enterprise offer: no training on data, SSO/SCIM, admin controls, audit logs, and custom data retention policies.',
          },
        ]}
      />

      <ReportCard
        name="Gemini"
        provider="Google"
        color="#4285F4"
        sections={[
          {
            title: 'Data Retention',
            content: 'When Gemini Apps Activity is on, conversations are saved for up to 18 months. Users can turn off activity saving, delete individual conversations, or set auto-delete periods (3, 18, or 36 months).',
          },
          {
            title: 'Training Data Usage',
            content: 'When Gemini Apps Activity is on, conversations may be used to improve Google products, including AI models. Human reviewers may read conversations. Google Workspace users with managed accounts may have different policies set by their admin.',
          },
          {
            title: 'Privacy Controls',
            content: 'Users can turn off Gemini Apps Activity to prevent conversations from being saved or used for training. This is the closest equivalent to a privacy mode.',
          },
          {
            title: 'Workspace Integration',
            content: 'Gemini for Google Workspace (Business/Enterprise) does not use customer data for training models. Admin controls available for data residency and access management.',
          },
        ]}
      />
    </div>
  );
}

interface ReportCardProps {
  readonly name: string;
  readonly provider: string;
  readonly color: string;
  readonly sections: ReadonlyArray<{
    readonly title: string;
    readonly content: string;
  }>;
}

function ReportCard({ name, provider, color, sections }: ReportCardProps): JSX.Element {
  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #E0E0E0',
      borderLeft: `4px solid ${color}`,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333', margin: 0 }}>
          {name}
        </h3>
        <span style={{ fontSize: '12px', color: '#888' }}>by {provider}</span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sections.map((section) => (
          <div key={section.title}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#555', margin: '0 0 4px' }}>
              {section.title}
            </h4>
            <p style={{ fontSize: '13px', color: '#666', margin: 0, lineHeight: 1.5 }}>
              {section.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { JSX } from 'preact';
import { PROVIDER_GUIDANCE } from '../../provider/guidance';
import type { FlaggedEvent, ProviderGuidanceSettings } from '../../storage/types';

export interface ReportCardsProps {
  readonly providerGuidance: ProviderGuidanceSettings;
  readonly events: ReadonlyArray<FlaggedEvent>;
}

function summarizeEvents(
  events: ReadonlyArray<FlaggedEvent>,
  tool: FlaggedEvent['tool'],
): {
  readonly total: number;
  readonly attention: number;
} {
  const relevant = events.filter((event) => event.tool === tool);
  return {
    total: relevant.length,
    attention: relevant.filter((event) => event.needsAttention).length,
  };
}

export function ReportCards({ providerGuidance, events }: ReportCardsProps): JSX.Element {
  return (
    <div className="reports-layout">
      <p className="reports-desc">
        Privacy and data handling information for each supported AI tool.
      </p>

      <div className="reports-grid">
        {Object.values(PROVIDER_GUIDANCE).map((guidance) => (
          <ReportCard
            key={guidance.tool}
            name={guidance.displayName}
            tool={guidance.tool}
            accent={guidance.accent}
            sections={guidance.overview}
            configuredMode={providerGuidance[guidance.tool]}
            modeNote={guidance.modeNotes[providerGuidance[guidance.tool]] ?? null}
            summary={summarizeEvents(events, guidance.tool)}
            lastVerified={guidance.lastVerified}
            sources={guidance.sources}
          />
        ))}
      </div>
    </div>
  );
}

interface ReportCardProps {
  readonly name: string;
  readonly tool: 'chatgpt' | 'claude' | 'gemini';
  readonly accent: string;
  readonly sections: ReadonlyArray<{
    readonly title: string;
    readonly content: string;
  }>;
  readonly configuredMode: string;
  readonly modeNote: string | null;
  readonly summary: {
    readonly total: number;
    readonly attention: number;
  };
  readonly lastVerified: string;
  readonly sources: ReadonlyArray<{
    readonly label: string;
    readonly url: string;
  }>;
}

function ReportCard({
  name,
  tool,
  accent,
  sections,
  configuredMode,
  modeNote,
  summary,
  lastVerified,
  sources,
}: ReportCardProps): JSX.Element {
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
        <div className="report-card__mode">
          <span className="report-card__mode-label">Configured guidance mode: {configuredMode}</span>
          {modeNote && <p className="report-card__mode-note">{modeNote}</p>}
        </div>
        <div className="report-card__summary">
          <p className="report-card__summary-text">
            {summary.total === 0
              ? `No recent ${name} flagged events recorded in this browser.`
              : `${summary.total} recent ${name} flagged event${summary.total === 1 ? '' : 's'} recorded${summary.attention > 0 ? `, ${summary.attention} needing follow-up.` : '.'}`}
          </p>
          <a className="report-card__action-link" href={`#activity?tool=${tool}`}>
            Review activity log
          </a>
        </div>
        <div className="report-card__sources">
          <p className="report-card__verified">Verified against official sources on {lastVerified}</p>
          <ul className="report-card__source-list">
            {sources.map((source) => (
              <li key={source.url}>
                <a
                  className="report-card__source-link"
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

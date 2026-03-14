import type { JSX } from 'preact';
import { PROVIDER_GUIDANCE } from '../../provider/guidance';
import type { ProviderGuidanceSettings } from '../../storage/types';

export interface ReportCardsProps {
  readonly providerGuidance: ProviderGuidanceSettings;
}

export function ReportCards({ providerGuidance }: ReportCardsProps): JSX.Element {
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
            accent={guidance.accent}
            sections={guidance.overview}
            configuredMode={providerGuidance[guidance.tool]}
            modeNote={guidance.modeNotes[providerGuidance[guidance.tool]] ?? null}
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
  readonly accent: string;
  readonly sections: ReadonlyArray<{
    readonly title: string;
    readonly content: string;
  }>;
  readonly configuredMode: string;
  readonly modeNote: string | null;
  readonly lastVerified: string;
  readonly sources: ReadonlyArray<{
    readonly label: string;
    readonly url: string;
  }>;
}

function ReportCard({
  name,
  accent,
  sections,
  configuredMode,
  modeNote,
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

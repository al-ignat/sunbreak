import type { JSX } from 'preact';
import { getProviderGuidance } from '../../provider/guidance';
import type { ProviderGuidanceSettings } from '../../storage/types';
import type { FlaggedEvent } from '../../storage/types';
import {
  actionLabel,
  categoryLabel,
  toolLabel,
} from '../format';

export interface RecoveryDetailProps {
  readonly event: FlaggedEvent;
  readonly providerGuidance: ProviderGuidanceSettings;
}

function sourceLabel(source: FlaggedEvent['source']): string {
  return source === 'file-upload' ? 'File upload' : 'Prompt text';
}

function includesCategory(
  categories: ReadonlyArray<string>,
  values: ReadonlyArray<string>,
): boolean {
  return categories.some((category) => values.includes(category));
}

function hasCustomPatternCategory(categories: ReadonlyArray<string>): boolean {
  return categories.some((category) => category.startsWith('custom-pattern:'));
}

function buildSummary(event: FlaggedEvent): string {
  if (event.source === 'file-upload') {
    return event.needsAttention
      ? 'A file was sent and should be reviewed manually.'
      : 'A file attachment event was recorded. Review whether the attachment itself was appropriate to share.';
  }

  if (event.action === 'sent-anyway-click' || event.action === 'sent-anyway-timeout') {
    return 'Sensitive content was detected, but the prompt was still sent.';
  }

  if (event.maskingUsed || event.action === 'redacted') {
    return 'Sensitive content was masked before the prompt was sent.';
  }

  if (event.action === 'cancelled' || event.action === 'edited') {
    return 'Sunbreak interrupted the send flow and the prompt was reviewed before continuing.';
  }

  return 'Sunbreak recorded a flagged interaction that may require follow-up.';
}

function buildRecommendations(event: FlaggedEvent): string[] {
  const recommendations: string[] = [];

  if (event.action === 'sent-anyway-click' || event.action === 'sent-anyway-timeout') {
    recommendations.push('Open the conversation now and delete or edit the message if the provider still allows it.');
  }

  if (event.source === 'file-upload') {
    recommendations.push('Review the attachment manually. Sunbreak can detect the upload event, but it cannot inspect file contents.');
  }

  if (includesCategory(event.categories, ['api-key', 'custom-pattern:security'])) {
    recommendations.push('Rotate any exposed credential, token, or security identifier that may have been shared.');
  }

  if (includesCategory(event.categories, ['credit-card', 'ssn', 'cpr', 'ni-number'])) {
    recommendations.push('Assess whether regulated personal or payment data was shared and follow your internal incident process if needed.');
  }

  if (hasCustomPatternCategory(event.categories)) {
    recommendations.push('Review whether company-specific identifiers in this event need internal follow-up or containment.');
  }

  if (event.maskingAvailable && !event.maskingUsed) {
    recommendations.push('For similar prompts, use Fix/Fix All before sending so masking happens locally first.');
  }

  if (recommendations.length === 0) {
    recommendations.push('No urgent recovery step is implied by this event. Keep protections enabled and review similar prompts before sending.');
  }

  return recommendations;
}

function attentionLabel(event: FlaggedEvent): string {
  return event.needsAttention ? 'Needs follow-up' : 'Informational';
}

export function RecoveryDetail({ event, providerGuidance }: RecoveryDetailProps): JSX.Element {
  const recommendations = buildRecommendations(event);
  const resolvedGuidance = getProviderGuidance(event.tool, providerGuidance[event.tool] ?? 'general');
  const countLabel = event.source === 'file-upload' ? 'Attachments' : 'Findings';

  return (
    <section className="recovery-detail" aria-label="Recovery detail">
      <div className="recovery-detail__header">
        <div>
          <p className="recovery-detail__eyebrow">Recovery detail</p>
          <h3 className="recovery-detail__title">{buildSummary(event)}</h3>
        </div>
        <span
          className={`recovery-detail__status ${event.needsAttention ? 'recovery-detail__status--attention' : ''}`}
        >
          {attentionLabel(event)}
        </span>
      </div>

      <div className="recovery-detail__meta">
        <div className="recovery-detail__meta-item">
          <span className="recovery-detail__meta-label">Tool</span>
          <span>{toolLabel(event.tool)}</span>
        </div>
        <div className="recovery-detail__meta-item">
          <span className="recovery-detail__meta-label">Action</span>
          <span>{actionLabel(event.action)}</span>
        </div>
        <div className="recovery-detail__meta-item">
          <span className="recovery-detail__meta-label">Source</span>
          <span>{sourceLabel(event.source)}</span>
        </div>
        <div className="recovery-detail__meta-item">
          <span className="recovery-detail__meta-label">{countLabel}</span>
          <span>{event.findingCount}</span>
        </div>
      </div>

      <div className="recovery-detail__block">
        <h4 className="recovery-detail__block-title">Detected categories</h4>
        <div className="recovery-detail__categories">
          {event.categories.map((category) => (
            <span key={category} className="recovery-detail__category">
              {categoryLabel(category)}
            </span>
          ))}
        </div>
      </div>

      <div className="recovery-detail__block">
        <h4 className="recovery-detail__block-title">Next steps</h4>
        <ul className="recovery-detail__list">
          {recommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="recovery-detail__block">
        <h4 className="recovery-detail__block-title">Protection context</h4>
        <p className="recovery-detail__note">
          {event.maskingAvailable
            ? event.maskingUsed
              ? 'Local masking was available and used for this event.'
              : 'Local masking was available but was not used for this event.'
            : 'Local masking was not available for this event path.'}
        </p>
      </div>

      {resolvedGuidance && (
        <div className="recovery-detail__block">
          <h4 className="recovery-detail__block-title">{resolvedGuidance.recovery.title}</h4>
          <ul className="recovery-detail__list">
            {resolvedGuidance.recovery.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
          <p className="recovery-detail__note">{resolvedGuidance.recovery.caveat}</p>
          {resolvedGuidance.modeNote && (
            <p className="recovery-detail__note">{resolvedGuidance.modeNote}</p>
          )}
          <p className="recovery-detail__source-note">
            Verified against official provider sources on {resolvedGuidance.lastVerified}.
          </p>
          <div className="recovery-detail__actions">
            <a className="recovery-detail__action-link" href="#reports">
              Open provider guidance in Reports
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

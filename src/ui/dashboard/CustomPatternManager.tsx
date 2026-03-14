import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Download, Plus, Upload } from 'lucide-preact';
import {
  buildPatternFromTemplate,
  CUSTOM_PATTERN_TEMPLATES,
  getCustomPatternTemplate,
} from '../../classifier/custom-pattern-templates';
import {
  evaluatePatternSamples,
  validateCustomPatternDefinition,
} from '../../classifier/custom-pattern-validation';
import {
  exportCustomPatterns,
  importCustomPatterns,
  removeCustomPattern,
  upsertCustomPattern,
} from '../../storage/dashboard';
import type {
  CustomPattern,
  CustomPatternCategory,
  CustomPatternSeverity,
  CustomPatternSourceMode,
  CustomPatternTemplateId,
} from '../../storage/types';

export interface CustomPatternManagerProps {
  readonly patterns: ReadonlyArray<CustomPattern>;
  readonly onDataChange: () => Promise<void>;
}

function toLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function templateDefaults(templateId: CustomPatternTemplateId): Record<string, string> {
  const template = getCustomPatternTemplate(templateId);
  if (!template) return {};
  return Object.fromEntries(
    template.fields.map((field) => [field.id, field.defaultValue]),
  );
}

export function CustomPatternManager({
  patterns,
  onDataChange,
}: CustomPatternManagerProps): JSX.Element {
  const [sourceMode, setSourceMode] = useState<CustomPatternSourceMode>('template');
  const [templateId, setTemplateId] = useState<CustomPatternTemplateId>('employee-id');
  const [templateValues, setTemplateValues] = useState<Record<string, string>>(
    templateDefaults('employee-id'),
  );
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [patternText, setPatternText] = useState('');
  const [flags, setFlags] = useState('gi');
  const [severity, setSeverity] = useState<CustomPatternSeverity>('warning');
  const [category, setCategory] = useState<CustomPatternCategory>('other');
  const [positiveSamples, setPositiveSamples] = useState('');
  const [negativeSamples, setNegativeSamples] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const template = useMemo(
    () => getCustomPatternTemplate(templateId),
    [templateId],
  );

  useEffect(() => {
    setTemplateValues(templateDefaults(templateId));
    if (template) {
      setSeverity(template.severity);
      setCategory(template.category);
      if (label.length === 0) {
        setLabel(template.title);
      }
    }
  }, [templateId, template]);

  const resolvedPattern = useMemo(() => {
    if (sourceMode === 'template') {
      return buildPatternFromTemplate(templateId, templateValues) ?? '';
    }
    return patternText.trim();
  }, [patternText, sourceMode, templateId, templateValues]);

  const validation = useMemo(
    () => validateCustomPatternDefinition({
      label,
      pattern: resolvedPattern,
      flags,
      samples: {
        positive: toLines(positiveSamples),
        negative: toLines(negativeSamples),
      },
    }),
    [flags, label, negativeSamples, positiveSamples, resolvedPattern],
  );

  const samplePreview = useMemo(() => {
    if (!validation.isValid) return null;
    return evaluatePatternSamples({
      pattern: resolvedPattern,
      flags: validation.sanitizedFlags,
      positive: toLines(positiveSamples),
      negative: toLines(negativeSamples),
    });
  }, [negativeSamples, positiveSamples, resolvedPattern, validation]);

  async function handleSave(): Promise<void> {
    if (!validation.isValid) return;

    await upsertCustomPattern({
      label,
      description,
      enabled: true,
      severity,
      category,
      sourceMode,
      templateId: sourceMode === 'template' ? templateId : null,
      pattern: resolvedPattern,
      flags: validation.sanitizedFlags,
      samples: {
        positive: toLines(positiveSamples),
        negative: toLines(negativeSamples),
      },
    });

    setStatus(`Saved pattern "${label.trim()}".`);
    if (sourceMode === 'advanced-regex') {
      setPatternText('');
    }
    setDescription('');
    setPositiveSamples('');
    setNegativeSamples('');
    await onDataChange();
  }

  async function handleToggle(pattern: CustomPattern): Promise<void> {
    await upsertCustomPattern({
      ...pattern,
      label: pattern.label,
      pattern: pattern.pattern,
      enabled: !pattern.enabled,
    });
    await onDataChange();
  }

  async function handleRemove(pattern: CustomPattern): Promise<void> {
    await removeCustomPattern(pattern.id);
    await onDataChange();
  }

  async function handleImport(): Promise<void> {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importCustomPatterns(text);
      setStatus(
        `Imported ${result.added} new pattern${result.added === 1 ? '' : 's'}, updated ${result.updated}, skipped ${result.skipped}.`,
      );
      await onDataChange();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch {
      setStatus('Failed to import custom pattern bundle.');
    }
  }

  async function handleExport(): Promise<void> {
    const text = await exportCustomPatterns();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunbreak-custom-patterns-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pattern-card">
      <div className="pattern-card__header">
        <span className="pattern-card__title">Company Patterns</span>
        <span className="pattern-card__desc">
          Model internal identifiers with guided templates or advanced regex, then test them before enabling live use.
        </span>
      </div>

      {patterns.length === 0 ? (
        <p className="pattern-empty">
          No company patterns yet. Start from a template for employee IDs, invoice numbers, project codes, or ticket references.
        </p>
      ) : (
        <div className="pattern-list">
          {patterns.map((pattern) => (
            <div key={pattern.id} className="pattern-row">
              <div className="pattern-row__info">
                <div className="pattern-row__title">
                  <span>{pattern.label}</span>
                  <span className="pattern-row__badge">{pattern.enabled ? 'Enabled' : 'Disabled'}</span>
                  {pattern.templateId && (
                    <span className="pattern-row__badge pattern-row__badge--template">
                      {pattern.templateId}
                    </span>
                  )}
                </div>
                <div className="pattern-row__meta">
                  <span>{pattern.severity}</span>
                  <span>{pattern.category}</span>
                  <code>{pattern.pattern}</code>
                </div>
              </div>
              <div className="pattern-row__actions">
                <button
                  type="button"
                  className="pattern-row__btn"
                  onClick={(): void => void handleToggle(pattern)}
                >
                  {pattern.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  className="pattern-row__btn pattern-row__btn--danger"
                  onClick={(): void => void handleRemove(pattern)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pattern-divider" />

      <div className="pattern-form">
        <div className="pattern-form__mode">
          <button
            type="button"
            className={`pattern-form__mode-btn ${sourceMode === 'template' ? 'pattern-form__mode-btn--active' : ''}`}
            onClick={(): void => setSourceMode('template')}
          >
            Template
          </button>
          <button
            type="button"
            className={`pattern-form__mode-btn ${sourceMode === 'advanced-regex' ? 'pattern-form__mode-btn--active' : ''}`}
            onClick={(): void => setSourceMode('advanced-regex')}
          >
            Advanced Regex
          </button>
        </div>

        <div className="pattern-form__grid">
          <label className="pattern-form__field">
            <span>Label</span>
            <input
              type="text"
              value={label}
              onInput={(e: Event): void => setLabel((e.target as HTMLInputElement).value)}
              placeholder="Employee ID"
            />
          </label>
          <label className="pattern-form__field">
            <span>Description</span>
            <input
              type="text"
              value={description}
              onInput={(e: Event): void => setDescription((e.target as HTMLInputElement).value)}
              placeholder="Matches internal employee references"
            />
          </label>
        </div>

        {sourceMode === 'template' && template && (
          <>
            <label className="pattern-form__field">
              <span>Template</span>
              <select
                value={templateId}
                onChange={(e: Event): void => setTemplateId((e.target as HTMLSelectElement).value as CustomPatternTemplateId)}
              >
                {CUSTOM_PATTERN_TEMPLATES.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>

            <div className="pattern-form__grid">
              {template.fields.map((field) => (
                <label key={field.id} className="pattern-form__field">
                  <span>{field.label}</span>
                  <input
                    type="text"
                    value={templateValues[field.id] ?? field.defaultValue}
                    onInput={(e: Event): void => {
                      const value = (e.target as HTMLInputElement).value;
                      setTemplateValues((current) => ({ ...current, [field.id]: value }));
                    }}
                  />
                </label>
              ))}
            </div>
          </>
        )}

        {sourceMode === 'advanced-regex' && (
          <label className="pattern-form__field">
            <span>Regex Pattern</span>
            <textarea
              value={patternText}
              onInput={(e: Event): void => setPatternText((e.target as HTMLTextAreaElement).value)}
              placeholder="ACME-[0-9]{6}"
              rows={3}
            />
          </label>
        )}

        <div className="pattern-form__grid">
          <label className="pattern-form__field">
            <span>Flags</span>
            <input
              type="text"
              value={flags}
              onInput={(e: Event): void => setFlags((e.target as HTMLInputElement).value)}
              placeholder="gi"
            />
          </label>
          <label className="pattern-form__field">
            <span>Severity</span>
            <select
              value={severity}
              onChange={(e: Event): void => setSeverity((e.target as HTMLSelectElement).value as CustomPatternSeverity)}
            >
              <option value="warning">warning</option>
              <option value="concern">concern</option>
              <option value="critical">critical</option>
            </select>
          </label>
          <label className="pattern-form__field">
            <span>Category</span>
            <select
              value={category}
              onChange={(e: Event): void => setCategory((e.target as HTMLSelectElement).value as CustomPatternCategory)}
            >
              <option value="internal-identifier">internal-identifier</option>
              <option value="finance">finance</option>
              <option value="hr">hr</option>
              <option value="legal">legal</option>
              <option value="security">security</option>
              <option value="operations">operations</option>
              <option value="other">other</option>
            </select>
          </label>
        </div>

        <label className="pattern-form__field">
          <span>Generated Pattern</span>
          <code className="pattern-form__preview">{resolvedPattern || 'Pattern preview will appear here.'}</code>
        </label>

        <div className="pattern-form__grid">
          <label className="pattern-form__field">
            <span>Positive Samples</span>
            <textarea
              value={positiveSamples}
              onInput={(e: Event): void => setPositiveSamples((e.target as HTMLTextAreaElement).value)}
              placeholder="One matching sample per line"
              rows={3}
            />
          </label>
          <label className="pattern-form__field">
            <span>Negative Samples</span>
            <textarea
              value={negativeSamples}
              onInput={(e: Event): void => setNegativeSamples((e.target as HTMLTextAreaElement).value)}
              placeholder="One non-matching sample per line"
              rows={3}
            />
          </label>
        </div>

        {validation.errors.length > 0 && (
          <div className="pattern-form__errors">
            {validation.errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}
        {validation.warnings.length > 0 && (
          <div className="pattern-form__warnings">
            {validation.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}
        {samplePreview && (
          <div className="pattern-form__sample-summary">
            <span>
              Positive matches: {samplePreview.positive.filter((item) => item.matches.length > 0).length}/{samplePreview.positive.length}
            </span>
            <span>
              Negative matches: {samplePreview.negative.filter((item) => item.matches.length > 0).length}/{samplePreview.negative.length}
            </span>
          </div>
        )}

        <div className="pattern-form__actions">
          <button
            type="button"
            className="keyword-add-btn"
            disabled={!validation.isValid}
            onClick={(): void => void handleSave()}
          >
            <Plus size={16} />
            Save Pattern
          </button>
          <label className="keyword-action-btn">
            <Upload size={16} />
            Import JSON
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={(): void => void handleImport()}
              style={{ display: 'none' }}
            />
          </label>
          <button
            type="button"
            className="keyword-action-btn"
            disabled={patterns.length === 0}
            onClick={(): void => void handleExport()}
          >
            <Download size={16} />
            Export JSON
          </button>
        </div>
        {status && <p className="pattern-form__status">{status}</p>}
      </div>
    </div>
  );
}

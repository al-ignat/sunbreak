import type { JSX } from 'preact';
import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import { classify } from '../../classifier/engine';
import type { Finding, ClassificationResult } from '../../classifier/types';
import { categoryLabel, categoryColor, categoryBgColor } from '../format';
import { SANDBOX_SAMPLES } from './sandbox-samples';

export interface SandboxCoreProps {
  /** true = narrower popup layout, false = full dashboard width */
  readonly compact?: boolean;
  readonly className?: string;
}

const DEBOUNCE_MS = 150;

export function SandboxCore({ compact, className }: SandboxCoreProps): JSX.Element {
  const [text, setText] = useState(SANDBOX_SAMPLES[0].text);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runClassifier = useCallback((input: string): void => {
    if (input.trim().length === 0) {
      setResult(null);
      return;
    }
    const output = classify(input, { keywords: [] });
    setResult(output);
  }, []);

  // Run on initial sample text — intentionally once on mount
  useEffect(() => {
    runClassifier(SANDBOX_SAMPLES[0].text);
  }, [runClassifier]);

  function handleInput(e: JSX.TargetedEvent<HTMLTextAreaElement>): void {
    const value = e.currentTarget.value;
    setText(value);

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      runClassifier(value);
    }, DEBOUNCE_MS);
  }

  function handleSample(sample: (typeof SANDBOX_SAMPLES)[number]): void {
    setText(sample.text);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    runClassifier(sample.text);
  }

  const prefix = compact ? 'popup-sandbox' : 'sandbox';
  const rootClass = [prefix, className].filter(Boolean).join(' ');
  const findings = result?.findings ?? [];

  return (
    <div className={rootClass}>
      <div className={`${prefix}__samples`}>
        {SANDBOX_SAMPLES.map((sample) => (
          <button
            key={sample.label}
            type="button"
            className={`${prefix}__sample-btn${text === sample.text ? ` ${prefix}__sample-btn--active` : ''}`}
            onClick={(): void => handleSample(sample)}
          >
            {sample.label}
          </button>
        ))}
      </div>

      <textarea
        className={`${prefix}__textarea`}
        value={text}
        onInput={handleInput}
        rows={compact ? 3 : 5}
        placeholder="Type or paste text to test detection..."
        aria-label="Sandbox text input"
      />

      <div className={`${prefix}__results`}>
        {findings.length > 0 ? (
          <>
            <p className={`${prefix}__results-count`}>
              {findings.length} finding{findings.length === 1 ? '' : 's'} detected
              {result ? ` in ${result.durationMs}ms` : ''}
            </p>
            <ul className={`${prefix}__findings`}>
              {findings.map((f, i) => (
                <FindingRow key={`${f.type}-${f.startIndex}-${i}`} finding={f} prefix={prefix} />
              ))}
            </ul>
          </>
        ) : (
          <p className={`${prefix}__results-empty`}>
            {text.trim().length > 0
              ? 'No sensitive data detected.'
              : 'Type or select a sample to test detection.'}
          </p>
        )}
      </div>
    </div>
  );
}

function FindingRow({ finding, prefix }: { readonly finding: Finding; readonly prefix: string }): JSX.Element {
  return (
    <li className={`${prefix}__finding`}>
      <span
        className={`${prefix}__finding-pill`}
        style={{
          background: categoryBgColor(finding.type),
          color: categoryColor(finding.type, true),
        }}
      >
        <span
          className={`${prefix}__finding-dot`}
          style={{ background: categoryColor(finding.type, true) }}
        />
        {categoryLabel(finding.type)}
      </span>
      <code className={`${prefix}__finding-value`}>{finding.value}</code>
      <span className={`${prefix}__finding-token`}>{finding.placeholder}</span>
    </li>
  );
}

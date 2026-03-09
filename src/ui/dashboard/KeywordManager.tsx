import type { JSX } from 'preact';
import { useState, useRef } from 'preact/hooks';
import { Plus, Upload, Download } from 'lucide-preact';
import {
  addKeyword,
  removeKeyword,
  importKeywords,
  exportKeywords,
} from '../../storage/dashboard';

export interface KeywordManagerProps {
  readonly keywords: ReadonlyArray<string>;
  readonly onDataChange: () => Promise<void>;
}

export function KeywordManager({
  keywords,
  onDataChange,
}: KeywordManagerProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAdd(): Promise<void> {
    setError(null);
    const err = await addKeyword(inputValue);
    if (err) {
      setError(err);
      return;
    }
    setInputValue('');
    await onDataChange();
  }

  async function handleRemove(keyword: string): Promise<void> {
    await removeKeyword(keyword);
    await onDataChange();
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleAdd();
    }
  }

  async function handleImport(): Promise<void> {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const MAX_IMPORT_SIZE = 512_000;
    if (file.size > MAX_IMPORT_SIZE) {
      setImportStatus('File too large. Maximum 512 KB.');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const result = await importKeywords(lines);
      setImportStatus(`Added ${result.added} keyword${result.added !== 1 ? 's' : ''}. ${result.skipped} skipped.`);
      await onDataChange();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch {
      setImportStatus('Failed to import file.');
    }
  }

  async function handleExport(): Promise<void> {
    const text = await exportKeywords();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunbreak-keywords-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="keyword-card">
      {/* Header */}
      <div className="keyword-card__header">
        <span className="keyword-card__title">Custom Keywords</span>
        <span className="keyword-card__desc">
          Add custom words or phrases that should trigger a finding when detected in prompts.
        </span>
      </div>

      {/* Input row */}
      <div className="keyword-input-row">
        <input
          type="text"
          value={inputValue}
          onInput={(e: Event): void => {
            setInputValue((e.target as HTMLInputElement).value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add a keyword or phrase..."
          aria-label="New keyword"
          maxLength={100}
          className="keyword-input"
        />
        <button
          onClick={(): void => void handleAdd()}
          disabled={inputValue.trim().length === 0}
          className="keyword-add-btn"
        >
          <Plus size={16} />
          Add
        </button>
      </div>
      {error && <p className="keyword-error">{error}</p>}

      {/* Badges */}
      {keywords.length === 0 ? (
        <p className="keyword-empty">
          No custom keywords. Add words or phrases you want to monitor.
        </p>
      ) : (
        <div className="keyword-badges">
          {keywords.map((keyword) => (
            <span key={keyword} className="keyword-badge">
              <span className="keyword-badge__text">{keyword}</span>
              <button
                onClick={(): void => void handleRemove(keyword)}
                title={`Remove "${keyword}"`}
                aria-label={`Remove keyword ${keyword}`}
                className="keyword-badge__remove"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="keyword-divider" />

      {/* Import / Export */}
      <div className="keyword-actions">
        <label className="keyword-action-btn">
          <Upload size={16} />
          Import
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={(): void => void handleImport()}
            style={{ display: 'none' }}
          />
        </label>
        <button
          onClick={(): void => void handleExport()}
          disabled={keywords.length === 0}
          className="keyword-action-btn"
        >
          <Download size={16} />
          Export
        </button>
      </div>
      {importStatus && (
        <p className="keyword-io-status">{importStatus}</p>
      )}
    </div>
  );
}

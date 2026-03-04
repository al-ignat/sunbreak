import type { JSX } from 'preact';
import { useState, useRef } from 'preact/hooks';
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
    a.download = `byoai-keywords-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="keyword-layout">
      <div className="section">
        <h3 className="section-header">Add Keyword</h3>
        <div className="keyword-input-row">
          <input
            type="text"
            value={inputValue}
            onInput={(e: Event): void => {
              setInputValue((e.target as HTMLInputElement).value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter a word or phrase to monitor..."
            aria-label="New keyword"
            maxLength={100}
            className="keyword-input"
          />
          <button
            onClick={(): void => void handleAdd()}
            disabled={inputValue.trim().length === 0}
            className="keyword-add-btn"
          >
            Add
          </button>
        </div>
        {error && <p className="keyword-error">{error}</p>}
        <p className="keyword-count">
          {keywords.length}/500 keywords
        </p>
      </div>

      <div className="section">
        <h3 className="section-header">Your Keywords</h3>
        {keywords.length === 0 ? (
          <p className="keyword-empty">
            No custom keywords. Add words or phrases you want to monitor.
          </p>
        ) : (
          <div className="keyword-list">
            {keywords.map((keyword) => (
              <span key={keyword} className="keyword-badge">
                {keyword}
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
      </div>

      <div className="section">
        <h3 className="section-header">Import / Export</h3>
        <div className="keyword-io-row">
          <label className="keyword-io-btn">
            Import .txt
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
            className="keyword-io-btn"
          >
            Export .txt
          </button>
        </div>
        {importStatus && (
          <p className="keyword-io-status">{importStatus}</p>
        )}
        <p className="keyword-io-hint">
          Import: one keyword per line. Duplicates are skipped. Max 100 characters each.
        </p>
      </div>
    </div>
  );
}

import type { JSX } from 'preact';
import { useState, useRef } from 'preact/hooks';
import {
  addKeyword,
  removeKeyword,
  importKeywords,
  exportKeywords,
} from '../../storage/dashboard';
const sectionStyle: JSX.CSSProperties = { background: 'white', borderRadius: '8px', border: '1px solid #E0E0E0', padding: '20px' };
const sectionHeaderStyle: JSX.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#333', margin: '0 0 12px' };

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

    // Guard against accidentally importing huge files
    const MAX_IMPORT_SIZE = 512_000; // 512 KB
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

      // Reset file input
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Add Keyword */}
      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>Add Keyword</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
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
            style={inputStyle}
          />
          <button
            onClick={(): void => void handleAdd()}
            disabled={inputValue.trim().length === 0}
            style={{
              ...buttonStyle,
              opacity: inputValue.trim().length === 0 ? 0.5 : 1,
            }}
          >
            Add
          </button>
        </div>
        {error && <p style={{ color: '#D32F2F', fontSize: '12px', margin: '4px 0 0' }}>{error}</p>}
        <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0' }}>
          {keywords.length}/500 keywords
        </p>
      </div>

      {/* Keyword List */}
      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>Your Keywords</h3>
        {keywords.length === 0 ? (
          <p style={{ color: '#888', fontSize: '13px' }}>
            No custom keywords. Add words or phrases you want to monitor.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {keywords.map((keyword) => (
              <span key={keyword} style={keywordBadgeStyle}>
                {keyword}
                <button
                  onClick={(): void => void handleRemove(keyword)}
                  title={`Remove "${keyword}"`}
                  aria-label={`Remove keyword ${keyword}`}
                  style={removeBtnStyle}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Import / Export */}
      <div style={sectionStyle}>
        <h3 style={sectionHeaderStyle}>Import / Export</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ ...buttonStyle, background: 'white', color: '#555', border: '1px solid #DDD', cursor: 'pointer' }}>
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
            style={{
              ...buttonStyle,
              background: 'white',
              color: '#555',
              border: '1px solid #DDD',
              opacity: keywords.length === 0 ? 0.5 : 1,
            }}
          >
            Export .txt
          </button>
        </div>
        {importStatus && (
          <p style={{ fontSize: '12px', color: '#555', margin: '8px 0 0' }}>{importStatus}</p>
        )}
        <p style={{ fontSize: '11px', color: '#888', margin: '8px 0 0' }}>
          Import: one keyword per line. Duplicates are skipped. Max 100 characters each.
        </p>
      </div>
    </div>
  );
}

const inputStyle: JSX.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  fontSize: '13px',
  border: '1px solid #DDD',
  borderRadius: '6px',
  outline: 'none',
};

const buttonStyle: JSX.CSSProperties = {
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 500,
  background: '#FF9800',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

const keywordBadgeStyle: JSX.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  fontSize: '13px',
  background: '#FFF3E0',
  color: '#E65100',
  borderRadius: '4px',
  border: '1px solid #FFE0B2',
};

const removeBtnStyle: JSX.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '16px',
  cursor: 'pointer',
  color: '#E65100',
  padding: '0 2px',
  lineHeight: 1,
};

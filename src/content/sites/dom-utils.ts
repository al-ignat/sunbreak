/** Query the DOM with a fallback chain of selectors. Returns the first match or null. */
export function queryFallback(selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}

/** Extract text from an editor that uses `<p>` elements (ProseMirror, Quill, etc.) */
export function extractParagraphText(editor: HTMLElement): string {
  const paragraphs = editor.querySelectorAll('p');
  if (paragraphs.length === 0) {
    return editor.textContent?.trim() ?? '';
  }
  return Array.from(paragraphs)
    .map((p) => p.textContent ?? '')
    .join('\n')
    .trim();
}

/** Best-effort text replacement for contenteditable editors using `<p>` wrapping. */
export function setParagraphText(input: HTMLElement, text: string): void {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const paragraphs = escaped
    .split('\n')
    .map((line) => `<p>${line || '<br>'}</p>`)
    .join('');
  input.innerHTML = paragraphs;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

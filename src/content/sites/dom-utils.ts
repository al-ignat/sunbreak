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
  while (input.firstChild) input.removeChild(input.firstChild);
  for (const line of text.split('\n')) {
    const p = document.createElement('p');
    if (line) {
      p.textContent = line;
    } else {
      p.appendChild(document.createElement('br'));
    }
    input.appendChild(p);
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

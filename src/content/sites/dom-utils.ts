/** Query the DOM with a fallback chain of selectors. Returns the first match or null. */
export function queryFallback(selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}

export interface EditorTextSegment {
  readonly node: Text;
  readonly startInText: number;
  readonly endInText: number;
}

export interface EditorTextModel {
  readonly text: string;
  readonly segments: ReadonlyArray<EditorTextSegment>;
}

/**
 * Build the canonical text model for supported editors.
 *
 * This is the single source of truth for both classifier input text and
 * offset-to-DOM range mapping used by inline underlines.
 */
export function buildEditorTextModel(editor: HTMLElement): EditorTextModel {
  const paragraphs = editor.querySelectorAll('p');
  const segments: EditorTextSegment[] = [];
  let text = '';
  let charIndex = 0;

  if (paragraphs.length > 0) {
    for (let pi = 0; pi < paragraphs.length; pi++) {
      if (pi > 0) {
        text += '\n';
        charIndex += 1;
      }

      const walker = document.createTreeWalker(
        paragraphs[pi] as HTMLElement,
        NodeFilter.SHOW_TEXT,
      );
      while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        const value = textNode.textContent ?? '';
        const startInText = charIndex;
        text += value;
        charIndex += value.length;
        segments.push({
          node: textNode,
          startInText,
          endInText: charIndex,
        });
      }
    }

    return { text, segments };
  }

  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    const value = textNode.textContent ?? '';
    const startInText = charIndex;
    text += value;
    charIndex += value.length;
    segments.push({
      node: textNode,
      startInText,
      endInText: charIndex,
    });
  }

  return { text, segments };
}

/** Extract text from an editor that uses `<p>` elements (ProseMirror, Quill, etc.) */
export function extractParagraphText(editor: HTMLElement): string {
  return buildEditorTextModel(editor).text;
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

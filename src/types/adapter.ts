/** Supported AI tool site identifiers */
export type SiteName = 'chatgpt' | 'claude' | 'gemini';

/** Per-adapter capability flags — declares what the adapter can reliably do */
export interface AdapterCapabilities {
  /** Can setText safely sync with the editor framework (ProseMirror/Quill)? */
  readonly reliableSetText: boolean;
  /** Can the adapter reliably locate a send/action button for widget anchoring? */
  readonly sendButtonAnchor: boolean;
  /** Will this adapter eventually need page-world script injection? Declarative only. */
  readonly pageContextBridge: boolean;
}

/** Per-site adapter for finding and interacting with AI tool input elements */
export interface SiteAdapter {
  readonly name: SiteName;

  /** Check if this adapter handles the given hostname */
  matches(hostname: string): boolean;

  /** Find the primary chat input element. Returns null if not yet in DOM. */
  findInput(): HTMLElement | null;

  /** Find the send/submit button. Returns null if not visible. */
  findSendButton(): HTMLElement | null;

  /** Extract full text content from the editor element */
  getText(input: HTMLElement): string;

  /** Replace text content in the editor (for redaction in Phase 4) */
  setText(input: HTMLElement, text: string): void;

  /** Find the file drop zone element, if any */
  getDropZone(): HTMLElement | null;

  /** Whether this site supports inline text overlay underlines (default: true) */
  readonly supportsOverlay?: boolean;

  /** Widget positioning config — gap between widget and send button */
  readonly widgetAnchor?: {
    readonly gapX: number;
  };

  /** Adapter capability flags. Defaults to all-capable when omitted. */
  readonly capabilities?: AdapterCapabilities;
}

/** Callback invoked when a prompt is captured before submission */
export type PromptCallback = (text: string, adapterName: SiteName) => void;

/** Callback invoked when a file upload is detected */
export type FileCallback = (filename: string, adapterName: SiteName) => void;

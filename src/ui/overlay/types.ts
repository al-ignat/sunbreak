/** User actions from the warning overlay */
export type OverlayAction = 'redact' | 'edit' | 'send-anyway' | 'cancel';

/** A single finding to display in the overlay */
export interface OverlayFinding {
  readonly type: string;
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly confidence: string;
}

/** Props for the WarningBanner component */
export interface WarningBannerProps {
  readonly findings: ReadonlyArray<OverlayFinding>;
  readonly onAction: (action: OverlayAction) => void;
}

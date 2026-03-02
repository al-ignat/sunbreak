/** All supported detection categories */
export type FindingType =
  | 'email'
  | 'phone'
  | 'credit-card'
  | 'ssn'
  | 'cpr'
  | 'ni-number'
  | 'ip-address'
  | 'api-key'
  | 'keyword';

/** How confident the detector is that this is a real match */
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** A single piece of sensitive data found in the prompt */
export interface Finding {
  /** What type of sensitive data was found */
  readonly type: FindingType;
  /** The matched text */
  readonly value: string;
  /** Start index in the original string */
  readonly startIndex: number;
  /** End index in the original string (exclusive) */
  readonly endIndex: number;
  /** How confident we are this is a real match */
  readonly confidence: Confidence;
  /** Human-readable label for the UI (e.g. "Email Address", "AWS Access Key") */
  readonly label: string;
  /** Redaction placeholder, e.g. [EMAIL_1], [PHONE_2] */
  readonly placeholder: string;
}

/** Result returned by the classification engine */
export interface ClassificationResult {
  /** All findings, sorted by startIndex. Guaranteed: no overlapping spans. */
  readonly findings: ReadonlyArray<Finding>;
  /** Time taken in milliseconds */
  readonly durationMs: number;
  /** Whether any HIGH confidence findings exist */
  readonly hasHighConfidence: boolean;
  /** Whether the input was truncated (exceeded 50,000 chars) */
  readonly truncated: boolean;
}

/** A pure detector function: text in, findings out */
export type Detector = (text: string) => Finding[];

/** Options passed to the classify() engine */
export interface ClassifyOptions {
  /** User-configured keywords (pre-fetched from chrome.storage.local) */
  readonly keywords: string[];
  /** Which detectors to run. If omitted, all are enabled. */
  readonly enabledDetectors?: ReadonlySet<FindingType>;
}

/**
 * Detector priority order for deduplication tiebreaking.
 * Higher index = higher priority.
 */
export const DETECTOR_PRIORITY: Record<FindingType, number> = {
  keyword: 0,
  'ip-address': 1,
  phone: 2,
  email: 3,
  'ni-number': 4,
  cpr: 5,
  ssn: 6,
  'credit-card': 7,
  'api-key': 8,
};

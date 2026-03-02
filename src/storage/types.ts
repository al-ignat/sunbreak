/** A flagged event record — metadata only, NEVER stores prompt text */
export interface FlaggedEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly tool: string;
  readonly categories: ReadonlyArray<string>;
  readonly findingCount: number;
  readonly action: 'redacted' | 'sent-anyway' | 'cancelled' | 'edited';
}

/** Daily interaction counter */
export interface DailyStats {
  readonly totalInteractions: number;
  readonly flaggedCount: number;
  readonly redactedCount: number;
  readonly sentAnywayCount: number;
  readonly cancelledCount: number;
  readonly editedCount: number;
}

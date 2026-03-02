/** Success variant of Result */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Failure variant of Result */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Typed error handling — use instead of try/catch */
export type Result<T, E> = Ok<T> | Err<E>;

/** Create a success Result */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/** Create a failure Result */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

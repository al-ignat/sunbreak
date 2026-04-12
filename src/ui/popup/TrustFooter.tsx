import type { JSX } from 'preact';
import { TRUST_FOOTER } from '../trust-copy';

export function TrustFooter(): JSX.Element {
  return <p className="popup-trust">{TRUST_FOOTER}</p>;
}

import type { JSX } from 'preact';
import { SandboxCore } from '../shared/SandboxCore';
import { TRUST_LOCAL, TRUST_NO_STORAGE, TRUST_METADATA } from '../trust-copy';

export function SandboxPanel(): JSX.Element {
  return (
    <section className="sandbox-layout" role="tabpanel" id="panel-sandbox">
      <div className="card sandbox-header">
        <h2 className="sandbox-header__title">Detection Sandbox</h2>
        <p className="sandbox-header__desc">
          Test how Sunbreak detects sensitive data. Type your own text or choose
          a sample prompt below.
        </p>
      </div>

      <div className="card sandbox-main">
        <SandboxCore />
      </div>

      <div className="card sandbox-trust">
        <h3 className="sandbox-trust__title">Privacy & Trust</h3>
        <ul className="sandbox-trust__list">
          <li>{TRUST_LOCAL}</li>
          <li>{TRUST_NO_STORAGE}</li>
          <li>{TRUST_METADATA}</li>
        </ul>
      </div>
    </section>
  );
}

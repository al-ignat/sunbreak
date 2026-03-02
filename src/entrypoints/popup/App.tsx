import { useState } from 'preact/hooks';

export default function App(): preact.JSX.Element {
  const [enabled] = useState(true);

  return (
    <div style={{ padding: '16px' }}>
      <h1 style={{ fontSize: '16px', margin: '0 0 8px' }}>Secure BYOAI</h1>
      <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
        {enabled ? 'Active — monitoring AI tool prompts' : 'Disabled'}
      </p>
      <p style={{ fontSize: '11px', color: '#999', marginTop: '12px' }}>
        v0.1.0
      </p>
    </div>
  );
}

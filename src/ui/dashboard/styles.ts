import type { JSX } from 'preact';

/** White card section used by Settings, Keywords, and other dashboard panels */
export const sectionStyle: JSX.CSSProperties = {
  background: 'white',
  borderRadius: '8px',
  border: '1px solid #E0E0E0',
  padding: '20px',
};

/** Section header used within white card sections */
export const sectionHeaderStyle: JSX.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#333',
  margin: '0 0 12px',
};

/** Empty state card used by ActivityLog, BarChart, etc. */
export const emptyStateStyle: JSX.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  color: '#888',
  fontSize: '14px',
  background: 'white',
  borderRadius: '8px',
  border: '1px solid #E0E0E0',
};

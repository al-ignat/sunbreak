import type { JSX } from 'preact';

export function GearIcon({ size = 16 }: { readonly size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.5 1.5L7 0h2l.5 1.5.9.4L12 1l1.4 1.4-1 1.6.4.9L14.5 6v2l-1.5.5-.4.9 1 1.6L12 12.4l-1.6-1-.9.4L9 13.5H7l-.5-1.5-.9-.4-1.6 1L2.6 11l1-1.6-.4-.9L1.5 8V6l1.5-.5.4-.9-1-1.6L3.8 1.6l1.6 1 .9-.4z"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.2" />
    </svg>
  );
}

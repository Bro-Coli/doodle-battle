import { defineIcon } from '../icon.defs';

export const timerIcon = defineIcon({
  name: 'timer',
  viewBox: '0 0 64 64',
  defaultProps: {
    size: 64,
  },
  element: (
    <>
      <ellipse cx="32" cy="54" rx="18" ry="5.2" fill="#0c2f62" opacity="0.24" />
      <rect
        x="24.5"
        y="9"
        width="15"
        height="8.5"
        rx="3.6"
        fill="#e9fbff"
        stroke="#2f5f95"
        strokeWidth="3"
      />
      <path d="M44 19 49 14" fill="none" stroke="#2f5f95" strokeLinecap="round" strokeWidth="4" />
      <circle cx="32" cy="35" r="20" fill="currentColor" stroke="#2f5f95" strokeWidth="3.2" />
      <circle cx="32" cy="35" r="13.6" fill="#d9fbff" opacity="0.28" />
      <path
        d="M32 35V23.5m0 11.5 7.6 4.9"
        fill="none"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.8"
      />
      <circle cx="32" cy="35" r="3" fill="#ffffff" />
    </>
  ),
});

import { defineIcon } from '../icon.defs';

export const userIcon = defineIcon({
  name: 'user',
  viewBox: '0 0 64 64',
  defaultProps: {
    size: 64,
  },
  element: (
    <>
      <circle cx="32" cy="22.2" r="10.1" fill="#edfaff" stroke="#2f5f95" strokeWidth="3.1" />
      <path
        d="M14.6 49.4c0-8.4 7.7-14 17.4-14s17.4 5.6 17.4 14v2.8H14.6z"
        fill="#dff5ff"
        stroke="#2f5f95"
        strokeWidth="3.1"
        strokeLinejoin="round"
      />
      <ellipse cx="32" cy="44.8" rx="14.5" ry="7.2" fill="#eaf9ff" opacity="0.35" />
    </>
  ),
});

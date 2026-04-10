import { defineIcon } from '../icon.defs';

export const userIcon = defineIcon({
  name: 'user',
  viewBox: '0 0 64 64',
  defaultProps: {
    size: 64,
  },
  element: (
    <>
      <circle cx="32" cy="19.8" r="11.6" fill="#edfaff" stroke="#2f5f95" strokeWidth="3.1" />
      <ellipse cx="32" cy="50" rx="22" ry="10" fill="#1f3f78" opacity="0.28" />
      <path
        d="M52.3 50.2C49.7 57 14.3 56.4 11.7 49.6C9.1 42.8 17.2 32.1 32.1 32C46 31.9 54.9 43.4 52.3 50.2Z"
        fill="#dff5ff"
        stroke="#2f5f95"
        strokeWidth="3.1"
        strokeLinejoin="round"
      />
      <ellipse cx="32" cy="44.8" rx="14.5" ry="7.2" fill="#eaf9ff" opacity="0.35" />
    </>
  ),
});

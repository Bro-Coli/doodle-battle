import { defineIcon } from '../icon.defs';

export const lightningIcon = defineIcon({
  name: 'lightning',
  viewBox: '0 0 64 64',
  defaultProps: {
    secondColor: '#fff8e8',
    strokeWidth: 4,
  },
  element: (
    <path
      d="M36 4 16 33h12l-4 27 24-33H35z"
      fill="var(--icon-accent, #fff8e8)"
      stroke="currentColor"
      strokeWidth="var(--icon-stroke-width, 4)"
      strokeLinejoin="round"
    />
  ),
});

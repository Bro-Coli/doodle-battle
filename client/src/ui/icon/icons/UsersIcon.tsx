import { defineIcon } from '../icon.defs';

export const usersIcon = defineIcon({
  name: 'users',
  viewBox: '0 0 32 32',
  defaultProps: {
    size: 32,
    strokeWidth: 2,
  },
  element: (
    <g
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="var(--icon-stroke-width)"
    >
      <circle cx="16" cy="13" r="5" />
      <path d="M23,28A7,7,0,0,0,9,28Z" />
      <path d="M24,14a5,5,0,1,0-4-8" />
      <path d="M25,24h6a7,7,0,0,0-7-7" />
      <path d="M12,6a5,5,0,1,0-4,8" />
      <path d="M8,17a7,7,0,0,0-7,7H7" />
    </g>
  ),
});

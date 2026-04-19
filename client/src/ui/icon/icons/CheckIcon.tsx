import { defineIcon } from '../icon.defs';

export const checkIcon = defineIcon({
  name: 'check',
  viewBox: '0 -8 72 72',
  defaultProps: {
    strokeWidth: 2,
  },
  element: (
    <path
      d="m61 12.9-4-4a3 3 0 0 0-4.2 0L28.9 32.6 19.2 23a3 3 0 0 0-4.2 0l-4 4a3 3 0 0 0 0 4.3l15.8 15.9a3 3 0 0 0 2.1.8 3 3 0 0 0 2.1-.8l30-30a3 3 0 0 0 0-4.3Z"
      fill="currentColor"
      stroke="white"
      strokeWidth="var(--icon-stroke-width, 2)"
    />
  ),
});

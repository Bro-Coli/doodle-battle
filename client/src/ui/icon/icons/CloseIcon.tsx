import { defineIcon } from '../icon.defs';

export const closeIcon = defineIcon({
  name: 'close',
  viewBox: '0 0 64 64',
  defaultProps: {
    size: 64,
  },
  element: (
    <>
      <path
        d="M18 18L46 46M46 18L18 46"
        fill="none"
        stroke="#5a3dae"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 18L46 46M46 18L18 46"
        fill="none"
        stroke="currentColor"
        strokeWidth="12.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
});

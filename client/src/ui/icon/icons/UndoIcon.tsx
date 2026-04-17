import { defineIcon } from '../icon.defs';

export const undoIcon = defineIcon({
  name: 'undo',
  viewBox: '0 0 64 64',
  element: (
    <>
      <path
        d="M20 12 L8 22 L20 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 22 H36 A18 18 0 0 1 36 58"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
});

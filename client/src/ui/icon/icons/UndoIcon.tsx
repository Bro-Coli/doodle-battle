import { defineIcon } from '../icon.defs';

export const undoIcon = defineIcon({
  name: 'undo',
  viewBox: '0 0 64 64',
  element: (
    <>
      <path
        d="M14 28l-6-8 8-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 20h26a16 16 0 110 32H24"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
});

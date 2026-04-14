import { defineIcon } from '../icon.defs';

export const eraserIcon = defineIcon({
  name: 'eraser',
  viewBox: '0 0 64 64',
  element: (
    <>
      <path
        d="M22 52l-10-10a4 4 0 010-5.66L38.34 10a4 4 0 015.66 0l10 10a4 4 0 010 5.66L30 50"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 42l16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="56"
        x2="52"
        y2="56"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </>
  ),
});

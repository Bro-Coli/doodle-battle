import { defineIcon } from '../icon.defs';

export const trashIcon = defineIcon({
  name: 'trash',
  viewBox: '0 0 64 64',
  element: (
    <>
      <path
        d="M12 18h40"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M24 18v-4a4 4 0 014-4h8a4 4 0 014 4v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 18l2 34a4 4 0 004 4h20a4 4 0 004-4l2-34"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="28" y1="28" x2="28" y2="46" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="36" y1="28" x2="36" y2="46" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
});

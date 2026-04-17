import { defineIcon } from '../icon.defs';

export const trashIcon = defineIcon({
  name: 'trash',
  viewBox: '0 0 64 64',
  element: (
    <>
      <path
        d="M25 18 V13 A2 2 0 0 1 27 11 H37 A2 2 0 0 1 39 13 V18"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 20 H54"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M14 26 L14 50 C14 53.3 16.7 56 20 56 L44 56 C47.3 56 50 53.3 50 50 L50 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="24" y1="30" x2="24" y2="50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="32" y1="30" x2="32" y2="50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="40" y1="30" x2="40" y2="50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
});

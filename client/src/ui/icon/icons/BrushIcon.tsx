import { defineIcon } from '../icon.defs';

export const brushIcon = defineIcon({
  name: 'brush',
  viewBox: '0 0 64 64',
  element: (
    <>
      <path
        d="M44 8l12 12-24 24-12-12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 44l-8 12 12-8z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M36 20l8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  ),
});

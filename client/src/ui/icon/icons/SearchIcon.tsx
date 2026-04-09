import { defineIcon } from '../icon.defs';

export const searchIcon = defineIcon({
  name: 'search',
  viewBox: '0 0 64 64',
  defaultProps: {
    secondColor: '#fff8ef',
    strokeWidth: 2.5,
  },
  element: (
    <>
      <circle
        cx="28"
        cy="28"
        r="16"
        fill="none"
        stroke="var(--icon-accent, #fff8ef)"
        strokeWidth="calc(var(--icon-stroke-width, 2.5) * 3.2)"
      />
      <path
        d="M40 40 52 52"
        stroke="var(--icon-accent, #fff8ef)"
        strokeWidth="calc(var(--icon-stroke-width, 2.5) * 3.2)"
        strokeLinecap="round"
        fill="none"
      />
      <circle
        cx="28"
        cy="28"
        r="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="var(--icon-stroke-width, 2.5)"
      />
      <path
        d="M40 40 52 52"
        stroke="currentColor"
        strokeWidth="var(--icon-stroke-width, 2.5)"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
});

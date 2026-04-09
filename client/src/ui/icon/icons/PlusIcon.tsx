import { defineIcon } from '../icon.defs';

export const plusIcon = defineIcon({
  name: 'plus',
  viewBox: '0 0 64 64',
  defaultProps: {
    secondColor: '#fff8ef',
    strokeWidth: 3,
  },
  element: (
    <>
      <path
        d="M32 12v40M12 32h40"
        stroke="var(--icon-accent, #fff8ef)"
        strokeWidth="calc(var(--icon-stroke-width, 3) * 3)"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M32 12v40M12 32h40"
        stroke="currentColor"
        strokeWidth="var(--icon-stroke-width, 3)"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
});

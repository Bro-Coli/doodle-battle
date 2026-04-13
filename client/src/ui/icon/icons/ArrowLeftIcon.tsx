import { defineIcon } from '../icon.defs';

export const arrowLeftIcon = defineIcon({
  name: 'arrowLeft',
  viewBox: '0 0 64 64',
  defaultProps: {
    size: 64,
  },
  element: (
    <>
      <path
        d="M28 8 L6 32 L28 56 L28 44 L50 44 Q56 44 56 38 L56 26 Q56 20 50 20 L28 20Z"
        fill="#dff5ff"
        stroke="#2f5f95"
        strokeWidth="3.1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M30 22 L52 22 Q54 22 54 26 L54 38 Q54 42 50 42 L30 42 L30 22Z"
        fill="#eaf9ff"
        opacity="0.4"
      />
    </>
  ),
});

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
        d="M31.5 20.4 L50.5 20.4 Q55 20.4 55 24.9 L55 39.1 Q55 43.6 50.5 43.6 L31.5 43.6 L31.5 49.5 Q31.5 54.5 27 52 L10 35 Q6 32 10 29 L27 12 Q31.5 9.5 31.5 14.5 Z"
        fill="#fbfdff"
        stroke="#1c4796"
        strokeWidth="3.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M11.5 30.5 L27.2 14.8 Q28.4 14.2 28.4 15.8 L28.4 22.6 L52 22.6 Q53 22.6 53 23.8 L53 28 Q40 26.6 27 28.2 Q18.5 29.3 12.5 31 Q10.8 31.4 11.5 30.5 Z"
        fill="#ffffff"
        opacity="0.7"
      />
    </>
  ),
});

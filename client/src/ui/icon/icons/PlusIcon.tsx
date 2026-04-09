import plusSource from '../assets/plus-souce.svg';
import { defineIcon } from '../icon.defs';

export const plusIcon = defineIcon({
  name: 'plus',
  viewBox: '0 0 64 64',
  defaultProps: {
    size: 64,
  },
  element: (
    <image
      href={plusSource}
      x="0"
      y="0"
      width="64"
      height="64"
      preserveAspectRatio="xMidYMid meet"
    />
  ),
});

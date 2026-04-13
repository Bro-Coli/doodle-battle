import { defineIcon } from '../icon.defs';
import arrowSwapSource from '../assets/arrow-swap-source.svg';

export const arrowSwapIcon = defineIcon({
  name: 'arrowSwap',
  viewBox: '0 0 64 72',
  defaultProps: {
    size: 64,
  },
  element: (
    <image
      href={arrowSwapSource}
      x="0"
      y="0"
      width="64"
      height="72"
      preserveAspectRatio="xMidYMid meet"
    />
  ),
});

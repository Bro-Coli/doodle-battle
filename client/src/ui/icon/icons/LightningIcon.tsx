import lightningSource from '../assets/lightning-source.svg';
import { defineIcon } from '../icon.defs';

export const lightningIcon = defineIcon({
  name: 'lightning',
  viewBox: '0 0 64 64',
  defaultProps: {
    size: 64,
  },
  element: (
    <image
      href={lightningSource}
      x="0"
      y="0"
      width="64"
      height="64"
      preserveAspectRatio="xMidYMid meet"
    />
  ),
});

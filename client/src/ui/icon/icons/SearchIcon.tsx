import searchSource from '../assets/search-source.svg';
import { defineIcon } from '../icon.defs';

export const searchIcon = defineIcon({
  name: 'search',
  viewBox: '0 0 64 64',
  defaultProps: {
    size: 64,
  },
  element: (
    <image
      href={searchSource}
      x="0"
      y="0"
      width="64"
      height="64"
      preserveAspectRatio="xMidYMid meet"
    />
  ),
});

import type { IconDefinition, IconName } from '../icon.defs';
import { arrowLeftIcon } from './ArrowLeftIcon';
import { arrowSwapIcon } from './ArrowSwapIcon';
import { checkIcon } from './CheckIcon';
import { closeIcon } from './CloseIcon';
import { lightningIcon } from './LightningIcon';
import { plusIcon } from './PlusIcon';
import { searchIcon } from './SearchIcon';
import { trophyIcon } from './TrophyIcon';
import { userIcon } from './UserIcon';

export const iconDefinitions: Record<IconName, IconDefinition> = {
  arrowLeft: arrowLeftIcon,
  arrowSwap: arrowSwapIcon,
  check: checkIcon,
  close: closeIcon,
  lightning: lightningIcon,
  plus: plusIcon,
  search: searchIcon,
  trophy: trophyIcon,
  user: userIcon,
};

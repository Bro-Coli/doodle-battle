import type { IconDefinition, IconName } from '../icon.defs';
import { closeIcon } from './CloseIcon';
import { lightningIcon } from './LightningIcon';
import { plusIcon } from './PlusIcon';
import { searchIcon } from './SearchIcon';
import { userIcon } from './UserIcon';

export const iconDefinitions: Record<IconName, IconDefinition> = {
  close: closeIcon,
  lightning: lightningIcon,
  plus: plusIcon,
  search: searchIcon,
  user: userIcon,
};

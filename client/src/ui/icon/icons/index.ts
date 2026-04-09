import type { IconDefinition, IconName } from '../icon.defs';
import { lightningIcon } from './LightningIcon';
import { plusIcon } from './PlusIcon';
import { searchIcon } from './SearchIcon';

export const iconDefinitions: Record<IconName, IconDefinition> = {
  lightning: lightningIcon,
  plus: plusIcon,
  search: searchIcon,
};

import type { IconDefinition, IconName } from '../icon.defs';
import { arrowLeftIcon } from './ArrowLeftIcon';
import { arrowSwapIcon } from './ArrowSwapIcon';
import { brushIcon } from './BrushIcon';
import { checkIcon } from './CheckIcon';
import { closeIcon } from './CloseIcon';
import { eraserIcon } from './EraserIcon';
import { lightningIcon } from './LightningIcon';
import { plusIcon } from './PlusIcon';
import { searchIcon } from './SearchIcon';
import { timerIcon } from './TimerIcon';
import { trashIcon } from './TrashIcon';
import { trophyIcon } from './TrophyIcon';
import { undoIcon } from './UndoIcon';
import { userIcon } from './UserIcon';

export const iconDefinitions: Record<IconName, IconDefinition> = {
  arrowLeft: arrowLeftIcon,
  arrowSwap: arrowSwapIcon,
  brush: brushIcon,
  check: checkIcon,
  close: closeIcon,
  eraser: eraserIcon,
  lightning: lightningIcon,
  plus: plusIcon,
  search: searchIcon,
  timer: timerIcon,
  trash: trashIcon,
  trophy: trophyIcon,
  undo: undoIcon,
  user: userIcon,
};

import { forwardRef } from 'react';
import { Icon } from '@/ui/icon/Icon';

type LobbyUserIconButtonProps = React.ComponentPropsWithoutRef<'button'>;

export const LobbyUserIconButton = forwardRef<HTMLButtonElement, LobbyUserIconButtonProps>(
  ({ className = '', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label="User profile"
      className={`ui-icon-button ui-icon-button--md sm:ui-icon-button--sm ${className}`.trim()}
      {...props}
    >
      <Icon name="user" size={60} decorative />
    </button>
  ),
);

LobbyUserIconButton.displayName = 'LobbyUserIconButton';

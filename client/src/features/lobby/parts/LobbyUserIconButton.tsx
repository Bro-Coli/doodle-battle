import { Icon } from '@/ui/icon/Icon';

export function LobbyUserIconButton(): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label="User profile"
      className="ui-icon-button ui-icon-button--md sm:ui-icon-button--sm"
    >
      <Icon name="user" size={60} decorative />
    </button>
  );
}

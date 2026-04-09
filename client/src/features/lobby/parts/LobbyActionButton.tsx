import { Icon, type IconName } from '@/ui';

export type LobbyAction = {
  action?: () => void;
  backgroundImage: string;
  description: string;
  glowColor: string;
  iconName: IconName;
  id: string;
  title: string;
};

type LobbyActionButtonProps = {
  action: LobbyAction;
};

export function LobbyActionButton({ action }: LobbyActionButtonProps) {
  return (
    <button
      type="button"
      onClick={action.action}
      disabled={!action.action}
      className="flex-center group relative aspect-square w-full min-w-0 cursor-pointer flex-col p-[clamp(14px,2vw,24px)] text-center transition-transform duration-100 ease-linear hover:scale-[1.035] active:scale-[0.97] disabled:cursor-default disabled:opacity-90 disabled:hover:scale-100 disabled:active:scale-100"
      aria-label={action.title}
    >
      <span className="pointer-events-none absolute bottom-[4%] left-1/2 z-0 h-[14%] w-[78%] -translate-x-1/2 rounded-full bg-black/42 blur-2xl" />
      <img
        src={action.backgroundImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-contain transition-[filter] duration-150 ease-linear group-hover:[filter:drop-shadow(0_0_12px_var(--glow-color))_drop-shadow(0_0_28px_var(--glow-color))]"
        style={{ ['--glow-color' as string]: action.glowColor }}
      />
      <span className="flex-center relative z-10 text-white">
        <Icon name={action.iconName} size="100px" color="currentColor" />
      </span>
      <span className="flex-center relative z-10 mt-1 flex-col">
        <span className="t20-eb text-center uppercase text-white [text-shadow:_0_2px_0_rgba(0,0,0,0.24)]">
          {action.title}
        </span>
        <span className="t14-b mt-2 max-w-[11ch] text-center text-white/95 [text-shadow:_0_1px_0_rgba(0,0,0,0.18)]">
          {action.description}
        </span>
      </span>
    </button>
  );
}

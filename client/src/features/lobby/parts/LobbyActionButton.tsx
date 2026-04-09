export type LobbyAction = {
  action?: () => void;
  backgroundImage: string;
  description: string;
  glowColor: string;
  icon: React.JSX.Element;
  id: string;
  title: string;
};

type LobbyActionButtonProps = {
  action: LobbyAction;
};

export function LobbyActionButton({ action }: LobbyActionButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={action.action}
      disabled={!action.action}
      className="group relative flex aspect-square w-full min-w-0 cursor-pointer flex-col items-center justify-center p-[clamp(14px,2vw,24px)] text-center transition-transform duration-100 ease-linear hover:scale-[1.035] active:scale-[0.97] disabled:cursor-default disabled:opacity-90 disabled:hover:scale-100 disabled:active:scale-100"
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
      <span className="relative z-10 flex items-center justify-center text-white">{action.icon}</span>
      <span className="relative z-10 mt-1 flex flex-col items-center justify-center">
        <span className="text-center text-[clamp(0.98rem,1.8vw,2rem)] font-black uppercase leading-[0.98] tracking-[-0.04em] text-white [text-shadow:_0_2px_0_rgba(0,0,0,0.24)]">
          {action.title}
        </span>
        <span className="mt-2 max-w-[11ch] text-center text-[clamp(0.74rem,1.3vw,1.4rem)] font-bold leading-[1.08] text-white/95 [text-shadow:_0_1px_0_rgba(0,0,0,0.18)]">
          {action.description}
        </span>
      </span>
    </button>
  );
}

import { cn } from '@/shared/lib/cn';
import { Icon, StrokeShadowText, type IconName } from '@/ui';

export type LobbyAction = {
  action?: () => void;
  backgroundImage: string;
  description: string;
  firstStrokeColor: string;
  glowColor: string;
  iconName: IconName;
  id: string;
  secondStrokeColor: string;
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
      className={cn(
        'flex-center group relative h-136 w-136 flex-col text-center',
        'cursor-pointer transition-transform duration-100 ease-linear',
        'hover:scale-[1.06] active:scale-[0.96]',
        'disabled:cursor-default disabled:opacity-90',
        'disabled:hover:scale-100 disabled:active:scale-100',
      )}
      aria-label={action.title}
    >
      <span className="pointer-events-none absolute bottom-5 left-1/2 h-16 w-md -translate-x-1/2 rounded-full bg-black/42 blur-2xl" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            'h-120 w-120 bg-contain bg-center bg-no-repeat',
            'transition-[filter] duration-150 ease-linear',
            'group-hover:filter-[drop-shadow(0_0_12px_var(--glow-color))_drop-shadow(0_0_28px_var(--glow-color))]',
          )}
          style={{
            backgroundImage: `url(${action.backgroundImage})`,
            ['--glow-color' as string]: action.glowColor,
          }}
        />
      </div>
      <span className="flex-center relative text-white">
        <Icon name={action.iconName} size="152px" />
      </span>
      <span className="flex-center relative mt-6 flex-col">
        <StrokeShadowText
          className="t24-b tracking-wide"
          firstStrokeColor={action.firstStrokeColor}
          secondStrokeColor={action.secondStrokeColor}
        >
          {action.title}
        </StrokeShadowText>
        <span className=" font-nunito t18-m mt-4 whitespace-pre-line text-center text-white [text-shadow:0_1px_0_rgba(0,0,0,0.18)]">
          {action.description}
        </span>
      </span>
    </button>
  );
}

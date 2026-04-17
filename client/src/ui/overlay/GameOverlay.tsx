import type { ReactNode, CSSProperties } from 'react';
import { cn } from '@/shared/lib/cn';
import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

type GameOverlayProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  centered?: boolean;
  pointerEvents?: boolean;
};

export function GameOverlay({
  children,
  className,
  style,
  centered = false,
  pointerEvents = false,
}: GameOverlayProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'fixed inset-0 z-20',
        centered && 'flex items-center justify-center',
        !pointerEvents && 'pointer-events-none',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * GameOverlayCard
 * Premium multi-layered glass panel matching the lobby language.
 * Variants: default (purple), red, blue.
 * ────────────────────────────────────────────────────────────── */

type GameOverlayCardProps = {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'red' | 'blue';
  size?: 'md' | 'sm';
};

export function GameOverlayCard({
  children,
  className,
  variant = 'default',
  size = 'md',
}: GameOverlayCardProps): React.JSX.Element {
  const variantClass =
    variant === 'red' ? 'ui-hud-card--red' : variant === 'blue' ? 'ui-hud-card--blue' : '';

  return (
    <div
      className={cn(
        'ui-hud-card',
        size === 'sm' && 'ui-hud-card--sm',
        variantClass,
        'px-8 py-7',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * GameOverlayTitle
 * Uses the StrokeShadowText brand treatment (not plain tailwind colors).
 * Color stacks are tuned to match the rest of the doodle language.
 * ────────────────────────────────────────────────────────────── */

type TitleColor = 'default' | 'red' | 'blue' | 'yellow' | 'victory';

const TITLE_STROKE_PALETTE: Record<
  TitleColor,
  { first: string; second: string; fillStyle?: CSSProperties }
> = {
  default: {
    first: '#2C1E6B',
    second: '#4A357A',
  },
  red: {
    first: '#5B1B2E',
    second: '#8B2342',
    fillStyle: {
      background: 'linear-gradient(180deg, #FFF0F3 0%, #FFC2CE 45%, #FF8296 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
  },
  blue: {
    first: '#07305E',
    second: '#0E63AE',
    fillStyle: {
      background: 'linear-gradient(180deg, #EAF5FF 0%, #B0DEFF 45%, #6CB5FF 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
  },
  yellow: {
    first: '#6B3A10',
    second: '#A96A1E',
    fillStyle: {
      background: 'linear-gradient(180deg, #FFF4C4 0%, #FFD54F 55%, #F5A623 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
  },
  victory: {
    first: '#3E1E00',
    second: '#7A4D00',
    fillStyle: {
      background: 'linear-gradient(180deg, #FFFDE7 0%, #FFE066 35%, #FFB300 75%, #F57F00 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
  },
};

type GameOverlayTitleProps = {
  children: ReactNode;
  className?: string;
  color?: TitleColor;
  size?: 'md' | 'lg';
};

export function GameOverlayTitle({
  children,
  className,
  color = 'default',
  size = 'md',
}: GameOverlayTitleProps): React.JSX.Element {
  const palette = TITLE_STROKE_PALETTE[color];
  const sizeClass = size === 'lg' ? 't48-eb' : 't32-eb';

  return (
    <h2 className={cn('relative text-center', className)}>
      <StrokeShadowText
        className={cn(sizeClass, 'tracking-wide')}
        firstStrokeColor={palette.first}
        secondStrokeColor={palette.second}
        firstStrokeWidth={8}
        secondStrokeWidth={7}
        shadowOffsetY="0.22rem"
        fillStyle={palette.fillStyle}
      >
        {children}
      </StrokeShadowText>
    </h2>
  );
}

/* ──────────────────────────────────────────────────────────────
 * GameOverlayBadge
 * Glossy pill status chip matching the objective-banner language.
 * Variants: default/red/blue.
 * ────────────────────────────────────────────────────────────── */

type GameOverlayBadgeProps = {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'red' | 'blue';
};

export function GameOverlayBadge({
  children,
  className,
  variant = 'default',
}: GameOverlayBadgeProps): React.JSX.Element {
  const variantClass =
    variant === 'red' ? 'ui-hud-badge--red' : variant === 'blue' ? 'ui-hud-badge--blue' : '';

  return (
    <div className={cn('ui-hud-badge font-nunito t16-b', variantClass, className)}>
      {children}
    </div>
  );
}

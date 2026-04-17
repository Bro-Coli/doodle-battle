import type { ReactNode, CSSProperties } from 'react';
import { cn } from '@/shared/lib/cn';

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

type GameOverlayCardProps = {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'solid';
};

export function GameOverlayCard({
  children,
  className,
  variant = 'default',
}: GameOverlayCardProps): React.JSX.Element {
  const variants = {
    default: [
      'rounded-3xl px-10 py-8 text-center',
      'bg-[linear-gradient(180deg,rgba(50,35,90,0.92)_0%,rgba(35,22,72,0.96)_100%)]',
      'border border-white/10',
      'shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_48px_rgba(0,0,0,0.4),0_12px_24px_rgba(60,40,120,0.3)]',
      'backdrop-blur-xl',
    ].join(' '),
    glass: [
      'rounded-2xl px-8 py-6',
      'bg-black/60 backdrop-blur-md',
      'border border-white/10',
      'shadow-[0_16px_32px_rgba(0,0,0,0.3)]',
    ].join(' '),
    solid: [
      'rounded-2xl px-8 py-6',
      'bg-[#1a1035]/95',
      'ring-1 ring-white/10',
      'shadow-2xl',
    ].join(' '),
  };

  return <div className={cn(variants[variant], className)}>{children}</div>;
}

type GameOverlayTitleProps = {
  children: ReactNode;
  className?: string;
  color?: 'default' | 'red' | 'blue' | 'yellow' | 'gradient';
};

export function GameOverlayTitle({
  children,
  className,
  color = 'default',
}: GameOverlayTitleProps): React.JSX.Element {
  const colors = {
    default: 'text-white',
    red: 'text-red-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-300',
    gradient: 'bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent',
  };

  return (
    <h2
      className={cn(
        't32-eb tracking-wide',
        'drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]',
        colors[color],
        className,
      )}
    >
      {children}
    </h2>
  );
}

type GameOverlayBadgeProps = {
  children: ReactNode;
  className?: string;
};

export function GameOverlayBadge({
  children,
  className,
}: GameOverlayBadgeProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2',
        'rounded-full px-5 py-2',
        'bg-[linear-gradient(180deg,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0.05)_100%)]',
        'border border-white/20',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]',
        'font-nunito t16-b text-white/90',
        className,
      )}
    >
      {children}
    </div>
  );
}

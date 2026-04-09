import type { CSSProperties } from 'react';

import { cn } from '@/shared/lib/cn';

const tutorialStrokeRingStyle: CSSProperties & { '--stroke': string } = {
  '--stroke': '6px',
  WebkitTextStroke: 'var(--stroke) #3a56c8',
};

export function LobbyTutorialButton() {
  return (
    <button
      type="button"
      aria-label="Tutorial"
      className={cn(
        'relative inline-flex h-20 items-center justify-center overflow-hidden rounded-full',
        'border-[3px] border-[#3d52b8] px-10',
        'bg-linear-to-b from-[#aee8ff] via-[#5890e8] to-[#3a56c8]',
        'shadow-[inset_0_0_0_4px_rgba(255,255,255,0.4),inset_0_3px_0_rgba(255,255,255,0.45),inset_0_14px_28px_-12px_rgba(255,255,255,0.42),inset_14px_0_28px_-12px_rgba(255,255,255,0.36),inset_0_28px_52px_-22px_rgba(255,255,255,0.16),inset_28px_0_52px_-22px_rgba(255,255,255,0.14),inset_0_-6px_0_rgba(38,58,145,0.32),0_4px_0_#3552b0,0_10px_20px_rgba(38,58,145,0.34),0_12px_28px_rgba(0,0,0,0.2),0_4px_10px_rgba(0,0,0,0.12)]',
        'cursor-pointer transition-[transform,box-shadow,filter] duration-150 ease-linear',
        'hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-[1.03]',
        'active:translate-y-[3px] active:scale-[0.99]',
        'active:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45),inset_0_2px_0_rgba(255,255,255,0.35),inset_0_12px_22px_-10px_rgba(255,255,255,0.32),inset_12px_0_22px_-10px_rgba(255,255,255,0.28),inset_0_22px_40px_-18px_rgba(255,255,255,0.12),inset_22px_0_40px_-18px_rgba(255,255,255,0.1),inset_0_-3px_0_rgba(38,58,145,0.26),0_1px_0_#3552b0,0_4px_10px_rgba(38,58,145,0.28),0_6px_16px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.1)]',
      )}
    >
      <span className="pointer-events-none absolute top-2 right-3.5 left-3.5 h-[42%] rounded-full bg-linear-to-b from-white/55 to-white/12" />
      <span className="pointer-events-none absolute top-3 left-[18px] h-[9px] w-4 rotate-[28deg] rounded-full bg-white/48" />
      <span className="relative z-1 inline-block tracking-wide">
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 text-center uppercase text-transparent',
            't24-b',
          )}
          style={tutorialStrokeRingStyle}
        >
          Tutorial
        </span>
        <span className={cn('relative text-center text-white', 't24-b uppercase')}>Tutorial</span>
      </span>
    </button>
  );
}

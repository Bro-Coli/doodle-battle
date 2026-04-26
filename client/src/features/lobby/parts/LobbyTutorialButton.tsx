import * as Dialog from '@radix-ui/react-dialog';
import { type CSSProperties } from 'react';

import { cn } from '@/shared/lib/cn';

import { TutorialModal } from './TutorialModal';

const tutorialStrokeRingStyle: CSSProperties & { '--stroke': string } = {
  '--stroke': '6px',
  WebkitTextStroke: 'var(--stroke) #3a56c8',
};

export function LobbyTutorialButton({ className = '' }: { className?: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Tutorial"
          className={cn('ui-pill-button', className)}
        >
          <span className="relative z-1 inline-block tracking-wide">
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-0 text-center uppercase text-transparent',
                't20-b',
                'lg:t20-b',
              )}
              style={tutorialStrokeRingStyle}
            >
              Tutorial
            </span>
            <span className={cn('relative text-center text-white', 't20-b uppercase', 'lg:t20-b')}>
              Tutorial
            </span>
          </span>
        </button>
      </Dialog.Trigger>

      <TutorialModal />
    </Dialog.Root>
  );
}

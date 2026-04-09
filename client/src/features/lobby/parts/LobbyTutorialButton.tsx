import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, type CSSProperties } from 'react';

import { cn } from '@/shared/lib/cn';

import { TutorialModal } from './TutorialModal';

import tutorialModalBg from '../assets/tutorial-modal-bg.webp';
import tutorialTitle from '../assets/tutorial-title.webp';

let tutorialAssetsPreloaded = false;

const tutorialStrokeRingStyle: CSSProperties & { '--stroke': string } = {
  '--stroke': '6px',
  WebkitTextStroke: 'var(--stroke) #3a56c8',
};

export function LobbyTutorialButton() {
  useEffect(() => {
    if (tutorialAssetsPreloaded) return;
    tutorialAssetsPreloaded = true;

    const preloadAndDecode = async (src: string) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      try {
        await img.decode();
      } catch {
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }
    };

    // Preload tutorial assets so opening the dialog doesn't pay the first-load cost.
    // Use idle time to avoid competing with initial render.
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) {
      w.requestIdleCallback(() => {
        void preloadAndDecode(tutorialModalBg);
        void preloadAndDecode(tutorialTitle);
      });
      return;
    }

    const t = window.setTimeout(() => {
      void preloadAndDecode(tutorialModalBg);
      void preloadAndDecode(tutorialTitle);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Tutorial"
          className="ui-pill-button"
        >
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
            <span className={cn('relative text-center text-white', 't24-b uppercase')}>
              Tutorial
            </span>
          </span>
        </button>
      </Dialog.Trigger>

      <TutorialModal />
    </Dialog.Root>
  );
}

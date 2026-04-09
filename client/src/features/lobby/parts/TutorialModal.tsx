import * as Dialog from '@radix-ui/react-dialog';

import { cn } from '@/shared/lib/cn';

import tutorialModalBg from '../assets/tutorial-modal-bg.webp';
import tutorialTitle from '../assets/tutorial-title.webp';

/** Tutorial dialog panel. Render inside Radix `Dialog.Root` (same tree as `Dialog.Trigger`). */
export function TutorialModal() {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
      <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-screen max-w-[1680px] -translate-x-1/2 -translate-y-1/2 outline-none">
        <Dialog.Title className="sr-only">Tutorial</Dialog.Title>
        <Dialog.Description className="sr-only">
          How to play Doodle Battle. Close this dialog with the button or by pressing Escape.
        </Dialog.Description>

        <div className="relative w-full">
          <img
            src={tutorialModalBg}
            alt=""
            className="pointer-events-none mx-auto block h-auto w-full max-h-[93vh] select-none object-contain object-center"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            draggable={false}
          />

          <img
            src={tutorialTitle}
            alt="How to play"
            className="pointer-events-none absolute -top-12 left-1/2 z-10 w-[1000px] -translate-x-1/2 select-none object-contain"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            draggable={false}
          />

          <Dialog.Close
            type="button"
            aria-label="Close tutorial"
            className={cn(
              'absolute top-[6%] right-[5%] z-20 flex h-10 w-10 items-center justify-center rounded-full',
              'border-2 border-[#3d52b8] bg-white/90 text-[#2a3f9e] shadow-md',
              't18-b leading-none transition-[transform,background-color] hover:scale-105 hover:bg-white',
              'focus-visible:ring-2 focus-visible:ring-[#5890e8] focus-visible:ring-offset-2 focus-visible:outline-none',
              'sm:top-[7%] sm:right-[6%] sm:h-11 sm:w-11',
            )}
          >
            ×
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

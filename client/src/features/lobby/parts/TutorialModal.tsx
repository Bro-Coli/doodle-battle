import * as Dialog from '@radix-ui/react-dialog';

import { cn } from '@/shared/lib/cn';

/** Tutorial dialog panel. Render inside Radix `Dialog.Root` (same tree as `Dialog.Trigger`). */
export function TutorialModal() {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
      <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(96vw,1220px)] -translate-x-1/2 -translate-y-1/2 outline-none">
        <Dialog.Title className="sr-only">Tutorial</Dialog.Title>
        <Dialog.Description className="sr-only">
          How to play Doodle Battle. Close this dialog with the button or by pressing Escape.
        </Dialog.Description>

        <div className="ui-purple-glass-modal ui-purple-glass-modal--lg">
          <span className="ui-name-glass-spec" aria-hidden />
          <Dialog.Close
            type="button"
            aria-label="Close tutorial"
            className={cn(
              'absolute top-7 right-7 z-20 flex h-10 w-10 items-center justify-center rounded-full',
              'border-2 border-[#3d52b8] bg-white/90 text-[#2a3f9e] shadow-md',
              't18-b leading-none transition-[transform,background-color] hover:scale-105 hover:bg-white',
              'focus-visible:ring-2 focus-visible:ring-[#5890e8] focus-visible:ring-offset-2 focus-visible:outline-none',
              'sm:top-5 sm:right-5 sm:h-11 sm:w-11',
            )}
          >
            ×
          </Dialog.Close>

          <div className="relative z-1 flex h-full flex-col gap-7 px-12 py-12 text-white sm:px-7 sm:py-8">
            <h2 className="t48-eb uppercase text-center drop-shadow-[0_4px_0_rgba(60,35,124,0.35)] sm:t32-eb">
              How To Play
            </h2>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-white/35 bg-white/12 p-5 backdrop-blur-[1px]">
                <h3 className="mb-2 t24-eb uppercase text-white">1. Draw</h3>
                <p className="t18-b text-white/95">
                  Draw your creature before the timer ends. Your stroke color follows your team.
                </p>
              </article>
              <article className="rounded-2xl border border-white/35 bg-white/12 p-5 backdrop-blur-[1px]">
                <h3 className="mb-2 t24-eb uppercase text-white">2. Simulate</h3>
                <p className="t18-b text-white/95">
                  All drawings spawn into the arena. Teams fight automatically by behavior rules.
                </p>
              </article>
              <article className="rounded-2xl border border-white/35 bg-white/12 p-5 backdrop-blur-[1px]">
                <h3 className="mb-2 t24-eb uppercase text-white">3. Survive</h3>
                <p className="t18-b text-white/95">
                  Keep more entities alive than the opponent before rounds run out.
                </p>
              </article>
              <article className="rounded-2xl border border-white/35 bg-white/12 p-5 backdrop-blur-[1px]">
                <h3 className="mb-2 t24-eb uppercase text-white">4. Win</h3>
                <p className="t18-b text-white/95">
                  Eliminate the enemy team or finish with the higher survivor count.
                </p>
              </article>
            </div>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

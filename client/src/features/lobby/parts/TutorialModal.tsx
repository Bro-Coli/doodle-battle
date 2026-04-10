import * as Dialog from '@radix-ui/react-dialog';
import { Icon } from '@/ui';
import tutorialTitle from '../assets/tutorial-title.webp';

/** Tutorial dialog panel. Render inside Radix `Dialog.Root` (same tree as `Dialog.Trigger`). */
export function TutorialModal() {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
      <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(96vw,1120px)] -translate-x-1/2 -translate-y-1/2 outline-none">
        <Dialog.Title className="sr-only">Tutorial</Dialog.Title>
        <Dialog.Description className="sr-only">
          How to play Doodle Battle. Close this dialog with the button or by pressing Escape.
        </Dialog.Description>

        <Dialog.Close
          type="button"
          aria-label="Close tutorial"
          className="ui-icon-button ui-icon-button--modal-close absolute -top-8 -right-8 z-30 focus-visible:ring-2 focus-visible:ring-[#c7a5ff] focus-visible:ring-offset-2 focus-visible:outline-none sm:-top-4 sm:-right-4"
        >
          <Icon
            name="close"
            size={62}
            color="#dbd4ef"
            decorative
            className="drop-shadow-[0_2px_0_rgba(53,28,115,0.55)]"
          />
        </Dialog.Close>

        <img
          src={tutorialTitle}
          alt="How to Play"
          className="pointer-events-none absolute top-6 left-1/2 z-20 w-[min(84vw,720px)] -translate-x-1/2 -translate-y-1/2 select-none object-contain sm:w-[min(86vw,640px)]"
          style={{
            filter:
              'hue-rotate(12deg) saturate(1.08) brightness(1.01) drop-shadow(0 0 6px rgba(211, 176, 255, 0.8)) drop-shadow(0 0 16px rgba(198, 153, 255, 0.55))',
          }}
          draggable={false}
        />

        <div className="ui-purple-glass-modal ui-purple-glass-modal--lg">
          <span className="ui-name-glass-spec" aria-hidden />

          <div className="relative z-1 flex h-full flex-col gap-7 px-12 pt-24 pb-12 text-white sm:px-7 sm:pt-18 sm:pb-8">
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

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon, StrokeShadowText, type IconName } from '@/ui';
import tutorialTitle from '../assets/tutorial-title.webp';

type TutorialStep = {
  description: string;
  fallbackIconName: IconName;
  iconSrc: string;
  iconTone: 'cyan' | 'pink' | 'green';
  title: string;
};

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Draw!',
    description: 'Sketch your creature\nbefore time runs out.',
    iconSrc: '/tutorial-icons/draw-creature.png',
    fallbackIconName: 'brush',
    iconTone: 'cyan',
  },
  {
    title: 'Battle!',
    description: 'Watch creatures clash\nautomatically in battle.',
    iconSrc: '/tutorial-icons/battle.png',
    fallbackIconName: 'lightning',
    iconTone: 'pink',
  },
  {
    title: 'Win!',
    description: 'Survive longer than\nother teams to win.',
    iconSrc: '/tutorial-icons/win-conditions.png',
    fallbackIconName: 'trophy',
    iconTone: 'green',
  },
];

function TutorialStepIcon({ step }: { step: TutorialStep }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      className="ui-tutorial-icon-wrap"
      data-state={imageFailed ? 'fallback' : 'image'}
      data-tone={step.iconTone}
    >
      {imageFailed ? (
        <Icon
          name={step.fallbackIconName}
          size="56%"
          color="currentColor"
          decorative
          className="ui-tutorial-icon-fallback"
        />
      ) : (
        <img
          src={step.iconSrc}
          alt=""
          className="ui-tutorial-icon-img"
          onError={() => {
            setImageFailed(true);
          }}
          draggable={false}
          decoding="async"
        />
      )}
    </div>
  );
}

/** Tutorial dialog panel. Render inside Radix `Dialog.Root` (same tree as `Dialog.Trigger`). */
export function TutorialModal() {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
      <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(96vw,1140px)] -translate-x-1/2 -translate-y-1/2 outline-none">
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
            className="ui-tutorial-close-icon"
          />
        </Dialog.Close>

        <img
          src={tutorialTitle}
          alt="How to Play"
          width={4747}
          height={879}
          className="ui-tutorial-modal-title pointer-events-none absolute top-6 left-1/2 z-20 w-[min(84vw,720px)] -translate-x-1/2 -translate-y-1/2 select-none object-contain sm:w-[min(86vw,640px)]"
          draggable={false}
          decoding="async"
        />

        <div className="ui-purple-glass-modal ui-purple-glass-modal--lg ui-purple-glass-modal--tutorial">
          <span className="ui-name-glass-spec" aria-hidden />

          <div className="relative z-[1] flex h-full px-7 pt-26 pb-7 text-white sm:px-4 sm:pt-18 sm:pb-5">
            <div className="ui-tutorial-card-grid">
              {tutorialSteps.map((step) => (
                <article className="ui-tutorial-card" key={step.title}>
                  <TutorialStepIcon step={step} />

                  <h3 className="ui-tutorial-card-title">
                    <StrokeShadowText
                      className="t28-eb"
                      firstStrokeColor="#1d327b"
                      secondStrokeColor="#1d327b"
                      firstStrokeWidth={6}
                    >
                      {step.title}
                    </StrokeShadowText>
                  </h3>
                  <p className="ui-tutorial-card-description font-nunito t16-b mt-4 whitespace-pre-line text-center text-white [text-shadow:0_1px_0_rgba(0,0,0,0.18)]">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

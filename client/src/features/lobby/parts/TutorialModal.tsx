import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon, StrokeShadowText, type IconName } from '@/ui';

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
    description: 'End the round with more living drawings than your opponent.',
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
          className="ui-icon-button ui-icon-button--modal-close absolute -top-8 -right-8 z-30 focus-visible:ring-2 focus-visible:ring-[#c7a5ff] focus-visible:ring-offset-2 focus-visible:outline-none sm:top-4 sm:right-4"
        >
          <Icon
            name="close"
            size={62}
            color="#dbd4ef"
            decorative
            className="ui-tutorial-close-icon"
          />
        </Dialog.Close>

        <div className="ui-purple-glass-modal ui-purple-glass-modal--lg ui-purple-glass-modal--tutorial">
          <span className="ui-name-glass-spec" aria-hidden />

          <div className="relative z-[1] flex h-full flex-col px-7 pt-12 pb-10 text-white sm:px-4 sm:pt-6 sm:pb-5">
            <div className="mb-8 flex justify-center sm:mb-4">
              <StrokeShadowText
                className="t60-eb sm:t48-eb"
                fillClassName="ui-create-room-title__text"
                fillStyle={{
                  backgroundImage:
                    'linear-gradient(180deg, #ffffff 0%, #eef7ff 35%, #bfe4ff 72%, #8fd2ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
                firstStrokeColor="#1a2555"
                secondStrokeColor="#2c5890"
                firstStrokeWidth={12}
                secondStrokeWidth={8}
                shadowOffsetY="0.32rem"
                deepShadowColor="rgba(20, 38, 92, 0.92)"
                deepShadowOffsetY="0.7rem"
                deepShadowStrokeWidth={12}
                deepShadowBlur="1px"
              >
                How to Play
              </StrokeShadowText>
            </div>

            <div className="ui-tutorial-card-grid flex-1">
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

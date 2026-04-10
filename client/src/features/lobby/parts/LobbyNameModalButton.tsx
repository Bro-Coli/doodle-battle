import * as Dialog from '@radix-ui/react-dialog';
import { useState, type CSSProperties } from 'react';

import { StrokeShadowText } from '@/ui/text/StrokeShadowText';

export function LobbyNameModalButton() {
  const [name, setName] = useState('');
  const confirmStrokeStyle: CSSProperties & { '--stroke': string } = {
    '--stroke': '5px',
    WebkitTextStroke: 'var(--stroke) #0f6b7f',
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="rounded-full border border-white/25 bg-black/25 px-5 py-2 font-nunito t14-b text-white/90 backdrop-blur-sm hover:bg-black/35"
        >
          Name Modal (Temp)
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,700px)] -translate-x-1/2 -translate-y-1/2 outline-none">
          <Dialog.Title className="sr-only">Change Name</Dialog.Title>
          <Dialog.Description className="sr-only">
            Enter your display name and close the modal.
          </Dialog.Description>

          <div className="ui-name-glass-card">
            <span className="ui-name-glass-spec" aria-hidden />
            <div className="relative z-1 flex h-full flex-col items-center justify-center text-center">
              <StrokeShadowText
                className="t38-eb uppercase"
                firstStrokeColor="#1a2555"
                secondStrokeColor="#2c5890"
                firstStrokeWidth={10}
                secondStrokeWidth={10}
                // shadowOffsetY="0.4rem"
              >
                Enter Your Name
              </StrokeShadowText>

              <input
                id="name-modal-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name..."
                maxLength={16}
                className="ui-name-input mt-8 px-5 t24-b font-nunito"
              />
              <p className="text-white/90 t16-b font-nunito mt-4">Max 16 characters</p>

              <div className="mt-2 flex justify-center">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="ui-pill-button ui-pill-button--confirm px-8 mt-6"
                  >
                    <span className="relative z-1 inline-block">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t28-eb "
                        style={confirmStrokeStyle}
                      >
                        Confirm
                      </span>
                      <span className="relative text-center uppercase text-white t28-eb">
                        Confirm
                      </span>
                    </span>
                  </button>
                </Dialog.Close>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

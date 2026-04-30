import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

import { setDisplayName, useDisplayNameStore } from '@/features/lobby/displayNameStore';
import { StrokeShadowText } from '@/ui/text/StrokeShadowText';
import { playButtonSfx } from '../buttonSfx';

type DecoItem =
  | {
      type: 'star';
      top: string;
      left: string;
      size: string;
      color?: string;
      glow?: string;
      dur?: string;
      delay?: string;
    }
  | {
      type: 'circle';
      top: string;
      left: string;
      size: string;
      color?: string;
      glow?: string;
      dur?: string;
      delay?: string;
    }
  | {
      type: 'ring';
      top: string;
      left: string;
      size: string;
      color?: string;
      glow?: string;
      dur?: string;
      delay?: string;
    };

const DECORATIONS: DecoItem[] = [
  {
    type: 'star',
    top: '2%',
    left: '6%',
    size: '28px',
    glow: 'rgba(255,255,255,0.8)',
    dur: '2.2s',
    delay: '0s',
  },
  {
    type: 'star',
    top: '8%',
    left: '88%',
    size: '24px',
    glow: 'rgba(200,180,255,0.8)',
    dur: '2.8s',
    delay: '0.4s',
  },
  {
    type: 'star',
    top: '78%',
    left: '4%',
    size: '20px',
    glow: 'rgba(255,220,255,0.7)',
    dur: '3.2s',
    delay: '1.1s',
  },
  {
    type: 'star',
    top: '85%',
    left: '92%',
    size: '32px',
    glow: 'rgba(255,255,255,0.9)',
    dur: '2.5s',
    delay: '0.6s',
  },
  {
    type: 'star',
    top: '45%',
    left: '1%',
    size: '18px',
    glow: 'rgba(200,200,255,0.7)',
    dur: '3s',
    delay: '1.5s',
  },
  {
    type: 'star',
    top: '30%',
    left: '96%',
    size: '22px',
    glow: 'rgba(255,200,255,0.8)',
    dur: '2.6s',
    delay: '0.2s',
  },
  {
    type: 'star',
    top: '62%',
    left: '95%',
    size: '18px',
    glow: 'rgba(220,200,255,0.7)',
    dur: '3.4s',
    delay: '0.9s',
  },

  {
    type: 'circle',
    top: '12%',
    left: '14%',
    size: '10px',
    color: 'rgba(255,255,255,0.7)',
    glow: 'rgba(200,180,255,0.5)',
    dur: '3.5s',
    delay: '0.3s',
  },
  {
    type: 'circle',
    top: '18%',
    left: '82%',
    size: '8px',
    color: 'rgba(255,220,255,0.8)',
    glow: 'rgba(255,200,255,0.5)',
    dur: '2.8s',
    delay: '1.2s',
  },
  {
    type: 'circle',
    top: '70%',
    left: '10%',
    size: '12px',
    color: 'rgba(200,200,255,0.7)',
    glow: 'rgba(180,180,255,0.5)',
    dur: '3.2s',
    delay: '0.7s',
  },
  {
    type: 'circle',
    top: '90%',
    left: '80%',
    size: '10px',
    color: 'rgba(255,255,255,0.6)',
    glow: 'rgba(255,255,255,0.4)',
    dur: '4s',
    delay: '1.6s',
  },
  {
    type: 'circle',
    top: '55%',
    left: '97%',
    size: '8px',
    color: 'rgba(255,200,255,0.7)',
    glow: 'rgba(255,180,255,0.4)',
    dur: '3s',
    delay: '0.5s',
  },
  {
    type: 'circle',
    top: '40%',
    left: '2%',
    size: '7px',
    color: 'rgba(200,220,255,0.8)',
    glow: 'rgba(180,200,255,0.5)',
    dur: '3.6s',
    delay: '2s',
  },

  {
    type: 'ring',
    top: '5%',
    left: '50%',
    size: '24px',
    color: 'rgba(255,255,255,0.3)',
    glow: 'rgba(200,180,255,0.25)',
    dur: '5s',
    delay: '0s',
  },
  {
    type: 'ring',
    top: '92%',
    left: '40%',
    size: '18px',
    color: 'rgba(255,200,255,0.3)',
    glow: 'rgba(255,180,255,0.2)',
    dur: '4.5s',
    delay: '1s',
  },
  {
    type: 'ring',
    top: '50%',
    left: '98%',
    size: '20px',
    color: 'rgba(200,200,255,0.25)',
    glow: 'rgba(180,180,255,0.2)',
    dur: '5.5s',
    delay: '0.8s',
  },
  {
    type: 'ring',
    top: '35%',
    left: '0%',
    size: '16px',
    color: 'rgba(255,220,255,0.3)',
    glow: 'rgba(220,200,255,0.2)',
    dur: '4s',
    delay: '1.4s',
  },
];

function ModalDecorations() {
  return (
    <div className="ui-modal-deco-wrap" aria-hidden>
      {DECORATIONS.map((d, i) => {
        const vars = {
          '--size': d.size,
          '--dur': d.dur,
          '--delay': d.delay,
          ...(d.color && { '--color': d.color }),
          ...(d.glow && { '--glow': d.glow }),
          top: d.top,
          left: d.left,
        } as CSSProperties;

        if (d.type === 'star')
          return <span key={i} className="ui-deco-star ui-deco-star--4pt" style={vars} />;
        if (d.type === 'circle') return <span key={i} className="ui-deco-circle" style={vars} />;
        return <span key={i} className="ui-deco-ring" style={vars} />;
      })}
    </div>
  );
}

interface LobbyNameModalProps {
  trigger?: React.JSX.Element;
}

export function LobbyNameModal({ trigger }: LobbyNameModalProps) {
  const displayName = useDisplayNameStore((store) => store.displayName);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmStrokeStyle: CSSProperties & { '--stroke': string } = {
    '--stroke': '5px',
    WebkitTextStroke: 'var(--stroke) #0f6b7f',
  };
  const canConfirm = !!name.trim();

  useEffect(() => {
    if (!open) return;
    setName(displayName);
  }, [open, displayName]);

  function handleConfirm(): void {
    if (!canConfirm) return;
    playButtonSfx();
    setDisplayName(name);
    setOpen(false);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleConfirm();
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="rounded-full border border-white/25 bg-black/25 px-5 py-2 font-nunito t14-b text-white/90 backdrop-blur-sm hover:bg-black/35"
          >
            Edit Name
          </button>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-[min(90vw,640px)] -translate-x-1/2 -translate-y-1/2 outline-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => {
              const input = inputRef.current;
              if (!input) return;
              input.focus({ preventScroll: true });
              const cursorAt = input.value.length;
              input.setSelectionRange(cursorAt, cursorAt);
            });
          }}
        >
          <Dialog.Title className="sr-only">Edit Name</Dialog.Title>
          <Dialog.Description className="sr-only">Edit your display name.</Dialog.Description>

          <div className="relative">
            <ModalDecorations />
            <div className="ui-purple-glass-modal">
              <span className="ui-name-glass-spec" aria-hidden />
              <div className="relative z-1 flex h-full flex-col items-center justify-center text-center">
                <StrokeShadowText
                  className="t32-eb uppercase sm:t24-eb"
                  firstStrokeColor="#1a2555"
                  secondStrokeColor="#2c5890"
                  firstStrokeWidth={10}
                  secondStrokeWidth={10}
                  // shadowOffsetY="0.4rem"
                >
                  Edit Your Name
                </StrokeShadowText>

                <input
                  id="name-modal-input"
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Your Name..."
                  maxLength={16}
                  className="ui-name-input mt-8 px-5 t24-b font-nunito sm:mt-6 sm:px-4 sm:text-[20px]"
                />
                <p className="text-white/90 t16-b font-nunito mt-4 sm:t14-b sm:mt-3">Max 16 characters</p>

                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    className="ui-pill-button ui-pill-button--mint px-7 mt-5 disabled:cursor-not-allowed disabled:opacity-65 sm:px-6 sm:mt-4 sm:scale-90"
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                  >
                    <span className="relative z-1 inline-block">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 text-center uppercase text-transparent t24-eb sm:t20-eb"
                        style={confirmStrokeStyle}
                      >
                        Save
                      </span>
                      <span className="relative text-center uppercase text-white t24-eb sm:t20-eb">
                        Save
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

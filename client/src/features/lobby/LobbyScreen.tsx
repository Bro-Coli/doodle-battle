import { useEffect, useState } from 'react';
import { navigate } from '../../utils/navigate';
import { joinFirstOpenRoom } from '../../network/ColyseusClient';
import { useDisplayNameStore } from './displayNameStore';
import mainTitle from './assets/main-title.webp';
import mainBtn1 from './assets/main-btn-1.webp';
import mainBtn2 from './assets/main-btn-2.webp';
import mainBtn3 from './assets/main-btn-3.webp';
import { cn } from '@/shared/lib/cn';

import { LobbyNameModal } from './parts/LobbyNameModal';
import { LobbyActionButton, type LobbyAction } from './parts/LobbyActionButton';
import { LobbyTutorialButton } from './parts/LobbyTutorialButton';
import { LobbyUserIconButton } from './parts/LobbyUserIconButton';

export function LobbyScreen(): React.JSX.Element {
  const displayName = useDisplayNameStore((store) => store.displayName);
  const [quickJoining, setQuickJoining] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!banner) return;
    const id = window.setTimeout(() => setBanner(null), 10000);
    return () => window.clearTimeout(id);
  }, [banner]);

  async function handleQuickPlay(): Promise<void> {
    const normalizedName = displayName.trim();
    if (!normalizedName) {
      setBanner('Set your display name first.');
      return;
    }
    if (quickJoining) return;
    setBanner(null);
    setQuickJoining(true);
    try {
      const room = await joinFirstOpenRoom(normalizedName);
      if (!room) {
        setBanner('No open rooms found, try creating your own!');
        setQuickJoining(false);
        return;
      }
      navigate('/waiting');
    } catch (err: unknown) {
      setBanner(err instanceof Error ? err.message : 'Failed to connect. Please try again.');
      setQuickJoining(false);
    }
  }

  const lobbyActions: LobbyAction[] = [
    {
      id: 'quick-play',
      title: 'QUICK PLAY',
      description: 'Join a game \n automatically!',
      backgroundImage: mainBtn1,
      firstStrokeColor: '#DD9B12',
      secondStrokeColor: '#8c3702',
      glowColor: 'rgba(255, 202, 73, 0.78)',
      action: () => void handleQuickPlay(),
      iconName: 'lightning',
    },
    {
      id: 'create-room',
      title: 'CREATE ROOM',
      description: 'Make a room \n and invite friends',
      backgroundImage: mainBtn2,
      firstStrokeColor: '#C93062',
      secondStrokeColor: '#820a48',
      glowColor: 'rgba(255, 137, 214, 0.78)',
      action: () => navigate('/create'),
      iconName: 'plus',
    },
    {
      id: 'join-room',
      title: 'JOIN ROOM',
      description: 'Enter a code \n or browse rooms',
      backgroundImage: mainBtn3,
      firstStrokeColor: '#02A4A7',
      secondStrokeColor: '#00667D',
      glowColor: 'rgba(90, 237, 255, 0.78)',
      action: () => navigate('/join'),
      iconName: 'search',
    },
  ];

  return (
    <main
      className="relative flex min-h-screen w-full items-start justify-center overflow-x-auto overflow-y-hidden px-6 pt-8 pb-8 sm:px-4 sm:pt-4"
      style={{
        background: 'var(--gradient-lobby)',
      }}
    >
      <div className="flex min-w-[1680px] max-w-7xl flex-col items-center gap-6 pt-8 sm:gap-5 sm:pt-6">
        <img
          src={mainTitle}
          alt="Doodle Battle"
          width={2096}
          height={992}
          className="w-full max-w-[580px] object-contain  lg:max-w-[520px]"
          decoding="async"
        />
        <div className="-translate-x-4 mx-auto flex w-max items-center justify-center -space-x-4 lg:-space-x-16">
          {lobbyActions.map((action, index) => (
            <div key={action.id} className={cn('shrink-0', index === 2 && 'ml-4')}>
              <LobbyActionButton action={action} />
            </div>
          ))}
        </div>
        {banner && (
          <div
            role="status"
            className="rounded-xl bg-white/15 px-6 py-3 font-nunito t18-b text-white backdrop-blur-sm [text-shadow:0_1px_0_rgba(0,0,0,0.25)]"
          >
            {banner}
          </div>
        )}
        {quickJoining && !banner && (
          <div
            role="status"
            className="rounded-xl bg-white/15 px-6 py-3 font-nunito t18-b text-white backdrop-blur-sm [text-shadow:0_1px_0_rgba(0,0,0,0.25)]"
          >
            Finding an open room…
          </div>
        )}
      </div>
      <div className="absolute bottom-8 left-8 sm:bottom-4 sm:left-4">
        <LobbyTutorialButton />
      </div>
      {import.meta.env.DEV && (
        <div className="absolute bottom-8 right-8 z-10 sm:bottom-4 sm:right-4">
          <div className="ui-dev-dock">
            <span className="ui-dev-dock__label">Dev</span>
            <button
              type="button"
              onClick={() => navigate('/dev/scenario')}
              className="ui-dev-dock__btn"
            >
              Scenario
            </button>
            <button
              type="button"
              onClick={() => navigate('/dev/result')}
              className="ui-dev-dock__btn"
            >
              Result
            </button>
          </div>
        </div>
      )}
      <div className="absolute top-6 right-6 z-10 sm:top-4 sm:right-4">
        <LobbyNameModal trigger={<LobbyUserIconButton />} />
      </div>
    </main>
  );
}

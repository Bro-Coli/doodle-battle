import { navigate } from '../../utils/navigate';
import mainBackground from './assets/main-bg.png';
import mainTitle from './assets/main-title.png';
import mainBtn1 from './assets/main-btn-1.webp';
import mainBtn2 from './assets/main-btn-2.webp';
import mainBtn3 from './assets/main-btn-3.webp';
import { cn } from '@/shared/lib/cn';

import { LobbyNameModal } from './parts/LobbyNameModal';
import { LobbyActionButton, type LobbyAction } from './parts/LobbyActionButton';
import { LobbyTutorialButton } from './parts/LobbyTutorialButton';
import { LobbyUserIconButton } from './parts/LobbyUserIconButton';

const lobbyActions: LobbyAction[] = [
  {
    id: 'quick-play',
    title: 'QUICK PLAY',
    description: 'Join a game \n automatically!',
    backgroundImage: mainBtn1,
    firstStrokeColor: '#DD9B12',
    secondStrokeColor: '#8c3702',
    glowColor: 'rgba(255, 202, 73, 0.78)',
    action: () => navigate('/lobby', '?flow=quick'),
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
    action: () => navigate('/lobby', '?flow=create'),
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
    action: () => navigate('/lobby', '?flow=join'),
    iconName: 'search',
  },
];

export function LobbyScreen(): React.JSX.Element {
  return (
    <main
      className="relative flex min-h-screen w-full items-start justify-center overflow-x-auto overflow-y-hidden bg-cover bg-center bg-no-repeat px-6 pt-8 pb-8 sm:px-4 sm:pt-4"
      style={{ backgroundImage: `url(${mainBackground})` }}
    >
      <div className="flex min-w-[1680px] max-w-7xl flex-col items-center gap-6 pt-8 sm:gap-5 sm:pt-6">
        <img
          src={mainTitle}
          alt="Doodle Battle"
          className="w-full max-w-[580px] object-contain drop-shadow-[0_18px_40px_rgba(28,20,78,0.45)] lg:max-w-[520px]"
        />
        <div className="-translate-x-4 mx-auto flex w-max items-center justify-center -space-x-4 lg:-space-x-16">
          {lobbyActions.map((action, index) => (
            <div key={action.id} className={cn('shrink-0', index === 2 && 'ml-4')}>
              <LobbyActionButton action={action} />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-8 left-8 sm:bottom-4 sm:left-4">
        <LobbyTutorialButton />
      </div>
      <div className="absolute top-6 left-6 z-10 sm:top-4 sm:left-4">
        <div className="flex flex-col items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/scenario')}
            className="rounded-full border border-white/25 bg-black/25 px-5 py-2 font-nunito t14-b text-white/90 backdrop-blur-sm hover:bg-black/35"
          >
            Scenario Markup (Temp)
          </button>
        </div>
      </div>
      <div className="absolute top-6 right-6 z-10 sm:top-4 sm:right-4">
        <LobbyNameModal trigger={<LobbyUserIconButton />} />
      </div>
    </main>
  );
}

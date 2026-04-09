import mainBackground from './assets/main-bg.png';
import mainTitle from './assets/main-title.png';
import mainBtn1 from './assets/main-btn-1.png';
import mainBtn2 from './assets/main-btn-2.png';
import mainBtn3 from './assets/main-btn-3.png';
import { LobbyActionButton, type LobbyAction } from './parts/LobbyActionButton';

const lobbyActions: LobbyAction[] = [
  {
    id: 'quick-play',
    title: 'QUICK PLAY',
    description: 'Join a game automatically!',
    backgroundImage: mainBtn1,
    glowColor: 'rgba(255, 202, 73, 0.78)',
    action: () => navigate('/game'),
    icon: (
      <svg viewBox="0 0 64 64" className="h-10 w-10 sm:h-9 sm:w-9">
        <path
          d="M36 4 16 33h12l-4 27 24-33H35z"
          fill="#fff8e8"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'create-room',
    title: 'CREATE ROOM',
    description: 'Make a room and invite friends',
    backgroundImage: mainBtn2,
    glowColor: 'rgba(255, 118, 207, 0.78)',
    icon: (
      <svg viewBox="0 0 64 64" className="h-10 w-10 sm:h-9 sm:w-9">
        <path d="M32 12v40M12 32h40" stroke="#fff8ef" strokeWidth="9" strokeLinecap="round" />
        <path d="M32 12v40M12 32h40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'join-room',
    title: 'JOIN ROOM',
    description: 'Enter a code or browse rooms',
    backgroundImage: mainBtn3,
    glowColor: 'rgba(90, 237, 255, 0.78)',
    icon: (
      <svg viewBox="0 0 64 64" className="h-10 w-10 sm:h-9 sm:w-9">
        <circle cx="28" cy="28" r="16" fill="none" stroke="#fff8ef" strokeWidth="8" />
        <path d="M40 40 52 52" stroke="#fff8ef" strokeWidth="8" strokeLinecap="round" />
        <circle cx="28" cy="28" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M40 40 52 52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

function navigate(pathname: string): void {
  if (window.location.pathname === pathname) return;
  window.history.pushState({}, '', pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function LobbyScreen() {
  return (
    <main
      className="flex min-h-screen w-screen items-start justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-6 pt-6 pb-8 sm:px-4 sm:pt-4"
      style={{ backgroundImage: `url(${mainBackground})` }}
    >
      <div className="flex w-full max-w-7xl flex-col items-center gap-6 pt-8 sm:gap-5 sm:pt-6">
        <img
          src={mainTitle}
          alt="Doodle Battle"
          className="w-full max-w-[580px] object-contain drop-shadow-[0_18px_40px_rgba(28,20,78,0.45)] sm:max-w-[520px]"
        />
        <div className="grid w-full max-w-[1280px] grid-cols-3 gap-2">
          {lobbyActions.map((action) => (
            <LobbyActionButton key={action.id} action={action} />
          ))}
        </div>
      </div>
    </main>
  );
}

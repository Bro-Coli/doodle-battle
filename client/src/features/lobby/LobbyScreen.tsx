import { navigate } from '../../utils/navigate';
import mainBackground from './assets/main-bg.png';
import mainTitle from './assets/main-title.png';
import mainBtn1 from './assets/main-btn-1.png';
import mainBtn2 from './assets/main-btn-2.png';
import mainBtn3 from './assets/main-btn-3.png';

type LobbyAction = {
  action: () => void;
  backgroundImage: string;
  description: string;
  glowColor: string;
  icon: React.JSX.Element;
  id: string;
  title: string;
};

const lobbyActions: LobbyAction[] = [
  {
    id: 'quick-play',
    title: 'QUICK PLAY',
    description: 'Join a game automatically!',
    backgroundImage: mainBtn1,
    glowColor: 'rgba(255, 202, 73, 0.78)',
    action: () => navigate('/lobby', '?flow=quick'),
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
    action: () => navigate('/lobby', '?flow=create'),
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
    action: () => navigate('/lobby', '?flow=join'),
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

export function LobbyScreen(): React.JSX.Element {
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
            <button
              key={action.id}
              type="button"
              onClick={action.action}
              className="group relative flex aspect-square w-full min-w-0 cursor-pointer flex-col items-center justify-center p-[clamp(14px,2vw,24px)] text-center transition-transform duration-100 ease-linear hover:scale-[1.035] active:scale-[0.97]"
              aria-label={action.title}
            >
              <span className="pointer-events-none absolute bottom-[4%] left-1/2 z-0 h-[14%] w-[78%] -translate-x-1/2 rounded-full bg-black/42 blur-2xl" />
              <img
                src={action.backgroundImage}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-contain transition-[filter] duration-150 ease-linear group-hover:[filter:drop-shadow(0_0_12px_var(--glow-color))_drop-shadow(0_0_28px_var(--glow-color))]"
                style={{ ['--glow-color' as string]: action.glowColor }}
              />
              <span className="relative z-10 flex items-center justify-center text-white">
                {action.icon}
              </span>
              <span className="relative z-10 mt-1 flex flex-col items-center justify-center">
                <span className="text-center text-[clamp(0.98rem,1.8vw,2rem)] font-black uppercase leading-[0.98] tracking-[-0.04em] text-white [text-shadow:_0_2px_0_rgba(0,0,0,0.24)]">
                  {action.title}
                </span>
                <span className="mt-2 max-w-[11ch] text-center text-[clamp(0.74rem,1.3vw,1.4rem)] font-bold leading-[1.08] text-white/95 [text-shadow:_0_1px_0_rgba(0,0,0,0.18)]">
                  {action.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

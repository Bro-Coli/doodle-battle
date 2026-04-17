import { useEffect, useState, type CSSProperties } from 'react';
import { getActiveRoom, leaveActiveRoom } from '../../network/ColyseusClient';
import { navigate } from '../../utils/navigate';
import { cn } from '@/shared/lib/cn';
import { StrokeShadowText } from '@/ui/text/StrokeShadowText';
import { Icon } from '@/ui/icon/Icon';

interface PlayerSnapshot {
  name: string;
  team: string;
  ready: boolean;
}

interface RoomSnapshot {
  players: Map<string, PlayerSnapshot>;
  hostSessionId: string;
  maxPlayers: number;
  maxRounds: number;
}

function ReadyIcon({ ready }: { ready: boolean }): React.JSX.Element {
  if (!ready) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/30" />
    );
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]">
      <Icon name="check" size={14} strokeWidth={3} className="text-white" />
    </span>
  );
}

function PlayerCard({
  player,
  isMe,
  team,
}: {
  player: PlayerSnapshot;
  isMe: boolean;
  team: 'red' | 'blue';
}): React.JSX.Element {
  return (
    <li
      className={cn(
        'flex items-center justify-between rounded-xl px-4 py-3 transition-all',
        'border border-white/10',
        isMe
          ? 'bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
          : 'bg-white/5 hover:bg-white/10',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
            team === 'red' ? 'bg-red-500/30 text-red-300' : 'bg-blue-500/30 text-blue-300',
          )}
        >
          {player.name.charAt(0).toUpperCase()}
        </span>
        <span className={cn('truncate text-sm', isMe ? 'font-bold text-white' : 'text-white/90')}>
          {player.name}
        </span>
        {isMe && (
          <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white/70">
            you
          </span>
        )}
      </div>
      <ReadyIcon ready={player.ready} />
    </li>
  );
}

function TeamColumn({
  team,
  players,
  mySessionId,
}: {
  team: 'red' | 'blue';
  players: Array<[string, PlayerSnapshot]>;
  mySessionId: string;
}): React.JSX.Element {
  const config = {
    red: {
      label: 'Red Team',
      labelColor: 'text-red-400',
      bgGradient:
        'bg-[linear-gradient(180deg,rgba(185,28,28,0.25)_0%,rgba(127,29,29,0.2)_100%)]',
      borderColor: 'border-red-500/30',
    },
    blue: {
      label: 'Blue Team',
      labelColor: 'text-blue-400',
      bgGradient:
        'bg-[linear-gradient(180deg,rgba(37,99,235,0.25)_0%,rgba(30,58,138,0.2)_100%)]',
      borderColor: 'border-blue-500/30',
    },
  };

  const cfg = config[team];

  return (
    <div
      className={cn(
        'flex-1 rounded-2xl p-5',
        'border',
        cfg.bgGradient,
        cfg.borderColor,
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
      )}
    >
      <h2
        className={cn('mb-4 text-center text-sm font-black uppercase tracking-widest', cfg.labelColor)}
      >
        {cfg.label}
      </h2>
      <ul className="flex flex-col gap-2">
        {players.map(([sessionId, p]) => (
          <PlayerCard key={sessionId} player={p} isMe={sessionId === mySessionId} team={team} />
        ))}
        {players.length === 0 && (
          <li className="py-4 text-center text-sm text-white/30">Waiting for players...</li>
        )}
      </ul>
    </div>
  );
}

export function WaitingRoomScreen(): React.JSX.Element {
  const room = getActiveRoom();

  const [snapshot, setSnapshot] = useState<RoomSnapshot>({
    players: new Map(),
    hostSessionId: '',
    maxPlayers: 8,
    maxRounds: 5,
  });

  useEffect(() => {
    if (!room) {
      navigate('/');
      return;
    }

    const phase = (room.state as { currentPhase?: string }).currentPhase;
    if (phase && phase !== 'idle') {
      leaveActiveRoom();
      navigate('/');
      return;
    }

    function takeSnapshot(): void {
      if (!room) return;
      const state = room.state as {
        players: Map<string, { name: string; team: string; ready: boolean }>;
        hostSessionId: string;
        maxPlayers: number;
        maxRounds: number;
      };

      const players = new Map<string, PlayerSnapshot>();
      if (state.players) {
        state.players.forEach(
          (p: { name: string; team: string; ready: boolean }, sessionId: string) => {
            players.set(sessionId, {
              name: p.name,
              team: p.team,
              ready: p.ready,
            });
          },
        );
      }

      setSnapshot({
        players,
        hostSessionId: state.hostSessionId,
        maxPlayers: state.maxPlayers,
        maxRounds: state.maxRounds ?? 5,
      });
    }

    takeSnapshot();

    const stateCallback = () => {
      takeSnapshot();
    };
    room.onStateChange(stateCallback);

    const removeGameStarting = room.onMessage('game_starting', () => {
      navigate('/game');
    });

    return () => {
      room.onStateChange.remove(stateCallback);
      removeGameStarting();
    };
  }, [room]);

  if (!room) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-white"
        style={{ background: 'var(--gradient-lobby)' }}
      >
        Redirecting...
      </div>
    );
  }

  const { players, hostSessionId, maxPlayers, maxRounds } = snapshot;
  const mySessionId = room.sessionId;
  const isHost = mySessionId === hostSessionId;
  const playerCount = players.size;
  const myPlayer = players.get(mySessionId);
  const isReady = myPlayer?.ready ?? false;

  const redPlayers: Array<[string, PlayerSnapshot]> = [];
  const bluePlayers: Array<[string, PlayerSnapshot]> = [];

  players.forEach((p, sessionId) => {
    if (p.team === 'blue') {
      bluePlayers.push([sessionId, p]);
    } else {
      redPlayers.push([sessionId, p]);
    }
  });

  const readyStrokeStyle: CSSProperties & { '--stroke': string } = {
    '--stroke': '5px',
    WebkitTextStroke: 'var(--stroke) #0f6b7f',
  };

  const notReadyStrokeStyle: CSSProperties & { '--stroke': string } = {
    '--stroke': '5px',
    WebkitTextStroke: 'var(--stroke) #3d52b8',
  };

  function handleReadyToggle(): void {
    room?.send('toggle_ready');
  }

  return (
    <main
      className="flex min-h-screen w-screen flex-col items-center justify-center gap-8 px-4 py-8 text-white"
      style={{ background: 'var(--gradient-lobby)' }}
    >
      {/* Room info header */}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Room Code</p>
        <div className="mt-2 rounded-2xl border border-white/20 bg-black/20 px-8 py-3 backdrop-blur-sm">
          <p className="font-mono text-4xl font-black tracking-[0.25em] text-white">
            {room.roomId}
          </p>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-sm text-white/60">
          <span className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            {playerCount}/{maxPlayers} players
          </span>
          <span className="text-white/30">•</span>
          <span>{maxRounds} rounds</span>
        </div>
      </div>

      {/* Team columns */}
      <div className="flex w-full max-w-xl gap-4">
        <TeamColumn team="red" players={redPlayers} mySessionId={mySessionId} />
        <TeamColumn team="blue" players={bluePlayers} mySessionId={mySessionId} />
      </div>

      {/* Ready button */}
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={handleReadyToggle}
          className={cn(
            'ui-pill-button h-16 min-w-[200px] px-10',
            isReady ? 'ui-pill-button--mint' : '',
          )}
        >
          <span className="relative z-1 inline-block">
            <span
              aria-hidden
              className="t24-eb pointer-events-none absolute inset-0 text-center uppercase text-transparent"
              style={isReady ? readyStrokeStyle : notReadyStrokeStyle}
            >
              {isReady ? 'Ready!' : 'Ready Up'}
            </span>
            <span className="t24-eb relative text-center uppercase text-white">
              {isReady ? 'Ready!' : 'Ready Up'}
            </span>
          </span>
        </button>

        <p className="text-center text-sm text-white/50">
          {isHost
            ? 'Game starts automatically when all players are ready'
            : 'Waiting for all players to ready up...'}
        </p>
      </div>
    </main>
  );
}

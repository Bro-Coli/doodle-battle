import { useEffect, useState } from 'react';
import { getActiveRoom, leaveActiveRoom } from '../../network/ColyseusClient';
import { navigate } from '../../utils/navigate';

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

function CheckIcon({ ready }: { ready: boolean }): React.JSX.Element {
  if (!ready) {
    return (
      <span className="inline-block h-5 w-5 rounded-full border-2 border-white/30" />
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 text-green-400" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
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

    // Defense in depth: if a stale room is lingering in a non-idle phase
    // (e.g. a game is already in progress), treat this landing as invalid.
    // Leave the room and redirect to the main menu — the player cannot
    // meaningfully ready-up back into an active game.
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

    // Take initial snapshot
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
        style={{
          background: 'var(--gradient-lobby)',
        }}
      >
        Redirecting…
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

  function handleReadyToggle(): void {
    room?.send('toggle_ready');
  }

  return (
    <main
      className="flex min-h-screen w-screen flex-col items-center justify-center gap-6 px-4 py-8 text-white"
      style={{
        background: 'var(--gradient-lobby)',
      }}
    >
      {/* Room code + info */}
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-white/50">Room Code</p>
        <p className="mt-1 font-mono text-5xl font-black tracking-[0.2em] text-white">
          {room.roomId}
        </p>
        <div className="mt-2 flex items-center justify-center gap-4 text-sm text-white/60">
          <span>{playerCount}/{maxPlayers} players</span>
          <span className="text-white/30">•</span>
          <span>Rounds: {maxRounds}</span>
        </div>
      </div>

      {/* Team columns */}
      <div className="flex w-full max-w-lg gap-4">
        {/* Red Team */}
        <div className="flex-1 rounded-xl bg-red-900/30 p-4">
          <h2 className="mb-3 text-center text-sm font-black uppercase tracking-widest text-red-400">
            Red Team
          </h2>
          <ul className="flex flex-col gap-2">
            {redPlayers.map(([sessionId, p]) => (
              <li
                key={sessionId}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  sessionId === mySessionId ? 'bg-white/20 font-bold' : 'bg-white/5'
                }`}
              >
                <span className="truncate text-sm">{p.name}</span>
                <CheckIcon ready={p.ready} />
              </li>
            ))}
            {redPlayers.length === 0 && (
              <li className="py-2 text-center text-xs text-white/30">No players yet</li>
            )}
          </ul>
        </div>

        {/* Blue Team */}
        <div className="flex-1 rounded-xl bg-blue-900/30 p-4">
          <h2 className="mb-3 text-center text-sm font-black uppercase tracking-widest text-blue-400">
            Blue Team
          </h2>
          <ul className="flex flex-col gap-2">
            {bluePlayers.map(([sessionId, p]) => (
              <li
                key={sessionId}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  sessionId === mySessionId ? 'bg-white/20 font-bold' : 'bg-white/5'
                }`}
              >
                <span className="truncate text-sm">{p.name}</span>
                <CheckIcon ready={p.ready} />
              </li>
            ))}
            {bluePlayers.length === 0 && (
              <li className="py-2 text-center text-xs text-white/30">No players yet</li>
            )}
          </ul>
        </div>
      </div>

      {/* Actions — Ready toggle only; auto-start fires server-side when all ready */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleReadyToggle}
          className={`rounded-xl px-8 py-3 font-black uppercase tracking-wide transition active:scale-95 ${
            isReady
              ? 'bg-green-500 text-white hover:bg-green-400'
              : 'bg-white/90 text-[#1a1035] hover:bg-white'
          }`}
        >
          {isReady ? 'Ready!' : 'Ready Up'}
        </button>

        {isHost ? (
          <p className="text-xs text-white/40">
            Game starts automatically when all players are ready
          </p>
        ) : (
          <p className="text-sm text-white/50">Waiting for all players to ready up…</p>
        )}
      </div>
    </main>
  );
}

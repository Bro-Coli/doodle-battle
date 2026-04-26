import { Icon } from '@/ui/icon/Icon';

export type TeamRosterEntry = { name: string; ready: boolean };
export type TeamRoster = Array<[string, TeamRosterEntry]>;
export type TeamSide = 'blue' | 'red';

type TeamColumnProps = {
  team: TeamSide;
  label: string;
  players: TeamRoster;
  slotCount: number;
  mySessionId: string;
  hostSessionId: string;
};

export function TeamColumn({
  team,
  label,
  players,
  slotCount,
  mySessionId,
  hostSessionId,
}: TeamColumnProps): React.JSX.Element {
  const filledCount = players.length;
  const readyCount = players.filter(([sid, p]) => sid === hostSessionId || p.ready).length;
  const progressPct = slotCount === 0 ? 0 : Math.round((readyCount / slotCount) * 100);

  return (
    <div
      className={
        'ui-team-panel ' + (team === 'blue' ? 'ui-team-panel--blue' : 'ui-team-panel--red')
      }
    >
      <span className="ui-team-panel__sheen" aria-hidden />
      <div className="relative">
        <div className="ui-team-panel__header">
          <span className="inline-flex items-center gap-2 t20-eb font-nunito uppercase tracking-wider text-white">
            <span
              className={
                'ui-team-dot ' + (team === 'blue' ? 'ui-team-dot--blue' : 'ui-team-dot--red')
              }
              aria-hidden
            />
            {label}
          </span>
          <span className="ui-team-panel__count font-mono t14-b">
            <span className="text-white tabular-nums">{filledCount}</span>
            <span className="text-white/40 tabular-nums">/{slotCount}</span>
          </span>
        </div>
        <ul className="flex flex-col gap-3">
          {Array.from({ length: slotCount }).map((_, i) => {
            const entry = players[i];
            const isEntryReady = entry ? entry[0] === hostSessionId || entry[1].ready : false;
            return (
              <TeamSlot
                key={entry ? entry[0] : `${team}-empty-${i}`}
                team={team}
                playerName={entry?.[1].name}
                isMe={entry ? entry[0] === mySessionId : false}
                isReady={isEntryReady}
              />
            );
          })}
        </ul>
        <div className="ui-team-panel__footer">
          <div className="ui-team-panel__progress" aria-hidden>
            <div
              className={
                'ui-team-panel__progress-fill ' +
                (team === 'blue'
                  ? 'ui-team-panel__progress-fill--blue'
                  : 'ui-team-panel__progress-fill--red')
              }
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="t12-b font-nunito uppercase tracking-[0.18em] text-white/55 tabular-nums">
            {readyCount}/{slotCount} ready
          </span>
        </div>
      </div>
    </div>
  );
}

function TeamSlot({
  team,
  playerName,
  isMe,
  isReady,
}: {
  team: TeamSide;
  playerName?: string;
  isMe: boolean;
  isReady?: boolean;
}): React.JSX.Element {
  if (!playerName) {
    return (
      <li
        className={
          'ui-team-slot ui-team-slot--lg ui-team-slot--empty font-nunito ' +
          (team === 'blue' ? 'ui-team-slot--empty-blue' : 'ui-team-slot--empty-red')
        }
      >
        <span className="relative z-2">Waiting...</span>
      </li>
    );
  }

  const slotClass =
    'ui-team-slot ui-team-slot--lg font-nunito ' +
    (team === 'blue' ? 'ui-team-slot--filled' : 'ui-team-slot--filled-red');

  return (
    <li className={slotClass}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isMe && (
          <span
            className="shrink-0 rounded-md px-1.5 py-0.5 font-black text-[0.72rem] tracking-[0.14em] uppercase"
            style={{
              background: 'linear-gradient(180deg, #FFE788 0%, #FFC93C 55%, #E08A00 100%)',
              color: '#4A2A00',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.65), 0 1px 0 rgba(80,44,0,0.5), 0 0 10px rgba(255,200,60,0.45)',
            }}
          >
            You
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate t16-b text-white">{playerName}</span>
        </div>
      </div>
      {isReady && (
        <Icon
          name="check"
          size={32}
          color="#34d399"
          className="shrink-0 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]"
          decorative
        />
      )}
    </li>
  );
}

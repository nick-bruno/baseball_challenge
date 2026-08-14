"use client";

import { formatClockPrecise, formatElapsed, type LeaderboardRow } from "@/lib/scoring";

type Props = {
  /** Already ordered by finish time — earliest first. */
  rows: LeaderboardRow[];
  meId: string | null;
  /** Room creation time, used for the elapsed column. */
  startedAt: string;
};

const MEDALS = ["🥇", "🥈", "🥉"];

const GRID =
  "grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2 " +
  "sm:grid-cols-[1.75rem_minmax(0,1fr)_auto_auto] sm:gap-4 " +
  "lg:grid-cols-[2.25rem_minmax(0,1fr)_auto_auto] lg:gap-5";

/**
 * The honour roll. Ranked by when each player got to 9 and 9, which is the
 * order that actually settles who won — the main scoreboard ranks by total, so
 * two finished players tie there at 18.
 */
export function Finishers({ rows, meId, startedAt }: Props) {
  if (rows.length === 0) return null;

  return (
    <section className="panel overflow-hidden rounded-xl border-beer/30">
      <header className="flex items-center justify-between border-b border-field-edge px-4 py-2.5 lg:px-5 lg:py-3.5">
        <h2 className="font-display text-[0.7rem] uppercase tracking-sign text-beer lg:text-[0.95rem]">
          🏆 Finishers
        </h2>
        <span className="font-score text-[0.62rem] uppercase tracking-sign text-cream-dim lg:text-[0.7rem]">
          {rows.length} went 9 &amp; 9
        </span>
      </header>

      <div className={`${GRID} border-b border-field-edge/60 bg-field-deep/25 px-4 py-2 lg:px-5`}>
        <span />
        <span className="font-display text-[0.55rem] uppercase tracking-sign text-cream-dim lg:text-[0.62rem]">
          Player
        </span>
        <span className="text-right font-display text-[0.55rem] uppercase tracking-sign text-cream-dim lg:text-[0.62rem]">
          Finished
        </span>
        <span className="hidden text-right font-display text-[0.55rem] uppercase tracking-sign text-cream-dim sm:block lg:text-[0.62rem]">
          Elapsed
        </span>
      </div>

      <ol>
        {rows.map((row, i) => {
          const isMe = row.participant.id === meId;
          return (
            <li
              key={row.participant.id}
              className={`${GRID} border-b border-field-edge/45 px-4 py-2.5 last:border-b-0 lg:px-5 lg:py-3 ${
                isMe ? "bg-beer/[0.08]" : ""
              }`}
            >
              <span className="tabular grid h-7 w-7 place-items-center rounded-full bg-cream/10 font-score text-xs font-bold text-cream lg:h-9 lg:w-9 lg:text-sm">
                {MEDALS[i] ?? i + 1}
              </span>

              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className={`truncate font-score text-[0.95rem] font-medium lg:text-lg ${
                    isMe ? "text-chalk" : "text-cream"
                  }`}
                >
                  {row.participant.display_name}
                </span>
                {isMe && (
                  <span className="shrink-0 rounded-sm bg-cream/15 px-1 text-[0.55rem] font-bold uppercase tracking-sign text-cream-dim">
                    You
                  </span>
                )}
              </span>

              <span className="tabular text-right font-score text-sm whitespace-nowrap text-beer lg:text-base">
                {formatClockPrecise(row.finishedAt!)}
              </span>

              <span className="tabular hidden text-right font-score text-sm whitespace-nowrap text-cream-dim sm:block lg:text-base">
                {formatElapsed(startedAt, row.finishedAt!)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

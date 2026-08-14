"use client";

import { ITEM_EMOJI, TARGET } from "@/lib/types";
import type { LeaderboardRow } from "@/lib/scoring";

type Props = {
  rows: LeaderboardRow[];
  meId: string | null;
  hostId: string | null;
};

/*
  Column grid shared by the header and every row so the numbers line up:
  rank | player | hot dogs | beers | total
*/
const GRID =
  "grid grid-cols-[1.75rem_minmax(0,1fr)_2.25rem_2.25rem_2.75rem] items-center gap-2 " +
  "lg:grid-cols-[2.25rem_minmax(0,1fr)_3.5rem_3.5rem_4.5rem] lg:gap-3";

/** Everyone's line on the scoreboard, ranked by total damage done. */
export function Leaderboard({ rows, meId, hostId }: Props) {
  return (
    <section className="panel overflow-hidden rounded-xl">
      <header className="flex items-center justify-between border-b border-field-edge px-4 py-2.5 lg:px-5 lg:py-3.5">
        <h2 className="font-display text-[0.7rem] uppercase tracking-sign text-cream lg:text-[0.95rem]">
          The Scoreboard
        </h2>
        <span className="font-score text-[0.62rem] uppercase tracking-sign text-cream-dim lg:text-[0.7rem]">
          {rows.length} {rows.length === 1 ? "player" : "players"}
        </span>
      </header>

      {/* Column headings */}
      <div
        className={`${GRID} border-b border-field-edge/60 bg-field-deep/25 px-4 py-2 lg:px-5`}
      >
        <span />
        <span className="font-display text-[0.55rem] uppercase tracking-sign text-cream-dim lg:text-[0.62rem]">
          Player
        </span>
        <span className="text-center text-sm lg:text-base" title="Hot dogs">
          {ITEM_EMOJI.hotdog}
          <span className="sr-only">Hot dogs</span>
        </span>
        <span className="text-center text-sm lg:text-base" title="Beers">
          {ITEM_EMOJI.beer}
          <span className="sr-only">Beers</span>
        </span>
        <span className="text-right font-display text-[0.55rem] uppercase tracking-sign text-cream-dim lg:text-[0.62rem]">
          Total
        </span>
      </div>

      <ul>
        {rows.map((row) => {
          const isMe = row.participant.id === meId;
          return (
            <li
              key={row.participant.id}
              className={`${GRID} border-b border-field-edge/45 px-4 py-2.5 last:border-b-0 lg:px-5 lg:py-3.5 ${
                isMe ? "bg-cream/[0.06]" : ""
              }`}
            >
              <span
                className={`tabular grid h-7 w-7 place-items-center rounded-full font-score text-xs font-bold lg:h-9 lg:w-9 lg:text-sm ${
                  row.done
                    ? "bg-beer text-field-deep"
                    : row.rank === 1
                      ? "bg-cream text-field-deep"
                      : "bg-cream/10 text-cream-dim"
                }`}
              >
                {row.done ? "★" : row.rank}
              </span>

              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`truncate font-score text-[0.95rem] font-medium lg:text-xl ${
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
                  {row.participant.id === hostId && (
                    <span className="shrink-0 text-[0.6rem] text-cream-dim" title="Host">
                      ⚾
                    </span>
                  )}
                </span>
                {/* Eighteen slats: nine hot dogs, then nine beers. */}
                <span className="mt-1 flex gap-0.5 lg:mt-1.5" aria-hidden>
                  {Array.from({ length: TARGET * 2 }, (_, i) => {
                    const isDog = i < TARGET;
                    const filled = isDog
                      ? i < row.tally.hotdog
                      : i - TARGET < row.tally.beer;
                    return (
                      <span
                        key={i}
                        className="h-1.5 flex-1 rounded-[1px] lg:h-2"
                        style={{
                          background: filled
                            ? isDog
                              ? "var(--mustard)"
                              : "var(--beer)"
                            : "rgba(255,253,246,0.1)",
                        }}
                      />
                    );
                  })}
                </span>
              </span>

              <span className="tabular text-center font-score text-base font-medium text-cream lg:text-2xl">
                {row.tally.hotdog}
              </span>
              <span className="tabular text-center font-score text-base font-medium text-cream lg:text-2xl">
                {row.tally.beer}
              </span>
              <span
                className={`tabular text-right font-score text-xl font-semibold lg:text-4xl ${
                  row.done ? "text-beer" : "text-chalk"
                }`}
              >
                {row.total}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

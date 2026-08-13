"use client";

import { ITEM_EMOJI, TARGET } from "@/lib/types";
import type { LeaderboardRow } from "@/lib/scoring";

type Props = {
  rows: LeaderboardRow[];
  meId: string | null;
  hostId: string | null;
};

/** Everyone's line on the scoreboard, sorted by damage done. */
export function Leaderboard({ rows, meId, hostId }: Props) {
  return (
    <section className="panel overflow-hidden rounded-xl">
      <header className="flex items-center justify-between border-b border-field-edge px-4 py-2.5">
        <h2 className="font-display text-[0.7rem] uppercase tracking-sign text-cream">
          The Scoreboard
        </h2>
        <span className="font-score text-[0.62rem] uppercase tracking-sign text-cream-dim">
          {rows.length} {rows.length === 1 ? "player" : "players"}
        </span>
      </header>

      <ul>
        {rows.map((row) => {
          const isMe = row.participant.id === meId;
          return (
            <li
              key={row.participant.id}
              className={`flex items-center gap-3 border-b border-field-edge/45 px-4 py-2.5 last:border-b-0 ${
                isMe ? "bg-cream/[0.06]" : ""
              }`}
            >
              <span
                className={`tabular grid h-7 w-7 shrink-0 place-items-center rounded-full font-score text-xs font-bold ${
                  row.done
                    ? "bg-beer text-field-deep"
                    : row.rank === 1
                      ? "bg-cream text-field-deep"
                      : "bg-cream/10 text-cream-dim"
                }`}
              >
                {row.done ? "★" : row.rank}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`truncate font-score text-[0.95rem] font-medium ${
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
                <span className="mt-1 flex gap-0.5" aria-hidden>
                  {Array.from({ length: TARGET * 2 }, (_, i) => {
                    const isBeer = i < TARGET;
                    const filled = isBeer
                      ? i < row.tally.beer
                      : i - TARGET < row.tally.hotdog;
                    return (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-[1px] ${isBeer ? "" : "opacity-95"}`}
                        style={{
                          background: filled
                            ? isBeer
                              ? "var(--beer)"
                              : "var(--mustard)"
                            : "rgba(255,253,246,0.1)",
                        }}
                      />
                    );
                  })}
                </span>
              </span>

              <span className="tabular flex shrink-0 items-center gap-2.5 font-score text-sm">
                <span className="flex items-center gap-1 text-cream">
                  <span className="text-[0.7rem]" aria-hidden>
                    {ITEM_EMOJI.beer}
                  </span>
                  {row.tally.beer}
                </span>
                <span className="flex items-center gap-1 text-cream">
                  <span className="text-[0.7rem]" aria-hidden>
                    {ITEM_EMOJI.hotdog}
                  </span>
                  {row.tally.hotdog}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

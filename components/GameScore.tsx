"use client";

import { describeGame } from "@/lib/mlb";
import type { Room } from "@/lib/types";

/** Abbreviate to fit a phone: "Washington Nationals" -> "Nationals". */
function shortName(name: string | null): string {
  if (!name) return "—";
  const parts = name.split(" ");
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

/**
 * The real game's line, mirrored from whatever the host last polled. Everyone
 * sees the same thing because it lives on the room row, not in each client.
 */
export function GameScore({ room }: { room: Room }) {
  if (!room.mlb_game_pk) return null;

  const live = room.mlb_status
    ? !/final|postponed|suspended|cancelled/i.test(room.mlb_status)
    : false;
  const isLive = live && room.mlb_inning != null;

  const label = describeGame({
    status: room.mlb_status ?? "Scheduled",
    abstractState: isLive ? "Live" : /final/i.test(room.mlb_status ?? "") ? "Final" : "Preview",
    inning: room.mlb_inning,
    inningState: room.mlb_inning_state,
  });

  const rows = [
    { team: room.mlb_away_team, score: room.mlb_away_score },
    { team: room.mlb_home_team, score: room.mlb_home_score },
  ];
  const leader =
    room.mlb_away_score != null && room.mlb_home_score != null
      ? room.mlb_away_score === room.mlb_home_score
        ? -1
        : room.mlb_away_score > room.mlb_home_score
          ? 0
          : 1
      : -1;

  return (
    <section className="panel flex items-center gap-4 rounded-xl px-4 py-2.5">
      <div className="min-w-0 flex-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3">
            <span
              className={`truncate font-score text-sm ${
                leader === i ? "font-semibold text-chalk" : "text-cream"
              }`}
            >
              {shortName(r.team)}
            </span>
            <span
              className={`tabular font-score text-lg leading-tight ${
                leader === i ? "font-semibold text-chalk" : "text-cream-dim"
              }`}
            >
              {r.score ?? "–"}
            </span>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-l border-field-edge pl-4 text-right">
        <p className="flex items-center justify-end gap-1.5 font-display text-[0.6rem] uppercase tracking-sign text-cream-dim">
          {isLive && <span className="h-1.5 w-1.5 rounded-full bg-stitch blink" />}
          {isLive ? "Live" : "MLB"}
        </p>
        <p className="mt-0.5 font-score text-sm font-medium whitespace-nowrap text-cream">
          {label}
        </p>
      </div>
    </section>
  );
}

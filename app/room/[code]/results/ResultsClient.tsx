"use client";

import { useMemo } from "react";
import Link from "next/link";
import { StatusScreen } from "@/components/StatusScreen";
import { Wordmark } from "@/components/Wordmark";
import {
  buildLeaderboard,
  formatClock,
  formatElapsed,
  type LeaderboardRow,
} from "@/lib/scoring";
import { ITEMS, ITEM_EMOJI, TARGET } from "@/lib/types";
import { useRoom } from "@/lib/useRoom";

const MEDALS = ["🥇", "🥈", "🥉"];

export function ResultsClient({ code }: { code: string }) {
  const { status, error, room, participants, events, me } = useRoom(code);

  const rows = useMemo(
    () => buildLeaderboard(participants, events),
    [participants, events],
  );

  if (status === "loading") {
    return <StatusScreen title="Tallying…" body="Adding up the damage." showHomeLink={false} />;
  }
  if (status === "notfound") {
    return (
      <StatusScreen
        title="No such room"
        body={`Nothing is running under the code "${code.toUpperCase()}".`}
      />
    );
  }
  if (status === "error" || !room) {
    return <StatusScreen title="Rain delay" body={error ?? "Could not load the results."} />;
  }

  const finished = room.status === "finished";
  const endedAt = room.finished_at;
  const finishers = rows.filter((r) => r.done).length;
  const totalBeers = rows.reduce((n, r) => n + r.tally.beer, 0);
  const totalDogs = rows.reduce((n, r) => n + r.tally.hotdog, 0);

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-6 pb-12">
      <div className="rise mb-5">
        <Wordmark compact />
        <p className="mt-3 text-center font-display text-[0.68rem] uppercase tracking-sign text-beer">
          {finished ? "Final Card" : "Live Standings"}
        </p>
        {room.name && (
          <p className="mt-1 text-center font-score text-base text-cream">{room.name}</p>
        )}
        <p className="mt-0.5 text-center font-score text-[0.68rem] uppercase tracking-sign text-cream-dim">
          Room {room.code}
          {endedAt ? ` · called at ${formatClock(endedAt)}` : ""}
        </p>
      </div>

      {/* ---- the box score ---- */}
      <section className="rise panel mb-3 overflow-hidden rounded-2xl" style={{ animationDelay: "70ms" }}>
        {rows.map((row) => (
          <ResultRow
            key={row.participant.id}
            row={row}
            isMe={row.participant.id === me?.id}
            roomStart={room.created_at}
          />
        ))}
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center font-score text-sm text-cream-dim">
            Nobody ever joined this one.
          </p>
        )}
      </section>

      {/* ---- room totals ---- */}
      <section
        className="rise panel mb-4 grid grid-cols-3 divide-x divide-field-edge rounded-2xl"
        style={{ animationDelay: "140ms" }}
      >
        <Stat label="Beers" value={totalBeers} emoji={ITEM_EMOJI.beer} />
        <Stat label="Hot Dogs" value={totalDogs} emoji={ITEM_EMOJI.hotdog} />
        <Stat label="Finished" value={finishers} emoji="🏆" />
      </section>

      <div className="rise flex gap-2" style={{ animationDelay: "210ms" }}>
        <Link
          href={`/room/${room.code}`}
          className="flex-1 rounded-lg border border-cream/25 py-3 text-center font-display text-[0.65rem] uppercase tracking-sign text-cream"
        >
          Back to the room
        </Link>
        <Link
          href="/"
          className="flex-1 rounded-lg bg-beer py-3 text-center font-display text-[0.65rem] uppercase tracking-sign text-field-deep"
        >
          New competition
        </Link>
      </div>

      <p className="mt-6 text-center font-score text-[0.68rem] text-cream-dim">
        Screenshot this before anyone disputes the count.
      </p>
    </main>
  );
}

function ResultRow({
  row,
  isMe,
  roomStart,
}: {
  row: LeaderboardRow;
  isMe: boolean;
  roomStart: string;
}) {
  const medal = row.rank <= 3 ? MEDALS[row.rank - 1] : null;

  return (
    <div
      className={`border-b border-field-edge/50 px-4 py-3.5 last:border-b-0 ${
        isMe ? "bg-cream/[0.06]" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="tabular grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream/10 font-score text-sm font-bold text-cream">
          {medal ?? row.rank}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-score text-base font-medium text-chalk">
            {row.participant.display_name}
            {isMe && (
              <span className="ml-1.5 rounded-sm bg-cream/15 px-1 text-[0.55rem] font-bold uppercase tracking-sign text-cream-dim">
                You
              </span>
            )}
          </p>
          <p className="font-score text-[0.68rem] uppercase tracking-sign text-cream-dim">
            {row.done ? (
              <span className="text-grass">
                Completed in {formatElapsed(roomStart, row.finishedAt!)}
              </span>
            ) : (
              `${row.total} of ${TARGET * 2}`
            )}
          </p>
        </div>

        <div className="flex shrink-0 gap-3">
          {ITEMS.map((item) => (
            <div key={item} className="text-center">
              <p className="tabular font-score text-xl font-semibold leading-none text-cream">
                {row.tally[item]}
              </p>
              <p className="mt-0.5 text-[0.65rem] leading-none" aria-hidden>
                {ITEM_EMOJI[item]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2.5 flex gap-0.5" aria-hidden>
        {ITEMS.flatMap((item) =>
          Array.from({ length: TARGET }, (_, i) => (
            <span
              key={`${item}-${i}`}
              className="h-1.5 flex-1 rounded-[1px]"
              style={{
                background:
                  i < row.tally[item]
                    ? item === "beer"
                      ? "var(--beer)"
                      : "var(--mustard)"
                    : "rgba(255,253,246,0.1)",
              }}
            />
          )),
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="px-2 py-4 text-center">
      <p className="text-base leading-none" aria-hidden>
        {emoji}
      </p>
      <p className="tabular mt-1.5 font-score text-2xl font-semibold leading-none text-chalk">
        {value}
      </p>
      <p className="mt-1 font-display text-[0.55rem] uppercase tracking-sign text-cream-dim">
        {label}
      </p>
    </div>
  );
}

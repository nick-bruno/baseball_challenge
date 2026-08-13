"use client";

import { feedText, formatClock, inningLabel, type FeedEntry } from "@/lib/scoring";
import { ITEM_EMOJI } from "@/lib/types";

type Props = { entries: FeedEntry[] };

/** The play-by-play. Half the fun of the challenge is watching it happen. */
export function ActivityFeed({ entries }: Props) {
  return (
    <section className="panel overflow-hidden rounded-xl">
      <header className="border-b border-field-edge px-4 py-2.5">
        <h2 className="font-display text-[0.7rem] uppercase tracking-sign text-cream">
          Play by Play
        </h2>
      </header>

      {entries.length === 0 ? (
        <p className="px-4 py-6 text-center font-score text-sm text-cream-dim">
          Nothing yet. Somebody get to the concession stand.
        </p>
      ) : (
        <ul className="max-h-72 overflow-y-auto">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 border-b border-field-edge/45 px-4 py-2 last:border-b-0"
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm ${
                  entry.delta === -1 ? "bg-cream/5 opacity-45" : "bg-cream/10"
                }`}
                aria-hidden
              >
                {ITEM_EMOJI[entry.item]}
              </span>
              <p
                className={`min-w-0 flex-1 font-score text-[0.85rem] leading-snug ${
                  entry.delta === -1 ? "text-cream-dim line-through decoration-1" : "text-cream"
                }`}
              >
                {feedText(entry)}
              </p>
              <span className="tabular shrink-0 text-right font-score text-[0.6rem] uppercase leading-tight text-cream-dim">
                {inningLabel(entry.inning)}
                <br />
                {formatClock(entry.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

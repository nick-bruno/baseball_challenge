"use client";

import { INNINGS } from "@/lib/types";

type Props = {
  inning: number;
  isHost: boolean;
  finished: boolean;
  onChange: (inning: number) => void;
};

/** The scoreboard's inning strip. Only the host moves the game along. */
export function InningBar({ inning, isHost, finished, onChange }: Props) {
  return (
    <div className="panel rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-3">
        {isHost && !finished && (
          <button
            type="button"
            onClick={() => onChange(inning - 1)}
            disabled={inning <= 1}
            aria-label="Previous inning"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cream/20 text-cream-dim transition active:scale-90 disabled:opacity-25"
          >
            ◀
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-display text-[0.62rem] uppercase tracking-sign text-cream-dim">
              {finished ? "Final" : "Inning"}
            </span>
            <span className="tabular font-score text-sm font-semibold text-cream">
              {inning}
              <span className="text-cream-dim">/{INNINGS}</span>
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: INNINGS }, (_, i) => {
              const n = i + 1;
              const played = n < inning;
              const current = n === inning;
              return (
                <div
                  key={n}
                  className={`tabular grid h-6 flex-1 place-items-center rounded-[3px] text-[0.6rem] font-semibold transition-colors ${
                    current
                      ? "bg-cream text-field-deep"
                      : played
                        ? "bg-cream/25 text-cream"
                        : "bg-cream/[0.07] text-cream-dim"
                  } ${current && !finished ? "blink" : ""}`}
                >
                  {n}
                </div>
              );
            })}
          </div>
        </div>

        {isHost && !finished && (
          <button
            type="button"
            onClick={() => onChange(inning + 1)}
            disabled={inning >= INNINGS}
            aria-label="Next inning"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-beer/40 bg-beer/15 text-beer transition active:scale-90 disabled:opacity-25"
          >
            ▶
          </button>
        )}
      </div>
    </div>
  );
}

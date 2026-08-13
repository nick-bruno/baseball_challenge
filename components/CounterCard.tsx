"use client";

import { useEffect, useRef, useState } from "react";
import { ITEM_EMOJI, ITEM_LABEL, TARGET, type Item } from "@/lib/types";
import type { Pace } from "@/lib/scoring";

const ACCENT: Record<Item, string> = {
  beer: "var(--beer)",
  hotdog: "var(--mustard)",
};

const TONE_CLASS: Record<Pace["tone"], string> = {
  ahead: "text-grass border-grass/40 bg-grass/10",
  onpace: "text-cream border-cream/30 bg-cream/5",
  behind: "text-stitch border-stitch/40 bg-stitch/10",
  done: "text-field-deep border-transparent",
};

type Props = {
  item: Item;
  count: number;
  pace: Pace;
  disabled?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
};

/**
 * The whole card is the +1 target — roughly a third of the viewport, hittable
 * with a thumb without looking. Undo is deliberately small and tucked into the
 * corner so it can't be hit by accident mid-celebration.
 */
export function CounterCard({
  item,
  count,
  pace,
  disabled = false,
  onIncrement,
  onDecrement,
}: Props) {
  const accent = ACCENT[item];
  const complete = count >= TARGET;
  const [stamping, setStamping] = useState(false);
  const prev = useRef(count);

  useEffect(() => {
    if (count !== prev.current) {
      prev.current = count;
      setStamping(true);
      const t = setTimeout(() => setStamping(false), 300);
      return () => clearTimeout(t);
    }
  }, [count]);

  const tap = () => {
    if (disabled || complete) return;
    navigator.vibrate?.(12);
    onIncrement();
  };

  const untap = () => {
    if (disabled || count <= 0) return;
    navigator.vibrate?.(8);
    onDecrement();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={tap}
        disabled={disabled || complete}
        aria-label={`Add one ${item}. Currently ${count} of ${TARGET}.`}
        className={`panel relative flex min-h-[11.5rem] w-full flex-col justify-between overflow-hidden rounded-2xl px-5 pt-4 pb-5 text-left transition active:brightness-110 disabled:active:brightness-100 ${
          stamping ? "stamping" : ""
        }`}
        style={
          complete
            ? {
                background: `linear-gradient(180deg, ${accent} 0%, color-mix(in srgb, ${accent} 78%, #000) 100%)`,
                borderColor: accent,
              }
            : undefined
        }
      >
        {/* Fill gauge: the card itself is the progress bar. */}
        {!complete && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 transition-[height] duration-500 ease-out"
            style={{
              height: `${(count / TARGET) * 100}%`,
              background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 22%, transparent) 0%, color-mix(in srgb, ${accent} 9%, transparent) 100%)`,
            }}
          />
        )}

        {/* Header row. Right padding keeps clear of the undo button. */}
        <span className="relative flex flex-col gap-1.5 pr-14">
          <span className="flex items-center gap-2">
            <span className="text-2xl leading-none" aria-hidden>
              {ITEM_EMOJI[item]}
            </span>
            <span
              className={`font-display text-[0.95rem] leading-none painted ${
                complete ? "text-field-deep" : "text-cream"
              }`}
            >
              {ITEM_LABEL[item]}
            </span>
          </span>
          <span
            className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-sign ${
              TONE_CLASS[complete ? "done" : pace.tone]
            }`}
            style={complete ? { background: "rgba(0,0,0,0.16)" } : undefined}
          >
            {pace.label}
          </span>
        </span>

        <span className="relative mt-2 flex items-baseline justify-end gap-1 pr-0.5">
          <span
            key={count}
            className={`flip tabular font-score text-[4.75rem] font-semibold leading-[0.78] painted ${
              complete ? "text-field-deep" : "text-chalk"
            }`}
            style={!complete && count > 0 ? { color: accent } : undefined}
          >
            {count}
          </span>
          <span
            className={`font-score text-2xl font-light leading-none ${
              complete ? "text-field-deep/60" : "text-cream-dim"
            }`}
          >
            /{TARGET}
          </span>
        </span>

        {/* Nine slats, like the inning panels on the scoreboard. */}
        <span className="relative mt-3.5 flex gap-1.5" aria-hidden>
          {Array.from({ length: TARGET }, (_, i) => {
            const filled = i < count;
            return (
              <span
                key={i}
                className={`h-2.5 flex-1 rounded-[2px] transition-colors duration-300 ${
                  filled && i === count - 1 ? "pip-pop" : ""
                }`}
                style={{
                  background: filled
                    ? complete
                      ? "rgba(7,21,16,0.75)"
                      : accent
                    : "rgba(255,253,246,0.13)",
                }}
              />
            );
          })}
        </span>
      </button>

      <button
        type="button"
        onClick={untap}
        disabled={disabled || count <= 0}
        aria-label={`Remove one ${item}`}
        className={`absolute top-3 right-3 z-10 grid h-11 w-11 place-items-center rounded-full border text-xl leading-none transition active:scale-90 disabled:opacity-25 ${
          complete
            ? "border-field-deep/25 bg-field-deep/15 text-field-deep"
            : "border-cream/20 bg-field-deep/50 text-cream-dim"
        }`}
      >
        −
      </button>
    </div>
  );
}

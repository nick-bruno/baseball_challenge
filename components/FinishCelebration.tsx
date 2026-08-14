"use client";

import { useEffect } from "react";
import { Fireworks } from "./Fireworks";
import { TARGET } from "@/lib/types";

type Props = {
  name: string;
  isMe: boolean;
  onDismiss: () => void;
};

const DURATION = 6500;

/**
 * The payoff. Fires for anyone who completes 9 and 9, on every screen in the
 * room — the whole point of watching together is seeing someone finish.
 */
export function FinishCelebration({ name, isMe, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, DURATION);
    return () => clearTimeout(t);
  }, [onDismiss]);

  useEffect(() => {
    navigator.vibrate?.([60, 40, 60, 40, 120]);
  }, []);

  return (
    <div
      role="dialog"
      aria-live="assertive"
      aria-label={`${isMe ? "You" : name} finished the challenge`}
      onClick={onDismiss}
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-field-deep/88 backdrop-blur-[2px]"
    >
      <Fireworks durationMs={DURATION - 800} />

      <div className="pop relative z-10 px-6 text-center">
        <p className="text-6xl leading-none" aria-hidden>
          🏆
        </p>

        <h2 className="mt-4 font-display text-[2.6rem] leading-[0.95] text-cream painted sm:text-6xl">
          <span className="text-beer">9</span>
          <span className="text-cream-dim">&nbsp;and&nbsp;</span>
          <span className="text-mustard">9</span>
        </h2>

        <p className="mt-4 font-score text-2xl font-medium text-chalk sm:text-3xl">
          {isMe ? "You did the whole thing." : `${name} went the distance.`}
        </p>

        <p className="mt-2 font-score text-sm uppercase tracking-sign text-cream-dim">
          {TARGET} beers · {TARGET} hot dogs · {TARGET} innings
        </p>

        {isMe && (
          <p className="mt-6 font-score text-[0.8rem] leading-relaxed text-cream-dim">
            Now drink some water and enjoy the rest of the game.
          </p>
        )}

        <p className="mt-8 font-score text-[0.65rem] uppercase tracking-sign text-cream-dim/70">
          Tap to dismiss
        </p>
      </div>
    </div>
  );
}

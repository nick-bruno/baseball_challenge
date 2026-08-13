"use client";

import { useState } from "react";
import { Wordmark } from "./Wordmark";
import type { Room } from "@/lib/types";

type Props = {
  room: Room;
  playerCount: number;
  error: string | null;
  onJoin: (name: string) => Promise<boolean>;
};

export function JoinGate({ room, playerCount, error, onJoin }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const ok = await onJoin(trimmed);
    if (!ok) setBusy(false);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-7 px-5 py-10">
      <div className="rise">
        <Wordmark />
      </div>

      <form onSubmit={submit} className="rise panel rounded-2xl p-5" style={{ animationDelay: "80ms" }}>
        {room.name && (
          <p className="mb-1 text-center font-score text-lg font-medium text-chalk">
            {room.name}
          </p>
        )}
        <p className="mb-5 text-center font-score text-[0.7rem] uppercase tracking-sign text-cream-dim">
          Room {room.code} · {playerCount} {playerCount === 1 ? "player" : "players"} in
        </p>

        <label
          htmlFor="name"
          className="mb-2 block font-display text-[0.62rem] uppercase tracking-sign text-cream-dim"
        >
          What should we call you?
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          autoComplete="given-name"
          autoFocus
          placeholder="Your name"
          className="w-full rounded-lg border border-cream/20 bg-field-deep/60 px-4 py-3.5 font-score text-lg text-chalk outline-none transition placeholder:text-cream-dim/45 focus:border-beer"
        />

        {error && (
          <p className="mt-3 font-score text-sm text-stitch">{error}</p>
        )}

        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="mt-4 w-full rounded-lg bg-beer px-4 py-4 font-display text-sm uppercase tracking-sign text-field-deep transition active:scale-[0.98] disabled:opacity-35"
        >
          {busy ? "Taking the field…" : "Step up to the plate"}
        </button>
      </form>

      <p
        className="rise text-center font-score text-[0.7rem] leading-relaxed text-cream-dim"
        style={{ animationDelay: "160ms" }}
      >
        Pace yourself. Nine beers in three hours is a lot of beer —
        <br />
        water between innings is free and so is a cab.
      </p>
    </main>
  );
}

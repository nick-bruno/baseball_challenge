"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { ensureAnonSession, supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [gameLabel, setGameLabel] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await ensureAnonSession();
      const { data, error } = await supabase.rpc("create_room", {
        p_name: gameLabel.trim() || null,
        p_display_name: trimmed,
      });
      if (error) throw new Error(error.message);
      router.push(`/room/${data as string}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the competition.");
      setBusy(false);
    }
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    router.push(`/room/${code}`);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-7 px-5 py-12">
      <div className="rise">
        <Wordmark />
      </div>

      <form
        onSubmit={create}
        className="rise panel rounded-2xl p-5"
        style={{ animationDelay: "90ms" }}
      >
        <h2 className="mb-4 font-display text-[0.7rem] uppercase tracking-sign text-cream">
          Start a Competition
        </h2>

        <label
          htmlFor="host-name"
          className="mb-2 block font-display text-[0.6rem] uppercase tracking-sign text-cream-dim"
        >
          Your name
        </label>
        <input
          id="host-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Nick"
          autoComplete="given-name"
          className="mb-4 w-full rounded-lg border border-cream/20 bg-field-deep/60 px-4 py-3.5 font-score text-lg text-chalk outline-none transition placeholder:text-cream-dim/45 focus:border-beer"
        />

        <label
          htmlFor="game-label"
          className="mb-2 block font-display text-[0.6rem] uppercase tracking-sign text-cream-dim"
        >
          Game <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="game-label"
          value={gameLabel}
          onChange={(e) => setGameLabel(e.target.value)}
          maxLength={60}
          placeholder="Nats vs. Braves, Sec. 214"
          className="w-full rounded-lg border border-cream/20 bg-field-deep/60 px-4 py-3 font-score text-base text-chalk outline-none transition placeholder:text-cream-dim/45 focus:border-beer"
        />

        {error && <p className="mt-3 font-score text-sm text-stitch">{error}</p>}

        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="mt-5 w-full rounded-lg bg-beer px-4 py-4 font-display text-sm uppercase tracking-sign text-field-deep transition active:scale-[0.98] disabled:opacity-35"
        >
          {busy ? "Chalking the lines…" : "Play Ball"}
        </button>
      </form>

      <form
        onSubmit={join}
        className="rise panel flex items-end gap-3 rounded-2xl p-5"
        style={{ animationDelay: "170ms" }}
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="join-code"
            className="mb-2 block font-display text-[0.6rem] uppercase tracking-sign text-cream-dim"
          >
            Or join with a code
          </label>
          <input
            id="join-code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-cream/20 bg-field-deep/60 px-4 py-3 font-score text-lg tracking-[0.2em] text-chalk outline-none transition placeholder:tracking-[0.2em] placeholder:text-cream-dim/45 focus:border-beer"
          />
        </div>
        <button
          type="submit"
          disabled={joinCode.trim().length < 4}
          className="h-[46px] shrink-0 rounded-lg border border-cream/25 px-5 font-display text-[0.7rem] uppercase tracking-sign text-cream transition active:scale-95 disabled:opacity-30"
        >
          Join
        </button>
      </form>

      <p
        className="rise text-center font-score text-[0.7rem] leading-relaxed text-cream-dim"
        style={{ animationDelay: "250ms" }}
      >
        Nine beers over nine innings is roughly a drink every twenty minutes.
        <br />
        Know your limit, drink water, and don&apos;t drive home.
      </p>
    </main>
  );
}

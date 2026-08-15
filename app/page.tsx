"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { ensureAnonSession, supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joining = joinCode.trim().length > 0;

  /**
   * One form, two outcomes: a code joins that room, blank starts a new one.
   * Joining happens here rather than on the room page so nobody types their
   * name twice.
   */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = name.trim();
    const code = joinCode.trim().toUpperCase();
    if (!displayName || busy) return;

    setBusy(true);
    setError(null);
    try {
      await ensureAnonSession();

      if (code) {
        const { error } = await supabase.rpc("join_room", {
          p_code: code,
          p_display_name: displayName,
        });
        if (error) throw new Error(error.message);
        router.push(`/room/${code}`);
      } else {
        const { data, error } = await supabase.rpc("create_room", {
          p_name: null,
          p_display_name: displayName,
        });
        if (error) throw new Error(error.message);
        router.push(`/room/${data as string}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-7 px-5 py-12">
      <div className="rise">
        <Wordmark />
      </div>

      <form
        onSubmit={submit}
        className="rise panel rounded-2xl p-5"
        style={{ animationDelay: "90ms" }}
      >
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
          autoFocus
          className="mb-5 w-full rounded-lg border border-cream/20 bg-field-deep/60 px-4 py-3.5 font-score text-lg text-chalk outline-none transition placeholder:text-cream-dim/45 focus:border-beer"
        />

        <label
          htmlFor="join-code"
          className="mb-2 block font-display text-[0.6rem] uppercase tracking-sign text-cream-dim"
        >
          Room code{" "}
          <span className="normal-case tracking-normal">(optional)</span>
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
        <p className="mt-2 font-score text-[0.7rem] text-cream-dim">
          Leave blank to start a new competition.
        </p>

        {error && <p className="mt-3 font-score text-sm text-stitch">{error}</p>}

        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="mt-5 w-full rounded-lg bg-beer px-4 py-4 font-display text-sm uppercase tracking-sign text-field-deep transition active:scale-[0.98] disabled:opacity-35"
        >
          {busy
            ? joining
              ? "Taking the field…"
              : "Chalking the lines…"
            : joining
              ? "Join the competition"
              : "Play Ball"}
        </button>
      </form>

      <p
        className="rise text-center font-score text-[0.7rem] leading-relaxed text-cream-dim"
        style={{ animationDelay: "180ms" }}
      >
        Nine beers over nine innings is roughly a drink every twenty minutes.
        <br />
        Know your limit, drink water, and don&apos;t drive home.
      </p>
    </main>
  );
}

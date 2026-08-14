"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CounterCard } from "@/components/CounterCard";
import { InningBar } from "@/components/InningBar";
import { JoinGate } from "@/components/JoinGate";
import { Leaderboard } from "@/components/Leaderboard";
import { ShareRow } from "@/components/ShareRow";
import { StatusScreen } from "@/components/StatusScreen";
import { buildFeed, buildLeaderboard, paceFor } from "@/lib/scoring";
import { ITEMS, TARGET } from "@/lib/types";
import { useRoom } from "@/lib/useRoom";

export function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const room = useRoom(code);
  const {
    status,
    error,
    actionError,
    clearActionError,
    connected,
    room: roomRow,
    participants,
    events,
    me,
    isHost,
    myTally,
    join,
    log,
    setInning,
    finish,
  } = room;

  const [confirmEnd, setConfirmEnd] = useState(false);

  const leaderboard = useMemo(
    () => buildLeaderboard(participants, events),
    [participants, events],
  );
  const feed = useMemo(() => buildFeed(participants, events), [participants, events]);

  // Auto-dismiss the error toast; these are almost always transient.
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(clearActionError, 4000);
    return () => clearTimeout(t);
  }, [actionError, clearActionError]);

  if (status === "loading") {
    return (
      <StatusScreen
        title="Warming up…"
        body="Taking the field."
        showHomeLink={false}
      />
    );
  }

  if (status === "notfound") {
    return (
      <StatusScreen
        title="No such room"
        body={`Nothing is running under the code "${code.toUpperCase()}". Check the link, or start your own competition.`}
      />
    );
  }

  if (status === "error" || !roomRow) {
    return (
      <StatusScreen
        title="Rain delay"
        body={error ?? "Something went sideways getting the room."}
      />
    );
  }

  if (!me) {
    return (
      <JoinGate
        room={roomRow}
        playerCount={participants.length}
        error={actionError}
        onJoin={join}
      />
    );
  }

  const finished = roomRow.status === "finished";
  const iAmDone = ITEMS.every((item) => myTally[item] >= TARGET);

  return (
    <main className="mx-auto w-full max-w-md px-4 pt-4 pb-28 lg:max-w-6xl lg:pt-6">
      {/* ---- header ---- */}
      <header className="rise mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/" className="font-display text-lg leading-none painted">
            <span className="text-beer">9</span>
            <span className="text-cream-dim">–</span>
            <span className="text-mustard">9</span>
            <span className="text-cream-dim">–</span>
            <span className="text-stitch">9</span>
          </Link>
          <p className="mt-1 truncate font-score text-[0.68rem] uppercase tracking-sign text-cream-dim">
            {roomRow.name || `Room ${roomRow.code}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 font-score text-[0.6rem] uppercase tracking-sign text-cream-dim"
            title={connected ? "Live" : "Reconnecting"}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-grass" : "bg-stitch blink"
              }`}
            />
            {connected ? "Live" : "Offline"}
          </span>
          {finished && (
            <Link
              href={`/room/${roomRow.code}/results`}
              className="rounded-md border border-beer/45 bg-beer/15 px-2.5 py-1.5 font-display text-[0.6rem] uppercase tracking-sign text-beer"
            >
              Results
            </Link>
          )}
        </div>
      </header>

      {finished && (
        <div className="rise mb-3 rounded-xl border border-beer/40 bg-beer/10 px-4 py-3 text-center">
          <p className="font-display text-[0.7rem] uppercase tracking-sign text-beer">
            Ballgame
          </p>
          <p className="mt-1 font-score text-sm text-cream-dim">
            This competition is closed. See the{" "}
            <Link href={`/room/${roomRow.code}/results`} className="text-cream underline">
              final card
            </Link>
            .
          </p>
        </div>
      )}

      {/*
        One column on phones — where most people actually play. At lg the
        tracker stays left and the scoreboard takes the right half, for whoever
        has a laptop propped up in the section.
      */}
      <div className="lg:grid lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
        {/* ---- left: your controls ---- */}
        <div className="lg:sticky lg:top-6">
      <div className="rise mb-3" style={{ animationDelay: "60ms" }}>
        <InningBar
          inning={roomRow.current_inning}
          isHost={isHost}
          finished={finished}
          onChange={setInning}
        />
      </div>

      {/* ---- the counters ---- */}
      <div className="rise mb-3 flex flex-col gap-3" style={{ animationDelay: "120ms" }}>
        {ITEMS.map((item) => (
          <CounterCard
            key={item}
            item={item}
            count={myTally[item]}
            pace={paceFor(myTally[item], roomRow.current_inning, finished)}
            disabled={finished}
            onIncrement={() => log(item, 1)}
            onDecrement={() => log(item, -1)}
          />
        ))}
      </div>

      {iAmDone && !finished && (
        <div className="rise mb-3 rounded-xl border border-grass/45 bg-grass/10 px-4 py-3 text-center">
          <p className="font-display text-sm text-grass painted">
            9 and 9. You did the whole thing.
          </p>
          <p className="mt-1 font-score text-[0.72rem] text-cream-dim">
            Get some water and enjoy the rest of the game.
          </p>
        </div>
      )}

        </div>

        {/* ---- right: the scoreboard everyone watches ---- */}
        <div className="lg:mb-0">
      <div className="rise mb-3" style={{ animationDelay: "180ms" }}>
        <Leaderboard
          rows={leaderboard}
          meId={me.id}
          hostId={roomRow.host_participant_id}
        />
      </div>

      <div className="rise mb-3" style={{ animationDelay: "240ms" }}>
        <ActivityFeed entries={feed} />
      </div>

      {!finished && (
        <div className="rise mb-3" style={{ animationDelay: "300ms" }}>
          <ShareRow code={roomRow.code} />
        </div>
      )}

      {isHost && !finished && (
        <div className="rise" style={{ animationDelay: "360ms" }}>
          {confirmEnd ? (
            <div className="panel rounded-xl p-4 text-center">
              <p className="font-score text-sm text-cream">
                End it for everyone? No more logging after this.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmEnd(false)}
                  className="flex-1 rounded-lg border border-cream/25 py-3 font-display text-[0.65rem] uppercase tracking-sign text-cream"
                >
                  Keep going
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await finish();
                    if (ok) router.push(`/room/${roomRow.code}/results`);
                  }}
                  className="flex-1 rounded-lg bg-stitch py-3 font-display text-[0.65rem] uppercase tracking-sign text-chalk"
                >
                  Call the game
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmEnd(true)}
              className="w-full rounded-xl border border-cream/15 py-3 font-display text-[0.65rem] uppercase tracking-sign text-cream-dim transition active:scale-[0.99]"
            >
              End the competition
            </button>
          )}
        </div>
      )}
        </div>
      </div>

      {/* ---- transient errors ---- */}
      {actionError && (
        <div
          role="status"
          className="rise fixed inset-x-0 bottom-4 z-50 mx-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-stitch/50 bg-stitch/95 px-4 py-3 text-center font-score text-sm text-chalk shadow-2xl"
        >
          {actionError}
        </div>
      )}
    </main>
  );
}

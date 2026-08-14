"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { fetchTeamGameToday, NATIONALS_TEAM_ID, type GameSnapshot } from "./mlb";

const POLL_MS = 30_000;

/**
 * Only the host polls MLB. The result is written to the room row, and Realtime
 * carries it to everyone else — one source of truth, and no other phone spends
 * battery or data on external requests.
 */
export function useGameSync({
  code,
  active,
  teamId = NATIONALS_TEAM_ID,
}: {
  code: string;
  active: boolean;
  teamId?: number;
}) {
  const [error, setError] = useState<string | null>(null);
  // Last payload we wrote, so an idle game doesn't churn the DB every 30s.
  const lastWritten = useRef<string>("");

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();

    const write = async (snap: GameSnapshot) => {
      const fingerprint = JSON.stringify([
        snap.gamePk,
        snap.status,
        snap.inning,
        snap.inningState,
        snap.awayScore,
        snap.homeScore,
      ]);
      if (fingerprint === lastWritten.current) return;

      const { error: rpcError } = await supabase.rpc("sync_game_state", {
        p_code: code,
        p_game_pk: snap.gamePk,
        p_status: snap.status,
        p_inning: snap.inning,
        p_inning_state: snap.inningState,
        p_away_team: snap.awayTeam,
        p_home_team: snap.homeTeam,
        p_away_score: snap.awayScore,
        p_home_score: snap.homeScore,
      });
      if (!rpcError) lastWritten.current = fingerprint;
      else if (!cancelled) setError(rpcError.message);
    };

    const tick = async () => {
      // Don't burn the host's battery polling behind a locked screen; the
      // visibilitychange handler catches us up the moment they look again.
      if (document.visibilityState === "visible") {
        try {
          const snap = await fetchTeamGameToday(teamId, controller.signal);
          if (cancelled) return;
          setError(null);
          if (snap) await write(snap);
        } catch (err) {
          if (!cancelled && (err as Error)?.name !== "AbortError") {
            setError("Couldn't reach MLB — the inning is on manual for now.");
          }
        }
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    };

    void tick();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, code, teamId]);

  return { error };
}

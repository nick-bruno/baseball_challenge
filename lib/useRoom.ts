"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from "@supabase/supabase-js";
import { ensureAnonSession, supabase } from "./supabase";
import { TARGET, type ConsumptionEvent, type Item, type Participant, type Room } from "./types";
import { tallyFor } from "./scoring";

type Status = "loading" | "ready" | "notfound" | "error";

/**
 * Owns all room state: identity, the initial fetch, the realtime subscription,
 * optimistic writes, and — importantly — resynchronising after the socket drops.
 */
export function useRoom(code: string) {
  const roomCode = code.toUpperCase();

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<ConsumptionEvent[]>([]);
  /** Local-only events awaiting their round trip, so taps feel instant. */
  const [pending, setPending] = useState<ConsumptionEvent[]>([]);

  const roomIdRef = useRef<string | null>(null);

  const load = useCallback(async (): Promise<string | null> => {
    const { data: roomRow, error: roomErr } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", roomCode)
      .maybeSingle();

    if (roomErr) throw roomErr;
    if (!roomRow) return null;

    const room = roomRow as Room;
    roomIdRef.current = room.id;

    const [{ data: people, error: pErr }, { data: evts, error: eErr }] =
      await Promise.all([
        supabase
          .from("participants")
          .select("*")
          .eq("room_id", room.id)
          .order("joined_at", { ascending: true }),
        supabase
          .from("consumption_events")
          .select("*")
          .eq("room_id", room.id)
          .order("created_at", { ascending: true }),
      ]);

    if (pErr) throw pErr;
    if (eErr) throw eErr;

    setRoom(room);
    setParticipants((people ?? []) as Participant[]);
    setEvents((evts ?? []) as ConsumptionEvent[]);
    return room.id;
  }, [roomCode]);

  // ---- initial load -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = await ensureAnonSession();
        if (cancelled) return;
        setUserId(uid);

        const roomId = await load();
        if (cancelled) return;
        setStatus(roomId ? "ready" : "notfound");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // ---- realtime + resync --------------------------------------------------
  const roomId = room?.id ?? null;

  useEffect(() => {
    if (!roomId) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const resync = () => {
      load().catch(() => {
        /* transient; the next reconnect or visibility change retries */
      });
    };

    (async () => {
      // Postgres Changes applies RLS per subscriber, so the socket needs our JWT.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;

      channel = supabase
        .channel(`room:${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "consumption_events",
            filter: `room_id=eq.${roomId}`,
          },
          (payload: RealtimePostgresInsertPayload<ConsumptionEvent>) => {
            const incoming = payload.new;
            setEvents((prev) =>
              prev.some((e) => e.id === incoming.id) ? prev : [...prev, incoming],
            );
            setPending((prev) =>
              prev.filter((p) => p.client_event_id !== incoming.client_event_id),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "participants",
            filter: `room_id=eq.${roomId}`,
          },
          (payload: RealtimePostgresInsertPayload<Participant>) => {
            const incoming = payload.new;
            setParticipants((prev) =>
              prev.some((p) => p.id === incoming.id) ? prev : [...prev, incoming],
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "rooms",
            filter: `id=eq.${roomId}`,
          },
          (payload: RealtimePostgresUpdatePayload<Room>) => {
            setRoom(payload.new);
          },
        )
        .subscribe((s) => {
          if (cancelled) return;
          if (s === "SUBSCRIBED") {
            setConnected(true);
            // Postgres Changes does not replay what we missed while the socket
            // was down, so every (re)subscribe refetches to close the gap.
            resync();
          } else {
            setConnected(false);
          }
        });
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") resync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", resync);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", resync);
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomId, load]);

  // ---- derived ------------------------------------------------------------
  const allEvents = useMemo(() => {
    if (pending.length === 0) return events;
    const seen = new Set(events.map((e) => e.client_event_id));
    return [...events, ...pending.filter((p) => !seen.has(p.client_event_id))];
  }, [events, pending]);

  const me = useMemo(
    () => participants.find((p) => p.auth_user_id === userId) ?? null,
    [participants, userId],
  );

  const isHost = !!me && !!room && room.host_participant_id === me.id;
  const myTally = useMemo(() => tallyFor(allEvents, me?.id), [allEvents, me?.id]);

  // ---- actions ------------------------------------------------------------
  const join = useCallback(
    async (displayName: string) => {
      setActionError(null);
      const { data, error } = await supabase.rpc("join_room", {
        p_code: roomCode,
        p_display_name: displayName,
      });
      if (error) {
        setActionError(error.message);
        return false;
      }
      const participant = data as Participant;
      setParticipants((prev) =>
        prev.some((p) => p.id === participant.id)
          ? prev.map((p) => (p.id === participant.id ? participant : p))
          : [...prev, participant],
      );
      return true;
    },
    [roomCode],
  );

  const log = useCallback(
    async (item: Item, delta: 1 | -1) => {
      if (!me || !room) return;
      setActionError(null);

      const current = tallyFor(allEvents, me.id)[item];
      const next = current + delta;
      if (next < 0 || next > TARGET) return;

      const clientEventId = crypto.randomUUID();
      const optimistic: ConsumptionEvent = {
        id: `pending:${clientEventId}`,
        room_id: room.id,
        participant_id: me.id,
        item,
        delta,
        inning: room.current_inning,
        client_event_id: clientEventId,
        created_at: new Date().toISOString(),
      };
      setPending((prev) => [...prev, optimistic]);

      const { data, error } = await supabase.rpc("log_consumption", {
        p_code: roomCode,
        p_item: item,
        p_delta: delta,
        p_client_event_id: clientEventId,
      });

      if (error) {
        setPending((prev) => prev.filter((p) => p.client_event_id !== clientEventId));
        setActionError(error.message);
        return;
      }

      // Adopt the authoritative row immediately; realtime may echo it later and
      // will dedupe on id.
      const saved = data as ConsumptionEvent | null;
      if (saved) {
        setEvents((prev) =>
          prev.some((e) => e.id === saved.id) ? prev : [...prev, saved],
        );
      }
      setPending((prev) => prev.filter((p) => p.client_event_id !== clientEventId));
    },
    [allEvents, me, room, roomCode],
  );

  const setInning = useCallback(
    async (inning: number) => {
      setActionError(null);
      const { data, error } = await supabase.rpc("set_inning", {
        p_code: roomCode,
        p_inning: inning,
      });
      if (error) {
        setActionError(error.message);
        return;
      }
      setRoom(data as Room);
    },
    [roomCode],
  );

  const finish = useCallback(async () => {
    setActionError(null);
    const { data, error } = await supabase.rpc("finish_room", { p_code: roomCode });
    if (error) {
      setActionError(error.message);
      return false;
    }
    setRoom(data as Room);
    return true;
  }, [roomCode]);

  return {
    status,
    error,
    actionError,
    clearActionError: () => setActionError(null),
    connected,
    room,
    participants,
    events: allEvents,
    me,
    isHost,
    myTally,
    join,
    log,
    setInning,
    finish,
  };
}

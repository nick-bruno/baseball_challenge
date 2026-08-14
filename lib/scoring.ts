import {
  INNINGS,
  ITEMS,
  TARGET,
  type ConsumptionEvent,
  type Item,
  type Participant,
} from "./types";

/**
 * Pure derivations over the event log. Everything the UI shows — counts, pace,
 * rankings, the activity feed — is computed here from the same array of events,
 * so the tracker and the recap page can never disagree.
 */

export type Tally = Record<Item, number>;

export type LeaderboardRow = {
  rank: number;
  participant: Participant;
  tally: Tally;
  total: number;
  done: boolean;
  /** When this player last reached 9 & 9, if they have. */
  finishedAt: string | null;
  /** When each item first (most recently) reached 9. */
  finishedAtByItem: Record<Item, string | null>;
  lastEventAt: string | null;
};

export type FeedEntry = {
  id: string;
  participantId: string;
  name: string;
  item: Item;
  delta: 1 | -1;
  /** Running total for that player/item immediately after this event. */
  count: number;
  inning: number;
  createdAt: string;
};

export type Pace = {
  diff: number;
  label: string;
  tone: "ahead" | "onpace" | "behind" | "done";
};

const emptyTally = (): Tally => ({ beer: 0, hotdog: 0 });

function byTime(a: ConsumptionEvent, b: ConsumptionEvent): number {
  const t = a.created_at.localeCompare(b.created_at);
  // created_at can tie at the same millisecond when someone double-taps; fall
  // back to id so every client orders identically.
  return t !== 0 ? t : a.id.localeCompare(b.id);
}

export function sortEvents(events: ConsumptionEvent[]): ConsumptionEvent[] {
  return [...events].sort(byTime);
}

export function tallyFor(
  events: ConsumptionEvent[],
  participantId: string | null | undefined,
): Tally {
  const tally = emptyTally();
  if (!participantId) return tally;
  for (const e of events) {
    if (e.participant_id === participantId) tally[e.item] += e.delta;
  }
  return tally;
}

export function buildLeaderboard(
  participants: Participant[],
  events: ConsumptionEvent[],
): LeaderboardRow[] {
  const state = new Map<
    string,
    {
      tally: Tally;
      finishedAt: string | null;
      finishedAtByItem: Record<Item, string | null>;
      lastEventAt: string | null;
    }
  >();

  for (const p of participants) {
    state.set(p.id, {
      tally: emptyTally(),
      finishedAt: null,
      finishedAtByItem: { beer: null, hotdog: null },
      lastEventAt: null,
    });
  }

  // Walk chronologically so we can capture *when* each milestone was hit.
  // Undos roll the milestone back, which keeps the recap honest.
  for (const e of sortEvents(events)) {
    const s = state.get(e.participant_id);
    if (!s) continue;
    s.tally[e.item] += e.delta;
    s.lastEventAt = e.created_at;

    s.finishedAtByItem[e.item] =
      s.tally[e.item] >= TARGET ? e.created_at : null;

    const allDone = ITEMS.every((item) => s.tally[item] >= TARGET);
    s.finishedAt = allDone ? e.created_at : null;
  }

  const rows = participants.map((participant) => {
    const s = state.get(participant.id)!;
    const total = ITEMS.reduce((sum, item) => sum + s.tally[item], 0);
    return {
      rank: 0,
      participant,
      tally: s.tally,
      total,
      done: s.finishedAt !== null,
      finishedAt: s.finishedAt,
      finishedAtByItem: s.finishedAtByItem,
      lastEventAt: s.lastEventAt,
    };
  });

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    // Same total: whoever got there first is ahead. Players with no events yet
    // sort last among their tier.
    if (a.lastEventAt && b.lastEventAt) {
      const t = a.lastEventAt.localeCompare(b.lastEventAt);
      if (t !== 0) return t;
    } else if (a.lastEventAt !== b.lastEventAt) {
      return a.lastEventAt ? -1 : 1;
    }
    return a.participant.joined_at.localeCompare(b.participant.joined_at);
  });

  rows.forEach((row, i) => {
    row.rank = i + 1;
  });
  return rows;
}

export function buildFeed(
  participants: Participant[],
  events: ConsumptionEvent[],
  limit = 30,
): FeedEntry[] {
  const names = new Map(participants.map((p) => [p.id, p.display_name]));
  const counts = new Map<string, number>();
  const entries: FeedEntry[] = [];

  for (const e of sortEvents(events)) {
    const key = `${e.participant_id}:${e.item}`;
    const next = (counts.get(key) ?? 0) + e.delta;
    counts.set(key, next);
    entries.push({
      id: e.id,
      participantId: e.participant_id,
      name: names.get(e.participant_id) ?? "Someone",
      item: e.item,
      delta: e.delta,
      count: next,
      inning: e.inning,
      createdAt: e.created_at,
    });
  }

  return entries.reverse().slice(0, limit);
}

/**
 * The challenge is one of each per inning, so your expected count simply equals
 * the current inning.
 */
export function paceFor(count: number, inning: number, roomFinished = false): Pace {
  if (count >= TARGET) {
    return { diff: TARGET - inning, label: "Finished", tone: "done" };
  }
  if (roomFinished) {
    return { diff: count - INNINGS, label: `Ended on ${count}`, tone: "behind" };
  }
  const diff = count - Math.min(inning, INNINGS);
  if (diff > 0) return { diff, label: `Ahead by ${diff}`, tone: "ahead" };
  if (diff === 0) return { diff, label: "On pace", tone: "onpace" };
  return { diff, label: `Behind by ${-diff}`, tone: "behind" };
}

const ORDINALS = [
  "",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
];

export function inningLabel(inning: number): string {
  return ORDINALS[inning] ?? `${inning}th`;
}

/**
 * Everyone who went 9 and 9, in the order they got there — which is the order
 * that settles arguments, unlike the leaderboard's total-first ranking.
 */
export function buildFinishers(rows: LeaderboardRow[]): LeaderboardRow[] {
  return rows
    .filter((r) => r.done && r.finishedAt)
    .sort((a, b) => a.finishedAt!.localeCompare(b.finishedAt!));
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Seconds included — two people finishing in the same minute is plausible. */
export function formatClockPrecise(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatElapsed(fromIso: string, toIso: string): string {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function feedText(entry: FeedEntry): string {
  const noun = entry.item === "beer" ? "beer" : "hot dog";
  if (entry.delta === -1) {
    return `${entry.name} took back a ${noun} — down to ${entry.count}`;
  }
  if (entry.count >= TARGET) {
    return `${entry.name} finished all 9 ${noun}s! 🏆`;
  }
  return `${entry.name} put away ${noun} #${entry.count}`;
}

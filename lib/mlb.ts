/**
 * MLB Stats API client.
 *
 * Public, unauthenticated, and CORS-open (`access-control-allow-origin: *`),
 * so the browser calls it directly — no proxy, no key, no server route.
 */

export const NATIONALS_TEAM_ID = 120;

/**
 * Which team's game a room follows. Defaults to the Nationals; override with
 * NEXT_PUBLIC_MLB_TEAM_ID, or per-visit with a `?team=<id>` query param, which
 * is how you point a test room at whatever game happens to be on right now.
 */
export const DEFAULT_TEAM_ID =
  Number(process.env.NEXT_PUBLIC_MLB_TEAM_ID) || NATIONALS_TEAM_ID;

const BASE = "https://statsapi.mlb.com/api/v1";

export type GameSnapshot = {
  gamePk: number;
  /** "Preview" | "Live" | "Final" */
  abstractState: string;
  /** e.g. "Pre-Game", "In Progress", "Final", "Postponed" */
  status: string;
  inning: number | null;
  /** "Top" | "Middle" | "Bottom" | "End" */
  inningState: string | null;
  awayTeam: string;
  homeTeam: string;
  awayScore: number | null;
  homeScore: number | null;
};

/**
 * MLB schedules by US Eastern date — a 10pm Pacific first pitch still belongs
 * to the ET day. Using the viewer's local date would pick the wrong game.
 */
export function easternDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

type ScheduleGame = {
  gamePk: number;
  status?: { abstractGameState?: string; detailedState?: string };
  teams?: {
    away?: { team?: { name?: string } };
    home?: { team?: { name?: string } };
  };
  linescore?: {
    currentInning?: number | null;
    inningState?: string | null;
    teams?: {
      away?: { runs?: number | null };
      home?: { runs?: number | null };
    };
  };
};

function toSnapshot(g: ScheduleGame): GameSnapshot {
  const ls = g.linescore ?? {};
  return {
    gamePk: g.gamePk,
    abstractState: g.status?.abstractGameState ?? "Preview",
    status: g.status?.detailedState ?? "Scheduled",
    inning: ls.currentInning ?? null,
    inningState: ls.inningState ?? null,
    awayTeam: g.teams?.away?.team?.name ?? "Away",
    homeTeam: g.teams?.home?.team?.name ?? "Home",
    awayScore: ls.teams?.away?.runs ?? null,
    homeScore: ls.teams?.home?.runs ?? null,
  };
}

/**
 * One hydrated request returns teams, score, inning, and status together —
 * cheaper on the host's phone and battery than schedule + linescore.
 */
export async function fetchTeamGameToday(
  teamId = DEFAULT_TEAM_ID,
  signal?: AbortSignal,
): Promise<GameSnapshot | null> {
  const url = `${BASE}/schedule?sportId=1&teamId=${teamId}&date=${easternDate()}&hydrate=linescore`;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`MLB API ${res.status}`);

  const data = (await res.json()) as { dates?: { games?: ScheduleGame[] }[] };
  const games = (data.dates ?? []).flatMap((d) => d.games ?? []);
  if (games.length === 0) return null;

  // Doubleheader: follow the one still being played, else the last of the day.
  const live = games.find((g) => g.status?.abstractGameState === "Live");
  const notFinal = games.find((g) => g.status?.abstractGameState !== "Final");
  return toSnapshot(live ?? notFinal ?? games[games.length - 1]);
}

/** "Top 5th" / "Final" / "Pre-Game" — what to print on the scoreboard. */
export function describeGame(snap: {
  status: string;
  abstractState: string;
  inning: number | null;
  inningState: string | null;
}): string {
  if (snap.abstractState === "Final") return "Final";
  if (snap.abstractState !== "Live" || !snap.inning) return snap.status;

  const n = snap.inning;
  const suffix =
    n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : n > 20 ? "th" : "th";
  const half = snap.inningState ?? "";
  return `${half} ${n}${suffix}`.trim();
}

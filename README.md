# The 9-9-9 Challenge

A live tracker for the 9-9-9 challenge: **9 beers, 9 hot dogs, 9 innings**. One
person starts a competition, shares a link, and everyone logs their own damage
on their own phone while the whole group watches the leaderboard move in real
time.

Next.js on Vercel + Supabase (Postgres, Realtime, anonymous auth). No custom
backend, no websocket server, free tier all the way down.

---

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com), then:

1. **Authentication → Sign In / Providers**, and turn on **both** of these:
   - **Anonymous Sign-Ins** — gives each phone a durable identity from nothing
     but a typed name.
   - **User Signups → "Allow new users to sign up"** — a separate, project-wide
     switch. Anonymous sign-in creates a user, so if signups are disabled
     globally you get `signup_disabled` / "Signups not allowed for this
     instance" even with anonymous sign-ins explicitly enabled. Nothing in the
     anonymous toggle hints at this.

   To check both at once from a terminal:

   ```bash
   curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" \
     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" | jq '{
       anonymous: .external.anonymous_users, signups_disabled: .disable_signup }'
   ```

   You want `anonymous: true` and `signups_disabled: false`.
2. **SQL Editor →** paste and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   It creates the tables, row-level security, the write RPCs, and adds all three
   tables to the realtime publication. It's safe to re-run.
3. **Project Settings → API Keys →** copy the project URL and the **publishable**
   key (`sb_publishable_…`); older projects show an `anon` JWT instead and both
   work. Never use the `secret` / `service_role` key here. The URL must be the
   bare host (`https://xxxx.supabase.co`) — not the REST endpoint with
   `/rest/v1/` on the end, which `supabase-js` appends itself.

### 2. Local

```bash
cp .env.example .env.local   # paste your URL + anon key
npm install
npm run dev                  # http://localhost:3000
```

### 3. Deploy

Push to GitHub, import the repo in [Vercel](https://vercel.com), and set the two
`NEXT_PUBLIC_*` env vars from `.env.local`. That's the whole deploy.

No Supabase URL configuration is needed. Anonymous sign-in issues a session
directly over the API with no redirect, so the **Site URL** and **Redirect URLs**
settings don't apply here — those matter only for OAuth and magic links.

Send people `https://your-app.vercel.app/room/ABC123` — or let them scan the QR
code the room page generates.

---

## How it works

**Event log, not counters.** Every beer and hot dog is a row in
`consumption_events` with a `delta` of `+1` or `-1`. Counts, pace, rankings, and
the play-by-play feed are all derived from that one array by the pure functions
in [`lib/scoring.ts`](lib/scoring.ts). Undo appends a `-1` rather than deleting,
so history stays honest and realtime only ever handles INSERTs. A game is ~180
rows, so clients just aggregate in memory.

**Writes go through Postgres.** There are no INSERT/UPDATE/DELETE policies on
any table — the only write path is the `SECURITY DEFINER` functions
(`create_room`, `join_room`, `log_consumption`, `set_inning`, `finish_room`).
They resolve your participant from `auth.uid()`, so you can't log events as
someone else, and `log_consumption` takes a row lock before checking bounds so
two concurrent taps can't push you past 9.

**Taps are idempotent.** The client generates a `client_event_id` per tap and a
unique index enforces it. On bad stadium wifi a request that succeeds but never
returns gets retried safely instead of double-counting.

**Reconnects resync.** Postgres Changes doesn't replay what you missed while the
socket was down, so [`lib/useRoom.ts`](lib/useRoom.ts) refetches the room on
every `SUBSCRIBED`, on `visibilitychange`, and on `online`. Without this,
pocketing your phone for two innings leaves you silently stale.

**Security model is "unguessable link".** Any authenticated session can read any
room it knows the code for — that's what makes the shared leaderboard work.
Appropriate for a beer game; don't put anything sensitive in a room name.

## Layout

```
app/
  page.tsx                       create a competition / join by code
  room/[code]/RoomClient.tsx     the tracker
  room/[code]/results/           final card
components/                      CounterCard, Leaderboard, ActivityFeed, InningBar, ShareRow…
lib/
  supabase.ts                    browser client + anonymous session bootstrap
  useRoom.ts                     state, realtime, optimistic writes, resync
  scoring.ts                     pure derivations over the event log
  types.ts
supabase/migrations/0001_init.sql
```

## Verifying it works

- **Two players:** open a room in a normal window and an incognito window (they
  get separate anonymous identities). Tap `+1` in one; the other should move
  within about a second, no refresh.
- **Reconnect:** with both open, set client B to Offline in DevTools, log 4
  events on A, then re-enable. B must converge to A exactly.
- **Idempotency:** rapid-fire `+1` ten times — the count lands on exactly 10 and
  `consumption_events` has exactly 10 rows.
- **Bounds:** a 10th beer is rejected; undo at 0 is rejected.
- **Host controls:** only the host sees the inning arrows; a non-host calling
  `set_inning` via the console is refused.
- **On real phones:** before game day, open the deployed URL on cell data (not
  wifi) with a friend and run a few innings. It's the only test that exercises
  actual mobile network conditions.

## A note on the challenge itself

Nine beers across a three-hour game is about a drink every twenty minutes, which
is a genuinely dangerous rate for most adults. The UI nudges toward water and
pacing. Please make sure nobody drives.

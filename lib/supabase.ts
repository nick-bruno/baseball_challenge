"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

const MISSING_ENV =
  "Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
  "NEXT_PUBLIC_SUPABASE_ANON_KEY (copy .env.example to .env.local).";

// Fall back to placeholders rather than throwing at module scope: these pages
// are prerendered at build time, and a missing env var should surface as a
// readable message in the UI, not a failed build or a blank screen.
export const supabase: SupabaseClient = createClient(
  url ?? "http://localhost:54321",
  anonKey ?? "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      // Nobody taps faster than this, and it keeps the socket quiet on cell data.
      params: { eventsPerSecond: 10 },
    },
  },
);

let sessionPromise: Promise<string> | null = null;

/**
 * Every device gets a durable anonymous identity, created silently on first
 * visit and persisted in localStorage. This is what lets people join with just
 * a display name while still having a real JWT for row-level security.
 *
 * Memoized so concurrent callers don't race two sign-ins into existence.
 */
export function ensureAnonSession(): Promise<string> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      if (!isConfigured) throw new Error(MISSING_ENV);

      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session.user.id;

      const { data: signedIn, error } = await supabase.auth.signInAnonymously();
      if (error || !signedIn.session) {
        throw new Error(
          error?.message ??
            "Could not start a session. Make sure Anonymous Sign-ins are enabled in Supabase.",
        );
      }
      return signedIn.session.user.id;
    })().catch((err) => {
      // Don't cache a failure — a flaky first request shouldn't wedge the app.
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

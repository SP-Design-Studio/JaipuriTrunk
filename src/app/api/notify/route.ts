import { NextResponse } from "next/server";

/**
 * Waitlist capture.
 *
 * One destination: Supabase. Every signup becomes a row you can query, export,
 * or later hand to the shop.
 *
 * There used to be a second — a Resend email to us on every signup — and it is
 * gone on purpose. An inbox is a poor list when the real one is a table you can
 * query, and it was never configured, so it had never actually sent anything.
 * The email worth writing is a confirmation to the person who signed up, and
 * that needs a verified sending domain and an unsubscribe link before it does
 * more good than harm. It belongs with the admin panel, not here.
 *
 * With nothing configured the route still returns 200 and keeps the address, so
 * the form is never broken in front of a visitor while you are setting keys up.
 *
 * Supabase is called over its REST endpoint rather than through the SDK. This
 * runs server-side on one table with one insert, and the SDK would be a
 * dependency and a bundle for no benefit.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Signup = { email: string; at: string; source: string };

/**
 * What happened to a signup.
 *
 * `duplicate` is a distinct outcome rather than a silent success, because a
 * returning visitor who types the same address deserves to be told it is
 * already on the list instead of being thanked again and left wondering.
 */
type Stored = "inserted" | "duplicate" | "unconfigured";

/** The list. Returns "unconfigured" if no keys are set, throws if it failed. */
async function toSupabase(signup: Signup): Promise<Stored> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "unconfigured";

  const res = await fetch(`${url}/rest/v1/waitlist`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      // ON CONFLICT DO NOTHING, but ask for the rows back. A duplicate is
      // then an ordinary 201 with an empty array rather than a 409 to catch,
      // so we can tell the two apart without treating either as an error.
      prefer: "resolution=ignore-duplicates,return=representation",
    },
    body: JSON.stringify({
      email: signup.email,
      signed_up_at: signup.at,
      source: signup.source,
    }),
  });

  if (!res.ok) {
    throw new Error(`supabase responded ${res.status}: ${await res.text()}`);
  }

  // The array holds what was actually written. Empty means the unique index on
  // lower(email) caught it and nothing new was stored.
  const written = (await res.json()) as unknown;
  return Array.isArray(written) && written.length === 0
    ? "duplicate"
    : "inserted";
}

/**
 * Development fallback, so the form can be exercised without any keys.
 *
 * Appends to a JSON file at the project root that is gitignored. Deliberately
 * guarded to non-production: Vercel's filesystem is read-only at runtime, so
 * this would throw there, and a waitlist that lives on a serverless instance's
 * disk would vanish with the instance anyway.
 */
async function toLocalFile(signup: Signup): Promise<Stored> {
  if (process.env.NODE_ENV === "production") {
    console.info(
      "[notify] nothing configured — signup logged only:",
      signup.email,
    );
    return "inserted";
  }
  try {
    const { readFile, writeFile } = await import("node:fs/promises");
    const path = ".notify-signups.json";
    let rows: Signup[] = [];
    try {
      rows = JSON.parse(await readFile(path, "utf8"));
    } catch {
      // First signup, or the file was hand-edited into something unparseable.
      // Either way, start a fresh list rather than losing this one.
    }
    // Same rule as the database's unique index, so the "already on the list"
    // path can be exercised in dev with no keys configured at all.
    if (rows.some((r) => r.email === signup.email)) {
      console.info(`[notify] dev: ${signup.email} already in ${path}`);
      return "duplicate";
    }
    rows.push(signup);
    await writeFile(path, JSON.stringify(rows, null, 2));
    console.info(
      `[notify] dev: ${signup.email} -> ${path} (${rows.length} total)`,
    );
    return "inserted";
  } catch (err) {
    console.error("[notify] dev fallback could not write:", err);
    return "inserted";
  }
}

export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (typeof email !== "string" || !EMAIL.test(email.trim())) {
    return NextResponse.json(
      { error: "That doesn't look like an email address." },
      { status: 400 },
    );
  }

  const signup: Signup = {
    email: email.trim().toLowerCase(),
    at: new Date().toISOString(),
    source: request.headers.get("referer") ?? "direct",
  };

  let stored: Stored;
  try {
    stored = await toSupabase(signup);
  } catch (err) {
    console.error("[notify] could not store signup:", err);
    return NextResponse.json(
      { error: "Couldn't save that just now. Try again in a moment." },
      { status: 502 },
    );
  }

  if (stored === "unconfigured") stored = await toLocalFile(signup);

  // Nothing was added, so there is nothing to be notified about.
  if (stored === "duplicate") {
    return NextResponse.json({ ok: true, already: true });
  }

  return NextResponse.json({ ok: true, already: false });
}

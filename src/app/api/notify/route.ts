import { NextResponse } from "next/server";

/**
 * Waitlist capture.
 *
 * Two destinations, both optional and independent:
 *
 *   Supabase  the durable list. Every signup becomes a row you can query,
 *             export, or later hand to the shop. This is the one that matters.
 *   Resend    an immediate note to you per signup. Convenience, not storage —
 *             an inbox is a poor list and a free tier will cap out.
 *
 * They are deliberately not all-or-nothing. A signup that reaches Supabase but
 * fails to email is a success: the address is safe, and you have lost only a
 * notification. The reverse is a failure, because nothing was kept.
 *
 * With neither configured the route still returns 200 and logs the address, so
 * the form is never broken in front of a visitor while you are setting keys up.
 *
 * Supabase is called over its REST endpoint rather than through the SDK. This
 * runs server-side on one table with one insert, and the SDK would be a
 * dependency and a bundle for no benefit.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Signup = { email: string; at: string; source: string };

/** The list. Returns false if it is not configured, throws if it failed. */
async function toSupabase(signup: Signup): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;

  const res = await fetch(`${url}/rest/v1/waitlist`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      // Swallow the duplicate-key error a returning visitor causes. Signing up
      // twice is not an error worth showing anyone.
      prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify({ email: signup.email, signed_up_at: signup.at, source: signup.source }),
  });

  if (!res.ok) {
    throw new Error(`supabase responded ${res.status}: ${await res.text()}`);
  }
  return true;
}

/** The nudge. Never throws — a failed notification must not fail the signup. */
async function toResend(signup: Signup): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.NOTIFY_EMAIL_FROM;
  if (!key || !to || !from) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `Waitlist: ${signup.email}`,
        text: `${signup.email}\nsigned up ${signup.at}\nvia ${signup.source}`,
      }),
    });
    if (!res.ok) throw new Error(`resend responded ${res.status}`);
    return true;
  } catch (err) {
    console.error("[notify] email notification failed (signup was still kept):", err);
    return false;
  }
}

/**
 * Development fallback, so the form can be exercised without any keys.
 *
 * Appends to a JSON file at the project root that is gitignored. Deliberately
 * guarded to non-production: Vercel's filesystem is read-only at runtime, so
 * this would throw there, and a waitlist that lives on a serverless instance's
 * disk would vanish with the instance anyway.
 */
async function toLocalFile(signup: Signup) {
  if (process.env.NODE_ENV === "production") {
    console.info("[notify] nothing configured — signup logged only:", signup.email);
    return;
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
    rows.push(signup);
    await writeFile(path, JSON.stringify(rows, null, 2));
    console.info(`[notify] dev: ${signup.email} -> ${path} (${rows.length} total)`);
  } catch (err) {
    console.error("[notify] dev fallback could not write:", err);
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
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }

  const signup: Signup = {
    email: email.trim().toLowerCase(),
    at: new Date().toISOString(),
    source: request.headers.get("referer") ?? "direct",
  };

  let stored = false;
  try {
    stored = await toSupabase(signup);
  } catch (err) {
    console.error("[notify] could not store signup:", err);
    return NextResponse.json(
      { error: "Couldn't save that just now. Try again in a moment." },
      { status: 502 }
    );
  }

  // Fired after the store, and its result is not awaited into the response:
  // the visitor should not wait on an email that is only for us.
  void toResend(signup);

  if (!stored) await toLocalFile(signup);

  return NextResponse.json({ ok: true });
}

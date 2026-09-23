"use client";

import { useState } from "react";
import NotifyTag from "@/components/NotifyTag";

type State = "idle" | "sending" | "done" | "error";

export default function NotifyForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  /** Whether the address was already on the list, for the tag's two readings. */
  const [already, setAlready] = useState(false);
  /** The address as it was submitted, kept for the tag after the input clears. */
  const [tagged, setTagged] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setState("error");
      setMessage("That doesn't look like an email address.");
      return;
    }

    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setState("done");
      setAlready(Boolean(data.already));
      setTagged(email.trim().toLowerCase());
      // A returning visitor gets told, rather than thanked a second time and
      // left unsure whether the first attempt ever worked.
      setMessage(
        data.already
          ? "We already had this address. Nothing more to do."
          : "We'll write when the first trunk lands.",
      );
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (state === "done") {
    // Wider than the form itself: the plate is a poster, and the act's column
    // allows 512px.
    return (
      <div className="mx-auto w-full max-w-[512px]">
        <NotifyTag email={tagged} already={already} />
        {/* The tag is a picture, so the outcome is also stated in text — both
            for anyone who cannot see it and because `role="status"` is what
            makes a screen reader announce that the submission worked. */}
        <p
          role="status"
          className="text-ink/55 mt-4 text-center text-[clamp(0.85rem,1.3vw,0.98rem)] font-light"
        >
          {message}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      /* No `md:mx-0` here. It was left over from when this act had a facade in
         a left-hand column; the act is a single centred column now, so at
         desktop width it was left-aligning the form inside it — 448px sitting
         in a 512px column, 32px off the centre every other element sits on. */
      className="mx-auto w-full max-w-md"
    >
      <div className="border-maroon/25 focus-within:border-maroon/70 flex items-center gap-3 border-b pb-2 transition-colors">
        <label htmlFor="notify-email" className="sr-only">
          Email address
        </label>
        <input
          id="notify-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") {
              setState("idle");
              setMessage("");
            }
          }}
          placeholder="name@email.com"
          autoComplete="email"
          aria-invalid={state === "error"}
          aria-describedby={message ? "notify-msg" : undefined}
          /* text-base (16px) is deliberate: iOS Safari zooms the page in on
             focus for anything smaller. min-h-11 gives the field a 44px tap
             target on a phone. */
          className="text-ink placeholder:text-ink/35 min-h-11 w-full bg-transparent py-2 text-base font-light outline-none"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          /* The label is small caps by design, which left the button itself
             only 16px tall — a quarter of the 44px a thumb needs. Padding and
             min-h-11 grow the hit area without changing how the label looks;
             -mr-2 keeps the text optically aligned to the field's right edge
             despite the new padding. */
          className="text-maroon hover:text-maroon-deep shrink-0 font-display -mr-2 inline-flex min-h-11 items-center px-2 text-[clamp(0.78rem,1.2vw,0.92rem)] tracking-[0.3em] uppercase transition-colors disabled:opacity-50"
        >
          {state === "sending" ? "Sending" : "Notify me"}
        </button>
      </div>
      {message && (
        <p id="notify-msg" role="alert" className="mt-3 text-sm text-maroon">
          {message}
        </p>
      )}
      <p className="text-ink/40 mt-3 text-[clamp(0.8rem,1.3vw,0.98rem)] font-light">
        One email when we launch. Nothing else, ever.
      </p>
    </form>
  );
}

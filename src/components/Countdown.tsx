"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { site } from "@/lib/site";

/** -1 means "not yet known": the server render, before the clock is live. */
const UNKNOWN = -1;

type Unit = {
  key: "days" | "hours" | "minutes" | "seconds";
  word: string;
  short: string;
};

const UNITS: Unit[] = [
  { key: "days", word: "Days", short: "d" },
  { key: "hours", word: "Hours", short: "h" },
  { key: "minutes", word: "Minutes", short: "m" },
  { key: "seconds", word: "Seconds", short: "s" },
];

/**
 * Time left to the launch, ticking once a second.
 *
 * `compact` is the hero's version: one quiet line of numerals. The default is the
 * large one the sign-up section is built around. Seconds only show in the large
 * version, where a ticking digit reads as the date getting closer; in a corner of
 * the hero it would only be a flicker.
 */
export default function Countdown({
  tone = "light",
  compact = false,
}: {
  /** "dark" is for use on the maroon sections. */
  tone?: "light" | "dark";
  compact?: boolean;
}) {
  const target = useMemo(() => new Date(site.launchISO).getTime(), []);
  const snapshot = useRef(UNKNOWN);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const compute = () =>
        Math.max(0, Math.floor((target - Date.now()) / 1000));
      snapshot.current = compute();
      const id = window.setInterval(() => {
        snapshot.current = compute();
        onChange();
      }, 1000);
      return () => window.clearInterval(id);
    },
    [target],
  );

  const total = useSyncExternalStore(
    subscribe,
    useCallback(() => snapshot.current, []),
    useCallback(() => UNKNOWN, []),
  );
  const live = total !== UNKNOWN;

  const parts = {
    days: Math.floor(total / 86_400),
    hours: Math.floor(total / 3_600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  };
  const units = compact ? UNITS.slice(0, 3) : UNITS;
  const dark = tone === "dark";

  if (compact)
    return (
      <p
        className={`flex items-baseline gap-4 ${dark ? "text-cream" : "text-maroon"}`}
        aria-label={
          live
            ? `${parts.days} days, ${parts.hours} hours and ${parts.minutes} minutes to go`
            : undefined
        }
      >
        {units.map(({ key, short }) => (
          <span key={key} className="flex items-baseline gap-1">
            <span className="display tnum text-[clamp(1.3rem,2vw,1.75rem)]">
              {live ? String(parts[key]).padStart(2, "0") : "––"}
            </span>
            <span
              className={`label ${dark ? "text-cream/55" : "text-maroon/55"}`}
            >
              {short}
            </span>
          </span>
        ))}
      </p>
    );

  return (
    <div
      className={`grid w-full max-w-[34rem] grid-cols-4 gap-2 ${dark ? "text-cream" : "text-maroon"}`}
      role="timer"
      aria-label={
        live
          ? `${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes and ${parts.seconds} seconds to go`
          : undefined
      }
    >
      {units.map(({ key, word }) => (
        <div key={key} className="border-current/15 border-t pt-3">
          <p className="display tnum text-[clamp(2.4rem,5.6vw,4.4rem)]">
            {live ? String(parts[key]).padStart(2, "0") : "––"}
          </p>
          <p
            className={`label mt-2 ${dark ? "text-cream/55" : "text-maroon/55"}`}
          >
            {word}
          </p>
        </div>
      ))}
    </div>
  );
}

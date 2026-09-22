"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { site } from "@/lib/site";

const UNITS: { key: "days" | "hours" | "minutes" | "seconds"; en: string }[] = [
  { key: "days", en: "Days" },
  { key: "hours", en: "Hours" },
  { key: "minutes", en: "Minutes" },
  { key: "seconds", en: "Seconds" },
];

/** -1 means "not yet known" — the server render, before the clock is live. */
const UNKNOWN = -1;

export default function Countdown() {
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

  const getSnapshot = useCallback(() => snapshot.current, []);
  const getServerSnapshot = useCallback(() => UNKNOWN, []);

  const total = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const live = total !== UNKNOWN;

  const parts = {
    days: Math.floor(total / 86_400),
    hours: Math.floor(total / 3_600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  };

  return (
    /* A four-column grid, not a flex row.
       
       Flexed, each column was only as wide as its own label, so DAYS and
       SECONDS produced different column widths and the numbers above them sat
       at uneven intervals. Equal columns put the digits on a regular beat.
       
       It also used to carry `md:justify-start`, left over from when this act
       had a facade in a left-hand column. That act is a single centred column
       now, so on desktop the clock was the one thing pulled to the left. */
    <div className="mx-auto grid w-full max-w-[26rem] grid-cols-4 items-start gap-2 sm:max-w-[30rem]">
      {UNITS.map(({ key, en }) => (
        <div key={key} className="text-center">
          <p className="font-display text-maroon text-[clamp(2rem,6vw,3.6rem)] leading-none tabular-nums">
            {live ? String(parts[key]).padStart(2, "0") : "––"}
          </p>
          {/* The trailing letter-space that `tracking` adds after the last
              glyph is inside the centred box, which nudges the word visibly
              left of the number above it. Indenting by the same amount puts
              the glyphs back on the column's centre line. */}
          <p className="text-olive/70 mt-3 indent-[0.28em] text-[clamp(0.78rem,1.1vw,0.86rem)] tracking-[0.28em] uppercase">
            {en}
          </p>
        </div>
      ))}
    </div>
  );
}

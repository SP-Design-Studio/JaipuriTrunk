/** Single source of truth for launch-day details. Edit here, nowhere else. */
export const site = {
  name: "JaipuriTrunk",
  /** The edition on show. The first trunk is done; this is the next one. */
  eyebrow: "The second trunk",
  tagline: "Handpicked in Jaipur. Unpacked in Hyderabad.",
  /** When the first trunk was unpacked and opened. */
  firstISO: "2026-11-01T10:00:00+05:30",
  /** ISO 8601. Drives every date on the page and the countdown. The second trunk opens on Sunday 6 December. */
  launchISO: "2026-12-06T10:00:00+05:30",
  city: { from: "Jaipur", to: "Hyderabad" },
  /** Where the two cities are, shown on the route. */
  coords: { from: "26.91° N · 75.79° E", to: "17.39° N · 78.49° E" },
  social: {
    instagram: "https://instagram.com/jaipuri_trunk",
    email: "store@jaipuritrunk.com",
  },
} as const;

/**
 * Feature switches. Flip one, reload — there is nothing else to change.
 *
 * Typed as plain booleans rather than `as const` on purpose: with a literal
 * type TypeScript narrows the off branch to `never` and the guarded markup
 * stops being type-checked, which is how a switch quietly rots while it is off.
 */
export const features: { countdown: boolean } = {
  /** The countdown clock. On: the date is weeks away, which is when a clock reads as anticipation. */
  countdown: true,
};

/** A date in pieces (weekday, day, month, year), in Indian time. */
function partsOf(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).formatToParts(new Date(iso));
  const part = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  return {
    weekday: part("weekday"),
    day: part("day"),
    month: part("month"),
    year: part("year"),
  };
}

/** The launch date in pieces, all derived from `launchISO` so they cannot drift apart. */
export const launch = partsOf(site.launchISO);

/** When the first trunk was unpacked and opened, in pieces. */
export const first = partsOf(site.firstISO);

/** "1 November 2026": when the first trunk was unpacked and opened. */
export const firstLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
})
  .format(new Date(site.firstISO))
  .replace(/ /g, "\u00a0");

/** "6 December 2026", with non-breaking spaces so it wraps as one unit. */
export const launchLabel =
  `${launch.day} ${launch.month} ${launch.year}`.replace(/ /g, " ");

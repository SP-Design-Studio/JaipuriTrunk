/** Single source of truth for launch-day details. Edit here, nowhere else. */
export const site = {
  name: "JaipuriTrunk",
  nameScript: "Jaipuri",
  nameDisplay: "Trunk",
  eyebrow: "Coming Soon",
  tagline: "Handpicked in Jaipur. Unpacked in Hyderabad.",
  /** ISO 8601. Drives `launchLabel`, and the countdown when it is switched on. */
  launchISO: "2026-12-01T10:00:00+05:30",
  city: { from: "Jaipur", to: "Hyderabad" },
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
  /**
   * The countdown clock in Act 5.
   *
   * Off. The component stays in the tree and keeps working — `launchISO` above
   * still feeds it — so this is a switch, not a deletion. Turn it back on
   * nearer the date, when a clock reads as anticipation rather than a year of
   * waiting.
   */
  countdown: false,
};

/** "November 2026" — derived from launchISO so it can never drift out of sync. */
export const launchLabel = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
}).format(new Date(site.launchISO));

export const acts = [
  { id: "arrival", label: "Arrival", sub: "Where it begins" },
  { id: "bazaar", label: "The Bazaar", sub: "What we found" },
  { id: "craft", label: "The Craft", sub: "Whose hands made it" },
  { id: "trunk", label: "The Trunk", sub: "Packed and sealed" },
  { id: "unpacked", label: "Unpacked", sub: "Arriving in Hyderabad" },
] as const;

# JaipuriTrunk — coming soon

A scroll-driven, five-act coming-soon page for a Jaipur-to-Hyderabad import label.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 ·
GSAP + ScrollTrigger · Lenis smooth scroll.

## Running it

```bash
npm run dev
```

## The five acts

| Act | File | Mechanic |
|---|---|---|
| 01 Arrival | `src/components/acts/Act1Arrival.tsx` | Dawn wash, die-cut Hawa Mahal sticker, letter-split logotype reveal, parallax exit |
| 02 The Bazaar | `src/components/acts/Act2Bazaar.tsx` | Pinned section; vertical scroll drives a horizontal product rail |
| 03 The Craft | `src/components/acts/Act3Craft.tsx` | Line-by-line copy reveal, parallax image column |
| 04 The Trunk | `src/components/acts/Act4Trunk.tsx` | Pinned; scroll hinges the trunk lid open and lifts the contents out |
| 05 Unpacked | `src/components/acts/Act5Unpacked.tsx` | Countdown, waitlist form, Charminar skyline |

## Where to edit things

- **Launch date, handles, tagline** — `src/lib/site.ts`. Nothing is hardcoded elsewhere.
- **Products in the rail** — `src/lib/products.ts`.
- **Colours** — `src/app/globals.css`, in the `@theme` block.
- **Images** — see `public/images/README.md` for every slot, its ratio and pixel cap, plus how to re-cut the hero sticker.

## Waitlist

`POST /api/notify` validates the address and hands it to `deliver()`.

Set `NOTIFY_WEBHOOK_URL` (Vercel → Settings → Environment Variables) to a Google
Apps Script, Zapier or Make endpoint and signups POST straight through. With
nothing configured the route still returns 200 and logs the address, so the form
never breaks in front of a visitor. To use Resend/Mailchimp/Supabase instead,
replace the body of `deliver()` in `src/app/api/notify/route.ts`.

## Deploying

Push to GitHub, import the repo in Vercel, accept the defaults. No build
configuration needed. Add `NOTIFY_WEBHOOK_URL` if you want signups delivered.

## Accessibility notes

Motion is deliberate, not decorative — `prefers-reduced-motion` disables Lenis,
the horizontal pin and the parallax, leaving a plain vertical scroll. The
ambient audio never autoplays; it is opt-in via the toggle and fades in.

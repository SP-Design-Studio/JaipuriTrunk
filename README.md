# JaipuriTrunk — Trunk No. 02

A pre-launch page for a Jaipur-to-Hyderabad import label. Trunk No. 01 is done;
Trunk No. 02 opens on 6 December 2026.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 ·
GSAP + ScrollTrigger · Lenis smooth scroll · three.js (React Three Fiber) for the trunk.

## Running it

```bash
npm run dev
```

## The page

Every scene is a full-viewport, scroll-driven screen. Sections in `src/components/sections/`, assembled in `Experience.tsx`. Nothing is
pinned by script: the scene sections use `position: sticky` inside a tall section,
which is what keeps iOS and iPad scrolling reliable.

| Section         | File                  | What it does                                                                                                                                                                                                                                                         |
| --------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero            | `Hero.tsx`            | The monogram is unveiled, then the launch date, a quiet line, and the countdown                                                                                                                                                                                      |
| The first trunk | `Collection.tsx`      | What travelled, by category. The name crossing the middle of the screen drives a framed, sticky stage that shows that piece                                                                                                                                          |
| The craft       | `Craft.tsx`           | One sentence that lights up word by word as it is read, then three captioned photographs                                                                                                                                                                             |
| The trunk       | `Trunk.tsx`           | The 3D trunk. Scrolling packs it piece by piece, turns it toward you and closes the lid. Falls back to a drawing without WebGL. It is warmed on mount, shows a monogram placeholder until the first frame, and an error boundary swaps in the drawing if WebGL fails |
| The route       | `Route.tsx`           | Hawa Mahal to Charminar. The trunk rides a stitched line as you scroll (an arc on wide screens, a straight vertical line on phones)                                                                                                                                  |
| Know before     | `Finale.tsx`          | "Know before the second trunk opens." with countdown and sign-up, then a full-height footer: the wordmark at page width and the credit                                                                                                                               |
| Two dates       | `FirstTrunkIntro.tsx` | A timeline that draws itself from 1 November to 6 December 2026, with a Today marker (computed on the client)                                                                                                                                                        |

Also: `SiteHeader.tsx` (a slim bar after the hero, hidden while the sign-up is on screen),
`Preloader.tsx` (the monogram is unveiled on the maroon, then travels to exactly where the hero's monogram sits while the ground fades, so loader and hero are one object; `?preloader=skip` bypasses it in development), `Cursor.tsx` (a running-stitch
pointer on fine-pointer devices) and a 404 in the same style.

The 3D scene is `src/components/three/TrunkScene.tsx`. It is a separate client chunk,
fetched on idle after first paint, and its render loop is parked while off screen.
The model: a hollow body, a vaulted lid built from one outline (shell, lining and the brass
bands over it all derive from it), riveted bands, corner caps, hasp and lock, end handles,
bun feet, and the monogram inlaid in brass on the crown (drawn from the same path data as
the logo). A warm light inside the trunk fades as the lid shuts, and the camera leans
slightly toward the pointer.

The first version (five pinned acts) is kept for reference in
`design-sources/retired-code/v1-scroll-acts/` and is excluded from the build.

## Brand and design system

- **Logos**: `src/components/Logo.tsx` exports `Wordmark` and `Monogram`, built from the
  supplied SVGs (the originals are in `public/images/brand/`). They fill with
  `currentColor`, so the same file works on maroon, cream or orange. The favicon is
  `src/app/icon.svg`.
- **Colour** (`src/app/globals.css`, `@theme`): sampled from the logo artwork. Maroon
  `#801834`, orange `#f49b49` (`marigold`), plus cream and paper. Orange is the only accent.
  The 3D trunk's materials in `TrunkScene.tsx` are tuned brighter than the brand values on
  purpose: lighting darkens them back to the logo's maroon on screen.
- **Type**: The Seasons for display (Light for headings, the date and numerals; Regular as the fallback), Jost for text. The site uses no italics. The files are in
  `public/fonts/the-seasons/` and loaded in `src/lib/fonts.ts`. The logos carry the brand lettering, so
  there is no script font. `.display`, `.label` and `.tnum` are the named styles.
- **Cream**: `--color-cream` is a true cream (`#f4e8d3`), used for text on the maroon and for the page, so
  nothing reads as white. `--color-paper` is a step deeper.
- **Motion**: ease-out-expo for reveals, scrubbed scroll for the craft, trunk and route.
  With `prefers-reduced-motion`, nothing is scrubbed or revealed: the trunk and route show
  finished, and all text is simply there.
- **Performance rules** (keep these, the page is built to scroll at 60fps):
  - No `backdrop-filter` / `backdrop-blur` (it re-blurs everything beneath it every frame, including the
    live 3D canvas).
  - No `mix-blend-mode` on large overlays, and no SVG filters (`feTurbulence`, displacement) on big
    layers. Texture is a pre-baked bitmap: `public/images/texture/grain-dark.png` and `grain-light.png`
    (about 22 KB each), used by `.u-grain` (sections) and `.paper-card` (the collection card).
  - The card's torn edge is a static `clip-path` and its shadow a plain `box-shadow`.
  - In the 3D scene: pixel ratio capped at 1.5, a 256px floor shadow, few shadow casters, and the
    render loop only runs while the trunk is within a quarter of a screen.
  - Anything that animates every frame (the cursor, the route) stops writing to the DOM when idle or
    off screen.
- **Spacing**: one scale in `globals.css` (`--space-1` to `--space-4`, `--space-section`, plus `--gutter`),
  in width-based units so the rhythm is the same on a short laptop and a tall monitor. Use these, not
  `svh` or ad-hoc rem values, for gaps and section padding. The hero's top and bottom edges equal the
  side gutter, so its corners line up.
- **Titles, not eyebrows**: no small tracked-caps labels above headings. The name of a section is its
  title (a heading in The Seasons). `.label` is for functional text only: buttons, nav, countdown units.
- **No italics** anywhere.
- **No numbering**: the page deliberately has no counters, indexes or figure numbers.

## Where to edit things

- **Launch date, edition (Trunk No.), handles, tagline** — `src/lib/site.ts`. The date, the
  countdown and every "opens on…" line read from `launchISO`. The countdown is on
  (`features.countdown`).
- **Pieces shown** — `src/lib/products.ts`. Pieces with a photo get the stage and are packed
  into the 3D trunk; pieces without one still get a line.
- **Colours** — `src/app/globals.css`, in the `@theme` block.
- **Images** — see `public/images/README.md` for every slot, its ratio and pixel cap.

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
the scrubbed animations and the parallax, leaving a plain vertical scroll.

import type { Metadata } from "next";
import Link from "next/link";
import { AssetProvider } from "@/components/AssetProvider";
import Charminar from "@/components/Charminar";
import Cursor from "@/components/Cursor";
import HawaMahal from "@/components/HawaMahal";
import JourneyThread from "@/components/JourneyThread";
import { existingImagePaths } from "@/lib/assets";
import { site } from "@/lib/site";

/**
 * The 404.
 *
 * `not-found.tsx` at the app root catches every unmatched URL for the whole
 * site, not just `notFound()` calls, so this one file is the entire job. The
 * experimental `global-not-found.js` exists for apps with several root layouts
 * or a dynamic root segment; this app has one static root layout, so it would
 * buy nothing and cost the fonts and styles it makes you re-import by hand.
 *
 * Built on Act 1's skeleton — a copy band that centres in what is left, above a
 * map band of fixed height — so a wrong URL lands somewhere recognisably this
 * site rather than on a plain centred paragraph.
 *
 * The `AssetProvider` is not optional scaffolding. `useHasAsset` defaults to an
 * empty Set, so the facades and the trunk render nothing at all outside it:
 * dropping them onto a page without the provider silently yields blank space.
 * `existingImagePaths()` reads the filesystem, which is fine here because this
 * route prerenders as static.
 *
 * Next injects `<meta name="robots" content="noindex">` on anything returning
 * 404, so there is nothing to add for search engines.
 *
 * The `metadata` export below is documented for `global-not-found` rather than
 * for this file, so it was checked rather than assumed: the served page's title
 * is "Not found — JaipuriTrunk", not the layout's. If a Next upgrade ever drops
 * it the page still renders, it just inherits the site title again.
 */
export const metadata: Metadata = {
  title: `Not found — ${site.name}`,
};

/** Matches Act 1's facades, a size down: the copy above them is smaller. */
const FACADE = "w-[min(20vw,340px,30svh)] shrink-0";

export default function NotFound() {
  return (
    <AssetProvider paths={existingImagePaths()}>
      <main className="u-grain bg-cream relative flex min-h-[100svh] flex-col justify-center overflow-hidden py-[6svh]">
        {/* The seam follows the pointer everywhere else on the site; a dead end
            is still the site. */}
        <Cursor />

        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          <p className="text-olive/70 text-[clamp(0.78rem,1.15vw,0.9rem)] tracking-[0.3em] uppercase">
            Error 404
          </p>

          <h1 className="font-display text-maroon mt-6 text-[clamp(2.2rem,6vw,4rem)] leading-[1.05]">
            Not on this trunk
          </h1>

          <div className="bg-maroon/20 my-7 h-px w-16" />

          <p className="text-ink/70 max-w-[44ch] text-[clamp(1rem,2vw,1.15rem)] leading-relaxed font-light">
            This page did not travel with us. Nothing is missing from the shop
            either, because the shop has not opened yet.
          </p>

          <Link
            href="/"
            className="border-maroon/30 text-maroon hover:border-maroon hover:bg-maroon hover:text-cream mt-9 inline-flex min-h-11 items-center border px-7 text-[clamp(0.78rem,1.2vw,0.92rem)] tracking-[0.3em] uppercase transition-colors"
          >
            Back to the start
          </Link>
        </div>

        {/* The same two cities and the same route between them. The trunk is
            still running: it is the address that was wrong, not the journey.

            Both bands sit in normal flow and `main` centres the pair, rather
            than the copy centring inside a band of its own. Given a band the
            copy floated in the middle of it, leaving 156px of nothing between
            the button and the facades; here the gap is the margin below and
            nothing else. */}
        <div className="pointer-events-none mt-[7svh] hidden items-end justify-between gap-[1vw] px-[4vw] md:flex">
          <div className={`aspect-[1968/1378] ${FACADE}`}>
            <HawaMahal className="h-full w-full" />
          </div>
          <JourneyThread className="relative mb-[6svh] aspect-5/1 min-w-0 flex-1" />
          <div className={`aspect-[1124/1287] ${FACADE}`}>
            <Charminar className="h-full w-full" />
          </div>
        </div>

        {/* Phones stack it, the way the hero does. The route needs a definite
            height here: in a column with no fixed parent, `flex-1` has nothing
            to divide. */}
        <div className="pointer-events-none mt-[5svh] flex flex-col items-center gap-[1.5svh] md:hidden">
          <div className="aspect-[1968/1378] h-[13svh] shrink-0">
            <HawaMahal className="h-full w-full" />
          </div>
          <JourneyThread
            vertical
            className="relative aspect-1/5 h-[14svh] shrink-0"
          />
          <div className="aspect-[1124/1287] h-[13svh] shrink-0">
            <Charminar className="h-full w-full" />
          </div>
        </div>
      </main>
    </AssetProvider>
  );
}

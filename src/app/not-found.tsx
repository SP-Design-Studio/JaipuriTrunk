import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { site } from "@/lib/site";

/**
 * The 404. `not-found.tsx` at the app root catches every unmatched URL for the
 * whole site, so this one file is the entire job. Next adds noindex itself on
 * anything that returns 404.
 */
export const metadata: Metadata = {
  title: `Not found — ${site.name}`,
};

export default function NotFound() {
  return (
    <main className="u-grain u-grain-dark bg-maroon text-cream relative flex min-h-[100svh] flex-col justify-between overflow-hidden px-[var(--gutter)] pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Link
        href="/"
        aria-label={`${site.name}, home`}
        className="page-rise block w-fit"
      >
        <Wordmark className="text-marigold h-[1.1rem] w-auto" />
      </Link>

      <div>
        <h1
          style={{ "--d": "0.15s" } as React.CSSProperties}
          className="page-rise display text-[clamp(3.4rem,13vw,12rem)] leading-[0.9] tracking-[-0.035em]"
        >
          Not on
          <br />
          this trunk.
        </h1>
        <p
          style={{ "--d": "0.35s" } as React.CSSProperties}
          className="page-rise text-cream/75 mt-[var(--space-2)] max-w-[40ch] text-[clamp(1.05rem,1.5vw,1.25rem)] leading-relaxed font-light"
        >
          This page did not travel with us (error 404). The shop has not opened
          yet, so nothing else is missing.
        </p>
        <Link
          href="/"
          style={{ "--d": "0.5s" } as React.CSSProperties}
          className="page-rise label bg-cream text-maroon hover:bg-marigold mt-[var(--space-3)] inline-flex min-h-12 items-center px-7 transition-colors"
        >
          Back to the start
        </Link>
      </div>

      <p
        style={{ "--d": "0.7s" } as React.CSSProperties}
        className="page-rise label text-cream/55"
      >
        {site.name} · {site.city.from} to {site.city.to}
      </p>
    </main>
  );
}

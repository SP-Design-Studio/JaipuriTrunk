"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useAssets } from "@/components/AssetProvider";
import StallGallery from "@/components/StallGallery";
import { site } from "@/lib/site";
import { trunks, trunksSection } from "@/lib/trunks";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** How far along the road from the first trunk to the second we are today, 0 to 1. */
function todayFraction() {
  const a = Date.parse(site.firstISO);
  const b = Date.parse(site.launchISO);
  const f = (Date.now() - a) / (b - a);
  // Rounded so the value is stable between reads, as useSyncExternalStore needs.
  return Math.round(Math.min(1, Math.max(0, f)) * 1000) / 1000;
}
const subscribe = () => () => {};

type Pieces = { day: string; month: string; year: string };

/** One date, set large: the day as a numeral, the month and year beside it. */
function DateBlock({
  d,
  title,
  note,
  right = false,
  className,
  action,
}: {
  d: Pieces;
  title: string;
  note: string;
  right?: boolean;
  className: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`${className} ${right ? "text-right" : ""}`}>
      <div
        className={`flex items-end gap-[var(--space-1)] ${right ? "justify-end" : ""}`}
      >
        <span className="display tnum text-[clamp(4rem,9.5vw,8.5rem)] leading-[0.82] tracking-[-0.03em]">
          {d.day}
        </span>
        <span className="display pb-[0.2em] text-left text-[clamp(1rem,1.9vw,1.7rem)] leading-[1.15]">
          {d.month}
          <br />
          {d.year}
        </span>
      </div>
      <p className="display mt-[var(--space-2)] text-[clamp(1.15rem,1.8vw,1.55rem)]">
        {title}
      </p>
      <p className="text-ink/65 mt-1 text-[clamp(0.9rem,1.1vw,1rem)] leading-relaxed font-light">
        {note}
      </p>
      {action}
    </div>
  );
}

/** A small steam locomotive in side view, facing right, with smoke from the stack. */
function Engine({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 -34 120 98"
      className={`overflow-visible ${className ?? ""}`}
      aria-hidden="true"
    >
      <g fill="currentColor">
        <circle className="d-puff" cx="92" cy="2" r="5" />
        <circle
          className="d-puff"
          cx="92"
          cy="2"
          r="5"
          style={{ animationDelay: "0.8s" }}
        />
        <circle
          className="d-puff"
          cx="92"
          cy="2"
          r="5"
          style={{ animationDelay: "1.6s" }}
        />
      </g>
      {/* Cowcatcher, boiler, stack, dome, cab, chassis. */}
      <g fill="currentColor">
        <polygon points="102,57 119,64 102,64" />
        <rect x="34" y="26" width="68" height="24" rx="7" />
        <polygon points="87,26 88.5,13 84,9 100,9 95.5,13 97,26" />
        <path d="M54 26 Q62 12 70 26 Z" />
        <rect x="8" y="14" width="30" height="40" rx="2" />
        <rect
          x="6"
          y="9"
          width="36"
          height="6"
          rx="1"
          className="text-marigold"
        />
        <rect x="8" y="50" width="94" height="6" />
      </g>
      <rect
        x="15"
        y="20"
        width="16"
        height="13"
        rx="1"
        fill="var(--color-cream)"
      />
      <g fill="var(--color-marigold)">
        <rect x="50" y="26" width="2.5" height="24" />
        <rect x="76" y="26" width="2.5" height="24" />
      </g>
      {/* Wheels and the rod between them. */}
      <g fill="var(--color-cream)" stroke="currentColor" strokeWidth="3">
        <circle cx="44" cy="53" r="9.5" />
        <circle cx="66" cy="53" r="9.5" />
        <circle cx="88" cy="53" r="9.5" />
        <circle cx="103" cy="58.5" r="4.5" strokeWidth="2.5" />
      </g>
      <line
        x1="44"
        y1="53"
        x2="88"
        y2="53"
        stroke="var(--color-marigold)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <g fill="var(--color-marigold)">
        <circle cx="44" cy="53" r="2.2" />
        <circle cx="66" cy="53" r="2.2" />
        <circle cx="88" cy="53" r="2.2" />
      </g>
    </svg>
  );
}

/**
 * The first screen of the first trunk, and the two dates that matter: when it was
 * unpacked and opened, and when the second opens. Set as a timeline that draws
 * itself as you scroll, with a marker for today between them. The scene is sticky
 * inside a tall section, so scroll drives it and nothing is pinned by script.
 */
export default function FirstTrunkIntro() {
  const root = useRef<HTMLDivElement>(null);
  const today = useSyncExternalStore(subscribe, todayFraction, () => null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const assets = useAssets();
  // Only photographs that are actually in /public are shown.
  const photosOf = (t: (typeof trunks)[number]) =>
    t.photos.filter((p) => assets.has(p.src));
  const n = trunks.length;
  // Whole minutes, so the value is stable between reads. Server snapshot 0: nothing has opened.
  const nowMin = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 60000),
    () => 0,
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set([".d-title", ".d-item"], { opacity: 0, y: 36 });
        gsap.set(".d-engine", { opacity: 0, left: "0%" });
        gsap.set(".d-today", { opacity: 0 });
        gsap.set(".d-fill, .d-track", { scaleX: 0 });
        gsap.set(".d-node", { scale: 0 });

        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.6,
            },
          })
          .to(".d-title", { opacity: 1, y: 0, duration: 1 }, 0)
          .to(".d-node-1", { scale: 1, duration: 0.3 }, 0.7)
          // The road is laid after the title, from the first trunk outward.
          .to(".d-track", { scaleX: 1, duration: 0.9 }, 0.8)
          .to(".d-item-0", { opacity: 1, y: 0, duration: 1 }, 0.8)
          // The engine leaves the first trunk and pulls the line behind it as far as
          // today; the second trunk only appears once it has arrived.
          .to(".d-engine", { opacity: 1, duration: 0.3 }, 1.3)
          .to(".d-fill", { scaleX: 1, duration: 2.2 }, 1.5)
          .to(
            ".d-engine",
            { left: `${(today ?? 0) * 100}%`, duration: 2.2 },
            1.5,
          )
          .to(".d-today", { opacity: 1, duration: 0.4 }, 3.7)
          .to(".d-node-2", { scale: 1, duration: 0.4 }, 4.0)
          .to(".d-item-last", { opacity: 1, y: 0, duration: 1 }, 4.1)
          .to({}, { duration: 1.4 });

        // Leaving: once the scene unpins, it lifts and fades as it scrolls away.
        gsap.to(".d-wrap", {
          opacity: 0,
          y: -70,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "bottom bottom",
            end: "bottom 38%",
            scrub: true,
          },
        });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [today] },
  );

  return (
    <div ref={root} className="relative h-[260svh] motion-reduce:h-auto">
      <div className="sticky top-0 flex h-[100svh] items-center motion-reduce:static motion-reduce:min-h-[100svh] motion-reduce:py-[var(--space-section)]">
        <div className="d-wrap mx-auto w-full max-w-[1600px] px-[var(--gutter)]">
          <h2 className="d-title display text-[clamp(3rem,9vw,8rem)] leading-[0.95]">
            {trunksSection.title}
          </h2>

          <div className="mt-[var(--space-4)]">
            {/* The road between the two dates, drawn as you scroll. */}
            <div className="relative h-px" aria-hidden="true">
              <div className="d-track bg-maroon/20 absolute inset-0 origin-left" />
              <div
                className="d-fill from-maroon to-marigold absolute inset-y-0 left-0 origin-left bg-gradient-to-r"
                style={{ width: `${(today ?? 0) * 100}%` }}
              />
              <span className="d-node d-node-1 bg-maroon absolute top-1/2 left-0 size-3.5 -translate-y-1/2 rounded-full" />
              <span className="d-node d-node-2 border-marigold bg-cream absolute top-1/2 right-0 size-3.5 -translate-y-1/2 rounded-full border-2" />
              {/* The steam engine marks today. It rides the line as you scroll. */}
              <span
                className="d-engine absolute bottom-0 -translate-x-1/2"
                style={{ left: `${(today ?? 0) * 100}%` }}
              >
                <Engine className="text-maroon block w-[clamp(3.8rem,7vw,6.4rem)]" />
                <span className="d-today text-maroon/70 absolute top-full left-1/2 mt-2.5 -translate-x-1/2 text-xs whitespace-nowrap">
                  {trunksSection.today}
                </span>
              </span>
            </div>

            <div
              className="mt-[var(--space-3)] grid gap-[var(--space-3)]"
              style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
            >
              {trunks.map((t, i) => {
                return (
                  <DateBlock
                    key={t.slug}
                    className={`d-item d-item-${i === n - 1 ? "last" : i}`}
                    d={t.date}
                    title={t.name}
                    note={t.note}
                    right={i === n - 1 && n > 1}
                    action={
                      Date.parse(t.iso) <= nowMin * 60000 && (
                        <button
                          type="button"
                          onClick={() => setOpenSlug(t.slug)}
                          className="label border-maroon/40 hover:bg-maroon hover:text-cream mt-[var(--space-2)] min-h-11 border px-5 transition-colors"
                        >
                          {trunksSection.galleryButton}
                        </button>
                      )
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {trunks.map((t) => (
        <StallGallery
          key={t.slug}
          title={t.galleryTitle}
          photos={photosOf(t)}
          open={openSlug === t.slug}
          onClose={() => setOpenSlug((c) => (c === t.slug ? null : c))}
        />
      ))}
    </div>
  );
}

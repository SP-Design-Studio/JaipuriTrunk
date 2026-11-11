"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import { useHasAsset } from "@/components/AssetProvider";
import { Monogram } from "@/components/Logo";
import { categories } from "@/lib/products";
import { leave, reveal } from "@/lib/motion";
import FirstTrunkIntro from "./FirstTrunkIntro";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Row = {
  id: string;
  name: string;
  category: string;
  blurb: string;
  /** First row of its category: the one that carries the category heading. */
  first: boolean;
  src?: string;
};

/**
 * A slightly uneven, hand-torn edge as a clip-path polygon, in percent so it scales
 * with the card. Generated once from a fixed seed (the same on server and client).
 */
function deckle(seed: number): string {
  let a = seed;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const jx = () => (rand() - 0.5) * 0.7; // across a long edge, in % of width
  const jy = () => (rand() - 0.5) * 0.5; // and of height
  const pts: string[] = [];
  const steps = 36;
  for (let i = 0; i <= steps; i++)
    pts.push(`${(i / steps) * 100}% ${0.15 + jy()}%`);
  for (let i = 1; i <= steps; i++)
    pts.push(`${99.85 + jx()}% ${(i / steps) * 100}%`);
  for (let i = steps - 1; i >= 0; i--)
    pts.push(`${(i / steps) * 100}% ${99.85 + jy()}%`);
  for (let i = steps - 1; i >= 1; i--)
    pts.push(`${0.15 + jx()}% ${(i / steps) * 100}%`);
  return `polygon(${pts.join(", ")})`;
}
const DECKLE_TOP = deckle(7);
const DECKLE_BACK = deckle(31);

/** A small, repeatable lean per piece, so the stage is never a stack of upright rectangles. */
const LEAN = [-5, 4, -3, 6, -6, 3, -4, 5, -2, 4, -5];

/**
 * What travelled in the first trunk. The name crossing the middle of the screen
 * is the active one, and the stage beside it shows that piece. The stage is
 * `position: sticky`, so nothing is pinned by script and a phone's toolbar
 * changing the viewport height cannot disturb it.
 *
 * Pieces without a photograph yet still get a line; the stage shows their name.
 */
export default function Collection() {
  const rows = useMemo<Row[]>(
    () =>
      categories.flatMap((c) =>
        c.items.map((item, i) => ({
          id: item.id,
          name: item.name,
          category: c.title,
          blurb: c.blurb,
          first: i === 0,
          src: item.src,
        })),
      ),
    [],
  );

  const [active, setActive] = useState(rows[0].id);
  const list = useRef<HTMLOListElement>(null);
  const root = useRef<HTMLElement>(null);

  // The row crossing a line near the middle of the viewport is the active one.
  // Higher up on a phone, where the stage covers the top of the screen.
  useEffect(() => {
    const items = Array.from(
      list.current?.querySelectorAll("[data-row]") ?? [],
    );
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting)
            setActive((e.target as HTMLElement).dataset.row!);
      },
      { rootMargin: narrow ? "-62% 0px -36% 0px" : "-46% 0px -46% 0px" },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Each row rises in as it arrives and lifts away as it leaves.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils
          .toArray<HTMLElement>("[data-row]")
          .forEach((row) => reveal(row, { from: { y: 36 }, start: "top 92%" }));

        // The card arrives with the list and, at the end, gives way as it scrolls off.
        const card = root.current?.querySelector<HTMLElement>(".l-card");
        if (card && root.current) {
          reveal(card, {
            from: { y: 60, scale: 0.97 },
            to: { y: 0, scale: 1 },
            start: "top 88%",
            exit: false,
            duration: 1.5,
          });
          leave(card, root.current, {
            start: "bottom bottom",
            end: "bottom 40%",
            to: 0.2,
            lift: -5,
          });
        }
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const current = rows.find((r) => r.id === active) ?? rows[0];

  return (
    <section
      ref={root}
      id="first-trunk"
      className="bg-cream text-maroon relative"
    >
      <FirstTrunkIntro />

      <div className="mx-auto grid max-w-[1600px] px-[var(--gutter)] md:grid-cols-12 md:gap-x-[2vw]">
        {/* The stage. Sticky: from the top of a phone, centred on a desktop. */}
        <div className="bg-cream sticky top-[calc(3rem+env(safe-area-inset-top))] z-10 -mx-[var(--gutter)] px-[var(--gutter)] pt-2 pb-3 md:static md:col-span-6 md:col-start-7 md:row-start-1 md:mx-0 md:bg-transparent md:p-0">
          <div className="md:sticky md:top-[7svh]">
            <div className="l-card relative h-[40svh] md:h-[82svh]">
              {/* Two sheets of handmade card, the lower one a little askew, so it
                  reads as stock with thickness. Matte, with a barely-there tooth.
                  The edge is a static clip-path and the shadow a plain box-shadow:
                  nothing here is filtered or repainted as you scroll. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rotate-[0.3deg]"
                style={{
                  boxShadow:
                    "0 22px 36px -16px rgba(70, 35, 22, 0.3), 0 4px 10px rgba(70, 35, 22, 0.1)",
                }}
              />
              <div
                aria-hidden="true"
                className="paper-card absolute inset-0 translate-x-[5px] translate-y-[4px] -rotate-[1deg]"
                style={{ clipPath: DECKLE_BACK, backgroundColor: "#eadcc8" }}
              />
              <div
                aria-hidden="true"
                className="paper-card absolute inset-0 rotate-[0.3deg]"
                style={{ clipPath: DECKLE_TOP }}
              />
              {/* A foil-stamped hairline, pressed into the card: the orange line
                  with a light edge below it and a faint shadow above. */}
              <div
                aria-hidden="true"
                className="border-marigold/70 pointer-events-none absolute inset-3.5 z-10 rotate-[0.35deg] border md:inset-6"
                style={{
                  boxShadow:
                    "0 1px 0 rgba(255,244,224,0.7), inset 0 1px 0 rgba(110,60,30,0.16)",
                }}
              />
              <Monogram className="text-maroon/40 absolute top-7 left-1/2 h-14 w-auto -translate-x-1/2 md:top-12 md:h-24" />

              {rows.map((r, i) => (
                <StageItem
                  key={r.id}
                  row={r}
                  on={r.id === active}
                  lean={LEAN[i % LEAN.length]}
                />
              ))}

              <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-6 text-center md:pb-9">
                <p className="display text-[clamp(1.25rem,2vw,1.75rem)]">
                  {current.name}
                </p>
                <p className="text-maroon/60 mt-1 text-sm">
                  {current.category}
                </p>
              </div>
            </div>
          </div>
        </div>

        <ol
          ref={list}
          className="md:col-span-6 md:col-start-1 md:row-start-1 md:pr-[4vw]"
        >
          {rows.map((r) => (
            <li
              key={r.id}
              data-row={r.id}
              className="flex min-h-[19svh] flex-col justify-center md:min-h-[26svh]"
            >
              {r.first && (
                <div className="mb-[var(--space-2)] max-w-[36ch]">
                  <h3 className="display text-[clamp(1.5rem,2.3vw,2rem)] leading-tight">
                    {r.category}
                  </h3>
                  <p className="text-ink/60 mt-[var(--space-1)] text-[clamp(0.95rem,1.2vw,1.05rem)] leading-relaxed font-light">
                    {r.blurb}
                  </p>
                </div>
              )}
              <div
                className={`flex items-center gap-4 transition-[opacity,transform] duration-700 ease-[var(--ease-expo)] md:gap-5 ${
                  r.id === active
                    ? "translate-x-0 opacity-100"
                    : "translate-x-2 opacity-30"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`bg-marigold h-px w-6 shrink-0 origin-left transition-transform duration-700 ease-[var(--ease-expo)] ${
                    r.id === active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
                <span className="display text-[clamp(1.7rem,4vw,3.4rem)]">
                  {r.name}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="h-[var(--space-section)]" />
    </section>
  );
}

/** One piece on the stage. All of them stay mounted and cross-fade, so nothing loads mid-scroll. */
function StageItem({ row, on, lean }: { row: Row; on: boolean; lean: number }) {
  const present = useHasAsset(row.src ?? "");

  // No photograph yet: the card shows only its monogram and the name beneath it.
  if (!row.src || !present) return null;

  return (
    <div
      aria-hidden={!on}
      className="absolute inset-0 p-[10%] pt-[28%] pb-[20%] transition-[opacity,transform] duration-[900ms] ease-[var(--ease-expo)]"
      style={{
        opacity: on ? 1 : 0,
        transform: on
          ? `rotate(${lean}deg) scale(1)`
          : `rotate(${lean - 4}deg) scale(0.93)`,
      }}
    >
      <div className="relative h-full w-full">
        <Image
          src={row.src}
          alt={on ? row.name : ""}
          fill
          sizes="(max-width: 768px) 90vw, 46vw"
          className="object-contain"
          style={{
            filter: on ? "drop-shadow(0 18px 24px rgba(36,26,29,0.2))" : "none",
          }}
        />
      </div>
    </div>
  );
}

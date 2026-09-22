"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Charminar from "@/components/Charminar";
import HawaMahal from "@/components/HawaMahal";
import JourneyThread from "@/components/JourneyThread";
import { launchLabel, site } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Act1Arrival({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);

  /**
   * Park the hero at its start state the moment it mounts, behind the
   * preloader. Without this the curtain lifts on a fully-formed hero, and the
   * intro then snaps everything back to the start and replays it.
   */
  useGSAP(
    () => {
      gsap.set(".a1-city", { y: 44, opacity: 0 });
      gsap.set(".a1-thread", { opacity: 0 });
      gsap.set(".a1-letter", { yPercent: 115 });
      gsap.set(".a1-rule", { scaleX: 0 });
      gsap.set(".a1-fade", { y: 18, opacity: 0 });
    },
    { scope: root },
  );

  useGSAP(
    () => {
      if (!ready) return;

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .to(".a1-letter", {
          yPercent: 0,
          duration: 1.1,
          stagger: 0.035,
          ease: "power4.out",
        })
        .to(
          ".a1-rule",
          { scaleX: 1, duration: 1, ease: "power3.inOut" },
          "-=0.7",
        )
        .to(
          ".a1-fade",
          { y: 0, opacity: 1, duration: 0.9, stagger: 0.12 },
          "-=0.75",
        )
        // The route draws itself last: both ends have to exist before a line
        // between them means anything.
        .to(
          ".a1-thread",
          { opacity: 1, duration: 1.1, ease: "power2.out" },
          "-=0.5",
        );

      /**
       * The facades reveal on their own trigger rather than on the intro's
       * clock, which is what was making them arrive limply.
       *
       * `.a1-city` matches four elements, because both layouts are mounted and
       * CSS shows one. A stagger across that set spent its first 0.36s
       * animating the copy nobody can see, so on desktop the two visible
       * facades came up half a second after everything else for no reason a
       * viewer could perceive. And on a short window they sit below the fold
       * at load, where a reveal on a timer plays to an empty room.
       *
       * A ScrollTrigger fixes both: it fires at once when the facade is
       * already on screen and waits when it is not.
       */
      const revealFacades = () => {
        gsap.utils.toArray<HTMLElement>(".a1-city").forEach((city, i) => {
          if (!city.offsetParent) {
            // The layout CSS is hiding this copy. Park it at its end state so
            // the moment it does become visible it is already revealed.
            gsap.set(city, { y: 0, opacity: 1 });
            return;
          }
          gsap.set(city, { y: 44, opacity: 0 });
          gsap.to(city, {
            y: 0,
            opacity: 1,
            duration: 1.5,
            // Jaipur lands, then Hyderabad — the same west-to-east order the
            // whole page is told in.
            delay: i % 2 === 0 ? 0 : 0.18,
            ease: "power2.out",
            scrollTrigger: { trigger: city, start: "top 92%", once: true },
          });
        });
      };

      // Run once per breakpoint rather than once per mount. `offsetParent` only
      // tells you which layout is live right now, so read at mount it pins the
      // reveal to whatever width the page happened to load at — see the note in
      // JourneyThread. Registering the same builder under both queries makes
      // GSAP rebuild it whenever the layout actually changes.
      const mm = gsap.matchMedia();
      mm.add("(max-width: 767px)", revealFacades);
      mm.add("(min-width: 768px)", revealFacades);

      // Parallax rides yPercent, deliberately a different transform channel
      // from the intro's y, so the two can never fight over the same value.
      //
      // `invalidateOnRefresh` is what keeps a resize honest. The hero is sized
      // in svh, so its height changes when the window does, and without this
      // the scrub kept the progress it had at the old height: resizing an
      // already-loaded page left the copy stranded at opacity 0, translated
      // -285px, while the scroll position was still 0. Nothing was wrong with
      // the layout — the hero's words had simply been parallaxed away and
      // never came back.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom top",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })
        .to(".a1-copy", { yPercent: -55, opacity: 0, ease: "none" }, 0)
        .to(".a1-city", { yPercent: 14, ease: "none" }, 0)
        .to(".a1-thread", { yPercent: 22, opacity: 0, ease: "none" }, 0);

      return () => mm.revert();
    },
    { scope: root, dependencies: [ready] },
  );

  return (
    <section
      ref={root}
      id="arrival"
      className="u-grain relative flex h-[100svh] flex-col overflow-hidden bg-cream"
    >
      {/* Copy */}
      <div className="a1-copy relative z-10 flex shrink-0 grow basis-auto flex-col items-center justify-center px-6 py-[2svh] text-center">
        {/* The status, not the wordmark, is what a first-time visitor needs to
            read first — this is a pre-launch page, and "coming soon" is the
            whole message. It used to be a ~1rem eyebrow against a wordmark up
            to 9rem, so the eye went straight past it. Now it is roughly a
            third of the wordmark's size: still subordinate to the brand, but
            large enough to land on first.

            The date moved onto its own line beneath. At this size the old
            single row ran wider than a phone screen once tracking was added. */}
        <div className="a1-fade mb-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-maroon/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-maroon" />
            </span>
            <span className="font-display text-maroon text-[clamp(1.25rem,4.4vw,3rem)] leading-none tracking-[0.28em] uppercase">
              {site.eyebrow}
            </span>
          </div>
          <span className="font-display text-maroon/65 text-[clamp(0.78rem,1.6vw,1rem)] tracking-[0.3em] uppercase">
            {launchLabel}
          </span>
        </div>

        <h1 className="flex select-none flex-wrap items-baseline justify-center leading-[0.9]">
          <span className="sr-only">{site.name}</span>
          <span aria-hidden className="flex overflow-hidden pb-3">
            {site.nameScript.split("").map((c, i) => (
              <span
                key={`s${i}`}
                className="a1-letter font-script text-maroon inline-block text-[clamp(3.2rem,13vw,9rem)]"
              >
                {c}
              </span>
            ))}
          </span>
          <span aria-hidden className="flex overflow-hidden pb-3 pl-[0.3em]">
            {site.nameDisplay.split("").map((c, i) => (
              <span
                key={`d${i}`}
                className="a1-letter font-display text-olive inline-block text-[clamp(2.6rem,10vw,7rem)] tracking-[0.14em]"
              >
                {c}
              </span>
            ))}
          </span>
        </h1>

        <div className="a1-rule mt-4 h-px w-[min(280px,55vw)] origin-center bg-maroon/25" />

        <p className="a1-fade text-ink/70 mt-5 max-w-md text-[clamp(1rem,2.4vw,1.15rem)] leading-relaxed font-light">
          {site.tagline}
        </p>

        <p className="a1-fade text-maroon/50 mt-3 text-[clamp(0.78rem,1.15vw,0.9rem)] tracking-[0.4em] uppercase">
          {site.city.from} &nbsp;to&nbsp; {site.city.to}
        </p>
      </div>

      {/* The map fills whatever the copy leaves, rather than being anchored to
          the viewport bottom independently. Three separately-positioned
          absolute elements drifted apart as the window grew: the copy stayed
          at the top, the cities stayed at the bottom, and the hero opened a
          dead band down the middle.

          The cities are sized by HEIGHT against this row, so they shrink on a
          short window instead of colliding with the copy, and grow on a tall
          one instead of stranding it. */}
      {/* The map band is a fixed share of the viewport and the copy takes what
          is left, centred in it.

          The copy used to be pinned to the top with the map band growing to
          fill everything under it. That put 54px of air above the copy and
          251px below it at 1920x1080 — a quarter of the screen of nothing in
          the middle of the hero, with the words crushed against the ceiling.
          Giving the band a height and letting the copy centre in the remainder
          balances the two without touching the facades or the route.

          `shrink-0` on the copy matters on phones, where the wordmark wraps and
          the copy is taller than its share: it overflows into the band rather
          than being squashed, and the section clips rather than overlapping. */}
      <div className="pointer-events-none relative h-[62svh] shrink-0 md:h-[52svh]">
        {/* Phones stack the journey: Jaipur at the top, Hyderabad at the
            bottom, the route running down between them. Side by side on a
            narrow screen the two facades were tiny and the route had barely a
            hop to travel, which is the one thing it exists to show. */}
        <div className="absolute inset-0 flex flex-col items-center justify-between py-[2svh] md:hidden">
          <div className="a1-city h-[19svh] aspect-[1968/1378] shrink-0">
            <HawaMahal className="h-full w-full" />
          </div>

          {/* Same reasoning as the md+ row: the route is a flex child between
              the two facades, so it spans the gap they leave instead of
              guessing at it. Centred absolutely at a fixed 34svh it was 297px
              long in a 35px gap and ran straight through both buildings. */}
          <JourneyThread
            vertical
            className="a1-thread relative aspect-1/5 min-h-0 flex-1"
          />

          <div className="a1-city h-[19svh] aspect-[1124/1287] shrink-0">
            <Charminar className="h-full w-full" />
          </div>
        </div>

        {/* From md: up there is room to read it as a map, west to east.

            The route is a flex item between the two facades, not a lane of its
            own. Positioned absolutely it had to guess how much room they left
            it, and a fixed 66vw guessed wrong — 1313px of lane for a 750px
            gap, so the line ran 400px into Hawa Mahal and 160px into the
            Charminar and crossed both stickers. As a flex child it spans
            whatever the gap actually is, at any width, with no number to keep
            in sync.

            Still sized by WIDTH at the viewBox's own 5:1 aspect, never by
            height: preserveAspectRatio meet fits the drawing inside its box, so
            a short wide container letterboxes it and the route stops short of
            Hyderabad. */}
        <div className="absolute inset-x-[4vw] bottom-[5svh] hidden items-end justify-between gap-[1vw] md:flex">
          {/* Both facades are the same WIDTH here, not the same height.

              Equal heights and a centred trunk cannot both be true. The two
              buildings have very different aspect ratios — Hawa Mahal is a wide
              screen wall at 1.43:1, the Charminar a tower at 0.87:1 — so at one
              height Hawa Mahal came out 628px wide against the Charminar's
              384px. With the row justified between, that 244px difference put
              the gap, and therefore the route and the trunk riding it, 122px
              right of the page's centre line while every word above sat on it.

              Equal widths make the gap symmetrical, so the trunk lands exactly
              under the wordmark. The Charminar ends up the taller of the two,
              which is what the buildings actually look like.

              The width is capped against svh as well as vw because the height
              follows from it: on a short, wide window an unclamped 24vw made
              the Charminar taller than the band it sits in. */}
          <div className="a1-city aspect-[1968/1378] w-[min(24vw,430px,36svh)] shrink-0">
            <HawaMahal className="h-full w-full" />
          </div>

          <JourneyThread className="a1-thread relative mb-[15svh] aspect-5/1 min-w-0 flex-1" />

          <div className="a1-city aspect-[1124/1287] w-[min(24vw,430px,36svh)] shrink-0">
            <Charminar className="h-full w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

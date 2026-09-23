"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { bars39, QR_MATRIX, QR_SIZE, QR_URL } from "@/lib/tagCodes";
import { site } from "@/lib/site";

gsap.registerPlugin(useGSAP);

/**
 * The reply to "notify me", drawn as an airport wayfinding plate.
 *
 * The form is deliberately plain — one field, one button, done in three
 * seconds — so this is where the moment is spent. Someone has just handed over
 * their address on the promise of a shop that does not exist yet; a green tick
 * is a thin thing to give back.
 *
 * The brand hands us the conceit for free: Jaipur and Hyderabad have real IATA
 * codes, JAI and HYD, so the route the whole site is about is already a
 * boarding pass. The layout follows the International Typographic idiom those
 * signs are built in — one enormous word, a code stack, a labelled data
 * sidebar, an accent field, a cropped pictogram, and a footer of barcoded
 * cells — in the site's cream and maroon rather than black and yellow.
 *
 * Everything is positioned in percentages inside a fixed-aspect box and type is
 * sized in `cqw` against the card's own container, so the whole plate scales as
 * one drawing at any width while staying real, selectable text.
 */

/** Hyderabad, for the coordinate field. */
const DEST = { lat: "17.3850° N", lon: "78.4867° E", elev: "542 M" } as const;

/**
 * FNV-1a over the address.
 *
 * Every serial, barcode and matrix on the plate is generated from this rather
 * than being a decorative constant: two people get different plates, and the
 * same person coming back gets theirs again, which is the whole premise of the
 * returning state.
 */
function seedFrom(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/**
 * The QR matrix is pre-computed, so it cannot notice the URL changing under it.
 *
 * Without this, editing `site.social.instagram` would leave a scannable code
 * pointing confidently at the old address — the worst kind of wrong, because it
 * looks right. Development-only: it is a wiring mistake, not a runtime one.
 */
if (process.env.NODE_ENV !== "production" && site.social.instagram !== QR_URL) {
  console.warn(
    `[NotifyTag] The QR encodes ${QR_URL} but site.social.instagram is now ` +
      `${site.social.instagram}. Regenerate src/lib/tagCodes.ts — see the note there.`,
  );
}

/**
 * A real Code 39 barcode, drawn as an SVG whose viewBox width is the symbol's
 * own unit count.
 *
 * That is what lets it stay correct at any size: the browser scales the whole
 * drawing, so the 3:1 wide-to-narrow ratio the symbology depends on survives
 * even where a narrow bar lands on less than a device pixel.
 */
function Barcode({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const { total, bars } = bars39(value);

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox={`0 0 ${total} 24`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
    >
      {bars.map((b) => (
        <rect
          key={b.x}
          x={b.x}
          y={0}
          width={b.w}
          height={24}
          fill="var(--color-ink)"
        />
      ))}
    </svg>
  );
}

/** The pre-computed QR for the brand's Instagram. */
function QrCode({ className = "" }: { className?: string }) {
  const cells = [];
  for (let i = 0; i < QR_MATRIX.length; i++) {
    if (QR_MATRIX[i] === "1") {
      cells.push(
        <rect
          key={i}
          x={i % QR_SIZE}
          y={Math.floor(i / QR_SIZE)}
          width={1}
          height={1}
          fill="var(--color-ink)"
        />,
      );
    }
  }
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox={`-2 -2 ${QR_SIZE + 4} ${QR_SIZE + 4}`}
      shapeRendering="crispEdges"
    >
      {/* The quiet zone is part of the symbol — without it a scanner cannot
          find the finder patterns against the card's rules and type. */}
      <rect
        x={-2}
        y={-2}
        width={QR_SIZE + 4}
        height={QR_SIZE + 4}
        fill="#fdf6ea"
      />
      {cells}
    </svg>
  );
}

export default function NotifyTag({
  email,
  already,
}: {
  email: string;
  already: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);

  const seed = seedFrom(email || "jaipuritrunk");
  // The barcode encodes exactly this string — printed value and symbol agree,
  // which is the whole point of putting a real symbology on it.
  const bagTag = `JT${String((seed % 9000) + 1000)}`;
  const pnr = `JT ${String.fromCharCode(65 + (seed % 26))}${(seed >>> 5) % 10} ${((seed >>> 9) % 9000) + 1000}`;
  const sequence = String((seed >>> 3) % 90000).padStart(5, "0");

  useGSAP(
    () => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduce) return;

      // The returning visitor's plate was issued long ago, so it is not printed
      // in front of them — it arrives whole, and gets stamped.
      if (already) {
        gsap
          .timeline({ defaults: { ease: "power2.out" } })
          .from(".nt-card", { opacity: 0, y: 14, duration: 0.6 })
          .from(
            ".nt-stamp",
            { opacity: 0, scale: 1.6, rotate: -16, duration: 0.5 },
            "-=0.15",
          );
        return;
      }

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".nt-card", { opacity: 0, y: -16, duration: 0.7 })
        .from(
          ".nt-head",
          { opacity: 0, x: -20, duration: 0.6, stagger: 0.08 },
          "-=0.35",
        )
        .from(
          ".nt-arrow",
          { opacity: 0, x: -28, duration: 0.6, stagger: 0.08 },
          "-=0.5",
        )
        .from(
          ".nt-block",
          { opacity: 0, scaleX: 0, transformOrigin: "left", duration: 0.5 },
          "-=0.4",
        )
        .from(
          ".nt-glyph",
          { opacity: 0, y: 22, duration: 0.6, stagger: 0.1 },
          "-=0.45",
        )
        .from(
          ".nt-row",
          { opacity: 0, y: 8, duration: 0.4, stagger: 0.06 },
          "-=0.4",
        )
        .from(
          ".nt-bar",
          {
            scaleY: 0,
            transformOrigin: "bottom",
            duration: 0.2,
            stagger: 0.004,
          },
          "-=0.3",
        );
    },
    { scope: root, dependencies: [already, email] },
  );

  const rule =
    "1px solid color-mix(in srgb, var(--color-ink) 28%, transparent)";
  const ARROW = "M0 21h68V4l30 22-30 22V31H0z";

  return (
    <div ref={root} className="flex w-full justify-center">
      <div
        className="nt-card relative w-full max-w-[512px] overflow-hidden bg-[#fdf6ea] text-left"
        /* `text-left` is not decoration — Act 5's column sets `text-center`,
           and the plate was inheriting it. Every label sat centred over its
           value where this idiom aligns them hard left, which is what made the
           whole thing read as mushy instead of gridded. The two places that
           genuinely align right (the JAI/HYD stack, the ISSUED cell) say so
           themselves.

           512px is the widest the act's column allows at any viewport, so the
           plate now uses all of it: at 420 the micro type was 8.8px on desktop
           for no reason, since the space was there.

           Sizing everything in `cqw` scales the plate as one drawing, but it
           also scales it past legibility — on a phone the smallest type came
           out at 7.1px. Each micro size is wrapped in a `max()` so it keeps
           tracking the card on a wide screen and stops shrinking on a narrow
           one. The footer's first cell was widened to pay for the floor: the
           larger type no longer fits 20%. */
        style={{
          containerType: "inline-size",
          aspectRatio: "736 / 952",
          border:
            "1px solid color-mix(in srgb, var(--color-ink) 22%, transparent)",
          boxShadow:
            "0 16px 34px color-mix(in srgb, var(--color-maroon) 15%, transparent)",
        }}
      >
        {/* ── masthead ──────────────────────────────────────────────────── */}
        <div
          className="nt-head absolute"
          style={{ left: "4%", top: "3.2%", width: "50%" }}
        >
          <div className="flex items-start" style={{ gap: "3cqw" }}>
            <svg
              viewBox="0 0 24 24"
              className="shrink-0"
              style={{ width: "9cqw" }}
              aria-hidden="true"
            >
              <rect
                x="1"
                y="1"
                width="22"
                height="22"
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="1.6"
              />
              <rect x="6" y="8" width="12" height="9" fill="var(--color-ink)" />
              <path
                d="M9.5 8V6.5h5V8"
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="1.4"
              />
              <path d="M6 12.6h12" stroke="#fdf6ea" strokeWidth="1.2" />
            </svg>
            <div>
              <p
                className="text-ink font-bold"
                style={{ fontSize: "4.2cqw", letterSpacing: "0.02em" }}
              >
                TRUNK TAG
              </p>
              <p
                className="text-ink/55 mt-[0.45em] uppercase"
                style={{
                  fontFamily: MONO,
                  fontSize: "max(2.5cqw, 9.6px)",
                  lineHeight: 1.75,
                }}
              >
                Handpicked in Jaipur
                <br />
                Unpacked in Hyderabad
              </p>
            </div>
          </div>
        </div>

        {/* ── origin / destination stack ────────────────────────────────── */}
        <div
          className="nt-head absolute text-right"
          style={{ right: "4%", top: "3.2%", width: "20%" }}
        >
          <p
            className="text-ink font-bold leading-[0.95]"
            style={{ fontSize: "7cqw" }}
          >
            JAI
          </p>
          <p
            className="text-ink/55 font-bold leading-[1.1]"
            style={{ fontSize: "4.2cqw" }}
          >
            RJ
          </p>
          <div style={{ borderTop: rule, margin: "6% 0" }} />
          <p
            className="text-maroon font-bold leading-[0.95]"
            style={{ fontSize: "7cqw" }}
          >
            HYD
          </p>
          <p
            className="text-maroon/55 font-bold leading-[1.1]"
            style={{ fontSize: "4.2cqw" }}
          >
            TS
          </p>
        </div>

        {/* ── the directional arrows ────────────────────────────────────── */}
        <svg
          className="nt-arrow absolute"
          viewBox="0 0 100 52"
          aria-hidden="true"
          style={{ left: "38%", top: "16%", width: "35%" }}
        >
          <path d={ARROW} fill="var(--color-ink)" />
        </svg>
        <svg
          className="nt-arrow absolute"
          viewBox="0 0 100 52"
          aria-hidden="true"
          style={{ left: "4%", top: "22%", width: "10%" }}
        >
          <path d={ARROW} fill="var(--color-ink)" />
        </svg>

        {/* ── the one enormous word ─────────────────────────────────────── */}
        <p
          className="nt-glyph text-ink absolute font-bold"
          style={{
            left: "3%",
            top: "29%",
            fontSize: "20cqw",
            letterSpacing: "-0.04em",
            lineHeight: 0.84,
          }}
        >
          ABOARD
        </p>

        {/* ── passenger band ───────────────────────────────────────────

            The address does not fit the poster's narrow right-hand sidebar.
            That column is sized for values like "ARRIVAL" and "01"; an email
            put there ran under the headline and behind the pictogram. It gets
            a full-width band of its own instead, which is also the honest
            hierarchy — it is the one thing on this plate that belongs to the
            reader. Only the short values stayed in columns. */}
        <div
          className="absolute"
          style={{ left: "4%", right: "4%", top: "45%" }}
        >
          <div style={{ borderTop: rule, marginBottom: "3%" }} />
          <div className="flex items-start" style={{ gap: "4%" }}>
            {[
              { k: "Passenger", v: email, w: "54%", wrap: true },
              {
                k: "Status",
                // Short enough to stay on one line in a 21% column — "Already
                // issued" wrapped and threw the row out of alignment. The
                // stamp across the face already says it at length.
                v: already ? "On file" : "Confirmed",
                w: "21%",
              },
              // Right-aligned, so the band closes on the same edge the JAI/HYD
              // stack above it does instead of trailing off raggedly.
              { k: "Issued", v: "Nov 2026", w: "21%", end: true },
            ].map((row) => (
              <div
                key={row.k}
                className={`nt-row ${row.end ? "text-right" : ""}`}
                style={{ width: row.w }}
              >
                <p
                  className="text-ink font-bold uppercase"
                  style={{
                    fontFamily: MONO,
                    fontSize: "max(2.4cqw, 9.4px)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {row.k}
                </p>
                <p
                  className={`text-ink/70 uppercase ${row.wrap ? "break-all" : ""}`}
                  style={{
                    fontFamily: MONO,
                    fontSize: "max(2.3cqw, 9.2px)",
                    lineHeight: 1.5,
                  }}
                >
                  {row.v}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── accent field ──────────────────────────────────────────────── */}
        <div
          className="nt-block bg-rose absolute"
          style={{
            left: 0,
            top: "58%",
            width: "41%",
            height: "28.5%",
            padding: "3% 5%",
          }}
        >
          <p
            className="text-ink font-bold leading-[0.82]"
            style={{ fontSize: "10.5cqw", letterSpacing: "-0.03em" }}
          >
            01
          </p>
          <p
            className="text-ink/80 mt-[0.5em] uppercase"
            style={{
              fontFamily: MONO,
              fontSize: "max(2.5cqw, 9.6px)",
              letterSpacing: "0.12em",
            }}
          >
            Trunk
          </p>
          <div
            style={{
              borderTop:
                "1px solid color-mix(in srgb, var(--color-ink) 45%, transparent)",
              margin: "4% 0",
            }}
          />
          <svg viewBox="0 0 100 52" aria-hidden="true" style={{ width: "15%" }}>
            <path d={ARROW} fill="var(--color-ink)" />
          </svg>
          <p
            className="text-ink/75 mt-[0.7em] uppercase"
            style={{
              fontFamily: MONO,
              fontSize: "max(2.1cqw, 8.6px)",
              lineHeight: 1.45,
            }}
          >
            {DEST.lat}
            <br />
            {DEST.lon}
            <br />
            ELEV. {DEST.elev}
          </p>
        </div>

        {/* ── the cropped pictogram ─────────────────────────────────────── */}
        <svg
          className="nt-glyph absolute"
          viewBox="0 0 150 130"
          aria-hidden="true"
          style={{ right: "6%", top: "56%", width: "46%" }}
        >
          <path
            d="M52 34V22a10 10 0 0 1 10-10h26a10 10 0 0 1 10 10v12"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="9"
          />
          <path
            d="M22 40h106a10 10 0 0 1 10 10v80H12V50a10 10 0 0 1 10-10z"
            fill="var(--color-ink)"
          />
          <path
            d="M44 62v68M75 62v68M106 62v68"
            stroke="#fdf6ea"
            strokeWidth="7"
          />
        </svg>

        {/* ── rotated edge microtype ────────────────────────────────────── */}
        <p
          className="text-ink/40 absolute uppercase"
          style={{
            fontFamily: MONO,
            fontSize: "max(2.1cqw, 8.6px)",
            right: "1.2%",
            // Anchored at the FOOT of its column, not the head. `rotate(90deg)`
            // about `right top` sweeps the text upward from the anchor, so a
            // top of 57% put it at 31–57% — straight through the data band.
            // Anchored at the footer rule it runs 60–86%, in the clear margin
            // beside the pictogram.
            top: "86%",
            transform: "rotate(90deg)",
            transformOrigin: "right top",
            whiteSpace: "nowrap",
            letterSpacing: "0.1em",
          }}
        >
          JAI-HYD-NOV-2026-{sequence}
        </p>

        {/* ── footer of barcoded cells ──────────────────────────────────── */}
        <div
          className="absolute flex items-stretch"
          style={{
            left: 0,
            right: 0,
            bottom: 0,
            height: "13.5%",
            borderTop: rule,
          }}
        >
          <div
            className="nt-row flex flex-col justify-center"
            style={{ width: "22%", padding: "0 3%" }}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ width: "5cqw" }}
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="1.5"
              />
              <path
                d="M2 12h20M12 2a16 16 0 0 1 0 20a16 16 0 0 1 0-20"
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth="1.5"
              />
            </svg>
            {/* Two lines, and wide enough that the first does not wrap.
                At 14% this cell gave the text 34px for a 55px string, so
                "HYD 500001" broke into three lines and the stack came to 70px
                inside a 73px footer — the globe ended up sitting on the type. */}
            <p
              className="text-ink/70 mt-[0.7em] uppercase"
              style={{
                fontFamily: MONO,
                fontSize: "max(2.1cqw, 8.6px)",
                lineHeight: 1.5,
              }}
            >
              HYD 500001
              <br />
              India
            </p>
          </div>

          <div
            className="nt-row flex flex-col justify-center"
            style={{ width: "36%", padding: "0 3%", borderLeft: rule }}
          >
            <p
              className="text-ink font-bold uppercase"
              style={{ fontFamily: MONO, fontSize: "max(2.2cqw, 8.8px)" }}
            >
              Bag Tag
            </p>
            <p
              className="text-ink/70"
              style={{ fontFamily: MONO, fontSize: "max(2.4cqw, 9.4px)" }}
            >
              {bagTag}
            </p>
            <Barcode value={bagTag} className="mt-[0.5em] h-[26%] w-full" />
          </div>

          <div
            className="nt-row flex flex-col justify-center"
            style={{ width: "24%", padding: "0 3%", borderLeft: rule }}
          >
            <p
              className="text-ink font-bold uppercase"
              style={{ fontFamily: MONO, fontSize: "max(2.2cqw, 8.8px)" }}
            >
              PNR
            </p>
            <p
              className="text-ink/70"
              style={{ fontFamily: MONO, fontSize: "max(2.4cqw, 9.4px)" }}
            >
              {pnr}
            </p>
            <QrCode className="mt-[0.35em] aspect-square h-[58%] w-auto" />
          </div>

          <div
            className="nt-row flex flex-col justify-center"
            style={{ width: "18%", padding: "0 3%", borderLeft: rule }}
          >
            <p
              className="text-ink font-bold leading-[0.95]"
              style={{ fontSize: "5cqw" }}
            >
              JT
            </p>
            <p
              className="text-ink font-bold leading-[0.95]"
              style={{ fontSize: "5cqw" }}
            >
              01
            </p>
          </div>
        </div>

        {already && (
          <span
            className="nt-stamp text-maroon absolute font-bold uppercase"
            style={{
              left: "46%",
              top: "35%",
              fontSize: "3.4cqw",
              letterSpacing: "0.14em",
              padding: "1.2% 2.4%",
              transform: "rotate(-9deg)",
              border:
                "2px solid color-mix(in srgb, var(--color-maroon) 60%, transparent)",
              background: "color-mix(in srgb, #fdf6ea 88%, transparent)",
            }}
          >
            Already issued
          </span>
        )}
      </div>
    </div>
  );
}

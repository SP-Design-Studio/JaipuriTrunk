"use client";

import { useState } from "react";
import Image from "next/image";
import { useHasAsset } from "@/components/AssetProvider";

const SRC = "/images/atmosphere/hawa-mahal-sticker.webp";
const NATURAL = { w: 1968, h: 1378 };
/**
 * Measured opaque bounds: 13.8% transparent margin at the top, 0.7% at the
 * bottom — the source is cropped at the street, so the sticker ends in a
 * straight cut there rather than wrapping.
 *
 * Visible top of the artwork sits at `viewportH - H * (0.857 - translateY)`.
 * On desktop the height is driven by `svh` rather than width, so that term
 * scales with the viewport: without it the gap between the copy and the
 * facade grows on taller screens. At h=115svh / translate 36% the artwork
 * starts at ~0.43 x viewport height whatever the screen size.
 *
 * Re-measure the bounds if the asset is re-cut.
 */

/**
 * The hero facade, die-cut as a paper sticker. Renders nothing if the asset is
 * missing: the drawn SVG that used to stand in here was a different illustration
 * in a different style, so a missing file swapped the hero for something that
 * did not belong rather than degrading gracefully.
 */
export default function HawaMahal({ className = "" }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  const present = useHasAsset(SRC);

  if (failed || !present) return null;

  return (
    <div className={`shrink-0 max-w-none ${className}`}>
      <Image
        src={SRC}
        alt=""
        aria-hidden="true"
        width={NATURAL.w}
        height={NATURAL.h}
        /* `priority` is deprecated as of Next 16. The docs steer you to
           `preload` only when there is one unambiguous LCP image; here the
           largest element is the Hawa Mahal on desktop and the wordmark on a
           phone, so they say to use loading/fetchPriority instead. */
        loading="eager"
        /* A pixel width, not a vw, because the hero sizes this box by HEIGHT:
           the wrapper is capped at 460px tall and the artwork is 1.43:1, so it
           is never wider than about 660px however wide the window gets. Given
           a vw hint the browser asked for the 3840 variant and then stalled on
           it, while the Charminar next to it — which has always ended in a
           fixed px — loaded immediately. */
        sizes="(max-width: 768px) 46vw, 600px"
        className="h-full w-full object-contain object-bottom select-none"
        onError={() => setFailed(true)}
        style={{
          filter:
            "drop-shadow(0 18px 30px color-mix(in srgb, var(--color-maroon) 16%, transparent))",
        }}
      />
    </div>
  );
}

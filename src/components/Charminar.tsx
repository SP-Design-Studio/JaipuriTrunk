"use client";

import { useState } from "react";
import Image from "next/image";
import { useHasAsset } from "@/components/AssetProvider";

const SRC = "/images/atmosphere/charminar.webp";
const NATURAL = { w: 1124, h: 1287 };
/**
 * Measured opaque bounds: 8.3% transparent margin at the top, 1.0% at the
 * bottom — the source photo is cropped at its base, so the sticker ends in a
 * straight cut there rather than wrapping. Re-measure if the asset is re-cut.
 */

/**
 * The Hyderabad end of the journey, die-cut to match the Jaipur hero. Renders
 * nothing if the asset is missing — see the note in HawaMahal.
 */
export default function Charminar({ className = "" }: { className?: string }) {
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
        loading="eager"
        sizes="(max-width: 768px) 34vw, 420px"
        className="h-full w-full object-contain object-bottom select-none"
        onError={() => setFailed(true)}
        style={{
          filter:
            "drop-shadow(0 16px 26px color-mix(in srgb, var(--color-maroon) 14%, transparent))",
        }}
      />
    </div>
  );
}

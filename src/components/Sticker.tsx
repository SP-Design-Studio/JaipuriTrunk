"use client";

import { useState } from "react";
import Image from "next/image";
import { useHasAsset } from "@/components/AssetProvider";

/**
 * A die-cut product sticker on its own — no frame, no caption. The shared
 * treatment used wherever a product appears outside the Act 2 rail.
 */
export default function Sticker({
  src,
  alt,
  tilt = 0,
  sizes = "40vw",
  className = "",
}: {
  src: string;
  alt: string;
  /** Degrees. Keep it small; these read as laid-out pieces, not confetti. */
  tilt?: number;
  sizes?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const present = useHasAsset(src);

  if (failed || !present) return null;

  return (
    // The image is laid out with `fill`, so className MUST carry a position
    // utility — `relative` for flow, `absolute` for a placed cluster.
    <div className={className} style={{ transform: `rotate(${tilt}deg)` }}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-contain"
        onError={() => setFailed(true)}
        style={{ filter: "drop-shadow(0 16px 28px rgba(138,31,75,0.20))" }}
      />
    </div>
  );
}

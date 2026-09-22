"use client";

/**
 * A stylised Hawa Mahal facade, drawn procedurally so every jharokha window
 * is an addressable node for the Act 1 reveal. Five tiers, narrowing upward,
 * crowned with chhatris.
 */

type Tier = { y: number; count: number; w: number; h: number; gap: number };

const TIERS: Tier[] = [
  { y: 452, count: 13, w: 46, h: 108, gap: 16 },
  { y: 340, count: 11, w: 46, h: 98, gap: 18 },
  { y: 238, count: 9, w: 46, h: 88, gap: 20 },
  { y: 150, count: 7, w: 46, h: 76, gap: 22 },
  { y: 76, count: 5, w: 46, h: 62, gap: 24 },
];

const VB_W = 1000;

/** Cusped Mughal arch with a flat sill. */
function archPath(w: number, h: number) {
  const s = h * 0.62;
  return [
    `M0 ${h}`,
    `L0 ${s}`,
    `C0 ${s * 0.38} ${w * 0.14} ${h * 0.06} ${w / 2} 0`,
    `C${w * 0.86} ${h * 0.06} ${w} ${s * 0.38} ${w} ${s}`,
    `L${w} ${h}`,
    "Z",
  ].join(" ");
}

function Chhatri({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="hm-chhatri">
      <path d={`M${-r} 0 C${-r} ${-r * 1.15} ${r} ${-r * 1.15} ${r} 0 Z`} />
      <rect x={-r * 1.15} y={0} width={r * 2.3} height={r * 0.22} rx={2} />
      <path d={`M0 ${-r * 1.05} l0 ${-r * 0.45}`} strokeWidth={2.5} stroke="currentColor" />
      <circle cx={0} cy={-r * 1.62} r={r * 0.17} />
    </g>
  );
}

export default function HawaMahal({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VB_W} 620`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      {/* Base plinth */}
      <rect x={40} y={560} width={VB_W - 80} height={60} className="hm-base" />
      <rect x={0} y={600} width={VB_W} height={20} className="hm-base" />

      {TIERS.map((tier, ti) => {
        const span = tier.count * tier.w + (tier.count - 1) * tier.gap;
        const startX = (VB_W - span) / 2;
        const bandY = tier.y + tier.h;
        return (
          <g key={ti}>
            {/* Cornice under each tier */}
            <rect
              x={startX - 26}
              y={bandY}
              width={span + 52}
              height={14}
              rx={3}
              className="hm-base"
            />
            {Array.from({ length: tier.count }).map((_, i) => {
              const x = startX + i * (tier.w + tier.gap);
              return (
                <g
                  key={i}
                  transform={`translate(${x} ${tier.y})`}
                  className="hm-window"
                  data-tier={ti}
                >
                  <path d={archPath(tier.w, tier.h)} />
                  {/* Jaali lattice hint */}
                  <path
                    d={`M${tier.w * 0.5} ${tier.h * 0.34} l0 ${tier.h * 0.5}`}
                    stroke="var(--color-cream)"
                    strokeWidth={2}
                    opacity={0.55}
                  />
                  <path
                    d={`M${tier.w * 0.16} ${tier.h * 0.58} l${tier.w * 0.68} 0`}
                    stroke="var(--color-cream)"
                    strokeWidth={2}
                    opacity={0.55}
                  />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Crowning chhatris */}
      {[240, 360, 500, 640, 760].map((x, i) => (
        <Chhatri key={i} x={x} y={70} r={i === 2 ? 34 : 24} />
      ))}
    </svg>
  );
}

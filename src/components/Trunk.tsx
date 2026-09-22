"use client";

/**
 * A travelling trunk. The lid is a separate node so it can hinge open on scroll.
 *
 * An SVG clips at its viewBox bounds, and the lid open at 52 degrees reaches
 * 134 units above the trunk's own origin — so the box needs headroom. Rather
 * than start the viewBox at negative coordinates, the box starts at 0 and the
 * drawing is pushed in by HEADROOM/SIDEROOM. The lid's `transform-origin` stays
 * at its own local (70,190) — px origins resolve in the element's own
 * coordinates, which a parent translate does not affect.
 */
const HEADROOM = 155;
const SIDEROOM = 70;
export default function Trunk({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${520 + SIDEROOM} ${400 + HEADROOM}`}
      className={className}
      aria-hidden="true"
    >
      <g transform={`translate(${SIDEROOM} ${HEADROOM})`}>
        {/* Light escaping the trunk */}
        <ellipse
          className="tr-glow"
          cx="260"
          cy="196"
          rx="150"
          ry="40"
          fill="var(--color-blush)"
          opacity="0"
        />

        {/* Lid — hinges about the back edge at (70,190) */}
        <g className="tr-lid" style={{ transformOrigin: "70px 190px" }}>
          <path
            d="M70 190 L70 150 A 30 30 0 0 1 100 120 L420 120 A 30 30 0 0 1 450 150 L450 190 Z"
            fill="var(--color-maroon)"
          />
          <path
            d="M70 186 L450 186 L450 190 L70 190 Z"
            fill="var(--color-maroon-deep)"
          />
          {[132, 260, 388].map((x) => (
            <path
              key={x}
              d={`M${x - 11} 190 L${x - 11} 150 A 30 30 0 0 1 ${x + 11} 150 L${x + 11} 190 Z`}
              fill="var(--color-sand)"
              opacity="0.85"
            />
          ))}
          {/* Latch */}
          <rect
            x="246"
            y="178"
            width="28"
            height="26"
            rx="4"
            fill="var(--color-sand)"
          />
          <circle cx="260" cy="191" r="4" fill="var(--color-maroon-deep)" />
        </g>
        {/* Body */}
        <g className="tr-body">
          <rect
            x="70"
            y="190"
            width="380"
            height="150"
            rx="10"
            fill="var(--color-maroon)"
          />
          <rect
            x="70"
            y="190"
            width="380"
            height="18"
            rx="6"
            fill="var(--color-maroon-deep)"
          />
          <rect
            x="70"
            y="318"
            width="380"
            height="22"
            rx="8"
            fill="var(--color-maroon-deep)"
          />
          {/* Brass straps */}
          {[132, 260, 388].map((x) => (
            <rect
              key={x}
              x={x - 11}
              y="190"
              width="22"
              height="150"
              fill="var(--color-sand)"
              opacity="0.85"
            />
          ))}
          {/* Corner studs */}
          {[88, 432].map((x) =>
            [212, 300].map((y) => (
              <circle
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                r="4.5"
                fill="var(--color-sand)"
              />
            )),
          )}
          {/* Feet */}
          <rect
            x="96"
            y="340"
            width="34"
            height="14"
            rx="4"
            fill="var(--color-maroon-deep)"
          />
          <rect
            x="390"
            y="340"
            width="34"
            height="14"
            rx="4"
            fill="var(--color-maroon-deep)"
          />
        </g>
      </g>
    </svg>
  );
}

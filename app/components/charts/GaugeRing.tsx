/* Radial 0–100 gauge ring (ENGINE_SPEC §9 / HANDOFF Zone B). Track + value arc
 * with rounded caps, starting at 12 o'clock, colored by tier. Center shows the
 * score in mono. Pure & data-driven: the arc length = score/100 of the
 * circumference. */

interface GaugeRingProps {
  score: number
  /** Arc color (EspCard.ringColor). */
  color: string
  /** Outer SVG size in px (default 86). */
  size?: number
  /** Optional id for the value arc (testing / animation hooks). */
  ringId?: string
}

const R = 37
const CIRC = 2 * Math.PI * R

export function GaugeRing({ score, color, size = 86, ringId }: GaugeRingProps) {
  const dash = (score / 100) * CIRC
  return (
    <svg
      viewBox="0 0 92 92"
      width={size}
      height={size}
      role="img"
      aria-label={`Health score ${score} out of 100`}
      style={{ flexShrink: 0 }}
    >
      <circle cx={46} cy={46} r={R} fill="none" stroke="#1e2330" strokeWidth={9} />
      <circle
        id={ringId}
        cx={46}
        cy={46}
        r={R}
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={`${dash.toFixed(1)} ${CIRC.toFixed(1)}`}
        transform="rotate(-90 46 46)"
      />
      <text
        x={46}
        y={44}
        textAnchor="middle"
        fontSize={22}
        fontWeight={600}
        fill="#f2f3f7"
        fontFamily="'IBM Plex Mono', monospace"
      >
        {score}
      </text>
      <text x={46} y={60} textAnchor="middle" fontSize={9.5} fill="#6a7080" fontFamily="'IBM Plex Mono', monospace">
        /100
      </text>
    </svg>
  )
}

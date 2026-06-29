/* Data-driven SVG line chart. A faithful React port of the demo's renderLineChart
 * helper (ENGINE_SPEC §9) — it rebuilds all geometry from data arrays, never from
 * hardcoded mockup coordinates. Used by the hero health chart (Zone A) and the
 * raw-vs-smoothed detail chart (Screen 2). Pure & deterministic. */

import { Fragment } from 'react'

export type Point = [number, number]
export type Anchor = 'start' | 'middle' | 'end'

export interface Series {
  points: Point[]
  color: string
  width?: number
  glow?: boolean
  opacity?: number
  dash?: string
}

/** A horizontal (y-range) zone band, or a vertical (x-range) band. */
export type Band =
  | { fromY: number; toY: number; color: string; opacity?: number }
  | { fromX: number; toX: number; color: string; opacity?: number }

export interface ZoneLabel {
  x?: number
  y: number
  label: string
  color: string
  anchor?: Anchor
  size?: number
  spacing?: number
}

export interface HLine {
  y: number
  color: string
  dash?: string
  width?: number
  opacity?: number
  label?: string
}

export interface VLine {
  x: number
  color: string
  dash?: string
  opacity?: number
}

export interface CIBand {
  upper: Point[]
  lower: Point[]
  color: string
  opacity?: number
}

export interface Tick {
  value: number
  label: string
  anchor?: Anchor
}

export interface Marker {
  x: number
  y: number
  color?: string
  r?: number
  fill?: string
  strokeWidth?: number
  label?: string
  labelColor?: string
  labelAnchor?: Anchor
  labelDy?: number
}

export interface LineChartProps {
  xDomain: [number, number]
  yDomain: [number, number]
  width?: number
  height?: number
  pad?: { l: number; r: number; t: number; b: number }
  bands?: Band[]
  zoneLabels?: ZoneLabel[]
  hlines?: HLine[]
  vlines?: VLine[]
  axes?: boolean
  yTicks?: Tick[]
  xTicks?: Tick[]
  yTitle?: string
  series?: Series[]
  ciBand?: CIBand
  markers?: Marker[]
  className?: string
  ariaLabel?: string
}

const SANS = "'IBM Plex Sans', sans-serif"
const MONO = "'IBM Plex Mono', monospace"

export function LineChart({
  xDomain,
  yDomain,
  width = 740,
  height = 256,
  pad = { l: 80, r: 40, t: 14, b: 50 },
  bands = [],
  zoneLabels = [],
  hlines = [],
  vlines = [],
  axes = true,
  yTicks = [],
  xTicks = [],
  yTitle,
  series = [],
  ciBand,
  markers = [],
  className,
  ariaLabel,
}: LineChartProps) {
  const plotW = width - pad.l - pad.r
  const plotH = height - pad.t - pad.b
  const [x0, x1] = xDomain
  const [y0, y1] = yDomain
  const px = (x: number) => pad.l + (x1 === x0 ? 0 : (x - x0) / (x1 - x0)) * plotW
  const py = (y: number) => pad.t + (1 - (y1 === y0 ? 0 : (y - y0) / (y1 - y0))) * plotH
  const toPts = (points: Point[]) => points.map((p) => `${px(p[0])},${py(p[1])}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ height: 'auto', display: 'block' }}
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      {/* shaded bands (vertical x-range or horizontal y-range zones) */}
      {bands.map((b, i) =>
        'fromX' in b ? (
          <rect
            key={`band-${i}`}
            x={px(b.fromX)}
            y={pad.t}
            width={Math.max(0, px(b.toX) - px(b.fromX))}
            height={plotH}
            fill={b.color}
            opacity={b.opacity}
          />
        ) : (
          <rect
            key={`band-${i}`}
            x={pad.l}
            y={py(b.toY)}
            width={plotW}
            height={Math.max(0, py(b.fromY) - py(b.toY))}
            fill={b.color}
            opacity={b.opacity}
          />
        ),
      )}

      {/* zone labels (text anchored inside bands / centered annotations) */}
      {zoneLabels.map((z, i) => {
        const anchor = z.anchor || 'start'
        const xpx = px(z.x != null ? z.x : x0) + (anchor === 'start' ? 8 : 0)
        return (
          <text
            key={`zl-${i}`}
            x={xpx}
            y={py(z.y)}
            fontSize={z.size || 10.5}
            fontWeight={600}
            fill={z.color}
            fontFamily={SANS}
            textAnchor={anchor}
            letterSpacing={z.spacing != null ? z.spacing : 0}
          >
            {z.label}
          </text>
        )
      })}

      {/* horizontal guide lines (+ optional end labels) */}
      {hlines.map((h, i) => (
        <Fragment key={`hl-${i}`}>
          <line
            x1={pad.l}
            y1={py(h.y)}
            x2={pad.l + plotW}
            y2={py(h.y)}
            stroke={h.color}
            strokeWidth={h.width || 1}
            strokeDasharray={h.dash}
            opacity={h.opacity}
          />
          {h.label && (
            <text
              x={pad.l + plotW}
              y={py(h.y) - 4}
              fontSize={9}
              textAnchor="end"
              fill={h.color}
              fontFamily={MONO}
            >
              {h.label}
            </text>
          )}
        </Fragment>
      ))}

      {/* vertical marker guide lines */}
      {vlines.map((v, i) => (
        <line
          key={`vl-${i}`}
          x1={px(v.x)}
          y1={pad.t}
          x2={px(v.x)}
          y2={pad.t + plotH}
          stroke={v.color}
          strokeDasharray={v.dash || '3 3'}
          opacity={v.opacity}
        />
      ))}

      {/* axes */}
      {axes && (
        <>
          <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke="#262b37" strokeWidth={1} />
          <line
            x1={pad.l}
            y1={pad.t + plotH}
            x2={pad.l + plotW}
            y2={pad.t + plotH}
            stroke="#262b37"
            strokeWidth={1}
          />
        </>
      )}

      {/* y-axis tick labels */}
      {yTicks.map((t, i) => (
        <text
          key={`yt-${i}`}
          x={pad.l - 8}
          y={py(t.value) + 3}
          fontSize={9}
          textAnchor="end"
          fill="#5a6070"
          fontFamily={MONO}
        >
          {t.label}
        </text>
      ))}

      {/* x-axis tick labels */}
      {xTicks.map((t, i) => (
        <text
          key={`xt-${i}`}
          x={px(t.value)}
          y={pad.t + plotH + 16}
          fontSize={9}
          fill="#5a6070"
          fontFamily={MONO}
          textAnchor={t.anchor || 'start'}
        >
          {t.label}
        </text>
      ))}

      {/* rotated axis title */}
      {yTitle && (
        <text
          x={pad.l - 36}
          y={pad.t + plotH / 2}
          fontSize={9.5}
          fill="#6a7080"
          fontWeight={600}
          fontFamily={SANS}
          textAnchor="middle"
          transform={`rotate(-90 ${pad.l - 36} ${pad.t + plotH / 2})`}
        >
          {yTitle}
        </text>
      )}

      {/* CI band (upper forward + lower back, filled) */}
      {ciBand && (
        <path
          d={
            'M' +
            ciBand.upper.map((p) => `${px(p[0])},${py(p[1])}`).join(' L') +
            ciBand.lower
              .slice()
              .reverse()
              .map((p) => ` L${px(p[0])},${py(p[1])}`)
              .join('') +
            ' Z'
          }
          fill={ciBand.color}
          opacity={ciBand.opacity ?? 0.13}
        />
      )}

      {/* series (optional glow underlay + line) */}
      {series.map((s, i) => (
        <Fragment key={`s-${i}`}>
          {s.glow && (
            <polyline points={toPts(s.points)} fill="none" stroke={s.color} strokeWidth={(s.width || 3) + 4} opacity={0.16} />
          )}
          <polyline
            points={toPts(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width || 2}
            opacity={s.opacity}
            strokeDasharray={s.dash}
          />
        </Fragment>
      ))}

      {/* markers (open ring by default; solid dot when fill set) + optional label */}
      {markers.map((m, i) => (
        <Fragment key={`m-${i}`}>
          <circle
            cx={px(m.x)}
            cy={py(m.y)}
            r={m.r || 5.5}
            fill={m.fill || '#0c0e14'}
            stroke={m.color || '#818cf8'}
            strokeWidth={m.strokeWidth ?? 2.5}
          />
          {m.label && (
            <text
              x={px(m.x)}
              y={pad.t + plotH + (m.labelDy || 32)}
              fontSize={10}
              fontWeight={600}
              fill={m.labelColor || '#a5b4fc'}
              textAnchor={m.labelAnchor || 'middle'}
              fontFamily={SANS}
            >
              {m.label}
            </text>
          )}
        </Fragment>
      ))}
    </svg>
  )
}

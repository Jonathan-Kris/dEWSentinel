/* Tiny trend sparkline (ENGINE_SPEC §9). Auto-scales the value range to the
 * box. Pure & data-driven — drives the ESP card 14-pt sparkline and the
 * dashboard strip's flat-green line. */

interface SparklineProps {
  values: number[]
  color: string
  width?: number
  height?: number
  strokeWidth?: number
  className?: string
  style?: React.CSSProperties
}

export function Sparkline({
  values,
  color,
  width = 96,
  height = 30,
  strokeWidth = 2,
  className,
  style,
}: SparklineProps) {
  const pad = 3
  const lo = values.length ? Math.min(...values) : 0
  const hi = values.length ? Math.max(...values) : 1
  const range = hi - lo || 1
  const points = values
    .map((v, i) => {
      const x = pad + (values.length > 1 ? i / (values.length - 1) : 0) * (width - 2 * pad)
      const y = pad + (1 - (v - lo) / range) * (height - 2 * pad)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className={className}
      style={style}
      role="img"
      aria-hidden="true"
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  )
}

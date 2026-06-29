/* §5.3 Slope projection. Least-squares slope on the SMOOTHED mean series
 * (never raw), extrapolated to the 0.30% cliff. daysToThreshold is directional
 * ("act now"), not exact. */

export function leastSquaresSlope(ys: number[]): number {
  const n = ys.length
  const xs = ys.map((_, i) => i)
  const mx = (n - 1) / 2
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  return num / den // rise per day (proportion/day)
}

export function daysToThreshold(currentMean: number, slopePerDay: number, cliff = 0.003): number {
  if (slopePerDay <= 0) return Infinity
  return (cliff - currentMean) / slopePerDay
}

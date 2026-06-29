/* §5.2 Beta-Binomial smoothed complaint rate.
 *
 * Smooths the noisy daily rate with a trailing window plus a healthy-baseline
 * prior, and returns a ~90% credible band. Uses a NORMAL APPROXIMATION to the
 * Beta posterior — an exact incomplete-beta inverse is explicitly a non-goal
 * (ENGINE_SPEC §12; CONTEXT Decisions), and unnecessary since α+β is in the
 * thousands.
 *
 * b0 is the smoothing knob (§5.2): larger ⇒ smoother/slower. Tuned to 4000
 * (from the 1200 reference) so the credible band ignores single-complaint
 * spikes — keeping the healthy scenario cleanly below the 0.10% watch line —
 * while critical still crosses 0.30% at the cliff.
 */

export interface SmoothedPoint {
  /** Smoothed rate as a proportion (e.g. 0.0017 = 0.17%). */
  mean: number
  ciLower: number
  ciUpper: number
}

export interface Prior {
  a0: number
  b0: number
}

const DEFAULT_PRIOR: Prior = { a0: 0.6, b0: 4000 }

export function betaBinomialSmooth(
  windowSends: number[],
  windowComplaints: number[],
  prior: Prior = DEFAULT_PRIOR,
): SmoothedPoint {
  const S = windowSends.reduce((x, y) => x + y, 0)
  const C = windowComplaints.reduce((x, y) => x + y, 0)
  const a = prior.a0 + C
  const b = prior.b0 + Math.max(0, S - C)
  const mean = a / (a + b)
  const variance = (a * b) / ((a + b) * (a + b) * (a + b + 1))
  const sd = Math.sqrt(variance)
  const z = 1.645 // ~90% credible interval
  return { mean, ciLower: Math.max(0, mean - z * sd), ciUpper: mean + z * sd }
}

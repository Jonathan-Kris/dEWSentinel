/* §11 Honesty label — required, always visible. The engine and visuals are real;
 * the data is synthetic. */

export function SimLabel() {
  return (
    <div className="sim-label" id="sim-label">
      <span className="badge">Simulated</span>
      <span>
        Simulated data. In production, leading signals come from sending.ac&apos;s own MTA accounting-webhook
        telemetry (bounces, deferrals, 4xx/5xx provider codes); confirmation from Google Postmaster + Microsoft
        SNDS.
      </span>
    </div>
  )
}

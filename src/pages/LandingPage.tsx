import { Link } from 'react-router-dom'
import hero from '../assets/hero.png'

export default function LandingPage() {
  return (
    <div className="site-stack">
      <section className="hero">
        <div className="hero-copy">
          <p className="badge">Safety infrastructure</p>
          <h1 className="hero-title">Quiet tools when exposure is risky.</h1>
          <p className="hero-lead muted">
            Aegis AI bundles discreet entry, guardian-style risk framing, actionable escape planning, tamper-ready
            evidence pinning, and an optional SOS path — without advertising itself on every screen.
          </p>
          <div className="hero-actions">
            <Link className="site-button site-button-primary" to="/app">
              Launch app
            </Link>
            <Link className="site-button site-button-ghost" to="/dashboard">
              Agent dashboard
            </Link>
            <Link className="site-button site-button-ghost" to="/donate">
              Support
            </Link>
          </div>
        </div>
        <img className="hero-art" src={hero} alt="" width={420} height={280} decoding="async" />
      </section>

      <section className="site-grid-cards">
        <article className="card">
          <h2>Discreet shell</h2>
          <p className="muted">Opens as an everyday calculator until you deliberately unlock.</p>
        </article>
        <article className="card">
          <h2>Agent swarm</h2>
          <p className="muted">Guardian assessment, planner steps, finance preview, audit trail logging.</p>
        </article>
        <article className="card">
          <h2>Evidence locker</h2>
          <p className="muted">Hash-first uploads through your Pinata-backed API when configured.</p>
        </article>
      </section>
    </div>
  )
}

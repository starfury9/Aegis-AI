import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatLiveLinksBulletList } from '../config/publicLinks'

export default function DashboardPage() {
  const [copied, setCopied] = useState(false)
  const block = formatLiveLinksBulletList()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="site-stack">
      <div className="dash-head">
        <div>
          <p className="badge">Operational overview</p>
          <h1>Agent Dashboard</h1>
          <p className="muted">Status cards for outbound comms plus the shareable live-links block.</p>
        </div>
        <Link className="site-button site-button-primary" to="/app">
          Open runtime app
        </Link>
      </div>

      <section className="site-grid-cards">
        <article className="card">
          <h2>Guardian / Planner</h2>
          <p className="status">Online</p>
          <p className="muted small">Swarm executes in-browser with API support for Pinata uploads.</p>
        </article>
        <article className="card">
          <h2>Evidence pipeline</h2>
          <p className="status">Ready</p>
          <p className="muted small">
            Backend <code className="site-code">/api/ipfs/upload</code> · 0G Storage via{' '}
            <code className="site-code">OG_STORAGE_PRIVATE_KEY</code> + indexer (see{' '}
            <code className="site-code">.env.example</code>).
          </p>
        </article>
        <article className="card">
          <h2>SOS / wallet path</h2>
          <p className="status">Dual mode</p>
          <p className="muted small">On-chain ETH sweep when MetaMask connects; simulated path otherwise.</p>
        </article>
      </section>

      <article className="card wide live-links-card">
        <div className="live-links-toolbar">
          <h2>Live links (copy-ready)</h2>
          <button type="button" className="site-button site-button-secondary" onClick={copy}>
            {copied ? 'Copied' : 'Copy markdown block'}
          </button>
        </div>
        <pre className="live-links-pre">{block}</pre>
      </article>
    </div>
  )
}

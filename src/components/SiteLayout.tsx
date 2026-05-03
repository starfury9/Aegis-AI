import { NavLink, Outlet } from 'react-router-dom'
import '../App.css'
import '../site.css'

function navCls({ isActive }: { isActive: boolean }) {
  return `site-nav-link${isActive ? ' site-nav-link-active' : ''}`
}

export default function SiteLayout() {
  return (
    <div className="site-root">
      <header className="site-header">
        <NavLink className="site-brand" to="/">
          Aegis AI
        </NavLink>
        <nav className="site-links" aria-label="Primary">
          <NavLink className={navCls} to="/" end>
            Home
          </NavLink>
          <NavLink className={navCls} to="/dashboard">
            Agent Dashboard
          </NavLink>
          <NavLink className={navCls} to="/donate">
            Donate
          </NavLink>
          <NavLink className={navCls} to="/app">
            Open App
          </NavLink>
        </nav>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer muted">
        <p>
          Aegis AI · Discreet access, agent-assisted planning, and optional on-chain SOS flows. Deploy and
          set <code className="site-code">VITE_*</code> env vars so live links resolve to your URLs and
          contracts.
        </p>
      </footer>
    </div>
  )
}

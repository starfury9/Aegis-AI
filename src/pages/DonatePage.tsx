import { getPublicLinks, isPlaceholderAddress } from '../config/publicLinks'

function shortHex(addr: string) {
  const a = addr.trim()
  if (a.length < 12) return a
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export default function DonatePage() {
  const L = getPublicLinks()
  const treasury = L.treasuryAddress

  return (
    <div className="site-stack site-narrow">
      <h1>Donate</h1>
      <p className="muted">
        Direct support keeps APIs, audits, and agent experiments online. Treasury and token addresses belong in{' '}
        <code className="site-code">.env</code> on Vercel once deployed.
      </p>

      <article className="card stack">
        <h2>Treasury (EVM)</h2>
        {isPlaceholderAddress(treasury) ? (
          <p className="muted">Set <code className="site-code">VITE_TREASURY_ADDRESS</code> to display the live donation wallet.</p>
        ) : (
          <>
            <p className="mono-block">{treasury}</p>
            <p className="muted small">Prefer testnets for demos unless you intentionally accept mainnet funds.</p>
          </>
        )}
      </article>

      <article className="card stack">
        <h2>Public donate URL</h2>
        <p className="muted">
          Canonical link for community posts:&nbsp;
          <a className="link" href={L.donationPage} target="_blank" rel="noreferrer">
            {L.donationPage}
          </a>
        </p>
      </article>

      <article className="card stack">
        <h2>Ecosystem contracts</h2>
        <p className="muted small">Replace placeholders via <code className="site-code">VITE_TOKEN_CONTRACT</code> &amp;&nbsp;<code className="site-code">VITE_AGENT_CONTRACT</code>.</p>
        <ul className="site-list-muted">
          <li>
            <strong>$AEGIS</strong>{' '}
            {isPlaceholderAddress(L.tokenContract) ? '(not set)' : shortHex(L.tokenContract)}
          </li>
          <li>
            <strong>Agent contract</strong>{' '}
            {isPlaceholderAddress(L.agentContract) ? '(not set)' : shortHex(L.agentContract)}
          </li>
        </ul>
      </article>
    </div>
  )
}

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './App.css'
import {
  assessRisk,
  generateEscapePlan,
  prepareEmergencyTransfer,
  triggerSos,
} from './lib/agentOrchestrator'
import {
  EvidenceUploadError,
  uploadEvidenceViaApi,
} from './lib/evidenceApi'
import {
  connectBrowserWallet,
  normalizeAddress,
  sendEmergencyEthTransfer,
} from './lib/wallet'
import type {
  AgentLog,
  EscapeStep,
  EvidenceRecord,
  RiskSnapshot,
  SosResult,
} from './types/agent'
import type { JsonRpcSigner, Provider } from 'ethers'

function shortAddr(value: string) {
  const v = value.trim()
  if (v.length < 11) return v
  return `${v.slice(0, 6)}...${v.slice(-4)}`
}

export default function AegisStudio() {
  const [display, setDisplay] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [risk, setRisk] = useState<RiskSnapshot | null>(null)
  const [plan, setPlan] = useState<EscapeStep[]>([])
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [evidence, setEvidence] = useState<EvidenceRecord | null>(null)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [sosResult, setSosResult] = useState<SosResult | null>(null)
  const [sosError, setSosError] = useState<string | null>(null)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [signal, setSignal] = useState('Repeated monitoring and blocked account access')

  const [trustedContact, setTrustedContact] = useState(() => {
    try {
      return window.localStorage.getItem('aegis-trusted-contact') ?? ''
    } catch {
      return ''
    }
  })
  const [walletSummary, setWalletSummary] = useState<{
    account: string
    chainId: string
  } | null>(null)

  const signerRef = useRef<JsonRpcSigner | null>(null)
  const providerRef = useRef<Provider | null>(null)

  useEffect(() => {
    try {
      const trimmed = trustedContact.trim()
      if (trimmed) {
        window.localStorage.setItem('aegis-trusted-contact', trimmed)
      } else {
        window.localStorage.removeItem('aegis-trusted-contact')
      }
    } catch {
      // ignore unavailable storage (private browsing, etc.)
    }
  }, [trustedContact])

  const status = useMemo(() => {
    if (!risk) return 'Awaiting risk scan'
    return `Risk ${risk.score}/100 (${risk.severity})`
  }, [risk])

  const pushLogs = (nextLogs: AgentLog[]) => {
    setLogs((prev) => [...nextLogs, ...prev].slice(0, 24))
  }

  const disconnectWalletRefs = () => {
    signerRef.current = null
    providerRef.current = null
    setWalletSummary(null)
  }

  const connectWallet = async () => {
    setWalletError(null)
    setIsBusy(true)
    try {
      disconnectWalletRefs()
      const wallet = await connectBrowserWallet()
      signerRef.current = wallet.signer
      providerRef.current = wallet.provider
      setWalletSummary({
        account: wallet.account,
        chainId: wallet.chainId.toString(),
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to connect to your wallet.'
      setWalletError(message)
      signerRef.current = null
      providerRef.current = null
      setWalletSummary(null)
    } finally {
      setIsBusy(false)
    }
  }

  const onCalculatorInput = (value: string) => {
    const next = `${display}${value}`.slice(-8)
    setDisplay(next)
    if (next.endsWith('1999')) {
      setIsUnlocked(true)
      setDisplay('')
    }
  }

  const runSwarm = async (event: FormEvent) => {
    event.preventDefault()
    setIsBusy(true)
    try {
      const riskOut = await assessRisk(signal)
      setRisk(riskOut.risk)
      pushLogs(riskOut.logs)

      const planOut = await generateEscapePlan(riskOut.risk)
      setPlan(planOut.plan)
      pushLogs(planOut.logs)

      const transfer = await prepareEmergencyTransfer()
      pushLogs(transfer.logs)
    } finally {
      setIsBusy(false)
    }
  }

  const onEvidenceUpload = async (file: File | null) => {
    if (!file) return
    setIsBusy(true)
    setEvidenceError(null)
    try {
      const record = await uploadEvidenceViaApi(file)
      setEvidence(record)

      pushLogs([
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          agent: 'Evidence Agent',
          action: 'Evidence sealed',
          details: record.gatewayUrl
            ? `Uploaded to IPFS. Gateway: ${record.gatewayUrl}`
            : `Pinned to IPFS CID ${record.cid}`,
          severity: 'high',
        },
      ])
    } catch (err) {
      const fallback =
        err instanceof EvidenceUploadError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Evidence upload failed.'

      setEvidence(null)
      setEvidenceError(`${fallback}`)
    } finally {
      setIsBusy(false)
    }
  }

  const runSosEmergency = async (
    resolvedTrusted: string,
  ): Promise<{ result: SosResult; mode: 'chain' | 'demo' }> => {
    if (signerRef.current && providerRef.current) {
      const receipt = await sendEmergencyEthTransfer({
        signer: signerRef.current,
        provider: providerRef.current,
        toChecksummed: resolvedTrusted,
      })

      return {
        mode: 'chain',
        result: {
          wipeStatus: 'completed',
          trustedContact: resolvedTrusted,
          transferTxHash: receipt.transferTxHash,
          chainId: receipt.chainId,
        },
      }
    }

    const mocked = await triggerSos(resolvedTrusted)
    return { mode: 'demo', result: mocked.result }
  }

  const finalizeSosLogs = (result: SosResult, mode: 'chain' | 'demo') => {
    setEvidence(null)
    setPlan([])
    setRisk(null)

    const entry: AgentLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agent: 'SOS Agent',
      action:
        mode === 'chain'
          ? 'Emergency protocol executed (on-chain transfer)'
          : 'Emergency protocol executed (offline demo)',
      details:
        mode === 'chain'
          ? `Chain ${result.chainId ?? 'unknown'}, tx hash ${result.transferTxHash}`
          : `Simulated SOS transfer hash ${result.transferTxHash}`,
      severity: 'critical',
    }

    setSosResult(result)
    setLogs([entry])

    try {
      window.sessionStorage.clear()
    } catch {
      // ignore
    }

    disconnectWalletRefs()
    setTrustedContact('')
    try {
      window.localStorage.removeItem('aegis-trusted-contact')
    } catch {
      // ignore
    }
  }

  const onTriggerSos = async () => {
    setIsBusy(true)
    setSosError(null)

    try {
      if (!trustedContact.trim()) {
        throw new Error('Add your trusted Ethereum address before triggering SOS.')
      }

      let resolvedTrusted: string
      try {
        resolvedTrusted = normalizeAddress(trustedContact)
      } catch {
        throw new Error('Trusted contact must be a valid Ethereum address.')
      }

      const sos = await runSosEmergency(resolvedTrusted)
      finalizeSosLogs(sos.result, sos.mode)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'SOS activation failed unexpectedly.'
      setSosError(message)
    } finally {
      setIsBusy(false)
    }
  }

  const quickHide = () => {
    disconnectWalletRefs()
    setWalletError(null)

    try {
      window.localStorage.removeItem('aegis-trusted-contact')
      window.sessionStorage.clear()
    } catch {
      // ignore
    }

    setIsUnlocked(false)
    setDisplay('')
    setPlan([])
    setRisk(null)
    setEvidence(null)
    setEvidenceError(null)
    setTrustedContact('')
    setSosError(null)
    setSosResult(null)
    setLogs([])
  }

  if (!isUnlocked) {
    return (
      <main className="shell">
        <section className="calculator">
          <p className="badge">Calculator</p>
          <div className="screen">{display || '0'}</div>
          <div className="pad">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '='].map((key) => (
              <button key={key} onClick={() => onCalculatorInput(key)} type="button">
                {key}
              </button>
            ))}
          </div>
          <p className="muted hint">Looks like a harmless utility app.</p>
        </section>
      </main>
    )
  }

  const walletBadge = walletSummary
    ? `${shortAddr(walletSummary.account)} • chain ${walletSummary.chainId}`
    : 'Wallet disconnected'

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="badge">Protected session</p>
          <h1>Aegis AI</h1>
        </div>
        <div className="actions">
          <button type="button" onClick={connectWallet} disabled={isBusy}>
            {walletSummary ? 'Reconnect wallet' : 'Connect MetaMask'}
          </button>
          <button type="button" onClick={quickHide}>
            Quick Hide
          </button>
          <button type="button" onClick={onTriggerSos} disabled={isBusy}>
            Trigger SOS
          </button>
        </div>
      </header>

      <p className="muted">{walletBadge}</p>
      {walletError && <div className="banner error">{walletError}</div>}
      {sosError && <div className="banner error">{sosError}</div>}

      <section className="grid">
        <article className="card wide">
          <h2>Freedom Vault (EVM wallet)</h2>
          <div className="stack">
            <label className="field">
              <span>Trusted contact address</span>
              <input
                type="text"
                value={trustedContact}
                disabled={isBusy}
                onChange={(event) => {
                  setTrustedContact(event.target.value)
                  setSosError(null)
                }}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                placeholder="0x..."
              />
            </label>
            <div className="muted">
              Use a funded test wallet on Sepolia/Base Sepolia/etc. SOS sends nearly all ETH minus a gas buffer — never reuse this flow on prod keys without safeguards.
            </div>
          </div>
        </article>

        <article className="card">
          <h2>Guardian Input</h2>
          <form onSubmit={runSwarm} className="stack">
            <textarea
              value={signal}
              disabled={isBusy}
              onChange={(event) => setSignal(event.target.value)}
              rows={4}
              placeholder="Describe risk signals for agent analysis"
            />
            <button type="submit" disabled={isBusy}>
              Run Agent Swarm
            </button>
          </form>
          <p className="status">{status}</p>
          {risk && <p className="muted">{risk.reason}</p>}
        </article>

        <article className="card">
          <h2>Planner Output</h2>
          <ol>
            {plan.length === 0 && <li>No plan generated yet.</li>}
            {plan.map((step) => (
              <li key={step.id}>
                <strong>{step.title}</strong>
                <p className="muted">{step.why}</p>
              </li>
            ))}
          </ol>
        </article>

        <article className="card">
          <h2>Evidence Locker</h2>
          <input
            type="file"
            disabled={isBusy}
            onChange={(e) => onEvidenceUpload(e.target.files?.[0] ?? null)}
          />
          {evidenceError && (
            <p className="banner error">{evidenceError}</p>
          )}
          {!evidence && !evidenceError && (
            <p className="muted">No evidence pinned yet.</p>
          )}
          {evidence && (
            <div className="stack">
              <p>File: {evidence.fileName}</p>
              <p>CID: {evidence.cid}</p>
              <p>SHA-256: {evidence.sha256}</p>
              {evidence.txHash ? <p>Anchor tx (optional): {evidence.txHash}</p> : null}
              {evidence.gatewayUrl ? (
                <a className="link" href={evidence.gatewayUrl} target="_blank" rel="noreferrer">
                  Open pinned file on gateway
                </a>
              ) : (
                <p className="muted">Gateway unavailable for this CID.</p>
              )}
            </div>
          )}
          <div className="muted small">
            Upload proxies to Pinata v3 via your local `/api/ipfs/upload`. Start
            {' '}
            `PINATA_JWT=... npm run dev:api`.
          </div>
        </article>

        <article className="card">
          <h2>Agent Audit Trail</h2>
          <ul className="logs">
            {logs.length === 0 && <li>Waiting for first agent action.</li>}
            {logs.map((log) => (
              <li key={log.id}>
                <p>
                  <strong>{log.agent}</strong> • {log.action}
                </p>
                <p className="muted">{log.details}</p>
              </li>
            ))}
          </ul>
          {sosResult && (
            <div className="alert">
              SOS complete. Recipient {shortAddr(sosResult.trustedContact)} • tx{' '}
              {sosResult.transferTxHash.slice(0, 12)}...
              {typeof sosResult.chainId === 'string' ? ` • chain ${sosResult.chainId}` : ''}.
            </div>
          )}
          <p className="muted small">
            <Link className="link" to="/">
              Marketing site
            </Link>
            {' · '}
            <Link className="link" to="/dashboard">
              Dashboard
            </Link>
          </p>
        </article>
      </section>
    </main>
  )
}

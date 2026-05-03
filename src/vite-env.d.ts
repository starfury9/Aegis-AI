/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  /** Route SOS via KeeperHub when API exposes /api/sos/keeperhub and env is configured server-side */
  readonly VITE_SOS_USE_KEEPERHUB?: string
  /** Canonical deployed app URL (no trailing slash), e.g. https://your-app.vercel.app */
  readonly VITE_LIVE_APP_URL?: string
  /** Optional separate landing deployment */
  readonly VITE_LANDING_URL?: string
  /** Full URL if dashboard lives elsewhere (defaults to LIVE + /dashboard) */
  readonly VITE_AGENT_DASHBOARD_URL?: string
  /** Full donate URL override (defaults to LIVE + /donate) */
  readonly VITE_DONATION_URL?: string
  readonly VITE_TOKEN_CONTRACT?: string
  readonly VITE_AGENT_CONTRACT?: string
  readonly VITE_TREASURY_ADDRESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  }
}

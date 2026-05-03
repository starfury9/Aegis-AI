export type AgentName =
  | 'Guardian Agent'
  | 'Planner Agent'
  | 'Finance Agent'
  | 'Evidence Agent'
  | 'SOS Agent'

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface AgentLog {
  id: string
  timestamp: string
  agent: AgentName
  action: string
  details: string
  severity: Severity
}

export interface RiskSnapshot {
  score: number
  severity: Severity
  reason: string
}

export interface EscapeStep {
  id: string
  title: string
  why: string
}

export interface EvidenceRecord {
  id: string
  fileName: string
  sha256: string
  /** 0G Storage root hash (shown as CID in UI for compatibility). */
  cid: string
  gatewayUrl?: string
  txHash?: string
}

export interface SosResult {
  transferTxHash: string
  wipeStatus: 'completed'
  trustedContact: string
  chainId?: string
}

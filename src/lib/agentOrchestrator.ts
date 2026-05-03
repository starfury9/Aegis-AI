import type { AgentLog, EscapeStep, RiskSnapshot, Severity, SosResult } from '../types/agent'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const randomHex = (size: number) =>
  Array.from({ length: size }, () => Math.floor(Math.random() * 16).toString(16)).join('')

const now = () => new Date().toISOString()

const severityFromScore = (score: number): Severity => {
  if (score >= 85) return 'critical'
  if (score >= 65) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export async function assessRisk(userSignal: string): Promise<{ risk: RiskSnapshot; logs: AgentLog[] }> {
  await wait(350)
  const score = Math.min(96, Math.max(28, 45 + userSignal.length * 2))
  const severity = severityFromScore(score)
  const reason =
    severity === 'critical'
      ? 'Urgent distress markers detected in recent inputs.'
      : 'Behavioral and context markers indicate elevated risk.'

  return {
    risk: { score, severity, reason },
    logs: [
      {
        id: crypto.randomUUID(),
        timestamp: now(),
        agent: 'Guardian Agent',
        action: 'Risk assessment completed',
        details: `Computed risk score ${score}/100 with severity ${severity}.`,
        severity,
      },
    ],
  }
}

export async function generateEscapePlan(risk: RiskSnapshot): Promise<{ plan: EscapeStep[]; logs: AgentLog[] }> {
  await wait(400)
  const plan: EscapeStep[] = [
    {
      id: crypto.randomUUID(),
      title: 'Prepare trusted contact fallback',
      why: 'A contact fallback allows SOS transfer routing even when device access is lost.',
    },
    {
      id: crypto.randomUUID(),
      title: 'Package legal-ready evidence',
      why: 'Timestamped records increase legal credibility and prevent tampering claims.',
    },
    {
      id: crypto.randomUUID(),
      title: 'Set 72-hour relocation budget',
      why: `Current risk level (${risk.severity}) requires immediate liquidity and transport planning.`,
    },
  ]

  return {
    plan,
    logs: [
      {
        id: crypto.randomUUID(),
        timestamp: now(),
        agent: 'Planner Agent',
        action: 'Adaptive escape plan generated',
        details: 'Produced 3 immediate steps based on risk severity and urgency horizon.',
        severity: risk.severity,
      },
    ],
  }
}

export async function prepareEmergencyTransfer(): Promise<{ transferPreview: string; logs: AgentLog[] }> {
  await wait(320)
  const transferPreview = `0x${randomHex(40)}`
  return {
    transferPreview,
    logs: [
      {
        id: crypto.randomUUID(),
        timestamp: now(),
        agent: 'Finance Agent',
        action: 'Emergency transfer route prepared',
        details: `Prepared SOS funding preview ${transferPreview.slice(0, 10)}... (resolved at trigger time when wallet is connected).`,
        severity: 'high',
      },
    ],
  }
}

export async function triggerSos(trustedContact: string): Promise<{ result: SosResult; logs: AgentLog[] }> {
  await wait(500)
  const transferTxHash = `0x${randomHex(64)}`
  return {
    result: {
      transferTxHash,
      wipeStatus: 'completed',
      trustedContact,
    },
    logs: [
      {
        id: crypto.randomUUID(),
        timestamp: now(),
        agent: 'SOS Agent',
        action: 'Emergency protocol executed',
        details: 'Transfer submitted and local emergency wipe completed.',
        severity: 'critical',
      },
    ],
  }
}

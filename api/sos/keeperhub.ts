import type { VercelRequest, VercelResponse } from '@vercel/node'

import { loadApiEnv } from '../../server/loadEnv.ts'
import { submitKeeperHubSos } from '../../server/keeperhubSos.ts'

loadApiEnv()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string | undefined) ?? '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const body =
    typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {}
  const recipient = body.recipientAddress
  if (typeof recipient !== 'string' || !recipient.trim()) {
    return res.status(400).json({ error: 'recipientAddress required' })
  }

  try {
    const out = await submitKeeperHubSos(recipient)
    return res.status(200).json(out)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'KeeperHub SOS failed'
    const status = msg.includes('not configured') ? 503 : 500
    return res.status(status).json({ error: msg })
  }
}

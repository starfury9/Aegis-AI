import { ethers } from 'ethers'

const DEFAULT_API_BASE = 'https://app.keeperhub.com/api'

function apiBase(): string {
  return (process.env.KEEPERHUB_API_BASE ?? DEFAULT_API_BASE).replace(/\/+$/, '')
}

function unwrapData(json: unknown): Record<string, unknown> {
  if (json !== null && typeof json === 'object' && 'data' in json) {
    const inner = (json as { data: unknown }).data
    if (inner !== null && typeof inner === 'object') return inner as Record<string, unknown>
  }
  return json !== null && typeof json === 'object' ? (json as Record<string, unknown>) : {}
}

function readKeeperConfig() {
  const apiKey = (process.env.KEEPERHUB_API_KEY ?? '').trim()
  const network = (process.env.KEEPERHUB_SOS_NETWORK ?? '').trim()
  const amount = (process.env.KEEPERHUB_SOS_AMOUNT ?? '').trim()
  const chainIdFallback = (process.env.KEEPERHUB_SOS_CHAIN_ID ?? '').trim()
  const gasMult = (process.env.KEEPERHUB_GAS_MULTIPLIER ?? '1.2').trim()

  return { apiKey, network, amount, chainIdFallback, gasMult }
}

export function keeperHubSosEnvReady(): boolean {
  const { apiKey, network, amount } = readKeeperConfig()
  return Boolean(apiKey && network && amount)
}

async function khJson(
  apiKey: string,
  pathname: string,
  init?: RequestInit,
): Promise<{ res: Response; data: Record<string, unknown>; text: string }> {
  const base = apiBase()
  const url = `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
  const method = (init?.method ?? 'GET').toString().toUpperCase()
  const withBody = method === 'POST' || method === 'PUT' || method === 'PATCH'
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(withBody ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const text = await res.text()
  let parsed: Record<string, unknown>
  try {
    parsed = text.trim() ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    parsed = {}
  }
  return { res, data: unwrapData(parsed), text }
}

async function pollExecutionReceipt(
  apiKey: string,
  executionId: string,
): Promise<{ transactionHash: string; chainId?: string }> {
  const maxAttempts = 40
  const delayMs = 500

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { res, data } = await khJson(apiKey, `/execute/${encodeURIComponent(executionId)}/status`)

    if (!res.ok) {
      const errMsg =
        typeof data.error === 'string'
          ? data.error
          : data.error && typeof data.error === 'object' && data.error !== null && 'message' in data.error
            ? String((data.error as { message: unknown }).message)
          : await res.text()
      throw new Error(`KeeperHub status (${res.status}): ${String(errMsg).slice(0, 240)}`)
    }

    const status = String(data.status ?? '')
    if (status === 'failed') {
      const errDetail =
        typeof data.error === 'string'
          ? data.error
          : data.error !== null && typeof data.error === 'object'
            ? JSON.stringify(data.error)
            : 'execution failed'
      throw new Error(`KeeperHub execution failed: ${errDetail}`)
    }

    const txHash = typeof data.transactionHash === 'string' ? data.transactionHash : ''
    if (status === 'completed' && txHash) {
      const chainCandidate = data.chainId
      let chainStr: string | undefined
      if (typeof chainCandidate === 'number' || typeof chainCandidate === 'string') {
        chainStr = String(chainCandidate)
      }
      return { transactionHash: txHash, chainId: chainStr }
    }

    if (status !== 'pending' && status !== 'running' && status !== 'completed') {
      throw new Error(`KeeperHub unexpected status "${status}"`)
    }

    await new Promise((r) => setTimeout(r, delayMs))
  }

  throw new Error('KeeperHub execution timed out waiting for transaction hash')
}

/**
 * Executes a native token transfer via [KeeperHub Direct Execution](https://docs.keeperhub.com/api/direct-execution).
 * Sends from your **KeeperHub organisation wallet**, not from the user's browser wallet.
 */
export async function submitKeeperHubSos(recipientRaw: string): Promise<{
  transferTxHash: string
  keeperHubExecutionId: string
  trustedContact: string
  chainId?: string
}> {
  const { apiKey, network, amount, chainIdFallback, gasMult } = readKeeperConfig()

  if (!apiKey) throw new Error('KEEPERHUB_API_KEY not configured on API host')
  if (!network) throw new Error('KEEPERHUB_SOS_NETWORK not configured (KeeperHub slug, e.g. sepolia — see chains API)')
  if (!amount) throw new Error('KEEPERHUB_SOS_AMOUNT not configured (human units, e.g. 0.01)')

  const trustedContact = ethers.getAddress(recipientRaw.trim())

  const { res, data } = await khJson(apiKey, '/execute/transfer', {
    method: 'POST',
    body: JSON.stringify({
      network,
      recipientAddress: trustedContact,
      amount,
      gasLimitMultiplier: gasMult || '1.2',
    }),
  })

  if (!res.ok) {
    const msg =
      typeof data.error === 'string'
        ? data.error
        : data.field && data.details
          ? `${String(data.field)}: ${String(data.details)}`
          : JSON.stringify(data).slice(0, 260)
    throw new Error(`KeeperHub transfer failed (${res.status}): ${msg}`)
  }

  const executionId =
    typeof data.executionId === 'string' ? data.executionId : String(data.executionId ?? '')
  if (!executionId) throw new Error('KeeperHub response missing executionId')

  const status = typeof data.status === 'string' ? data.status : ''
  let transferTxHash: string | undefined
  let chainId: string | undefined

  const maybeTx = typeof data.transactionHash === 'string' ? data.transactionHash : ''
  const cidRaw = data.chainId

  if (status === 'completed' && maybeTx) {
    transferTxHash = maybeTx
    if (typeof cidRaw === 'number' || typeof cidRaw === 'string') chainId = String(cidRaw)
  } else {
    const polled = await pollExecutionReceipt(apiKey, executionId)
    transferTxHash = polled.transactionHash
    chainId = polled.chainId
  }

  if (chainIdFallback && !chainId) chainId = chainIdFallback

  if (!transferTxHash) throw new Error('KeeperHub completed without transaction hash')

  return {
    transferTxHash,
    keeperHubExecutionId: executionId,
    trustedContact,
    chainId,
  }
}

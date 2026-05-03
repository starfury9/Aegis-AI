function apiBase(): string {
  return import.meta.env.VITE_API_BASE ?? ''
}

/** True when SPA is allowed to route SOS through KeeperHub and health reports readiness. */
export async function keeperHubSosAdvertisedReady(): Promise<boolean> {
  if (import.meta.env.VITE_SOS_USE_KEEPERHUB !== 'true') return false
  try {
    const res = await fetch(`${apiBase()}/api/health`)
    if (!res.ok) return false
    const json = (await res.json()) as { keeperHubSosConfigured?: boolean }
    return json?.keeperHubSosConfigured === true
  } catch {
    return false
  }
}

export async function requestKeeperHubSos(recipientAddress: string): Promise<{
  transferTxHash: string
  keeperHubExecutionId: string
  trustedContact: string
  chainId?: string
}> {
  const url = `${apiBase()}/api/sos/keeperhub`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientAddress }),
  })

  const raw = await response.text().catch(() => '')
  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw.trim() || '{}') as Record<string, unknown>
  } catch {
    if (!response.ok) throw new Error(`KeeperHub SOS failed (${response.status}) — invalid JSON`)
    throw new Error('KeeperHub SOS succeeded but returned invalid JSON')
  }

  if (!response.ok) {
    const err =
      typeof body.error === 'string'
        ? body.error
        : `KeeperHub SOS failed (${response.status})`
    throw new Error(err.slice(0, 420))
  }

  const transferTxHash = typeof body.transferTxHash === 'string' ? body.transferTxHash : ''
  const keeperHubExecutionId =
    typeof body.keeperHubExecutionId === 'string' ? body.keeperHubExecutionId : ''
  const trustedContact = typeof body.trustedContact === 'string' ? body.trustedContact : ''
  if (!transferTxHash || !keeperHubExecutionId || !trustedContact) {
    throw new Error('KeeperHub SOS missing transferTxHash, keeperHubExecutionId, or trustedContact')
  }

  const chainId = typeof body.chainId === 'string' ? body.chainId : undefined
  return { transferTxHash, keeperHubExecutionId, trustedContact, chainId }
}

import type { EvidenceRecord } from '../types/agent'

export class EvidenceUploadError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'EvidenceUploadError'
    this.status = status
  }
}

function apiBase(): string {
  return import.meta.env.VITE_API_BASE ?? ''
}

export async function uploadEvidenceViaApi(file: File): Promise<EvidenceRecord> {
  const fd = new FormData()
  fd.append('file', file, file.name)

  const url = `${apiBase()}/api/ipfs/upload`
  const response = await fetch(url, {
    method: 'POST',
    body: fd,
  })

  if (!response.ok) {
    const raw = await response.text().catch(() => '')
    let message = raw?.trim()?.length ? raw.trim().slice(0, 260) : `Upload failed (${response.status})`
    try {
      const body = JSON.parse(raw) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      // keep textual message fallback
    }
    throw new EvidenceUploadError(message, response.status)
  }

  const data = (await response.json()) as {
    cid: string
    sha256: string
    gatewayUrl?: string
    fileName?: string
    txHash?: string
  }

  return {
    id: crypto.randomUUID(),
    fileName: data.fileName ?? file.name,
    cid: data.cid,
    sha256: data.sha256,
    gatewayUrl: data.gatewayUrl,
    txHash: data.txHash,
  }
}

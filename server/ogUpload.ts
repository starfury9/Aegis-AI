import crypto from 'node:crypto'

import { Indexer, MemData } from '@0gfoundation/0g-storage-ts-sdk'
import { Wallet, JsonRpcProvider } from 'ethers'

export type UploadReceipt =
  | { txHash: string; rootHash: string; txSeq: number }
  | { txHashes: string[]; rootHashes: string[]; txSeqs: number[] }

function pickRootAndTx(uploadResult: UploadReceipt): { rootHash: string; txHash: string } {
  if ('rootHashes' in uploadResult && uploadResult.rootHashes.length > 0) {
    const i = uploadResult.rootHashes.length - 1
    const rootHash = uploadResult.rootHashes[i]
    const txHash = uploadResult.txHashes[i]
    if (rootHash && txHash) return { rootHash, txHash }
  }
  if ('rootHash' in uploadResult && uploadResult.rootHash) {
    return { rootHash: uploadResult.rootHash, txHash: uploadResult.txHash }
  }
  throw new Error('0G Storage upload returned empty root hashes')
}

function storagescanHref(rootHash: string): string {
  const tmpl = process.env.OG_STORAGE_GATEWAY_TEMPLATE?.trim()
  if (tmpl?.includes('{rootHash}')) return tmpl.replaceAll('{rootHash}', rootHash)
  const base = (process.env.OG_STORAGE_VERIFY_BASE ?? 'https://storagescan.0g.ai').replace(/\/+$/, '')
  return base
}

export type OgUploadResult = {
  fileName: string
  cid: string
  sha256: string
  gatewayUrl: string
  txHash: string
}

export type OgUploadFailure = { status: number; error: string }

export async function uploadEvidenceTo0g(
  fileBytes: Uint8Array,
  originalNameHint: string | undefined,
): Promise<OgUploadResult | OgUploadFailure> {
  const OG_RPC_URL = process.env.OG_STORAGE_RPC_URL ?? 'https://evmrpc-testnet.0g.ai'
  const OG_INDEXER_RPC = process.env.OG_STORAGE_INDEXER_RPC ?? 'https://indexer-storage-testnet-turbo.0g.ai'
  const OG_PRIVATE_KEY = (process.env.OG_STORAGE_PRIVATE_KEY ?? '').trim()

  if (!OG_PRIVATE_KEY) {
    return {
      status: 503,
      error:
        '0G Storage not configured: set OG_STORAGE_PRIVATE_KEY (0x… server wallet on OG testnet — faucet.0g.ai)',
    }
  }

  const digest = crypto.createHash('sha256').update(fileBytes).digest('hex')
  const fileName =
    Buffer.from(originalNameHint ?? 'evidence', 'latin1').toString('utf8') ||
    originalNameHint ||
    `evidence-${Date.now()}`

  let signer: Wallet
  try {
    signer = new Wallet(OG_PRIVATE_KEY, new JsonRpcProvider(OG_RPC_URL))
  } catch {
    return { status: 503, error: 'Invalid OG_STORAGE_PRIVATE_KEY' }
  }

  const indexer = new Indexer(OG_INDEXER_RPC)
  const mem = new MemData(fileBytes)

  try {
    const [raw, uploadErr] = await indexer.upload(mem, OG_RPC_URL, signer)
    if (uploadErr) return { status: 502, error: uploadErr.message }
    const { rootHash, txHash } = pickRootAndTx(raw as UploadReceipt)

    return {
      fileName,
      cid: rootHash,
      sha256: digest,
      gatewayUrl: storagescanHref(rootHash),
      txHash,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unexpected error'
    return { status: 500, error: msg }
  }
}

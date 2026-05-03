import type { VercelRequest, VercelResponse } from '@vercel/node'

import { keeperHubSosEnvReady } from '../server/keeperhubSos.ts'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const OG_RPC_URL = process.env.OG_STORAGE_RPC_URL ?? 'https://evmrpc-testnet.0g.ai'
  const OG_INDEXER_RPC = process.env.OG_STORAGE_INDEXER_RPC ?? 'https://indexer-storage-testnet-turbo.0g.ai'
  const OG_VERIFY_BASE = (process.env.OG_STORAGE_VERIFY_BASE ?? 'https://storagescan.0g.ai').replace(
    /\/+$/,
    '',
  )
  const OG_PRIVATE_KEY = (process.env.OG_STORAGE_PRIVATE_KEY ?? '').trim()

  return res.status(200).json({
    ok: true,
    runtime: 'vercel-serverless',
    storageBackend: '0g-storage',
    ogStorageConfigured: Boolean(OG_PRIVATE_KEY.length),
    keeperHubSosConfigured: keeperHubSosEnvReady(),
    chainRpc: OG_RPC_URL,
    indexerRpc: OG_INDEXER_RPC,
    storagescan: OG_VERIFY_BASE,
  })
}

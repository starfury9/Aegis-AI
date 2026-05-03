import cors from 'cors'
import express from 'express'
import multer from 'multer'

import { keeperHubSosEnvReady, submitKeeperHubSos } from './keeperhubSos.ts'
import { loadApiEnv } from './loadEnv.ts'
import { uploadEvidenceTo0g } from './ogUpload.ts'

loadApiEnv()

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

const PORT = Number(process.env.AEGIS_API_PORT ?? 8787)

const OG_RPC_URL = process.env.OG_STORAGE_RPC_URL ?? 'https://evmrpc-testnet.0g.ai'
const OG_INDEXER_RPC = process.env.OG_STORAGE_INDEXER_RPC ?? 'https://indexer-storage-testnet-turbo.0g.ai'
const OG_PRIVATE_KEY = (process.env.OG_STORAGE_PRIVATE_KEY ?? '').trim()
const OG_VERIFY_BASE = (process.env.OG_STORAGE_VERIFY_BASE ?? 'https://storagescan.0g.ai').replace(
  /\/+$/,
  '',
)

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    storageBackend: '0g-storage',
    ogStorageConfigured: Boolean(OG_PRIVATE_KEY.length),
    keeperHubSosConfigured: keeperHubSosEnvReady(),
    chainRpc: OG_RPC_URL,
    indexerRpc: OG_INDEXER_RPC,
    storagescan: OG_VERIFY_BASE,
    port: PORT,
  })
})

app.post('/api/sos/keeperhub', async (req, res) => {
  const recipient = req.body?.recipientAddress
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
})

app.post('/api/ipfs/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const out = await uploadEvidenceTo0g(new Uint8Array(req.file.buffer), req.file.originalname)
  if ('error' in out) return res.status(out.status).json({ error: out.error })
  return res.status(200).json(out)
})

app.listen(PORT, () => {
  console.log(`Aegis API listening on ${PORT} (0G Storage)`)
})

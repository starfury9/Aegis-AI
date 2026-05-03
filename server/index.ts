import 'dotenv/config'
import crypto from 'node:crypto'

import cors from 'cors'
import express from 'express'
import multer from 'multer'

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

const PORT = Number(process.env.AEGIS_API_PORT ?? 8787)
const TOKEN = process.env.PINATA_JWT ?? ''
const PINATA_GATEWAY = (process.env.PINATA_GATEWAY ?? '').trim()
const FALLBACK_GATEWAY = (process.env.IPFS_GATEWAY ?? 'https://gateway.pinata.cloud/ipfs').replace(/\/+$/, '')

function buildGatewayUrl(cid: string): string {
  if (PINATA_GATEWAY) {
    return `https://${PINATA_GATEWAY}/ipfs/${cid}`
  }
  return `${FALLBACK_GATEWAY}/${cid}`
}

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    pinataConfigured: Boolean(TOKEN.length),
    gateway: PINATA_GATEWAY || FALLBACK_GATEWAY,
    port: PORT,
  })
})

app.post('/api/ipfs/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  if (!TOKEN) return res.status(503).json({ error: 'Pinata JWT not configured (set PINATA_JWT)' })

  const digest = crypto.createHash('sha256').update(req.file.buffer).digest('hex')
  const fileName =
    Buffer.from(req.file.originalname ?? 'evidence', 'latin1').toString('utf8') ||
    req.file.originalname ||
    `evidence-${Date.now()}`

  const form = new FormData()
  const blob = new Blob([new Uint8Array(req.file.buffer)], {
    type: req.file.mimetype || 'application/octet-stream',
  })
  form.append('file', blob, fileName)
  form.append('network', 'public')

  try {
    const pinRes = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: form,
    })

    const bodyText = await pinRes.text()
    if (!pinRes.ok) return res.status(502).json({ error: bodyText.slice(0, 400) })

    let parsed: { data?: { cid?: string; name?: string } }
    try {
      parsed = JSON.parse(bodyText) as { data?: { cid?: string; name?: string } }
    } catch {
      return res.status(502).json({ error: 'Pinata responded with invalid JSON' })
    }

    const cid = parsed?.data?.cid ?? ''
    if (!cid) return res.status(502).json({ error: 'Unexpected Pinata response (missing data.cid)' })

    return res.status(200).json({
      fileName: parsed?.data?.name ?? fileName,
      cid,
      sha256: digest,
      gatewayUrl: buildGatewayUrl(cid),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unexpected error'
    return res.status(500).json({ error: msg })
  }
})

app.listen(PORT, () => {
  console.log(`Aegis API listening on ${PORT}`)
})

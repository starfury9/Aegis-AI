/// <reference lib="dom" />
import crypto from 'node:crypto'

import cors from 'cors'
import express from 'express'
import multer from 'multer'

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

const PORT = Number(process.env.AEGIS_API_PORT ?? 8787)
const TOKEN = process.env.PINATA_JWT ?? ''
const IPFS_GATEWAY = (process.env.IPFS_GATEWAY ?? 'https://gateway.pinata.cloud/ipfs').replace(/\/+$/, '')

app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    pinataConfigured: Boolean(TOKEN.length),
    ipfsGateway: IPFS_GATEWAY,
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
  const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'application/octet-stream' })
  form.append('file', blob, fileName)

  try {
    const pinRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: form,
    })

    const bodyText = await pinRes.text()
    if (!pinRes.ok) return res.status(502).json({ error: bodyText.slice(0, 400) })

    let parsed: { IpfsHash?: string }
    try {
      parsed = JSON.parse(bodyText) as { IpfsHash?: string }
    } catch {
      return res.status(502).json({ error: 'Pinata responded with invalid JSON' })
    }

    const cid = parsed?.IpfsHash ?? ''
    if (!cid) return res.status(502).json({ error: 'Unexpected Pinata response (missing IpfsHash)' })

    return res.status(200).json({
      fileName,
      cid,
      sha256: digest,
      gatewayUrl: `${IPFS_GATEWAY}/${cid}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unexpected error'
    return res.status(500).json({ error: msg })
  }
})

app.listen(PORT, () => {
  console.log(`Aegis API listening on ${PORT}`)
})

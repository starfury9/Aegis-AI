import type { VercelRequest, VercelResponse } from '@vercel/node'
import busboy from 'busboy'

import { uploadEvidenceTo0g } from '../../server/ogUpload.ts'

export const config = {
  api: {
    bodyParser: false as const,
  },
}

function parseMultipartFile(req: VercelRequest): Promise<{ buffer: Buffer; filename: string } | null> {
  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: req.headers as Record<string, string | undefined>,
      limits: { fileSize: 25 * 1024 * 1024 },
    })
    const chunks: Buffer[] = []
    let filename = 'evidence'

    bb.on('file', (_name, stream, info) => {
      filename = info.filename || filename
      stream.on('data', (chunk: Buffer) => {
        chunks.push(Buffer.from(chunk))
      })
    })

    bb.on('finish', () => {
      if (chunks.length === 0) {
        resolve(null)
        return
      }
      resolve({ buffer: Buffer.concat(chunks), filename })
    })
    bb.on('error', reject)
    req.pipe(bb)
  })
}

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

  try {
    const parsed = await parseMultipartFile(req)
    if (!parsed?.buffer.length) return res.status(400).json({ error: 'No file uploaded' })

    const out = await uploadEvidenceTo0g(new Uint8Array(parsed.buffer), parsed.filename)
    if ('error' in out) return res.status(out.status).json({ error: out.error })

    return res.status(200).json(out)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'multipart parse failed'
    return res.status(500).json({ error: msg })
  }
}

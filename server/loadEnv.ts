import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'

/**
 * Loads `server/.env` then repo-root `.env`.
 * Blank values (`KEY=`) never wipe a nonempty value already collected.
 * If both define a nonempty value, repo-root `.env` wins (last-applied nonempty).
 */
export function loadApiEnv(): void {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const paths = [
    path.join(repoRoot, 'server', '.env'),
    path.join(repoRoot, '.env'),
  ] as const

  const merged: Record<string, string> = {}

  for (const filePath of paths) {
    let parsed: Record<string, string>
    try {
      parsed = dotenv.parse(fs.readFileSync(filePath, 'utf8'))
    } catch {
      continue
    }
    for (const [rawKey, rawVal] of Object.entries(parsed)) {
      const trimmed = typeof rawVal === 'string' ? rawVal.trim() : ''
      if (!trimmed) continue
      merged[rawKey] = trimmed
    }
  }

  for (const [key, value] of Object.entries(merged)) {
    process.env[key] = value
  }
}

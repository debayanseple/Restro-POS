import fs from "fs"
import path from "path"
import os from "os"

// Global in-memory cache preserved across hot serverless executions
declare global {
  // eslint-disable-next-line no-var
  var __restro_store_cache: Record<string, any> | undefined
}

if (!globalThis.__restro_store_cache) {
  globalThis.__restro_store_cache = {}
}

const memoryCache = globalThis.__restro_store_cache

const LOCAL_DATA_DIR = path.join(process.cwd(), "data")
const TMP_DATA_DIR = path.join(os.tmpdir(), "restro-data")

/**
 * Safely reads a store file with support for:
 * 1. Global in-memory cache (fastest, keeps state alive across hot serverless invocations)
 * 2. Writable /tmp in serverless environments (e.g. Vercel)
 * 3. Seed data bundled in process.cwd()/data
 * 4. In-code fallback default
 */
export function readStore<T>(filename: string, fallback: T): T {
  // 1. Check in-memory cache
  if (memoryCache[filename] !== undefined) {
    return memoryCache[filename] as T
  }

  // 2. Check /tmp in serverless environments
  try {
    const tmpFile = path.join(TMP_DATA_DIR, filename)
    if (fs.existsSync(tmpFile)) {
      const content = fs.readFileSync(tmpFile, "utf-8")
      const parsed = JSON.parse(content)
      if (parsed !== undefined) {
        memoryCache[filename] = parsed
        return parsed as T
      }
    }
  } catch {
    // Continue to next source
  }

  // 3. Check bundled seed data in process.cwd()/data
  try {
    const localFile = path.join(LOCAL_DATA_DIR, filename)
    if (fs.existsSync(localFile)) {
      const content = fs.readFileSync(localFile, "utf-8")
      const parsed = JSON.parse(content)
      if (parsed !== undefined) {
        memoryCache[filename] = parsed
        return parsed as T
      }
    }
  } catch {
    // Continue to fallback
  }

  // 4. Fallback
  memoryCache[filename] = fallback
  return fallback
}

/**
 * Safely writes a store file:
 * 1. Updates global in-memory cache
 * 2. Writes to process.cwd()/data (if writable, e.g. local dev)
 * 3. Writes to /tmp/restro-data (writable on Vercel / serverless)
 */
export function writeStore<T>(filename: string, data: T): void {
  // Update in-memory cache
  memoryCache[filename] = data

  const serialized = JSON.stringify(data, null, 2)

  // Try writing to local data dir (local dev)
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(path.join(LOCAL_DATA_DIR, filename), serialized, "utf-8")
  } catch {
    // Expected on read-only serverless filesystems like Vercel
  }

  // Always write to /tmp in serverless environments
  try {
    if (!fs.existsSync(TMP_DATA_DIR)) {
      fs.mkdirSync(TMP_DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(path.join(TMP_DATA_DIR, filename), serialized, "utf-8")
  } catch (err) {
    console.warn(`[serverless-store] Failed to write to /tmp for ${filename}:`, err)
  }
}

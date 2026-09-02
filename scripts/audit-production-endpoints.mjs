import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUIRED_API_BASE = 'https://api.xiaole.app'
const LEGACY_HOSTS = ['api.leke.xyz', 'ai.leke.xyz']
const EXECUTABLE_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.json', '.css'])
const CANONICAL_CHAT_ENDPOINT = '/api/chat/stream'

export async function auditProductionEndpoints(distDir) {
  const files = (await walk(distDir)).filter((file) => EXECUTABLE_EXTENSIONS.has(path.extname(file)))
  const contents = await Promise.all(files.map(async (file) => ({
    file,
    content: await readFile(path.join(distDir, file), 'utf8')
  })))

  const legacyHits = contents.flatMap(({ file, content }) =>
    LEGACY_HOSTS.filter((host) => content.includes(host)).map((host) => `${file}: ${host}`)
  )
  if (legacyHits.length) {
    throw new Error(`Legacy production API endpoint found: ${legacyHits.join(', ')}`)
  }

  const combined = contents.map(({ content }) => content).join('\n')
  if (!combined.includes(REQUIRED_API_BASE)) {
    throw new Error(`Required production API endpoint missing: ${REQUIRED_API_BASE}`)
  }

  const absoluteApiOrigins = new Set(
    [...combined.matchAll(/https:\/\/api\.[a-z0-9.-]+/gi)].map((match) => match[0])
  )
  const unexpected = [...absoluteApiOrigins].filter((origin) => origin !== REQUIRED_API_BASE)
  if (unexpected.length) {
    throw new Error(`Unexpected production API endpoint found: ${unexpected.join(', ')}`)
  }

  const noncanonicalChatEndpoints = [
    ['/api/v2/chat', combined.includes('/api/v2/chat')],
    ['/api/chat', combined.includes('/api/chat?')],
    ['/chat/stream', /(^|[^a-zA-Z0-9_/])\/chat\/stream/.test(combined)]
  ].filter(([, found]) => found).map(([endpoint]) => endpoint)
  if (noncanonicalChatEndpoints.length) {
    throw new Error(`Noncanonical Chat endpoint found: ${noncanonicalChatEndpoints.join(', ')}`)
  }

  if (!combined.includes(CANONICAL_CHAT_ENDPOINT)) {
    throw new Error(`Canonical Chat endpoint missing: ${CANONICAL_CHAT_ENDPOINT}`)
  }

  return {
    productionApiBase: REQUIRED_API_BASE,
    canonicalChatEndpoint: CANONICAL_CHAT_ENDPOINT,
    filesScanned: files.length
  }
}

async function walk(root, relative = '') {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const name = path.posix.join(relative, entry.name)
    return entry.isDirectory() ? walk(root, name) : [name]
  }))
  return nested.flat()
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
  const result = await auditProductionEndpoints(distDir)
  console.log(`Production endpoint audit passed (${result.filesScanned} files): ${result.productionApiBase}`)
}

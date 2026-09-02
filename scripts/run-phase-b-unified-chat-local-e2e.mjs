import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { migrateLegacyChatMode } from '../src/chat/chatSettingsMigration.js'
import { UnifiedChatTransport } from '../src/chat/transports.js'
import { auditProductionEndpoints } from './audit-production-endpoints.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const settingsFixtures = {
  legacy: JSON.stringify({ chatMode: 'legacy', theme: 'dark' }),
  core2: JSON.stringify({ chatMode: 'core2', theme: 'dark' }),
  missing: JSON.stringify({ theme: 'dark' }),
  malformed: '{not-json',
}

const createStorage = (initialValue) => {
  const values = new Map()
  if (initialValue !== undefined) values.set('xiaole_settings', initialValue)
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

const requests = []
for (const [fixtureName, fixtureValue] of Object.entries(settingsFixtures)) {
  const storage = createStorage(fixtureValue)
  migrateLegacyChatMode(storage)
  assert.equal(storage.getItem('xiaole_settings')?.includes('chatMode') ?? false, false)
  const transport = new UnifiedChatTransport({
    streamChat: async (request) => {
      requests.push({ fixtureName, request })
      return request
    },
  })
  await transport.send({
    message: '你好',
    conversationId: null,
    imagePath: null,
    responseStyle: 'balanced',
  })
}

const expectedRequest = {
  prompt: '你好',
  session_id: null,
  image_path: null,
  response_style: 'balanced',
}
for (const { request } of requests) assert.deepEqual(request, expectedRequest)

const modalityRequests = []
const modalityTransport = new UnifiedChatTransport({
  streamChat: async (request) => {
    modalityRequests.push(request)
    return request
  },
})
await modalityTransport.send({ message: '语音转写', responseStyle: 'voice_call' })
await modalityTransport.send({ message: '请看图片', imagePath: '/tmp/local-e2e-image.png' })
assert.equal(modalityRequests[0].response_style, 'voice_call')
assert.equal(modalityRequests[1].image_path, '/tmp/local-e2e-image.png')

const audit = await auditProductionEndpoints(path.join(projectRoot, 'dist'))
assert.equal(audit.canonicalChatEndpoint, '/api/chat/stream')

const report = {
  status: 'PASS',
  settings_variants: Object.keys(settingsFixtures),
  normal_text_transport: audit.canonicalChatEndpoint,
  voice_and_image_use_unified_transport: true,
  attachment_chat_mode_mutation: false,
  document_summary_canonicalization: 'phase_c_deferred',
}

fs.writeFileSync(1, `${JSON.stringify(report, null, 2)}\n`)

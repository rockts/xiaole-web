import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

async function fixture(files) {
  const root = await mkdtemp(path.join(tmpdir(), 'xiaole-endpoint-audit-'))
  await Promise.all(Object.entries(files).map(async ([name, content]) => {
    const target = path.join(root, name)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content)
  }))
  return root
}

describe('production endpoint audit', () => {
  test('rejects legacy API endpoints in executable build artifacts', async () => {
    const module = await import('../../../scripts/audit-production-endpoints.mjs').catch(() => null)
    expect(module, 'production endpoint auditor must exist').not.toBeNull()

    const dist = await fixture({
      'index.html': '<script src="/assets/index.js"></script>',
      'assets/index.js': 'fetch("https://api.leke.xyz/chat")'
    })
    await expect(module.auditProductionEndpoints(dist)).rejects.toThrow('api.leke.xyz')
  })

  test('accepts a build whose only absolute production API base is api.xiaole.app', async () => {
    const module = await import('../../../scripts/audit-production-endpoints.mjs').catch(() => null)
    expect(module, 'production endpoint auditor must exist').not.toBeNull()

    const dist = await fixture({
      'index.html': '<script src="/assets/index.js"></script>',
      'assets/index.js': 'fetch("https://api.xiaole.app/chat")'
    })
    await expect(module.auditProductionEndpoints(dist)).resolves.toMatchObject({
      productionApiBase: 'https://api.xiaole.app'
    })
  })
})

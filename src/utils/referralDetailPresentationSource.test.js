import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.resolve(__dirname, '..')

function readSource(relativePath) {
  return fs.readFileSync(path.join(srcRoot, relativePath), 'utf8')
}

test('referral detail operation log panel removes audit collapse and helper copy', () => {
  const detailSource = readSource('pages/shared/ReferralDetail.jsx')

  assert.equal(detailSource.includes('仅展示关键业务动作'), false)
  assert.equal(detailSource.includes('showAuditHistory'), false)
  assert.equal(detailSource.includes('setShowAuditHistory'), false)
})

test('referral detail exposes editable draft actions with delete confirmation', () => {
  const detailSource = readSource('pages/shared/ReferralDetail.jsx')
  const contextSource = readSource('context/AppContext.jsx')

  assert.equal(detailSource.includes('编辑草稿'), true)
  assert.equal(detailSource.includes('删除草稿'), true)
  assert.equal(detailSource.includes("dialog?.type === 'deleteDraft'"), true)
  assert.equal(contextSource.includes('deleteDraftReferral'), true)
})

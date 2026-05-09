import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(
  path.resolve(process.cwd(), 'src/pages/shared/ReferralDetail.jsx'),
  'utf8',
)

test('referral detail only keeps PDF and print actions inside document preview modal', () => {
  const downloadActionCount = (source.match(/handleDocumentAction\('下载'\)/g) || []).length
  const printActionCount = (source.match(/handleDocumentAction\('打印'\)/g) || []).length

  assert.equal(downloadActionCount, 1)
  assert.equal(printActionCount, 1)
  assert.match(source, /dialog\?\.type === 'documentPreview'[\s\S]*下载 PDF[\s\S]*打印/)
})

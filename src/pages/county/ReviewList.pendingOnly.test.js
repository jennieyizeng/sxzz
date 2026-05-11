import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(
  path.resolve(process.cwd(), 'src/pages/county/ReviewList.jsx'),
  'utf8',
)

test('county pending review list only shows pending incoming referrals', () => {
  assert.equal(source.includes('r.status === UPWARD_STATUS.PENDING'), true)
  assert.equal(source.includes("const STATUS_FILTERS"), false)
  assert.equal(source.includes("const [filter,"), false)
  assert.equal(source.includes("setFilter("), false)
})

test('county pending review list uses the requested search fields', () => {
  assert.equal(source.includes('申请状态：'), false)
  for (const label of ['患者姓名：', '诊断：', '转诊单号：', '转出机构：', '申请时间：']) {
    assert.equal(source.includes(label), true)
  }
})

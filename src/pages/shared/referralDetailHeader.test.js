import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./ReferralDetail.jsx', import.meta.url), 'utf8')

test('referral detail title does not render transfer direction request prefix', () => {
  assert.doesNotMatch(source, /currentTransferLabel}申请 ·/)
  assert.doesNotMatch(source, /\{isUpward \? '⬆️' : '⬇️'\}/)
  assert.match(source, /\{ref\.patient\.name\}/)
})

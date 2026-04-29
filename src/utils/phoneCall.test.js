import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPhoneCallLogEntry,
  getPhoneCallMode,
  maskPhoneNumber,
} from './phoneCall.js'

test('detects mobile dial mode by viewport or user agent', () => {
  assert.equal(getPhoneCallMode({ innerWidth: 390, userAgent: 'Mozilla/5.0' }), 'dial')
  assert.equal(getPhoneCallMode({ innerWidth: 1024, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS)' }), 'dial')
  assert.equal(getPhoneCallMode({ innerWidth: 1280, userAgent: 'Mozilla/5.0 (Macintosh)' }), 'copy')
})

test('builds phone call logs without storing the phone number', () => {
  const entry = buildPhoneCallLogEntry({
    action: 'PHONE_CALL_CLICKED',
    source: 'admission_arrangement',
    numberType: 'department',
    number: '0838-6213302',
    actorId: 'u001',
    actorRole: 'primary',
    referralId: 'REF2026008',
    timestamp: '2026-04-29T14:32:00.000Z',
  })

  assert.equal(entry.action, 'PHONE_CALL_CLICKED')
  assert.equal(entry.source, 'admission_arrangement')
  assert.equal(entry.numberType, 'department')
  assert.equal(entry.actorId, 'u001')
  assert.equal(entry.actorRole, 'primary')
  assert.equal(entry.referralId, 'REF2026008')
  assert.equal(entry.timestamp, '2026-04-29T14:32:00.000Z')
  assert.equal(Object.hasOwn(entry, 'number'), false)
  assert.equal(JSON.stringify(entry).includes('0838-6213302'), false)
})

test('masks patient phone for emergency modify contact prompt', () => {
  assert.equal(maskPhoneNumber('13812345678'), '138****5678')
  assert.equal(maskPhoneNumber('138****5678'), '138****5678')
  assert.equal(maskPhoneNumber(''), '—')
})

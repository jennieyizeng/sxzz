import test from 'node:test'
import assert from 'node:assert/strict'

import { MOCK_PATIENTS, MOCK_REFERRALS_INIT } from '../data/mockData.js'

function byId(id) {
  return MOCK_REFERRALS_INIT.find(item => item.id === id)
}

function assertMedicalHistoryFields(record) {
  assert.equal(typeof record.pastMedicalHistory, 'string')
  assert.ok(['no_known_allergy', 'has_allergy', 'unknown'].includes(record.allergyHistoryStatus))
  assert.equal(typeof record.allergyHistoryDetail, 'string')
}

test('mock patients include medical history and allergy values for patient search auto-fill', () => {
  assertMedicalHistoryFields(MOCK_PATIENTS.p001)
  assertMedicalHistoryFields(MOCK_PATIENTS.p002)
})

test('mock upward and downward referrals include medical history and allergy values for detail and print previews', () => {
  assertMedicalHistoryFields(byId('REF2026003'))
  assertMedicalHistoryFields(byId('REF2026011'))
  assertMedicalHistoryFields(byId('REF2026001'))
  assertMedicalHistoryFields(byId('REF2026005'))
})

import test from 'node:test'
import assert from 'node:assert/strict'

import { findMockPatientBundle } from './mockPatientBundle.js'

const referrals = [
  {
    id: 'ref-1',
    type: 'upward',
    status: '已完成',
    patient: {
      name: '王晓敏',
      phone: '13800138000',
      idCard: '510101199001011234',
    },
  },
  {
    id: 'ref-2',
    type: 'upward',
    status: '已完成',
    patient: {
      name: '李阿姨',
      phone: '13900139000',
      idCard: '510101196505061234',
    },
  },
]

test('finds mock patient bundle by patient name only', () => {
  const matched = findMockPatientBundle({
    referrals,
    patientName: '王晓敏',
  })

  assert.equal(matched?.id, 'ref-1')
})

test('requires phone to match when phone is provided', () => {
  const matched = findMockPatientBundle({
    referrals,
    patientName: '王晓敏',
    patientPhone: '13800138001',
  })

  assert.equal(matched, null)
})

test('requires id card to match when id card is provided', () => {
  const matched = findMockPatientBundle({
    referrals,
    patientName: '李阿姨',
    patientIdCard: '510101196505061235',
  })

  assert.equal(matched, null)
})

test('matches when name and phone both match', () => {
  const matched = findMockPatientBundle({
    referrals,
    patientName: '李阿姨',
    patientPhone: '13900139000',
  })

  assert.equal(matched?.id, 'ref-2')
})

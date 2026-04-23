import test from 'node:test'
import assert from 'node:assert/strict'

import { DOWNWARD_STATUS, MOCK_REFERRALS_INIT, MOCK_USERS, ROLES } from '../data/mockData.js'
import {
  buildDownwardSelfAcceptState,
  buildDownwardReopenState,
} from './downwardReferralTransitions.js'

function findReferral(id) {
  return MOCK_REFERRALS_INIT.find(item => item.id === id)
}

test('self-accept marks referral in transit without writing premature closure fields', () => {
  const currentUser = MOCK_USERS[ROLES.PRIMARY_HEAD]
  const actedAt = '2026-04-20T10:05:00.000Z'
  const next = buildDownwardSelfAcceptState(findReferral('REF2026017'), currentUser, actedAt)

  assert.equal(next.status, DOWNWARD_STATUS.IN_TRANSIT)
  assert.equal(next.coordinatorActionAt, actedAt)
  assert.equal(next.downwardAssignedDoctorId, currentUser.id)
  assert.equal(next.downwardAssignedDoctorName, currentUser.name)
  assert.equal(next.logs.at(-1).action, '下转已进入接收处理中')
})

test('reopen clears downward routing fields when resubmitting a returned referral', () => {
  const currentUser = MOCK_USERS[ROLES.COUNTY]
  const reopenedAt = '2026-04-20T10:08:00.000Z'
  const next = buildDownwardReopenState(findReferral('REF2026021'), currentUser, reopenedAt)

  assert.equal(next.status, DOWNWARD_STATUS.PENDING)
  assert.equal(next.rejectReason, null)
  assert.equal(next.returnReason, null)
  assert.equal(next.coordinatorReturnReason, null)
  assert.equal(next.coordinatorActionAt, null)
  assert.equal(next.designatedDoctorId, null)
  assert.equal(next.designatedDoctorName, null)
  assert.equal(next.downwardAssignedDoctorId, null)
  assert.equal(next.downwardAssignedDoctorName, null)
  assert.equal(next.allocationMode, null)
})

import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldShowDownwardReferralForPrimaryDoctor } from './primaryDownwardScope.js'
import { DOWNWARD_STATUS, MOCK_REFERRALS_INIT } from '../data/mockData.js'

const currentDoctor = {
  id: 'u001',
  name: '王医生',
  institution: 'xx市拱星镇卫生院',
}

function baseReferral(overrides = {}) {
  return {
    id: 'REF-SCOPE',
    type: 'downward',
    status: DOWNWARD_STATUS.PENDING,
    toInstitution: currentDoctor.institution,
    allocationMode: 'coordinator',
    designatedDoctorId: null,
    designatedDoctorName: null,
    downwardAssignedDoctorId: null,
    downwardAssignedDoctorName: null,
    ...overrides,
  }
}

test('hides institution-only pending downward referrals from ordinary primary doctors', () => {
  assert.equal(shouldShowDownwardReferralForPrimaryDoctor(baseReferral(), currentDoctor), false)
})

test('shows institution-designated referrals only after they are allocated to the current doctor', () => {
  const allocatedToCurrentDoctor = baseReferral({
    allocationMode: 'coordinator_reassign',
    designatedDoctorId: currentDoctor.id,
    designatedDoctorName: currentDoctor.name,
  })
  const allocatedToOtherDoctor = baseReferral({
    allocationMode: 'coordinator_reassign',
    designatedDoctorId: 'u009',
    designatedDoctorName: '李医生',
  })

  assert.equal(shouldShowDownwardReferralForPrimaryDoctor(allocatedToCurrentDoctor, currentDoctor), true)
  assert.equal(shouldShowDownwardReferralForPrimaryDoctor(allocatedToOtherDoctor, currentDoctor), false)
})

test('shows doctor-designated downward referrals only when the designated doctor is current doctor', () => {
  const designatedToCurrentDoctor = baseReferral({
    allocationMode: 'designated',
    designatedDoctorId: currentDoctor.id,
    designatedDoctorName: currentDoctor.name,
  })
  const designatedToOtherDoctor = baseReferral({
    allocationMode: 'designated',
    designatedDoctorId: 'u009',
    designatedDoctorName: '李医生',
  })

  assert.equal(shouldShowDownwardReferralForPrimaryDoctor(designatedToCurrentDoctor, currentDoctor), true)
  assert.equal(shouldShowDownwardReferralForPrimaryDoctor(designatedToOtherDoctor, currentDoctor), false)
})

test('keeps completed records visible when the current doctor handled the downward referral', () => {
  const handledByCurrentDoctor = baseReferral({
    status: DOWNWARD_STATUS.COMPLETED,
    allocationMode: 'coordinator_reassign',
    designatedDoctorId: currentDoctor.id,
    designatedDoctorName: currentDoctor.name,
    downwardAssignedDoctorId: currentDoctor.id,
    downwardAssignedDoctorName: currentDoctor.name,
  })

  assert.equal(shouldShowDownwardReferralForPrimaryDoctor(handledByCurrentDoctor, currentDoctor), true)
})

test('includes a pending mock downward referral allocated to the current primary doctor', () => {
  const mockReferral = MOCK_REFERRALS_INIT.find(referral => referral.id === 'REF2026027')

  assert.equal(mockReferral?.status, DOWNWARD_STATUS.PENDING)
  assert.equal(mockReferral?.allocationMode, 'coordinator_reassign')
  assert.equal(mockReferral?.designatedDoctorId, currentDoctor.id)
  assert.equal(shouldShowDownwardReferralForPrimaryDoctor(mockReferral, currentDoctor), true)
})

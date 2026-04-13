import test from 'node:test'
import assert from 'node:assert/strict'
import { ROLES } from '../data/mockData.js'
import {
  canViewCountyUpwardReferralDetail,
  isAssignedToCurrentCountyDoctor,
  matchesDepartmentScope,
} from './countyReferralAccess.js'

test('matches equivalent county department names for cardiology scope', () => {
  assert.equal(matchesDepartmentScope('心血管科', '心内科'), true)
  assert.equal(matchesDepartmentScope('心内科', '心血管科'), true)
  assert.equal(matchesDepartmentScope('骨科', '心内科'), false)
})

test('identifies assigned county doctor from current referral fields', () => {
  const currentUser = { id: 'county_doctor_1', name: '李志远' }
  const referral = { assignedDoctorId: 'county_doctor_1', assignedDoctorName: '李志远' }

  assert.equal(isAssignedToCurrentCountyDoctor(referral, currentUser), true)
  assert.equal(isAssignedToCurrentCountyDoctor({ assignedDoctorId: 'county_doctor_2', assignedDoctorName: '王晓敏' }, currentUser), false)
})

test('allows ordinary county doctor to view only personally assigned ordinary upward detail', () => {
  const currentUser = { id: 'county_doctor_1', name: '李志远', institution: 'xx市人民医院', dept: '内科' }
  const assignedReferral = {
    type: 'upward',
    is_emergency: false,
    toInstitution: 'xx市人民医院',
    toDept: '呼吸科',
    assignedDoctorId: 'county_doctor_1',
    assignedDoctorName: '李志远',
  }
  const otherReferral = {
    ...assignedReferral,
    assignedDoctorId: 'county_doctor_2',
    assignedDoctorName: '王晓敏',
  }

  assert.equal(canViewCountyUpwardReferralDetail({ currentRole: ROLES.COUNTY, currentUser, referral: assignedReferral }), true)
  assert.equal(canViewCountyUpwardReferralDetail({ currentRole: ROLES.COUNTY, currentUser, referral: otherReferral }), false)
})

test('allows county department head to view only matching department ordinary upward detail', () => {
  const currentUser = { id: 'county_doctor_2', name: '王晓敏', institution: 'xx市人民医院', dept: '心内科' }
  const sameDepartmentReferral = {
    type: 'upward',
    is_emergency: false,
    toInstitution: 'xx市人民医院',
    toDept: '心血管科',
  }
  const otherDepartmentReferral = {
    ...sameDepartmentReferral,
    toDept: '骨科',
  }

  assert.equal(canViewCountyUpwardReferralDetail({ currentRole: ROLES.COUNTY2, currentUser, referral: sameDepartmentReferral }), true)
  assert.equal(canViewCountyUpwardReferralDetail({ currentRole: ROLES.COUNTY2, currentUser, referral: otherDepartmentReferral }), false)
})

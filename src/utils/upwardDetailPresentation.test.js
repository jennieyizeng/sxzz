import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_PATIENT_NOTICE_TEMPLATE,
  buildMinimalArrangementStatusText,
  getAdmissionArrangementVisibility,
  getAppointmentCodeVisibility,
  shouldShowPatientNotice,
  shouldShowUpwardLogsTab,
  renderPatientNoticeTemplate,
} from './upwardDetailPresentation.js'
import { ROLES } from '../data/mockData.js'

test('shows full arrangement and appointment code to grassroots roles', () => {
  assert.equal(getAdmissionArrangementVisibility({ currentRole: ROLES.PRIMARY, isUpward: true }), 'full')
  assert.equal(getAdmissionArrangementVisibility({ currentRole: ROLES.PRIMARY_HEAD, isUpward: true }), 'full')
  assert.equal(getAppointmentCodeVisibility({ currentRole: ROLES.PRIMARY, isUpward: true, isEmergencyReferral: false }), 'full')
})

test('shows minimal arrangement and hides appointment code for county roles', () => {
  assert.equal(getAdmissionArrangementVisibility({ currentRole: ROLES.COUNTY, isUpward: true }), 'minimal')
  assert.equal(getAdmissionArrangementVisibility({ currentRole: ROLES.COUNTY2, isUpward: true }), 'minimal')
  assert.equal(getAppointmentCodeVisibility({ currentRole: ROLES.COUNTY, isUpward: true, isEmergencyReferral: false }), 'hidden')
})

test('shows full arrangement, appointment code, and logs tab to admin for upward referrals', () => {
  assert.equal(getAdmissionArrangementVisibility({ currentRole: ROLES.ADMIN, isUpward: true }), 'full')
  assert.equal(getAppointmentCodeVisibility({ currentRole: ROLES.ADMIN, isUpward: true, isEmergencyReferral: false }), 'full')
  assert.equal(shouldShowUpwardLogsTab({ currentRole: ROLES.ADMIN, isUpward: true }), true)
})

test('hides appointment code for all emergency upward referrals and hides patient notice in detail page', () => {
  assert.equal(getAppointmentCodeVisibility({ currentRole: ROLES.ADMIN, isUpward: true, isEmergencyReferral: true }), 'hidden')
  assert.equal(getAppointmentCodeVisibility({ currentRole: ROLES.PRIMARY, isUpward: true, isEmergencyReferral: true }), 'hidden')
  assert.equal(shouldShowPatientNotice(), false)
})

test('builds minimal arrangement status text for arranged and pending states', () => {
  assert.equal(buildMinimalArrangementStatusText(null), '⏳ 转诊中心正在安排接诊资源，请等待。')
  assert.equal(
    buildMinimalArrangementStatusText({ visitTime: '2026-04-17 10:30', department: '呼吸科' }),
    '📌 转诊中心已完成接诊安排，患者预计 2026-04-17 10:30 到 呼吸科 就诊。'
  )
})

test('renders patient notice template with placeholder replacement and outpatient line stripping', () => {
  const outpatient = renderPatientNoticeTemplate(DEFAULT_PATIENT_NOTICE_TEMPLATE, {
    department: '呼吸科',
    appointmentCode: 'ZP8831',
    admissionType: 'outpatient',
    ward: '',
    bedNumber: '',
    nurseStationPhone: '',
  })
  assert.equal(outpatient.includes('[接诊科室]'), false)
  assert.equal(outpatient.includes('[预约码]'), false)
  assert.equal(outpatient.includes('[病区]'), false)

  const inpatient = renderPatientNoticeTemplate('病区：[病区]\n床位：[床位号]\n护士站：[护士站电话]', {
    department: '心内科',
    appointmentCode: 'ZZ1001',
    admissionType: 'inpatient',
    ward: '心内科病区',
    bedNumber: '312床',
    nurseStationPhone: '0838-6213201',
  })
  assert.equal(inpatient, '病区：心内科病区\n床位：312床\n护士站：0838-6213201')
})

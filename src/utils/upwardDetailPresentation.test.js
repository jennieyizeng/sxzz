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
import { getUpwardDetailSections } from './upwardReferralDisplay.js'
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

test('outpatient upward detail shows medical history and allergy in diagnosis section order', () => {
  const sections = getUpwardDetailSections({
    type: 'upward',
    referral_type: 'normal',
    sourceVisitType: 'outpatient',
    patient: { name: '王五', gender: '男', age: 45 },
    chiefComplaint: '血糖控制不佳',
    pastMedicalHistory: '高血压病史10年，2型糖尿病病史5年。',
    allergyHistoryStatus: 'has_allergy',
    allergyHistoryDetail: '青霉素过敏。',
    diagnosis: { code: 'E11.9', name: '2型糖尿病不伴并发症' },
    reason: '需内分泌专科调整方案',
    outpatientConditionAssessment: '生命体征平稳',
    medicationSummary: '二甲双胍口服治疗',
    attachments: [{ name: '血糖检查报告.pdf' }],
  })

  const diagnosisSection = sections.find(section => section.title === '诊断与转诊目的')
  assert.ok(diagnosisSection)
  assert.deepEqual(diagnosisSection.items.map(item => item.label), [
    '主诉与现病史',
    '主要既往史',
    '过敏史',
    '初步诊断（ICD-10）',
    '转诊目的',
    '当前病情评估',
    '当前治疗经过/用药情况',
    '已做检查 / 检验报告',
  ])
  assert.equal(diagnosisSection.items.find(item => item.label === '过敏史')?.value, '青霉素过敏。')
})

test('emergency upward detail shows patient safety information with empty-value rules', () => {
  const sections = getUpwardDetailSections({
    type: 'upward',
    is_emergency: true,
    patient: { name: '张三', gender: '男', age: 67 },
    consciousnessStatus: 'conscious',
    pastMedicalHistory: '',
    allergyHistoryStatus: 'unknown',
    allergyHistoryDetail: '',
    diagnosis: { code: 'I10', name: '原发性高血压' },
  })

  const safetySection = sections.find(section => section.title === '患者安全信息')
  assert.ok(safetySection)
  assert.deepEqual(safetySection.items.map(item => item.label), [
    '患者意识状态',
    '主要既往史',
    '过敏史',
  ])
  assert.equal(safetySection.items.find(item => item.label === '主要既往史')?.value, '未填写')
  assert.equal(safetySection.items.find(item => item.label === '过敏史')?.value, '暂不清楚')
})

test('inpatient upward detail shows medical history before current diagnosis', () => {
  const sections = getUpwardDetailSections({
    type: 'upward',
    sourceVisitType: 'inpatient',
    admissionType: 'inpatient',
    patient: { name: '黄志明', gender: '男', age: 55 },
    chiefComplaint: '反复胸痛胸闷3个月',
    pastMedicalHistory: '冠心病病史5年，既往胆囊切除术后。',
    allergyHistoryStatus: 'no_known_allergy',
    diagnosis: { code: 'I25.1', name: '动脉粥样硬化性心脏病' },
    medicationSummary: '阿司匹林口服治疗',
    currentTreatmentPlanSummary: '拟行冠脉造影',
    conditionChangeNote: '近日胸痛加重',
  })

  const summarySection = sections.find(section => section.title === '病历摘要')
  assert.ok(summarySection)
  assert.deepEqual(summarySection.items.slice(0, 7).map(item => item.label), [
    '主诉与现病史',
    '主要既往史',
    '过敏史',
    '当前住院诊断（ICD-10）',
    '当前治疗经过 / 当前用药情况',
    '当前治疗方案摘要',
    '病情变化说明',
  ])
  assert.equal(summarySection.items.find(item => item.label === '过敏史')?.value, '无明确过敏史')
})

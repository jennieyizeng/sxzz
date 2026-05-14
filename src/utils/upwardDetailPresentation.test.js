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

test('emergency upward detail follows launch form order and shows optional fields', () => {
  const sections = getUpwardDetailSections({
    type: 'upward',
    is_emergency: true,
    patient: { name: '张三', gender: '男', age: 67 },
    emergencyContactPhone: '13900001111',
    consciousnessStatus: 'conscious',
    pastMedicalHistory: '',
    allergyHistoryStatus: 'unknown',
    allergyHistoryDetail: '',
    diagnosis: { code: 'I10', name: '原发性高血压' },
    chiefComplaint: '突发胸痛',
    reason: '已吸氧并建立静脉通道',
    transportCondition: '适合转运',
    transportNeeds: ['吸氧', '监护'],
    toInstitution: 'xx市人民医院',
    toDept: '急诊科',
    linkedSpecialty: '心血管科',
  })

  assert.deepEqual(sections[0].items.map(item => item.label), [
    '患者姓名',
    '联系电话',
    '紧急联系方式',
    '性别',
    '年龄',
    '身份证号',
    '患者意识状态',
  ])
  assert.equal(sections[0].items.find(item => item.label === '紧急联系方式')?.value, '13900001111')

  const safetySection = sections.find(section => section.title === '患者安全信息')
  assert.ok(safetySection)
  assert.deepEqual(safetySection.items.map(item => item.label), [
    '主要既往史',
    '过敏史',
  ])
  assert.equal(safetySection.items.find(item => item.label === '主要既往史')?.value, '未填写')
  assert.equal(safetySection.items.find(item => item.label === '过敏史')?.value, '暂不清楚')

  const emergencySection = sections.find(section => section.title === '急诊信息')
  assert.deepEqual(emergencySection.items.map(item => item.label), [
    '录入方式',
    '急诊紧急程度',
    '主诉/急转原因',
    '病情补充/已做处置',
    'ICD-10诊断',
  ])
  assert.equal(emergencySection.items.find(item => item.label === '病情补充/已做处置')?.value, '已吸氧并建立静脉通道')
})

test('inpatient upward detail follows launch form grouping and shows uploaded materials', () => {
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
    inpatientTransferPurpose: '需专科进一步评估',
    conditionAssessment: '需重点关注',
    transportSuitability: '需评估后转运',
    transportNotes: '转运途中持续心电监护',
    attachments: [{ name: '心电图.pdf' }],
    nursingAttachments: [{ name: '护理记录.pdf' }],
  })

  const purposeSection = sections.find(section => section.title === '诊断与转诊目的')
  assert.ok(purposeSection)
  assert.deepEqual(purposeSection.items.map(item => item.label), [
    '转院目的',
    '当前病情评估',
    '是否适合转运',
    '转运注意事项',
  ])

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

  const uploadSection = sections.find(section => section.title === '资料上传')
  assert.deepEqual(uploadSection.items.map(item => item.label), [
    '检查 / 检验资料上传',
    '护理记录上传',
  ])
  assert.deepEqual(uploadSection.items.find(item => item.label === '护理记录上传')?.value, ['护理记录.pdf'])
})

test('upward consent detail shows uploaded consent file names', () => {
  const sections = getUpwardDetailSections({
    type: 'upward',
    sourceVisitType: 'outpatient',
    patient: { name: '王五', gender: '男', age: 45 },
  }, {
    fileNames: ['转院知情同意书.pdf'],
    isUploaded: true,
  })

  const consentSection = sections.find(section => section.title === '知情同意')
  assert.equal(consentSection.items.find(item => item.label === '已上传文件名')?.value, '转院知情同意书.pdf')
})

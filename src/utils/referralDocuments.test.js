import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildConsentDocumentModel,
  buildReferralDocumentHtml,
  buildReferralDocumentModel,
  getReferralDocumentAvailability,
} from './referralDocuments.js'
import { DOWNWARD_STATUS, UPWARD_STATUS } from '../data/mockData.js'

const basePatient = {
  name: '张三',
  gender: '男',
  age: 67,
  idCard: '510623199001010011',
  phone: '13800000000',
  address: 'xx市拱星镇XX村',
  insuranceNo: 'MI20260001',
  archiveNo: 'A-0001',
}

function upward(overrides = {}) {
  return {
    id: 'REF_UP',
    type: 'upward',
    status: UPWARD_STATUS.IN_TRANSIT,
    patient: basePatient,
    diagnosis: { code: 'I10', name: '原发性高血压' },
    visitType: 'outpatient',
    chiefComplaint: '头晕伴血压升高3天',
    reason: '基层控制不佳，需县级医院进一步评估',
    pastHistory: '高血压病史5年',
    treatmentCourse: '已予降压治疗，症状仍反复',
    currentTreatmentPlan: '继续监测血压，调整降压方案',
    currentMedication: '硝苯地平缓释片 30mg qd',
    fromInstitution: 'xx市拱星镇卫生院',
    fromDoctor: '王医生',
    fromDeptPhone: '0838-6213001',
    toInstitution: 'xx市人民医院',
    toDept: '心血管科',
    toDoctor: '刘医生',
    createdAt: '2026-05-06T08:30:00.000Z',
    internalAuditLog: [
      { result: '通过', note: '符合上转评估标准' },
    ],
    ...overrides,
  }
}

function downward(overrides = {}) {
  return {
    id: 'REF_DOWN',
    type: 'downward',
    status: DOWNWARD_STATUS.IN_TRANSIT,
    patient: basePatient,
    diagnosis: { code: 'I63.9', name: '脑梗死' },
    inpatientNo: 'BA20260001',
    examSummary: '头颅CT提示脑梗死恢复期改变',
    treatmentCourse: '急性期治疗完成，生命体征平稳',
    nextTreatmentPlan: '继续康复训练与二级预防',
    rehabAdvice: '每日肢体功能训练',
    medicationAdvice: '阿司匹林肠溶片 100mg qd',
    precautions: '监测血压，警惕再发症状',
    fromInstitution: 'xx市人民医院',
    fromDoctor: '刘医生',
    fromDeptPhone: '0838-6213301',
    toInstitution: 'xx市拱星镇卫生院',
    toDept: '全科',
    toDoctor: '王医生',
    downwardAssignedDoctorName: '王医生',
    createdAt: '2026-05-06T08:30:00.000Z',
    ...overrides,
  }
}

test('formal upward document is only available after county acceptance and uses transfer-out wording', () => {
  assert.equal(getReferralDocumentAvailability(upward({ status: UPWARD_STATUS.PENDING })).canShow, false)

  const availability = getReferralDocumentAvailability(upward())
  assert.equal(availability.canShow, true)
  assert.equal(availability.previewLabel, '预览双向转诊（转出）单')
  assert.equal(availability.documentTitle, '双向转诊（转出）单')
  assert.equal(availability.variant, 'active')

  const model = buildReferralDocumentModel(upward())
  assert.equal(model.title, 'xx市医疗机构双向转诊单')
  assert.equal(model.subtitle, '双向转诊（转出）单')
  assert.equal(model.body.recipient, 'xx市人民医院：')
  assert.match(model.body.patientIntro, /现有患者 张三/)
  assert.match(model.body.patientIntro, /经门诊治疗/)
  assert.equal(model.body.approvalOpinion, '符合上转评估标准')
  assert.equal(model.body.doctorLine, '转诊医生（签字）：王医生')
})

test('completed upward document includes stub archive and closed document shows close reason', () => {
  const completed = buildReferralDocumentModel(upward({ status: UPWARD_STATUS.COMPLETED }))
  assert.equal(completed.variant, 'archive')
  assert.equal(completed.stub.title, 'xx市医疗机构双向转诊单')
  assert.equal(completed.stub.subtitle, '存根')
  assert.match(completed.stub.transferSentence, /转入 xx市人民医院 单位 心血管科 科室 刘医生 接诊医生/)

  const closed = buildReferralDocumentModel(upward({
    status: UPWARD_STATUS.CLOSED,
    closeReason: '患者病情变化，双方协商关闭',
    closedAt: '2026-05-07T09:10:00.000Z',
  }))
  assert.equal(closed.variant, 'closed-archive')
  assert.equal(closed.closedNotice.status, '已关闭')
  assert.equal(closed.closedNotice.reason, '患者病情变化，双方协商关闭')
})

test('downward document uses return wording and archive stub fields', () => {
  assert.equal(getReferralDocumentAvailability(downward({ status: DOWNWARD_STATUS.PENDING })).canShow, false)

  const model = buildReferralDocumentModel(downward({ status: DOWNWARD_STATUS.COMPLETED }))
  assert.equal(model.title, 'xx市医疗机构双向转诊单（回转用）')
  assert.equal(model.subtitle, '双向转诊（回转）单')
  assert.equal(model.body.recipient, 'xx市拱星镇卫生院：')
  assert.match(model.body.patientIntro, /现转回贵单位/)
  assert.equal(model.body.inpatientNo, 'BA20260001')
  assert.match(model.stub.transferSentence, /转回 xx市拱星镇卫生院 单位 王医生 接诊医生/)
})

test('consent document contains fixed disclosure and risk text', () => {
  const model = buildConsentDocumentModel(upward())
  assert.equal(model.title, '转诊知情同意书')
  assert.equal(model.basicInfo.patientName, '张三')
  assert.equal(model.referralInfo.direction, '基层至县级')
  assert.match(model.disclosureText, /医生已向患者或家属说明当前病情/)
  assert.match(model.riskText, /转诊途中可能存在病情变化/)
  assert.deepEqual(model.patientChoices, ['同意转诊', '不同意转诊'])
})

test('printable html excludes platform-only fields', () => {
  const html = buildReferralDocumentHtml(buildReferralDocumentModel(upward()))
  assert.match(html, /双向转诊（转出）单/)
  assert.doesNotMatch(html, /预约码|号源池|床位池|二维码|平台留档摘要/)
})

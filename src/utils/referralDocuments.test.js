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

const users = {
  primaryInitiator: { id: 'u001', name: '王医生', role: 'primary', institution: 'xx市拱星镇卫生院' },
  primaryOther: { id: 'u009', name: '李医生', role: 'primary', institution: 'xx市拱星镇卫生院' },
  primaryHead: { id: 'u001_head', name: '赵负责人', role: 'primary_head', institution: 'xx市拱星镇卫生院' },
  countyInitiator: { id: 'county_doctor_1', name: '李志远', role: 'county', institution: 'xx市人民医院' },
  countyOther: { id: 'county_doctor_2', name: '王晓敏', role: 'county2', institution: 'xx市人民医院' },
  admin: { id: 'u003', name: '赵管理员', role: 'admin', institution: 'xx市医共体管理层' },
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
    admissionArrangement: { department: '心血管科', visitTime: '2026-05-06T10:30:00.000Z' },
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
    fromDoctor: '李志远',
    fromDeptPhone: '0838-6213301',
    toInstitution: 'xx市拱星镇卫生院',
    toDept: '全科',
    toDoctor: '王医生',
    downwardAssignedDoctorName: '王医生',
    createdAt: '2026-05-06T08:30:00.000Z',
    ...overrides,
  }
}

function visible(referral, user) {
  return getReferralDocumentAvailability(referral, user).canShow
}

function label(referral, user) {
  return getReferralDocumentAvailability(referral, user).previewLabel
}

test('ordinary upward preview waits for admission arrangement before active document exists', () => {
  const pendingArrangement = upward({
    status: UPWARD_STATUS.IN_TRANSIT,
    admissionArrangement: null,
  })
  assert.equal(visible(pendingArrangement, users.primaryInitiator), false)
  assert.equal(visible(pendingArrangement, users.admin), false)

  const arranged = upward({
    status: UPWARD_STATUS.IN_TRANSIT,
    admissionArrangement: { department: '心血管科', visitTime: '2026-05-06T10:30:00.000Z' },
  })
  assert.equal(visible(arranged, users.primaryInitiator), true)
  assert.equal(label(arranged, users.primaryInitiator), '预览双向转诊（转出）单')
})

test('emergency upward active preview follows supplement and retro-entry confirmation rules', () => {
  const livePendingSupplement = upward({
    status: UPWARD_STATUS.IN_TRANSIT,
    is_emergency: true,
    admissionArrangement: null,
  })
  assert.equal(visible(livePendingSupplement, users.primaryInitiator), false)

  const liveSupplemented = upward({
    status: UPWARD_STATUS.IN_TRANSIT,
    is_emergency: true,
    admissionArrangement: { department: '急诊科', visitTime: '2026-05-06T10:30:00.000Z' },
  })
  assert.equal(visible(liveSupplemented, users.primaryInitiator), true)
  assert.equal(visible(liveSupplemented, users.admin), true)
  assert.equal(visible(liveSupplemented, users.countyInitiator), false)

  const retroPendingConfirmation = upward({
    status: UPWARD_STATUS.IN_TRANSIT,
    is_emergency: true,
    isRetroEntry: true,
    admissionArrangement: { department: '急诊科', visitTime: '2026-05-06T10:30:00.000Z' },
  })
  assert.equal(visible(retroPendingConfirmation, users.primaryInitiator), false)
})

test('downward pending accept hides preview and in-transfer is limited to initiator or assignee', () => {
  const pendingAccept = downward({ status: DOWNWARD_STATUS.PENDING })
  assert.equal(visible(pendingAccept, users.countyInitiator), false)
  assert.equal(visible(pendingAccept, users.primaryInitiator), false)

  const inTransfer = downward({
    status: DOWNWARD_STATUS.IN_TRANSIT,
    downwardAssignedDoctorId: 'u001',
    designatedDoctorId: 'u001',
  })
  assert.equal(visible(inTransfer, users.countyInitiator), true)
  assert.equal(visible(inTransfer, users.primaryInitiator), true)
  assert.equal(visible(inTransfer, users.primaryOther), false)
  assert.equal(visible(inTransfer, users.primaryHead), false)
  assert.equal(visible(inTransfer, users.admin), false)
  assert.equal(label(inTransfer, users.countyInitiator), '预览双向转诊（回转）单')
})

test('completed previews use archive label for allowed upward and downward roles', () => {
  const completedUpward = upward({ status: UPWARD_STATUS.COMPLETED })
  assert.equal(visible(completedUpward, users.primaryInitiator), true)
  assert.equal(visible(completedUpward, users.countyInitiator), true)
  assert.equal(visible(completedUpward, users.admin), true)
  assert.equal(label(completedUpward, users.primaryInitiator), '预览归档转诊单')

  const completedDownward = downward({
    status: DOWNWARD_STATUS.COMPLETED,
    downwardAssignedDoctorId: 'u001',
    designatedDoctorId: 'u001',
  })
  assert.equal(visible(completedDownward, users.countyInitiator), true)
  assert.equal(visible(completedDownward, users.primaryInitiator), true)
  assert.equal(visible(completedDownward, users.primaryHead), true)
  assert.equal(visible(completedDownward, users.admin), true)
  assert.equal(label(completedDownward, users.admin), '预览归档转诊单')
})

test('closed previews use closed archive label and hide from county upward or primary-head downward roles', () => {
  const closedUpward = upward({ status: UPWARD_STATUS.CLOSED })
  assert.equal(visible(closedUpward, users.primaryInitiator), true)
  assert.equal(visible(closedUpward, users.admin), true)
  assert.equal(visible(closedUpward, users.countyInitiator), false)
  assert.equal(label(closedUpward, users.primaryInitiator), '预览关闭归档单')

  const closedDownward = downward({
    status: DOWNWARD_STATUS.CLOSED,
    downwardAssignedDoctorId: 'u001',
    designatedDoctorId: 'u001',
  })
  assert.equal(visible(closedDownward, users.countyInitiator), true)
  assert.equal(visible(closedDownward, users.primaryInitiator), true)
  assert.equal(visible(closedDownward, users.primaryHead), false)
  assert.equal(visible(closedDownward, users.admin), true)
  assert.equal(label(closedDownward, users.admin), '预览关闭归档单')
})

test('formal upward document is only available after county acceptance and uses transfer-out wording', () => {
  assert.equal(getReferralDocumentAvailability(upward({ status: UPWARD_STATUS.PENDING }), users.primaryInitiator).canShow, false)

  const availability = getReferralDocumentAvailability(upward(), users.primaryInitiator)
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
  assert.equal(model.body.approvalOpinion, '同意转诊。')
  assert.equal(model.body.doctorLine, '转诊医生（签字）：王医生')
})

test('completed upward document includes stub archive and closed document shows close reason', () => {
  const completed = buildReferralDocumentModel(upward({ status: UPWARD_STATUS.COMPLETED }))
  assert.equal(completed.variant, 'archive')
  assert.equal(completed.stub.title, 'xx市医疗机构双向转诊单')
  assert.equal(completed.stub.subtitle, '存根')
  assert.equal(completed.stub.transferSentence, '经门诊治疗，转入单位xx市人民医院  科室心血管科 接诊医生刘医生。')

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
  assert.equal(getReferralDocumentAvailability(downward({ status: DOWNWARD_STATUS.PENDING }), users.countyInitiator).canShow, false)

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

test('all referral print documents use fixed approval opinion', () => {
  const customAuditUpward = upward({
    internalAuditOpinion: '动态审批意见不应进入打印文书',
    internalAuditLog: [{ result: '通过', note: '审核历史中的意见不应进入打印文书' }],
  })
  const activeUpward = buildReferralDocumentModel(customAuditUpward)
  assert.equal(activeUpward.body.approvalOpinion, '同意转诊。')

  const archiveUpward = buildReferralDocumentModel(upward({
    status: UPWARD_STATUS.COMPLETED,
    internalAuditOpinion: '归档存根不应使用动态意见',
  }))
  assert.equal(archiveUpward.body.approvalOpinion, '同意转诊。')
  assert.equal(archiveUpward.stub.approvalOpinion, '同意转诊。')

  const archiveDownward = buildReferralDocumentModel(downward({
    status: DOWNWARD_STATUS.COMPLETED,
    internalAuditOpinion: '回转单不应使用动态意见',
  }))
  assert.equal(archiveDownward.body.approvalOpinion, '同意转诊。')
  assert.equal(archiveDownward.stub.approvalOpinion, '同意转诊。')

  const closedDownward = buildReferralDocumentModel(downward({
    status: DOWNWARD_STATUS.CLOSED,
    internalAuditOpinion: '关闭归档不应使用动态意见',
  }))
  assert.equal(closedDownward.body.approvalOpinion, '同意转诊。')
  assert.equal(closedDownward.stub.approvalOpinion, '同意转诊。')

  const html = buildReferralDocumentHtml(closedDownward)
  assert.match(html, /院方审批意见：同意转诊。/)
  assert.doesNotMatch(html, /动态审批意见|审核历史中的意见/)
})

test('upward print document includes past medical history and allergy history in required order', () => {
  const model = buildReferralDocumentModel(upward({
    pastMedicalHistory: '高血压病史10年、糖尿病病史5年',
    allergyHistoryStatus: '有过敏史',
    allergyHistoryDetail: '青霉素过敏',
  }))

  assert.equal(model.body.pastHistory, '高血压病史10年、糖尿病病史5年')
  assert.equal(model.body.allergyHistory, '青霉素过敏')

  const html = buildReferralDocumentHtml(model)
  const order = [
    '初步印象：',
    '主要现病史（转出原因）：',
    '主要既往史：',
    '过敏史：',
    '治疗经过：',
  ].map(label => html.indexOf(label))

  assert.equal(order.every(index => index >= 0), true)
  assert.deepEqual([...order].sort((a, b) => a - b), order)
})

test('upward print body uses compact transfer-out title, referral code and receiving arrangement', () => {
  const model = buildReferralDocumentModel(upward({
    id: 'REF2026003',
    referralNo: 'ZZ20260310003',
    status: UPWARD_STATUS.COMPLETED,
  }))
  const html = buildReferralDocumentHtml(model)

  assert.match(html, /转诊单号：ZZ20260310003/)
  assert.doesNotMatch(html, /<h1>xx市医疗机构双向转诊单<\/h1>[\s\S]*<h2>双向转诊（转出）单<\/h2>/)
  assert.match(html, /<h1 class="document-title document-title-upward">双向转诊（转出）单<\/h1>/)
  assert.match(html, /<section class="receiving-arrangement">[\s\S]*接收科室：心血管科/)
  assert.match(html, /请患者携带本转诊单、身份证\/医保卡及相关病历、检查检验资料前往接收机构就诊。/)
  assert.match(html, /到院后仍需按接收机构流程完成挂号、缴费、分诊、检查或住院办理。/)
  assert.match(html, /接诊医生、诊室、床位等信息以接收机构现场安排为准。/)
  assert.match(html, /如就诊时间或地点发生变化，请以接收机构或转诊中心通知为准。/)
  assert.match(html, /<section class="approval-signature-row">[\s\S]*院方审批意见：同意转诊。[\s\S]*转诊医生（签字）：王医生/)
  assert.match(html, /<section class="stub-signature-row">[\s\S]*院方审批意见：同意转诊。[\s\S]*转诊医生（签字）：王医生/)
  assert.match(html, /<p class="stub-date">2026 年 05 月 06 日<\/p>/)

  const bodyStart = html.indexOf('document-title-upward')
  const treatmentIndex = html.indexOf('治疗经过：', bodyStart)
  const receivingIndex = html.indexOf('接收安排', bodyStart)
  const approvalIndex = html.indexOf('院方审批意见：同意转诊。', bodyStart)
  const patientNoticeIndex = html.indexOf('患者须知：', bodyStart)
  const sealIndex = html.indexOf('xx市拱星镇卫生院（加盖公章）', bodyStart)
  assert.equal(treatmentIndex < receivingIndex && receivingIndex < approvalIndex && approvalIndex < sealIndex && sealIndex < patientNoticeIndex, true)
})

test('downward print document includes past medical history and allergy history before treatment advice', () => {
  const model = buildReferralDocumentModel(downward({
    pastMedicalHistory: '脑梗死病史1年',
    allergyHistoryStatus: '暂不清楚',
  }))

  assert.equal(model.body.pastHistory, '脑梗死病史1年')
  assert.equal(model.body.allergyHistory, '暂不清楚')

  const html = buildReferralDocumentHtml(model)
  const order = [
    '诊断结果：',
    '住院病案号：',
    '主要检查结果：',
    '主要既往史：',
    '过敏史：',
    '治疗经过、下一步治疗方案及康复建议：',
  ].map(label => html.indexOf(label))

  assert.equal(order.every(index => index >= 0), true)
  assert.deepEqual([...order].sort((a, b) => a - b), order)
})

test('print document allergy history follows empty and status value rules', () => {
  assert.equal(buildReferralDocumentModel(upward({
    pastMedicalHistory: '',
    allergyHistoryStatus: '',
    allergyHistoryDetail: '',
  })).body.pastHistory, '________')
  assert.equal(buildReferralDocumentModel(upward({
    allergyHistoryStatus: '',
    allergyHistoryDetail: '',
  })).body.allergyHistory, '________')
  assert.equal(buildReferralDocumentModel(upward({
    allergyHistoryStatus: '无明确过敏史',
    allergyHistoryDetail: '不应展示',
  })).body.allergyHistory, '无明确过敏史')
  assert.equal(buildReferralDocumentModel(upward({
    allergyHistoryStatus: '有过敏史',
    allergyHistoryDetail: '头孢过敏',
  })).body.allergyHistory, '头孢过敏')
  assert.equal(buildReferralDocumentModel(upward({
    allergyHistoryStatus: 'no_known_allergy',
    allergyHistoryDetail: '不应展示',
  })).body.allergyHistory, '无明确过敏史')
  assert.equal(buildReferralDocumentModel(upward({
    allergyHistoryStatus: 'unknown',
    allergyHistoryDetail: '不应展示',
  })).body.allergyHistory, '暂不清楚')
  assert.equal(buildReferralDocumentModel(upward({
    allergyHistoryStatus: 'has_allergy',
    allergyHistoryDetail: '青霉素过敏',
  })).body.allergyHistory, '青霉素过敏')
  assert.equal(buildReferralDocumentModel(upward({
    allergyHistoryStatus: 'has_allergy',
    allergyHistoryDetail: '',
  })).body.allergyHistory, '________')
})

import { DOWNWARD_STATUS, UPWARD_STATUS } from '../data/mockData.js'

const BLANK = '________'
const AREA_NAME = 'xx市'
const FIXED_APPROVAL_OPINION = '同意转诊。'
const UPWARD_PATIENT_NOTICE = [
  '请患者携带本转诊单、身份证/医保卡及相关病历、检查检验资料前往接收机构就诊。',
  '到院后仍需按接收机构流程完成挂号、缴费、分诊、检查或住院办理。',
  '接诊医生、诊室、床位等信息以接收机构现场安排为准。',
  '如就诊时间或地点发生变化，请以接收机构或转诊中心通知为准。',
]

function text(value) {
  if (value === 0) return '0'
  const normalized = String(value ?? '').trim()
  return normalized || BLANK
}

function plain(value) {
  const normalized = String(value ?? '').trim()
  return normalized || '—'
}

function formatDateParts(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return { year: BLANK, month: BLANK, day: BLANK, full: '—' }
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
    full: `${date.getFullYear()} 年 ${String(date.getMonth() + 1).padStart(2, '0')} 月 ${String(date.getDate()).padStart(2, '0')} 日`,
  }
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${d} ${h}:${min}`
}

function visitTypeLabel(referral) {
  if (referral?.referral_type === 'emergency' || referral?.is_emergency) return '急诊'
  const raw = String(referral?.visitType || referral?.currentVisitType || referral?.visit_type || '').toLowerCase()
  if (raw.includes('inpatient') || raw.includes('住院')) return '住院'
  if (raw.includes('emergency') || raw.includes('急诊')) return '急诊'
  return '门诊'
}

function diagnosisText(referral) {
  const code = referral?.diagnosis?.code
  const name = referral?.diagnosis?.name || referral?.diagnosisName || referral?.diagnosis
  if (code && name) return `${code} ${name}`
  return text(name || code || referral?.preliminaryDiagnosis)
}

function approvalOpinion() {
  return FIXED_APPROVAL_OPINION
}

function allergyHistoryText(referral) {
  const status = String(referral?.allergyHistoryStatus || '').trim()
  const detail = String(referral?.allergyHistoryDetail || '').trim()
  if (status === 'has_allergy' || status === '有过敏史') return text(detail)
  if (status === 'no_known_allergy' || status === '无明确过敏史') return '无明确过敏史'
  if (status === 'unknown' || status === '暂不清楚') return '暂不清楚'
  return text(referral?.allergyHistory)
}

function documentVariant(referral) {
  if ([UPWARD_STATUS.COMPLETED, DOWNWARD_STATUS.COMPLETED].includes(referral?.status)) return 'archive'
  if ([UPWARD_STATUS.CLOSED, DOWNWARD_STATUS.CLOSED].includes(referral?.status)) return 'closed-archive'
  return 'active'
}

export function getReferralDirectionLabel(referral) {
  return referral?.type === 'downward' ? '县级至基层' : '基层至县级'
}

export function getReferralDocumentAvailability(referral) {
  const isUpward = referral?.type === 'upward'
  const allowedStatuses = isUpward
    ? [UPWARD_STATUS.IN_TRANSIT, UPWARD_STATUS.COMPLETED, UPWARD_STATUS.CLOSED]
    : [DOWNWARD_STATUS.IN_TRANSIT, DOWNWARD_STATUS.COMPLETED, DOWNWARD_STATUS.CLOSED]
  const canShow = allowedStatuses.includes(referral?.status)
  const documentTitle = isUpward ? '双向转诊（转出）单' : '双向转诊（回转）单'

  return {
    canShow,
    direction: getReferralDirectionLabel(referral),
    documentTitle,
    previewLabel: `预览${documentTitle}`,
    downloadLabel: '下载 PDF',
    printLabel: '打印',
    variant: canShow ? documentVariant(referral) : 'unavailable',
  }
}

function commonStubFields(referral) {
  const date = formatDateParts(referral?.createdAt)
  return {
    patientName: text(referral?.patient?.name),
    gender: text(referral?.patient?.gender),
    age: text(referral?.patient?.age),
    archiveNo: text(referral?.patient?.archiveNo || referral?.archiveNo),
    insuranceNo: text(referral?.patient?.insuranceNo || referral?.insuranceNo || referral?.medicalInsuranceNo),
    address: text(referral?.patient?.address),
    phone: text(referral?.patient?.phone),
    referralDate: date.full,
    approvalOpinion: approvalOpinion(referral),
    doctorSignature: text(referral?.fromDoctor),
    dateLine: date.full,
  }
}

function buildUpwardModel(referral) {
  const date = formatDateParts(referral?.createdAt)
  const vType = visitTypeLabel(referral)
  const doctor = referral?.toDoctor || '以接收机构安排为准'
  const base = {
    direction: 'upward',
    variant: documentVariant(referral),
    title: `${AREA_NAME}医疗机构双向转诊单`,
    subtitle: '双向转诊（转出）单',
    body: {
      referralNo: text(referral?.referralNo || referral?.referralCode || referral?.code || referral?.id),
      recipient: `${text(referral?.toInstitution)}：`,
      patientIntro: `现有患者 ${text(referral?.patient?.name)}，医保证（卡）号 ${text(referral?.patient?.insuranceNo || referral?.insuranceNo || referral?.medicalInsuranceNo)}，性别 ${text(referral?.patient?.gender)}，年龄 ${text(referral?.patient?.age)}，因病情需要，经${vType}治疗，需转入贵单位，请予以接诊。`,
      initialImpression: diagnosisText(referral),
      presentIllness: [referral?.chiefComplaint, referral?.reason].map(text).join('\n'),
      pastHistory: text(referral?.pastMedicalHistory ?? referral?.pastHistory),
      allergyHistory: allergyHistoryText(referral),
      treatmentCourse: [referral?.treatmentCourse, referral?.currentTreatmentPlan, referral?.currentMedication].map(text).join('\n'),
      receivingDept: text(referral?.toDept),
      patientNotice: UPWARD_PATIENT_NOTICE,
      approvalOpinion: approvalOpinion(referral),
      doctorLine: `转诊医生（签字）：${text(referral?.fromDoctor)}`,
      phoneLine: `联系电话：${text(referral?.fromDeptPhone || referral?.fromDepartmentPhone || referral?.departmentPhone)}`,
      sealLine: `${text(referral?.fromInstitution)}（加盖公章）`,
      dateLine: date.full,
    },
    stub: {
      title: `${AREA_NAME}医疗机构双向转诊单`,
      subtitle: '存根',
      ...commonStubFields(referral),
      visitType: vType,
      toInstitution: text(referral?.toInstitution),
      toDept: text(referral?.toDept),
      toDoctor: text(doctor),
      transferSentence: `经${vType}治疗，转入单位${text(referral?.toInstitution)}  科室${text(referral?.toDept)} 接诊医生${text(doctor)}。`,
    },
  }
  return attachClosedNotice(base, referral)
}

function buildDownwardModel(referral) {
  const date = formatDateParts(referral?.createdAt)
  const receivingDoctor = referral?.downwardAssignedDoctorName || referral?.designatedDoctorName || referral?.toDoctor || '以接收机构安排为准'
  const base = {
    direction: 'downward',
    variant: documentVariant(referral),
    title: `${AREA_NAME}医疗机构双向转诊单（回转用）`,
    subtitle: '双向转诊（回转）单',
    body: {
      recipient: `${text(referral?.toInstitution)}：`,
      patientIntro: `现有患者 ${text(referral?.patient?.name)}，医保证（卡）号 ${text(referral?.patient?.insuranceNo || referral?.insuranceNo || referral?.medicalInsuranceNo)}，性别 ${text(referral?.patient?.gender)}，年龄 ${text(referral?.patient?.age)}，因病情需要，现转回贵单位，请予以接诊。`,
      diagnosisResult: diagnosisText(referral),
      inpatientNo: text(referral?.inpatientNo || referral?.medicalRecordNo),
      examSummary: text(referral?.examSummary || referral?.mainExamResult),
      pastHistory: text(referral?.pastMedicalHistory ?? referral?.pastHistory),
      allergyHistory: allergyHistoryText(referral),
      treatmentAndAdvice: [referral?.treatmentCourse, referral?.nextTreatmentPlan, referral?.rehabAdvice, referral?.medicationAdvice, referral?.precautions].map(text).join('\n'),
      approvalOpinion: approvalOpinion(referral),
      doctorLine: `转诊医生（签字）：${text(referral?.fromDoctor)}`,
      phoneLine: `联系电话：${text(referral?.fromDeptPhone || referral?.fromDepartmentPhone || referral?.departmentPhone)}`,
      sealLine: `${text(referral?.fromInstitution)}（加盖公章）`,
      dateLine: date.full,
    },
    stub: {
      title: `${AREA_NAME}医疗机构双向转诊单（回转用）`,
      subtitle: '存根',
      ...commonStubFields(referral),
      inpatientNo: text(referral?.inpatientNo || referral?.medicalRecordNo),
      toInstitution: text(referral?.toInstitution),
      toDoctor: text(receivingDoctor),
      transferSentence: `于 ${date.full} 因病情需要，转回 ${text(referral?.toInstitution)} 单位 ${text(receivingDoctor)} 接诊医生。`,
    },
  }
  return attachClosedNotice(base, referral)
}

function attachClosedNotice(model, referral) {
  if (model.variant !== 'closed-archive') return model
  return {
    ...model,
    closedNotice: {
      status: '已关闭',
      reason: plain(referral?.closeReason || referral?.closeReasonText),
      closedAt: formatDateTime(referral?.closedAt || referral?.updatedAt),
      notice: '本归档版不作为患者继续就诊凭证。',
    },
  }
}

export function buildReferralDocumentModel(referral) {
  return referral?.type === 'downward' ? buildDownwardModel(referral) : buildUpwardModel(referral)
}

export function buildConsentDocumentModel(referral, now = new Date()) {
  return {
    title: '转诊知情同意书',
    basicInfo: {
      patientName: text(referral?.patient?.name),
      gender: text(referral?.patient?.gender),
      age: text(referral?.patient?.age),
      idCard: text(referral?.patient?.idCard),
      phone: text(referral?.patient?.phone),
    },
    referralInfo: {
      fromInstitution: text(referral?.fromInstitution),
      toInstitution: text(referral?.toInstitution),
      direction: getReferralDirectionLabel(referral),
      reason: text(referral?.reason),
      doctor: text(referral?.fromDoctor),
      informedAt: formatDateTime(referral?.consentTime || referral?.createdAt || now.toISOString()),
    },
    disclosureText: '医生已向患者或家属说明当前病情、转诊原因、拟转入或转回医疗机构及转诊必要性。患者或家属已知晓转诊后仍需按接收机构流程完成挂号、缴费、检查、住院、康复管理或随访等相关手续。患者或家属已知晓接收机构最终诊疗安排以现场评估结果为准。',
    riskText: '转诊途中可能存在病情变化、交通延误等风险。接收机构可能因号源、床位、设备、医生排班等原因调整实际接诊安排。急诊或绿色通道转诊场景下，可先救治后补充完善相关签署材料。',
    patientChoices: ['同意转诊', '不同意转诊'],
    signatureFields: ['患者 / 家属签名', '与患者关系', '联系电话', '签署日期', '告知医生签名', '日期', '医疗机构盖章', '日期'],
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function paragraph(value) {
  return escapeHtml(value).replaceAll('\n', '<br />')
}

function renderClosedNotice(model) {
  if (!model.closedNotice) return ''
  return `
    <section class="closed-notice">
      <strong>${escapeHtml(model.closedNotice.status)}</strong>
      <span>关闭原因：${escapeHtml(model.closedNotice.reason)}</span>
      <span>关闭时间：${escapeHtml(model.closedNotice.closedAt)}</span>
      <em>${escapeHtml(model.closedNotice.notice)}</em>
    </section>
  `
}

function renderStub(model) {
  if (model.variant === 'active') return ''
  const s = model.stub
  const inpatient = s.inpatientNo ? `    病案号：${escapeHtml(s.inpatientNo)}` : ''
  return `
    <section class="sheet stub">
      <h1>${escapeHtml(s.title)}</h1>
      <h2>${escapeHtml(s.subtitle)}</h2>
      <p>患者姓名：${escapeHtml(s.patientName)}    性别：${escapeHtml(s.gender)}    年龄：${escapeHtml(s.age)}${inpatient}</p>
      <p>档案编号：${escapeHtml(s.archiveNo)}    医保证（卡）号：${escapeHtml(s.insuranceNo)}</p>
      <p>家庭住址：${escapeHtml(s.address)}    联系电话：${escapeHtml(s.phone)}</p>
      <p>${escapeHtml(s.transferSentence)}</p>
      <section class="stub-signature-row">
        <p>院方审批意见：${escapeHtml(s.approvalOpinion)}</p>
        <p>转诊医生（签字）：${escapeHtml(s.doctorSignature)}</p>
      </section>
      <p class="stub-date">${escapeHtml(s.dateLine)}</p>
    </section>
  `
}

function renderDocumentHeading(model) {
  if (model.direction === 'upward') {
    return `
      <div class="document-referral-no">转诊单号：${escapeHtml(model.body.referralNo)}</div>
      <h1 class="document-title document-title-upward">${escapeHtml(model.subtitle)}</h1>
    `
  }
  return `
    <h1>${escapeHtml(model.title)}</h1>
    <h2>${escapeHtml(model.subtitle)}</h2>
  `
}

function renderUpwardReceivingArrangement(body) {
  return `
    <section class="receiving-arrangement">
      <h3>接收安排：</h3>
      <p>接收科室：${escapeHtml(body.receivingDept)}</p>
    </section>
  `
}

function renderUpwardPatientNotice(body) {
  return `
    <section class="patient-notice">
      <h3>患者须知：</h3>
      <ul>
        ${body.patientNotice.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </section>
  `
}

function renderApprovalAndSignature(model) {
  const b = model.body
  if (model.direction === 'upward') {
    return `
      <section class="approval-signature-row">
        <div>
          <p>院方审批意见：${escapeHtml(b.approvalOpinion)}</p>
        </div>
        <div class="signature">
          <p>${escapeHtml(b.doctorLine)}</p>
          <p>${escapeHtml(b.phoneLine)}</p>
          <p>${escapeHtml(b.sealLine)}</p>
          <p>${escapeHtml(b.dateLine)}</p>
        </div>
      </section>
    `
  }
  return `
    <h3>院方审批意见：</h3><p>${escapeHtml(b.approvalOpinion)}</p>
    <div class="signature">
      <p>${escapeHtml(b.doctorLine)}</p>
      <p>${escapeHtml(b.phoneLine)}</p>
      <p>${escapeHtml(b.sealLine)}</p>
      <p>${escapeHtml(b.dateLine)}</p>
    </div>
  `
}

function renderBody(model) {
  const b = model.body
  const isDownward = model.direction === 'downward'
  return `
    <section class="sheet">
      ${renderDocumentHeading(model)}
      ${renderClosedNotice(model)}
      <p class="recipient">${escapeHtml(b.recipient)}</p>
      <p>${escapeHtml(b.patientIntro)}</p>
      ${isDownward
        ? `
          <h3>诊断结果：</h3><p>${paragraph(b.diagnosisResult)}</p>
          <h3>住院病案号：</h3><p>${escapeHtml(b.inpatientNo)}</p>
          <h3>主要检查结果：</h3><p>${paragraph(b.examSummary)}</p>
          <h3>主要既往史：</h3><p>${paragraph(b.pastHistory)}</p>
          <h3>过敏史：</h3><p>${paragraph(b.allergyHistory)}</p>
          <h3>治疗经过、下一步治疗方案及康复建议：</h3><p>${paragraph(b.treatmentAndAdvice)}</p>
        `
        : `
          <h3>初步印象：</h3><p>${paragraph(b.initialImpression)}</p>
          <h3>主要现病史（转出原因）：</h3><p>${paragraph(b.presentIllness)}</p>
          <h3>主要既往史：</h3><p>${paragraph(b.pastHistory)}</p>
          <h3>过敏史：</h3><p>${paragraph(b.allergyHistory)}</p>
          <h3>治疗经过：</h3><p>${paragraph(b.treatmentCourse)}</p>
          ${renderUpwardReceivingArrangement(b)}
        `}
      ${renderApprovalAndSignature(model)}
      ${isDownward ? '' : renderUpwardPatientNotice(b)}
    </section>
  `
}

export function buildReferralDocumentHtml(model) {
  return `
    <article class="referral-print-document">
      ${renderStub(model)}
      ${renderBody(model)}
    </article>
  `
}

export function buildConsentDocumentText(referral) {
  const model = buildConsentDocumentModel(referral)
  return [
    model.title,
    '',
    '一、患者基本信息',
    `患者姓名：${model.basicInfo.patientName}    性别：${model.basicInfo.gender}    年龄：${model.basicInfo.age}`,
    `证件号：${model.basicInfo.idCard}    联系电话：${model.basicInfo.phone}`,
    '',
    '二、转诊信息',
    `转出机构：${model.referralInfo.fromInstitution}`,
    `转入 / 转回机构：${model.referralInfo.toInstitution}`,
    `转诊方向：${model.referralInfo.direction}`,
    `转诊原因：${model.referralInfo.reason}`,
    `告知医生：${model.referralInfo.doctor}    告知时间：${model.referralInfo.informedAt}`,
    '',
    '三、告知事项',
    model.disclosureText,
    '',
    '四、风险提示',
    model.riskText,
    '',
    '五、患者选择',
    '□ 同意转诊    □ 不同意转诊',
    '',
    '六、签署区',
    '患者 / 家属签名：________    与患者关系：________    联系电话：________',
    '签署日期：________ 年 ________ 月 ________ 日',
    '告知医生签名：________        日期：________ 年 ________ 月 ________ 日',
    '医疗机构盖章：________        日期：________ 年 ________ 月 ________ 日',
  ].join('\n')
}

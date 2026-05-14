import { getReasonOptionLabel, UPWARD_REFERRAL_PURPOSE_OPTIONS } from '../constants/reasonCodes.js'

export const UPWARD_HANDLING_PREFERENCE_OPTIONS = [
  { value: 'outpatient', label: '门诊专科就诊' },
  { value: 'inpatient', label: '建议住院评估' },
  { value: 'byHospital', label: '由上级医院判断' },
]

function asText(value, fallback = '—') {
  if (value === null || value === undefined) return fallback
  if (Array.isArray(value)) return value.length > 0 ? value.join('、') : fallback
  const text = String(value).trim()
  return text ? text : fallback
}

function asNotFilledText(value) {
  return asText(value, '未填写')
}

function formatAllergyHistory(status, detail, fallback = '未填写') {
  const normalizedStatus = String(status || '').trim()
  const normalizedDetail = String(detail || '').trim()
  if (!normalizedStatus) return fallback
  if (normalizedStatus === 'no_known_allergy' || normalizedStatus === '无明确过敏史') return '无明确过敏史'
  if (normalizedStatus === 'unknown' || normalizedStatus === '暂不清楚') return '暂不清楚'
  if (normalizedStatus === 'has_allergy' || normalizedStatus === '有过敏史') return normalizedDetail || fallback
  return normalizedStatus
}

function diagnosisText(ref, fallback = '—') {
  const code = ref?.diagnosis?.code
  const name = ref?.diagnosis?.name
  if (code && name) return `${code} ${name}`
  return asText(name || code, fallback)
}

function attachmentText(ref, group = 'all') {
  const source = group === 'nursing'
    ? ref?.nursingAttachments
    : group === 'exam'
      ? ref?.attachments
      : [
          ...(Array.isArray(ref?.attachments) ? ref.attachments : []),
          ...(Array.isArray(ref?.nursingAttachments) ? ref.nursingAttachments : []),
        ]
  const attachments = Array.isArray(source) ? source : []
  const names = attachments.map(item => item?.name).filter(Boolean)
  return names.length > 0 ? names : '—'
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN')
}

function buildPurposeText(ref, sourceVisitType) {
  if (sourceVisitType === 'inpatient') {
    return asText(ref.inpatientTransferPurpose || ref.transferPurpose || ref.reason)
  }

  if (Array.isArray(ref.outpatientTransferPurpose) && ref.outpatientTransferPurpose.length > 0) {
    return ref.outpatientTransferPurpose.map((code) => {
      if (code === 'other') {
        return ref?.outpatientTransferPurposeOther
          ? `其他：${ref.outpatientTransferPurposeOther}`
          : '其他'
      }
      return getReasonOptionLabel(UPWARD_REFERRAL_PURPOSE_OPTIONS, code) || code
    }).join('、')
  }

  if (Array.isArray(ref.referralPurposeCodes) && ref.referralPurposeCodes.length > 0) {
    return ref.referralPurposeCodes.map((code) => {
      if (code === 'other') {
        return ref?.referralPurposeText ? `其他：${ref.referralPurposeText}` : '其他'
      }
      return getReasonOptionLabel(UPWARD_REFERRAL_PURPOSE_OPTIONS, code) || code
    }).join('、')
  }

  return asText(ref.reason)
}

function inferSourceVisitType(ref) {
  if (ref?.sourceVisitType === 'outpatient' || ref?.sourceVisitType === 'inpatient') {
    return ref.sourceVisitType
  }

  if (
    ref?.inpatientWardNo
    || ref?.inpatientAdmissionDate
    || ref?.inpatientWard
    || ref?.inpatientDoctor
    || ref?.inpatientDiagnosis
  ) {
    return 'inpatient'
  }

  return ref?.is_emergency ? null : 'outpatient'
}

export function formatUpwardHandlingPreference(value) {
  return UPWARD_HANDLING_PREFERENCE_OPTIONS.find(option => option.value === value)?.label || '—'
}

function buildConsentSection(ref, consentInfo) {
  const fileNames = Array.isArray(consentInfo?.fileNames) && consentInfo.fileNames.length > 0
    ? asText(consentInfo.fileNames)
    : asText(consentInfo?.fileName)

  return {
    title: '知情同意',
    items: [
      { label: '签署方式', value: ref?.consentMethod === 'pending_upload' ? '待线下签署后补传' : '线下签字后上传' },
      { label: '签署人类型', value: consentInfo?.signedByLabel || (ref?.consentSignedBy === 'family' ? '家属代签' : '患者本人') },
      { label: '与患者关系', value: ref?.consentSignedBy === 'family' ? asText(ref?.consentProxyRelation) : '—' },
      { label: '代签原因', value: ref?.consentSignedBy === 'family' ? asText(ref?.consentProxyReason) : '—' },
      { label: '已上传文件名', value: fileNames },
      { label: '上传时间', value: formatDateTime(consentInfo?.consentUploadedAt) },
      { label: '状态', value: consentInfo?.isUploaded ? '已完成' : '待补充' },
    ],
  }
}

export function getUpwardDetailSections(ref, consentInfo) {
  const sourceVisitType = inferSourceVisitType(ref)
  const patientTypeLabel = ref?.is_emergency
    ? '急诊'
    : sourceVisitType === 'inpatient'
      ? '住院'
      : '门诊'
  const commonSections = [{
    title: '患者基础信息',
    items: [
      { label: '姓名', value: asText(ref?.patient?.name) },
      { label: '性别', value: asText(ref?.patient?.gender || '未知') },
      { label: '年龄', value: ref?.patient?.age ? `${ref.patient.age}岁` : '—' },
      { label: '联系电话', value: asText(ref?.patient?.phone) },
      { label: '身份证号', value: asText(ref?.patient?.idCard) },
      { label: '患者类型', value: patientTypeLabel },
    ],
  }]

  if (ref?.is_emergency) {
    return [
      {
        title: '患者基础信息',
        items: [
          ...(ref?.isRetroEntry ? [{ label: '患者到院时间', value: asText(ref?.patientArrivedAt) }] : []),
          { label: '患者姓名', value: asText(ref?.patient?.name) },
          { label: '联系电话', value: asText(ref?.patient?.phone) },
          { label: '紧急联系方式', value: asText(ref?.emergencyContactPhone) },
          { label: '性别', value: asText(ref?.patient?.gender || '未知') },
          { label: '年龄', value: ref?.patient?.age ? `${ref.patient.age}岁` : '—' },
          { label: '身份证号', value: asText(ref?.patient?.idCard) },
          { label: '患者意识状态', value: ref?.consciousnessStatus === 'unclear' ? '意识不清' : ref?.consciousnessStatus === 'conscious' ? '意识清醒' : '—' },
        ],
      },
      {
        title: '患者安全信息',
        items: [
          { label: '主要既往史', value: asNotFilledText(ref?.pastMedicalHistory) },
          { label: '过敏史', value: formatAllergyHistory(ref?.allergyHistoryStatus, ref?.allergyHistoryDetail) },
        ],
      },
      {
        title: '急诊信息',
        items: [
          { label: '录入方式', value: ref?.isRetroEntry ? '补录录入' : '实时转诊' },
          { label: '急诊紧急程度', value: ref?.urgencyLevel ? ['I级·急危', 'II级·急重', 'III级·急症', 'IV级·亚急'][ref.urgencyLevel - 1] : '—' },
          { label: '主诉/急转原因', value: asText(ref?.chiefComplaint) },
          { label: '病情补充/已做处置', value: asText(ref?.reason) },
          { label: 'ICD-10诊断', value: diagnosisText(ref) },
        ],
      },
      {
        title: '转运评估',
        items: [
          { label: '是否具备转运条件', value: asText(ref?.transportCondition) },
          { label: '转运需求', value: asText(ref?.transportNeeds) },
        ],
      },
      {
        title: '接收准备',
        items: [
          { label: '目标医院', value: asText(ref?.toInstitution) },
          { label: '接诊入口', value: asText(ref?.admissionArrangement?.department || ref?.toDept || '急诊科') },
          { label: '联动专科', value: asText(ref?.linkedSpecialty) },
        ],
      },
      buildConsentSection(ref, consentInfo),
    ]
  }

  if (sourceVisitType === 'inpatient') {
    return [
      ...commonSections,
      {
        title: '诊断与转诊目的',
        items: [
          { label: '转院目的', value: buildPurposeText(ref, sourceVisitType) },
          { label: '当前病情评估', value: asText(ref?.conditionAssessment) },
          { label: '是否适合转运', value: asText(ref?.transportSuitability) },
          { label: '转运注意事项', value: asText(ref?.transportNotes) },
        ],
      },
      {
        title: '病历摘要',
        items: [
          { label: '主诉与现病史', value: asText(ref?.chiefComplaint) },
          { label: '主要既往史', value: asNotFilledText(ref?.pastMedicalHistory) },
          { label: '过敏史', value: formatAllergyHistory(ref?.allergyHistoryStatus, ref?.allergyHistoryDetail) },
          { label: '当前住院诊断（ICD-10）', value: diagnosisText(ref) },
          { label: '当前治疗经过 / 当前用药情况', value: asText(ref?.medicationSummary || ref?.currentMedication) },
          { label: '当前治疗方案摘要', value: asText(ref?.currentTreatmentPlanSummary || ref?.currentTreatmentPlan) },
          { label: '病情变化说明', value: asText(ref?.conditionChangeNote) },
        ],
      },
      {
        title: '资料上传',
        items: [
          { label: '检查 / 检验资料上传', value: attachmentText(ref, 'exam') },
          { label: '护理记录上传', value: attachmentText(ref, 'nursing') },
        ],
      },
      {
        title: '目标医院与处理方式',
        items: [
          { label: '目标医院', value: asText(ref?.toInstitution) },
          { label: '目标科室', value: asText(ref?.toDept) },
          { label: '期望处理方式', value: formatUpwardHandlingPreference(ref?.admissionTypePref) },
        ],
      },
      buildConsentSection(ref, consentInfo),
    ]
  }

  return [
    ...commonSections,
    {
      title: '门诊关联信息',
      items: [
        { label: '当前门诊科室', value: asText(ref?.outpatientDept) },
        { label: '当前接诊医生', value: asText(ref?.outpatientDoctor) },
        { label: '就诊时间', value: asText(ref?.outpatientVisitTime) },
        { label: '门诊号 / 就诊记录号', value: asText(ref?.outpatientNo) },
      ],
    },
    {
      title: '诊断与转诊目的',
      items: [
        { label: '主诉与现病史', value: asText(ref?.chiefComplaint) },
        { label: '主要既往史', value: asNotFilledText(ref?.pastMedicalHistory) },
        { label: '过敏史', value: formatAllergyHistory(ref?.allergyHistoryStatus, ref?.allergyHistoryDetail) },
        { label: '初步诊断（ICD-10）', value: diagnosisText(ref) },
        { label: '转诊目的', value: buildPurposeText(ref, sourceVisitType) },
        { label: '当前病情评估', value: asText(ref?.outpatientConditionAssessment) },
        { label: '当前治疗经过/用药情况', value: asText(ref?.medicationSummary) },
        { label: '已做检查 / 检验报告', value: attachmentText(ref) },
      ],
    },
    {
      title: '目标医院与处理方式',
      items: [
        { label: '目标医院', value: asText(ref?.toInstitution) },
        { label: '目标科室', value: asText(ref?.toDept) },
        { label: '期望处理方式', value: formatUpwardHandlingPreference(ref?.admissionTypePref) },
      ],
    },
    buildConsentSection(ref, consentInfo),
  ]
}

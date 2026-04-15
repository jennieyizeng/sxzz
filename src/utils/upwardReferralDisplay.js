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

function buildPurposeText(ref, sourceVisitType) {
  if (sourceVisitType === 'inpatient') {
    return asText(ref.inpatientTransferPurpose || ref.transferPurpose || ref.reason)
  }

  if (Array.isArray(ref.outpatientTransferPurpose) && ref.outpatientTransferPurpose.length > 0) {
    return ref.outpatientTransferPurpose.join('、')
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

function getAttachmentNames(list) {
  return Array.isArray(list) && list.length > 0
    ? list.map(item => item?.name || item).filter(Boolean).join('、')
    : '未上传'
}

export function formatUpwardHandlingPreference(value) {
  return UPWARD_HANDLING_PREFERENCE_OPTIONS.find(option => option.value === value)?.label || '—'
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
      ...commonSections,
      {
        title: '急诊信息',
        items: [
          { label: '录入方式', value: ref?.isRetroEntry ? '补录录入' : '实时转诊' },
          { label: '初步诊断', value: `${ref?.diagnosis?.code || '—'} ${ref?.diagnosis?.name || '—'}`.trim() },
          { label: '紧急程度', value: ref?.urgencyLevel ? ['I级·急危', 'II级·急重', 'III级·急症', 'IV级·亚急'][ref.urgencyLevel - 1] : '—' },
          { label: '患者意识状态', value: ref?.consciousnessStatus === 'unclear' ? '意识不清' : ref?.consciousnessStatus === 'conscious' ? '意识清醒' : '—' },
          { label: '患者到院时间', value: asText(ref?.patientArrivedAt) },
          { label: '主诉 / 急转原因', value: asText(ref?.chiefComplaint || ref?.reason) },
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
      {
        title: '已上传资料清单',
        items: [
          { label: '已上传检查 / 检验资料', value: getAttachmentNames(ref?.attachments) },
          { label: '已上传护理记录', value: getAttachmentNames(ref?.nursingAttachments) },
          { label: '知情同意状态', value: consentInfo?.isUploaded ? '已上传' : '待补传' },
          { label: '已上传知情同意书', value: consentInfo?.isUploaded ? '已上传' : '未上传' },
        ],
      },
    ]
  }

  const uploadedSection = {
    title: '已上传资料清单',
    items: [
      { label: '已上传检查 / 检验资料', value: getAttachmentNames(ref?.attachments) },
      { label: '已上传护理记录', value: getAttachmentNames(ref?.nursingAttachments) },
      { label: '知情同意状态', value: consentInfo?.isUploaded ? '已上传' : '待补传' },
      { label: '已上传知情同意书', value: consentInfo?.isUploaded ? '已上传' : '未上传' },
    ],
  }

  if (sourceVisitType === 'inpatient') {
    return [
      ...commonSections,
      {
        title: '本次住院信息',
        items: [
          { label: '住院号', value: asText(ref?.inpatientWardNo) },
          { label: '入院日期', value: asText(ref?.inpatientAdmissionDate) },
          { label: '当前住院科室', value: asText(ref?.inpatientWard) },
          { label: '当前主管医生 / 经治医生', value: asText(ref?.inpatientDoctor) },
          { label: '当前住院诊断', value: asText(ref?.inpatientDiagnosis || ref?.diagnosis?.name) },
        ],
      },
      {
        title: '诊断与转诊目的',
        items: [
          { label: '转院目的', value: buildPurposeText(ref, sourceVisitType) },
          { label: '当前病情评估', value: asText(ref?.conditionAssessment) },
          { label: '是否适合转运', value: asText(ref?.transportSuitability) },
          { label: '转运注意事项', value: asText(ref?.transportNotes) },
          { label: '当前治疗经过 / 当前用药情况', value: asText(ref?.medicationSummary || ref?.currentTreatmentPlanSummary) },
          { label: '病情变化说明', value: asText(ref?.conditionChangeNote) },
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
      uploadedSection,
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
        { label: '初步诊断', value: `${ref?.diagnosis?.code || '—'} ${ref?.diagnosis?.name || '—'}`.trim() },
        { label: '主诉', value: asText(ref?.chiefComplaint) },
        { label: '转诊目的', value: buildPurposeText(ref, sourceVisitType) },
        { label: '当前病情评估', value: asText(ref?.outpatientConditionAssessment) },
        { label: '补充说明', value: Array.isArray(ref?.outpatientTransferPurpose) ? asText(ref?.reason) : '—' },
        { label: '用药情况', value: asText(ref?.medicationSummary) },
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
    uploadedSection,
  ]
}

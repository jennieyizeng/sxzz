import { buildStructuredReasonText, DOWNWARD_REASON_OPTIONS } from '../constants/reasonCodes.js'

function asText(value, fallback = '—') {
  if (value === null || value === undefined) return fallback
  if (Array.isArray(value)) return value.length > 0 ? value : fallback
  const text = String(value).trim()
  return text ? text : fallback
}

const REHAB_GOAL_LABELS = {
  blood_pressure: '血压控制',
  blood_glucose: '血糖监测',
  wound_care: '伤口护理',
  medication_management: '用药管理',
  functional_training: '功能训练',
}

const NURSING_POINT_LABELS = {
  positioning: '体位要求',
  diet: '饮食禁忌',
  activity_limit: '活动限制',
  wound_care: '伤口护理',
  infusion: '输液管理',
}

const WARNING_SYMPTOM_LABELS = {
  fever: '发热',
  bleeding: '出血',
  pain: '疼痛加剧',
  consciousness: '意识改变',
  dyspnea: '呼吸困难',
  blood_pressure_abnormal: '血压异常',
}

function maskIdCard(idCard) {
  if (!idCard) return '—'
  const value = String(idCard)
  if (value.length < 8) return value
  return `${value.slice(0, 3)}****${value.slice(-4)}`
}

function formatMedication(item) {
  if (!item) return ''
  if (item.displayText) return item.displayText
  return [item.name, item.spec, item.usage].filter(Boolean).join(' ').trim()
}

function formatWesternMedication(item) {
  if (!item) return ''
  return [
    item.drugName || item.name,
    item.specification || item.spec,
    item.dose || item.singleDose,
    item.route,
    item.frequency,
    item.duration,
    item.remarks || item.remark,
  ].filter(Boolean).join(' · ').trim()
}

function formatChineseMedication(item) {
  if (!item) return ''
  return [
    item.formulaName || item.name,
    item.dosageForm,
    item.dailyDose,
    item.administration || item.method,
    item.duration,
    item.specialInstruction || item.specialNote,
  ].filter(Boolean).join(' · ').trim()
}

function getMedicationList(ref) {
  const western = (ref?.westernMedications || []).map(formatWesternMedication).filter(Boolean)
  const chinese = (ref?.chineseMedications || ref?.rehabPlan?.chineseMedications || []).map(formatChineseMedication).filter(Boolean)
  if (western.length > 0 || chinese.length > 0) return [...western, ...chinese]

  const medications = ref?.rehabPlan?.medications || []
  const items = medications.map(formatMedication).filter(Boolean)
  return items.length > 0 ? items : '—'
}

function splitAttachments(list, category) {
  const items = Array.isArray(list)
    ? list.filter(item => (item?.category || 'recommended') === category).map(item => item?.name || item).filter(Boolean)
    : []
  return items.length > 0 ? items : '—'
}

export function formatDownwardAllocationMode(ref) {
  const mode = ref?.allocationMode || (ref?.designatedDoctorId ? 'designated' : 'coordinator')
  if (mode === 'designated') return '指定接收医生'
  if (mode === 'coordinator_reassign') return '仅指定机构'
  return '仅指定机构'
}

export function getDownwardMonitorIndicators(ref) {
  const indicators = ref?.monitoringIndicators || ref?.rehabPlan?.indicators
  return Array.isArray(indicators) && indicators.length > 0 ? indicators : []
}

function formatOptionValues(values, labels, otherText, fallbackText) {
  if (Array.isArray(values) && values.length > 0) {
    const formatted = values.flatMap(value => {
      if (value === 'other') return otherText ? [otherText] : []
      return [labels[value] || value]
    })
    return formatted.length > 0 ? formatted : (fallbackText || '—')
  }
  return fallbackText || '—'
}

const DOWNWARD_TRIGGER_LABELS = {
  doctor: '医生医学判断',
  patient: '患者/家属主动要求',
  shared: '两者共同决定',
}

function getMedicationNotes(ref) {
  const notes = ref?.medicationNotes || ref?.rehabPlan?.medicationNotes || []
  return Array.isArray(notes) && notes.length > 0 ? notes : '—'
}

function getReviewSuggestions(ref) {
  const suggestions = ref?.reviewSuggestions || ref?.rehabPlan?.reviewSuggestions || []
  if (!Array.isArray(suggestions) || suggestions.length === 0) return '—'
  const items = suggestions.map(item => (
    [
      item.projectName || item.itemName,
      item.specimenType || item.sampleType,
      item.schedule || item.timing,
      item.remark || item.remarks,
      item.source,
    ].filter(Boolean).join(' · ')
  )).filter(Boolean)
  return items.length > 0 ? items : '—'
}

function splitSelectedRecommendedAttachments(list) {
  const items = Array.isArray(list)
    ? list
      .filter(item => (item?.category || 'recommended') === 'recommended' && item?.selected !== false)
      .map(item => item?.name || item)
      .filter(Boolean)
    : []
  return items.length > 0 ? items : '—'
}

export function getDownwardDetailSections(ref, consentInfo) {
  const monitorIndicators = getDownwardMonitorIndicators(ref)
  const attachmentList = ref?.attachments || []
  const rehabGoals = formatOptionValues(ref?.rehabGoals, REHAB_GOAL_LABELS, ref?.rehabGoalsOther, ref?.rehabPlan?.rehabSuggestion)
  const nursingPoints = formatOptionValues(ref?.nursingPoints, NURSING_POINT_LABELS, ref?.nursingPointsOther, ref?.rehabPlan?.notes)
  const warningSymptoms = formatOptionValues(ref?.warningSymptoms, WARNING_SYMPTOM_LABELS, ref?.warningSymptomsOther, ref?.rehabPlan?.warningNotes)
  const receiverItems = [
    { label: '目标基层机构', value: asText(ref?.toInstitution) },
    { label: '接收方式', value: formatDownwardAllocationMode(ref) },
    {
      label: '指定接收医生',
      value: ref?.allocationMode === 'designated' || ref?.designatedDoctorId
        ? asText(ref?.designatedDoctorName || ref?.downwardAssignedDoctorName)
        : '—',
    },
  ]

  if (ref?.toDept) {
    receiverItems.splice(1, 0, { label: '基层承接科室', value: asText(ref?.toDept) })
  }

  return [
    {
      title: '患者信息',
      items: [
        { label: '姓名', value: asText(ref?.patient?.name) },
        { label: '性别', value: asText(ref?.patient?.gender || '未知') },
        { label: '年龄', value: ref?.patient?.age ? `${ref.patient.age}岁` : '—' },
        { label: '身份证号', value: maskIdCard(ref?.patient?.idCard) },
        { label: '联系电话', value: asText(ref?.patient?.phone) },
      ],
    },
    {
      title: '转出资料',
      items: [
        { label: '出院诊断/主要诊断', value: asText(ref?.diagnosis?.name) },
        { label: 'ICD-10', value: asText(ref?.diagnosis?.code) },
        { label: '出院小结摘要', value: asText(ref?.chiefComplaint || ref?.structuredData?.sections?.[0]?.items?.find?.(item => item.label === '出院小结摘要')?.value) },
        { label: '下转交接摘要', value: asText(ref?.handoffSummary) },
        { label: '继续用药', value: getMedicationList(ref) },
        { label: '用药注意事项', value: getMedicationNotes(ref) },
        { label: '复查建议', value: getReviewSuggestions(ref) },
        { label: '推荐资料包', value: splitSelectedRecommendedAttachments(attachmentList) },
        { label: '补充资料', value: splitAttachments(attachmentList, 'supplemental') },
      ],
    },
    {
      title: '基层执行方案',
      items: [
        {
          label: '下转原因',
          value: asText(
            buildStructuredReasonText(
              DOWNWARD_REASON_OPTIONS,
              ref?.downwardReasonCode || ref?.downwardReason,
              ref?.downwardReasonText || ref?.downwardReasonOther || ref?.reason,
            ) || ref?.reason,
          ),
        },
        { label: '下转触发方', value: asText(DOWNWARD_TRIGGER_LABELS[ref?.downwardTrigger]) },
        { label: '康复目标', value: rehabGoals },
        { label: '首次随访时间', value: asText(ref?.rehabPlan?.followupDate) },
        { label: '监测指标', value: monitorIndicators.length > 0 ? monitorIndicators : '—', type: 'tags' },
        { label: '护理要点', value: nursingPoints },
        { label: '预警症状', value: warningSymptoms },
        { label: '补充说明', value: asText(ref?.doctorRemarks || ref?.rehabPlan?.supplementNote) },
      ],
    },
    {
      title: '接收安排',
      items: receiverItems,
    },
    {
      title: '知情同意',
      items: [
        { label: '签署方式', value: '线下签字后上传' },
        { label: '签署人', value: ref?.consentSignedBy === 'family' ? '家属代签' : asText(consentInfo?.signedByLabel) },
        { label: '家属姓名', value: ref?.consentSignedBy === 'family' ? asText(ref?.consentProxyName) : '—' },
        { label: '与患者关系', value: ref?.consentSignedBy === 'family' ? asText(ref?.consentProxyRelation) : '—' },
        { label: '代签原因', value: ref?.consentSignedBy === 'family' ? asText(ref?.consentProxyReason) : '—' },
        { label: '已上传文件名', value: consentInfo?.fileNames || consentInfo?.fileName || '未上传' },
        { label: '状态', value: consentInfo?.isUploaded ? '已完成' : '待补充' },
      ],
    },
  ]
}

function asText(value, fallback = '—') {
  if (value === null || value === undefined) return fallback
  if (Array.isArray(value)) return value.length > 0 ? value : fallback
  const text = String(value).trim()
  return text ? text : fallback
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

function getMedicationList(ref) {
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
  const indicators = ref?.rehabPlan?.indicators
  return Array.isArray(indicators) && indicators.length > 0 ? indicators : []
}

export function getDownwardDetailSections(ref, consentInfo) {
  const monitorIndicators = getDownwardMonitorIndicators(ref)
  const attachmentList = ref?.attachments || []

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
        { label: '当前诊断', value: asText(ref?.diagnosis?.name) },
        { label: 'ICD-10', value: asText(ref?.diagnosis?.code) },
        { label: '诊疗摘要', value: asText(ref?.chiefComplaint || ref?.structuredData?.sections?.[0]?.items?.find?.(item => item.label === '诊疗摘要')?.value) },
        { label: '药物交接', value: getMedicationList(ref) },
        { label: '其他执行建议', value: asText(ref?.rehabPlan?.otherExecutionAdvice || ref?.structuredData?.sections?.[0]?.items?.find?.(item => item.label === '其他执行建议')?.value) },
        { label: '推荐必带', value: splitAttachments(attachmentList, 'recommended') },
        { label: '补充资料', value: splitAttachments(attachmentList, 'supplemental') },
      ],
    },
    {
      title: '基层执行方案',
      items: [
        { label: '转出原因', value: asText(ref?.reason) },
        { label: '护理要点', value: asText(ref?.rehabPlan?.notes) },
        { label: '康复建议', value: asText(ref?.rehabPlan?.rehabSuggestion) },
        { label: '首次随访时间', value: asText(ref?.rehabPlan?.followupDate) },
        { label: '随访监测指标', value: monitorIndicators.length > 0 ? monitorIndicators : '—', type: 'tags' },
        { label: '预警事项', value: asText(ref?.rehabPlan?.warningNotes) },
        { label: '补充说明', value: asText(ref?.rehabPlan?.supplementNote) },
      ],
    },
    {
      title: '接收安排',
      items: [
        { label: '目标基层机构', value: asText(ref?.toInstitution) },
        { label: '自动匹配承接科室', value: asText(ref?.toDept) },
        { label: '接收方式', value: formatDownwardAllocationMode(ref) },
        {
          label: '指定接收医生',
          value: ref?.allocationMode === 'designated' || ref?.designatedDoctorId
            ? asText(ref?.designatedDoctorName || ref?.downwardAssignedDoctorName)
            : '—',
        },
      ],
    },
    {
      title: '知情同意',
      items: [
        { label: '签署方式', value: '线下签字后上传' },
        { label: '签署人', value: asText(consentInfo?.signedByLabel) },
        { label: '已上传文件名', value: consentInfo?.fileName || '未上传' },
        { label: '状态', value: consentInfo?.isUploaded ? '已完成' : '待补充' },
      ],
    },
  ]
}

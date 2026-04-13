function normalizeAttachments(attachments = []) {
  return Array.isArray(attachments)
    ? attachments.map(item => ({
        name: item?.name || '未命名附件',
        size: item?.size || '—',
        source: item?.source || '转诊附件',
        tag: item?.tag || '',
      }))
    : []
}

function buildSummary(referralRecord) {
  if (!referralRecord) {
    return { title: '转诊摘要', items: [] }
  }

  const isEmergencyLike = referralRecord.is_emergency || ['emergency', 'green_channel'].includes(referralRecord.referral_type)

  if (isEmergencyLike) {
    return {
      title: '急诊转诊资料',
      items: [
        { label: '患者姓名', value: referralRecord.patient?.name || '—' },
        { label: '主诉/初步诊断', value: referralRecord.chiefComplaint || referralRecord.diagnosis?.name || '—' },
        { label: '紧急原因', value: referralRecord.reason || '—' },
        { label: '意识状态', value: referralRecord.consciousnessStatus || '未填写' },
      ],
    }
  }

  return {
    title: '转诊摘要',
    items: [
      { label: '主要诊断', value: referralRecord.diagnosis?.name || '—' },
      { label: 'ICD-10', value: referralRecord.diagnosis?.code || '—' },
      { label: '摘要说明', value: referralRecord.chiefComplaint || referralRecord.summary || referralRecord.reason || '—' },
    ],
  }
}

function buildFallbackStructuredData(referralRecord) {
  if (!referralRecord || referralRecord.is_emergency || ['emergency', 'green_channel'].includes(referralRecord.referral_type)) {
    return null
  }

  if (referralRecord.type === 'downward') {
    return {
      title: '病历数据包',
      sections: [
        {
          title: '诊断与住院信息',
          items: [
            { label: '主要诊断', value: referralRecord.diagnosis?.name || '—' },
            { label: 'ICD-10', value: referralRecord.diagnosis?.code || '—' },
          ],
        },
        {
          title: '本次诊疗摘要',
          items: [
            { label: '摘要', value: referralRecord.chiefComplaint || '—' },
          ],
        },
        {
          title: '随诊监测指标',
          items: (referralRecord.rehabPlan?.indicators || []).length > 0
            ? referralRecord.rehabPlan.indicators.map(item => ({ label: '指标', value: item }))
            : [{ label: '指标', value: '未提供' }],
        },
      ],
    }
  }

  return {
    title: '结构化临床资料',
    sections: [
      {
        title: '诊断信息',
        items: [
          { label: '主要诊断', value: referralRecord.diagnosis?.name || '—' },
          { label: 'ICD-10', value: referralRecord.diagnosis?.code || '—' },
        ],
      },
      {
        title: '近期门急诊病历',
        items: [
          { label: '病历摘要', value: referralRecord.chiefComplaint || '—' },
        ],
      },
      {
        title: '检验摘要',
        items: [
          { label: '摘要', value: '已同步最近检验摘要，可结合附件查看完整报告。' },
        ],
      },
      {
        title: '影像结论',
        items: [
          { label: '结论', value: '已同步影像文字结论，可结合附件查看完整报告。' },
        ],
      },
      {
        title: '当前用药',
        items: [
          { label: '药物信息', value: '未录入结构化用药信息，可结合附件查看。' },
        ],
      },
    ],
  }
}

function buildRehabPlan(referralRecord) {
  if (!referralRecord?.rehabPlan || referralRecord.is_emergency || ['emergency', 'green_channel'].includes(referralRecord.referral_type)) {
    return null
  }

  return {
    title: '转诊方案',
    medications: referralRecord.rehabPlan.medications || [],
    sections: [
      { label: '护理要点', value: referralRecord.rehabPlan.notes || '—' },
      { label: '康复建议', value: referralRecord.rehabPlan.rehabSuggestion || referralRecord.rehabPlan.notes || '—' },
      { label: '首次随访日期', value: referralRecord.rehabPlan.followupDate || '—' },
      { label: '随访频率', value: referralRecord.rehabPlan.followupFrequency || '—' },
      { label: '预警事项', value: referralRecord.rehabPlan.warningNotes || '—' },
      { label: '补充说明', value: referralRecord.rehabPlan.supplementNote || '—' },
    ],
  }
}

export function buildClinicalPackage(referralRecord) {
  const attachments = normalizeAttachments(referralRecord?.attachments)
  const isEmergencyLike = referralRecord?.is_emergency || ['emergency', 'green_channel'].includes(referralRecord?.referral_type)
  const isUpward = referralRecord?.type === 'upward'
  const structuredData = referralRecord?.structuredData || buildFallbackStructuredData(referralRecord)
  const rehabPlan = referralRecord?.rehabPlan ? buildRehabPlan(referralRecord) : null
  const hasLegacyAttachmentOnly = !referralRecord?.structuredData && !rehabPlan && attachments.length > 0
  const displayMode = isUpward || isEmergencyLike || hasLegacyAttachmentOnly
    ? 'attachment_only'
    : structuredData
      ? 'structured'
      : 'attachment_only'

  return {
    displayMode,
    summary: buildSummary(referralRecord),
    structuredData: displayMode === 'structured' ? structuredData : null,
    rehabPlan: displayMode === 'structured' ? rehabPlan : null,
    attachments,
  }
}

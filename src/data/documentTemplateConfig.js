export const DOCUMENT_TEMPLATE_DIRECTIONS = [
  { value: 'primary_to_county', label: '基层机构 → 县级机构' },
  { value: 'county_to_primary', label: '县级机构 → 基层机构' },
]

export const DOCUMENT_TEMPLATE_TRANSFER_TYPES = ['普通', '急诊', '绿色通道', '全部']
export const DOCUMENT_TEMPLATE_EMPTY_RULES = ['不显示', '显示空横线', '显示“未填写”']

export const UPWARD_DOCUMENT_BLOCKS = [
  '标题区',
  '患者基本信息',
  '转出机构信息',
  '转入机构信息',
  '诊疗摘要',
  '转诊原因',
  '接诊安排',
  '附件清单',
  '患者就诊须知',
  '签章区',
  '填表说明',
]

export const DOWNWARD_DOCUMENT_BLOCKS = [
  '标题区',
  '患者基本信息',
  '转出机构信息',
  '转回机构信息',
  '诊断与治疗摘要',
  '下转原因',
  '康复与随访方案',
  '附件清单',
  '患者接收须知',
  '签章区',
  '填表说明',
]

export const CONSENT_DOCUMENT_BLOCKS = [
  '标题区',
  '患者基本信息',
  '转诊信息',
  '告知事项',
  '风险提示',
  '患者选择',
  '签署区',
  '医生说明区',
  '机构盖章区',
  '备注说明',
]

export const DOCUMENT_FIELD_LABELS = [
  '患者姓名',
  '性别',
  '年龄',
  '身份证号',
  '联系电话',
  '转诊单编号',
  '转出机构',
  '转入机构',
  '诊断',
  '转诊原因',
  '接诊安排',
  '附件清单',
]

export const CONSENT_FIELD_LABELS = [
  '模板标题',
  '转诊单编号',
  '生成时间',
  '患者姓名',
  '性别',
  '年龄',
  '身份证号 / 证件号',
  '联系电话',
  '适用转诊方向',
  '转出机构',
  '转入 / 转回机构',
  '转诊原因',
  '转诊医生',
  '告知时间',
  '同意转诊',
  '不同意转诊',
  '患者 / 家属签名',
  '与患者关系',
  '签署人联系电话',
  '签署日期',
  '告知医生签名',
  '告知日期',
  '医疗机构盖章',
  '盖章日期',
]

export const DEFAULT_CONSENT_NOTICE_TEXTS = [
  '医生已向患者或家属说明当前病情、转诊原因、拟转入或转回医疗机构及转诊必要性。',
  '患者或家属已知晓转诊后仍需按接收机构流程完成挂号、缴费、检查、住院、康复管理或随访等相关手续。',
  '患者或家属已知晓接收机构最终诊疗安排以现场评估结果为准。',
]

export const DEFAULT_CONSENT_RISK_TEXTS = [
  '转诊途中可能存在病情变化、交通延误等风险。',
  '接收机构可能因号源、床位、设备、医生排班等原因调整实际接诊安排。',
  '急诊或绿色通道转诊场景下，可先救治后补充完善相关签署材料。',
]

function buildBlocks(names) {
  return names.map((name, index) => ({
    id: `block-${index + 1}`,
    title: name,
    visible: true,
    order: index + 1,
  }))
}

function buildFields() {
  return DOCUMENT_FIELD_LABELS.map((name, index) => ({
    id: `field-${index + 1}`,
    label: name,
    visible: true,
    order: index + 1,
    emptyRule: '显示空横线',
  }))
}

function buildConsentFields() {
  return CONSENT_FIELD_LABELS.map((name, index) => ({
    id: `consent-field-${index + 1}`,
    label: name,
    visible: true,
    order: index + 1,
    emptyRule: '显示空横线',
  }))
}

export const DEFAULT_DOCUMENT_TEMPLATES = [
  {
    id: 'TPL-UP-001',
    name: '系统默认上转文书模板',
    title: '双向转诊（转出）单',
    direction: 'primary_to_county',
    region: 'xx市',
    institution: '',
    transferType: '全部',
    version: 'V1.0',
    status: '已启用',
    isDefault: true,
    enabled: true,
    updatedAt: '2026-04-24 09:00',
    description: '基层机构向县级机构发起上转时使用的系统默认模板。',
    globalOptions: {
      showQrCode: true,
      showPrintTime: true,
      showReferralNo: true,
      showStatusWatermark: true,
      showSignatureArea: true,
      emptyRule: '显示空横线',
      paperSize: 'A4',
      orientation: '纵向',
    },
    blocks: buildBlocks(UPWARD_DOCUMENT_BLOCKS),
    fields: buildFields(),
    versions: [
      { version: 'V1.0', updatedAt: '2026-04-24 09:00', operator: '林系统管理员', note: '初始化上转文书默认模板' },
    ],
  },
  {
    id: 'TPL-DOWN-001',
    name: '系统默认下转文书模板',
    title: '双向转诊下转（回转）单',
    direction: 'county_to_primary',
    region: 'xx市',
    institution: '',
    transferType: '全部',
    version: 'V1.0',
    status: '已启用',
    isDefault: true,
    enabled: true,
    updatedAt: '2026-04-24 09:00',
    description: '县级机构向基层机构发起下转或回转时使用的系统默认模板。',
    globalOptions: {
      showQrCode: true,
      showPrintTime: true,
      showReferralNo: true,
      showStatusWatermark: true,
      showSignatureArea: true,
      emptyRule: '显示空横线',
      paperSize: 'A4',
      orientation: '纵向',
    },
    blocks: buildBlocks(DOWNWARD_DOCUMENT_BLOCKS),
    fields: buildFields(),
    versions: [
      { version: 'V1.0', updatedAt: '2026-04-24 09:00', operator: '林系统管理员', note: '初始化下转文书默认模板' },
    ],
  },
]

export const DEFAULT_CONSENT_TEMPLATES = [
  {
    id: 'CONSENT-UP-001',
    name: '系统默认上转知情同意书模板',
    title: '转诊知情同意书',
    direction: 'primary_to_county',
    region: 'xx市',
    institution: '',
    transferType: '全部',
    version: 'V1.0',
    status: '已启用',
    isDefault: true,
    enabled: true,
    updatedAt: '2026-04-24 09:00',
    description: '基层机构向县级机构发起上转时使用的线下签署知情同意书模板。',
    globalOptions: {
      showPrintTime: true,
      showReferralNo: true,
      showSignatureArea: true,
      emptyRule: '显示空横线',
      paperSize: 'A4',
      orientation: '纵向',
    },
    blocks: buildBlocks(CONSENT_DOCUMENT_BLOCKS),
    fields: buildConsentFields(),
    fixedTexts: {
      notices: [...DEFAULT_CONSENT_NOTICE_TEXTS],
      risks: [...DEFAULT_CONSENT_RISK_TEXTS],
    },
    versions: [
      { version: 'V1.0', updatedAt: '2026-04-24 09:00', operator: '林系统管理员', note: '初始化上转知情同意书默认模板' },
    ],
  },
  {
    id: 'CONSENT-DOWN-001',
    name: '系统默认下转知情同意书模板',
    title: '转诊知情同意书',
    direction: 'county_to_primary',
    region: 'xx市',
    institution: '',
    transferType: '全部',
    version: 'V1.0',
    status: '已启用',
    isDefault: true,
    enabled: true,
    updatedAt: '2026-04-24 09:00',
    description: '县级机构向基层机构发起下转或回转时使用的线下签署知情同意书模板。',
    globalOptions: {
      showPrintTime: true,
      showReferralNo: true,
      showSignatureArea: true,
      emptyRule: '显示空横线',
      paperSize: 'A4',
      orientation: '纵向',
    },
    blocks: buildBlocks(CONSENT_DOCUMENT_BLOCKS),
    fields: buildConsentFields(),
    fixedTexts: {
      notices: [...DEFAULT_CONSENT_NOTICE_TEXTS],
      risks: [...DEFAULT_CONSENT_RISK_TEXTS],
    },
    versions: [
      { version: 'V1.0', updatedAt: '2026-04-24 09:00', operator: '林系统管理员', note: '初始化下转知情同意书默认模板' },
    ],
  },
]

export function getDirectionLabel(direction) {
  return DOCUMENT_TEMPLATE_DIRECTIONS.find(item => item.value === direction)?.label || direction || '—'
}

export function getDirectionByReferral(referral) {
  return referral?.type === 'downward' ? 'county_to_primary' : 'primary_to_county'
}

export function getTransferTypeByReferral(referral) {
  if (referral?.referral_type === 'green_channel') return '绿色通道'
  if (referral?.is_emergency || referral?.referral_type === 'emergency') return '急诊'
  return '普通'
}

export function matchDocumentTemplate(referral, templates = DEFAULT_DOCUMENT_TEMPLATES) {
  const direction = getDirectionByReferral(referral)
  const transferType = getTransferTypeByReferral(referral)
  const candidates = templates.filter(template => (
    template.direction === direction
    && template.enabled
    && template.status === '已启用'
    && (template.transferType === transferType || template.transferType === '全部')
  ))

  return candidates.find(template => template.institution && (
    template.institution === referral?.fromInstitution || template.institution === referral?.toInstitution
  ))
    || candidates.find(template => template.region === 'xx市' && !template.institution)
    || DEFAULT_DOCUMENT_TEMPLATES.find(template => template.direction === direction)
    || DEFAULT_DOCUMENT_TEMPLATES[0]
}

export function matchConsentTemplate(referral, templates = DEFAULT_CONSENT_TEMPLATES) {
  const direction = getDirectionByReferral(referral)
  const transferType = getTransferTypeByReferral(referral)
  const candidates = templates.filter(template => (
    template.direction === direction
    && template.enabled
    && template.status === '已启用'
    && (template.transferType === transferType || template.transferType === '全部')
  ))

  return candidates.find(template => template.institution && (
    template.institution === referral?.fromInstitution || template.institution === referral?.toInstitution
  ))
    || candidates.find(template => template.region === 'xx市' && !template.institution)
    || DEFAULT_CONSENT_TEMPLATES.find(template => template.direction === direction)
    || DEFAULT_CONSENT_TEMPLATES[0]
}

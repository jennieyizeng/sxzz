export const REPORT_STATUS_LABEL = {
  pending: '待上报',
  success: '已上报',
  failed: '上报失败',
  retrying: '重试中',
  manual_pending: '待手动补报',
}

export const DATA_REPORTING_REFERRAL_NO_EXAMPLE = 'ZZ20260430001'

const FALLBACK_INSTITUTIONS = [
  'xx市拱星镇卫生院',
  'xx市汉旺镇卫生院',
  'xx市人民医院',
  'xx市清平乡卫生院',
]

const MOCK_DETAILS = {
  ZZ20260430001: {
    referralNo: 'ZZ20260430001',
    patientName: '张三',
    patientGender: '男',
    patientAge: 67,
    type: 'upward',
    completedAt: '2026-04-30 10:54',
    reportStatus: 'pending',
    g01Fields: {
      orgCode: 'ORG-510100-001',
      fromOrgName: 'xx市拱星镇卫生院',
      patientIdMasked: maskPatientId('510123198001012345'),
      direction: '上转',
      fromOrg: 'xx市拱星镇卫生院',
      toOrg: 'xx市人民医院',
      icd10: 'I10.x00',
      completedAt: '2026-04-30 10:54',
      firstReportedAt: '待上报',
    },
    history: [],
  },
  ZZ20260429002: {
    referralNo: 'ZZ20260429002',
    patientName: '李四',
    patientGender: '女',
    patientAge: 72,
    type: 'upward',
    completedAt: '2026-04-29 15:30',
    reportStatus: 'success',
    g01Fields: {
      orgCode: 'ORG-510100-001',
      fromOrgName: 'xx市汉旺镇卫生院',
      patientIdMasked: maskPatientId('510123197802034567'),
      direction: '上转',
      fromOrg: 'xx市汉旺镇卫生院',
      toOrg: 'xx市人民医院',
      icd10: 'E11.900',
      completedAt: '2026-04-29 15:30',
      firstReportedAt: '2026-04-29 15:45',
    },
    history: [
      { timestamp: '2026-04-29 15:45', action: '系统自动触发', status: 'success', responseCode: 'HT20260429002', responseMessage: '已接收' },
    ],
  },
  ZZ20260428003: {
    referralNo: 'ZZ20260428003',
    patientName: '王五',
    patientGender: '男',
    patientAge: 58,
    type: 'downward',
    completedAt: '2026-04-28 09:15',
    reportStatus: 'manual_pending',
    g01Fields: {
      orgCode: 'ORG-510100-002',
      fromOrgName: 'xx市人民医院',
      patientIdMasked: maskPatientId('510123196512126789'),
      direction: '下转',
      fromOrg: 'xx市人民医院',
      toOrg: 'xx市拱星镇卫生院',
      icd10: 'I50.900',
      completedAt: '2026-04-28 09:15',
      firstReportedAt: '2026-04-28 09:35',
    },
    history: [
      { timestamp: '2026-04-29 08:00', action: '手动补报', status: 'failed', responseCode: 'E4002', responseMessage: '患者证件号校验失败' },
      { timestamp: '2026-04-28 16:00', action: '第 3 次重试', status: 'failed', responseCode: 'E5031', responseMessage: '健康通服务暂不可用' },
      { timestamp: '2026-04-28 09:35', action: '系统自动触发', status: 'failed', responseCode: 'E5031', responseMessage: '健康通服务暂不可用' },
    ],
  },
  ZZ20260427004: {
    referralNo: 'ZZ20260427004',
    patientName: '赵六',
    patientGender: '男',
    patientAge: 61,
    type: 'upward',
    completedAt: '2026-04-27 14:20',
    reportStatus: 'failed',
    g01Fields: {
      orgCode: 'ORG-510100-003',
      fromOrgName: 'xx市清平乡卫生院',
      patientIdMasked: maskPatientId('510123199006078901'),
      direction: '上转',
      fromOrg: 'xx市清平乡卫生院',
      toOrg: 'xx市人民医院',
      icd10: 'J18.900',
      completedAt: '2026-04-27 14:20',
      firstReportedAt: '2026-04-27 14:40',
    },
    history: [
      { timestamp: '2026-04-28 10:00', action: '第 1 次重试', status: 'failed', responseCode: 'E5020', responseMessage: '接口响应超时' },
      { timestamp: '2026-04-27 14:40', action: '系统自动触发', status: 'failed', responseCode: 'E5020', responseMessage: '接口响应超时' },
    ],
  },
}

export function isDataReportingReferralNo(value) {
  return /^ZZ\d{11}$/.test(String(value || ''))
}

export function getReportActions(status) {
  if (status === 'failed') return ['view', 'retry']
  if (status === 'manual_pending') return ['view', 'manualReport']
  return ['view']
}

export function maskPatientId(value) {
  const text = String(value || '')
  if (text.length <= 7) return text || '—'
  return `${text.slice(0, 3)}${'*'.repeat(Math.max(0, text.length - 7))}${text.slice(-4)}`
}

export function buildDataReportDetailUrl(referralId) {
  return `/data-reporting/${referralId}/detail`
}

export async function loadDataReportingInstitutions({ fetchImpl = fetch } = {}) {
  try {
    const response = await fetchImpl('/data-reporting/institutions')
    const contentType = response.headers?.get?.('content-type') || ''
    if (!response.ok || !contentType.includes('application/json')) return FALLBACK_INSTITUTIONS
    const data = await response.json()
    const rows = Array.isArray(data) ? data : data.institutions || []
    const names = rows
      .map(item => typeof item === 'string' ? item : item.name)
      .filter(Boolean)
    return names.length > 0 ? names : FALLBACK_INSTITUTIONS
  } catch {
    return FALLBACK_INSTITUTIONS
  }
}

function formatReportTime(value) {
  if (!value) return value
  return String(value).replace('T', ' ').slice(0, 16)
}

function normalizeDetail(detail) {
  const reportStatus = detail.reportStatus
  const firstReportedAt = detail.g01Fields?.firstReportedAt
  const normalizedFirstReportedAt = reportStatus === 'pending' && !firstReportedAt
    ? '待上报'
    : formatReportTime(firstReportedAt)

  return {
    ...detail,
    completedAt: formatReportTime(detail.completedAt),
    g01Fields: {
      ...detail.g01Fields,
      patientIdMasked: detail.g01Fields?.patientIdMasked || maskPatientId(detail.patientId),
      fromOrgName: detail.g01Fields?.fromOrgName || detail.fromOrgName,
      completedAt: formatReportTime(detail.g01Fields?.completedAt),
      firstReportedAt: normalizedFirstReportedAt,
    },
    history: [...(detail.history || [])]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map(item => ({ ...item, timestamp: formatReportTime(item.timestamp) })),
  }
}

function fallbackDetail(referralId) {
  return MOCK_DETAILS[referralId] || {
    referralNo: referralId,
    patientName: '—',
    patientGender: '',
    patientAge: '',
    type: 'upward',
    completedAt: '—',
    reportStatus: 'pending',
    g01Fields: {
      orgCode: '—',
      fromOrgName: '—',
      patientIdMasked: '—',
      direction: '—',
      fromOrg: '—',
      toOrg: '—',
      icd10: '—',
      completedAt: '—',
      firstReportedAt: '待上报',
    },
    history: [],
  }
}

export async function loadDataReportDetail({ referralId, fetchImpl = fetch }) {
  if (MOCK_DETAILS[referralId]) {
    return normalizeDetail(MOCK_DETAILS[referralId])
  }

  try {
    const response = await fetchImpl(buildDataReportDetailUrl(referralId))
    const contentType = response.headers?.get?.('content-type') || ''
    if (!response.ok || !contentType.includes('application/json')) {
      return fallbackDetail(referralId)
    }
    const detail = await response.json()
    return normalizeDetail(detail)
  } catch {
    return fallbackDetail(referralId)
  }
}

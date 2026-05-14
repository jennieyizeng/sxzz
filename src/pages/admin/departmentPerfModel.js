export const INSTITUTIONS = [
  { id: 'all', name: '全部机构' },
  { id: 'org-county-hospital', name: 'xx市人民医院' },
  { id: 'org-gongxing', name: 'xx市拱星镇卫生院' },
  { id: 'org-hanwang', name: 'xx市汉旺镇卫生院' },
  { id: 'org-qingping', name: 'xx市清平乡卫生院' },
  { id: 'org-jiulong', name: 'xx市九龙镇卫生院' },
]

export const MOCK_DEPT = [
  { id: 'dept-cardio', rank: 1, dept: '心血管科', inst: 'xx市人民医院', orgId: 'org-county-hospital', upHandle: 28, downSend: 22, rate: '94.0%', avgResp: 1.8, rejected: 1 },
  { id: 'dept-neuro', rank: 2, dept: '神经内科', inst: 'xx市人民医院', orgId: 'org-county-hospital', upHandle: 19, downSend: 15, rate: '91.2%', avgResp: 2.3, rejected: 2 },
  { id: 'dept-general-gongxing', rank: 3, dept: '全科', inst: 'xx市拱星镇卫生院', orgId: 'org-gongxing', upHandle: 0, downSend: 28, rate: '89.3%', avgResp: 3.5, rejected: 3 },
]

export const MOCK_DOCTOR = [
  { doctorId: 'doctor-liu', rank: 1, name: '刘医生', dept: '心血管科', inst: 'xx市人民医院', orgId: 'org-county-hospital', upHandle: 28, downSend: 22, rate: '94.0%', avgResp: 1.8, rejected: 1 },
  { doctorId: 'doctor-wang', rank: 2, name: '王医生', dept: '全科', inst: 'xx市拱星镇卫生院', orgId: 'org-gongxing', upHandle: 28, downSend: 0, rate: '89.3%', avgResp: 3.5, rejected: 3 },
  { doctorId: 'doctor-lihui', rank: 3, name: '李慧医生', dept: '全科', inst: 'xx市汉旺镇卫生院', orgId: 'org-hanwang', upHandle: 19, downSend: 0, rate: '90.5%', avgResp: 2.9, rejected: 0 },
]

export const MOCK_DOCTOR_REFERRALS = {
  'doctor-liu': [
    { id: 'ZZ20260403001', referralNo: 'ZZ20260403001', patientName: '刘建国', gender: '男', age: 67, type: 'upward', diagnosisCode: 'I10.x00', diagnosisName: '原发性高血压', status: '已完成', completedAt: '2026-05-12 14:30', updatedAt: '2026-05-12 14:30' },
    { id: 'ZZ20260402002', referralNo: 'ZZ20260402002', patientName: '陈秀兰', gender: '女', age: 72, type: 'downward', diagnosisCode: 'I50.900', diagnosisName: '心力衰竭', status: '已完成', completedAt: '2026-05-11 10:20', updatedAt: '2026-05-11 10:20' },
    { id: 'ZZ20260401003', referralNo: 'ZZ20260401003', patientName: '周明', gender: '男', age: 58, type: 'upward', diagnosisCode: 'E11.900', diagnosisName: '2型糖尿病', status: '已拒绝', completedAt: '2026-05-10 16:10', updatedAt: '2026-05-10 16:10' },
  ],
  'doctor-wang': [
    { id: 'ZZ20260329001', referralNo: 'ZZ20260329001', patientName: '王芳', gender: '女', age: 64, type: 'downward', diagnosisCode: 'I63.900', diagnosisName: '脑梗死恢复期', status: '已完成', completedAt: '2026-05-09 11:10', updatedAt: '2026-05-09 11:10' },
    { id: 'ZZ20260328002', referralNo: 'ZZ20260328002', patientName: '赵勇', gender: '男', age: 70, type: 'downward', diagnosisCode: 'J44.100', diagnosisName: '慢性阻塞性肺疾病急性加重', status: '已拒绝', completedAt: '2026-05-07 15:00', updatedAt: '2026-05-07 15:00' },
  ],
  'doctor-lihui': [
    { id: 'ZZ20260327001', referralNo: 'ZZ20260327001', patientName: '孙梅', gender: '女', age: 53, type: 'upward', diagnosisCode: 'J18.900', diagnosisName: '肺炎', status: '已完成', completedAt: '2026-05-08 09:45', updatedAt: '2026-05-08 09:45' },
  ],
}

export const MOCK_DEPARTMENT_DOCTORS = {
  'dept-cardio': [
    { doctorId: 'doctor-liu', name: '刘医生', upHandle: 12, downSend: 18, rate: '96.2%', avgResp: 1.4, rejected: 0, transferOutRejected: 0, acceptanceRejected: 0 },
    { doctorId: 'doctor-chen-cardio', name: '陈医生', upHandle: 7, downSend: 6, rate: '92.0%', avgResp: 2.1, rejected: 1, transferOutRejected: 1, acceptanceRejected: 0 },
    { doctorId: 'doctor-sun-cardio', name: '孙医生', upHandle: 3, downSend: 4, rate: '88.5%', avgResp: 2.4, rejected: 0, transferOutRejected: 0, acceptanceRejected: 0 },
  ],
  'dept-neuro': [
    { doctorId: 'doctor-zhou-neuro', name: '周医生', upHandle: 6, downSend: 8, rate: '93.8%', avgResp: 2.0, rejected: 0, transferOutRejected: 0, acceptanceRejected: 0 },
    { doctorId: 'doctor-zhao-neuro', name: '赵医生', upHandle: 5, downSend: 4, rate: '90.5%', avgResp: 2.8, rejected: 2, transferOutRejected: 1, acceptanceRejected: 1 },
    { doctorId: 'doctor-qin-neuro', name: '秦医生', upHandle: 4, downSend: 3, rate: '86.7%', avgResp: 3.1, rejected: 0, transferOutRejected: 0, acceptanceRejected: 0 },
  ],
  'dept-general-gongxing': [
    { doctorId: 'doctor-wang', name: '王医生', upHandle: 16, downSend: 0, rate: '91.4%', avgResp: 3.1, rejected: 1, transferOutRejected: 0, acceptanceRejected: 1 },
    { doctorId: 'doctor-lihui', name: '李慧医生', upHandle: 8, downSend: 0, rate: '89.3%', avgResp: 3.5, rejected: 2, transferOutRejected: 1, acceptanceRejected: 1 },
    { doctorId: 'doctor-zhang-general', name: '张医生', upHandle: 4, downSend: 0, rate: '84.0%', avgResp: 4.2, rejected: 0, transferOutRejected: 0, acceptanceRejected: 0 },
  ],
}

export function parseRate(rate) {
  if (typeof rate === 'number') return rate
  const parsed = Number.parseFloat(String(rate || '').replace('%', ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function getCompletionRateTone(rate) {
  const value = parseRate(rate)
  if (value >= 90) return '#16a34a'
  if (value >= 80) return '#d97706'
  return '#dc2626'
}

export function sortDoctorsByCompletionRate(rows) {
  return [...rows]
    .sort((a, b) => parseRate(b.rate) - parseRate(a.rate))
    .map((row, index) => ({ ...row, rank: index + 1 }))
}

export function getDoctorRejectionPresentation(rejected) {
  const count = Number(rejected) || 0
  if (count > 0) {
    return {
      text: `⚠️ ${count}`,
      toneClass: 'text-red-500 font-semibold',
    }
  }
  return {
    text: '0',
    toneClass: 'text-gray-400',
  }
}

function appendQuery(path, query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value)
  }
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

export function buildDepartmentDetailPath(row, query) {
  return appendQuery(`/performance/department/${row.id}`, {
    startDate: query.startDate,
    endDate: query.endDate,
    orgId: query.orgId || row.orgId,
    dimension: query.dimension || 'dept',
  })
}

export function buildDoctorDetailPath(row, query) {
  return appendQuery(`/performance/doctor/${row.doctorId}`, {
    startDate: query.startDate,
    endDate: query.endDate,
    orgId: query.orgId || row.orgId,
    dimension: query.dimension || 'doctor',
  })
}

export function buildPerformanceListPath(query) {
  return appendQuery('/admin/doctor-perf', {
    startDate: query.startDate,
    endDate: query.endDate,
    orgId: query.orgId,
    dimension: query.dimension || 'dept',
  })
}

export function getInstitutionNameById(orgId) {
  return INSTITUTIONS.find(item => item.id === orgId)?.name || '全部机构'
}

function getMockDepartmentDoctors(deptId) {
  return MOCK_DEPARTMENT_DOCTORS[deptId] || []
}

function getMockDoctorReferrals({ doctorId, type, page, pageSize }) {
  const allRows = sortReferralsByCompletedAt(MOCK_DOCTOR_REFERRALS[doctorId] || [])
  const filtered = type === 'all' ? allRows : allRows.filter(row => row.type === type)
  const start = (page - 1) * pageSize
  return {
    records: filtered.slice(start, start + pageSize),
    total: filtered.length,
  }
}

export function sortReferralsByCompletedAt(rows) {
  return [...rows].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
}

function createTimeoutSignal(timeoutMs, onTimeout) {
  if (typeof AbortController === 'undefined') return {}
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
    onTimeout?.()
  }, timeoutMs)
  return { signal: controller.signal, clear: () => clearTimeout(timeoutId) }
}

export async function loadDepartmentDoctors({
  deptId,
  startDate,
  endDate,
  orgId,
  fetchImpl = fetch,
  timeoutMs = 1200,
}) {
  let timeoutId
  const timeout = createTimeoutSignal(timeoutMs)
  const params = new URLSearchParams({ startDate, endDate, orgId })

  try {
    const request = fetchImpl(`/performance/department/${deptId}/doctors?${params.toString()}`, {
      signal: timeout.signal,
    })
    const response = await Promise.race([
      request,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('department doctors request timed out')), timeoutMs)
      }),
    ])
    const contentType = response.headers?.get?.('content-type') || ''
    if (!response.ok || !contentType.includes('application/json')) {
      return getMockDepartmentDoctors(deptId)
    }

    const data = await response.json()
    return Array.isArray(data) ? data : data.doctors || []
  } catch {
    return getMockDepartmentDoctors(deptId)
  } finally {
    timeout.clear?.()
    clearTimeout(timeoutId)
  }
}

export async function loadDoctorReferrals({
  doctorId,
  startDate,
  endDate,
  orgId,
  type = 'all',
  page = 1,
  pageSize = 10,
  fetchImpl = fetch,
  timeoutMs = 1200,
}) {
  let timeoutId
  const timeout = createTimeoutSignal(timeoutMs)
  const params = new URLSearchParams({
    startDate,
    endDate,
    orgId,
    type,
    page: String(page),
    pageSize: String(pageSize),
  })

  try {
    const request = fetchImpl(`/performance/doctor/${doctorId}/referrals?${params.toString()}`, {
      signal: timeout.signal,
    })
    const response = await Promise.race([
      request,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('doctor referrals request timed out')), timeoutMs)
      }),
    ])
    const contentType = response.headers?.get?.('content-type') || ''
    if (!response.ok || !contentType.includes('application/json')) {
      return getMockDoctorReferrals({ doctorId, type, page, pageSize })
    }

    const data = await response.json()
    const records = Array.isArray(data) ? data : data.records || []
    return {
      records: sortReferralsByCompletedAt(records),
      total: Number(data.total ?? records.length),
    }
  } catch {
    return getMockDoctorReferrals({ doctorId, type, page, pageSize })
  } finally {
    timeout.clear?.()
    clearTimeout(timeoutId)
  }
}

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDepartmentDetailPath,
  buildDoctorDetailPath,
  buildPerformanceListPath,
  getCompletionRateTone,
  getDoctorRejectionPresentation,
  loadDepartmentDoctors,
  loadDoctorReferrals,
  sortReferralsByCompletedAt,
  sortDoctorsByCompletionRate,
} from './departmentPerfModel.js'

test('department detail route preserves current performance filters', () => {
  const row = { id: 'dept-cardio', orgId: 'org-county-hospital' }
  const query = {
    startDate: '2026-05-01',
    endDate: '2026-05-14',
    orgId: 'org-county-hospital',
    dimension: 'dept',
  }

  assert.equal(
    buildDepartmentDetailPath(row, query),
    '/performance/department/dept-cardio?startDate=2026-05-01&endDate=2026-05-14&orgId=org-county-hospital&dimension=dept',
  )
})

test('performance list return path keeps filters and department dimension', () => {
  assert.equal(
    buildPerformanceListPath({
      startDate: '2026-05-01',
      endDate: '2026-05-14',
      orgId: 'org-county-hospital',
      dimension: 'dept',
    }),
    '/admin/doctor-perf?startDate=2026-05-01&endDate=2026-05-14&orgId=org-county-hospital&dimension=dept',
  )
})

test('doctor detail route preserves current performance filters and doctor dimension', () => {
  const row = { doctorId: 'doctor-liu', orgId: 'org-county-hospital' }
  const query = {
    startDate: '2026-05-01',
    endDate: '2026-05-14',
    orgId: 'org-county-hospital',
    dimension: 'doctor',
  }

  assert.equal(
    buildDoctorDetailPath(row, query),
    '/performance/doctor/doctor-liu?startDate=2026-05-01&endDate=2026-05-14&orgId=org-county-hospital&dimension=doctor',
  )
})

test('completion rate tone follows green orange and red thresholds', () => {
  assert.equal(getCompletionRateTone('94.0%'), '#16a34a')
  assert.equal(getCompletionRateTone('89.3%'), '#d97706')
  assert.equal(getCompletionRateTone('79.9%'), '#dc2626')
})

test('department doctors are sorted by completion rate descending and reranked', () => {
  const rows = [
    { doctorId: 'd-low', name: '低完成率医生', rate: '81.5%' },
    { doctorId: 'd-high', name: '高完成率医生', rate: '96.2%' },
    { doctorId: 'd-mid', name: '中完成率医生', rate: '90.0%' },
  ]

  assert.deepEqual(
    sortDoctorsByCompletionRate(rows).map(row => [row.rank, row.doctorId]),
    [
      [1, 'd-high'],
      [2, 'd-mid'],
      [3, 'd-low'],
    ],
  )
})

test('doctor rejection count highlights non-zero values with warning marker', () => {
  assert.deepEqual(getDoctorRejectionPresentation(2), {
    text: '⚠️ 2',
    toneClass: 'text-red-500 font-semibold',
  })
  assert.deepEqual(getDoctorRejectionPresentation(0), {
    text: '0',
    toneClass: 'text-gray-400',
  })
})

test('department doctor loading falls back to mock data when the API request hangs', async () => {
  const hangingFetch = () => new Promise(() => {})

  const rows = await loadDepartmentDoctors({
    deptId: 'dept-cardio',
    startDate: '2026-05-01',
    endDate: '2026-05-14',
    orgId: 'all',
    fetchImpl: hangingFetch,
    timeoutMs: 1,
  })

  assert.deepEqual(rows.map(row => row.doctorId), [
    'doctor-liu',
    'doctor-chen-cardio',
    'doctor-sun-cardio',
  ])
})

test('doctor referrals are sorted by completion time descending', () => {
  const rows = [
    { id: 'old', completedAt: '2026-05-01 09:00' },
    { id: 'new', completedAt: '2026-05-03 10:00' },
    { id: 'middle', completedAt: '2026-05-02 08:00' },
  ]

  assert.deepEqual(sortReferralsByCompletedAt(rows).map(row => row.id), ['new', 'middle', 'old'])
})

test('doctor referral loading sends requested tab and pagination parameters', async () => {
  let requestedUrl = ''
  const fetchImpl = async url => {
    requestedUrl = url
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ records: [{ id: 'R001' }], total: 1 }),
    }
  }

  const result = await loadDoctorReferrals({
    doctorId: 'doctor-liu',
    startDate: '2026-05-01',
    endDate: '2026-05-14',
    orgId: 'all',
    type: 'upward',
    page: 2,
    fetchImpl,
  })

  assert.equal(
    requestedUrl,
    '/performance/doctor/doctor-liu/referrals?startDate=2026-05-01&endDate=2026-05-14&orgId=all&type=upward&page=2&pageSize=10',
  )
  assert.deepEqual(result, { records: [{ id: 'R001' }], total: 1 })
})

test('doctor referral loading falls back to mock data when API request hangs', async () => {
  const hangingFetch = () => new Promise(() => {})

  const result = await loadDoctorReferrals({
    doctorId: 'doctor-liu',
    startDate: '2026-05-01',
    endDate: '2026-05-14',
    orgId: 'all',
    type: 'all',
    page: 1,
    fetchImpl: hangingFetch,
    timeoutMs: 1,
  })

  assert.equal(result.total > 0, true)
  assert.equal(result.records.length <= 10, true)
  assert.deepEqual(result.records.map(row => row.id), ['ZZ20260403001', 'ZZ20260402002', 'ZZ20260401003'])
})

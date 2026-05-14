import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDataReportDetailUrl,
  getReportActions,
  isDataReportingReferralNo,
  loadDataReportingInstitutions,
  loadDataReportDetail,
  maskPatientId,
} from './dataReportModel.js'

test('data report actions follow report status rules', () => {
  assert.deepEqual(getReportActions('pending'), ['view'])
  assert.deepEqual(getReportActions('success'), ['view'])
  assert.deepEqual(getReportActions('failed'), ['view', 'retry'])
  assert.deepEqual(getReportActions('manual_pending'), ['view', 'manualReport'])
  assert.deepEqual(getReportActions('retrying'), ['view'])
})

test('patient id is masked with first 3 and last 4 characters preserved', () => {
  assert.equal(maskPatientId('510123198001012345'), '510***********2345')
  assert.equal(maskPatientId('123456'), '123456')
})

test('data report detail url targets referral id endpoint', () => {
  assert.equal(buildDataReportDetailUrl('ZZ20260428003'), '/data-reporting/ZZ20260428003/detail')
})

test('data reporting referral numbers use ZZ date serial format', () => {
  assert.equal(isDataReportingReferralNo('ZZ20260430001'), true)
  assert.equal(isDataReportingReferralNo('REF2026003'), false)
})

test('data report detail falls back to local mock when the API returns html', async () => {
  const fetchImpl = async () => ({
    ok: true,
    headers: { get: () => 'text/html' },
    json: async () => { throw new Error('not json') },
  })

  const detail = await loadDataReportDetail({ referralId: 'ZZ20260428003', fetchImpl })

  assert.equal(detail.referralNo, 'ZZ20260428003')
  assert.equal(detail.reportStatus, 'manual_pending')
  assert.equal(detail.patientGender, '男')
  assert.equal(detail.patientAge, 58)
  assert.equal(detail.g01Fields.fromOrgName, 'xx市人民医院')
  assert.equal(detail.g01Fields.patientIdMasked.includes('*'), true)
  assert.equal(detail.history[0].action, '手动补报')
})

test('data report detail returns local mock immediately when available', async () => {
  let requested = false
  const fetchImpl = async () => {
    requested = true
    throw new Error('should not request local mock detail')
  }

  const detail = await loadDataReportDetail({ referralId: 'ZZ20260430001', fetchImpl })

  assert.equal(requested, false)
  assert.equal(detail.referralNo, 'ZZ20260430001')
  assert.equal(detail.patientName, '张三')
})

test('data reporting institutions load from API and fall back to managed institutions', async () => {
  const apiFetch = async () => ({
    ok: true,
    headers: { get: () => 'application/json' },
    json: async () => ({ institutions: [{ id: 'a', name: '机构A' }, '机构B'] }),
  })
  const fallbackFetch = async () => ({
    ok: true,
    headers: { get: () => 'text/html' },
    json: async () => [],
  })

  assert.deepEqual(await loadDataReportingInstitutions({ fetchImpl: apiFetch }), ['机构A', '机构B'])
  assert.deepEqual(await loadDataReportingInstitutions({ fetchImpl: fallbackFetch }), ['xx市拱星镇卫生院', 'xx市汉旺镇卫生院', 'xx市人民医院', 'xx市清平乡卫生院'])
})

test('data report detail normalizes pending first report time and history timestamps', async () => {
  const fetchImpl = async () => ({
    ok: true,
    headers: { get: () => 'application/json' },
    json: async () => ({
      referralNo: 'ZZ20260430099',
      patientName: '测试患者',
      type: 'upward',
      completedAt: '2026-04-30T10:54:00',
      reportStatus: 'pending',
      patientId: '510123198001012345',
      g01Fields: {
        orgCode: 'ORG-TEST',
        direction: '上转',
        fromOrg: '转出机构',
        toOrg: '转入机构',
        icd10: 'I10.x00',
        completedAt: '2026-04-30T10:54:00',
        firstReportedAt: '',
      },
      history: [
        { timestamp: '2026-04-30T11:03:00', action: '系统自动触发', status: 'pending' },
        { timestamp: '2026-04-30T11:10:00', action: '第 1 次重试', status: 'failed', responseCode: 'E500', responseMessage: '失败' },
      ],
    }),
  })

  const detail = await loadDataReportDetail({ referralId: 'ZZ20260430099', fetchImpl })

  assert.equal(detail.g01Fields.firstReportedAt, '待上报')
  assert.equal(detail.g01Fields.completedAt, '2026-04-30 10:54')
  assert.deepEqual(detail.history.map(item => item.timestamp), ['2026-04-30 11:10', '2026-04-30 11:03'])
})

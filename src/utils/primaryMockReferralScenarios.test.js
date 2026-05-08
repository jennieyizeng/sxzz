import test from 'node:test'
import assert from 'node:assert/strict'

import { MOCK_REFERRALS_INIT, UPWARD_STATUS } from '../data/mockData.js'
import { buildKeyReferralOperationLogs } from './referralOperationLogDisplay.js'

const PRIMARY_SCENARIO_IDS = [
  'REF2026001',
  'REF2026028',
  'REF2026002',
  'REF2026003',
]

function findReferral(id) {
  const referral = MOCK_REFERRALS_INIT.find(item => item.id === id)
  assert.ok(referral, `${id} should exist`)
  return referral
}

function keyActions(id) {
  return buildKeyReferralOperationLogs(findReferral(id)).map(log => log.action)
}

test('primary doctor mock referrals expose four clear upward scenarios', () => {
  const scenarios = PRIMARY_SCENARIO_IDS.map(findReferral)

  assert.deepEqual(
    scenarios.map(item => ({
      id: item.id,
      fromDoctor: item.fromDoctor,
      type: item.type,
      status: item.status,
      isEmergency: Boolean(item.is_emergency),
      referralType: item.referral_type,
      admissionType: item.admissionType,
    })),
    [
      {
        id: 'REF2026001',
        fromDoctor: '王医生',
        type: 'upward',
        status: UPWARD_STATUS.IN_TRANSIT,
        isEmergency: true,
        referralType: 'emergency',
        admissionType: 'emergency',
      },
      {
        id: 'REF2026028',
        fromDoctor: '王医生',
        type: 'upward',
        status: UPWARD_STATUS.COMPLETED,
        isEmergency: true,
        referralType: 'emergency',
        admissionType: 'emergency',
      },
      {
        id: 'REF2026002',
        fromDoctor: '王医生',
        type: 'upward',
        status: UPWARD_STATUS.IN_TRANSIT,
        isEmergency: false,
        referralType: 'normal',
        admissionType: 'outpatient',
      },
      {
        id: 'REF2026003',
        fromDoctor: '王医生',
        type: 'upward',
        status: UPWARD_STATUS.COMPLETED,
        isEmergency: false,
        referralType: 'normal',
        admissionType: 'outpatient',
      },
    ],
  )
})

test('primary doctor completed ordinary mock does not include treatment result data', () => {
  const completedOutpatient = findReferral('REF2026003')

  assert.equal(Object.hasOwn(completedOutpatient, 'treatmentResult'), false)
  assert.equal(JSON.stringify(completedOutpatient).includes('诊治摘要'), false)
  assert.equal(JSON.stringify(completedOutpatient).includes('出院日期'), false)
})

test('primary doctor visible mock referrals do not expose implementation markers', () => {
  const primaryVisiblePayload = JSON.stringify(
    MOCK_REFERRALS_INIT.filter(item => item.type === 'upward' && item.fromDoctor === '王医生'),
  )

  assert.equal(primaryVisiblePayload.includes('CHG-'), false)
  assert.equal(primaryVisiblePayload.includes('isRetroEntry=true'), false)
  assert.equal(primaryVisiblePayload.includes('提交字段记录'), false)
  assert.equal(primaryVisiblePayload.includes('补录模式提交'), false)
})

test('primary doctor mock key logs include full business actions for each scenario', () => {
  assert.deepEqual(keyActions('REF2026001'), [
    '提交急诊上转申请',
    '修改急诊目标信息',
    '拨打电话',
  ])

  assert.deepEqual(keyActions('REF2026028'), [
    '提交急诊上转申请',
    '拨打电话',
    '补录急诊接诊信息',
    '完成接诊确认',
    '健康通数据上报成功',
  ])

  assert.deepEqual(keyActions('REF2026002'), [
    '提交上转申请',
    '院内审核通过',
    '受理上转申请',
    '填写接诊安排',
  ])

  assert.deepEqual(keyActions('REF2026003'), [
    '提交上转申请',
    '院内审核通过',
    '受理上转申请',
    '填写接诊安排',
    '完成接诊确认',
    '健康通数据上报成功',
  ])
})

test('completed ordinary mock shows transfer admin as completion actor without clinical note', () => {
  const logs = buildKeyReferralOperationLogs(findReferral('REF2026003'))
  const completionLog = logs.find(log => log.action === '完成接诊确认')

  assert.ok(completionLog)
  assert.equal(completionLog.actor, '赵管理员')
  assert.equal(completionLog.note, '')
})

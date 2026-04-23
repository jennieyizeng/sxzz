import test from 'node:test'
import assert from 'node:assert/strict'

import { MOCK_REFERRALS_INIT } from '../data/mockData.js'
import { getReferralClosureEvents } from './referralClosureEvents.js'

function findReferral(id) {
  return MOCK_REFERRALS_INIT.find(item => item.id === id)
}

test('builds five key events for a completed normal upward referral', () => {
  const events = getReferralClosureEvents(findReferral('REF2026003'))

  assert.equal(events.length, 5)
  assert.deepEqual(events.map(item => item.label), [
    '发起转诊',
    '转诊受理',
    '到院/接诊',
    '完成诊疗',
    '闭环完成',
  ])
  assert.deepEqual(events.map(item => item.state), [
    'done',
    'done',
    'done',
    'done',
    'done',
  ])
  assert.equal(events[1].time, findReferral('REF2026003').logs[1].time)
  assert.equal(events[4].time, findReferral('REF2026003').completedAt)
})

test('builds emergency closure events from notification and supplement data', () => {
  const events = getReferralClosureEvents(findReferral('REF2026007'))

  assert.equal(events.length, 5)
  assert.deepEqual(events.map(item => item.label), [
    '发起绿通转诊',
    '已通知并进入接诊准备',
    '到院/接诊',
    '急诊处置完成',
    '闭环完成',
  ])
  assert.deepEqual(events.map(item => item.state), [
    'done',
    'done',
    'done',
    'active',
    'future',
  ])
  assert.equal(events[2].time, findReferral('REF2026007').admissionArrangement.arrangedAt)
})

test('builds downward closure events with followup completion', () => {
  const events = getReferralClosureEvents(findReferral('REF2026019'))

  assert.equal(events.length, 5)
  assert.deepEqual(events.map(item => item.label), [
    '发起下转',
    '下转接收',
    '患者转入基层',
    '接收完成',
    '闭环完成',
  ])
  assert.deepEqual(events.map(item => item.state), [
    'done',
    'done',
    'done',
    'done',
    'done',
  ])
  assert.equal(events[4].note.includes('FU2026002'), true)
})

test('marks the current node as terminal for rejected referrals', () => {
  const events = getReferralClosureEvents(findReferral('REF2026004'))

  assert.deepEqual(events.map(item => item.state), [
    'done',
    'terminal',
    'future',
    'future',
    'future',
  ])
  assert.equal(events[1].note, findReferral('REF2026004').rejectReason)
})

test('uses updatedAt as a visible timestamp for active upward events', () => {
  const referral = findReferral('REF2026012')
  const events = getReferralClosureEvents(referral)

  assert.deepEqual(events.map(item => item.state), [
    'done',
    'active',
    'future',
    'future',
    'future',
  ])
  assert.equal(events[1].time, referral.updatedAt)
})

test('uses updatedAt as a visible timestamp for active downward events', () => {
  const referral = findReferral('REF2026017')
  const events = getReferralClosureEvents(referral)

  assert.deepEqual(events.map(item => item.state), [
    'done',
    'active',
    'future',
    'future',
    'future',
  ])
  assert.equal(events[1].time, referral.updatedAt)
})

test('marks downward institution return as a terminal closure event', () => {
  const referral = findReferral('REF2026021')
  const events = getReferralClosureEvents(referral)

  assert.deepEqual(events.map(item => item.state), [
    'done',
    'done',
    'terminal',
    'future',
    'future',
  ])
  assert.equal(events[2].note, '当前无对应接收能力')
})

test('does not mark downward closure complete immediately after coordinator self-accepts', () => {
  const referral = {
    ...findReferral('REF2026017'),
    status: '转诊中',
    coordinatorActionAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-04-20T10:00:00.000Z',
    logs: [
      ...(findReferral('REF2026017').logs || []),
      { time: '2026-04-20T10:00:00.000Z', actor: '赵负责人', action: 'COORDINATOR_SELF_ACCEPT', note: '基层转诊负责人本人直接接收' },
      { time: '2026-04-20T10:00:00.000Z', actor: '系统', action: '自动创建随访任务' },
    ],
  }

  const events = getReferralClosureEvents(referral)

  assert.deepEqual(events.map(item => item.state), [
    'done',
    'done',
    'active',
    'future',
    'future',
  ])
})

import test from 'node:test'
import assert from 'node:assert/strict'

import { buildClinicalPackage } from './clinicalPackage.js'

test('downgrades normal upward referrals to attachment only mode', () => {
  const pkg = buildClinicalPackage({
    type: 'upward',
    referral_type: 'normal',
    patient: { name: '王阿姨' },
    diagnosis: { code: 'I10', name: '高血压' },
    chiefComplaint: '血压控制不佳，伴头晕',
    structuredData: {
      title: '结构化临床资料',
      sections: [{ title: '诊断信息', items: [{ label: '主要诊断', value: '高血压' }] }],
    },
    attachments: [{ name: '检验报告.pdf', size: '0.8MB' }],
  })

  assert.equal(pkg.displayMode, 'attachment_only')
  assert.equal(pkg.structuredData, null)
  assert.equal(pkg.attachments.length, 1)
})

test('builds structured package for downward referrals with rehab plan', () => {
  const pkg = buildClinicalPackage({
    type: 'downward',
    referral_type: 'normal',
    diagnosis: { code: 'I63.9', name: '脑梗死' },
    chiefComplaint: '急性期治疗完成，转基层继续康复管理',
    stayDays: 12,
    rehabPlan: {
      medications: [{ name: '阿司匹林', spec: '100mg', usage: '每日1次' }],
      notes: '观察血压变化',
      followupDate: '2026-04-16',
      indicators: ['血压'],
    },
    attachments: [],
  })

  assert.equal(pkg.displayMode, 'structured')
  assert.equal(pkg.structuredData?.title, '病历数据包')
  assert.equal(pkg.rehabPlan?.title, '转诊方案')
  assert.equal(pkg.rehabPlan?.medications.length, 1)
})

test('downgrades emergency referrals to attachment only mode', () => {
  const pkg = buildClinicalPackage({
    type: 'upward',
    referral_type: 'green_channel',
    is_emergency: true,
    patient: { name: '张三' },
    diagnosis: { code: 'I21.9', name: '急性心肌梗死' },
    chiefComplaint: '突发胸痛2小时',
    reason: '需紧急处理',
    consciousnessStatus: '清醒',
    attachments: [{ name: '院前心电图.jpg', size: '0.3MB' }],
  })

  assert.equal(pkg.displayMode, 'attachment_only')
  assert.equal(pkg.summary.title, '急诊转诊资料')
  assert.equal(pkg.structuredData, null)
  assert.equal(pkg.rehabPlan, null)
  assert.equal(pkg.attachments.length, 1)
})

test('keeps old data readable when only attachments exist', () => {
  const pkg = buildClinicalPackage({
    type: 'upward',
    referral_type: 'normal',
    patient: { name: '李四' },
    attachments: [{ name: '补充材料.pdf', size: '0.5MB' }],
  })

  assert.equal(pkg.displayMode, 'attachment_only')
  assert.equal(pkg.structuredData, null)
  assert.equal(pkg.attachments.length, 1)
})

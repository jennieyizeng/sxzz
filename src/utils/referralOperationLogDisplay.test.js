import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildKeyReferralOperationLogs,
  formatReferralLogAction,
  formatReferralLogNote,
} from './referralOperationLogDisplay.js'

function actions(logs) {
  return logs.map(log => log.action)
}

test('filters ordinary upward detail logs to key business actions', () => {
  const logs = buildKeyReferralOperationLogs({
    type: 'upward',
    is_emergency: false,
    logs: [
      { time: '2026-05-01T08:00:00.000Z', actor: '王医生', action: '提交上转申请（xx市拱星镇卫生院·全科未启用院内审核，直接进入待受理）' },
      { time: '2026-05-01T08:00:01.000Z', actor: '系统', action: '通知推送至县级接诊科室' },
      { time: '2026-05-01T08:10:00.000Z', actor: '赵医生', action: '接收转诊申请，承接方式：门诊就诊' },
      { time: '2026-05-01T08:10:01.000Z', actor: '系统', action: '生成电子转诊单 ZZ20260501001' },
      { time: '2026-05-01T08:20:00.000Z', actor: '赵管理员', action: '安排到院信息：心血管科，就诊时间：2026/5/2 09:00' },
      { time: '2026-05-01T08:20:01.000Z', actor: '系统', action: '生成预约取号码：ZP8831，有效期48小时，已通知基层医生转告患者' },
      { time: '2026-05-01T09:00:00.000Z', actor: '系统', action: '健康通数据上报成功' },
    ],
  })

  assert.deepEqual(actions(logs), [
    '提交上转申请',
    '受理上转申请',
    '填写接诊安排',
    '健康通数据上报成功',
  ])
  assert.equal(JSON.stringify(logs).includes('生成电子转诊单'), false)
  assert.equal(JSON.stringify(logs).includes('通知基层医生'), false)
  assert.equal(JSON.stringify(logs).includes('预约'), false)
})

test('filters emergency realtime logs and normalizes patient contact wording', () => {
  const logs = buildKeyReferralOperationLogs({
    type: 'upward',
    is_emergency: true,
    referral_type: 'green_channel',
    logs: [
      { time: '2026-05-01T08:00:00.000Z', actor: '王医生', action: '提交急诊上转申请（跳过院内审核，直接进入转诊中）' },
      { time: '2026-05-01T08:00:01.000Z', actor: '系统', action: '急诊转诊：已自动通知转诊中心、急诊科值班及胸痛中心负责人，并向患者发送首条就诊短信' },
      { time: '2026-05-01T08:10:00.000Z', actor: '王医生', action: '紧急修改转诊信息', note: '修改目标医院：xx市人民医院；接诊入口固定为急诊科；联动专科：心血管科' },
      { time: '2026-05-01T08:11:00.000Z', actor: '王医生', action: '拨打患者电话', note: '转诊单号：EM20260501001；患者电话：13800000000' },
      { time: '2026-05-01T08:12:00.000Z', actor: '王医生', action: '确认已联系患者', note: '已联系患者/家属，已告知最新就诊地点' },
      { time: '2026-05-01T08:20:00.000Z', actor: '赵管理员', action: '补录急诊接诊信息：急诊科，就诊时间：2026/5/1 08:25', note: '患者到院：2026/05/01 08:22；承接方式：emergency' },
      { time: '2026-05-01T08:30:00.000Z', actor: '赵管理员', action: '完成接诊确认（转诊中心）' },
      { time: '2026-05-01T08:30:01.000Z', actor: '系统', action: '预约码已核销（转诊完成）' },
    ],
  })

  assert.deepEqual(actions(logs), [
    '提交绿色通道上转申请',
    '修改急诊目标信息',
    '拨打电话',
    '确认已电话通知患者',
    '补录急诊接诊信息',
    '完成接诊确认',
  ])
  assert.equal(JSON.stringify(logs).includes('急诊转诊：已自动通知'), false)
  assert.equal(JSON.stringify(logs).includes('预约码'), false)
})

test('normalizes retro emergency logs and removes CHG technical entries', () => {
  const logs = buildKeyReferralOperationLogs({
    type: 'upward',
    is_emergency: true,
    isRetroEntry: true,
    logs: [
      {
        time: '2026-05-01T08:00:00.000Z',
        actor: '王医生',
        action: 'CHG-41：提交字段记录：isRetroEntry=true',
        note: '补录操作人=王医生；患者到院时间=2026/05/01 07:30',
      },
      { time: '2026-05-01T08:00:01.000Z', actor: '王医生', action: '提交急诊补录申请，直接进入转诊中' },
      { time: '2026-05-01T08:00:02.000Z', actor: '系统', action: 'CHG-41：补录模式提交，不触发实时通知、不发送患者短信、不进入紧急修改窗口' },
      {
        time: '2026-05-01T09:00:00.000Z',
        actor: '赵管理员',
        action: 'CHG-41：完成补录并确认：急诊科，就诊时间：2026/5/1 08:40',
        note: 'isRetroEntry=true；患者到院=2026/05/01 07:30；承接方式=emergency',
      },
    ],
  })

  assert.deepEqual(actions(logs), [
    '补录急诊上转申请',
    '提交急诊补录申请',
    '完成补录并确认接诊',
  ])
  assert.equal(logs[0].note, '录入方式：事后补录；患者到院时间：2026/05/01 07:30')
  assert.equal(logs[2].note, '实际接诊科室：急诊科；实际承接方式：急诊处置；实际就诊时间：2026/05/01 08:40')
  assert.equal(JSON.stringify(logs).includes('CHG-'), false)
  assert.equal(JSON.stringify(logs).includes('isRetroEntry'), false)
  assert.equal(JSON.stringify(logs).includes('字段记录'), false)
})

test('filters downward detail logs to key transfer and follow-up actions', () => {
  const logs = buildKeyReferralOperationLogs({
    type: 'downward',
    logs: [
      { time: '2026-05-01T08:00:00.000Z', actor: '赵医生', action: '上传已签署知情同意书' },
      { time: '2026-05-01T08:00:01.000Z', actor: '赵医生', action: '发起下转申请，已附康复方案', note: '接收方式：指定医生（王医生）' },
      { time: '2026-05-01T08:00:02.000Z', actor: '系统', action: '定向推送至王医生，基层转诊负责人同步知情' },
      { time: '2026-05-01T08:30:00.000Z', actor: '王医生', action: '确认接收下转申请，患者转入转诊中' },
      { time: '2026-05-01T09:00:00.000Z', actor: '王医生', action: '完成患者接收确认' },
      { time: '2026-05-01T09:00:01.000Z', actor: '系统', action: '自动创建随访任务' },
      { time: '2026-05-01T09:00:02.000Z', actor: '系统', action: '触发四川健康通数据上报' },
    ],
  })

  assert.deepEqual(actions(logs), [
    '提交下转申请',
    '确认接收下转患者',
    '完成患者到达确认',
    '创建随访任务',
  ])
  assert.equal(JSON.stringify(logs).includes('定向推送'), false)
  assert.equal(JSON.stringify(logs).includes('知情同意'), false)
  assert.equal(JSON.stringify(logs).includes('健康通数据上报'), false)
})

test('formatters hide technical CHG notes in detail display', () => {
  assert.equal(formatReferralLogAction('CHG-41：提交字段记录：isRetroEntry=true'), '补录急诊上转申请')
  assert.equal(formatReferralLogNote('isRetroEntry=true；患者到院=2026/05/01 07:30'), '')
})

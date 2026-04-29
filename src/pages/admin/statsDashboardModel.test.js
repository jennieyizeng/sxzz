import assert from 'node:assert/strict'
import test from 'node:test'
import {
  coreMetrics,
  diagnosisTabs,
  greenChannelDistribution,
  keyDiseaseRowsByTab,
  keyDiseaseTabs,
  monitoringCards,
  problemSections,
  qualityMetrics,
  timeoutStageDistribution,
  timeRangeOptions,
} from './statsDashboardModel.js'

const forbiddenCopy = ['上转', '下转', '上转/下转比', '累计上转', '累计下转', '转出申请数', '转回接收数']

test('statistics dashboard model exposes the required monitoring and analysis structure', () => {
  assert.deepEqual(timeRangeOptions, ['本周', '本月', '上月', '本季度', '本年度'])

  assert.deepEqual(
    monitoringCards.map(card => card.title),
    ['当前待接收判断', '当前待接诊安排', '急诊/绿通待补录', '当前异常预警'],
  )

  assert.deepEqual(
    coreMetrics.map(metric => metric.label),
    ['转诊申请总量', '综合完成率', '平均闭环时长', '转诊流向结构'],
  )

  assert.deepEqual(
    qualityMetrics.map(metric => metric.label),
    ['平均响应时长', '平均接收时长', '超时率', '急诊/绿通 4h 告警数'],
  )

  assert.deepEqual(
    problemSections,
    [
      '成员机构运行对照',
      '超时环节分布',
      '接收科室拒绝 Top 5',
      '高频转诊诊断 Top 10',
      '绿通病种触发分布',
      '重点管理病种监测',
    ],
  )

  assert.deepEqual(
    timeoutStageDistribution.map(item => item.name),
    ['待内审超时', '待受理超时', '接诊安排超时', '接诊确认超时', '转回接收超时'],
  )
  assert.deepEqual(diagnosisTabs, ['全部', '基层→县级', '县级→基层'])
  assert.deepEqual(
    greenChannelDistribution.map(item => item.name),
    ['胸痛中心', '卒中中心', '创伤中心', '危重孕产妇救治中心', '危重儿童和新生儿救治中心', '其他'],
  )
  assert.deepEqual(keyDiseaseTabs, ['慢病管理', '分级诊疗重点病种', '临床路径病种'])
  assert.deepEqual(
    Object.keys(keyDiseaseRowsByTab),
    ['慢病管理', '分级诊疗重点病种', '临床路径病种'],
  )
})

test('statistics dashboard copy avoids old direction wording', () => {
  const serialized = JSON.stringify({
    coreMetrics,
    diagnosisTabs,
    greenChannelDistribution,
    keyDiseaseRowsByTab,
    keyDiseaseTabs,
    monitoringCards,
    problemSections,
    qualityMetrics,
    timeoutStageDistribution,
  })

  for (const copy of forbiddenCopy) {
    assert.equal(serialized.includes(copy), false, `found forbidden copy: ${copy}`)
  }
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  institutionDetailColumns,
  institutionDetailIntro,
  institutionDetailRows,
  monthlyTrend,
  monthlyTrendSubtitle,
  periodMetrics,
  realtimeMonitoringCards,
  timeRangeOptions,
} from './directorAnalyticsModel.js'

const analyticsSource = fs.readFileSync(new URL('./Analytics.jsx', import.meta.url), 'utf8')

test('director analytics model exposes merged realtime and period analysis structure', () => {
  assert.deepEqual(timeRangeOptions, ['本周', '本月', '上月', '本季度', '本年度'])

  assert.deepEqual(
    realtimeMonitoringCards.map(card => card.title),
    ['当前待受理转入', '当前待接收转出', '急诊/绿通', '当前异常预警'],
  )

  assert.deepEqual(
    periodMetrics.map(metric => metric.label),
    ['转入', '转出', '综合完成率', '拒绝率', '平均响应时长', '平均接收时长'],
  )

  const rejectMetric = periodMetrics.find(metric => metric.label === '拒绝率')
  assert.equal(rejectMetric.sub.includes('转入拒绝率'), true)
  assert.equal(rejectMetric.sub.includes('转出拒绝率'), true)

  const emergencyMetric = realtimeMonitoringCards.find(card => card.title === '急诊/绿通')
  assert.equal(emergencyMetric.description, '当前急诊/绿通转入数')

  const warningMetric = realtimeMonitoringCards.find(card => card.title === '当前异常预警')
  assert.equal(warningMetric.description, '超时督办中需关注的异常事项')
})

test('director analytics model uses inbound and outbound wording for trend and institution details', () => {
  assert.equal(monthlyTrendSubtitle, '近6个月转入/转出量对比')
  assert.equal(monthlyTrend.every(row => 'inbound' in row && 'outbound' in row), true)

  const serialized = JSON.stringify({
    institutionDetailColumns,
    institutionDetailIntro,
    monthlyTrend,
    monthlyTrendSubtitle,
    periodMetrics,
    realtimeMonitoringCards,
  })
  assert.equal(serialized.includes('上转'), false)
  assert.equal(serialized.includes('下转'), false)

  assert.equal(institutionDetailIntro, '转入本机构/本机构转出的数据')
  assert.deepEqual(
    institutionDetailColumns.map(column => column.label),
    [
      '机构名称',
      '转诊至本机构数',
      '转诊至本机构完成数',
      '平均响应时长',
      '发起申请被拒数',
      '本机构转出数',
      '平均接收时长',
      '发起申请被拒数',
    ],
  )
  assert.equal(institutionDetailRows.every(row => row.type === '基层机构'), true)
})

test('director analytics page applies requested visual-only refinements', () => {
  assert.equal(analyticsSource.includes('useApp'), false)
  assert.equal(analyticsSource.includes('currentUser'), false)
  assert.equal(analyticsSource.includes('bg-white min-h-full'), true)
  assert.equal(analyticsSource.includes('sm:grid-cols-3 xl:grid-cols-6'), true)
  assert.equal(analyticsSource.includes('rounded-lg p-3'), true)
  assert.equal(analyticsSource.includes('{row.inbound}'), true)
  assert.equal(analyticsSource.includes('{row.outbound}'), true)
})

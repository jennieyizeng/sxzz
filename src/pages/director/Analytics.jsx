import { useState } from 'react'

// ── Mock 数据（内联）──
// Assumption: 数据来自本院转诊汇总，与 admin/Stats.jsx 口径一致，由后端按机构过滤返回
const STATS = {
  upTotal: 67,
  downTotal: 88,
  completeRate: 91.0,
  rejectRate: 8.0,
  timeoutRate: 4.5,
  avgTime: 2.9,
  consentRate: 98.5,
  reportRate: 96.3,
}

const MONTHLY = [
  { month: '2025-10', up: 18, down: 22 },
  { month: '2025-11', up: 22, down: 25 },
  { month: '2025-12', up: 20, down: 28 },
  { month: '2026-01', up: 25, down: 30 },
  { month: '2026-02', up: 19, down: 24 },
  { month: '2026-03', up: 67, down: 88 },
]

const MAX_VAL = 100

// ── 指标卡片配置 ──
const METRIC_CARDS = [
  { label: '上转总量', value: STATS.upTotal, unit: '例', color: '#2563eb', bg: '#eff6ff' },
  { label: '下转总量', value: STATS.downTotal, unit: '例', color: '#16a34a', bg: '#f0fdf4' },
  { label: '完成率', value: STATS.completeRate.toFixed(1), unit: '%', color: '#0BBECF', bg: '#E0F6F9' },
  { label: '拒绝率', value: STATS.rejectRate.toFixed(1), unit: '%', color: '#d97706', bg: '#fffbeb' },
  { label: '超时率', value: STATS.timeoutRate.toFixed(1), unit: '%', color: '#dc2626', bg: '#fef2f2' },
  { label: '平均完成时长', value: STATS.avgTime.toFixed(1), unit: 'h', color: '#7c3aed', bg: '#f5f3ff' },
  { label: '知情同意签署率', value: STATS.consentRate.toFixed(1), unit: '%', color: '#0891b2', bg: '#ecfeff' },
  { label: '数据上报完成率', value: STATS.reportRate.toFixed(1), unit: '%', color: '#065f46', bg: '#ecfdf5' },
]

// ── 横向进度条组件 ──
function BarRow({ label, upVal, downVal, maxVal }) {
  const upPct = Math.round((upVal / maxVal) * 100)
  const downPct = Math.round((downVal / maxVal) * 100)
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-20 text-right text-gray-500 text-xs shrink-0">{label}</div>
      <div className="flex-1 space-y-1">
        {/* 上转 */}
        <div className="flex items-center gap-2">
          <div className="w-8 text-xs text-blue-600 text-right shrink-0">{upVal}</div>
          <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-[#0BBECF] transition-all"
              style={{ width: `${upPct}%` }}
            />
          </div>
          <div className="w-6 text-xs text-gray-400 shrink-0">上转</div>
        </div>
        {/* 下转 */}
        <div className="flex items-center gap-2">
          <div className="w-8 text-xs text-green-600 text-right shrink-0">{downVal}</div>
          <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-green-500 transition-all"
              style={{ width: `${downPct}%` }}
            />
          </div>
          <div className="w-6 text-xs text-gray-400 shrink-0">下转</div>
        </div>
      </div>
    </div>
  )
}

export default function DirectorAnalytics() {
  // 院长仅允许时间范围筛选，无机构/类型筛选
  const [dateFrom, setDateFrom] = useState('2025-10')
  const [dateTo, setDateTo] = useState('2026-03')
  const [queried, setQueried] = useState(true) // 默认展示最新数据

  const handleQuery = () => {
    // TODO: 接入真实统计接口，按时间范围过滤本院数据
    setQueried(true)
  }

  return (
    <div className="p-5">
      {/* 页头 */}
      <div className="mb-4">
        {/* 上下文标识 */}
        <div className="text-xs text-gray-400 mb-1">绵竹市人民医院</div>
        <h2 className="text-base font-semibold text-gray-800">统计分析</h2>
        <div className="text-xs text-gray-400 mt-0.5">绵竹市人民医院 · 转诊数据概览</div>
      </div>

      {/* 筛选区 — 院长仅时间范围，无机构/类型筛选 */}
      <div className="bg-white rounded-xl p-4 mb-4 flex flex-wrap items-end gap-4" style={{ border: '1px solid #DDF0F3' }}>
        <div>
          <label className="block text-xs text-gray-500 mb-1">统计起始月份</label>
          <input
            type="month"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setQueried(false) }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">统计截止月份</label>
          <input
            type="month"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setQueried(false) }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none"
          />
        </div>
        <button
          onClick={handleQuery}
          className="px-6 py-1.5 rounded-lg text-sm font-medium text-white h-8"
          style={{ background: '#0BBECF' }}
        >
          查询
        </button>
        {/* 只读说明：院长无机构/类型筛选权限 */}
        <div className="text-xs text-gray-400 ml-2">
          {/* Assumption: 院长只查看本院数据，无跨机构筛选入口 */}
          仅显示本院数据
        </div>
      </div>

      {queried && (
        <>
          {/* 指标卡片 2行4列 */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {METRIC_CARDS.map(m => (
              <div
                key={m.label}
                className="rounded-xl p-4"
                style={{ background: m.bg, border: `1px solid ${m.bg}` }}
              >
                <div className="text-2xl font-bold" style={{ color: m.color }}>
                  {m.value}
                  <span className="text-sm font-normal ml-1" style={{ color: m.color, opacity: 0.7 }}>{m.unit}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{m.label}</div>
              </div>
            ))}
          </div>

          {/* 近6个月趋势图（横向进度条组代替图表库） */}
          <div className="bg-white rounded-xl overflow-hidden mb-4" style={{ border: '1px solid #DDF0F3' }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
              <div className="text-sm font-semibold text-gray-800">近6个月转诊量趋势</div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-[#0BBECF]" />
                  上转
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                  下转
                </span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {MONTHLY.map(row => (
                <BarRow
                  key={row.month}
                  label={row.month}
                  upVal={row.up}
                  downVal={row.down}
                  maxVal={MAX_VAL}
                />
              ))}
            </div>
          </div>

          {/* 只读说明文字 */}
          <div className="text-xs text-gray-400 text-right">
            数据每日凌晨更新 &middot; {/* TODO: 接入实时数据接口 */}
            <span className="text-orange-400">TODO: 接入实时数据接口</span>
          </div>
        </>
      )}

      {!queried && (
        <div className="bg-white rounded-xl py-14 text-center" style={{ border: '1px solid #DDF0F3' }}>
          <div className="text-gray-300 text-4xl mb-3">📊</div>
          <div className="text-gray-400 text-sm">请选择统计时间范围后点击「查询」</div>
        </div>
      )}
    </div>
  )
}

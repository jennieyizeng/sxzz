import { useMemo, useState } from 'react'
import {
  institutionDetailColumns,
  institutionDetailIntro,
  institutionDetailRows,
  monthlyTrend,
  monthlyTrendSubtitle,
  monthlyTrendTitle,
  periodMetrics,
  realtimeMonitoringCards,
  timeRangeOptions,
} from './directorAnalyticsModel'

const CARD_BORDER = '1px solid #DDF0F3'
const CARD_HEADER = { background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-3 text-sm whitespace-nowrap'

const toneStyles = {
  cyan: { bg: '#F0FBFC', border: '#B2EEF5', text: '#0892a0' },
  blue: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
  amber: { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
  red: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
  green: { bg: '#ecfdf5', border: '#bbf7d0', text: '#047857' },
  violet: { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {description && <div className="text-xs text-gray-400 mt-1 leading-relaxed">{description}</div>}
      </div>
      {action}
    </div>
  )
}

function MonitoringCard({ card }) {
  const style = toneStyles[card.tone] || toneStyles.cyan
  return (
    <div className="rounded-xl p-4" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
      <div className="text-sm font-semibold text-gray-800">{card.title}</div>
      <div className="text-3xl font-bold mt-3" style={{ color: style.text }}>
        {card.value}<span className="text-sm font-normal ml-1 text-gray-500">{card.unit}</span>
      </div>
      <div className="text-xs text-gray-500 mt-3 leading-relaxed">{card.description}</div>
    </div>
  )
}

function MetricCard({ metric, tone }) {
  const style = toneStyles[tone] || toneStyles.cyan
  return (
    <div className="bg-white rounded-lg p-3 min-h-[112px]" style={{ border: CARD_BORDER }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-xs font-medium text-gray-500">{metric.label}</div>
        {metric.trend && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: style.bg, color: style.text }}>
            {metric.trend}
          </span>
        )}
      </div>
      <div className="text-xl font-bold" style={{ color: style.text }}>
        {metric.value}
        {metric.unit && <span className="text-sm font-normal ml-1 text-gray-400">{metric.unit}</span>}
      </div>
      {metric.sub && <div className="text-[11px] text-gray-400 mt-2 leading-relaxed">{metric.sub}</div>}
    </div>
  )
}

function TimeRangeFilter({ value, onChange, updatedAt }) {
  return (
    <div className="bg-white rounded-xl px-4 py-3 mb-4 flex flex-wrap items-end justify-between gap-4" style={{ border: CARD_BORDER }}>
      <div>
        <label className="block text-xs text-gray-500 mb-1">时间范围</label>
        <div className="flex flex-wrap border border-gray-200 rounded-lg overflow-hidden">
          {timeRangeOptions.map(option => (
            <button
              key={option}
              onClick={() => onChange(option)}
              className="px-3 py-1.5 text-sm transition-colors"
              style={value === option
                ? { background: '#0BBECF', color: '#fff', fontWeight: 500 }
                : { background: '#fff', color: '#6b7280' }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="text-xs text-gray-500">
        数据更新于 <span className="font-semibold" style={{ color: '#0892a0' }}>{updatedAt}</span>
      </div>
    </div>
  )
}

function TrendChart({ data }) {
  const maxVal = Math.max(...data.map(row => row.inbound + row.outbound), 1)
  return (
    <div className="flex items-end gap-2" style={{ height: 120 }}>
      {data.map((row, index) => {
        const isLast = index === data.length - 1
        const inboundHeight = Math.max((row.inbound / maxVal) * 100, 5)
        const outboundHeight = Math.max((row.outbound / maxVal) * 100, 5)
        return (
          <div key={row.month} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end gap-1" style={{ height: 104 }}>
              <div className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: 104 }}>
                <span className="text-[11px] font-semibold text-gray-500">{row.inbound}</span>
                <div className="w-full" style={{ height: inboundHeight, background: isLast ? '#0BBECF' : '#B2EEF5', borderRadius: '3px 3px 0 0' }} />
              </div>
              <div className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: 104 }}>
                <span className="text-[11px] font-semibold text-gray-500">{row.outbound}</span>
                <div className="w-full" style={{ height: outboundHeight, background: isLast ? '#10b981' : '#A7F3D0', borderRadius: '3px 3px 0 0' }} />
              </div>
            </div>
            <div className="text-xs text-gray-400 whitespace-nowrap">{row.month}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function DirectorAnalytics() {
  const [timeRange, setTimeRange] = useState('本月')
  const updatedAt = useMemo(() => {
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }, [])

  return (
    <div className="p-3 sm:p-5 bg-white min-h-full">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-800">统计分析</h2>
      </div>

      <section className="mb-5">
        <SectionHeader title="实时运行监测" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {realtimeMonitoringCards.map(card => (
            <MonitoringCard key={card.title} card={card} />
          ))}
        </div>
      </section>

      <section className="mb-5">
        <SectionHeader title="周期成效分析" />
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} updatedAt={updatedAt} />
        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {periodMetrics.map((metric, index) => (
            <MetricCard
              key={metric.label}
              metric={metric}
              tone={index === 2 ? 'green' : index === 3 ? 'red' : index === 4 ? 'blue' : index === 5 ? 'violet' : 'cyan'}
            />
          ))}
        </div>
      </section>

      <section className="mb-5">
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: CARD_BORDER }}>
          <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3" style={CARD_HEADER}>
            <div>
              <div className="text-sm font-semibold text-gray-800">{monthlyTrendTitle}</div>
              <div className="text-xs text-gray-400 mt-0.5">{monthlyTrendSubtitle}</div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm" style={{ background: '#0BBECF' }} />
                转入
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm" style={{ background: '#10b981' }} />
                转出
              </span>
            </div>
          </div>
          <div className="p-5">
            <TrendChart data={monthlyTrend} />
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="转诊机构明细" description={institutionDetailIntro} />
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: CARD_BORDER }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 1040 }}>
              <thead>
                <tr style={{ background: '#E0F6F9' }}>
                  {institutionDetailColumns.map(column => (
                    <th key={column.key} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {institutionDetailRows.map((row, index) => (
                  <tr key={row.name} style={{ borderBottom: '1px solid #EEF7F9', background: index % 2 === 0 ? '#fff' : '#FAFEFE' }}>
                    {institutionDetailColumns.map(column => (
                      <td
                        key={column.key}
                        className={`${TD} ${column.key === 'name' ? 'font-medium text-gray-800' : column.key.includes('Rejected') ? 'text-red-500 text-center' : 'text-gray-700 text-center'}`}
                      >
                        {row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}

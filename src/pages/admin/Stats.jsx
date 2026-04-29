import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  coreMetrics,
  diagnosisRowsByTab,
  diagnosisTabs,
  greenChannelDistribution,
  institutionRows,
  keyDiseaseRowsByTab,
  keyDiseaseTabs,
  monitoringCards,
  qualityMetrics,
  receivingDeptRejectTop,
  timeoutStageDistribution,
  timeRangeOptions,
} from './statsDashboardModel'

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'
const CARD_BORDER = '1px solid #DDF0F3'
const CARD_HEADER = { background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }

const toneStyles = {
  cyan: { bg: '#E0F6F9', border: '#B2EEF5', text: '#0892a0', soft: '#F0FBFC' },
  blue: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', soft: '#f8fbff' },
  amber: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', soft: '#fffaf0' },
  red: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', soft: '#fff7f7' },
  green: { bg: '#ecfdf5', border: '#bbf7d0', text: '#047857', soft: '#f6fef9' },
  violet: { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', soft: '#fbfaff' },
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {action}
    </div>
  )
}

function TrendBadge({ trend, tone, label }) {
  const style = tone === 'flat'
    ? { background: '#f3f4f6', color: '#6b7280' }
    : tone === 'downGood'
      ? { background: '#ecfdf5', color: '#047857' }
      : { background: '#ecfdf5', color: '#047857' }

  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={style}>
      {label} {trend}
    </span>
  )
}

function MetricCard({ metric, tone = 'cyan' }) {
  const style = toneStyles[tone] || toneStyles.cyan
  return (
    <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #DDF0F3' }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="text-xs font-medium text-gray-500">{metric.label}</div>
        {metric.trend && <TrendBadge trend={metric.trend} tone={metric.trendTone} label={metric.trendLabel || '较上周期'} />}
      </div>
      <div className="text-2xl font-bold" style={{ color: style.text }}>
        {metric.value}
        {metric.unit && <span className="text-sm font-normal ml-1 text-gray-400">{metric.unit}</span>}
      </div>
      {metric.sub && <div className="text-xs text-gray-400 mt-2 leading-relaxed">{metric.sub}</div>}
    </div>
  )
}

function MonitoringCard({ card, onClick }) {
  const style = toneStyles[card.tone] || toneStyles.cyan
  return (
    <button
      onClick={onClick}
      title={card.hoverDescription || card.description || card.title}
      className="text-left rounded-xl p-4 transition-all hover:-translate-y-0.5"
      style={{ background: style.soft, border: `1px solid ${style.border}`, boxShadow: '0 1px 4px rgba(11,190,207,0.08)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-800">{card.title}</div>
        </div>
      </div>
      <div className="text-3xl font-bold mt-3" style={{ color: style.text }}>
        {card.value}<span className="text-sm font-normal ml-1 text-gray-500">{card.unit}</span>
      </div>
      <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${style.border}` }}>
        <span className="text-xs font-medium" style={{ color: style.text }}>{card.actionLabel} →</span>
      </div>
    </button>
  )
}

function MiniDistribution({ data, note }) {
  const max = Math.max(...data.map(item => item.value), 1)
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-3">
      {data.map(item => (
        <div key={item.name}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">{item.name}</span>
            <span className="font-semibold text-gray-800">
              {item.value} 例
              <span className="ml-2 font-normal text-gray-400">{total > 0 ? Math.round(item.value / total * 100) : 0}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E0F6F9' }}>
            <div style={{ width: `${(item.value / max) * 100}%`, height: '100%', background: '#0BBECF', borderRadius: 999 }} />
          </div>
        </div>
      ))}
      {note && <div className="pt-1 text-xs leading-relaxed text-gray-400">{note}</div>}
    </div>
  )
}

function HorizontalBarList({ data, unit = '例', note }) {
  const max = Math.max(...data.map(item => item.value), 1)
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.name}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">{item.name}</span>
            <span className="font-semibold text-gray-800">
              {item.value} {unit}
              <span className="ml-2 font-normal text-gray-400">{total > 0 ? Math.round(item.value / total * 100) : 0}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E0F6F9' }}>
            <div style={{ width: `${(item.value / max) * 100}%`, height: '100%', background: index < 2 ? '#0BBECF' : '#67dfe9', borderRadius: 999 }} />
          </div>
        </div>
      ))}
      {note && <div className="pt-1 text-xs leading-relaxed text-gray-400">{note}</div>}
    </div>
  )
}

function RejectDistribution({ data }) {
  const max = Math.max(...data.map(item => item.rejected), 1)

  return (
    <div className="divide-y" style={{ borderColor: '#EEF7F9' }}>
      {data.map((row, index) => (
        <div key={`${row.institution}-${row.dept}`} className="py-3 first:pt-0 last:pb-0">
          <div className="grid grid-cols-[28px_minmax(0,1fr)_72px] items-start gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold text-white" style={{ background: index < 3 ? '#0BBECF' : '#94a3b8' }}>
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-gray-800">{row.dept}</span>
                <span className="text-xs text-gray-400">{row.institution}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500 leading-relaxed">主要原因：{row.reason}</div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold" style={{ color: '#0892a0' }}>{row.rejected} 次</div>
              <div className="text-xs text-gray-400">{row.rate}</div>
            </div>
          </div>
          <div className="ml-10 mt-2 h-2 rounded-full overflow-hidden" style={{ background: '#E0F6F9' }}>
            <div style={{ width: `${(row.rejected / max) * 100}%`, height: '100%', background: index < 3 ? '#0BBECF' : '#67dfe9', borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CompactDiagnosisTable({ rows, tab }) {
  return (
    <table className="w-full table-fixed" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#E0F6F9' }}>
          <th className="w-14 px-3 py-2.5 text-left text-xs font-medium" style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>排名</th>
          <th className="w-24 px-3 py-2.5 text-left text-xs font-medium" style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>ICD-10</th>
          <th className="px-3 py-2.5 text-left text-xs font-medium" style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>诊断名称</th>
          <th className="w-20 px-3 py-2.5 text-center text-xs font-medium" style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>数量</th>
          <th className="w-20 px-3 py-2.5 text-center text-xs font-medium" style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>占比</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${tab}-${row.code}`} style={{ borderBottom: '1px solid #EEF7F9', background: index % 2 === 0 ? '#fff' : '#FAFEFE' }}>
            <td className="px-3 py-2.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold text-white" style={{ background: index < 3 ? '#0BBECF' : '#9ca3af' }}>{row.rank}</span>
            </td>
            <td className="px-3 py-2.5 text-xs text-gray-500 break-all">{row.code}</td>
            <td className="px-3 py-2.5 text-sm font-medium text-gray-800 leading-snug">{row.name}</td>
            <td className="px-3 py-2.5 text-center font-semibold" style={{ color: '#0892a0' }}>{row.count}</td>
            <td className="px-3 py-2.5 text-center text-xs text-gray-600">{row.pct}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ModuleLegend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
      {items.map(item => (
        <span key={item.label} className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

export default function AdminStats() {
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState('本月')
  const [diagnosisTab, setDiagnosisTab] = useState('全部')
  const [keyDiseaseTab, setKeyDiseaseTab] = useState('慢病管理')
  const updatedAt = useMemo(() => {
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }, [])
  const comparisonLabel = timeRange === '本月' ? '较上月' : '较上周期'
  const diagnosisRows = diagnosisRowsByTab[diagnosisTab] || diagnosisRowsByTab['全部']
  const keyDiseaseRows = keyDiseaseRowsByTab[keyDiseaseTab] || keyDiseaseRowsByTab['慢病管理']

  return (
    <div className="p-3 sm:p-5">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-800">统计看板</h2>
      </div>

      <div className="bg-white rounded-xl px-4 py-3 mb-4 flex flex-wrap items-end justify-between gap-4" style={{ border: CARD_BORDER }}>
        <div>
          <label className="block text-xs text-gray-500 mb-1">时间范围</label>
          <div className="flex flex-wrap border border-gray-200 rounded-lg overflow-hidden">
            {timeRangeOptions.map(option => (
              <button
                key={option}
                onClick={() => setTimeRange(option)}
                className="px-3 py-1.5 text-sm transition-colors"
                style={timeRange === option
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

      <section className="mb-5">
        <SectionHeader
          title="实时运行监测"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {monitoringCards.map(card => (
            <MonitoringCard key={card.title} card={card} onClick={() => navigate(card.route)} />
          ))}
        </div>
      </section>

      <section className="mb-5">
        <SectionHeader
          title="周期成效分析"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          {coreMetrics.map((metric, index) => (
            <MetricCard
              key={metric.label}
              metric={{ ...metric, trend: metric.trend, trendLabel: comparisonLabel }}
              tone={index === 1 ? 'green' : index === 2 ? 'violet' : 'cyan'}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {qualityMetrics.map((metric, index) => (
            <MetricCard key={metric.label} metric={metric} tone={index === 2 ? 'red' : index === 3 ? 'amber' : 'blue'} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title="运行问题定位"
        />

        <div className="bg-white rounded-xl overflow-hidden mb-4" style={{ border: CARD_BORDER }}>
          <div className="px-5 py-3 flex items-center justify-between" style={CARD_HEADER}>
            <div>
              <div className="text-sm font-semibold text-gray-800">成员机构运行对照</div>
            </div>
            <button onClick={() => navigate('/admin/ledger')} className="text-xs" style={{ color: '#0BBECF' }}>查看台账 →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 980 }}>
              <thead>
                <tr style={{ background: '#E0F6F9' }}>
                  {['机构名称', '机构类型', '转诊流入数', '转诊流出数', '发起申请被拒数', '接收申请拒绝数', '完成率', '平均闭环时长', '异常数'].map(h => (
                    <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {institutionRows.map((row, index) => (
                  <tr key={row.name} style={{ borderBottom: '1px solid #EEF7F9', background: index % 2 === 0 ? '#fff' : '#FAFEFE' }}>
                    <td className={TD + ' font-medium text-gray-800'}>{row.name}</td>
                    <td className={TD}><span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{row.type}</span></td>
                    <td className={TD + ' text-center'}>{row.inflow}</td>
                    <td className={TD + ' text-center'}>{row.outflow}</td>
                    <td className={TD + ' text-center text-red-500'}>{row.initiatedRejected}</td>
                    <td className={TD + ' text-center text-orange-600'}>{row.receivedRejected}</td>
                    <td className={TD + ' text-center font-semibold text-green-700'}>{row.completionRate}</td>
                    <td className={TD + ' text-center text-xs text-gray-600'}>{row.avgClosureHours}</td>
                    <td className={TD + ' text-center'}><span className="text-xs font-semibold text-red-500">{row.anomalies}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          <div className="lg:col-span-2 bg-white rounded-xl overflow-hidden h-full" style={{ border: CARD_BORDER }}>
            <div className="px-5 py-3 flex flex-wrap items-start justify-between gap-3 min-h-[74px]" style={CARD_HEADER}>
              <div className="text-sm font-semibold text-gray-800">超时环节分布</div>
              <ModuleLegend items={[{ label: '超时单数', color: '#0BBECF' }, { label: '占比', color: '#94a3b8' }]} />
            </div>
            <div className="p-4 sm:p-5">
              <HorizontalBarList
                data={timeoutStageDistribution}
                note="按本期发生超时的转诊单归属环节统计，同一转诊单多环节超时时按最新待处理环节归类。"
              />
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-xl overflow-hidden self-start h-full" style={{ border: CARD_BORDER }}>
            <div className="px-5 py-3 flex flex-wrap items-start justify-between gap-3 min-h-[74px]" style={CARD_HEADER}>
              <div className="text-sm font-semibold text-gray-800">接收科室拒绝 Top 5</div>
              <ModuleLegend items={[{ label: '拒绝数', color: '#0BBECF' }, { label: '拒绝率', color: '#94a3b8' }]} />
            </div>
            <div className="p-4 sm:p-5 min-h-[244px]">
              <RejectDistribution data={receivingDeptRejectTop} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl overflow-hidden h-full mb-4" style={{ border: CARD_BORDER }}>
            <div className="px-4 sm:px-5 py-3 flex flex-wrap items-start justify-between gap-3 min-h-[74px]" style={CARD_HEADER}>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-800">高频转诊诊断 Top 10</div>
                <div className="text-xs text-gray-400 mt-1 leading-relaxed">诊断来源于发起医生填写或病历数据提取，统计结果仅作管理分析参考。</div>
              </div>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                {diagnosisTabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDiagnosisTab(tab)}
                    className="px-3 py-1.5 text-xs transition-colors"
                    style={diagnosisTab === tab
                      ? { background: '#0BBECF', color: '#fff', fontWeight: 500 }
                      : { background: '#fff', color: '#6b7280' }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <CompactDiagnosisTable rows={diagnosisRows} tab={diagnosisTab} />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl overflow-hidden h-full" style={{ border: CARD_BORDER }}>
            <div className="px-5 py-3 flex flex-wrap items-start justify-between gap-3 min-h-[74px]" style={CARD_HEADER}>
              <div className="text-sm font-semibold text-gray-800">绿通病种触发分布</div>
              <ModuleLegend items={[{ label: '转诊单数', color: '#0BBECF' }, { label: '占比', color: '#94a3b8' }]} />
            </div>
            <div className="p-4 sm:p-5 min-h-[360px]">
              <MiniDistribution
                data={greenChannelDistribution}
                note="仅统计实际启用绿色通道的转诊单，按所属中心归类。"
              />
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-xl overflow-hidden self-start h-full" style={{ border: CARD_BORDER }}>
            <div className="px-4 sm:px-5 py-3 flex flex-wrap items-start justify-between gap-3 min-h-[74px]" style={CARD_HEADER}>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-800">重点管理病种监测</div>
              </div>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                {keyDiseaseTabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setKeyDiseaseTab(tab)}
                    className="px-3 py-1.5 text-xs transition-colors"
                    style={keyDiseaseTab === tab
                      ? { background: '#0BBECF', color: '#fff', fontWeight: 500 }
                      : { background: '#fff', color: '#6b7280' }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr style={{ background: '#E0F6F9' }}>
                    {['病种', 'ICD', '转诊数量', '占比'].map(h => (
                      <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keyDiseaseRows.map((row, index) => (
                    <tr key={`${keyDiseaseTab}-${row.icd}`} style={{ borderBottom: '1px solid #EEF7F9', background: index % 2 === 0 ? '#fff' : '#FAFEFE' }}>
                      <td className={TD + ' font-medium text-gray-800'}>{row.disease}</td>
                      <td className={TD + ' text-xs text-gray-500'}>{row.icd}</td>
                      <td className={TD + ' text-center font-semibold'} style={{ color: '#0892a0' }}>{row.count}</td>
                      <td className={TD + ' text-center text-xs text-gray-600'}>{row.pct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

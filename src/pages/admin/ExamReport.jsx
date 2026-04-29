import { useState } from 'react'

const MOCK_EXAM = [
  { name: 'xx市人民医院', type: '县级医院', upSend: 0, downRecv: 45, completed: 42, rate: '93.3%', avgResp: 2.1, timeout: 1, rejected: 2 },
  { name: 'xx市拱星镇卫生院', type: '乡镇卫生院', upSend: 28, downRecv: 18, completed: 41, rate: '89.1%', avgResp: 3.5, timeout: 3, rejected: 4 },
  { name: 'xx市汉旺镇卫生院', type: '乡镇卫生院', upSend: 19, downRecv: 12, completed: 28, rate: '90.3%', avgResp: 2.8, timeout: 2, rejected: 3 },
  { name: 'xx市清平乡卫生院', type: '乡镇卫生院', upSend: 12, downRecv: 8, completed: 18, rate: '90.0%', avgResp: 3.2, timeout: 1, rejected: 2 },
  { name: 'xx市九龙镇卫生院', type: '乡镇卫生院', upSend: 8, downRecv: 5, completed: 12, rate: '92.3%', avgResp: 2.9, timeout: 1, rejected: 1 },
]

// 汇总行
const SUMMARY = {
  name: '合计',
  type: '—',
  upSend: MOCK_EXAM.reduce((s, r) => s + r.upSend, 0),
  downRecv: MOCK_EXAM.reduce((s, r) => s + r.downRecv, 0),
  completed: MOCK_EXAM.reduce((s, r) => s + r.completed, 0),
  rate: '91.0%', // Assumption: 综合完成率预设
  avgResp: (MOCK_EXAM.reduce((s, r) => s + r.avgResp, 0) / MOCK_EXAM.length).toFixed(1),
  timeout: MOCK_EXAM.reduce((s, r) => s + r.timeout, 0),
  rejected: MOCK_EXAM.reduce((s, r) => s + r.rejected, 0),
}

const PERIODS = ['月度', '季度', '年度']
const MONTHS = ['2026-01', '2026-02', '2026-03']
const QUARTERS = ['2026年Q1', '2026年Q2', '2025年Q4']
const YEARS = ['2026', '2025', '2024']

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

// Mock 指标汇总（根据当前筛选，此处写死，实际应由后端返回）
// Assumption: 数据来自全机构汇总，已按所选周期聚合
const METRICS = [
  { label: '基层→县级总量', value: 67, unit: '例', color: '#2563eb', bg: '#eff6ff' },
  { label: '县级→基层总量', value: 88, unit: '例', color: '#16a34a', bg: '#f0fdf4' },
  { label: '综合完成率', value: '91.0', unit: '%', color: '#0BBECF', bg: '#E0F6F9' },
  { label: '拒绝率', value: '8.0', unit: '%', color: '#d97706', bg: '#fffbeb' },
  { label: '平均响应时长', value: '2.3', unit: 'h', color: '#0284c7', bg: '#f0f9ff' },
  { label: '平均接收时长', value: '3.8', unit: 'h', color: '#0f766e', bg: '#f0fdfa' },
  { label: '基层→县级平均闭环时长', value: '18.5', unit: 'h', color: '#7c3aed', bg: '#f5f3ff' },
  { label: '县级→基层平均闭环时长', value: '22.4', unit: 'h', color: '#9333ea', bg: '#faf5ff' },
]

export default function ExamReport() {
  const [period, setPeriod] = useState('月度')
  const [month, setMonth] = useState('2026-03')
  const [quarter, setQuarter] = useState('2026年Q1')
  const [year, setYear] = useState('2026')
  const [institution, setInstitution] = useState('all')
  const [generated, setGenerated] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleGenerate = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setGenerated(true)
    }, 600)
  }

  const handleExportExcel = () => alert('已开始导出 Excel，请稍后查看下载结果。')
  const handleExportPDF = () => alert('已开始导出 PDF，请稍后查看下载结果。')
  const handlePrint = () => window.print()

  const periodLabel = period === '月度' ? month : period === '季度' ? quarter : year

  return (
    <div className="p-5">
      {/* 页头 */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">考核报表</h2>
        <div className="text-xs text-gray-400 mt-0.5">卫健委转诊考核数据汇总 · 支持导出</div>
      </div>

      {/* 筛选区 */}
      <div className="bg-white rounded-xl p-4 mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex flex-wrap gap-4 items-end">
          {/* 统计周期 Tab */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">统计周期</label>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setGenerated(false) }}
                  className="px-4 py-1.5 text-sm transition-colors"
                  style={period === p
                    ? { background: '#0BBECF', color: '#fff', fontWeight: 500 }
                    : { background: '#fff', color: '#6b7280' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 动态时间选择 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {period === '月度' ? '月份' : period === '季度' ? '季度' : '年份'}
            </label>
            {period === '月度' && (
              <input
                type="month"
                value={month}
                onChange={e => { setMonth(e.target.value); setGenerated(false) }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none"
              />
            )}
            {period === '季度' && (
              <select
                value={quarter}
                onChange={e => { setQuarter(e.target.value); setGenerated(false) }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none bg-white"
              >
                {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            )}
            {period === '年度' && (
              <select
                value={year}
                onChange={e => { setYear(e.target.value); setGenerated(false) }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none bg-white"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
            )}
          </div>

          {/* 机构范围 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">机构范围</label>
            <select
              value={institution}
              onChange={e => { setInstitution(e.target.value); setGenerated(false) }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none bg-white w-52"
            >
              <option value="all">全部机构</option>
              {MOCK_EXAM.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-1.5 rounded-lg text-sm font-medium text-white h-8 flex items-center gap-1.5 disabled:opacity-60"
            style={{ background: '#0BBECF' }}
          >
            {loading ? '生成中...' : '生成报表'}
          </button>
        </div>

        {generated && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            <span className="text-xs text-green-600">
              已生成：{period}报表 · {periodLabel} ·{institution === 'all' ? '全部机构' : institution}
            </span>
          </div>
        )}
      </div>

      {/* 未生成报表提示 */}
      {!generated && !loading && (
        <div className="bg-white rounded-xl py-16 text-center" style={{ border: '1px solid #DDF0F3' }}>
          <div className="text-gray-300 text-5xl mb-3">📑</div>
          <div className="text-gray-400 text-sm">请选择统计周期和机构范围后，点击「生成报表」</div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl py-16 text-center" style={{ border: '1px solid #DDF0F3' }}>
          <div className="text-gray-300 text-5xl mb-3 animate-pulse">📊</div>
          <div className="text-gray-400 text-sm">正在聚合数据...</div>
        </div>
      )}

      {/* 报表内容 */}
      {generated && (
        <>
          {/* 指标汇总卡片 2行4列 */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {METRICS.map(m => (
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

          {/* 机构明细表 */}
          <div className="bg-white rounded-xl overflow-hidden mb-4" style={{ border: '1px solid #DDF0F3' }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
              <div className="text-sm font-semibold text-gray-800">机构明细</div>
              <div className="text-xs text-gray-400">
                {institution === 'all' ? `共 ${MOCK_EXAM.length} 个机构` : institution}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 760 }}>
                <thead>
                  <tr style={{ background: '#E0F6F9' }}>
                    {['机构名称', '机构类型', '转诊流出数', '转诊流入数', '完成数', '完成率', '平均响应时长', '超时数', '发起申请被拒数'].map(h => (
                      <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_EXAM.map((row, i) => (
                    <tr
                      key={row.name}
                      style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE' }}
                    >
                      <td className={TD + ' font-medium text-gray-800'}>{row.name}</td>
                      <td className={TD}>
                        <span className={`text-xs px-2 py-0.5 rounded ${row.type === '县级医院' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {row.type}
                        </span>
                      </td>
                      <td className={TD + ' text-center'}>{row.upSend}</td>
                      <td className={TD + ' text-center'}>{row.downRecv}</td>
                      <td className={TD + ' text-center font-medium'} style={{ color: '#0892a0' }}>{row.completed}</td>
                      <td className={TD + ' text-center'}>
                        <span className="text-xs font-semibold" style={{ color: parseFloat(row.rate) >= 90 ? '#16a34a' : '#d97706' }}>
                          {row.rate}
                        </span>
                      </td>
                      <td className={TD + ' text-center text-xs'}>{row.avgResp}h</td>
                      <td className={TD + ' text-center text-xs'}>
                        <span className={row.timeout > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>{row.timeout}</span>
                      </td>
                      <td className={TD + ' text-center text-xs'}>
                        <span className={row.rejected > 0 ? 'text-red-500' : 'text-gray-400'}>{row.rejected}</span>
                      </td>
                    </tr>
                  ))}
                  {/* 合计行 */}
                  <tr style={{ background: '#F0FBFC', borderTop: '2px solid #C8EEF3' }}>
                    <td className={TD + ' font-bold text-gray-800'}>{SUMMARY.name}</td>
                    <td className={TD + ' text-gray-400 text-xs'}>{SUMMARY.type}</td>
                    <td className={TD + ' text-center font-bold'} style={{ color: '#0BBECF' }}>{SUMMARY.upSend}</td>
                    <td className={TD + ' text-center font-bold'} style={{ color: '#0BBECF' }}>{SUMMARY.downRecv}</td>
                    <td className={TD + ' text-center font-bold'} style={{ color: '#0BBECF' }}>{SUMMARY.completed}</td>
                    <td className={TD + ' text-center font-bold text-green-700'}>{SUMMARY.rate}</td>
                    <td className={TD + ' text-center text-xs font-bold'}>{SUMMARY.avgResp}h</td>
                    <td className={TD + ' text-center font-bold text-orange-600'}>{SUMMARY.timeout}</td>
                    <td className={TD + ' text-center font-bold text-red-500'}>{SUMMARY.rejected}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 底部导出操作栏 */}
          <div className="flex items-center justify-between bg-white rounded-xl px-5 py-3" style={{ border: '1px solid #DDF0F3' }}>
            <div className="text-xs text-gray-400">
              报表数据截止时间：2026-03-19 12:00
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                导出 Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                导出 PDF
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                打印
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

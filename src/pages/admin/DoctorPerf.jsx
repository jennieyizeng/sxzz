import { useState, useMemo } from 'react'

const MOCK_DEPT = [
  { rank: 1, dept: '心血管科', inst: 'xx市人民医院', upHandle: 28, downSend: 22, rate: '94.0%', avgResp: 1.8, rejected: 1 },
  { rank: 2, dept: '神经内科', inst: 'xx市人民医院', upHandle: 19, downSend: 15, rate: '91.2%', avgResp: 2.3, rejected: 2 },
  { rank: 3, dept: '全科', inst: 'xx市拱星镇卫生院', upHandle: 0, downSend: 28, rate: '89.3%', avgResp: 3.5, rejected: 3 },
]

const MOCK_DOCTOR = [
  { rank: 1, name: '刘医生', dept: '心血管科', inst: 'xx市人民医院', upHandle: 28, downSend: 22, rate: '94.0%', avgResp: 1.8 },
  { rank: 2, name: '王医生', dept: '全科', inst: 'xx市拱星镇卫生院', upHandle: 28, downSend: 0, rate: '89.3%', avgResp: 3.5 },
  { rank: 3, name: '李慧医生', dept: '全科', inst: 'xx市汉旺镇卫生院', upHandle: 19, downSend: 0, rate: '90.5%', avgResp: 2.9 },
]

const INSTITUTIONS = [
  '全部机构',
  'xx市人民医院',
  'xx市拱星镇卫生院',
  'xx市汉旺镇卫生院',
  'xx市清平乡卫生院',
  'xx市九龙镇卫生院',
]

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

// 排名标记：前3名金/银/铜
function RankBadge({ rank }) {
  if (rank === 1) return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" style={{ background: '#d97706' }}>{rank}</span>
  )
  if (rank === 2) return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" style={{ background: '#9ca3af' }}>{rank}</span>
  )
  if (rank === 3) return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" style={{ background: '#b45309' }}>{rank}</span>
  )
  return <span className="text-xs text-gray-400">{rank}</span>
}

export default function DoctorPerf() {
  const today = new Date()
  const monthAgo = new Date(today)
  monthAgo.setDate(1) // 当月1日
  const fmtDate = d => d.toISOString().slice(0, 10)

  const [filters, setFilters] = useState({
    startDate: fmtDate(monthAgo),
    endDate: fmtDate(today),
    institution: '全部机构',
  })
  const [applied, setApplied] = useState({ ...filters })
  const [dimension, setDimension] = useState('dept') // 'dept' | 'doctor'

  const handleQuery = () => setApplied({ ...filters })
  const handleReset = () => {
    const init = { startDate: fmtDate(monthAgo), endDate: fmtDate(today), institution: '全部机构' }
    setFilters(init)
    setApplied(init)
  }

  const deptData = useMemo(() => {
    if (applied.institution === '全部机构') return MOCK_DEPT
    return MOCK_DEPT.filter(d => d.inst === applied.institution)
  }, [applied.institution])

  const doctorData = useMemo(() => {
    if (applied.institution === '全部机构') return MOCK_DOCTOR
    return MOCK_DOCTOR.filter(d => d.inst === applied.institution)
  }, [applied.institution])

  const handleExport = () => alert(`已开始导出${dimension === 'dept' ? '科室' : '医生'}绩效统计 Excel，请稍后查看下载结果。`)

  return (
    <div className="p-5">
      {/* 页头 */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">绩效统计</h2>
        <div className="text-xs text-gray-400 mt-0.5">医生与科室转诊绩效分析</div>
      </div>

      {/* 筛选区 */}
      <div className="bg-white rounded-xl p-4 mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex flex-wrap gap-3 items-end">
          {/* 时间范围 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">时间范围</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm h-8 focus:outline-none"
              />
              <span className="text-gray-400 text-xs">~</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm h-8 focus:outline-none"
              />
            </div>
          </div>

          {/* 机构 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">机构</label>
            <select
              value={filters.institution}
              onChange={e => setFilters(f => ({ ...f, institution: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none bg-white w-52"
            >
              {INSTITUTIONS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className="flex items-end gap-2 ml-1">
            <button
              onClick={handleQuery}
              className="px-5 py-1.5 rounded-lg text-sm font-medium text-white h-8 flex items-center"
              style={{ background: '#0BBECF' }}
            >
              查询
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-1.5 rounded-lg text-sm border h-8 flex items-center"
              style={{ color: '#0BBECF', borderColor: '#0BBECF' }}
            >
              重置
            </button>
          </div>

          {/* 维度切换 */}
          <div className="ml-auto flex items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">统计维度</label>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                {[['dept', '科室维度'], ['doctor', '医生维度']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setDimension(val)}
                    className="px-4 py-1.5 text-sm transition-colors"
                    style={dimension === val
                      ? { background: '#0BBECF', color: '#fff', fontWeight: 500 }
                      : { background: '#fff', color: '#6b7280' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        {/* 表格标题栏 */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
          <div className="text-sm font-semibold text-gray-800">
            {dimension === 'dept' ? '科室绩效排名' : '医生绩效排名'}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {applied.startDate} ~ {applied.endDate} ·{' '}
              {applied.institution}
            </span>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              导出 Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {dimension === 'dept' ? (
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ background: '#E0F6F9' }}>
                  {['排名', '科室名称', '所在机构', '接收处理量', '发起申请量', '完成率', '平均响应时长', '拒绝数', '操作'].map(h => (
                    <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center">
                      <div className="text-gray-300 text-4xl mb-2">📊</div>
                      <div className="text-gray-400 text-sm">暂无科室绩效数据</div>
                    </td>
                  </tr>
                ) : deptData.map((row, i) => (
                  <tr
                    key={row.dept}
                    style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE' }}
                  >
                    <td className={TD}><RankBadge rank={row.rank} /></td>
                    <td className={TD + ' font-medium text-gray-800'}>{row.dept}</td>
                    <td className={TD + ' text-xs text-gray-500'}>{row.inst}</td>
                    <td className={TD + ' text-center'}>{row.upHandle}</td>
                    <td className={TD + ' text-center'}>{row.downSend}</td>
                    <td className={TD + ' text-center'}>
                      <span className="text-xs font-semibold" style={{ color: parseFloat(row.rate) >= 90 ? '#16a34a' : '#d97706' }}>
                        {row.rate}
                      </span>
                    </td>
                    <td className={TD + ' text-center text-xs'}>{row.avgResp}h</td>
                    <td className={TD + ' text-center text-xs'}>
                      <span className={row.rejected > 0 ? 'text-red-500' : 'text-gray-400'}>{row.rejected}</span>
                    </td>
                    <td className={TD}>
                      <button
                        onClick={() => alert(`查看科室详情：${row.dept}（${row.inst}）`)}
                        className="text-sm font-medium hover:underline"
                        style={{ color: '#0BBECF' }}
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 820 }}>
              <thead>
                <tr style={{ background: '#E0F6F9' }}>
                  {['排名', '医生姓名', '所在科室', '所在机构', '发起申请量', '完成接收量', '完成率', '平均响应时长(h)', '操作'].map(h => (
                    <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doctorData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center">
                      <div className="text-gray-300 text-4xl mb-2">👨‍⚕️</div>
                      <div className="text-gray-400 text-sm">暂无医生绩效数据</div>
                    </td>
                  </tr>
                ) : doctorData.map((row, i) => (
                  <tr
                    key={row.name}
                    style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE' }}
                  >
                    <td className={TD}><RankBadge rank={row.rank} /></td>
                    <td className={TD + ' font-medium text-gray-800'}>{row.name}</td>
                    <td className={TD + ' text-xs text-gray-500'}>{row.dept}</td>
                    <td className={TD + ' text-xs text-gray-500'}>{row.inst}</td>
                    <td className={TD + ' text-center'}>{row.upHandle}</td>
                    <td className={TD + ' text-center'}>{row.downSend}</td>
                    <td className={TD + ' text-center'}>
                      <span className="text-xs font-semibold" style={{ color: parseFloat(row.rate) >= 90 ? '#16a34a' : '#d97706' }}>
                        {row.rate}
                      </span>
                    </td>
                    <td className={TD + ' text-center text-xs'}>{row.avgResp}</td>
                    <td className={TD}>
                      <button
                        onClick={() => alert(`查看医生详情：${row.name}（${row.dept} · ${row.inst}）`)}
                        className="text-sm font-medium hover:underline"
                        style={{ color: '#0BBECF' }}
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 底部说明栏 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <span className="text-xs text-gray-400">
            共 <strong className="text-gray-700">{dimension === 'dept' ? deptData.length : doctorData.length}</strong> 条记录 ·
            排名按完成率降序
          </span>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            导出 Excel
          </button>
        </div>
      </div>

      {/* 说明提示 */}
      <div className="mt-3 px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
        绩效排名结果仅供管理员查阅，不对医生本人公开。
      </div>
    </div>
  )
}

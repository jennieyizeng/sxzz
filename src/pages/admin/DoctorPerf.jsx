import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  INSTITUTIONS,
  MOCK_DEPT,
  MOCK_DOCTOR,
  buildDepartmentDetailPath,
  buildDoctorDetailPath,
  buildPerformanceListPath,
  getCompletionRateTone,
  getDoctorRejectionPresentation,
} from './departmentPerfModel'

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

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
  monthAgo.setDate(1)
  const fmtDate = d => d.toISOString().slice(0, 10)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialFilters = {
    startDate: searchParams.get('startDate') || fmtDate(monthAgo),
    endDate: searchParams.get('endDate') || fmtDate(today),
    orgId: searchParams.get('orgId') || 'all',
  }
  const [filters, setFilters] = useState(initialFilters)
  const [applied, setApplied] = useState(initialFilters)
  const [dimension, setDimension] = useState(searchParams.get('dimension') === 'doctor' ? 'doctor' : 'dept')

  const syncQuery = next => {
    setSearchParams({
      startDate: next.startDate,
      endDate: next.endDate,
      orgId: next.orgId,
      dimension: next.dimension,
    }, { replace: true })
  }

  const handleQuery = () => {
    const next = { ...filters }
    setApplied(next)
    syncQuery({ ...next, dimension })
  }

  const handleReset = () => {
    const init = { startDate: fmtDate(monthAgo), endDate: fmtDate(today), orgId: 'all' }
    setFilters(init)
    setApplied(init)
    syncQuery({ ...init, dimension })
  }

  const handleDimensionChange = value => {
    setDimension(value)
    syncQuery({ ...applied, dimension: value })
  }

  const deptData = useMemo(() => {
    if (applied.orgId === 'all') return MOCK_DEPT
    return MOCK_DEPT.filter(d => d.orgId === applied.orgId)
  }, [applied.orgId])

  const doctorData = useMemo(() => {
    if (applied.orgId === 'all') return MOCK_DOCTOR
    return MOCK_DOCTOR.filter(d => d.orgId === applied.orgId)
  }, [applied.orgId])

  const handleExport = () => alert(`已开始导出${dimension === 'dept' ? '科室' : '医生'}绩效统计 Excel，请稍后查看下载结果。`)

  const currentQuery = { ...applied, dimension }

  const openDepartmentDetail = row => {
    const detailPath = buildDepartmentDetailPath(row, currentQuery)
    navigate(detailPath, {
      state: { department: row, returnTo: buildPerformanceListPath(currentQuery) },
    })
  }

  const openDoctorDetail = row => {
    const detailPath = buildDoctorDetailPath(row, { ...currentQuery, dimension: 'doctor' })
    navigate(detailPath, {
      state: { doctor: row, returnTo: buildPerformanceListPath({ ...currentQuery, dimension: 'doctor' }) },
    })
  }

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">绩效统计</h2>
        <div className="text-xs text-gray-400 mt-0.5">医生与科室转诊绩效分析</div>
      </div>

      <div className="bg-white rounded-xl p-4 mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex flex-wrap gap-3 items-end">
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

          <div>
            <label className="block text-xs text-gray-500 mb-1">机构</label>
            <select
              value={filters.orgId}
              onChange={e => setFilters(f => ({ ...f, orgId: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none bg-white w-52"
            >
              {INSTITUTIONS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
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

          <div className="ml-auto flex items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">统计维度</label>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                {[['dept', '科室维度'], ['doctor', '医生维度']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => handleDimensionChange(val)}
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

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
          <div className="text-sm font-semibold text-gray-800">
            {dimension === 'dept' ? '科室绩效排名' : '医生绩效排名'}
          </div>
          <div className="flex items-center gap-3">
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
                  {['排名', '科室名称', '所在机构', '接收处理量', '发起申请量', '受理完成率', '平均响应时长', '拒绝数', '操作'].map(h => (
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
                    key={row.id}
                    style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE' }}
                  >
                    <td className={TD}><RankBadge rank={row.rank} /></td>
                    <td className={TD + ' font-medium text-gray-800'}>{row.dept}</td>
                    <td className={TD + ' text-xs text-gray-500'}>{row.inst}</td>
                    <td className={TD + ' text-center'}>{row.upHandle}</td>
                    <td className={TD + ' text-center'}>{row.downSend}</td>
                    <td className={TD + ' text-center'}>
                      <span className="text-xs font-semibold" style={{ color: getCompletionRateTone(row.rate) }}>
                        {row.rate}
                      </span>
                    </td>
                    <td className={TD + ' text-center text-xs'}>{row.avgResp}h</td>
                    <td className={TD + ' text-center text-xs'}>
                      <span className={row.rejected > 0 ? 'text-red-500' : 'text-gray-400'}>{row.rejected}</span>
                    </td>
                    <td className={TD}>
                      <button
                        onClick={() => openDepartmentDetail(row)}
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
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#E0F6F9' }}>
                  {['排名', '医生姓名', '所在科室', '所在机构', '发起申请量', '完成接收量', '受理完成率', '平均响应时长(h)', '拒绝数', '操作'].map(h => (
                    <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doctorData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center">
                      <div className="text-gray-300 text-4xl mb-2">👨‍⚕️</div>
                      <div className="text-gray-400 text-sm">暂无医生绩效数据</div>
                    </td>
                  </tr>
                ) : doctorData.map((row, i) => {
                  const rejected = getDoctorRejectionPresentation(row.rejected)
                  return (
                    <tr
                      key={row.doctorId}
                      style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE' }}
                    >
                      <td className={TD}><RankBadge rank={row.rank} /></td>
                      <td className={TD + ' font-medium text-gray-800'}>{row.name}</td>
                      <td className={TD + ' text-xs text-gray-500'}>{row.dept}</td>
                      <td className={TD + ' text-xs text-gray-500'}>{row.inst}</td>
                      <td className={TD + ' text-center'}>{row.upHandle}</td>
                      <td className={TD + ' text-center'}>{row.downSend}</td>
                      <td className={TD + ' text-center'}>
                        <span className="text-xs font-semibold" style={{ color: getCompletionRateTone(row.rate) }}>
                          {row.rate}
                        </span>
                      </td>
                      <td className={TD + ' text-center text-xs'}>{row.avgResp}</td>
                      <td className={TD + ' text-center text-xs'}>
                        <span className={rejected.toneClass}>{rejected.text}</span>
                      </td>
                      <td className={TD}>
                        <button
                          onClick={() => openDoctorDetail(row)}
                          className="text-sm font-medium hover:underline"
                          style={{ color: '#0BBECF' }}
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center px-4 py-3" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <span className="text-xs text-gray-400">
            共 <strong className="text-gray-700">{dimension === 'dept' ? deptData.length : doctorData.length}</strong> 条记录 ·
            排名按受理完成率降序
          </span>
        </div>
      </div>

      <div className="mt-3 px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
        绩效排名结果仅供管理员查阅，不对医生本人公开。
      </div>
    </div>
  )
}

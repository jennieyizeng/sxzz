import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  MOCK_DEPT,
  buildDoctorDetailPath,
  buildPerformanceListPath,
  getDoctorRejectionPresentation,
  loadDepartmentDoctors,
  sortDoctorsByCompletionRate,
} from './departmentPerfModel'

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

export function MetricCard({ label, value, unit, color = '#0BBECF', bg = '#E0F6F9' }) {
  return (
    <div className="rounded-xl p-4" style={{ background: bg, border: '1px solid #DDF0F3', boxShadow: '0 1px 4px rgba(11,190,207,0.08)' }}>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold" style={{ color }}>
        {value}<span className="ml-1 text-sm font-normal text-gray-500">{unit}</span>
      </div>
    </div>
  )
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" style={{ background: '#d97706' }}>{rank}</span>
  if (rank === 2) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" style={{ background: '#9ca3af' }}>{rank}</span>
  if (rank === 3) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" style={{ background: '#b45309' }}>{rank}</span>
  return <span className="text-xs text-gray-400">{rank}</span>
}

function getSplitRejectionCount(row, key) {
  if (key === 'transferOutRejected') return row.transferOutRejected ?? row.outReject ?? 0
  return row.acceptanceRejected ?? row.acceptReject ?? row.rejected ?? 0
}

export default function DepartmentPerfDetail() {
  const { deptId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const orgId = searchParams.get('orgId') || ''
  const [rawDoctors, setRawDoctors] = useState([])
  const [loading, setLoading] = useState(true)

  const department = location.state?.department || MOCK_DEPT.find(row => row.id === deptId) || {
    id: deptId,
    dept: '未知科室',
    inst: '未知机构',
    orgId,
    upHandle: '—',
    downSend: '—',
    rate: '—',
    avgResp: '—',
    rejected: '—',
  }

  useEffect(() => {
    let cancelled = false

    async function loadDoctors() {
      setLoading(true)
      // GET /performance/department/:deptId/doctors
      const rows = await loadDepartmentDoctors({ deptId, startDate, endDate, orgId })
      if (!cancelled) {
        setRawDoctors(rows)
        setLoading(false)
      }
    }

    loadDoctors()
    return () => {
      cancelled = true
    }
  }, [deptId, startDate, endDate, orgId])

  const doctors = useMemo(() => sortDoctorsByCompletionRate(rawDoctors), [rawDoctors])
  const returnPath = location.state?.returnTo || buildPerformanceListPath({ startDate, endDate, orgId, dimension: 'dept' })

  const handleExport = () => {
    alert(`已开始导出${department.dept}医生明细 Excel，请稍后查看下载结果。`)
  }

  const openDoctorDetail = row => {
    const doctor = {
      ...row,
      dept: row.dept || department.dept,
      inst: row.inst || department.inst,
      orgId: row.orgId || department.orgId || orgId,
    }
    const detailPath = buildDoctorDetailPath(doctor, {
      startDate,
      endDate,
      orgId,
      dimension: 'doctor',
    })
    navigate(detailPath, {
      state: {
        doctor,
        returnTo: buildPerformanceListPath({ startDate, endDate, orgId, dimension: 'doctor' }),
      },
    })
  }

  const metrics = [
    { label: '接收处理量', value: department.upHandle, unit: '例', color: '#0284c7', bg: '#f0f9ff' },
    { label: '发起申请量', value: department.downSend, unit: '例', color: '#16a34a', bg: '#f0fdf4' },
    { label: '受理完成率', value: String(department.rate).replace('%', ''), unit: '%', color: '#0BBECF', bg: '#E0F6F9' },
    { label: '平均响应时长', value: department.avgResp, unit: 'h', color: '#7c3aed', bg: '#f5f3ff' },
    { label: '拒绝数', value: department.rejected, unit: '次', color: '#dc2626', bg: '#fef2f2' },
  ]

  return (
    <div className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-400 mb-2">
            绩效统计 <span className="mx-1">/</span> {department.dept}（{department.inst}）
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(returnPath)}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              ← 返回
            </button>
            <h2 className="text-base font-semibold text-gray-800">{department.dept}医生绩效详情</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#0BBECF' }}
        >
          导出 Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        {metrics.map(metric => <MetricCard key={metric.label} {...metric} />)}
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
          <div className="text-sm font-semibold text-gray-800">科室内医生明细</div>
          <span className="text-xs text-gray-400">{startDate || '—'} ~ {endDate || '—'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['排名', '医生姓名', '发起申请量', '完成受理量', '转出拒绝数', '受理拒绝数', '平均响应时长', '操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-14 text-center text-gray-400 text-sm">正在加载医生明细...</td></tr>
              ) : doctors.length === 0 ? (
                <tr><td colSpan={8} className="py-14 text-center text-gray-400 text-sm">暂无医生绩效数据</td></tr>
              ) : doctors.map((row, index) => {
                const transferOutRejected = getDoctorRejectionPresentation(getSplitRejectionCount(row, 'transferOutRejected'))
                const acceptanceRejected = getDoctorRejectionPresentation(getSplitRejectionCount(row, 'acceptanceRejected'))
                return (
                  <tr key={row.doctorId || row.name} style={{ borderBottom: '1px solid #EEF7F9', background: index % 2 === 0 ? '#fff' : '#FAFEFE' }}>
                    <td className={TD}><RankBadge rank={row.rank} /></td>
                    <td className={TD + ' font-medium text-gray-800'}>{row.name}</td>
                    <td className={TD + ' text-center'}>{row.upHandle}</td>
                    <td className={TD + ' text-center'}>{row.downSend}</td>
                    <td className={TD + ' text-center text-xs'}>
                      <span className={transferOutRejected.toneClass}>{transferOutRejected.text}</span>
                    </td>
                    <td className={TD + ' text-center text-xs'}>
                      <span className={acceptanceRejected.toneClass}>{acceptanceRejected.text}</span>
                    </td>
                    <td className={TD + ' text-center text-xs'}>{row.avgResp}h</td>
                    <td className={TD}>
                      <button
                        type="button"
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
        </div>

        <div className="px-4 py-3 text-xs text-gray-400" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          共 {doctors.length} 名医生 · 排名按受理完成率降序
        </div>
      </div>
    </div>
  )
}

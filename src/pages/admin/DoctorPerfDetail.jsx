import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import StatusBadge from '../../components/StatusBadge'
import { MetricCard } from './DepartmentPerfDetail'
import {
  MOCK_DOCTOR,
  buildPerformanceListPath,
  getCompletionRateTone,
  loadDoctorReferrals,
} from './departmentPerfModel'

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'
const PAGE_SIZE = 10
const TABS = [
  { value: 'all', label: '全部' },
  { value: 'upward', label: '转入' },
  { value: 'downward', label: '转出' },
]

function ReferralTypeTag({ type }) {
  const isUpward = type === 'upward'
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
      style={isUpward
        ? { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }
        : { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
    >
      {isUpward ? '转入' : '转出'}
    </span>
  )
}

export default function DoctorPerfDetail() {
  const { doctorId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const orgId = searchParams.get('orgId') || ''
  const [type, setType] = useState('all')
  const [page, setPage] = useState(1)
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const doctor = location.state?.doctor || MOCK_DOCTOR.find(row => row.doctorId === doctorId) || {
    doctorId,
    name: '未知医生',
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

    async function loadRecords() {
      setLoading(true)
      // GET /performance/doctor/:doctorId/referrals
      const result = await loadDoctorReferrals({ doctorId, startDate, endDate, orgId, type, page, pageSize: PAGE_SIZE })
      if (!cancelled) {
        setRecords(result.records)
        setTotal(result.total)
        setLoading(false)
      }
    }

    loadRecords()
    return () => {
      cancelled = true
    }
  }, [doctorId, startDate, endDate, orgId, type, page])

  const returnPath = location.state?.returnTo || buildPerformanceListPath({ startDate, endDate, orgId, dimension: 'doctor' })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleExport = () => {
    alert(`已开始导出${doctor.name}转诊记录明细 Excel，请稍后查看下载结果。`)
  }

  const handleTypeChange = nextType => {
    setType(nextType)
    setPage(1)
  }

  const metrics = [
    { label: '发起申请量', value: doctor.upHandle, unit: '例', color: '#16a34a', bg: '#f0fdf4' },
    { label: '完成接收量', value: doctor.downSend, unit: '例', color: '#0284c7', bg: '#f0f9ff' },
    { label: '受理完成率', value: String(doctor.rate).replace('%', ''), unit: '%', color: getCompletionRateTone(doctor.rate), bg: '#E0F6F9' },
    { label: '平均响应时长(h)', value: doctor.avgResp, unit: 'h', color: '#7c3aed', bg: '#f5f3ff' },
    { label: '拒绝数', value: doctor.rejected, unit: '次', color: Number(doctor.rejected) > 0 ? '#dc2626' : '#6b7280', bg: Number(doctor.rejected) > 0 ? '#fef2f2' : '#f3f4f6' },
  ]

  return (
    <div className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-400 mb-2">
            绩效统计 <span className="mx-1">/</span> {doctor.name}（{doctor.dept} · {doctor.inst}）
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(returnPath)}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              ← 返回
            </button>
            <h2 className="text-base font-semibold text-gray-800">{doctor.name}绩效详情</h2>
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
          <div className="text-sm font-semibold text-gray-800">转诊记录</div>
        </div>

        <div className="px-5 py-3 flex gap-2" style={{ borderBottom: '1px solid #EEF7F9' }}>
          {TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTypeChange(tab.value)}
              className="px-4 py-1.5 rounded-lg text-sm transition-colors"
              style={type === tab.value
                ? { background: '#0BBECF', color: '#fff', fontWeight: 500 }
                : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 920 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['转诊单号', '患者信息', '转诊类型', '诊断（ICD-10）', '状态', '更新时间'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-14 text-center text-gray-400 text-sm">正在加载转诊记录...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="py-14 text-center text-gray-400 text-sm">该时间段内暂无转诊记录</td></tr>
              ) : records.map((row, index) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: '1px solid #EEF7F9', background: row.status === '已拒绝' ? '#FEF2F2' : (index % 2 === 0 ? '#fff' : '#FAFEFE') }}
                >
                  <td className={TD + ' text-xs font-mono'}>
                    <button
                      type="button"
                      onClick={() => window.open(`/referral/${row.id}`, '_blank', 'noopener,noreferrer')}
                      className="font-medium hover:underline"
                      style={{ color: '#2563eb' }}
                    >
                      {row.referralNo || row.id}
                    </button>
                  </td>
                  <td className={TD}>
                    <div className="font-medium text-gray-800">{row.patientName}</div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {[row.gender, row.age ? `${row.age}岁` : ''].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </td>
                  <td className={TD}><ReferralTypeTag type={row.type} /></td>
                  <td className={TD}>
                    <div className="text-xs font-mono text-gray-700">{row.diagnosisCode || row.icd10 || '—'}</div>
                    <div className="mt-0.5 text-xs text-gray-400">{row.diagnosisName || row.diagnosis || '—'}</div>
                  </td>
                  <td className={TD}><StatusBadge status={row.status} size="sm" /></td>
                  <td className={TD + ' text-xs text-gray-500'}>{row.updatedAt || row.completedAt || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <span className="text-xs text-gray-400">
            共 <strong className="text-gray-700">{total}</strong> 条记录，每页 {PAGE_SIZE} 条，第 {page}/{totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded text-xs border disabled:opacity-40 transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#4b5563' }}
            >
              ‹ 上一页
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="w-7 h-7 rounded text-xs transition-colors"
                style={page === p ? { background: '#0BBECF', color: '#fff' } : { color: '#4b5563', border: '1px solid #e5e7eb' }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded text-xs border disabled:opacity-40 transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#4b5563' }}
            >
              下一页 ›
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import StatusBadge from '../../components/StatusBadge'

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}
function RowNo({ n }) {
  return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>{n}</span>
}
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

function getDownwardAllocationLabel(ref) {
  const mode = ref.allocationMode || (ref.designatedDoctorId ? 'designated' : 'coordinator')
  if (mode === 'designated') return `定向指派${ref.designatedDoctorName ? ` · ${ref.designatedDoctorName}` : ''}`
  if (mode === 'coordinator_reassign') return '负责人改派中'
  if (mode === 'coordinator') return '负责人待分配'
  return '—'
}

function getProcessingLabel(ref) {
  if (ref.type === 'downward') return getDownwardAllocationLabel(ref)
  if (ref.is_emergency) return ref.referral_type === 'green_channel' ? '急诊绿通协同' : '急诊协同处理'
  return '常规上转流转'
}

export default function AdminLedger() {
  const navigate = useNavigate()
  const { referrals } = useApp()

  const [filters, setFilters] = useState({ keyword: '', type: 'all', status: 'all', institution: 'all' })
  const [applied, setApplied] = useState({ keyword: '', type: 'all', status: 'all', institution: 'all' })
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const allStatuses = ['all', '待受理', '待接收', '转诊中', '已完成', '已拒绝', '已撤销']
  const institutions = ['all', ...new Set(referrals.flatMap(r => [r.fromInstitution, r.toInstitution]).filter(Boolean))]

  const filtered = useMemo(() => {
    return referrals.filter(r => {
      if (applied.type !== 'all' && r.type !== applied.type) return false
      if (applied.status !== 'all' && !(applied.status === '待受理' ? ['待受理', '待审核'].includes(r.status) : r.status === applied.status)) return false
      if (applied.institution !== 'all' && r.fromInstitution !== applied.institution && r.toInstitution !== applied.institution) return false
      if (applied.keyword) {
        const kw = applied.keyword.toLowerCase()
        if (!r.patient.name.includes(applied.keyword) &&
            !r.id.toLowerCase().includes(kw) &&
            !(r.referralNo?.toLowerCase().includes(kw)) &&
            !r.diagnosis.name.includes(applied.keyword)) return false
      }
      return true
    }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }, [referrals, applied])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleQuery = () => { setApplied({ ...filters }); setPage(1) }
  const handleReset = () => {
    const empty = { keyword: '', type: 'all', status: 'all', institution: 'all' }
    setFilters(empty); setApplied(empty); setPage(1)
  }

  const stats = {
    pendingAccept: filtered.filter(r => ['待受理', '待审核'].includes(r.status)).length,
    pendingReceive: filtered.filter(r => r.status === '待接收').length,
    inTransit: filtered.filter(r => r.status === '转诊中').length,
    emergencyOrGreen: filtered.filter(r => r.is_emergency || r.referral_type === 'green_channel').length,
    completed: filtered.filter(r => r.status === '已完成').length,
  }

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">转诊台账</h2>
        <div className="text-xs text-gray-400 mt-0.5">覆盖上转、下转、急诊与绿通的过程台账</div>
      </div>

      {/* 概览卡 */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {[
          { label: '待受理', value: stats.pendingAccept, color: '#f59e0b' },
          { label: '待接收', value: stats.pendingReceive, color: '#f59e0b' },
          { label: '转诊中', value: stats.inTransit, color: '#0BBECF' },
          { label: '急诊/绿通', value: stats.emergencyOrGreen, color: '#ef4444' },
          { label: '已完成', value: stats.completed, color: '#10b981' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-lg px-4 py-3 text-center" style={{ border: '1px solid #DDF0F3' }}>
            <div className="text-xl font-bold" style={{ color: item.color }}>{item.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 mb-4 space-y-3" style={{ border: '1px solid #DDF0F3' }}>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">关键词搜索</label>
            <input
              value={filters.keyword} onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              placeholder="患者姓名 / 转诊单号 / 诊断" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">转诊类型</label>
            <div className="flex gap-2">
              {[['all', '全部'], ['upward', '上转'], ['downward', '下转']].map(([v, l]) => (
                <button key={v} onClick={() => setFilters(f => ({ ...f, type: v }))}
                  className="flex-1 py-1.5 rounded-lg text-xs border transition-colors"
                  style={filters.type === v ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' } : { color: '#4b5563', borderColor: '#e5e7eb' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">状态筛选</label>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white">
              {allStatuses.map(s => <option key={s} value={s}>{s === 'all' ? '全部状态' : s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">机构</label>
            <select value={filters.institution} onChange={e => setFilters(f => ({ ...f, institution: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white">
              {institutions.map(s => <option key={s} value={s}>{s === 'all' ? '全部机构' : s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleQuery}
            className="px-5 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: '#0BBECF' }}>
            🔍 查询
          </button>
          <button onClick={handleReset}
            className="px-4 py-1.5 rounded-lg text-sm border transition-colors"
            style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
            ↺ 重置
          </button>
          <div className="flex-1" />
          <button className="px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            📥 导出台账 Excel
          </button>
          <button className="px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            📄 导出台账 PDF
          </button>
        </div>
      </div>

      {/* 台账表格 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['序号','类型','患者','性别/年龄','诊断','转出机构','转入机构','处理方式','状态','创建时间','操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={11} className="py-12 text-center text-gray-400">暂无数据</td></tr>
              ) : pageData.map((ref, i) => (
                <tr key={ref.id}
                  style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE', cursor: 'pointer' }}
                  onClick={() => navigate(`/referral/${ref.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}>
                  <td className={TD}><RowNo n={(page-1)*PAGE_SIZE + i + 1} /></td>
                  <td className={TD}>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={ref.type === 'upward'
                        ? { background: '#E0F6F9', color: '#0892a0' }
                        : { background: '#ecfdf5', color: '#047857' }}>
                      {ref.type === 'upward' ? '⬆ 上转' : '⬇ 下转'}
                    </span>
                    {ref.is_emergency && (
                      <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                        {ref.isUrgentUnhandled ? '急诊·超时' : '急诊'}
                      </span>
                    )}
                    {ref.isRetroEntry && (
                      <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                        补录
                      </span>
                    )}
                    {ref.referral_type === 'green_channel' && (
                      <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#10b981' }}>
                        绿通
                      </span>
                    )}
                  </td>
                  <td className={TD + ' font-medium text-gray-800'}>{ref.patient.name}</td>
                  <td className={TD + ' text-gray-500 text-xs'}>{ref.patient.gender || '未知'}/{ref.patient.age ? `${ref.patient.age}岁` : '年龄未填'}</td>
                  <td className={TD + ' text-xs text-gray-600'}>
                    <span className="font-mono mr-1" style={{ color: '#0892a0' }}>{ref.diagnosis.code}</span>
                    {ref.diagnosis.name}
                  </td>
                  <td className={TD + ' text-xs text-gray-400 max-w-[100px] truncate'}>{ref.fromInstitution}</td>
                  <td className={TD + ' text-xs text-gray-400 max-w-[100px] truncate'}>{ref.toInstitution || '—'}</td>
                  <td className={TD + ' text-xs text-gray-600'}>
                    {getProcessingLabel(ref)}
                  </td>
                  <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                  <td className={TD + ' text-xs text-gray-400'}>{fmt(ref.createdAt)}</td>
                  <td className={TD} onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs" style={{ color: '#0BBECF' }}>详情</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <span className="text-xs text-gray-400">共 <strong className="text-gray-700">{filtered.length}</strong> 条记录，第 {page}/{totalPages || 1} 页</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-3 py-1 rounded text-xs border disabled:opacity-40 transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#4b5563' }}>‹ 上一页</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className="w-7 h-7 rounded text-xs transition-colors"
                style={page === p ? { background: '#0BBECF', color: '#fff' } : { color: '#4b5563', border: '1px solid #e5e7eb' }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
              className="px-3 py-1 rounded text-xs border disabled:opacity-40 transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#4b5563' }}>下一页 ›</button>
          </div>
        </div>
      </div>
    </div>
  )
}

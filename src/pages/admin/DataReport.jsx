import { useState, useMemo } from 'react'

const MOCK_REPORTS = [
  { id: 'REF2026001', patient: '张三', type: 'upward', completedAt: '2026-03-19 10:54', status: 'pending', retryCount: 0, lastRetry: '—' },
  { id: 'REF2026002', patient: '李四', type: 'upward', completedAt: '2026-03-18 15:30', status: 'success', retryCount: 0, lastRetry: '—' },
  { id: 'REF2026003', patient: '王五', type: 'downward', completedAt: '2026-03-17 09:15', status: 'manual_pending', retryCount: 3, lastRetry: '2026-03-18 08:00' },
  { id: 'REF2026004', patient: '赵六', type: 'upward', completedAt: '2026-03-16 14:20', status: 'failed', retryCount: 1, lastRetry: '2026-03-17 10:00' },
  { id: 'REF2026005', patient: '钱七', type: 'downward', completedAt: '2026-03-15 11:45', status: 'success', retryCount: 2, lastRetry: '2026-03-15 12:00' },
  { id: 'REF2026006', patient: '孙八', type: 'upward', completedAt: '2026-03-14 16:30', status: 'retrying', retryCount: 2, lastRetry: '2026-03-14 17:00' },
]

const STATUS_LABEL = {
  pending: '待上报',
  success: '已上报',
  failed: '上报失败',
  retrying: '重试中',
  manual_pending: '待手动补报',
}

const STATUS_CLS = {
  pending: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  retrying: 'bg-orange-100 text-orange-700',
  manual_pending: 'bg-red-100 text-red-700 font-semibold',
}

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

const PAGE_SIZE = 20

function StatusBadge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_CLS[status] || 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

export default function DataReport() {
  const today = new Date()
  const monthAgo = new Date(today)
  monthAgo.setDate(today.getDate() - 30)
  const fmtDate = d => d.toISOString().slice(0, 10)

  const [data, setData] = useState(MOCK_REPORTS)
  const [filters, setFilters] = useState({
    startDate: fmtDate(monthAgo),
    endDate: fmtDate(today),
    status: 'all',
    institution: 'all',
  })
  const [applied, setApplied] = useState({ ...filters })
  const [selected, setSelected] = useState([])
  const [page, setPage] = useState(1)

  // 手动补报弹窗
  const [modal, setModal] = useState(null) // { id, retryCount } | null

  const filtered = useMemo(() => {
    return data.filter(r => {
      const dt = r.completedAt.slice(0, 10)
      if (applied.startDate && dt < applied.startDate) return false
      if (applied.endDate && dt > applied.endDate) return false
      if (applied.status !== 'all' && r.status !== applied.status) return false
      return true
    })
  }, [data, applied])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleQuery = () => { setApplied({ ...filters }); setPage(1); setSelected([]) }
  const handleReset = () => {
    const init = { startDate: fmtDate(monthAgo), endDate: fmtDate(today), status: 'all', institution: 'all' }
    setFilters(init); setApplied(init); setPage(1); setSelected([])
  }

  const handleRetry = (id) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, status: 'retrying', retryCount: r.retryCount + 1, lastRetry: new Date().toLocaleString('sv-SE').slice(0, 16) } : r))
    alert(`已触发重试：${id}`)
  }

  const handleManualReport = (id) => {
    const item = data.find(r => r.id === id)
    if (item) setModal({ id, retryCount: item.retryCount })
  }

  const confirmManualReport = () => {
    if (!modal) return
    setData(prev => prev.map(r => r.id === modal.id ? { ...r, status: 'success', lastRetry: new Date().toLocaleString('sv-SE').slice(0, 16) } : r))
    setSelected(prev => prev.filter(id => id !== modal.id))
    alert(`手动补报成功：${modal.id}`)
    setModal(null)
  }

  const handleBatchReport = () => {
    const ids = selected.filter(id => {
      const r = data.find(d => d.id === id)
      return r && r.status === 'manual_pending'
    })
    if (ids.length === 0) return
    setData(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'success' } : r))
    setSelected([])
    alert(`批量手动补报完成：${ids.join(', ')}`)
  }

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const selectableIds = pageData.filter(r => r.status === 'manual_pending').map(r => r.id)
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selected.includes(id))
  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => prev.filter(id => !selectableIds.includes(id)))
    } else {
      setSelected(prev => [...new Set([...prev, ...selectableIds])])
    }
  }

  // 概览统计
  const summary = {
    pending: data.filter(r => r.status === 'pending').length,
    success: data.filter(r => r.status === 'success').length,
    failed: data.filter(r => r.status === 'failed').length,
    manual_pending: data.filter(r => r.status === 'manual_pending').length,
  }

  const allSuccess = data.every(r => r.status === 'success')

  const selectedManualPending = selected.filter(id => {
    const r = data.find(d => d.id === id)
    return r && r.status === 'manual_pending'
  })

  return (
    <div className="p-5">
      {/* 页头 */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">数据上报管理</h2>
        <div className="text-xs text-gray-400 mt-0.5">健康通数据上报状态监控 · 失败重试</div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: '待上报', value: summary.pending, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { label: '已上报', value: summary.success, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: '上报失败', value: summary.failed, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          { label: '待手动补报', value: summary.manual_pending, color: '#d97706', bg: '#fffbeb', border: '#fde68a', bold: true },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-4 flex items-center gap-4" style={{ background: item.bg, border: `1px solid ${item.border}` }}>
            <div>
              <div className={`text-2xl font-bold`} style={{ color: item.color, fontWeight: item.bold ? 800 : 700 }}>
                {item.value}
              </div>
              <div className="text-xs mt-1" style={{ color: item.color, opacity: 0.8 }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 全部上报成功提示 */}
      {allSuccess && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4">
          <span className="text-base">✓</span>
          <span className="font-medium">全部数据已成功上报</span>
          <span className="text-green-500 text-xs ml-1">所有转诊记录已同步至健康通平台</span>
        </div>
      )}

      {/* 筛选区 */}
      <div className="bg-white rounded-xl p-4 mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">完成时间</label>
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
            <label className="block text-xs text-gray-500 mb-1">上报状态</label>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none bg-white"
            >
              <option value="all">全部状态</option>
              <option value="pending">待上报</option>
              <option value="success">已上报</option>
              <option value="failed">上报失败</option>
              <option value="retrying">重试中</option>
              <option value="manual_pending">待手动补报</option>
            </select>
          </div>
          {/* TODO: 接入机构下拉数据源 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">机构</label>
            <select
              value={filters.institution}
              onChange={e => setFilters(f => ({ ...f, institution: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none bg-white"
            >
              <option value="all">全部机构</option>
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
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectedManualPending.length > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 px-4 py-2.5 rounded-xl mb-3">
          <span className="text-sm text-orange-700">
            已选 <strong>{selectedManualPending.length}</strong> 条待手动补报记录
          </span>
          <button
            onClick={handleBatchReport}
            className="px-4 py-1 rounded text-sm font-medium text-white"
            style={{ background: '#d97706' }}
          >
            批量手动补报
          </button>
          <button
            onClick={() => setSelected([])}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            取消选择
          </button>
        </div>
      )}

      {/* 数据表格 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                <th className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3', width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={selectableIds.length === 0}
                    className="accent-[#0BBECF]"
                    title="仅可选择「待手动补报」记录"
                  />
                </th>
                {['转诊单号', '患者姓名', '转诊类型', '完成时间', '上报状态', '重试次数', '最后重试时间', '操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="text-gray-300 text-4xl mb-2">☁️</div>
                    <div className="text-gray-400 text-sm">暂无符合条件的记录</div>
                  </td>
                </tr>
              ) : pageData.map((r, i) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: '1px solid #EEF7F9',
                    background: i % 2 === 0 ? '#fff' : '#FAFEFE',
                  }}
                >
                  <td className={TD}>
                    {r.status === 'manual_pending' ? (
                      <input
                        type="checkbox"
                        checked={selected.includes(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="accent-[#0BBECF]"
                      />
                    ) : (
                      <span className="inline-block w-4" />
                    )}
                  </td>
                  <td className={TD + ' font-mono text-xs text-gray-700'}>{r.id}</td>
                  <td className={TD + ' font-medium text-gray-800'}>{r.patient}</td>
                  <td className={TD}>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.type === 'upward' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                      {r.type === 'upward' ? '⬆ 上转' : '⬇ 下转'}
                    </span>
                  </td>
                  <td className={TD + ' text-xs text-gray-500'}>{r.completedAt}</td>
                  <td className={TD}><StatusBadge status={r.status} /></td>
                  <td className={TD + ' text-center text-xs text-gray-500'}>{r.retryCount}</td>
                  <td className={TD + ' text-xs text-gray-400'}>{r.lastRetry}</td>
                  <td className={TD}>
                    {r.status === 'manual_pending' && (
                      <button
                        onClick={() => handleManualReport(r.id)}
                        className="px-3 py-1 rounded text-xs font-medium text-white"
                        style={{ background: '#d97706' }}
                      >
                        手动补报
                      </button>
                    )}
                    {r.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(r.id)}
                        className="text-sm font-medium hover:underline"
                        style={{ color: '#0BBECF' }}
                      >
                        重试
                      </button>
                    )}
                    {!['manual_pending', 'failed'].includes(r.status) && (
                      <button
                        className="text-sm font-medium hover:underline text-gray-400"
                        onClick={() => alert(`查看详情：${r.id}`)}
                      >
                        查看
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <span className="text-xs text-gray-400">
            共 <strong className="text-gray-700">{filtered.length}</strong> 条记录，每页 {PAGE_SIZE} 条，第 {page}/{totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded text-xs border disabled:opacity-40"
              style={{ borderColor: '#e5e7eb', color: '#4b5563' }}
            >
              ‹ 上一页
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="w-7 h-7 rounded text-xs"
                style={page === p
                  ? { background: '#0BBECF', color: '#fff' }
                  : { color: '#4b5563', border: '1px solid #e5e7eb' }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded text-xs border disabled:opacity-40"
              style={{ borderColor: '#e5e7eb', color: '#4b5563' }}
            >
              下一页 ›
            </button>
          </div>
        </div>
      </div>

      {/* 手动补报确认弹窗 */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-orange-500 text-lg">⚠️</span>
                <h3 className="text-base font-semibold text-gray-800">手动补报确认</h3>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 mb-3">
                转诊单 <span className="font-mono font-semibold text-gray-800">{modal.id}</span> 的健康通上报失败
                （已重试 <strong className="text-orange-600">{modal.retryCount}</strong> 次），确认手动补报？
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
                手动补报后，该记录状态将变更为「已上报」，操作将写入操作日志。
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={confirmManualReport}
                className="px-5 py-1.5 rounded-lg text-sm font-medium text-white"
                style={{ background: '#d97706' }}
              >
                确认补报
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

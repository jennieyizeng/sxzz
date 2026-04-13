import React, { useEffect, useMemo, useState } from 'react'
import {
  getSystemOperationLogs,
  SYSTEM_OPERATION_LOG_DOMAINS,
  SYSTEM_OPERATION_LOG_TYPES,
} from '../../data/systemAdminConfig'

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

const PAGE_SIZE = 20

function ResultBadge({ result }) {
  if (result === '成功') {
    return (
      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        成功
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
      失败
    </span>
  )
}

function TypeBadge({ type }) {
  const colorMap = {
    '角色权限变更': 'bg-purple-100 text-purple-700',
    '机构信息变更': 'bg-yellow-100 text-yellow-700',
    '系统配置变更': 'bg-gray-100 text-gray-600',
  }
  const cls = colorMap[type] || 'bg-gray-100 text-gray-600'
  return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{type}</span>
}

function buildCompareRows(detail) {
  const compareRows = []
  const metadataEntries = []
  const handledKeys = new Set()

  Object.entries(detail).forEach(([key, value]) => {
    if (handledKeys.has(key)) return

    if (key.startsWith('原') && detail[`新${key.slice(1)}`] !== undefined) {
      compareRows.push({
        field: key.slice(1),
        before: value,
        after: detail[`新${key.slice(1)}`],
      })
      handledKeys.add(key)
      handledKeys.add(`新${key.slice(1)}`)
      return
    }

    if (typeof value === 'string' && value.includes(' → ')) {
      const [before, after] = value.split(' → ')
      compareRows.push({ field: key, before, after })
      handledKeys.add(key)
      return
    }

    metadataEntries.push([key, value])
    handledKeys.add(key)
  })

  return { compareRows, metadataEntries }
}

function DetailBlock({ detail }) {
  const { compareRows, metadataEntries } = buildCompareRows(detail)

  return (
    <div className="space-y-3">
      {compareRows.length > 0 && (
        <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3">
          <div className="mb-2 text-xs font-medium text-cyan-700">变更前后对比</div>
          <div className="space-y-2">
            {compareRows.map(row => (
              <div key={row.field} className="grid grid-cols-[88px_1fr_24px_1fr] items-start gap-2 text-xs">
                <div className="pt-1 text-gray-500">{row.field}</div>
                <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-gray-600 break-all">
                  <div className="mb-1 text-[11px] text-gray-400">变更前</div>
                  {String(row.before || '—')}
                </div>
                <div className="pt-6 text-center text-cyan-500">→</div>
                <div className="rounded-md border border-cyan-200 bg-white px-2 py-1.5 text-gray-700 break-all">
                  <div className="mb-1 text-[11px] text-cyan-600">变更后</div>
                  {String(row.after || '—')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {metadataEntries.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-xs text-gray-700 space-y-1">
          {metadataEntries.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-gray-400 min-w-[88px] shrink-0">{k}:</span>
              <span className="text-gray-700 break-all">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OperationLog() {
  // 默认近7天
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  const fmtDate = d => d.toISOString().slice(0, 10)

  const [logs, setLogs] = useState(() => getSystemOperationLogs())
  const [filters, setFilters] = useState({
    startDate: fmtDate(sevenDaysAgo),
    endDate: fmtDate(today),
    operator: '',
    domain: '全部',
    type: '全部',
    keyword: '',
  })
  const [applied, setApplied] = useState({ ...filters })
  const [expandedId, setExpandedId] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const syncLogs = () => setLogs(getSystemOperationLogs())
    window.addEventListener('system-operation-log-updated', syncLogs)
    return () => window.removeEventListener('system-operation-log-updated', syncLogs)
  }, [])

  const filtered = useMemo(() => {
    return logs.filter(log => {
      const logDate = log.time.slice(0, 10)
      if (applied.startDate && logDate < applied.startDate) return false
      if (applied.endDate && logDate > applied.endDate) return false
      if (applied.operator && !log.operator.includes(applied.operator)) return false
      if (applied.domain !== '全部' && log.domain !== applied.domain) return false
      if (applied.type !== '全部' && log.type !== applied.type) return false
      if (applied.keyword && !log.target.includes(applied.keyword) && !log.id.includes(applied.keyword)) return false
      return true
    })
  }, [applied, logs])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleQuery = () => { setApplied({ ...filters }); setPage(1); setExpandedId(null) }
  const handleReset = () => {
    const init = {
      startDate: fmtDate(sevenDaysAgo),
      endDate: fmtDate(today),
      operator: '',
      domain: '全部',
      type: '全部',
      keyword: '',
    }
    setFilters(init)
    setApplied(init)
    setPage(1)
    setExpandedId(null)
  }

  const [toast, setToast] = useState('')
  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 1500)
  }
  const handleExport = () => showToast('导出任务已创建，可在日志中心下载 CSV 文件。')

  return (
    <div className="p-5">
      {toast && (
        <div className="fixed top-4 right-4 z-[60] flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm rounded-lg shadow-lg">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}
      {/* 页头 */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">操作日志</h2>
        <div className="text-xs text-gray-400 mt-0.5">系统操作记录查询，涵盖敏感操作与配置变更 · 只读</div>
      </div>

      {/* 筛选区 */}
      <div className="bg-white rounded-xl p-4 mb-4 space-y-3" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex flex-wrap gap-3 items-end">
          {/* 时间范围 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">操作时间</label>
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

          {/* 操作人 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">操作人</label>
            <input
              value={filters.operator}
              onChange={e => setFilters(f => ({ ...f, operator: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 w-32 focus:outline-none"
              placeholder="姓名"
            />
          </div>

          {/* 操作类型 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">配置域</label>
            <select
              value={filters.domain}
              onChange={e => setFilters(f => ({ ...f, domain: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none bg-white"
            >
              {SYSTEM_OPERATION_LOG_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* 操作类型 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">操作类型</label>
            <select
              value={filters.type}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none bg-white"
            >
              {SYSTEM_OPERATION_LOG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* 关联转诊单号 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">关联转诊单号</label>
            <input
              value={filters.keyword}
              onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 w-36 focus:outline-none"
              placeholder="如 REF2026003"
            />
          </div>

          {/* 按钮 */}
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
            <button
              onClick={handleExport}
              className="px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 h-8 flex items-center"
            >
              导出日志
            </button>
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['序号', '操作时间', '操作人', '操作角色', '配置域', '操作类型', '关联对象', '操作结果', '操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="text-gray-300 text-4xl mb-2">📋</div>
                    <div className="text-gray-400 text-sm">暂无操作日志</div>
                    <div className="text-gray-300 text-xs mt-1">请调整筛选条件后重新查询</div>
                  </td>
                </tr>
              ) : pageData.map((log, i) => (
                <React.Fragment key={log.id}>
                  <tr
                    style={{
                      borderBottom: expandedId === log.id ? 'none' : '1px solid #EEF7F9',
                      background: i % 2 === 0 ? '#fff' : '#FAFEFE',
                    }}
                  >
                    <td className={TD}>
                      <span className="text-xs text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</span>
                    </td>
                    <td className={TD + ' text-xs text-gray-500 whitespace-nowrap'}>{log.time}</td>
                    <td className={TD + ' font-medium text-gray-800'}>{log.operator}</td>
                    <td className={TD + ' text-xs text-gray-500'}>{log.role}</td>
                    <td className={TD + ' text-xs text-gray-500'}>{log.domain}</td>
                    <td className={TD}><TypeBadge type={log.type} /></td>
                    <td className={TD + ' text-xs text-gray-600 font-mono'}>{log.target}</td>
                    <td className={TD}><ResultBadge result={log.result} /></td>
                    <td className={TD} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        className="text-sm font-medium hover:underline"
                        style={{ color: '#0BBECF' }}
                      >
                        {expandedId === log.id ? '收起' : '查看详情'}
                      </button>
                    </td>
                  </tr>

                  {expandedId === log.id && (
                    <tr style={{ borderBottom: '1px solid #EEF7F9' }}>
                      <td colSpan={9} style={{ background: i % 2 === 0 ? '#fff' : '#FAFEFE', padding: '0 12px 12px 48px' }}>
                        <div className="text-xs text-gray-400 mb-2 font-medium">操作详情</div>
                        <DetailBlock detail={log.detail} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(pageNum => (
              <button
                key={`page-btn-${pageNum}`}
                onClick={() => setPage(pageNum)}
                className="w-7 h-7 rounded text-xs"
                style={page === pageNum
                  ? { background: '#0BBECF', color: '#fff' }
                  : { color: '#4b5563', border: '1px solid #e5e7eb' }}
              >
                {pageNum}
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
    </div>
  )
}

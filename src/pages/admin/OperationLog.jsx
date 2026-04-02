import React, { useState, useMemo } from 'react'

const MOCK_LOGS = [
  {
    id: 'LOG001',
    time: '2026-03-19 10:32',
    operator: '赵管理员',
    role: '转诊管理员',
    type: '代为确认接诊',
    target: 'REF2026003',
    result: '成功',
    detail: { 转诊单: 'REF2026003', 患者: '李四', 操作说明: '超时48h，管理员代为确认接诊' },
  },
  {
    id: 'LOG002',
    time: '2026-03-18 16:45',
    operator: '赵管理员',
    role: '转诊管理员',
    type: '手动数据补报',
    target: 'REF2026002',
    result: '成功',
    detail: { 转诊单: 'REF2026002', 补报系统: '健康通', 重试次数: 2 },
  },
  {
    id: 'LOG003',
    time: '2026-03-18 09:20',
    operator: '赵管理员',
    role: '转诊管理员',
    type: '协商关闭',
    target: 'REF2026005',
    result: '成功',
    detail: { 转诊单: 'REF2026005', 关闭原因: '患者已就近就医，双方协商关闭', 通知医生: '王医生、刘医生' },
  },
  {
    id: 'LOG004',
    time: '2026-03-17 14:10',
    operator: '赵管理员',
    role: '转诊管理员',
    type: '角色权限变更',
    target: '用户：陈医生',
    result: '成功',
    detail: { 用户: '陈医生（工号:D0043）', 原角色: '基层医生', 新角色: '县级医生', 变更原因: '岗位调动' },
  },
  {
    id: 'LOG005',
    time: '2026-03-16 11:05',
    operator: '赵管理员',
    role: '转诊管理员',
    type: '机构信息变更',
    target: '绵竹市汉旺镇卫生院',
    result: '成功',
    detail: { 机构: '绵竹市汉旺镇卫生院', 变更字段: '联系电话', 原值: '0838-xxxxxxx', 新值: '0838-yyyyyyy' },
  },
  {
    id: 'LOG006',
    time: '2026-03-15 08:30',
    operator: '赵管理员',
    role: '转诊管理员',
    type: '系统配置变更',
    target: '转诊单模板',
    result: '失败',
    detail: { 配置项: '转诊原因字段最大字符数', 原值: '200', 目标值: '500', 失败原因: '数据库写入超时，已回滚' },
  },
]

const LOG_TYPES = ['全部', '代为确认接诊', '手动数据补报', '协商关闭', '角色权限变更', '机构信息变更', '系统配置变更']

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
    '代为确认接诊': 'bg-blue-100 text-blue-700',
    '手动数据补报': 'bg-cyan-100 text-cyan-700',
    '协商关闭': 'bg-orange-100 text-orange-700',
    '角色权限变更': 'bg-purple-100 text-purple-700',
    '机构信息变更': 'bg-yellow-100 text-yellow-700',
    '系统配置变更': 'bg-gray-100 text-gray-600',
  }
  const cls = colorMap[type] || 'bg-gray-100 text-gray-600'
  return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{type}</span>
}

function DetailBlock({ detail }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-xs text-gray-700 space-y-1">
      {Object.entries(detail).map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-gray-400 min-w-[80px] shrink-0">{k}:</span>
          <span className="text-gray-700 break-all">{String(v)}</span>
        </div>
      ))}
    </div>
  )
}

export default function OperationLog() {
  // 默认近7天
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  const fmtDate = d => d.toISOString().slice(0, 10)

  const [filters, setFilters] = useState({
    startDate: fmtDate(sevenDaysAgo),
    endDate: fmtDate(today),
    operator: '',
    type: '全部',
    keyword: '',
  })
  const [applied, setApplied] = useState({ ...filters })
  const [expandedId, setExpandedId] = useState(null)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return MOCK_LOGS.filter(log => {
      const logDate = log.time.slice(0, 10)
      if (applied.startDate && logDate < applied.startDate) return false
      if (applied.endDate && logDate > applied.endDate) return false
      if (applied.operator && !log.operator.includes(applied.operator)) return false
      if (applied.type !== '全部' && log.type !== applied.type) return false
      if (applied.keyword && !log.target.includes(applied.keyword) && !log.id.includes(applied.keyword)) return false
      return true
    })
  }, [applied])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleQuery = () => { setApplied({ ...filters }); setPage(1); setExpandedId(null) }
  const handleReset = () => {
    const init = {
      startDate: fmtDate(sevenDaysAgo),
      endDate: fmtDate(today),
      operator: '',
      type: '全部',
      keyword: '',
    }
    setFilters(init)
    setApplied(init)
    setPage(1)
    setExpandedId(null)
  }

  const handleExport = () => alert('导出操作日志 CSV（原型模拟，实际对接后端导出接口）')

  return (
    <div className="p-5">
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
            <label className="block text-xs text-gray-500 mb-1">操作类型</label>
            <select
              value={filters.type}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none bg-white"
            >
              {LOG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
                {['序号', '操作时间', '操作人', '操作角色', '操作类型', '关联对象', '操作结果', '操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
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
                      <td colSpan={8} style={{ background: i % 2 === 0 ? '#fff' : '#FAFEFE', padding: '0 12px 12px 48px' }}>
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

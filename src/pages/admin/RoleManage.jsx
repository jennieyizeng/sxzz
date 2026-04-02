import { useState, useMemo } from 'react'

// ── Mock 数据 ──────────────────────────────────────────────
const MOCK_USERS = [
  { id: 'U001', name: '王医生',   empNo: 'D0001', institution: '绵竹市拱星镇卫生院',   role: '基层医生',   enabled: true,  updatedAt: '2026-03-01' },
  { id: 'U002', name: '李慧医生', empNo: 'D0002', institution: '绵竹市汉旺镇卫生院',   role: '基层医生',   enabled: true,  updatedAt: '2026-03-01' },
  { id: 'U003', name: '刘医生',   empNo: 'D0003', institution: '绵竹市人民医院',       role: '县级医生',   enabled: true,  updatedAt: '2026-02-15' },
  { id: 'U004', name: '赵管理员', empNo: 'A0001', institution: '绵竹市医共体管理层',   role: '转诊管理员', enabled: true,  updatedAt: '2026-01-10' },
  { id: 'U005', name: '钱院长',   empNo: 'D0010', institution: '绵竹市人民医院',       role: '院长',       enabled: true,  updatedAt: '2026-01-10' },
  { id: 'U006', name: '孙医生',   empNo: 'D0021', institution: '绵竹市清平乡卫生院',   role: '基层医生',   enabled: false, updatedAt: '2026-02-20' },
]

const ROLES = ['基层医生', '县级医生', '转诊管理员', '院长']

const INSTITUTIONS = [
  '绵竹市人民医院',
  '绵竹市拱星镇卫生院',
  '绵竹市汉旺镇卫生院',
  '绵竹市清平乡卫生院',
  '绵竹市医共体管理层',
]

// ── 常量 ───────────────────────────────────────────────────
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

const ROLE_TAG = {
  '基层医生':   'bg-blue-100 text-blue-700',
  '县级医生':   'bg-purple-100 text-purple-700',
  '转诊管理员': 'bg-orange-100 text-orange-700',
  '院长':       'bg-gray-100 text-gray-700',
}

// ── 辅助小组件 ─────────────────────────────────────────────
function SuccessToast({ message }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm rounded-full shadow-lg">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </div>
  )
}

function RowNo({ n }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>
      {n}
    </span>
  )
}

// ── 变更角色弹窗 ───────────────────────────────────────────
function ChangeRoleModal({ user, onCancel, onConfirm }) {
  const [newRole, setNewRole]     = useState(user.role)
  const [reason, setReason]       = useState('')
  const [reasonErr, setReasonErr] = useState('')

  const handleConfirm = () => {
    if (!reason.trim()) {
      setReasonErr('请填写变更原因')
      return
    }
    onConfirm(newRole, reason)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">变更用户角色</h3>
            <button
              onClick={onCancel}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors text-lg leading-none"
            >×</button>
          </div>

          {/* 用户只读信息 */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4 text-sm text-gray-600 space-y-1">
            <div>
              <span className="text-gray-500 text-xs">用户</span>
              <span className="ml-2 font-medium text-gray-800">{user.name}</span>
              <span className="mx-1.5 text-gray-300">·</span>
              <span className="font-mono text-xs">{user.empNo}</span>
              <span className="mx-1.5 text-gray-300">·</span>
              <span className="text-xs">{user.institution}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">当前角色</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_TAG[user.role]}`}>
                {user.role}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-100 mb-4" />

          {/* 新角色单选 */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-2">
              新角色 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <label
                  key={r}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                    newRole === r
                      ? 'border-[#0BBECF] bg-[#E0F6F9] text-[#0892a0] font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="newRole"
                    value={r}
                    checked={newRole === r}
                    onChange={() => setNewRole(r)}
                    className="accent-[#0BBECF]"
                  />
                  {r}
                </label>
              ))}
            </div>
            {user.role === newRole && (
              <p className="text-xs text-amber-500 mt-1.5">所选角色与当前角色相同，保存后不产生变更记录。</p>
            )}
          </div>

          {/* 变更原因 */}
          <div className="mb-5">
            <label className="block text-xs text-gray-500 mb-1.5">
              变更原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => { setReason(e.target.value); if (e.target.value.trim()) setReasonErr('') }}
              rows={3}
              placeholder="请填写变更原因（将写入操作日志）"
              className={`w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 ${
                reasonErr ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-[#0BBECF]'
              }`}
            />
            {reasonErr && <p className="text-xs text-red-500 mt-0.5">{reasonErr}</p>}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: '#0BBECF' }}
              onMouseEnter={e => e.currentTarget.style.background = '#0892a0'}
              onMouseLeave={e => e.currentTarget.style.background = '#0BBECF'}
            >
              确认变更
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── 禁用确认弹窗 ───────────────────────────────────────────
function DisableConfirmModal({ user, onCancel, onConfirm }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800 mb-1">禁用账号确认</div>
              <div className="text-sm text-gray-500 leading-relaxed">
                确认禁用 <span className="font-medium text-gray-800">「{user.name}」（{user.empNo}）</span> 的账号？<br />
                禁用后该用户将无法登录系统。
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
            >
              确认禁用
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── 主页面 ─────────────────────────────────────────────────
export default function RoleManage() {
  const [list, setList] = useState(MOCK_USERS)

  // 筛选
  const [filters, setFilters] = useState({ name: '', institution: 'all', role: 'all' })
  const [applied, setApplied] = useState({ name: '', institution: 'all', role: 'all' })

  // 分页
  const [page, setPage]     = useState(1)
  const PAGE_SIZE           = 10

  // 弹窗状态
  const [changeTarget,  setChangeTarget]  = useState(null) // user obj
  const [disableTarget, setDisableTarget] = useState(null) // user obj

  // 成功提示
  const [toast, setToast] = useState('')
  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1500)
  }

  // 筛选逻辑
  const filtered = useMemo(() => {
    return list.filter(u => {
      if (applied.institution !== 'all' && u.institution !== applied.institution) return false
      if (applied.role !== 'all' && u.role !== applied.role) return false
      if (applied.name.trim()) {
        const q = applied.name.trim()
        if (!u.name.includes(q) && !u.empNo.includes(q)) return false
      }
      return true
    })
  }, [list, applied])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleQuery = () => { setApplied({ ...filters }); setPage(1) }
  const handleReset = () => {
    const empty = { name: '', institution: 'all', role: 'all' }
    setFilters(empty); setApplied(empty); setPage(1)
  }

  // 确认变更角色
  const handleConfirmChange = (newRole, _reason) => {
    // TODO: 调用后端 API，写入操作日志，传入 reason
    setList(prev => prev.map(u =>
      u.id === changeTarget.id
        ? { ...u, role: newRole, updatedAt: new Date().toISOString().slice(0, 10) }
        : u
    ))
    showToast(`已将「${changeTarget.name}」角色变更为「${newRole}」`)
    setChangeTarget(null)
  }

  // 确认禁用
  const handleConfirmDisable = () => {
    setList(prev => prev.map(u =>
      u.id === disableTarget.id
        ? { ...u, enabled: false, updatedAt: new Date().toISOString().slice(0, 10) }
        : u
    ))
    showToast(`已禁用账号「${disableTarget.name}」`)
    setDisableTarget(null)
  }

  // 直接启用（无需确认）
  const handleEnable = (user) => {
    setList(prev => prev.map(u =>
      u.id === user.id
        ? { ...u, enabled: true, updatedAt: new Date().toISOString().slice(0, 10) }
        : u
    ))
    showToast(`已启用账号「${user.name}」`)
  }

  return (
    <div className="p-5">

      {toast && <SuccessToast message={toast} />}

      {/* 页面标题 */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">角色权限管理</h2>
        <div className="text-xs text-gray-400 mt-0.5">用户角色分配与变更 · 变更操作将写入操作日志</div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">用户姓名 / 工号</label>
            <input
              value={filters.name}
              onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
              placeholder="输入姓名或工号"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">所属机构</label>
            <select
              value={filters.institution}
              onChange={e => setFilters(f => ({ ...f, institution: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white focus:ring-1 focus:ring-[#0BBECF]"
            >
              <option value="all">全部</option>
              {INSTITUTIONS.map(inst => <option key={inst} value={inst}>{inst}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">当前角色</label>
            <select
              value={filters.role}
              onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white focus:ring-1 focus:ring-[#0BBECF]"
            >
              <option value="all">全部</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleQuery}
              className="flex-1 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: '#0BBECF' }}
              onMouseEnter={e => e.currentTarget.style.background = '#0892a0'}
              onMouseLeave={e => e.currentTarget.style.background = '#0BBECF'}
            >
              查询
            </button>
            <button
              onClick={handleReset}
              className="flex-1 py-1.5 rounded-lg text-sm border transition-colors"
              style={{ color: '#0BBECF', borderColor: '#0BBECF' }}
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['序号', '姓名', '工号', '所属机构', '当前角色', '账号状态', '最后修改时间', '操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm">暂无用户数据</span>
                      <span className="text-xs text-gray-300">请调整筛选条件后重试</span>
                    </div>
                  </td>
                </tr>
              ) : pageData.map((user, i) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: '1px solid #EEF7F9',
                    background: i % 2 === 0 ? '#fff' : '#FAFEFE',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}
                >
                  <td className={TD}>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </span>
                  </td>
                  <td className={TD + ' font-medium text-gray-800'}>{user.name}</td>
                  <td className={TD + ' font-mono text-xs text-gray-500'}>{user.empNo}</td>
                  <td className={TD + ' text-gray-600 max-w-[160px]'}>
                    <span className="truncate block" title={user.institution}>{user.institution}</span>
                  </td>
                  <td className={TD}>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_TAG[user.role] || 'bg-gray-100 text-gray-600'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className={TD}>
                    {user.enabled
                      ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">启用</span>
                      : <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded">禁用</span>
                    }
                  </td>
                  <td className={TD + ' text-gray-500 text-xs'}>{user.updatedAt}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setChangeTarget(user)}
                        disabled={!user.enabled}
                        className="text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ color: user.enabled ? '#0BBECF' : undefined }}
                        onMouseEnter={e => { if (user.enabled) e.currentTarget.style.color = '#0892a0' }}
                        onMouseLeave={e => { if (user.enabled) e.currentTarget.style.color = '#0BBECF' }}
                        title={!user.enabled ? '账号已禁用，无法变更角色' : undefined}
                      >
                        变更角色
                      </button>
                      {user.enabled ? (
                        <button
                          onClick={() => setDisableTarget(user)}
                          className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                        >
                          禁用
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnable(user)}
                          className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
                        >
                          启用
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}
        >
          <span className="text-xs text-gray-400">
            共 <strong className="text-gray-700">{filtered.length}</strong> 条记录，第 {page}/{totalPages || 1} 页
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
            {Array.from({ length: Math.min(totalPages || 1, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="w-7 h-7 rounded text-xs transition-colors"
                style={page === p
                  ? { background: '#0BBECF', color: '#fff' }
                  : { color: '#4b5563', border: '1px solid #e5e7eb' }
                }
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

      {/* 变更角色弹窗 */}
      {changeTarget && (
        <ChangeRoleModal
          user={changeTarget}
          onCancel={() => setChangeTarget(null)}
          onConfirm={handleConfirmChange}
        />
      )}

      {/* 禁用确认弹窗 */}
      {disableTarget && (
        <DisableConfirmModal
          user={disableTarget}
          onCancel={() => setDisableTarget(null)}
          onConfirm={handleConfirmDisable}
        />
      )}

    </div>
  )
}

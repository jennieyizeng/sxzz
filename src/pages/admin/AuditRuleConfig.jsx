import { useState } from 'react'
import { AUDIT_RULE_CONFIGS, updateAuditRuleConfig } from '../../data/auditRuleConfig'
import { appendSystemOperationLog, SYSTEM_ADMIN_OPERATOR, SYSTEM_AUDIT_CANDIDATE_USERS, SYSTEM_AUDIT_INSTITUTIONS } from '../../data/systemAdminConfig'

// ── 辅助小组件 ─────────────────────────────────────────────
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'
const MOCK_PENDING_COUNTS = {
  county_doc_009: 3,
  county_doc_007: 2,
  primary_doc_002: 1,
}

function formatSsoUser(user) {
  return user ? `${user.name}（${user.deptName}/${user.role}）` : ''
}

function getSsoUser(userId) {
  return SYSTEM_AUDIT_CANDIDATE_USERS.find(user => user.userId === userId)
}

function getAuditCandidates(config) {
  if (!config) return []
  return SYSTEM_AUDIT_CANDIDATE_USERS.filter(user =>
    user.institutionId === config.institutionId &&
    user.deptName === config.deptName
  )
}

function getPendingCount({ currentAuditorId }) {
  return MOCK_PENDING_COUNTS[currentAuditorId] || 0
}

function AuditorCell({ auditorName }) {
  return (
    <span className="text-sm whitespace-nowrap text-gray-700">
      {auditorName || <span className="text-orange-500">未配置</span>}
    </span>
  )
}

function PendingAuditorChangeModal({ pendingChange, onCancel, onConfirm }) {
  if (!pendingChange) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-[420px] rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-gray-800 mb-3">审核人变更确认</h3>
        <div className="text-sm text-gray-600 leading-relaxed mb-4">
          当前审核人 <span className="font-medium text-gray-800">{pendingChange.currentAuditorName}</span> 还有{' '}
          <span className="font-semibold text-orange-600">{pendingChange.count}</span> 单未审核的转诊单。
        </div>
        <div className="space-y-3 mb-5">
          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="pendingMode"
              value="transfer"
              checked={pendingChange.mode === 'transfer'}
              onChange={() => onConfirm('transfer', false)}
              className="mt-1"
            />
            <span>移交给新审核人 {pendingChange.nextAuditorName} 继续审核</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="pendingMode"
              value="keep"
              checked={pendingChange.mode === 'keep'}
              onChange={() => onConfirm('keep', false)}
              className="mt-1"
            />
            <span>保留原审核人（仅影响新单据）</span>
          </label>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(pendingChange.mode, true)}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg"
            style={{ background: '#0BBECF' }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}

function SearchableAuditorSelect({ value, options, disabled, error, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = options.find(user => user.userId === value)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredOptions = normalizedQuery
    ? options.filter(user => (
      user.name.toLowerCase().includes(normalizedQuery) ||
      user.deptName.toLowerCase().includes(normalizedQuery) ||
      user.role.toLowerCase().includes(normalizedQuery)
    ))
    : options
  const displayValue = open && !disabled ? query : formatSsoUser(selected)

  return (
    <div className="relative">
      <input
        value={displayValue}
        disabled={disabled}
        onFocus={() => {
          if (disabled) return
          setOpen(true)
          setQuery('')
        }}
        onChange={event => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        placeholder={options.length ? '搜索姓名、科室、角色' : '当前科室无可选审核人'}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF] ${
          disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' :
          error ? 'border-red-400' : 'border-gray-300'
        }`}
      />
      {open && !disabled && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">未找到匹配审核人</div>
          ) : filteredOptions.map(user => (
            <button
              key={user.userId}
              type="button"
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                onChange(user.userId)
                setQuery('')
                setOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-cyan-50"
            >
              {formatSsoUser(user)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AuditRuleConfig() {
  const [configs, setConfigs] = useState(() => AUDIT_RULE_CONFIGS.map(config => ({
    ...config,
    enabled: config.enabled ?? Boolean(config.downwardAuditEnabled),
  })))
  const [selectedInstId, setSelectedInstId] = useState('inst001')
  const [filters, setFilters] = useState({ deptName: '', enabled: 'all' })
  const [applied, setApplied] = useState({ deptName: '', enabled: 'all' })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [pendingChange, setPendingChange] = useState(null)

  const institutions = SYSTEM_AUDIT_INSTITUTIONS

  const visibleConfigs = configs.filter(c => {
    if (c.institutionId !== selectedInstId) return false
    if (applied.deptName.trim() && !c.deptName.includes(applied.deptName.trim())) return false
    if (applied.enabled !== 'all') {
      const wantEnabled = applied.enabled === 'enabled'
      if (Boolean(c.enabled) !== wantEnabled) return false
    }
    return true
  })
  const downwardCandidates = getAuditCandidates(editingConfig)

  function openDrawer(config) {
    setEditingConfig(config)
    setForm({
      enabled: config.enabled ?? Boolean(config.downwardAuditEnabled),
      downwardAuditorUserId: config.downwardAuditorUserId || '',
      downwardAuditorName: config.downwardAuditorName || '',
    })
    setErrors({})
    setPendingChange(null)
    setDrawerOpen(true)
  }

  function handleAuditorChange(direction, userId) {
    const user = getSsoUser(userId)
    setForm(f => ({ ...f, downwardAuditorUserId: userId, downwardAuditorName: user?.name || '' }))
    setErrors(e => ({ ...e, [`${direction}Auditor`]: '' }))
  }

  function handleAuditEnabledChange(nextEnabled) {
    setForm(f => ({ ...f, enabled: nextEnabled }))
    if (!nextEnabled) {
      setErrors(e => ({ ...e, downwardAuditor: '' }))
    }
  }

  function validate() {
    const errs = {}
    if (form.enabled && !form.downwardAuditorUserId) {
      errs.downwardAuditor = '请选择转出审核人'
    }
    return errs
  }

  function buildPatch() {
    return {
      enabled: Boolean(form.enabled),
      downwardAuditEnabled: Boolean(form.enabled),
      downwardAuditorUserId: form.downwardAuditorUserId || null,
      downwardAuditorName: form.downwardAuditorName || null,
    }
  }

  function findPendingAuditorChange(patch) {
    const changes = [
      {
        direction: '转出',
        currentAuditorId: editingConfig.downwardAuditorUserId,
        currentAuditorName: editingConfig.downwardAuditorName,
        nextAuditorId: patch.downwardAuditorUserId,
        nextAuditorName: patch.downwardAuditorName,
      },
    ]

    return changes
      .filter(item => item.currentAuditorId && item.nextAuditorId && item.currentAuditorId !== item.nextAuditorId)
      .map(item => ({ ...item, count: getPendingCount({ currentAuditorId: item.currentAuditorId }) }))
      .find(item => item.count > 0)
  }

  function applySave(patch, pendingResolution = null) {
    const updatedAt = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

    updateAuditRuleConfig(editingConfig.id, patch, SYSTEM_ADMIN_OPERATOR)

    appendSystemOperationLog({
      domain: '审核规则',
      type: '系统配置变更',
      target: `${editingConfig.institutionName} · ${editingConfig.deptName}`,
      detail: {
        配置项: '审核规则',
        机构: editingConfig.institutionName,
        科室: editingConfig.deptName,
        转出审核人: `${editingConfig.downwardAuditorName || '未设置'} → ${patch.downwardAuditorName || '未设置'}`,
        存量未审单据处理: pendingResolution
          ? `${pendingResolution.direction}审核人仍有 ${pendingResolution.count} 单未审核，选择${pendingResolution.mode === 'transfer' ? '移交给新审核人' : '保留原审核人'}`
          : '无存量未审单据需处理',
      },
    })

    setConfigs(prev => prev.map(c =>
      c.id === editingConfig.id
        ? { ...c, ...patch, updatedAt, updatedBy: SYSTEM_ADMIN_OPERATOR }
        : c
    ))
    setDrawerOpen(false)
    setPendingChange(null)
  }

  function handleQuery() {
    setApplied({ ...filters })
  }

  function handleReset() {
    const next = { deptName: '', enabled: 'all' }
    setFilters(next)
    setApplied(next)
  }

  function handleToggleEnabled(config) {
    const nextEnabled = !config.enabled
    const patch = { enabled: nextEnabled, downwardAuditEnabled: nextEnabled }

    updateAuditRuleConfig(config.id, patch, SYSTEM_ADMIN_OPERATOR)
    appendSystemOperationLog({
      domain: '审核规则',
      type: '系统配置变更',
      target: `${config.institutionName} · ${config.deptName}`,
      detail: {
        配置项: '审核规则',
        机构: config.institutionName,
        科室: config.deptName,
        变更字段: '启用状态',
        原值: config.enabled ? '启用' : '停用',
        新值: nextEnabled ? '启用' : '停用',
      },
    })
    setConfigs(prev => prev.map(item =>
      item.id === config.id
        ? { ...item, enabled: nextEnabled, updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'), updatedBy: SYSTEM_ADMIN_OPERATOR }
        : item
    ))
  }

  function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const patch = buildPatch()
    const pendingAuditorChange = findPendingAuditorChange(patch)
    if (pendingAuditorChange) {
      setPendingChange({ ...pendingAuditorChange, patch, mode: 'transfer' })
      return
    }

    applySave(patch)
  }

  function handlePendingConfirm(mode, shouldSubmit) {
    if (!shouldSubmit) {
      setPendingChange(prev => prev ? { ...prev, mode } : prev)
      return
    }
    applySave(pendingChange.patch, { ...pendingChange, mode })
  }

  return (
    <div className="p-5">
      {/* 页面标题 */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">审核规则配置</h2>
        <div className="text-xs text-gray-400 mt-0.5">配置各机构科室的转出院内审核规则 · 变更将写入操作日志</div>
      </div>

      {/* 说明提示 */}
      <div className="mb-4 space-y-2">
        <div className="px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
          基层医疗机构转诊至县级医院：转出院内审核默认开启；县级医院转诊至基层医疗机构：转出院内审核默认关闭，开启转出审核后可能延长患者转出处理时间，请结合院内管理要求配置。
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">所属机构</label>
            <select
              value={selectedInstId}
              onChange={e => setSelectedInstId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white focus:ring-1 focus:ring-[#0BBECF]"
            >
              {institutions.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">科室名称</label>
            <input
              value={filters.deptName}
              onChange={e => setFilters(prev => ({ ...prev, deptName: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
              placeholder="输入科室名称"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">规则状态</label>
            <select
              value={filters.enabled}
              onChange={e => setFilters(prev => ({ ...prev, enabled: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white focus:ring-1 focus:ring-[#0BBECF]"
            >
              <option value="all">全部</option>
              <option value="enabled">启用</option>
              <option value="disabled">停用</option>
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

      {/* 科室列表表格 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 860 }}>
          <thead>
            <tr style={{ background: '#E0F6F9' }}>
              {['序号', '科室名称', '审核人', '状态', '最后更新时间', '操作人', '操作'].map(h => (
                <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleConfigs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                  暂无该机构的审核规则配置
                </td>
              </tr>
            ) : (
              visibleConfigs.map((config, index) => (
                <tr
                  key={config.id}
                  style={{
                    borderBottom: '1px solid #EEF7F9',
                    background: index % 2 === 0 ? '#fff' : '#FAFEFE',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                  onMouseLeave={e => e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#FAFEFE'}
                >
                  <td className={TD}>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>
                      {index + 1}
                    </span>
                  </td>
                  <td className={TD + ' font-medium text-gray-800'}>
                    {config.deptName}
                  </td>
                  <td className={TD}>
                    <AuditorCell auditorName={config.downwardAuditorName} />
                  </td>
                  <td className={TD}>
                    {config.enabled
                      ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">启用</span>
                      : <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded">停用</span>
                    }
                  </td>
                  <td className={`${TD} text-gray-500 text-xs`}>
                    {config.updatedAt}
                  </td>
                  <td className={`${TD} text-gray-500`}>
                    {config.updatedBy}
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openDrawer(config)}
                        className="text-[#0BBECF] hover:text-[#09a8b8] text-sm font-medium"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleToggleEnabled(config)}
                        className={`text-sm font-medium transition-colors ${config.enabled ? 'text-red-500 hover:text-red-600' : 'text-green-600 hover:text-green-700'}`}
                      >
                        {config.enabled ? '停用' : '启用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 编辑弹窗 */}
      {drawerOpen && editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-[680px] max-h-[88vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* 弹窗标题 */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-800">编辑审核规则</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editingConfig.institutionName} · {editingConfig.deptName}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  转出审核配置
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <span className="text-sm font-medium text-gray-700">开启院内审核</span>
                    <div className="inline-flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-label="开启院内审核"
                        aria-checked={Boolean(form.enabled)}
                        onClick={() => handleAuditEnabledChange(!form.enabled)}
                        className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0BBECF]/40 ${form.enabled ? 'bg-[#0BBECF]' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.enabled ? 'translate-x-7' : ''}`} />
                      </button>
                      <span className="w-8 text-sm font-medium text-gray-700">{form.enabled ? '开启' : '关闭'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      审核人 <span className="text-red-500">*</span>
                    </label>
                    <SearchableAuditorSelect
                      value={form.downwardAuditorUserId}
                      options={downwardCandidates}
                      disabled={!form.enabled}
                      error={errors.downwardAuditor}
                      onChange={userId => handleAuditorChange('downward', userId)}
                    />
                    {downwardCandidates.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        当前科室无可选审核人，请前往统一门户为该科室用户分配“县级科主任”或“基层负责人”角色 →
                      </p>
                    )}
                    {errors.downwardAuditor && (
                      <p className="text-xs text-red-500 mt-1">{errors.downwardAuditor}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 说明 */}
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 space-y-1">
                <p>ℹ️ 急诊转入自动豁免院内审核，不受本配置影响。</p>
              </div>

              <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 space-y-1">
                <p className="font-medium text-amber-800">生效影响提示</p>
                <p>保存后，本科室后续新提交的转出申请将按当前审核配置执行；历史申请不受影响。本次修改将写入操作日志。</p>
              </div>
            </div>

            {/* 弹窗底部按钮 */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg"
                style={{ background: '#0BBECF' }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      <PendingAuditorChangeModal
        pendingChange={pendingChange}
        onCancel={() => setPendingChange(null)}
        onConfirm={handlePendingConfirm}
      />
    </div>
  )
}

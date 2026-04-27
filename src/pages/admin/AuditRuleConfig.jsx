import { useState } from 'react'
import { AUDIT_RULE_CONFIGS, updateAuditRuleConfig } from '../../data/auditRuleConfig'
import { appendSystemOperationLog, SYSTEM_ADMIN_OPERATOR, SYSTEM_AUDIT_INSTITUTIONS, SYSTEM_SSO_USERS } from '../../data/systemAdminConfig'

// ── 辅助小组件 ─────────────────────────────────────────────
const TH = 'px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap'
const TD = 'px-4 py-3 text-sm text-gray-800'
const AUDITOR_ROLES = ['县级科主任', '基层负责人']
const MOCK_PENDING_COUNTS = {
  county_doc_009: 3,
  county_doc_007: 2,
  primary_doc_002: 1,
}

function formatSsoUser(user) {
  return user ? `${user.name}（${user.deptName}）` : ''
}

function getSsoUser(userId) {
  return SYSTEM_SSO_USERS.find(user => user.userId === userId)
}

function getAuditCandidates(config) {
  if (!config) return []
  return SYSTEM_SSO_USERS.filter(user =>
    user.enabled &&
    AUDITOR_ROLES.includes(user.role) &&
    user.auditInstitutionId === config.institutionId &&
    user.deptName === config.deptName
  )
}

function getSelectOptions(config, currentUserId) {
  const candidates = getAuditCandidates(config)
  const currentUser = getSsoUser(currentUserId)
  if (currentUser && !candidates.some(user => user.userId === currentUser.userId)) {
    return [currentUser, ...candidates]
  }
  return candidates
}

function getPendingCount({ currentAuditorId }) {
  return MOCK_PENDING_COUNTS[currentAuditorId] || 0
}

function Toggle({ value, onChange, disabled = false }) {
  return (
    <label
      className={`flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={() => !disabled && onChange(!value)}
    >
      <div className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-[#0BBECF]' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-sm text-gray-700">{value ? '开启' : '关闭'}</span>
    </label>
  )
}

function AuditCell({ enabled, auditorName }) {
  if (!enabled) {
    return (
      <span className="text-gray-400 text-sm">
        ○ 关闭
        {auditorName && <span className="ml-1.5">保留审核人：{auditorName}</span>}
      </span>
    )
  }
  return (
    <span className="text-sm">
      <span className="text-green-600 font-medium">● 开启</span>
      {auditorName && (
        <span className="text-gray-600 ml-1.5">审核人：{auditorName}</span>
      )}
      {!auditorName && (
        <span className="text-orange-500 ml-1.5">⚠ 未设审核人</span>
      )}
    </span>
  )
}

function CrossDeptWarning({ config }) {
  const warnings = [
    { label: '转入', user: getSsoUser(config.upwardAuditorUserId) },
    { label: '转出', user: getSsoUser(config.downwardAuditorUserId) },
  ].filter(item => item.user && item.user.deptName !== config.deptName)

  if (warnings.length === 0) return null

  const detail = warnings
    .map(item => `该${item.label}审核人当前所属「${item.user.deptName}」，与规则科室「${config.deptName}」不一致，可能为调岗或数据异常`)
    .join('；')

  return (
    <span
      title={detail}
      className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200"
    >
      ⚠️ 审核人跨科室
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

export default function AuditRuleConfig() {
  const [configs, setConfigs] = useState(AUDIT_RULE_CONFIGS)
  const [selectedInstId, setSelectedInstId] = useState('inst001')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [pendingChange, setPendingChange] = useState(null)

  const institutions = SYSTEM_AUDIT_INSTITUTIONS

  const visibleConfigs = configs.filter(c => c.institutionId === selectedInstId)
  const upwardCandidates = getAuditCandidates(editingConfig)
  const downwardCandidates = getAuditCandidates(editingConfig)
  const upwardOptions = getSelectOptions(editingConfig, form.upwardAuditorUserId)
  const downwardOptions = getSelectOptions(editingConfig, form.downwardAuditorUserId)

  function openDrawer(config) {
    setEditingConfig(config)
    setForm({
      upwardAuditEnabled: config.upwardAuditEnabled,
      upwardAuditorUserId: config.upwardAuditorUserId || '',
      upwardAuditorName: config.upwardAuditorName || '',
      downwardAuditEnabled: config.downwardAuditEnabled,
      downwardAuditorUserId: config.downwardAuditorUserId || '',
      downwardAuditorName: config.downwardAuditorName || '',
    })
    setErrors({})
    setPendingChange(null)
    setDrawerOpen(true)
  }

  function handleAuditorChange(direction, userId) {
    const user = getSsoUser(userId)
    if (direction === 'upward') {
      setForm(f => ({ ...f, upwardAuditorUserId: userId, upwardAuditorName: user?.name || '' }))
    } else {
      setForm(f => ({ ...f, downwardAuditorUserId: userId, downwardAuditorName: user?.name || '' }))
    }
    setErrors(e => ({ ...e, [`${direction}Auditor`]: '' }))
  }

  function validate() {
    const errs = {}
    if (form.upwardAuditEnabled && !form.upwardAuditorUserId) {
      errs.upwardAuditor = '请选择转入审核人'
    }
    if (form.downwardAuditEnabled && !form.downwardAuditorUserId) {
      errs.downwardAuditor = '请选择转出审核人'
    }
    return errs
  }

  function buildPatch() {
    return {
      upwardAuditEnabled: form.upwardAuditEnabled,
      upwardAuditorUserId: form.upwardAuditorUserId || null,
      upwardAuditorName: form.upwardAuditorName || null,
      downwardAuditEnabled: form.downwardAuditEnabled,
      downwardAuditorUserId: form.downwardAuditorUserId || null,
      downwardAuditorName: form.downwardAuditorName || null,
    }
  }

  function findPendingAuditorChange(patch) {
    const changes = [
      {
        direction: '转入',
        currentAuditorId: editingConfig.upwardAuditorUserId,
        currentAuditorName: editingConfig.upwardAuditorName,
        nextAuditorId: patch.upwardAuditorUserId,
        nextAuditorName: patch.upwardAuditorName,
      },
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
        转入审核: `${editingConfig.upwardAuditEnabled ? '开启' : '关闭'} → ${patch.upwardAuditEnabled ? '开启' : '关闭'}`,
        转入审核人: `${editingConfig.upwardAuditorName || '未设置'} → ${patch.upwardAuditorName || '未设置'}`,
        转出审核: `${editingConfig.downwardAuditEnabled ? '开启' : '关闭'} → ${patch.downwardAuditEnabled ? '开启' : '关闭'}`,
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
    <div className="p-6 max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-800">审核规则配置</h1>
        <p className="text-sm text-gray-500 mt-0.5">本页用于配置各机构科室的转入/转出院内审核规则。</p>
      </div>

      {/* 说明提示 */}
      <div className="mb-4 space-y-2">
        <div className="px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
          ⚠️ 转入院内审核默认开启；转出院内审核默认关闭（开启转出审核会导致压床风险）。
        </div>
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          🔒 急诊转入无论开关状态自动豁免院内审核（系统硬规则，不可修改）。
        </div>
      </div>

      {/* 机构切换 */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">选择机构</label>
        <select
          value={selectedInstId}
          onChange={e => setSelectedInstId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF] min-w-[200px]"
        >
          {institutions.map(i => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </div>

      {/* 科室列表表格 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={TH}>科室名称</th>
              <th className={TH}>转入审核</th>
              <th className={TH}>转出审核</th>
              <th className={TH}>最后更新</th>
              <th className={TH}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleConfigs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">
                  暂无该机构的审核规则配置
                </td>
              </tr>
            ) : (
              visibleConfigs.map(config => (
                <tr key={config.id} className="hover:bg-gray-50 transition-colors">
                  <td className={TD}>
                    <span className="font-medium">{config.deptName}</span>
                  </td>
                  <td className={TD}>
                    <AuditCell enabled={config.upwardAuditEnabled} auditorName={config.upwardAuditorName} />
                  </td>
                  <td className={TD}>
                    <AuditCell enabled={config.downwardAuditEnabled} auditorName={config.downwardAuditorName} />
                  </td>
                  <td className={`${TD} text-gray-400 text-xs`}>
                    <div>{config.updatedAt}</div>
                    <div>{config.updatedBy}</div>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center justify-end gap-3">
                      <CrossDeptWarning config={config} />
                      <button
                        onClick={() => openDrawer(config)}
                        className="text-[#0BBECF] hover:text-[#09a8b8] text-sm font-medium"
                      >
                        编辑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 编辑抽屉 */}
      {drawerOpen && editingConfig && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[400px] bg-white shadow-2xl flex flex-col">
            {/* 抽屉标题 */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-800">编辑审核规则</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editingConfig.institutionName} · {editingConfig.deptName}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {/* 抽屉内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* 上转审核 */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  转入审核配置
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">开启院内审核</label>
                    <Toggle
                      value={form.upwardAuditEnabled}
                      onChange={v => {
                        setForm(f => ({ ...f, upwardAuditEnabled: v }))
                        setErrors(e => ({ ...e, upwardAuditor: '' }))
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      审核人 {form.upwardAuditEnabled && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={form.upwardAuditorUserId}
                      disabled={!form.upwardAuditEnabled}
                      onChange={e => handleAuditorChange('upward', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF] ${
                        !form.upwardAuditEnabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' :
                        errors.upwardAuditor ? 'border-red-400' : 'border-gray-300'
                      }`}
                    >
                      <option value="">{upwardCandidates.length ? '请选择审核人' : '当前科室无可选审核人'}</option>
                      {upwardOptions.map(u => (
                        <option key={u.userId} value={u.userId}>{formatSsoUser(u)}</option>
                      ))}
                    </select>
                    {upwardCandidates.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        当前科室无可选审核人，请前往统一门户为该科室用户分配“县级科主任”或“基层负责人”角色 →
                      </p>
                    )}
                    {errors.upwardAuditor && (
                      <p className="text-xs text-red-500 mt-1">{errors.upwardAuditor}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 下转审核 */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  转出审核配置
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">开启院内审核</label>
                    <Toggle
                      value={form.downwardAuditEnabled}
                      onChange={v => {
                        setForm(f => ({ ...f, downwardAuditEnabled: v }))
                        setErrors(e => ({ ...e, downwardAuditor: '' }))
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      审核人 {form.downwardAuditEnabled && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={form.downwardAuditorUserId}
                      disabled={!form.downwardAuditEnabled}
                      onChange={e => handleAuditorChange('downward', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF] ${
                        !form.downwardAuditEnabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' :
                        errors.downwardAuditor ? 'border-red-400' : 'border-gray-300'
                      }`}
                    >
                      <option value="">{downwardCandidates.length ? '请选择审核人' : '当前科室无可选审核人'}</option>
                      {downwardOptions.map(u => (
                        <option key={u.userId} value={u.userId}>{formatSsoUser(u)}</option>
                      ))}
                    </select>
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
                <p>ℹ️ 开关关闭时审核人置灰，配置保留但不生效</p>
                <p>ℹ️ 急诊转入无论此处配置如何，均自动豁免院内审核</p>
              </div>

              <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 space-y-1">
                <p className="font-medium text-amber-800">生效影响提示</p>
                <p>保存后本科室后续新提交的转入/转出单将按当前审核配置执行，已进入流程的单据不回写原审核路径。</p>
                <p>本次修改的审核人、开关状态与修改人将写入配置日志。</p>
              </div>
            </div>

            {/* 抽屉底部按钮 */}
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

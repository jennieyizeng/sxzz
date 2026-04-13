import { useState } from 'react'
import {
  appendSystemOperationLog,
  SYSTEM_TIMEOUT_DOWN_RULES,
  SYSTEM_TIMEOUT_UP_RULES,
} from '../../data/systemAdminConfig'

const AUTO_ACTIONS = ['发送催办通知', '自动解除冻结', '撤回知情同意请求']
const NOTIFY_OPTIONS = ['县级医生', '基层医生', '管理员', '患者（短信）']
const THRESHOLD_UNITS = ['小时', '天']

// ── 样式常量 ────────────────────────────────────────────────
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

// ── Toggle 组件 ─────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer" onClick={() => onChange(!value)}>
      <div className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-[#0BBECF]' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-xs text-gray-500">{value ? '启用' : '禁用'}</span>
    </label>
  )
}

// ── SuccessToast ────────────────────────────────────────────
function SuccessToast({ message }) {
  return (
    <div className="fixed top-4 right-4 z-[60] flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm rounded-lg shadow-lg">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </div>
  )
}

// ── 编辑 Modal ──────────────────────────────────────────────
function EditModal({ rule, onCancel, onSave }) {
  const [thresholdValue, setThresholdValue] = useState(rule.thresholdValue)
  const [thresholdUnit, setThresholdUnit] = useState(rule.thresholdUnit)
  const [autoAction, setAutoAction] = useState(rule.autoAction)
  const [notifyTargets, setNotifyTargets] = useState([...rule.notifyTargets])
  const [enabled, setEnabled] = useState(rule.enabled)
  const [valueErr, setValueErr] = useState('')

  const toggleNotify = (target) => {
    setNotifyTargets(prev =>
      prev.includes(target) ? prev.filter(t => t !== target) : [...prev, target]
    )
  }

  const handleSave = () => {
    const num = Number(thresholdValue)
    if (!thresholdValue || isNaN(num) || num < 1) {
      setValueErr('请输入有效的超时阈值（最小为 1）')
      return
    }
    if (notifyTargets.length === 0) {
      return
    }
    onSave({
      ...rule,
      thresholdValue: num,
      thresholdUnit,
      autoAction,
      notifyTargets,
      enabled,
    })
  }

  const inputCls = (hasErr) =>
    `border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
      hasErr ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-[#0BBECF]'
    }`

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">

          {/* Modal 标题 */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-800">编辑超时规则</h3>
            <button
              onClick={onCancel}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors text-lg leading-none"
            >×</button>
          </div>

          {/* 环节名称（只读） */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">业务环节</label>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-800">{rule.stage}</span>
              {rule.stageNote && (
                <span className="text-xs text-gray-400 mt-0.5">{rule.stageNote}</span>
              )}
            </div>
          </div>

          {/* 超时阈值 */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">
              超时阈值 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={thresholdValue}
                onChange={e => { setThresholdValue(e.target.value); setValueErr('') }}
                className={inputCls(valueErr) + ' w-24'}
                placeholder="数字"
              />
              <select
                value={thresholdUnit}
                onChange={e => setThresholdUnit(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white focus:ring-1 focus:ring-[#0BBECF]"
              >
                {THRESHOLD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {valueErr && <p className="text-xs text-red-500 mt-0.5">{valueErr}</p>}
          </div>

          {/* 超时后自动操作 */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">超时后自动操作</label>
            <select
              value={autoAction}
              onChange={e => setAutoAction(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white focus:ring-1 focus:ring-[#0BBECF]"
            >
              {AUTO_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* 通知对象（多选） */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1.5">
              通知对象
              {notifyTargets.length === 0 && (
                <span className="ml-1 text-red-500">（至少选择一项）</span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {NOTIFY_OPTIONS.map(opt => {
                const checked = notifyTargets.includes(opt)
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors select-none ${
                      checked
                        ? 'border-[#0BBECF] bg-[#E0F6F9] text-[#0BBECF]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                    onClick={() => toggleNotify(opt)}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                      checked ? 'bg-[#0BBECF] border-[#0BBECF]' : 'border-gray-300'
                    }`}>
                      {checked && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </div>
                    {opt}
                  </label>
                )
              })}
            </div>
          </div>

          {/* 状态 Toggle */}
          <div className="mb-5 flex items-center justify-between py-2 border border-gray-100 rounded-lg px-3">
            <div>
              <div className="text-sm text-gray-700 font-medium">规则状态</div>
              <div className="text-xs text-gray-400 mt-0.5">禁用后该环节超时规则不生效</div>
            </div>
            <Toggle value={enabled} onChange={setEnabled} />
          </div>

          <div className="mb-5 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
            <div className="text-xs font-medium text-amber-800 mb-1">生效影响提示</div>
            <div className="text-xs leading-5 text-amber-700">
              保存后规则立即生效，仅影响后续进入“{rule.stage}”环节的单据；已产生的超时记录不会自动回写。
            </div>
          </div>

          {/* 按钮区 */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: '#0BBECF' }}
              onMouseEnter={e => e.currentTarget.style.background = '#0892a0'}
              onMouseLeave={e => e.currentTarget.style.background = '#0BBECF'}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── 规则配置表格 ────────────────────────────────────────────
function RuleTable({ rules, onToggle, onEdit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 680 }}>
        <thead>
          <tr style={{ background: '#E0F6F9' }}>
            {['业务环节', '超时阈值', '超时后自动操作', '通知对象', '状态', '操作'].map(h => (
              <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, i) => (
            <tr
              key={rule.id}
              style={{
                borderBottom: '1px solid #EEF7F9',
                background: i % 2 === 0 ? '#fff' : '#FAFEFE',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}
            >
              {/* 环节 */}
              <td className={TD}>
                <div className="font-medium text-gray-800 text-sm">{rule.stage}</div>
                {rule.stageNote && (
                  <div className="text-xs text-gray-400 mt-0.5">{rule.stageNote}</div>
                )}
              </td>

              {/* 超时阈值 */}
              <td className={TD}>
                <span className="font-medium text-gray-800">{rule.thresholdValue}</span>
                <span className="ml-1 text-xs text-gray-500">{rule.thresholdUnit}</span>
              </td>

              {/* 自动操作 */}
              <td className={TD}>
                <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${
                  rule.autoAction === '发送催办通知'
                    ? 'bg-blue-100 text-blue-700'
                    : rule.autoAction === '提醒转诊中心确认或协商关闭'
                    ? 'bg-purple-100 text-purple-700'
                    : rule.autoAction === '自动解除冻结'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {rule.autoAction}
                </span>
              </td>

              {/* 通知对象 */}
              <td className={TD}>
                <div className="flex flex-wrap gap-1">
                  {rule.notifyTargets.map(t => (
                    <span key={t} className="inline-block text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {t}
                    </span>
                  ))}
                </div>
              </td>

              {/* 状态 Toggle */}
              <td className={TD}>
                <Toggle value={rule.enabled} onChange={(v) => onToggle(rule.id, v)} />
              </td>

              {/* 操作 */}
              <td className={TD}>
                <button
                  onClick={() => onEdit(rule)}
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#0BBECF' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#0892a0'}
                  onMouseLeave={e => e.currentTarget.style.color = '#0BBECF'}
                >
                  编辑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 主页面 ──────────────────────────────────────────────────
export default function TimeoutConfig() {
  const [upRules, setUpRules] = useState(() => SYSTEM_TIMEOUT_UP_RULES.map(rule => ({ ...rule, notifyTargets: [...rule.notifyTargets] })))
  const [downRules, setDownRules] = useState(() => SYSTEM_TIMEOUT_DOWN_RULES.map(rule => ({ ...rule, notifyTargets: [...rule.notifyTargets] })))
  const [editingRule, setEditingRule] = useState(null) // null | rule obj
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1500)
  }

  // 直接 Toggle 切换
  const handleToggle = (ruleSet, setRuleSet) => (id, value) => {
    const originalRule = ruleSet.find(r => r.id === id)
    setRuleSet(prev => prev.map(r => r.id === id ? { ...r, enabled: value } : r))
    if (originalRule) {
      appendSystemOperationLog({
        domain: '超时规则',
        type: '系统配置变更',
        target: originalRule.stage,
        detail: {
          配置项: '超时规则',
          业务环节: originalRule.stage,
          变更字段: '规则状态',
          原值: originalRule.enabled ? '启用' : '禁用',
          新值: value ? '启用' : '禁用',
        },
      })
    }
    showToast(value ? '规则已启用' : '规则已禁用')
  }

  // 保存编辑
  const handleSave = (updated) => {
    const original = [...upRules, ...downRules].find(r => r.id === updated.id)
    const inUp = upRules.some(r => r.id === updated.id)
    if (inUp) {
      setUpRules(prev => prev.map(r => r.id === updated.id ? updated : r))
    } else {
      setDownRules(prev => prev.map(r => r.id === updated.id ? updated : r))
    }
    if (original) {
      appendSystemOperationLog({
        domain: '超时规则',
        type: '系统配置变更',
        target: updated.stage,
        detail: {
          配置项: '超时规则',
          业务环节: updated.stage,
          原阈值: `${original.thresholdValue}${original.thresholdUnit}`,
          新阈值: `${updated.thresholdValue}${updated.thresholdUnit}`,
          原自动动作: original.autoAction,
          新自动动作: updated.autoAction,
          原通知对象: original.notifyTargets.join('、'),
          新通知对象: updated.notifyTargets.join('、'),
        },
      })
    }
    setEditingRule(null)
    showToast('超时规则已更新')
  }

  return (
    <div className="p-5">

      {toast && <SuccessToast message={toast} />}

      {/* 页面标题 */}
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-800">超时规则配置</h2>
        <div className="text-xs text-gray-400 mt-0.5">配置转入、转出各业务环节的超时阈值与自动处理策略</div>
      </div>

      {/* ── 转入流程 ── */}
      <div className="bg-white rounded-xl mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #EEF7F9' }}>
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded text-white text-xs font-bold"
            style={{ background: '#0BBECF' }}
          >上</span>
          <span className="text-sm font-semibold text-gray-800">转入流程超时规则</span>
          <span className="ml-1 text-xs text-gray-400">共 {upRules.length} 条规则，
            <span className="text-green-600 font-medium">{upRules.filter(r => r.enabled).length}</span> 条启用
          </span>
        </div>
        <RuleTable
          rules={upRules}
          onToggle={handleToggle(upRules, setUpRules)}
          onEdit={setEditingRule}
        />
      </div>

      {/* ── 转出流程 ── */}
      <div className="bg-white rounded-xl mb-5" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #EEF7F9' }}>
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded text-white text-xs font-bold"
            style={{ background: '#6366f1' }}
          >下</span>
          <span className="text-sm font-semibold text-gray-800">转出流程超时规则</span>
          <span className="ml-1 text-xs text-gray-400">共 {downRules.length} 条规则，
            <span className="text-green-600 font-medium">{downRules.filter(r => r.enabled).length}</span> 条启用
          </span>
        </div>
        <RuleTable
          rules={downRules}
          onToggle={handleToggle(downRules, setDownRules)}
          onEdit={setEditingRule}
        />
      </div>

      {/* 底部提示 */}
      <div className="flex items-center gap-1 px-1 text-xs text-gray-400">
        <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        规则变更立即生效，仅影响后续进入该环节的单据；历史超时记录请前往
        <a
          href="/admin/anomaly"
          className="font-medium underline underline-offset-2 transition-colors"
          style={{ color: '#0BBECF' }}
          onMouseEnter={e => e.currentTarget.style.color = '#0892a0'}
          onMouseLeave={e => e.currentTarget.style.color = '#0BBECF'}
        >
          异常管理
        </a>
      </div>

      {/* 编辑 Modal */}
      {editingRule && (
        <EditModal
          rule={editingRule}
          onCancel={() => setEditingRule(null)}
          onSave={handleSave}
        />
      )}

    </div>
  )
}

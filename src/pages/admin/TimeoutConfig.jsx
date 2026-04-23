import { useEffect, useMemo, useState } from 'react'
import {
  appendSystemOperationLog,
  SYSTEM_TIMEOUT_BUILT_IN_RULES,
  SYSTEM_TIMEOUT_RULES,
} from '../../data/systemAdminConfig'

const TH = 'px-4 py-3 text-left text-xs font-medium whitespace-nowrap text-[#2D7A86]'
const TD = 'px-4 py-3 text-sm align-top text-gray-700'
const UNIT_LABELS = {
  hour: '小时',
}

function cloneRules() {
  return SYSTEM_TIMEOUT_RULES.map(rule => ({
    ...rule,
    threshold: { ...rule.threshold },
  }))
}

function formatEditableRange(rule) {
  if (!rule.adjustable) return '否'
  const unit = UNIT_LABELS[rule.threshold.unit] || rule.threshold.unit
  return `是（${rule.threshold.min}~${rule.threshold.max}${unit}）`
}

function formatLimit(value, unit) {
  const unitLabel = UNIT_LABELS[unit] || unit
  return `${value} ${unitLabel}`
}

function SuccessToast({ message }) {
  return (
    <div className="fixed top-4 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-green-600 px-5 py-2.5 text-sm text-white shadow-lg">
      {message}
    </div>
  )
}

function EditModal({ rule, onCancel, onSave }) {
  const [thresholdValue, setThresholdValue] = useState(String(rule.threshold.value))
  const [error, setError] = useState('')

  const save = () => {
    const value = Number(thresholdValue)
    if (!Number.isFinite(value)) {
      setError('请输入有效的超时时长。')
      return
    }
    if (value < rule.threshold.min || value > rule.threshold.max) {
      setError(`超时时长允许范围为 ${rule.threshold.min}~${rule.threshold.max}${UNIT_LABELS[rule.threshold.unit] || rule.threshold.unit}。`)
      return
    }
    onSave({
      ...rule,
      threshold: {
        ...rule.threshold,
        value,
      },
      defaultLimit: formatLimit(value, rule.threshold.unit),
      lastModified: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      lastModifiedBy: '林系统管理员',
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800">编辑超时规则</h3>
              <div className="mt-1 text-xs text-gray-400">仅支持调整关键业务时限阈值。</div>
            </div>
            <button onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">×</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">规则名称</label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {rule.businessStep}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">超时时长</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={thresholdValue}
                  onChange={e => {
                    setThresholdValue(e.target.value)
                    setError('')
                  }}
                  className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
                />
                <span className="text-sm text-gray-500">{UNIT_LABELS[rule.threshold.unit] || rule.threshold.unit}</span>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                  允许范围 {rule.threshold.min}~{rule.threshold.max}{UNIT_LABELS[rule.threshold.unit] || rule.threshold.unit}
                </span>
              </div>
              {error ? <div className="mt-1 text-xs text-red-500">{error}</div> : null}
            </div>

            <div>
              <label className="mb-1 block text-xs text-gray-500">提示文案</label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-700">
                {rule.readonlyHint}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-[#0BBECF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0892a0]"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function TimeoutConfig() {
  const [rules, setRules] = useState(() => cloneRules())
  const [editingRule, setEditingRule] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(timer)
  }, [toast])

  const editableRules = useMemo(() => rules.filter(rule => rule.adjustable), [rules])

  const handleSave = (nextRule) => {
    setRules(prev => prev.map(rule => (rule.id === nextRule.id ? nextRule : rule)))
    appendSystemOperationLog({
      domain: '超时规则',
      type: '系统配置变更',
      target: nextRule.businessStep,
      detail: {
        配置项: '关键业务时限',
        默认时限: nextRule.defaultLimit,
        超时处理: nextRule.timeoutAction,
      },
    })
    setEditingRule(null)
    setToast('已保存')
  }

  return (
    <div className="p-5">
      {toast ? <SuccessToast message={toast} /> : null}

      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-800">超时规则</h2>
        <div className="mt-0.5 text-xs text-gray-400">MVP 仅保留关键业务时限配置，不扩展完整规则引擎能力。</div>
      </div>

      <div className="mb-5 rounded-xl border border-[#DDF0F3] bg-white">
        <div className="border-b border-[#EEF7F9] px-4 py-3">
          <div className="text-sm font-semibold text-gray-800">关键业务时限</div>
          <div className="mt-1 text-xs text-gray-400">仅开放少量关键业务时限阈值调整，系统硬约束规则不在此处配置。</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-[#E0F6F9]">
                {['业务环节', '默认时限', '超时处理', '是否可调整', '操作'].map(item => (
                  <th key={item} className={TH} style={{ borderBottom: '1px solid #C8EEF3' }}>{item}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editableRules.map((rule, index) => (
                <tr
                  key={rule.id}
                  style={{
                    borderBottom: '1px solid #EEF7F9',
                    background: index % 2 === 0 ? '#fff' : '#FAFEFE',
                  }}
                >
                  <td className={TD}>{rule.businessStep}</td>
                  <td className={TD}>{rule.defaultLimit}</td>
                  <td className={TD}>{rule.timeoutAction}</td>
                  <td className={TD}>{formatEditableRange(rule)}</td>
                  <td className={TD}>
                    <button
                      type="button"
                      onClick={() => setEditingRule(rule)}
                      className="text-sm font-medium text-[#0BBECF] hover:text-[#0892a0]"
                    >
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-[#DDF0F3] bg-white">
        <div className="border-b border-[#EEF7F9] px-4 py-3">
          <div className="text-sm font-semibold text-gray-800">系统内置规则说明</div>
          <div className="mt-1 text-xs text-gray-400">以下规则为系统硬约束或固定策略，仅展示说明，不在本模块开放配置。</div>
        </div>
        <div className="divide-y divide-[#EEF7F9]">
          {SYSTEM_TIMEOUT_BUILT_IN_RULES.map(rule => (
            <div key={rule.id} className="grid grid-cols-[2fr_1fr_2fr] gap-4 px-4 py-3 text-sm text-gray-700">
              <div>
                <div className="font-medium text-gray-800">{rule.businessStep}</div>
              </div>
              <div>{rule.defaultLimit}</div>
              <div>{rule.timeoutAction}</div>
            </div>
          ))}
        </div>
      </div>

      {editingRule ? (
        <EditModal
          rule={editingRule}
          onCancel={() => setEditingRule(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  )
}

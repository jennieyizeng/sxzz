import { useEffect, useMemo, useState } from 'react'
import {
  appendSystemOperationLog,
  SYSTEM_TIMEOUT_RULES,
} from '../../data/systemAdminConfig'

const TH = 'px-3 py-3 text-left text-xs font-medium whitespace-nowrap text-[#2D7A86]'
const TD = 'px-3 py-3 text-sm align-top text-gray-700'
const GROUPS = [
  {
    key: 'upward',
    title: '基层转县级流程超时规则',
    description: '适用于基层医疗机构发起转诊至上级县级医院的流程。',
  },
  {
    key: 'downward',
    title: '县级转基层流程超时规则',
    description: '适用于县级医院将患者转回基层医疗机构继续康复、随访或后续管理的流程。',
  },
  {
    key: 'other',
    title: '其他超时规则',
    description: '适用于跨流程的规则。',
  },
]
const TABLE_COLUMNS = ['业务环节', '状态流转/触发条件', '超时阈值', '超时后处理', '通知对象', '状态', '操作']

function cloneRules() {
  return SYSTEM_TIMEOUT_RULES.map(rule => ({
    ...rule,
    threshold: rule.threshold ? { ...rule.threshold } : undefined,
    stagedThresholds: rule.stagedThresholds ? rule.stagedThresholds.map(item => ({ ...item })) : undefined,
  }))
}

function formatThreshold(minutes) {
  if (minutes % 1440 === 0) return `${minutes / 1440}天`
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  if (hours && restMinutes) return `${hours}小时${restMinutes}分钟`
  if (hours) return `${hours}小时`
  return `${restMinutes}分钟`
}

function splitMinutes(minutes) {
  return {
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60,
  }
}

function SuccessToast({ message }) {
  return (
    <div className="fixed top-4 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-green-600 px-5 py-2.5 text-sm text-white shadow-lg">
      {message}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 rounded-full transition-colors ${value ? 'bg-[#0BBECF]' : 'bg-gray-300'}`}
      aria-label={value ? '禁用规则' : '启用规则'}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

function ReadonlyItem({ label, value }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      <div className="min-h-[38px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-5 text-gray-700">
        {value}
      </div>
    </div>
  )
}

function EditModal({ rule, onCancel, onSave }) {
  const initial = splitMinutes(rule.threshold?.minutes || 0)
  const [hours, setHours] = useState(String(initial.hours))
  const [minutes, setMinutes] = useState(String(initial.minutes))
  const [error, setError] = useState('')

  const save = () => {
    if (rule.readonlyThreshold) {
      onCancel()
      return
    }

    const hourValue = Number(hours)
    const minuteValue = Number(minutes)
    if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue) || hourValue < 0 || minuteValue < 0 || minuteValue >= 60) {
      setError('请输入有效的小时和分钟。')
      return
    }
    const totalMinutes = hourValue * 60 + minuteValue
    if (totalMinutes < rule.threshold.minMinutes || totalMinutes > rule.threshold.maxMinutes) {
      setError(`超时阈值允许范围为 ${formatThreshold(rule.threshold.minMinutes)}~${formatThreshold(rule.threshold.maxMinutes)}。`)
      return
    }
    onSave({
      ...rule,
      threshold: {
        ...rule.threshold,
        minutes: totalMinutes,
      },
      thresholdLabel: formatThreshold(totalMinutes),
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

          <div className="grid grid-cols-2 gap-4">
            <ReadonlyItem label="业务环节" value={rule.businessStep} />
            <ReadonlyItem label="状态流转/触发条件" value={rule.trigger} />
            <ReadonlyItem label="超时后处理" value={rule.timeoutAction} />
            <ReadonlyItem label="通知对象" value={rule.notifyTargets} />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs text-gray-500">超时阈值</label>
            {rule.readonlyThreshold ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="grid grid-cols-3 gap-2">
                  {rule.stagedThresholds.map(item => (
                    <div key={item.label} className="rounded-lg bg-white px-3 py-2">
                      <div className="text-xs text-gray-400">{item.label}</div>
                      <div className="mt-1 text-sm font-medium text-gray-700">{formatThreshold(item.minutes)}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-400">分段提醒策略暂按系统固定配置展示。</div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={hours}
                    onChange={e => {
                      setHours(e.target.value)
                      setError('')
                    }}
                    className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
                  />
                  <span className="text-sm text-gray-500">小时</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={e => {
                      setMinutes(e.target.value)
                      setError('')
                    }}
                    className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
                  />
                  <span className="text-sm text-gray-500">分钟</span>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                    允许范围 {formatThreshold(rule.threshold.minMinutes)}~{formatThreshold(rule.threshold.maxMinutes)}
                  </span>
                </div>
                {error ? <div className="mt-1 text-xs text-red-500">{error}</div> : null}
              </>
            )}
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

  const groupedRules = useMemo(() => GROUPS.map(group => ({
    ...group,
    rules: rules.filter(rule => rule.group === group.key),
  })), [rules])

  const handleSave = (nextRule) => {
    setRules(prev => prev.map(rule => (rule.id === nextRule.id ? nextRule : rule)))
    appendSystemOperationLog({
      domain: '超时规则',
      type: '系统配置变更',
      target: nextRule.businessStep,
      detail: {
        配置项: '超时阈值',
        超时阈值: nextRule.thresholdLabel,
        超时后处理: nextRule.timeoutAction,
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
      </div>

      <div className="space-y-5">
        {groupedRules.map(group => (
          <div key={group.key} className="rounded-xl border border-[#DDF0F3] bg-white">
            <div className="border-b border-[#EEF7F9] px-4 py-3">
              <div className="text-sm font-semibold text-gray-800">{group.title}</div>
              <div className="mt-1 text-xs text-gray-400">{group.description}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="bg-[#E0F6F9]">
                    {TABLE_COLUMNS.map(item => (
                      <th key={item} className={TH} style={{ borderBottom: '1px solid #C8EEF3' }}>{item}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.rules.map((rule, index) => (
                    <tr
                      key={rule.id}
                      style={{
                        borderBottom: '1px solid #EEF7F9',
                        background: index % 2 === 0 ? '#fff' : '#FAFEFE',
                      }}
                    >
                      <td className={`${TD} font-medium text-gray-800`}>{rule.businessStep}</td>
                      <td className={TD}>{rule.trigger}</td>
                      <td className={TD}>{rule.thresholdLabel}</td>
                      <td className={TD}>{rule.timeoutAction}</td>
                      <td className={TD}>{rule.notifyTargets}</td>
                      <td className={TD}>
                        <div className="flex items-center gap-2">
                          <Toggle
                            value={rule.enabled}
                            onChange={(enabled) => {
                              setRules(prev => prev.map(item => (item.id === rule.id ? { ...item, enabled } : item)))
                            }}
                          />
                          <span className="text-xs text-gray-500">{rule.enabled ? '启用' : '禁用'}</span>
                        </div>
                      </td>
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
        ))}

        <div className="rounded-xl border border-[#DDF0F3] bg-white px-4 py-3 text-xs text-gray-500">
          规则变更后仅影响后续进入该环节的转诊单；历史超时记录请前往异常管理查看。
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

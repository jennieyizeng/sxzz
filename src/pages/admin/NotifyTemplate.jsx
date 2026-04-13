import { useState, useRef } from 'react'
import {
  appendSystemOperationLog,
  SYSTEM_NOTIFY_SMS_TEMPLATES,
  SYSTEM_NOTIFY_SYS_TEMPLATES,
  SYSTEM_NOTIFY_VARIABLES,
} from '../../data/systemAdminConfig'

const MAX_CONTENT_LEN = 200

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
function EditModal({ template, isSms, onCancel, onSave }) {
  const [content, setContent] = useState(template.content)
  const [enabled, setEnabled] = useState(template.enabled)
  const [contentErr, setContentErr] = useState('')
  const textareaRef = useRef(null)

  const insertVariable = (varKey) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const newContent = content.slice(0, start) + varKey + content.slice(end)
    if (newContent.length <= MAX_CONTENT_LEN) {
      setContent(newContent)
      setContentErr('')
      // 光标定位到插入点后
      setTimeout(() => {
        el.focus()
        el.setSelectionRange(start + varKey.length, start + varKey.length)
      }, 0)
    }
  }

  const handleSave = () => {
    if (!content.trim()) {
      setContentErr('请填写模板内容')
      return
    }
    if (content.length > MAX_CONTENT_LEN) {
      setContentErr(`模板内容不得超过 ${MAX_CONTENT_LEN} 字`)
      return
    }
    onSave({ ...template, content: content.trim(), enabled })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">

          {/* Modal 标题 */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-800">
              编辑{isSms ? '短信' : '系统内消息'}模板
            </h3>
            <button
              onClick={onCancel}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors text-lg leading-none"
            >×</button>
          </div>

          {/* 事件触发（只读） */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">事件触发</label>
              <div className="text-sm text-gray-700 font-medium">{template.event}</div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">接收{isSms ? '对象' : '角色'}</label>
              <div className="flex flex-wrap gap-1">
                {template.receivers.map(r => (
                  <span key={r} className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{r}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 模板标题或短信签名（只读） */}
          {isSms ? (
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">短信签名（固定）</label>
              <div className="inline-block text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">
                {template.smsSign}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">消息标题（只读）</label>
              <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg leading-snug">
                {template.title}
              </div>
            </div>
          )}

          {/* 模板内容 */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">
              {isSms ? '短信正文' : '消息内容'}
              <span className="text-red-500 ml-0.5">*</span>
              <span className="ml-1 text-gray-300">（最多 {MAX_CONTENT_LEN} 字）</span>
            </label>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => {
                setContent(e.target.value)
                if (e.target.value.trim()) setContentErr('')
              }}
              rows={isSms ? 4 : 5}
              placeholder="请输入模板内容，可使用下方变量"
              className={`w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 ${
                contentErr ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-[#0BBECF]'
              }`}
            />
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs text-red-500">{contentErr}</span>
              <span className={`text-xs ${content.length > MAX_CONTENT_LEN ? 'text-red-500' : 'text-gray-400'}`}>
                {content.length} / {MAX_CONTENT_LEN}
              </span>
            </div>
          </div>

          {/* 变量提示区 */}
          <div className="mb-5 bg-gray-50 border border-gray-100 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-2 font-medium">可用变量（点击插入到光标位置）</div>
            <div className="flex flex-wrap gap-1.5">
              {SYSTEM_NOTIFY_VARIABLES.map(v => (
                <button
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-dashed transition-colors"
                  style={{ borderColor: '#0BBECF', color: '#0BBECF', background: '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#E0F6F9'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <code className="font-mono">{v.key}</code>
                  <span className="text-gray-400">=</span>
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 状态 Toggle */}
          <div className="mb-5 flex items-center justify-between py-2 border border-gray-100 rounded-lg px-3">
            <div>
              <div className="text-sm text-gray-700 font-medium">模板状态</div>
              <div className="text-xs text-gray-400 mt-0.5">禁用后该事件不会发送此通知</div>
            </div>
            <Toggle value={enabled} onChange={setEnabled} />
          </div>

          <div className="mb-5 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
            <div className="text-xs font-medium text-amber-800 mb-1">生效影响提示</div>
            <div className="text-xs leading-5 text-amber-700">
              保存后该模板会立即用于“{template.event}”事件；已发送通知不回溯修改，后续新通知按当前模板内容生成。
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

// ── 系统内消息模板列表 ──────────────────────────────────────
function SysTemplateTable({ templates, onToggle, onEdit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 720 }}>
        <thead>
          <tr style={{ background: '#E0F6F9' }}>
            {['ID', '事件触发', '模板标题', '接收角色', '状态', '操作'].map(h => (
              <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {templates.map((tpl, i) => (
            <tr
              key={tpl.id}
              style={{
                borderBottom: '1px solid #EEF7F9',
                background: i % 2 === 0 ? '#fff' : '#FAFEFE',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}
            >
              <td className={TD + ' font-mono text-xs text-gray-500'}>{tpl.id}</td>
              <td className={TD}>
                <span className="inline-block text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                  {tpl.event}
                </span>
              </td>
              <td className={TD + ' text-gray-700 max-w-[240px]'}>
                <span className="block truncate" title={tpl.title}>{tpl.title}</span>
              </td>
              <td className={TD}>
                <div className="flex flex-wrap gap-1">
                  {tpl.receivers.map(r => (
                    <span key={r} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{r}</span>
                  ))}
                </div>
              </td>
              <td className={TD}>
                <Toggle value={tpl.enabled} onChange={(v) => onToggle(tpl.id, v)} />
              </td>
              <td className={TD}>
                <button
                  onClick={() => onEdit(tpl)}
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

// ── 短信模板列表 ────────────────────────────────────────────
function SmsTemplateTable({ templates, onToggle, onEdit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 680 }}>
        <thead>
          <tr style={{ background: '#E0F6F9' }}>
            {['ID', '事件触发', '短信内容（前60字）', '接收对象', '状态', '操作'].map(h => (
              <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {templates.map((tpl, i) => {
            const preview = (tpl.smsSign + tpl.content).slice(0, 60) + ((tpl.smsSign + tpl.content).length > 60 ? '…' : '')
            return (
              <tr
                key={tpl.id}
                style={{
                  borderBottom: '1px solid #EEF7F9',
                  background: i % 2 === 0 ? '#fff' : '#FAFEFE',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}
              >
                <td className={TD + ' font-mono text-xs text-gray-500'}>{tpl.id}</td>
                <td className={TD}>
                  <span className="inline-block text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                    {tpl.event}
                  </span>
                </td>
                <td className={TD + ' text-gray-600 text-xs max-w-[260px]'}>
                  <span className="block truncate" title={tpl.smsSign + tpl.content}>{preview}</span>
                </td>
                <td className={TD}>
                  <div className="flex flex-wrap gap-1">
                    {tpl.receivers.map(r => (
                      <span key={r} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{r}</span>
                    ))}
                  </div>
                </td>
                <td className={TD}>
                  <Toggle value={tpl.enabled} onChange={(v) => onToggle(tpl.id, v)} />
                </td>
                <td className={TD}>
                  <button
                    onClick={() => onEdit(tpl)}
                    className="text-sm font-medium transition-colors"
                    style={{ color: '#0BBECF' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#0892a0'}
                    onMouseLeave={e => e.currentTarget.style.color = '#0BBECF'}
                  >
                    编辑
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── 主页面 ──────────────────────────────────────────────────
export default function NotifyTemplate() {
  const [activeTab, setActiveTab] = useState('sys') // 'sys' | 'sms'
  const [sysTemplates, setSysTemplates] = useState(() => SYSTEM_NOTIFY_SYS_TEMPLATES.map(t => ({ ...t })))
  const [smsTemplates, setSmsTemplates] = useState(() => SYSTEM_NOTIFY_SMS_TEMPLATES.map(t => ({ ...t })))
  const [editingTpl, setEditingTpl] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1500)
  }

  const isSmsEdit = editingTpl ? smsTemplates.some(t => t.id === editingTpl.id) : false

  const handleToggle = (id, value) => {
    const inSys = sysTemplates.some(t => t.id === id)
    const original = inSys ? sysTemplates.find(t => t.id === id) : smsTemplates.find(t => t.id === id)
    if (inSys) {
      setSysTemplates(prev => prev.map(t => t.id === id ? { ...t, enabled: value } : t))
    } else {
      setSmsTemplates(prev => prev.map(t => t.id === id ? { ...t, enabled: value } : t))
    }
    if (original) {
      appendSystemOperationLog({
        domain: '通知模板',
        type: '系统配置变更',
        target: original.event,
        detail: {
          配置项: '通知模板',
          模板名称: inSys ? original.title : `${original.smsSign}${original.event}`,
          变更字段: '模板状态',
          原值: original.enabled ? '启用' : '禁用',
          新值: value ? '启用' : '禁用',
        },
      })
    }
    showToast(value ? '模板已启用' : '模板已禁用')
  }

  const handleSave = (updated) => {
    const inSys = sysTemplates.some(t => t.id === updated.id)
    const original = inSys ? sysTemplates.find(t => t.id === updated.id) : smsTemplates.find(t => t.id === updated.id)
    if (inSys) {
      setSysTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
    } else {
      setSmsTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
    }
    if (original) {
      appendSystemOperationLog({
        domain: '通知模板',
        type: '系统配置变更',
        target: updated.event,
        detail: {
          配置项: '通知模板',
          模板名称: inSys ? updated.title : `${updated.smsSign}${updated.event}`,
          变更字段: '模板内容',
          原值: original.content,
          新值: updated.content,
          状态变化: `${original.enabled ? '启用' : '禁用'} → ${updated.enabled ? '启用' : '禁用'}`,
        },
      })
    }
    setEditingTpl(null)
    showToast('通知模板已更新')
  }

  return (
    <div className="p-5">

      {toast && <SuccessToast message={toast} />}

      {/* 页面标题 */}
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-800">通知模板配置</h2>
        <div className="text-xs text-gray-400 mt-0.5">管理各业务事件的消息通知内容，支持系统内消息与短信两种渠道</div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 w-fit" style={{ border: '1px solid #DDF0F3' }}>
        {[
          { key: 'sys', label: '系统内消息', count: sysTemplates.length },
          { key: 'sms', label: '短信通知', count: smsTemplates.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={activeTab === tab.key
              ? { background: '#0BBECF', color: '#fff' }
              : { color: '#6b7280' }
            }
          >
            {tab.label}
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs leading-none"
              style={activeTab === tab.key
                ? { background: 'rgba(255,255,255,0.3)', color: '#fff' }
                : { background: '#e5e7eb', color: '#6b7280' }
              }
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 内容区卡片 */}
      <div className="bg-white rounded-xl" style={{ border: '1px solid #DDF0F3' }}>
        {/* 区块标题 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #EEF7F9' }}>
          <div>
            <span className="text-sm font-semibold text-gray-800">
              {activeTab === 'sys' ? '系统内消息模板' : '短信通知模板'}
            </span>
            <span className="ml-2 text-xs text-gray-400">
              {activeTab === 'sys'
                ? '系统内推送，医护人员登录后可在消息中心查看'
                : '通过短信发送，主要用于通知患者'
              }
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            启用：{activeTab === 'sys'
              ? sysTemplates.filter(t => t.enabled).length
              : smsTemplates.filter(t => t.enabled).length
            } 条
            <span className="ml-2 inline-block w-2 h-2 rounded-full bg-gray-300"></span>
            禁用：{activeTab === 'sys'
              ? sysTemplates.filter(t => !t.enabled).length
              : smsTemplates.filter(t => !t.enabled).length
            } 条
          </div>
        </div>

        {activeTab === 'sys' ? (
          <SysTemplateTable
            templates={sysTemplates}
            onToggle={handleToggle}
            onEdit={setEditingTpl}
          />
        ) : (
          <SmsTemplateTable
            templates={smsTemplates}
            onToggle={handleToggle}
            onEdit={setEditingTpl}
          />
        )}

        {/* 底部注释 */}
        <div className="px-4 py-2.5 text-xs text-gray-400 flex items-center gap-1" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {activeTab === 'sys'
            ? '系统内消息模板变更立即生效。模板标题与接收角色由系统固定，不可修改，仅可编辑内容与启用状态。'
            : '短信签名【绵竹医联体】固定，不可修改。短信内容需符合运营商规范，建议不超过 70 字（含签名）以避免按多条计费。'
          }
        </div>
      </div>

      {/* 编辑 Modal */}
      {editingTpl && (
        <EditModal
          template={editingTpl}
          isSms={isSmsEdit}
          onCancel={() => setEditingTpl(null)}
          onSave={handleSave}
        />
      )}

    </div>
  )
}

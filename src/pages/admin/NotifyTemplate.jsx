import { useState, useRef } from 'react'

// ── Mock 数据 ──────────────────────────────────────────────
const INIT_SYS_TEMPLATES = [
  {
    id: 'N001',
    event: '上转申请提交',
    title: '您有新的上转申请待审核',
    content: '您好，基层医生 {doctor_name} 于 {created_time} 提交了一份上转申请（转诊单号：{ref_no}），患者：{patient_name}，请及时登录系统处理。',
    receivers: ['县级医生'],
    enabled: true,
  },
  {
    id: 'N002',
    event: '审核通过',
    title: '您的上转申请已通过审核',
    content: '您好，您提交的上转申请（转诊单号：{ref_no}）已审核通过，患者 {patient_name} 可按约前往县级医院就诊，请知悉。',
    receivers: ['基层医生'],
    enabled: true,
  },
  {
    id: 'N003',
    event: '审核拒绝',
    title: '您的上转申请被退回',
    content: '您好，您提交的上转申请（转诊单号：{ref_no}）已被退回，退回原因请登录系统查看详情，如有疑问请联系审核医生。',
    receivers: ['基层医生'],
    enabled: true,
  },
  {
    id: 'N004',
    event: '转诊超时提醒',
    title: '转诊单 {ref_no} 已超时，请及时处理',
    content: '系统提醒：转诊单 {ref_no}（患者：{patient_name}）当前环节已超时，请尽快处理，避免影响患者就诊。如已处理请忽略本通知。',
    receivers: ['县级医生', '管理员'],
    enabled: true,
  },
  {
    id: 'N005',
    event: '下转申请提交',
    title: '您有新的下转康复方案待接收',
    content: '您好，县级医院已为患者 {patient_name}（转诊单号：{ref_no}）制定康复方案，请登录系统确认接收，继续开展后续康复管理。',
    receivers: ['基层医生'],
    enabled: true,
  },
  {
    id: 'N006',
    event: '管理员代操作',
    title: '管理员已代为处理转诊单 {ref_no}',
    content: '系统通知：管理员已代为处理转诊单 {ref_no}（患者：{patient_name}），操作详情请登录系统查看操作日志。',
    receivers: ['相关医生'],
    enabled: true,
  },
]

const INIT_SMS_TEMPLATES = [
  {
    id: 'S001',
    event: '知情同意请求',
    smsSign: '【绵竹医联体】',
    content: '您有一份知情同意书待签署，转诊单号：{ref_no}，请及时登录"绵竹医联体"平台完成签署，如有疑问请联系您的接诊医生。',
    receivers: ['患者'],
    enabled: true,
  },
  {
    id: 'S002',
    event: '转诊成功通知',
    smsSign: '【绵竹医联体】',
    content: '您的转诊申请已成功，转诊单号：{ref_no}，请按约前往 {hospital_name} 就诊。如需查看详情，请联系您的基层医生或拨打医联体服务热线。',
    receivers: ['患者'],
    enabled: true,
  },
  {
    id: 'S003',
    event: '超时催办（患者）',
    smsSign: '【绵竹医联体】',
    content: '您的转诊单（单号：{ref_no}）尚有待处理事项，请尽快联系您的医生处理，如有疑问请拨打医联体服务热线。',
    receivers: ['患者'],
    enabled: false,
  },
]

// ── 可用变量说明 ────────────────────────────────────────────
const VARIABLES = [
  { key: '{ref_no}',       label: '转诊单号' },
  { key: '{patient_name}', label: '患者姓名' },
  { key: '{doctor_name}',  label: '医生姓名' },
  { key: '{hospital_name}',label: '医院名称' },
  { key: '{created_time}', label: '创建时间' },
]

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
              {VARIABLES.map(v => (
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
  const [sysTemplates, setSysTemplates] = useState(INIT_SYS_TEMPLATES)
  const [smsTemplates, setSmsTemplates] = useState(INIT_SMS_TEMPLATES)
  const [editingTpl, setEditingTpl] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1500)
  }

  const isSmsEdit = editingTpl ? smsTemplates.some(t => t.id === editingTpl.id) : false

  const handleToggle = (id, value) => {
    const inSys = sysTemplates.some(t => t.id === id)
    if (inSys) {
      setSysTemplates(prev => prev.map(t => t.id === id ? { ...t, enabled: value } : t))
    } else {
      setSmsTemplates(prev => prev.map(t => t.id === id ? { ...t, enabled: value } : t))
    }
    showToast(value ? '模板已启用' : '模板已禁用')
  }

  const handleSave = (updated) => {
    const inSys = sysTemplates.some(t => t.id === updated.id)
    if (inSys) {
      setSysTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
    } else {
      setSmsTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
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

import { useState, useMemo } from 'react'

// ── Mock 数据 ──────────────────────────────────────────────
const UPWARD_FIELDS = [
  { id: 'f1', name: '患者姓名',          section: '患者信息', type: '文本',     visible: true,  required: true,  hint: '' },
  { id: 'f2', name: '身份证号',          section: '患者信息', type: '文本',     visible: true,  required: false, hint: '用于身份核验，建议填写' },
  { id: 'f3', name: '联系电话',          section: '患者信息', type: '文本',     visible: true,  required: true,  hint: '' },
  { id: 'f4', name: '初步诊断（ICD-10）', section: '诊断信息', type: 'ICD搜索', visible: true,  required: true,  hint: '' },
  { id: 'f5', name: '主诉与现病史',      section: '诊断信息', type: '多行文本', visible: true,  required: true,  hint: '建议不少于50字' },
  { id: 'f6', name: '转诊原因',          section: '转诊说明', type: '多行文本', visible: true,  required: true,  hint: '' },
  { id: 'f7', name: '病历附件',          section: '转诊说明', type: '文件上传', visible: true,  required: false, hint: '支持 PDF、图片格式，单文件不超过 10MB' },
  { id: 'f8', name: '急诊标记',          section: '转诊说明', type: '勾选框',   visible: true,  required: false, hint: '仅限真实急诊情况勾选' },
]

// Assumption: 下转模板字段，结构与上转类似，实际内容待产品确认
const DOWNWARD_FIELDS = [
  { id: 'd1', name: '患者姓名',     section: '患者信息', type: '文本',     visible: true,  required: true,  hint: '' },
  { id: 'd2', name: '身份证号',     section: '患者信息', type: '文本',     visible: true,  required: false, hint: '用于身份核验，建议填写' },
  { id: 'd3', name: '联系电话',     section: '患者信息', type: '文本',     visible: true,  required: true,  hint: '' },
  { id: 'd4', name: '出院诊断',     section: '诊断信息', type: 'ICD搜索', visible: true,  required: true,  hint: '' },
  { id: 'd5', name: '住院小结',     section: '诊断信息', type: '多行文本', visible: true,  required: true,  hint: '包含治疗经过、用药情况' },
  { id: 'd6', name: '康复方案',     section: '康复指导', type: '多行文本', visible: true,  required: true,  hint: '' },
  { id: 'd7', name: '注意事项',     section: '康复指导', type: '多行文本', visible: false, required: false, hint: '建议填写用药禁忌、复查时间' },
  { id: 'd8', name: '下转病历附件', section: '康复指导', type: '文件上传', visible: true,  required: false, hint: '支持 PDF、图片格式，单文件不超过 10MB' },
]

const MOCK_PHRASES = [
  { id: 'p1', scene: '转诊原因',     content: '基层检查设备有限，需上级医院进一步检查明确诊断。' },
  { id: 'p2', scene: '转诊原因',     content: '患者病情危重，需上级医院急诊处理。' },
  { id: 'p3', scene: '主诉与现病史', content: '患者反复出现上述症状，门诊保守治疗效果不佳，特申请上转进一步诊治。' },
  { id: 'p4', scene: '康复方案',     content: '患者急性期治疗已完成，病情稳定，转基层继续康复管理，定期复查。' },
]

const SCENES = ['转诊原因', '主诉与现病史', '康复方案', '注意事项']

let _phraseId = 5

// ── 常量 ───────────────────────────────────────────────────
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

const SCENE_TAG = {
  '转诊原因':     'bg-blue-100 text-blue-700',
  '主诉与现病史': 'bg-purple-100 text-purple-700',
  '康复方案':     'bg-green-100 text-green-700',
  '注意事项':     'bg-orange-100 text-orange-700',
}

const SECTION_BG = {
  '患者信息': 'bg-blue-50/40',
  '诊断信息': 'bg-amber-50/40',
  '转诊说明': 'bg-green-50/40',
  '康复指导': 'bg-purple-50/40',
}

// ── 辅助组件 ───────────────────────────────────────────────
function Toggle({ value, onChange, disabled = false }) {
  return (
    <label
      className={`flex items-center gap-2 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={() => !disabled && onChange(!value)}
    >
      <div className={`w-10 h-5 rounded-full transition-colors relative ${value && !disabled ? 'bg-[#0BBECF]' : value ? 'bg-[#0BBECF]' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </label>
  )
}

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

// ── 快捷短语弹窗 ───────────────────────────────────────────
function PhraseModal({ initial, onCancel, onSave }) {
  const isEdit = !!initial
  const [scene,   setScene]   = useState(initial?.scene   || SCENES[0])
  const [content, setContent] = useState(initial?.content || '')
  const [contentErr, setContentErr] = useState('')

  const handleSave = () => {
    if (!content.trim()) { setContentErr('请填写短语内容'); return }
    if (content.trim().length > 200) { setContentErr('短语内容不得超过 200 字'); return }
    onSave({ scene, content: content.trim() })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">{isEdit ? '编辑快捷短语' : '新增快捷短语'}</h3>
            <button
              onClick={onCancel}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors text-lg leading-none"
            >×</button>
          </div>

          {/* 适用场景 */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1.5">
              适用场景 <span className="text-red-500">*</span>
            </label>
            <select
              value={scene}
              onChange={e => setScene(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white focus:ring-1 focus:ring-[#0BBECF]"
            >
              {SCENES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* 短语内容 */}
          <div className="mb-5">
            <label className="block text-xs text-gray-500 mb-1.5">
              短语内容 <span className="text-red-500">*</span>
              <span className="ml-1 text-gray-300">（最多 200 字）</span>
            </label>
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value); if (e.target.value.trim()) setContentErr('') }}
              rows={4}
              placeholder="请输入短语内容"
              className={`w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 ${
                contentErr ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-[#0BBECF]'
              }`}
            />
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs text-red-500">{contentErr}</span>
              <span className={`text-xs ${content.length > 200 ? 'text-red-500' : 'text-gray-400'}`}>
                {content.length} / 200
              </span>
            </div>
          </div>

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

// ── 删除确认弹窗 ───────────────────────────────────────────
function DeletePhraseModal({ phrase, onCancel, onConfirm }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
          <div className="text-sm font-semibold text-gray-800 mb-2">删除快捷短语</div>
          <div className="text-sm text-gray-500 mb-5 leading-relaxed">
            确认删除「<span className="font-medium text-gray-700">{phrase.scene}</span>」场景下的该短语？删除后无法恢复。
          </div>
          <div className="flex justify-end gap-2">
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
              确认删除
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── 字段配置区 ─────────────────────────────────────────────
function FieldConfigTable({ fields, onChange }) {
  // 分组用于显示分区背景
  const sections = useMemo(() => {
    const map = {}
    fields.forEach(f => {
      if (!map[f.section]) map[f.section] = []
      map[f.section].push(f)
    })
    return map
  }, [fields])

  const updateField = (id, key, val) => {
    onChange(fields.map(f => {
      if (f.id !== id) return f
      // 若关闭显示，同时强制关闭必填
      if (key === 'visible' && !val) return { ...f, visible: false, required: false }
      return { ...f, [key]: val }
    }))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 700 }}>
        <thead>
          <tr style={{ background: '#E0F6F9' }}>
            {['字段名称', '所属分区', '字段类型', '是否显示', '是否必填', '帮助文字'].map(h => (
              <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => {
            const sectionFields = sections[f.section] || []
            const isFirstInSection = sectionFields[0]?.id === f.id
            const sectionBg = SECTION_BG[f.section] || ''

            return (
              <tr
                key={f.id}
                className={sectionBg}
                style={{ borderBottom: '1px solid #EEF7F9' }}
              >
                <td className={TD + ' font-medium text-gray-800'}>{f.name}</td>
                <td className={TD}>
                  {isFirstInSection ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                      {f.section}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 pl-2">{f.section}</span>
                  )}
                </td>
                <td className={TD + ' text-gray-500 text-xs'}>{f.type}</td>
                <td className={TD}>
                  <Toggle
                    value={f.visible}
                    onChange={v => updateField(f.id, 'visible', v)}
                  />
                </td>
                <td className={TD}>
                  <Toggle
                    value={f.required}
                    onChange={v => updateField(f.id, 'required', v)}
                    disabled={!f.visible}
                  />
                  {!f.visible && (
                    <span className="text-xs text-gray-400 ml-1">（隐藏中）</span>
                  )}
                </td>
                <td className={TD}>
                  <input
                    value={f.hint}
                    onChange={e => updateField(f.id, 'hint', e.target.value)}
                    placeholder="可填写字段说明"
                    className="border-0 border-b border-gray-200 px-1 py-0.5 text-xs text-gray-500 w-full focus:outline-none focus:border-[#0BBECF]"
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── 主页面 ─────────────────────────────────────────────────
export default function FormTemplate() {
  const [activeTab, setActiveTab] = useState('up') // 'up' | 'down'

  const [upFields,   setUpFields]   = useState(UPWARD_FIELDS)
  const [downFields, setDownFields] = useState(DOWNWARD_FIELDS)

  const [phrases,       setPhrases]       = useState(MOCK_PHRASES)
  const [phraseModal,   setPhraseModal]   = useState(null) // null | 'create' | { phrase }
  const [deleteTarget,  setDeleteTarget]  = useState(null) // phrase obj

  const [toast, setToast] = useState('')
  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1500)
  }

  const currentFields    = activeTab === 'up' ? upFields   : downFields
  const setCurrentFields = activeTab === 'up' ? setUpFields : setDownFields

  const handleSaveFields = () => {
    // TODO: 调用后端 API 保存字段配置
    showToast('字段配置已保存')
  }

  const handleSavePhrase = (data) => {
    if (phraseModal === 'create') {
      const newP = { id: `p${_phraseId++}`, ...data }
      setPhrases(prev => [...prev, newP])
      showToast('快捷短语已新增')
    } else {
      setPhrases(prev => prev.map(p => p.id === phraseModal.phrase.id ? { ...p, ...data } : p))
      showToast('快捷短语已更新')
    }
    setPhraseModal(null)
  }

  const handleDeletePhrase = () => {
    setPhrases(prev => prev.filter(p => p.id !== deleteTarget.id))
    showToast('快捷短语已删除')
    setDeleteTarget(null)
  }

  return (
    <div className="p-5">

      {toast && <SuccessToast message={toast} />}

      {/* 页面标题 */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">转诊单模板配置</h2>
        <div className="text-xs text-gray-400 mt-0.5">转诊表单字段配置 · 快捷短语管理</div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 w-fit" style={{ border: '1px solid #DDF0F3' }}>
        {[
          { key: 'up',   label: '上转模板' },
          { key: 'down', label: '下转模板' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={activeTab === tab.key
              ? { background: '#0BBECF', color: '#fff' }
              : { color: '#6b7280' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 字段配置区 ── */}
      <div className="bg-white rounded-xl mb-4" style={{ border: '1px solid #DDF0F3' }}>
        {/* 区块标题栏 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #EEF7F9' }}>
          <div>
            <span className="text-sm font-semibold text-gray-800">字段配置</span>
            <span className="ml-2 text-xs text-gray-400">调整字段的显示状态与必填规则，不可新增或删除字段</span>
          </div>
          <button
            onClick={handleSaveFields}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-1.5"
            style={{ background: '#0BBECF' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0892a0'}
            onMouseLeave={e => e.currentTarget.style.background = '#0BBECF'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            保存字段配置
          </button>
        </div>

        <FieldConfigTable fields={currentFields} onChange={setCurrentFields} />
      </div>

      {/* ── 快捷短语区 ── */}
      <div className="bg-white rounded-xl" style={{ border: '1px solid #DDF0F3' }}>
        {/* 区块标题栏 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #EEF7F9' }}>
          <div>
            <span className="text-sm font-semibold text-gray-800">快捷短语</span>
            <span className="ml-2 text-xs text-gray-400">医生填写表单时可快速插入预设短语</span>
          </div>
          <button
            onClick={() => setPhraseModal('create')}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-1.5"
            style={{ background: '#0BBECF' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0892a0'}
            onMouseLeave={e => e.currentTarget.style.background = '#0BBECF'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增短语
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['序号', '适用场景', '短语内容', '操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {phrases.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400 text-sm">
                    暂无快捷短语，点击右上角「新增短语」添加
                  </td>
                </tr>
              ) : phrases.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid #EEF7F9',
                    background: i % 2 === 0 ? '#fff' : '#FAFEFE',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}
                >
                  <td className={TD + ' w-12'}>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>
                      {i + 1}
                    </span>
                  </td>
                  <td className={TD + ' w-36'}>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${SCENE_TAG[p.scene] || 'bg-gray-100 text-gray-600'}`}>
                      {p.scene}
                    </span>
                  </td>
                  <td className={TD + ' text-gray-700 leading-relaxed'}>{p.content}</td>
                  <td className={TD + ' w-28'}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPhraseModal({ phrase: p })}
                        className="text-sm font-medium transition-colors"
                        style={{ color: '#0BBECF' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#0892a0'}
                        onMouseLeave={e => e.currentTarget.style.color = '#0BBECF'}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增/编辑短语弹窗 */}
      {phraseModal && (
        <PhraseModal
          initial={phraseModal === 'create' ? null : phraseModal.phrase}
          onCancel={() => setPhraseModal(null)}
          onSave={handleSavePhrase}
        />
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <DeletePhraseModal
          phrase={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeletePhrase}
        />
      )}

    </div>
  )
}

import { useState, useMemo } from 'react'

// ── Mock 数据 ──────────────────────────────────────────────
const MOCK_DISEASES = [
  { id: 'D001', code: 'I10',   name: '原发性高血压',       category: '循环系统',   priority: true,  enabled: true  },
  { id: 'D002', code: 'I63.9', name: '脑梗死',             category: '循环系统',   priority: true,  enabled: true  },
  { id: 'D003', code: 'E11.9', name: '2型糖尿病不伴并发症', category: '内分泌系统', priority: true,  enabled: true  },
  { id: 'D004', code: 'J18.9', name: '肺炎',               category: '呼吸系统',   priority: false, enabled: true  },
  { id: 'D005', code: 'I50.9', name: '心力衰竭',           category: '循环系统',   priority: true,  enabled: true  },
  { id: 'D006', code: 'G40.9', name: '癫痫',               category: '神经系统',   priority: false, enabled: true  },
  { id: 'D007', code: 'K92.1', name: '黑粪',               category: '其他',       priority: false, enabled: true  },
  { id: 'D008', code: 'I48.9', name: '心房颤动',           category: '循环系统',   priority: false, enabled: true  },
  { id: 'D009', code: 'N18.9', name: '慢性肾脏病',         category: '其他',       priority: false, enabled: false },
  { id: 'D010', code: 'M54.5', name: '腰痛',               category: '其他',       priority: false, enabled: false },
]

const CATEGORIES = ['循环系统', '神经系统', '内分泌系统', '呼吸系统', '其他']

let _nextDiseaseId = 11

// ── 常量 ───────────────────────────────────────────────────
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

const CATEGORY_TAG = {
  '循环系统':   'bg-red-100 text-red-700',
  '神经系统':   'bg-purple-100 text-purple-700',
  '内分泌系统': 'bg-yellow-100 text-yellow-700',
  '呼吸系统':   'bg-blue-100 text-blue-700',
  '其他':       'bg-gray-100 text-gray-600',
}

const EMPTY_FORM = { code: '', name: '', category: '', priority: false }

// ── 辅助组件 ───────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer" onClick={() => onChange(!value)}>
      <div className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-[#0BBECF]' : 'bg-gray-300'}`}>
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

// ── 新增/编辑弹窗 ───────────────────────────────────────────
function DiseaseModal({ initial, onCancel, onSave }) {
  const isEdit = !!initial
  const [form, setForm]     = useState(initial || EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.code.trim())     errs.code     = '请填写 ICD-10 编码'
    if (!form.name.trim())     errs.name     = '请填写疾病名称'
    if (!form.category)        errs.category = '请选择疾病分类'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (validate()) onSave(form)
  }

  const inputCls = (key) =>
    `w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
      errors[key] ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-[#0BBECF]'
    }`

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-800">{isEdit ? '编辑病种' : '新增病种'}</h3>
            <button
              onClick={onCancel}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors text-lg leading-none"
            >×</button>
          </div>

          <div className="space-y-4">
            {/* ICD-10 编码 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                ICD-10 编码 <span className="text-red-500">*</span>
              </label>
              <input
                value={form.code}
                onChange={e => set('code', e.target.value)}
                className={inputCls('code') + ' font-mono'}
                placeholder="如 I10、E11.9"
              />
              {errors.code && <p className="text-xs text-red-500 mt-0.5">{errors.code}</p>}
            </div>

            {/* 疾病名称 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                疾病名称 <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={inputCls('name')}
                placeholder="请输入标准疾病名称"
              />
              {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
            </div>

            {/* 疾病分类 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                疾病分类 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className={inputCls('category') + ' bg-white'}
              >
                <option value="">请选择疾病分类</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-0.5">{errors.category}</p>}
            </div>

            {/* 是否上转优先 */}
            <div className="flex items-center justify-between py-2 border border-gray-100 rounded-lg px-3">
              <div>
                <div className="text-sm text-gray-700 font-medium">是否上转优先</div>
                <div className="text-xs text-gray-400 mt-0.5">标记后在选择转诊病种时优先展示</div>
              </div>
              <Toggle value={form.priority} onChange={v => set('priority', v)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
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

// ── 停用确认弹窗 ───────────────────────────────────────────
function DisableConfirmModal({ disease, onCancel, onConfirm }) {
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
              <div className="text-sm font-semibold text-gray-800 mb-1">停用病种确认</div>
              <div className="text-sm text-gray-500 leading-relaxed">
                确认停用 <span className="font-medium text-gray-800">「{disease.name}（{disease.code}）」</span>？<br />
                停用后该病种在转诊表单中将不可选择，已使用该病种的历史转诊单不受影响。
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
              确认停用
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── 主页面 ─────────────────────────────────────────────────
export default function DiseaseDir() {
  const [list, setList] = useState(MOCK_DISEASES)

  // 筛选
  const [filters, setFilters] = useState({ code: '', name: '', category: 'all', enabled: 'all' })
  const [applied, setApplied] = useState({ code: '', name: '', category: 'all', enabled: 'all' })

  // 分页
  const [page, setPage] = useState(1)
  const PAGE_SIZE        = 10

  // 弹窗状态
  const [modal,         setModal]         = useState(null) // null | 'create' | { disease }
  const [disableTarget, setDisableTarget] = useState(null) // disease obj

  // 成功提示
  const [toast, setToast] = useState('')
  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1500)
  }

  // 筛选逻辑
  const filtered = useMemo(() => {
    return list.filter(d => {
      if (applied.category !== 'all' && d.category !== applied.category) return false
      if (applied.enabled !== 'all') {
        const wantEnabled = applied.enabled === 'enabled'
        if (d.enabled !== wantEnabled) return false
      }
      if (applied.code.trim() && !d.code.toLowerCase().includes(applied.code.trim().toLowerCase())) return false
      if (applied.name.trim() && !d.name.includes(applied.name.trim())) return false
      return true
    })
  }, [list, applied])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleQuery = () => { setApplied({ ...filters }); setPage(1) }
  const handleReset = () => {
    const empty = { code: '', name: '', category: 'all', enabled: 'all' }
    setFilters(empty); setApplied(empty); setPage(1)
  }

  // 保存（新增或编辑）
  const handleSave = (formData) => {
    if (modal === 'create') {
      const newD = {
        ...formData,
        id: `D${String(_nextDiseaseId++).padStart(3, '0')}`,
        enabled: true,
      }
      setList(prev => [newD, ...prev])
      showToast('病种新增成功')
    } else {
      setList(prev => prev.map(d => d.id === modal.disease.id ? { ...d, ...formData } : d))
      showToast('病种信息已保存')
    }
    setModal(null)
  }

  // 确认停用
  const handleConfirmDisable = () => {
    setList(prev => prev.map(d => d.id === disableTarget.id ? { ...d, enabled: false } : d))
    showToast(`已停用「${disableTarget.name}」`)
    setDisableTarget(null)
  }

  // 直接启用
  const handleEnable = (disease) => {
    setList(prev => prev.map(d => d.id === disease.id ? { ...d, enabled: true } : d))
    showToast(`已启用「${disease.name}」`)
  }

  return (
    <div className="p-5">

      {toast && <SuccessToast message={toast} />}

      {/* 页面标题 + 顶部操作 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">病种目录管理</h2>
          <div className="text-xs text-gray-400 mt-0.5">ICD-10 病种目录维护 · 转诊优先病种配置</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('批量导入功能待接入文件解析服务\n// TODO: 接入 Excel/CSV 解析上传接口')}
            className="px-4 py-2 rounded-lg text-sm border transition-colors"
            style={{ color: '#0BBECF', borderColor: '#0BBECF' }}
            onMouseEnter={e => e.currentTarget.style.background = '#E0F6F9'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          >
            批量导入
          </button>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: '#0BBECF' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0892a0'}
            onMouseLeave={e => e.currentTarget.style.background = '#0BBECF'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增病种
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">ICD-10 编码</label>
            <input
              value={filters.code}
              onChange={e => setFilters(f => ({ ...f, code: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
              placeholder="如 I10"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">疾病名称</label>
            <input
              value={filters.name}
              onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
              placeholder="输入疾病名称"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">疾病分类</label>
            <select
              value={filters.category}
              onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white focus:ring-1 focus:ring-[#0BBECF]"
            >
              <option value="all">全部</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">启用状态</label>
            <select
              value={filters.enabled}
              onChange={e => setFilters(f => ({ ...f, enabled: e.target.value }))}
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

      {/* 数据表格 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['序号', 'ICD-10 编码', '疾病名称', '分类', '上转优先', '状态', '操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-sm">暂无病种数据</span>
                      <span className="text-xs text-gray-300">请调整筛选条件或点击「新增病种」添加</span>
                    </div>
                  </td>
                </tr>
              ) : pageData.map((d, i) => (
                <tr
                  key={d.id}
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
                  <td className={TD}>
                    <span className="font-mono text-xs font-semibold" style={{ color: '#2563EB' }}>{d.code}</span>
                  </td>
                  <td className={TD + ' font-medium text-gray-800'}>{d.name}</td>
                  <td className={TD}>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_TAG[d.category] || 'bg-gray-100 text-gray-600'}`}>
                      {d.category}
                    </span>
                  </td>
                  <td className={TD}>
                    {d.priority
                      ? <span className="text-green-600 font-medium text-sm" title="上转优先">✓</span>
                      : <span className="text-gray-300 text-sm">—</span>
                    }
                  </td>
                  <td className={TD}>
                    {d.enabled
                      ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">启用</span>
                      : <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded">停用</span>
                    }
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setModal({ disease: d })}
                        className="text-sm font-medium transition-colors"
                        style={{ color: '#0BBECF' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#0892a0'}
                        onMouseLeave={e => e.currentTarget.style.color = '#0BBECF'}
                      >
                        编辑
                      </button>
                      {d.enabled ? (
                        <button
                          onClick={() => setDisableTarget(d)}
                          className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                        >
                          停用
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnable(d)}
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

      {/* 新增/编辑弹窗 */}
      {modal && (
        <DiseaseModal
          initial={modal === 'create' ? null : modal.disease}
          onCancel={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* 停用确认弹窗 */}
      {disableTarget && (
        <DisableConfirmModal
          disease={disableTarget}
          onCancel={() => setDisableTarget(null)}
          onConfirm={handleConfirmDisable}
        />
      )}

    </div>
  )
}

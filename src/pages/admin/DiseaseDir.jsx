import { useState, useMemo } from 'react'
import { appendSystemOperationLog, SYSTEM_DISEASE_CATEGORIES, SYSTEM_DISEASE_CONFIGS } from '../../data/systemAdminConfig'

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

const EMPTY_FORM = { code: '', name: '', category: '', priority: false, emergencyLinked: false, priorityAccept: false }

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
                {SYSTEM_DISEASE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-0.5">{errors.category}</p>}
            </div>

            {/* 是否重点病种 */}
            <div className="flex items-center justify-between py-2 border border-gray-100 rounded-lg px-3">
              <div>
                <div className="text-sm text-gray-700 font-medium">是否重点病种</div>
                <div className="text-xs text-gray-400 mt-0.5">标记后在转诊病种选择中优先展示</div>
              </div>
              <Toggle value={form.priority} onChange={v => set('priority', v)} />
            </div>

            <div className="flex items-center justify-between py-2 border border-gray-100 rounded-lg px-3">
              <div>
                <div className="text-sm text-gray-700 font-medium">是否急诊联动病种</div>
                <div className="text-xs text-gray-400 mt-0.5">标记后可用于急诊提示与专科联动配置</div>
              </div>
              <Toggle value={form.emergencyLinked} onChange={v => set('emergencyLinked', v)} />
            </div>

            <div className="flex items-center justify-between py-2 border border-gray-100 rounded-lg px-3">
              <div>
                <div className="text-sm text-gray-700 font-medium">是否优先受理病种</div>
                <div className="text-xs text-gray-400 mt-0.5">标记后在转入待受理列表中可作为优先提示依据</div>
              </div>
              <Toggle value={form.priorityAccept} onChange={v => set('priorityAccept', v)} />
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
  const [list, setList] = useState(SYSTEM_DISEASE_CONFIGS)

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
      appendSystemOperationLog({
        domain: '病种配置',
        type: '系统配置变更',
        target: `${newD.name}（${newD.code}）`,
        detail: {
          配置项: '重点病种',
          操作: '新增病种',
          疾病名称: newD.name,
          ICD编码: newD.code,
          分类: newD.category,
        },
      })
      showToast('病种新增成功')
    } else {
      const original = modal.disease
      setList(prev => prev.map(d => d.id === modal.disease.id ? { ...d, ...formData } : d))
      appendSystemOperationLog({
        domain: '病种配置',
        type: '系统配置变更',
        target: `${original.name}（${original.code}）`,
        detail: {
          配置项: '重点病种',
          操作: '编辑病种',
          疾病名称: `${original.name} → ${formData.name}`,
          ICD编码: `${original.code} → ${formData.code}`,
          分类: `${original.category} → ${formData.category}`,
          重点病种: `${original.priority ? '是' : '否'} → ${formData.priority ? '是' : '否'}`,
        },
      })
      showToast('病种信息已保存')
    }
    setModal(null)
  }

  // 确认停用
  const handleConfirmDisable = () => {
    setList(prev => prev.map(d => d.id === disableTarget.id ? { ...d, enabled: false } : d))
    appendSystemOperationLog({
      domain: '病种配置',
      type: '系统配置变更',
      target: `${disableTarget.name}（${disableTarget.code}）`,
      detail: {
        配置项: '重点病种',
        操作: '停用病种',
        变更字段: '启用状态',
        原值: '启用',
        新值: '停用',
      },
    })
    showToast(`已停用「${disableTarget.name}」`)
    setDisableTarget(null)
  }

  // 直接启用
  const handleEnable = (disease) => {
    setList(prev => prev.map(d => d.id === disease.id ? { ...d, enabled: true } : d))
    appendSystemOperationLog({
      domain: '病种配置',
      type: '系统配置变更',
      target: `${disease.name}（${disease.code}）`,
      detail: {
        配置项: '重点病种',
        操作: '启用病种',
        变更字段: '启用状态',
        原值: '停用',
        新值: '启用',
      },
    })
    showToast(`已启用「${disease.name}」`)
  }

  return (
    <div className="p-5">

      {toast && <SuccessToast message={toast} />}

      {/* 页面标题 + 顶部操作 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">转诊重点病种配置</h2>
          <div className="text-xs text-gray-400 mt-0.5">重点病种、优先病种与急诊联动病种维护</div>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="mb-4 rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-3 text-xs text-cyan-700">
        本页维护转诊相关重点病种配置，不承担完整 ICD-10 主数据维护。
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
              {SYSTEM_DISEASE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                {['序号', 'ICD-10 编码', '疾病名称', '分类', '重点病种', '急诊联动', '优先受理', '状态', '操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
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
                      ? <span className="text-green-600 font-medium text-sm" title="重点病种">✓</span>
                      : <span className="text-gray-300 text-sm">—</span>
                    }
                  </td>
                  <td className={TD}>
                    {d.emergencyLinked
                      ? <span className="text-cyan-600 font-medium text-sm" title="急诊联动病种">✓</span>
                      : <span className="text-gray-300 text-sm">—</span>
                    }
                  </td>
                  <td className={TD}>
                    {d.priorityAccept
                      ? <span className="text-blue-600 font-medium text-sm" title="优先受理病种">✓</span>
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

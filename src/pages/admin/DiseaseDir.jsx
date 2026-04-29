import { useMemo, useState } from 'react'
import {
  appendSystemOperationLog,
  SYSTEM_DISEASE_CATEGORIES,
  SYSTEM_DISEASE_CONFIGS,
  SYSTEM_DISEASE_GREEN_CENTER_OPTIONS,
  SYSTEM_DISEASE_MANAGEMENT_TAG_OPTIONS,
  SYSTEM_TERMINOLOGY_ICD10_MASTER,
} from '../../data/systemAdminConfig'

let _nextDiseaseId = 6

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

const CATEGORY_TAG = {
  '循环系统': 'bg-red-100 text-red-700',
  '神经系统': 'bg-purple-100 text-purple-700',
  '呼吸系统': 'bg-blue-100 text-blue-700',
  '内分泌系统': 'bg-yellow-100 text-yellow-700',
  '消化系统': 'bg-amber-100 text-amber-700',
  '其他': 'bg-gray-100 text-gray-600',
}

const EMPTY_RULE_FORM = {
  greenChannel: false,
  greenCenter: '',
  managementTags: [],
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

function DiseaseRuleModal({ disease, master, onCancel, onSave }) {
  const isEdit = Boolean(disease?.id)
  const [form, setForm] = useState({
    greenChannel: Boolean(disease?.greenChannel),
    greenCenter: disease?.greenCenter || '',
    managementTags: Array.isArray(disease?.managementTags) ? disease.managementTags : [],
  })
  const [errors, setErrors] = useState({})

  const setField = (key, value) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'greenChannel' && !value) {
        return { ...next, greenCenter: '' }
      }
      return next
    })
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const toggleManagementTag = (tag) => {
    setForm(prev => {
      const exists = prev.managementTags.includes(tag)
      const managementTags = exists
        ? prev.managementTags.filter(item => item !== tag)
        : [...prev.managementTags, tag]
      return { ...prev, managementTags }
    })
  }

  const validate = () => {
    const nextErrors = {}
    if (form.greenChannel && !form.greenCenter) nextErrors.greenCenter = '请选择所属中心'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const inputCls = (key) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 bg-white ${
      errors[key] ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-[#0BBECF]'
    }`

  const title = `${isEdit ? '编辑病种' : '新增病种'}：${master.code} ${master.name}`

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            <button
              onClick={onCancel}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="px-6 divide-y divide-gray-100">
            <section className="py-4">
              <div className="text-sm font-medium text-gray-800 mb-3">ICD-10主数据</div>
              <div className="grid grid-cols-3 gap-5 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">ICD-10编码</div>
                  <div className="font-mono text-gray-800">{master.code}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">诊断名称</div>
                  <div className="text-gray-800">{master.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">疾病分类</div>
                  <div className="text-gray-800">{master.category}</div>
                </div>
              </div>
            </section>

            <section className="py-4">
              <div className="text-sm font-medium text-gray-800 mb-3">双转业务标识</div>
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.greenChannel}
                    onChange={e => setField('greenChannel', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#0BBECF] focus:ring-[#0BBECF]"
                  />
                  <span>标记为绿色通道病种</span>
                </label>
              </div>
            </section>

            {form.greenChannel && (
              <section className="py-4">
                <div className="text-sm font-medium text-gray-800 mb-3">绿色通道配置</div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">所属中心</label>
                    <select
                      value={form.greenCenter}
                      onChange={e => setField('greenCenter', e.target.value)}
                      className={inputCls('greenCenter')}
                    >
                      <option value="">请选择所属中心</option>
                      {SYSTEM_DISEASE_GREEN_CENTER_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {errors.greenCenter && <p className="text-xs text-red-500 mt-1">{errors.greenCenter}</p>}
                  </div>

                </div>
              </section>
            )}

            <section className="py-4">
              <div className="text-sm font-medium text-gray-800 mb-3">管理属性标签</div>
              <div className="grid grid-cols-2 gap-2">
                {SYSTEM_DISEASE_MANAGEMENT_TAG_OPTIONS.map(option => (
                  <label key={option} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.managementTags.includes(option)}
                      onChange={() => toggleManagementTag(option)}
                      className="w-4 h-4 rounded border-gray-300 text-[#0BBECF] focus:ring-[#0BBECF]"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">管理属性标签仅用于转诊台账、统计分析和政策口径归类，不参与自动分诊、不推荐科室、不改变转诊流程。</p>
            </section>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-white">
            <button
              onClick={onCancel}
              className="px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                if (!validate()) return
                onSave({
                  ...form,
                  greenCenter: form.greenChannel ? form.greenCenter : '',
                })
              }}
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

function SearchTerminologyModal({ existingCodes, onCancel, onSelect }) {
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')

  const results = useMemo(() => {
    const q = appliedKeyword.trim().toLowerCase()
    return SYSTEM_TERMINOLOGY_ICD10_MASTER.filter(item => {
      if (!q) return true
      return item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    })
  }, [appliedKeyword])

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">ICD-10 搜索选择</h3>
              <div className="text-xs text-gray-400 mt-1">主数据来自医共体术语信息系统，请先选择 ICD-10 条目，再配置双转业务属性。</div>
            </div>
            <button
              onClick={onCancel}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setAppliedKeyword(keyword)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
              placeholder="请输入 ICD-10 编码 / 诊断名称"
            />
            <button
              onClick={() => setAppliedKeyword(keyword)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#0BBECF' }}
            >
              查询
            </button>
          </div>

          <div className="rounded-xl border border-[#DDF0F3] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#E0F6F9' }}>
                  <th className={TH} style={{ color: '#2D7A86' }}>ICD-10编码</th>
                  <th className={TH} style={{ color: '#2D7A86' }}>诊断名称</th>
                  <th className={TH} style={{ color: '#2D7A86' }}>疾病分类</th>
                  <th className={TH} style={{ color: '#2D7A86' }}>主数据来源</th>
                  <th className={TH} style={{ color: '#2D7A86' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-gray-400">
                      未检索到 ICD-10 条目
                    </td>
                  </tr>
                ) : results.map(item => {
                  const configured = existingCodes.includes(item.code)
                  return (
                    <tr key={item.id} style={{ borderTop: '1px solid #EEF7F9' }}>
                      <td className={TD}><span className="font-mono text-xs font-semibold text-blue-600">{item.code}</span></td>
                      <td className={TD + ' text-gray-800 font-medium'}>{item.name}</td>
                      <td className={TD}>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_TAG[item.category] || 'bg-gray-100 text-gray-600'}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className={TD + ' text-xs text-gray-500'}>{item.sourceSystem}</td>
                      <td className={TD}>
                        <button
                          onClick={() => onSelect(item)}
                          className={`text-sm font-medium ${configured ? 'text-amber-600 hover:text-amber-700' : 'text-[#0BBECF] hover:text-[#0892a0]'} transition-colors`}
                        >
                          {configured ? '已配置，去编辑' : '选择'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

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
              <div className="text-sm font-semibold text-gray-800 mb-1">停用专病规则确认</div>
              <div className="text-sm text-gray-500 leading-relaxed">
                确认停用 <span className="font-medium text-gray-800">「{disease.name}（{disease.code}）」</span>？<br />
                停用后该条目将不再在双转规则中生效，但不会影响 ICD-10 主数据。
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

function mergeWithMaster(list) {
  return list.map(item => {
    const master = SYSTEM_TERMINOLOGY_ICD10_MASTER.find(term => term.id === item.terminologyId || term.code === item.code)
    return {
      ...item,
      code: master?.code || item.code,
      name: master?.name || item.name,
      category: master?.category || item.category,
      sourceSystem: master?.sourceSystem || '医共体术语信息管理系统',
    }
  })
}

export default function DiseaseDir() {
  const [list, setList] = useState(mergeWithMaster(SYSTEM_DISEASE_CONFIGS))
  const [filters, setFilters] = useState({ code: '', name: '', category: 'all', enabled: 'all' })
  const [applied, setApplied] = useState({ code: '', name: '', category: 'all', enabled: 'all' })
  const [page, setPage] = useState(1)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [modalState, setModalState] = useState(null)
  const [disableTarget, setDisableTarget] = useState(null)
  const [toast, setToast] = useState('')
  const PAGE_SIZE = 10

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 1800)
  }

  const filtered = useMemo(() => {
    return list.filter(item => {
      if (applied.category !== 'all' && item.category !== applied.category) return false
      if (applied.enabled !== 'all') {
        const wantEnabled = applied.enabled === 'enabled'
        if (item.enabled !== wantEnabled) return false
      }
      if (applied.code.trim() && !item.code.toLowerCase().includes(applied.code.trim().toLowerCase())) return false
      if (applied.name.trim() && !item.name.includes(applied.name.trim())) return false
      return true
    })
  }, [list, applied])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openRuleModal = (master, existing = null) => {
    setModalState({
      master,
      disease: existing || {
        ...EMPTY_RULE_FORM,
        enabled: true,
      },
    })
  }

  const handlePickTerminology = (master) => {
    const existing = list.find(item => item.code === master.code)
    setSearchModalOpen(false)
    if (existing) {
      showToast(`「${master.name}」已存在，已为你打开编辑弹窗`)
      openRuleModal(master, existing)
      return
    }
    openRuleModal(master)
  }

  const handleSave = (formData) => {
    const { master, disease } = modalState
    if (disease.id) {
      setList(prev => prev.map(item => (
        item.id === disease.id
          ? {
            ...item,
            greenChannel: formData.greenChannel,
            greenCenter: formData.greenCenter,
            managementTags: formData.managementTags,
          }
          : item
      )))
      appendSystemOperationLog({
        domain: '专病规则配置',
        type: '系统配置变更',
        target: `${master.name}（${master.code}）`,
        detail: {
          配置项: '专病规则配置',
          操作: '编辑业务属性',
          绿色通道病种: `${disease.greenChannel ? '是' : '否'} → ${formData.greenChannel ? '是' : '否'}`,
          所属中心: `${disease.greenCenter || '未配置'} → ${formData.greenCenter || '未配置'}`,
          管理属性标签: `${disease.managementTags?.join('、') || '未配置'} → ${formData.managementTags.join('、') || '未配置'}`,
        },
      })
      showToast('业务属性已保存')
    } else {
      const newItem = {
        id: `D${String(_nextDiseaseId++).padStart(3, '0')}`,
        terminologyId: master.id,
        code: master.code,
        name: master.name,
        category: master.category,
        sourceSystem: master.sourceSystem,
        greenChannel: formData.greenChannel,
        greenCenter: formData.greenCenter,
        managementTags: formData.managementTags,
        enabled: true,
      }
      setList(prev => [newItem, ...prev])
      appendSystemOperationLog({
        domain: '专病规则配置',
        type: '系统配置变更',
        target: `${master.name}（${master.code}）`,
        detail: {
          配置项: '专病规则配置',
          操作: '新增业务病种',
          ICD编码: master.code,
          诊断名称: master.name,
          疾病分类: master.category,
          绿色通道病种: formData.greenChannel ? '是' : '否',
          所属中心: formData.greenCenter || '未配置',
          管理属性标签: formData.managementTags.join('、') || '未配置',
        },
      })
      showToast('业务病种已新增')
    }
    setModalState(null)
  }

  const handleEnable = (disease) => {
    setList(prev => prev.map(item => item.id === disease.id ? { ...item, enabled: true } : item))
    appendSystemOperationLog({
      domain: '专病规则配置',
      type: '系统配置变更',
      target: `${disease.name}（${disease.code}）`,
      detail: {
        配置项: '专病规则配置',
        操作: '启用业务病种',
        变更字段: '启用状态',
        原值: '停用',
        新值: '启用',
      },
    })
    showToast(`已启用「${disease.name}」`)
  }

  const handleDisable = () => {
    setList(prev => prev.map(item => item.id === disableTarget.id ? { ...item, enabled: false } : item))
    appendSystemOperationLog({
      domain: '专病规则配置',
      type: '系统配置变更',
      target: `${disableTarget.name}（${disableTarget.code}）`,
      detail: {
        配置项: '专病规则配置',
        操作: '停用业务病种',
        变更字段: '启用状态',
        原值: '启用',
        新值: '停用',
      },
    })
    showToast(`已停用「${disableTarget.name}」`)
    setDisableTarget(null)
  }

  const handleQuery = () => {
    setApplied({ ...filters })
    setPage(1)
  }

  const handleReset = () => {
    const next = { code: '', name: '', category: 'all', enabled: 'all' }
    setFilters(next)
    setApplied(next)
    setPage(1)
  }

  return (
    <div className="p-5">
      {toast && <SuccessToast message={toast} />}

      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">专病规则配置</h2>
          <div className="text-xs text-gray-400 mt-0.5">主数据同步自医共体术语信息系统，仅维护双转业务属性。</div>
        </div>
        <button
          onClick={() => setSearchModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: '#0BBECF' }}
          onMouseEnter={e => e.currentTarget.style.background = '#0892a0'}
          onMouseLeave={e => e.currentTarget.style.background = '#0BBECF'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          +新增
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-3 text-xs text-cyan-700">
        只展示已标记为业务病种的条目；ICD-10 主数据来自医共体术语信息系统，本页仅维护双转业务属性。
      </div>

      <div className="bg-white rounded-xl p-4 mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="grid grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">ICD-10 编码</label>
            <input
              value={filters.code}
              onChange={e => setFilters(prev => ({ ...prev, code: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
              placeholder="如 I21"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">诊断名称</label>
            <input
              value={filters.name}
              onChange={e => setFilters(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
              placeholder="输入诊断名称"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">疾病分类</label>
            <select
              value={filters.category}
              onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white focus:ring-1 focus:ring-[#0BBECF]"
            >
              <option value="all">全部</option>
              {SYSTEM_DISEASE_CATEGORIES.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">启用状态</label>
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

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 980 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['序号', 'ICD-10编码', '诊断名称', '疾病分类', '绿色通道病种', '所属中心', '管理属性标签', '状态', '操作'].map(label => (
                  <th key={label} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{label}</th>
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
                      <span className="text-sm">暂无专病规则数据</span>
                      <span className="text-xs text-gray-300">点击「+新增」后，通过 ICD-10 搜索选择添加业务病种。</span>
                    </div>
                  </td>
                </tr>
              ) : pageData.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid #EEF7F9',
                    background: index % 2 === 0 ? '#fff' : '#FAFEFE',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                  onMouseLeave={e => e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#FAFEFE'}
                >
                  <td className={TD}>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </span>
                  </td>
                  <td className={TD}>
                    <span className="font-mono text-xs font-semibold text-blue-600">{item.code}</span>
                  </td>
                  <td className={TD + ' font-medium text-gray-800'}>{item.name}</td>
                  <td className={TD}>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${CATEGORY_TAG[item.category] || 'bg-gray-100 text-gray-600'}`}>
                      {item.category}
                    </span>
                  </td>
                  <td className={TD}>
                    {item.greenChannel
                      ? <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded">是</span>
                      : <span className="text-gray-300 text-sm">—</span>
                    }
                  </td>
                  <td className={TD}>{item.greenChannel && item.greenCenter ? item.greenCenter : <span className="text-gray-300">—</span>}</td>
                  <td className={TD}>{item.managementTags?.length ? item.managementTags.join('、') : <span className="text-gray-300">—</span>}</td>
                  <td className={TD}>
                    {item.enabled
                      ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">启用</span>
                      : <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded">停用</span>
                    }
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openRuleModal(item, item)}
                        className="text-sm font-medium transition-colors"
                        style={{ color: '#0BBECF' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#0892a0'}
                        onMouseLeave={e => e.currentTarget.style.color = '#0BBECF'}
                      >
                        编辑
                      </button>
                      {item.enabled ? (
                        <button
                          onClick={() => setDisableTarget(item)}
                          className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                        >
                          停用
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnable(item)}
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

        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
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
            {Array.from({ length: Math.min(totalPages || 1, 5) }, (_, idx) => idx + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="w-7 h-7 rounded text-xs transition-colors"
                style={page === p
                  ? { background: '#0BBECF', color: '#fff' }
                  : { color: '#4b5563', border: '1px solid #e5e7eb' }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages || 1, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded text-xs border disabled:opacity-40 transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#4b5563' }}
            >
              下一页 ›
            </button>
          </div>
        </div>
      </div>

      {searchModalOpen && (
        <SearchTerminologyModal
          existingCodes={list.map(item => item.code)}
          onCancel={() => setSearchModalOpen(false)}
          onSelect={handlePickTerminology}
        />
      )}

      {modalState && (
        <DiseaseRuleModal
          disease={modalState.disease}
          master={modalState.master}
          onCancel={() => setModalState(null)}
          onSave={handleSave}
        />
      )}

      {disableTarget && (
        <DisableConfirmModal
          disease={disableTarget}
          onCancel={() => setDisableTarget(null)}
          onConfirm={handleDisable}
        />
      )}
    </div>
  )
}

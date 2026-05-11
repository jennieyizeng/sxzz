import { useState, useMemo } from 'react'
import {
  appendSystemOperationLog,
  SYSTEM_ADMIN_OPERATOR,
  SYSTEM_DEPT_CONFIGS,
  SYSTEM_INSTITUTION_CONFIGS,
  SYSTEM_SSO_USERS,
} from '../../data/systemAdminConfig'
import {
  getInstitutionLevel,
  getReceivingAbilityKey,
  getReceivingAbilityLabel,
  getReceivingAbilityTip,
  getReceivingServiceStatus,
  getReceivingServiceStatusDetail,
} from '../../utils/institutionReferralParams'

let _nextId = 8

// ── 常量 ───────────────────────────────────────────────────
const INSTITUTION_TYPES = ['综合医院', '中医医院', '专科医院', '妇幼保健院', '社区卫生服务中心', '乡镇卫生院']
const COUNTY_SERVICE_TYPES = ['综合医院', '中医医院', '专科医院', '妇幼保健院']

const TYPE_TAG = {
  '综合医院':         'bg-purple-100 text-purple-700',
  '中医医院':         'bg-emerald-100 text-emerald-700',
  '专科医院':         'bg-indigo-100 text-indigo-700',
  '妇幼保健院':       'bg-pink-100 text-pink-700',
  '社区卫生服务中心': 'bg-green-100 text-green-700',
  '乡镇卫生院':       'bg-blue-100 text-blue-700',
}

const EMERGENCY_DUTY_CONTACT_OPTIONS = [
  { id: 'ed_duty_001', name: '周主任' },
  { id: 'ed_duty_002', name: '李护士长' },
  { id: 'ed_duty_003', name: '王医生' },
]

const MOBILE_PHONE_REGEX = /^1\d{10}$/
const LANDLINE_PHONE_REGEX = /^0\d{2,3}-?\d{7,8}$/

const EMPTY_FORM = {
  name: '', code: '', type: '', contact: '', phone: '', address: '',
  referralConsultPhone: '', referralContactUserId: '', referralContactName: '', referralContactPhone: '',
  referralCoordinatorUserId: '', referralCoordinatorName: '',
  emergencyDutyContactId: '', emergencyDutyContactName: '', emergencyDeptPhone: '',
  canUp: true, canDown: true, enabled: true, outgoingAuditEnabled: true,
}

function isCountyInstitutionType(type) {
  return COUNTY_SERVICE_TYPES.includes(type)
}

function isPrimaryInstitutionType(type) {
  return Boolean(type) && !isCountyInstitutionType(type)
}

function getReceivingStatusClass(status) {
  if (status === '可用') return 'bg-green-100 text-green-700'
  if (status === '配置不完整') return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-500'
}

// ── 辅助小组件 ─────────────────────────────────────────────
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

function Toggle({ value, onChange }) {
  return (
    <label className="flex shrink-0 items-center gap-2 whitespace-nowrap cursor-pointer" onClick={() => onChange(!value)}>
      <div className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-[#0BBECF]' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <span className="min-w-8 text-sm text-gray-700 whitespace-nowrap">{value ? '开启' : '关闭'}</span>
    </label>
  )
}

function RowNo({ n }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>
      {n}
    </span>
  )
}

function DrawerField({ label, required, children, error }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-0.5">{error}</p>
      )}
    </div>
  )
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-800 leading-5">
        {value || '—'}
      </div>
    </div>
  )
}

function formatSsoUser(user) {
  return user ? `${user.name}（${user.deptName}）` : ''
}

// ── 成功提示条 ─────────────────────────────────────────────
function SuccessToast({ message }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm rounded-lg shadow-lg">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </div>
  )
}

// ── 新增 / 编辑抽屉 ────────────────────────────────────────
function InstitutionDrawer({ mode, initial, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(initial || {}),
    type: INSTITUTION_TYPES.includes(initial?.type) ? initial.type : '',
    outgoingAuditEnabled: initial?.outgoingAuditEnabled ?? (isCountyInstitutionType(initial?.type) ? false : true),
    referralContactUserId: initial?.referralContactUserId || '',
    referralContactName: initial?.referralContactName || '',
    referralContactPhone: initial?.referralContactPhone || '',
    referralCoordinatorUserId: initial?.referralCoordinatorUserId || '',
    referralCoordinatorName: initial?.referralCoordinatorName || '',
    emergencyDutyContactId: initial?.emergencyDutyContactId || '',
    emergencyDutyContactName: initial?.emergencyDutyContactName || initial?.emergencyDutyContact || '',
  }))
  const [errors, setErrors] = useState({})
  const isEdit = mode === 'edit'
  const isCountyInstitution = isCountyInstitutionType(form.type)
  const isPrimaryInstitution = isPrimaryInstitutionType(form.type)
  const receivingAbilityKey = getReceivingAbilityKey(form)
  const receivingServiceDetail = getReceivingServiceStatusDetail(form, { users: SYSTEM_SSO_USERS, deptConfigs: SYSTEM_DEPT_CONFIGS })
  const referralContactOptions = SYSTEM_SSO_USERS.filter(user =>
    user.enabled &&
    (form.id ? user.institutionId === form.id : true)
  )
  const primaryCoordinatorOptions = SYSTEM_SSO_USERS.filter(user =>
    user.enabled &&
    user.role === '基层负责人' &&
    (form.id ? user.institutionId === form.id : (form.name ? user.institution === form.name : true))
  )

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const setInstitutionType = (nextType) => {
    setForm(f => ({
      ...f,
      type: nextType,
      outgoingAuditEnabled: isCountyInstitutionType(nextType) ? false : true,
      ...(isCountyInstitutionType(nextType)
        ? { referralCoordinatorUserId: '', referralCoordinatorName: '' }
        : { emergencyDutyContactId: '', emergencyDutyContactName: '', emergencyDeptPhone: '' }),
    }))
    if (errors.type) setErrors(e => ({ ...e, type: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!isEdit) {
      if (!form.name.trim())    errs.name    = '请填写机构名称'
      if (!form.code.trim())    errs.code    = '请填写机构代码'
      if (!form.type)           errs.type    = '请选择机构类别'
      if (!form.contact.trim()) errs.contact = '请填写联系人'
      if (!form.phone.trim())   errs.phone   = '请填写联系电话'
    }
    if (form.referralConsultPhone?.trim()) {
      const cleanedPhone = form.referralConsultPhone.trim()
      if (!MOBILE_PHONE_REGEX.test(cleanedPhone) && !LANDLINE_PHONE_REGEX.test(cleanedPhone)) {
        errs.referralConsultPhone = '请填写正确的手机号或固话格式'
      }
    }
    if (form.referralContactPhone?.trim()) {
      const cleanedPhone = form.referralContactPhone.trim()
      if (!MOBILE_PHONE_REGEX.test(cleanedPhone) && !LANDLINE_PHONE_REGEX.test(cleanedPhone)) {
        errs.referralContactPhone = '请填写正确的手机号或固话格式'
      }
    }
    if (isCountyInstitution && form.emergencyDeptPhone?.trim()) {
      const cleanedPhone = form.emergencyDeptPhone.trim()
      if (!MOBILE_PHONE_REGEX.test(cleanedPhone) && !LANDLINE_PHONE_REGEX.test(cleanedPhone)) {
        errs.emergencyDeptPhone = '请填写正确的手机号或固话格式'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const selectedDutyContact = EMERGENCY_DUTY_CONTACT_OPTIONS.find(item => item.id === form.emergencyDutyContactId)
    const selectedCoordinator = primaryCoordinatorOptions.find(user => user.userId === form.referralCoordinatorUserId)
    const normalized = {
      ...form,
      referralCoordinatorUserId: isPrimaryInstitution ? (selectedCoordinator?.userId || form.referralCoordinatorUserId || '') : '',
      referralCoordinatorName: isPrimaryInstitution ? (selectedCoordinator?.name || form.referralCoordinatorName || '') : '',
      emergencyDutyContactId: isCountyInstitution ? form.emergencyDutyContactId : '',
      emergencyDutyContactName: isCountyInstitution ? (selectedDutyContact?.name || form.emergencyDutyContactName || '') : '',
      emergencyDeptPhone: isCountyInstitution ? form.emergencyDeptPhone : '',
    }
    if (isEdit) {
      onSave({
        referralConsultPhone: normalized.referralConsultPhone,
        referralContactUserId: normalized.referralContactUserId,
        referralContactName: normalized.referralContactName,
        referralContactPhone: normalized.referralContactPhone,
        referralCoordinatorUserId: normalized.referralCoordinatorUserId,
        referralCoordinatorName: normalized.referralCoordinatorName,
        emergencyDutyContactId: normalized.emergencyDutyContactId,
        emergencyDutyContactName: normalized.emergencyDutyContactName,
        emergencyDeptPhone: normalized.emergencyDeptPhone,
        canUp: normalized.canUp,
        canDown: normalized.canDown,
        enabled: normalized.enabled,
        outgoingAuditEnabled: normalized.outgoingAuditEnabled,
      })
      return
    }
    onSave(normalized)
  }

  const inputCls = (key) =>
    `w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
      errors[key] ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-[#0BBECF]'
    }`

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 pointer-events-none">
      <div className="w-full max-w-3xl max-h-[88vh] bg-white rounded-xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {mode === 'create' ? '新增机构' : '机构转诊参数配置'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {mode === 'create' ? '填写新机构基本信息与转诊业务参数' : '配置当前机构的双向转诊业务运行参数和通知联系人'}
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors text-lg leading-none">
            ×
          </button>
        </div>

        {/* 表单内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100">
            机构基础信息
          </div>

          {isEdit ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyField label="机构名称" value={form.name} />
                <ReadOnlyField label="机构代码" value={form.code} />
                <ReadOnlyField label="机构类别" value={form.type} />
                <ReadOnlyField label="机构级别" value={getInstitutionLevel(form)} />
                <ReadOnlyField label="区划地址" value={form.address} />
              </div>
            </>
          ) : (
            <>
              <DrawerField label="机构名称" required error={errors.name}>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className={inputCls('name')}
                  placeholder="请输入机构全称"
                />
              </DrawerField>

              <DrawerField label="机构代码" required error={errors.code}>
                <input
                  value={form.code}
                  onChange={e => set('code', e.target.value)}
                  className={inputCls('code')}
                  placeholder="请输入机构代码"
                />
              </DrawerField>

              <DrawerField label="机构类别" required error={errors.type}>
                <select
                  value={form.type}
                  onChange={e => setInstitutionType(e.target.value)}
                  className={inputCls('type') + ' bg-white'}
                >
                  <option value="">请选择机构类别</option>
                  {INSTITUTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </DrawerField>

              <div className="grid grid-cols-2 gap-4">
                <DrawerField label="联系人" required error={errors.contact}>
                  <input
                    value={form.contact}
                    onChange={e => set('contact', e.target.value)}
                    className={inputCls('contact')}
                    placeholder="姓名"
                  />
                </DrawerField>
                <DrawerField label="联系电话（医院总机）" required error={errors.phone}>
                  <input
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    className={inputCls('phone')}
                    placeholder="区号-号码"
                  />
                </DrawerField>
              </div>

              <DrawerField label="区划地址">
                <input
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  className={inputCls('address')}
                  placeholder="请输入区划地址（选填）"
                />
              </DrawerField>
            </>
          )}

          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100 pt-2">
            双转业务配置
          </div>

          <div className={`grid gap-3 ${isPrimaryInstitution ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <DrawerField label="转诊咨询专用电话" error={errors.referralConsultPhone}>
              <input
                value={form.referralConsultPhone || ''}
                onChange={e => set('referralConsultPhone', e.target.value)}
                className={inputCls('referralConsultPhone')}
                placeholder="手机号或固话"
              />
            </DrawerField>
            <DrawerField label="转诊联系人">
              <select
                value={form.referralContactUserId || ''}
                disabled={referralContactOptions.length === 0}
                onChange={e => {
                  const nextId = e.target.value
                  const selectedUser = referralContactOptions.find(user => user.userId === nextId)
                  setForm(prev => ({
                    ...prev,
                    referralContactUserId: nextId,
                    referralContactName: selectedUser?.name || '',
                  }))
                }}
                className={inputCls('referralContactUserId') + ' bg-white'}
              >
                <option value="">{referralContactOptions.length ? '请选择联系人' : '暂无可选联系人'}</option>
                {referralContactOptions.map(user => (
                  <option key={user.userId} value={user.userId}>{formatSsoUser(user)}</option>
                ))}
              </select>
            </DrawerField>
            {!isPrimaryInstitution && (
              <DrawerField label="联系电话" error={errors.referralContactPhone}>
                <input
                  value={form.referralContactPhone || ''}
                  onChange={e => set('referralContactPhone', e.target.value)}
                  className={inputCls('referralContactPhone')}
                  placeholder="手机号或固话"
                />
              </DrawerField>
            )}
          </div>

          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100 pt-2">
            接收转诊能力
          </div>

          <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800">{getReceivingAbilityLabel(form)}</div>
                <div className="text-xs text-gray-400 mt-0.5">{getReceivingAbilityTip(form)}</div>
              </div>
              <Toggle value={form[receivingAbilityKey]} onChange={value => set(receivingAbilityKey, value)} />
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-gray-800">接收服务状态</div>
                <span className={`text-xs px-2 py-0.5 rounded ${receivingServiceDetail.tagClass}`}>{receivingServiceDetail.status}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">{receivingServiceDetail.description}</div>
              {receivingServiceDetail.missingItems.length > 0 && (
                <div className="mt-2 space-y-1">
                  {receivingServiceDetail.missingItems.map(item => (
                    <div key={item} className="text-xs text-amber-600">- {item}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100 pt-2">
            院内审核配置
          </div>

          <div className="rounded-lg border border-gray-100 px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-800">转出院内审核</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {isCountyInstitution
                  ? '开启后，县级医生提交转出申请后进入“待内审”；关闭后直接进入“待接收”。建议默认关闭，避免影响患者下转效率。'
                  : '开启后，基层医生提交普通转出申请后进入“待内审”；关闭后直接进入“待受理”。急诊/绿通始终跳过院内审核。'}
              </div>
            </div>
            <Toggle value={form.outgoingAuditEnabled} onChange={value => set('outgoingAuditEnabled', value)} />
          </div>

          {isCountyInstitution && (
            <>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100 pt-2">
                急诊转诊配置
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DrawerField label="急诊科值班联系人">
                  <select
                    value={form.emergencyDutyContactId || ''}
                    onChange={e => {
                      const nextId = e.target.value
                      const selectedDutyContact = EMERGENCY_DUTY_CONTACT_OPTIONS.find(item => item.id === nextId)
                      setForm(prev => ({
                        ...prev,
                        emergencyDutyContactId: nextId,
                        emergencyDutyContactName: selectedDutyContact?.name || '',
                      }))
                    }}
                    className={inputCls('emergencyDutyContactId') + ' bg-white'}
                  >
                    <option value="">请选择值班联系人</option>
                    {EMERGENCY_DUTY_CONTACT_OPTIONS.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-0.5">急诊转诊提交时将通知此联系人，使急诊科提前做好接诊准备</p>
                </DrawerField>
                <DrawerField label="急诊科联系电话" error={errors.emergencyDeptPhone}>
                  <input
                    value={form.emergencyDeptPhone || ''}
                    onChange={e => set('emergencyDeptPhone', e.target.value)}
                    className={inputCls('emergencyDeptPhone')}
                    placeholder="手机号或固话，如 13800138000 / 0838-6213200"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">将作为急诊转诊提交时患者首条短信中的联系电话</p>
                </DrawerField>
              </div>
            </>
          )}

        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors"
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

// ── 科室配置 Tab ────────────────────────────────────────────
function DeptConfigTab({ institutions }) {
  const countyInsts = institutions.filter(i => COUNTY_SERVICE_TYPES.includes(i.type) && i.enabled)
  const [selectedInst, setSelectedInst] = useState(countyInsts[0]?.id || '')
  const [deptConfigs, setDeptConfigs] = useState(SYSTEM_DEPT_CONFIGS)
  const [editRow, setEditRow] = useState(null) // { instId, deptIndex, form }
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1500) }

  const configs = deptConfigs[selectedInst] || []

  const handleEdit = (instId, idx) => {
    setEditRow({ instId, deptIndex: idx, form: { ...configs[idx] } })
  }

  const handleSave = () => {
    const { instId, deptIndex, form } = editRow
    const original = deptConfigs[instId]?.[deptIndex]
    const instName = institutions.find(inst => inst.id === instId)?.name || instId
    const shouldSuggestNursePhone = Number(form.dailyReservedBeds || 0) > 0 && !String(form.nurseStationPhone || '').trim()
    setDeptConfigs(prev => ({
      ...prev,
      [instId]: prev[instId].map((row, i) => i === deptIndex ? {
        ...form,
        updatedAt: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        updatedBy: SYSTEM_ADMIN_OPERATOR,
      } : row),
    }))
    if (original) {
      appendSystemOperationLog({
        domain: '机构配置',
        type: '系统配置变更',
        target: `${instName} · ${form.dept}`,
        detail: {
          配置项: '科室配置',
          机构: instName,
          科室: form.dept,
          门诊号源配置: `${original.dailyQuota ?? 0} → ${form.dailyQuota ?? 0}`,
          门诊位置: `${original.outpatientLocation || '未设置'} → ${form.outpatientLocation || '未设置'}`,
          科室电话: `${original.departmentPhone || '未设置'} → ${form.departmentPhone || '未设置'}`,
          每日转诊保留床位: `${original.dailyReservedBeds ?? 0} → ${form.dailyReservedBeds ?? 0}`,
        },
      })
    }
    setEditRow(null)
    showToast(shouldSuggestNursePhone
      ? '已启用床位池，建议填写护士站联系电话，便于患者到院联系。'
      : '科室配置已保存')
  }

  return (
    <div>
      {toast && <SuccessToast message={toast} />}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-600 whitespace-nowrap">选择机构：</label>
        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          value={selectedInst}
          onChange={e => setSelectedInst(e.target.value)}
        >
          {countyInsts.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <span className="text-xs text-gray-400">仅医院类机构可配置科室号源（基层机构号源由HIS维护）</span>
      </div>
      <div className="mb-4 rounded-lg bg-cyan-50 border border-cyan-100 px-4 py-3 text-xs text-cyan-700">
        科室基础信息来自统一门户，本页仅维护每日转诊保留号源、门诊位置、科室电话、床位、病区、护士站联系电话及急诊/绿通资源说明。
      </div>

      {configs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">暂无科室配置数据</div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['科室名称', '科室代码', '所属机构', '转诊保留号源', '床位配置', '科室电话', '最后更新', '操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {configs.map((row, idx) => (
                <tr key={row.dept} style={{ borderBottom: '1px solid #EEF7F9' }}>
                  <td className={TD + ' font-medium text-gray-800'}>{row.dept}</td>
                  <td className={TD + ' text-gray-500 text-xs font-mono'}>{row.deptCode || row.code || `DEPT-${String(idx + 1).padStart(3, '0')}`}</td>
                  <td className={TD + ' text-gray-600'}>{institutions.find(inst => inst.id === selectedInst)?.name || '—'}</td>
                  <td className={TD}>
                    <span className="font-mono text-sm">{row.dailyQuota === 0 ? <span className="text-gray-400">未启用</span> : `${row.dailyQuota}/日`}</span>
                  </td>
                  <td className={TD}>
                    {row.dailyReservedBeds > 0 ? (
                      <div>
                        <span className="font-mono text-sm text-blue-700">{row.dailyReservedBeds}床/日</span>
                        {row.ward && <div className="text-xs text-gray-400 mt-0.5">{row.ward}</div>}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">未启用</span>
                    )}
                  </td>
                  <td className={TD + ' text-xs text-gray-500'}>{row.departmentPhone || '—'}</td>
                  <td className={TD + ' text-xs text-gray-400'}>{row.updatedAt}</td>
                  <td className={TD}>
                    <button
                      onClick={() => handleEdit(selectedInst, idx)}
                      className="text-xs font-medium"
                      style={{ color: '#0BBECF' }}
                    >编辑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editRow && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditRow(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[88vh] overflow-y-auto p-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">编辑科室配置 — {editRow.form.dept}</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <ReadOnlyField label="科室名称" value={editRow.form.dept} />
                <ReadOnlyField label="科室代码" value={editRow.form.deptCode || editRow.form.code || `DEPT-${String(editRow.deptIndex + 1).padStart(3, '0')}`} />
                <ReadOnlyField label="所属机构" value={institutions.find(inst => inst.id === editRow.instId)?.name} />
              </div>
              <div className="border-t border-gray-100 pt-4 mb-4">
                <div className="text-xs font-medium text-gray-600 mb-3">科室业务参数</div>
                <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    每日转诊保留号源数<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input type="number" min="0" max="99" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" value={editRow.form.dailyQuota} onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, dailyQuota: parseInt(e.target.value) || 0 } }))} />
                  <p className="text-xs text-gray-400 mt-1">每日转诊保留号源；0表示不启用专用号源。</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">门诊位置</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                    placeholder="例：门诊2楼B区 / 呼吸科诊区"
                    value={editRow.form.outpatientLocation ?? ''}
                    onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, outpatientLocation: e.target.value } }))}
                  />
                  <p className="text-xs text-gray-400 mt-1">用于转诊中心填写门诊接诊安排时自动预填，不代表患者最终就诊位置。</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">科室电话</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                    placeholder="例：0838-6213302"
                    value={editRow.form.departmentPhone ?? ''}
                    onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, departmentPhone: e.target.value } }))}
                  />
                  <p className="text-xs text-gray-400 mt-1">用于接诊安排、患者到院指引和短信通知。</p>
                </div>
              </div>
              </div>

              <div className="border-t border-dashed border-gray-200 pt-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      每日转诊保留床位数<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                      type="number" min="0" max="99"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      value={editRow.form.dailyReservedBeds ?? 0}
                      onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, dailyReservedBeds: parseInt(e.target.value) || 0 } }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">仅在承接方式为住院时用于接诊安排参考；0表示不启用床位池。</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">病区名称</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      placeholder="例：心内科病区（6楼东）"
                      value={editRow.form.ward ?? ''}
                      onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, ward: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">护士站联系电话</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      placeholder="例：0836-12345601"
                      value={editRow.form.nurseStationPhone ?? ''}
                      onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, nurseStationPhone: e.target.value } }))}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200 pt-4 mb-4">
                <div className="text-xs font-medium text-gray-600 mb-3">急诊/绿通展示配置</div>
                <label className="block text-xs text-gray-500 mb-1">绿色通道资源说明</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                  placeholder="例：胸痛中心绿色通道已开启，导管室24小时待命。"
                  value={editRow.form.rescueResources ?? ''}
                  onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, rescueResources: e.target.value } }))}
                />
                <p className="text-xs text-gray-400 mt-1">仅用于急诊/绿通转诊详情页展示，便于转诊中心了解科室资源状态，不参与自动分诊判断。</p>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded p-3 mb-4 text-xs text-gray-500">
                科室配置仅用于转诊通知、接诊安排预填及号源/床位参考；配置为0表示不启用对应资源池，具体接诊地点和联系电话以转诊中心最终安排为准。
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setEditRow(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600">取消</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm text-white rounded-lg" style={{ background: '#0BBECF' }}>保存</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── 主页面 ─────────────────────────────────────────────────
export default function InstitutionManage() {
  const [list, setList] = useState(SYSTEM_INSTITUTION_CONFIGS)
  const [syncState, setSyncState] = useState({ status: 'success', lastSyncText: '2 小时前' })

  // 筛选
  const [filters, setFilters] = useState({ name: '', type: 'all' })
  const [applied, setApplied] = useState({ name: '', type: 'all' })

  // 分页
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  // 抽屉
  const [drawer, setDrawer] = useState(null) // null | { mode: 'create'|'edit', data: obj|null }

  // 成功提示
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1500)
  }

  // 筛选逻辑（前端过滤）
  const filtered = useMemo(() => {
    return list.filter(inst => {
      if (applied.type !== 'all' && inst.type !== applied.type) return false
      if (applied.name.trim() && !inst.name.includes(applied.name.trim())) return false
      return true
    })
  }, [list, applied])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleQuery = () => { setApplied({ ...filters }); setPage(1) }
  const handleReset = () => {
    const empty = { name: '', type: 'all' }
    setFilters(empty); setApplied(empty); setPage(1)
  }

  const handleRefreshSync = () => {
    setSyncState({ status: 'success', lastSyncText: '刚刚' })
    showToast('机构列表已刷新')
  }

  // 新增
  const handleCreate = () => setDrawer({ mode: 'create', data: null })

  // 编辑
  const handleEdit = (inst) => setDrawer({ mode: 'edit', data: inst })

  // 保存（新增或编辑）
  const handleSave = (formData) => {
    if (drawer.mode === 'create') {
      const newInst = { ...formData, id: `I${String(_nextId++).padStart(3, '0')}` }
      const isCounty = isCountyInstitutionType(newInst.type)
      setList(prev => [newInst, ...prev])
      appendSystemOperationLog({
        domain: '机构配置',
        type: '机构信息变更',
        target: newInst.name,
        detail: {
          操作: '新增机构',
          机构名称: newInst.name,
          机构代码: newInst.code,
          机构类别: newInst.type,
          转诊咨询专用电话: newInst.referralConsultPhone || '未设置',
          转诊联系人: newInst.referralContactName || '未设置',
          转诊联系电话: newInst.referralContactPhone || '未设置',
          基层转诊负责人: newInst.referralCoordinatorName || '未设置',
          急诊科值班联系人: isCounty ? (newInst.emergencyDutyContactName || '未设置') : '不适用',
          急诊科联系电话: isCounty ? (newInst.emergencyDeptPhone || '未设置') : '不适用',
          接收转诊能力: `${getReceivingAbilityLabel(newInst)}：${newInst[getReceivingAbilityKey(newInst)] ? '开启' : '关闭'}`,
          转出院内审核: newInst.outgoingAuditEnabled ? '开启' : '关闭',
        },
      })
      showToast('机构新增成功')
    } else {
      const original = drawer.data
      const editablePayload = {
        referralConsultPhone: formData.referralConsultPhone,
        referralContactUserId: formData.referralContactUserId,
        referralContactName: formData.referralContactName,
        referralContactPhone: formData.referralContactPhone,
        referralCoordinatorUserId: formData.referralCoordinatorUserId,
        referralCoordinatorName: formData.referralCoordinatorName,
        emergencyDutyContactId: formData.emergencyDutyContactId,
        emergencyDutyContactName: formData.emergencyDutyContactName,
        emergencyDeptPhone: formData.emergencyDeptPhone,
        canUp: formData.canUp,
        canDown: formData.canDown,
        enabled: formData.enabled,
        outgoingAuditEnabled: formData.outgoingAuditEnabled,
      }
      setList(prev => prev.map(inst => inst.id === drawer.data.id ? { ...inst, ...editablePayload } : inst))
      appendSystemOperationLog({
        domain: '机构配置',
        type: '机构信息变更',
        target: original.name,
        detail: {
          操作: '编辑机构',
          转诊咨询专用电话: `${original.referralConsultPhone || '未设置'} → ${formData.referralConsultPhone || '未设置'}`,
          转诊联系人: `${original.referralContactName || '未设置'} → ${formData.referralContactName || '未设置'}`,
          转诊联系电话: `${original.referralContactPhone || '未设置'} → ${formData.referralContactPhone || '未设置'}`,
          基层转诊负责人: `${original.referralCoordinatorName || '未设置'} → ${formData.referralCoordinatorName || '未设置'}`,
          急诊科值班联系人: `${original.emergencyDutyContactName || '未设置'} → ${formData.emergencyDutyContactName || '未设置'}`,
          急诊科联系电话: `${original.emergencyDeptPhone || '未设置'} → ${formData.emergencyDeptPhone || '未设置'}`,
          接收转诊能力: `${original[getReceivingAbilityKey(original)] ? '开启' : '关闭'} → ${formData[getReceivingAbilityKey(original)] ? '开启' : '关闭'}`,
          转出院内审核: `${original.outgoingAuditEnabled ? '开启' : '关闭'} → ${formData.outgoingAuditEnabled ? '开启' : '关闭'}`,
        },
      })
      showToast('机构转诊配置已保存')
    }
    setDrawer(null)
  }

  const [mainTab, setMainTab] = useState('institutions') // 'institutions' | 'deptConfig'

  return (
    <div className="p-5">

      {/* 成功提示 */}
      {toast && <SuccessToast message={toast} />}

      {/* 页面标题区 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">机构转诊参数配置</h2>
        </div>
        {mainTab === 'institutions' && <button
          onClick={handleCreate}
          className="hidden items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: '#0BBECF' }}
          onMouseEnter={e => e.currentTarget.style.background = '#0892a0'}
          onMouseLeave={e => e.currentTarget.style.background = '#0BBECF'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新增机构
        </button>}
      </div>

      {/* 主 Tab 切换：机构列表 / 科室配置 */}
      <div className="flex gap-0 mb-4" style={{ borderBottom: '2px solid #E0F6F9' }}>
        {[
          { key: 'institutions', label: '机构列表' },
          { key: 'deptConfig',   label: '科室配置' },
        ].map(t => (
          <button key={t.key} onClick={() => setMainTab(t.key)}
            className="px-5 py-2.5 text-sm font-medium transition-colors"
            style={mainTab === t.key
              ? { color: '#0BBECF', borderBottom: '2px solid #0BBECF', marginBottom: '-2px' }
              : { color: '#6b7280' }}
          >{t.label}</button>
        ))}
      </div>

      {/* 科室配置 Tab */}
      {mainTab === 'deptConfig' && <DeptConfigTab institutions={list} />}

      {/* 筛选栏（仅机构列表 Tab 显示）*/}
      {mainTab === 'institutions' && <>
      <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
        <div className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">配置说明</div>
        <div className="text-xs text-gray-500">机构基础信息、用户、角色、菜单及按钮权限由医共体统一门户统一维护；本页仅维护双向转诊业务运行参数和通知联系人配置。</div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">机构名称</label>
            <input
              value={filters.name}
              onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
              placeholder="输入机构名称搜索"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">机构类别</label>
            <select
              value={filters.type}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white focus:ring-1 focus:ring-[#0BBECF]"
            >
              <option value="all">全部</option>
              {INSTITUTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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

      <div className="mb-4 flex items-center justify-between rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-2.5 text-xs">
        {syncState.status === 'failed' ? (
          <span className="text-red-600">📡 机构列表同步自医共体统一门户，最后同步失败，请稍后重试</span>
        ) : (
          <span className="text-cyan-700">📡 机构列表同步自医共体统一门户，最后同步：{syncState.lastSyncText}</span>
        )}
        <button
          onClick={handleRefreshSync}
          className="rounded border border-cyan-200 bg-white px-2.5 py-1 font-medium text-cyan-700 hover:bg-cyan-50"
        >
          刷新
        </button>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 980 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['序号', '机构名称', '机构代码', '机构类别', '机构级别', '区划地址', '接收转诊能力', '接收服务状态', '操作'].map(h => (
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-sm">暂无机构信息</span>
                      <span className="text-xs text-gray-300">机构信息由医共体统一门户同步</span>
                    </div>
                  </td>
                </tr>
              ) : pageData.map((inst, i) => {
                const serviceStatus = getReceivingServiceStatus(inst, { users: SYSTEM_SSO_USERS, deptConfigs: SYSTEM_DEPT_CONFIGS })
                const abilityKey = getReceivingAbilityKey(inst)
                return (
                <tr
                  key={inst.id}
                  style={{
                    borderBottom: '1px solid #EEF7F9',
                    background: i % 2 === 0 ? '#fff' : '#FAFEFE',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}
                >
                  <td className={TD}>
                    <RowNo n={(page - 1) * PAGE_SIZE + i + 1} />
                  </td>
                  <td className={TD + ' font-medium text-gray-800 max-w-[160px]'}>
                    <span className="truncate block" title={inst.name}>{inst.name}</span>
                  </td>
                  <td className={TD + ' text-gray-500 font-mono text-xs'}>{inst.code}</td>
                  <td className={TD}>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_TAG[inst.type] || 'bg-gray-100 text-gray-600'}`}>
                      {inst.type}
                    </span>
                  </td>
                  <td className={TD + ' text-gray-600'}>{getInstitutionLevel(inst)}</td>
                  <td className={TD + ' text-gray-500 max-w-[180px]'}>
                    <span className="truncate block" title={inst.address}>{inst.address || '—'}</span>
                  </td>
                  <td className={TD}>
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${inst[abilityKey] ? 'bg-cyan-50 text-cyan-700' : 'bg-gray-100 text-gray-500'}`}>
                      {inst[abilityKey] ? '开启' : '关闭'}
                    </span>
                  </td>
                  <td className={TD}>
                    <span className={`text-xs px-2 py-0.5 rounded ${getReceivingStatusClass(serviceStatus)}`}>{serviceStatus}</span>
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEdit(inst)}
                        className="text-sm font-medium transition-colors"
                        style={{ color: '#0BBECF' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#0892a0'}
                        onMouseLeave={e => e.currentTarget.style.color = '#0BBECF'}
                      >
                        编辑
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
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
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
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

      {/* 新增 / 编辑抽屉 */}
      {drawer && (
        <InstitutionDrawer
          mode={drawer.mode}
          initial={drawer.data}
          onClose={() => setDrawer(null)}
          onSave={handleSave}
        />
      )}

      </> /* end mainTab === 'institutions' */}

    </div>
  )
}

import { useState, useMemo } from 'react'
import {
  appendSystemOperationLog,
  SYSTEM_ADMIN_OPERATOR,
  SYSTEM_DEPT_CONFIGS,
  SYSTEM_INSTITUTION_CONFIGS,
} from '../../data/systemAdminConfig'

let _nextId = 6

// ── 常量 ───────────────────────────────────────────────────
const INSTITUTION_TYPES = ['县级医院', '乡镇卫生院', '村卫生室']

const TYPE_TAG = {
  '县级医院':   'bg-purple-100 text-purple-700',
  '乡镇卫生院': 'bg-blue-100 text-blue-700',
  '村卫生室':   'bg-green-100 text-green-700',
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
  emergencyDutyContactId: '', emergencyDutyContactName: '', emergencyDeptPhone: '',
  patientNoticeTemplate: '',
  canUp: true, canDown: true, enabled: true,
}

// ── 辅助小组件 ─────────────────────────────────────────────
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

function Toggle({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer" onClick={() => onChange(!value)}>
      <div className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-[#0BBECF]' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-sm text-gray-700">{value ? '开启' : '关闭'}</span>
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

// ── 停用确认弹窗 ───────────────────────────────────────────
function DisableConfirmModal({ institution, onCancel, onConfirm }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl w-[400px] p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800 mb-1">停用机构确认</div>
              <div className="text-sm text-gray-500 leading-relaxed">
                确认停用 <span className="font-medium text-gray-800">「{institution.name}」</span> ？<br />
                停用后该机构将无法接收新转诊申请，已进行中的转诊不受影响。
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

// ── 新增 / 编辑抽屉 ────────────────────────────────────────
function InstitutionDrawer({ mode, initial, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(initial || {}),
    emergencyDutyContactId: initial?.emergencyDutyContactId || '',
    emergencyDutyContactName: initial?.emergencyDutyContactName || initial?.emergencyDutyContact || '',
  }))
  const [errors, setErrors] = useState({})

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim())    errs.name    = '请填写机构名称'
    if (!form.code.trim())    errs.code    = '请填写机构编码'
    if (!form.type)           errs.type    = '请选择机构类型'
    if (!form.contact.trim()) errs.contact = '请填写联系人'
    if (!form.phone.trim())   errs.phone   = '请填写联系电话'
    if (form.type === '县级医院' && form.emergencyDeptPhone?.trim()) {
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
    onSave({
      ...form,
      emergencyDutyContactName: selectedDutyContact?.name || '',
    })
  }

  const inputCls = (key) =>
    `w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
      errors[key] ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-[#0BBECF]'
    }`

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {mode === 'create' ? '新增机构' : '编辑机构信息'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {mode === 'create' ? '填写新机构基本信息与转诊能力配置' : `编辑 ${initial?.name}`}
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors text-lg leading-none">
            ×
          </button>
        </div>

        {/* 表单内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100">
            基本信息
          </div>

          <DrawerField label="机构名称" required error={errors.name}>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={inputCls('name')}
              placeholder="请输入机构全称"
            />
          </DrawerField>

          <DrawerField label="机构编码" required error={errors.code}>
            <input
              value={form.code}
              onChange={e => set('code', e.target.value)}
              className={inputCls('code')}
              placeholder="请输入国家卫健委机构编码"
            />
            <p className="text-xs text-gray-400 mt-0.5">统一填写国家卫健委机构编码（10位数字）</p>
          </DrawerField>

          <DrawerField label="机构类型" required error={errors.type}>
            <select
              value={form.type}
              onChange={e => set('type', e.target.value)}
              className={inputCls('type') + ' bg-white'}
            >
              <option value="">请选择机构类型</option>
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
            <DrawerField label="联系电话" required error={errors.phone}>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className={inputCls('phone')}
                placeholder="区号-号码"
              />
            </DrawerField>
          </div>

          <DrawerField label="详细地址">
            <input
              value={form.address}
              onChange={e => set('address', e.target.value)}
              className={inputCls('address')}
              placeholder="省市区街道详细地址（选填）"
            />
          </DrawerField>

          {form.type === '县级医院' && (
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

              <DrawerField label="患者须知模板">
                <textarea
                  value={form.patientNoticeTemplate || ''}
                  onChange={e => set('patientNoticeTemplate', e.target.value)}
                  className={inputCls('patientNoticeTemplate') + ' resize-none'}
                  rows={5}
                  placeholder="支持占位符：[接诊科室] [预约码] [病区] [床位号] [护士站电话]；留空时短信预览使用系统默认模板"
                />
                <p className="text-xs text-gray-400 mt-0.5">用于接诊安排完成后的患者短信末尾须知内容，仅做原型展示。</p>
              </DrawerField>
            </>
          )}

          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100 pt-2">
            转诊能力配置
          </div>

          <div className="space-y-3 py-1">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div>
                <div className="text-sm text-gray-700 font-medium">上转能力</div>
                <div className="text-xs text-gray-400 mt-0.5">允许该机构发起上转申请</div>
              </div>
              <Toggle value={form.canUp} onChange={v => set('canUp', v)} />
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div>
                <div className="text-sm text-gray-700 font-medium">下转能力</div>
                <div className="text-xs text-gray-400 mt-0.5">允许该机构接收下转患者</div>
              </div>
              <Toggle value={form.canDown} onChange={v => set('canDown', v)} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm text-gray-700 font-medium">启用状态</div>
                <div className="text-xs text-gray-400 mt-0.5">停用后该机构无法参与新的转诊业务</div>
              </div>
              <Toggle value={form.enabled} onChange={v => set('enabled', v)} />
            </div>
          </div>

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
    </>
  )
}

// ── 科室配置 Tab ────────────────────────────────────────────
function DeptConfigTab({ institutions }) {
  const countyInsts = institutions.filter(i => i.type === '县级医院' && i.enabled)
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
          科室负责人: `${original.head || '未设置'} → ${form.head || '未设置'}`,
          对口联系医生: `${original.partnerDoctor || '未设置'} → ${form.partnerDoctor || '未设置'}`,
          每日转诊保留名额: `${original.dailyQuota ?? 0} → ${form.dailyQuota ?? 0}`,
          每日转诊保留床位: `${original.dailyReservedBeds ?? 0} → ${form.dailyReservedBeds ?? 0}`,
        },
      })
    }
    setEditRow(null)
    showToast('科室配置已保存')
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
        <span className="text-xs text-gray-400">仅县级医院可配置科室号源（基层机构号源由HIS维护）</span>
      </div>
      <div className="mb-4 rounded-lg bg-cyan-50 border border-cyan-100 px-4 py-3 text-xs text-cyan-700">
        科室由机构主数据同步，本页仅维护转诊相关配置，不在此处新增科室。
      </div>

      {configs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">暂无科室配置数据</div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['科室', '科室负责人', '对口联系医生', '每日转诊保留名额', '床位池（转诊专用）', '最后更新', '最后修改人', '操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {configs.map((row, idx) => (
                <tr key={row.dept} style={{ borderBottom: '1px solid #EEF7F9' }}>
                  <td className={TD + ' font-medium text-gray-800'}>{row.dept}</td>
                  <td className={TD + ' text-sm text-gray-600'}>{row.head || '—'}</td>
                  <td className={TD}>
                    {row.partnerDoctor && row.partnerDoctor !== '—'
                      ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#E0F6F9', color: '#0892a0' }}>{row.partnerDoctor}</span>
                      : <span className="text-xs text-gray-400">未配置</span>
                    }
                  </td>
                  <td className={TD}>
                    <span className="font-mono text-sm">{row.dailyQuota === 0 ? <span className="text-gray-400">未启用</span> : `${row.dailyQuota} 个/日`}</span>
                  </td>
                  <td className={TD}>
                    {row.dailyReservedBeds > 0 ? (
                      <div>
                        <span className="font-mono text-sm text-blue-700">{row.dailyReservedBeds} 床/日</span>
                        {row.ward && <div className="text-xs text-gray-400 mt-0.5">{row.ward}</div>}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">未配置</span>
                    )}
                  </td>
                  <td className={TD + ' text-xs text-gray-400'}>{row.updatedAt}</td>
                  <td className={TD + ' text-xs text-gray-500'}>{row.updatedBy || '—'}</td>
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
            <div className="bg-white rounded-xl shadow-2xl w-[480px] p-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">编辑科室配置 — {editRow.form.dept}</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">科室负责人</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" value={editRow.form.head} onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, head: e.target.value } }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">对口联系医生 <span className="text-gray-400">（超时优先推送）</span></label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" placeholder="选填，留空则广播" value={editRow.form.partnerDoctor === '—' ? '' : editRow.form.partnerDoctor} onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, partnerDoctor: e.target.value || '—' } }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">每日转诊号源 <span className="text-gray-400">（0=不启用）</span></label>
                  <input type="number" min="0" max="99" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" value={editRow.form.dailyQuota} onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, dailyQuota: parseInt(e.target.value) || 0 } }))} />
                </div>
              </div>

              {/* J-4：床位池配置 */}
              <div className="border-t border-dashed border-gray-200 pt-4 mb-4">
                <div className="text-xs font-medium text-gray-600 mb-3">🛏 床位池配置（J-4）</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">
                      每日转诊保留床位数 <span className="text-gray-400">（0=不启用）</span>
                    </label>
                    <input
                      type="number" min="0" max="99"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      value={editRow.form.dailyReservedBeds ?? 0}
                      onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, dailyReservedBeds: parseInt(e.target.value) || 0 } }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">⚠️ 政策要求预留比例≥20%，请参照科室实际床位数填写</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">病区名称 <span className="text-gray-400">（选填）</span></label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      placeholder="例：心内科病区（6楼东）"
                      value={editRow.form.ward ?? ''}
                      onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, ward: e.target.value } }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">将在接诊安排中自动预填</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">护士站联系电话 <span className="text-gray-400">（选填）</span></label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      placeholder="例：0836-12345601"
                      value={editRow.form.nurseStationPhone ?? ''}
                      onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, nurseStationPhone: e.target.value } }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">将在接诊安排中自动预填并推送患者短信</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">抢救资源 <span className="text-gray-400">（仅绿色通道展示）</span></label>
                    <textarea
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                      placeholder="例：胸痛中心绿色通道已开启，导管室24小时待命"
                      value={editRow.form.rescueResources ?? ''}
                      onChange={e => setEditRow(p => ({ ...p, form: { ...p.form, rescueResources: e.target.value } }))}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded p-3 mb-4 text-xs text-blue-600">
                每日转诊保留名额为系统分配的转诊专用号，0 表示不启用专用号源。对口联系医生配置后，有新转诊申请时将优先推送给该医生，3小时无响应后再广播全科室。
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

  // 筛选
  const [filters, setFilters] = useState({ name: '', type: 'all', enabled: 'all' })
  const [applied, setApplied] = useState({ name: '', type: 'all', enabled: 'all' })

  // 分页
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  // 抽屉
  const [drawer, setDrawer] = useState(null) // null | { mode: 'create'|'edit', data: obj|null }

  // 停用确认弹窗
  const [disableTarget, setDisableTarget] = useState(null) // institution obj

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
      if (applied.enabled !== 'all') {
        const wantEnabled = applied.enabled === 'enabled'
        if (inst.enabled !== wantEnabled) return false
      }
      if (applied.name.trim() && !inst.name.includes(applied.name.trim())) return false
      return true
    })
  }, [list, applied])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleQuery = () => { setApplied({ ...filters }); setPage(1) }
  const handleReset = () => {
    const empty = { name: '', type: 'all', enabled: 'all' }
    setFilters(empty); setApplied(empty); setPage(1)
  }

  // 新增
  const handleCreate = () => setDrawer({ mode: 'create', data: null })

  // 编辑
  const handleEdit = (inst) => setDrawer({ mode: 'edit', data: inst })

  // 保存（新增或编辑）
  const handleSave = (formData) => {
    if (drawer.mode === 'create') {
      const newInst = { ...formData, id: `I${String(_nextId++).padStart(3, '0')}` }
      setList(prev => [newInst, ...prev])
      appendSystemOperationLog({
        domain: '机构配置',
        type: '机构信息变更',
        target: newInst.name,
        detail: {
          操作: '新增机构',
          机构名称: newInst.name,
          机构编码: newInst.code,
          机构类型: newInst.type,
          上转能力: newInst.canUp ? '开启' : '关闭',
          下转能力: newInst.canDown ? '开启' : '关闭',
        },
      })
      showToast('机构新增成功')
    } else {
      const original = drawer.data
      setList(prev => prev.map(inst => inst.id === drawer.data.id ? { ...inst, ...formData } : inst))
      appendSystemOperationLog({
        domain: '机构配置',
        type: '机构信息变更',
        target: original.name,
        detail: {
          操作: '编辑机构',
          机构名称: `${original.name} → ${formData.name}`,
          联系人: `${original.contact || '未设置'} → ${formData.contact || '未设置'}`,
          联系电话: `${original.phone || '未设置'} → ${formData.phone || '未设置'}`,
          上转能力: `${original.canUp ? '开启' : '关闭'} → ${formData.canUp ? '开启' : '关闭'}`,
          下转能力: `${original.canDown ? '开启' : '关闭'} → ${formData.canDown ? '开启' : '关闭'}`,
          启用状态: `${original.enabled ? '启用' : '停用'} → ${formData.enabled ? '启用' : '停用'}`,
        },
      })
      showToast('机构信息已保存')
    }
    setDrawer(null)
  }

  // 停用点击
  const handleDisableClick = (inst) => setDisableTarget(inst)

  // 确认停用
  const handleConfirmDisable = () => {
    setList(prev => prev.map(inst => inst.id === disableTarget.id ? { ...inst, enabled: false } : inst))
    appendSystemOperationLog({
      domain: '机构配置',
      type: '机构信息变更',
      target: disableTarget.name,
      detail: {
        操作: '停用机构',
        机构名称: disableTarget.name,
        变更字段: '启用状态',
        原值: '启用',
        新值: '停用',
      },
    })
    showToast(`已停用「${disableTarget.name}」`)
    setDisableTarget(null)
  }

  // 直接启用（无需确认）
  const handleEnable = (inst) => {
    setList(prev => prev.map(i => i.id === inst.id ? { ...i, enabled: true } : i))
    appendSystemOperationLog({
      domain: '机构配置',
      type: '机构信息变更',
      target: inst.name,
      detail: {
        操作: '启用机构',
        机构名称: inst.name,
        变更字段: '启用状态',
        原值: '停用',
        新值: '启用',
      },
    })
    showToast(`已启用「${inst.name}」`)
  }

  const [mainTab, setMainTab] = useState('institutions') // 'institutions' | 'deptConfig'

  return (
    <div className="p-5">

      {/* 成功提示 */}
      {toast && <SuccessToast message={toast} />}

      {/* 页面标题区 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">机构与转诊能力配置</h2>
          <div className="text-xs text-gray-400 mt-0.5">机构基础信息维护 · 转诊能力与资源配置</div>
        </div>
        {mainTab === 'institutions' && <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
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
        <div className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">机构基础信息</div>
        <div className="text-xs text-gray-500">维护机构档案、启停状态与基础转诊能力；转诊资源与科室承接能力请在“科室配置”中维护。</div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl p-4 mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="grid grid-cols-4 gap-3 mb-3">
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
            <label className="block text-xs text-gray-500 mb-1">机构类型</label>
            <select
              value={filters.type}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white focus:ring-1 focus:ring-[#0BBECF]"
            >
              <option value="all">全部</option>
              {INSTITUTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['序号', '机构名称', '机构编码', '机构类型', '联系人', '联系电话', '上转能力', '下转能力', '状态', '操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-sm">暂无机构信息</span>
                      <span className="text-xs text-gray-300">可点击右上角「新增机构」添加</span>
                    </div>
                  </td>
                </tr>
              ) : pageData.map((inst, i) => (
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
                  <td className={TD + ' text-gray-600'}>{inst.contact}</td>
                  <td className={TD + ' text-gray-500 text-xs font-mono'}>{inst.phone}</td>
                  <td className={TD}>
                    {inst.canUp
                      ? <span className="text-green-600 font-medium text-sm">✓</span>
                      : <span className="text-gray-400 text-sm">—</span>
                    }
                  </td>
                  <td className={TD}>
                    {inst.canDown
                      ? <span className="text-green-600 font-medium text-sm">✓</span>
                      : <span className="text-gray-400 text-sm">—</span>
                    }
                  </td>
                  <td className={TD}>
                    {inst.enabled
                      ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">启用</span>
                      : <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded">停用</span>
                    }
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
                      {inst.enabled ? (
                        <button
                          onClick={() => handleDisableClick(inst)}
                          className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                        >
                          停用
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnable(inst)}
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

      {/* 停用确认弹窗 */}
      {disableTarget && (
        <DisableConfirmModal
          institution={disableTarget}
          onCancel={() => setDisableTarget(null)}
          onConfirm={handleConfirmDisable}
        />
      )}

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

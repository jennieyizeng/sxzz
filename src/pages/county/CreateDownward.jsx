import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { INSTITUTIONS, MOCK_PATIENTS, UPWARD_STATUS } from '../../data/mockData'

const STEPS = ['患者选择', '康复方案', '选择机构', '知情同意', '确认提交']

// B-03: 知情同意步骤索引
const CONSENT_STEP_INDEX = 3

const MONITOR_OPTIONS = ['血压', '血糖', '体温', '心率', '体重', '肢体活动度', '语言功能', '认知功能', '疼痛评分']

const EMPTY_MED = { name: '', spec: '', usage: '' }

export default function CreateDownward() {
  const navigate = useNavigate()
  const { createDownwardReferral, currentUser, referrals } = useApp()
  const [step, setStep] = useState(0)

  // C-02: 出院医嘱/检查报告附件
  const [attachments, setAttachments] = useState([]) // [{ name, size, type, url }]

  // B-03: 知情同意 state
  const [consentMethod, setConsentMethod] = useState('') // 'onsite' | 'sms'
  const [consentSent, setConsentSent] = useState(false)   // 短信是否已发送
  const [consentSigned, setConsentSigned] = useState(false) // 是否已签署完成

  // 已完成的上转记录（可直接选患者）
  const completedUpward = referrals.filter(r =>
    r.type === 'upward' && r.status === UPWARD_STATUS.COMPLETED
  )

  const [form, setForm] = useState({
    // 患者
    patientId: '',
    patientName: '',
    patientGender: '',
    patientAge: '',
    patientPhone: '',
    patientIdCard: '',
    // 病情
    chiefComplaint: '',
    diagnosis: null,
    diagnosisText: '',
    reason: '',
    stayDays: '',
    // 康复方案
    medications: [{ ...EMPTY_MED }],
    rehabNotes: '',
    followupDate: '',
    indicators: [],
    // 机构
    toInstitutionId: '',
    toDept: '',
  })

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }))

  // 从已完成上转记录快速填入患者
  const fillFromUpward = (ref) => {
    setF('patientId', ref.patient.id)
    setF('patientName', ref.patient.name)
    setF('patientGender', ref.patient.gender)
    setF('patientAge', String(ref.patient.age))
    setF('patientPhone', ref.patient.phone)
    setF('patientIdCard', ref.patient.idCard || '')
    setF('diagnosis', ref.diagnosis)
    setF('diagnosisText', `${ref.diagnosis.code} ${ref.diagnosis.name}`)
  }

  const toggleIndicator = (ind) => {
    setF('indicators', form.indicators.includes(ind)
      ? form.indicators.filter(i => i !== ind)
      : [...form.indicators, ind]
    )
  }

  const addMed = () => setF('medications', [...form.medications, { ...EMPTY_MED }])
  const removeMed = (i) => setF('medications', form.medications.filter((_, idx) => idx !== i))
  const updateMed = (i, key, val) => {
    const meds = [...form.medications]
    meds[i] = { ...meds[i], [key]: val }
    setF('medications', meds)
  }

  const selectedInst = INSTITUTIONS.find(i => i.id === form.toInstitutionId)

  const canNext = [
    form.patientName && form.patientGender && form.patientAge,
    form.chiefComplaint && form.reason && form.followupDate,
    form.toInstitutionId && form.toDept,
    // B-03: 知情同意步骤必须完成签署才能进入下一步
    consentSigned,
    // 确认提交步骤直接允许
    true,
  ][step]

  const handleSubmit = () => {
    const inst = INSTITUTIONS.find(i => i.id === form.toInstitutionId)
    const id = createDownwardReferral({
      patient: {
        id: form.patientId || `p${Date.now()}`,
        name: form.patientName,
        gender: form.patientGender,
        age: parseInt(form.patientAge),
        phone: form.patientPhone,
        idCard: form.patientIdCard,
      },
      diagnosis: form.diagnosis || { code: '—', name: form.diagnosisText },
      chiefComplaint: form.chiefComplaint,
      reason: form.reason,
      stayDays: parseInt(form.stayDays) || 0,
      toInstitution: inst?.name,
      toDept: form.toDept,
      rehabPlan: {
        medications: form.medications.filter(m => m.name),
        notes: form.rehabNotes,
        followupDate: form.followupDate,
        indicators: form.indicators,
      },
      // C-02: 出院医嘱/检查报告附件（TODO: 实际上传后替换为 URL）
      attachments: attachments.map(f => ({ name: f.name, size: f.size })),
    })
    navigate(`/referral/${id}`)
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/county/dashboard')} className="hover:underline" style={{ color: '#0BBECF' }}>工作台</button>
          <span>›</span><span>发起下转</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-800">发起下转申请</h1>
      </div>

      {/* 步骤条 */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                style={i < step ? { background: '#10b981', color: '#fff' }
                  : i === step ? { background: '#0BBECF', color: '#fff', boxShadow: '0 0 0 4px #B2EEF5' }
                  : { background: '#f3f4f6', color: '#9ca3af' }}>
                {i < step ? '✓' : i + 1}
              </div>
              <div className="text-xs mt-1.5 whitespace-nowrap"
                style={i === step ? { color: '#0BBECF', fontWeight: '600' }
                  : i < step ? { color: '#10b981' } : { color: '#9ca3af' }}>
                {s}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mt-[-12px] rounded"
                style={{ background: i < step ? '#67dfe9' : '#e5e7eb' }} />
            )}
          </div>
        ))}
      </div>

      {/* 表单卡片 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>

        {/* ── Step 0: 患者选择 ── */}
        {step === 0 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">选择下转患者</h2>

            {/* 从已完成上转快速选 */}
            {completedUpward.length > 0 && (
              <div className="mb-5 p-3 rounded-lg" style={{ background: '#F0FBFC', border: '1px solid #C8EEF3' }}>
                <div className="text-xs font-medium mb-2" style={{ color: '#0892a0' }}>
                  📋 从已完成上转记录中选择（快速填入）
                </div>
                <div className="space-y-2">
                  {completedUpward.map(ref => (
                    <div key={ref.id}
                      onClick={() => fillFromUpward(ref)}
                      className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 cursor-pointer transition-all"
                      style={{ border: `1px solid ${form.patientId === ref.patient.id ? '#0BBECF' : '#e5e7eb'}` }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#67dfe9'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = form.patientId === ref.patient.id ? '#0BBECF' : '#e5e7eb'}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: '#0BBECF' }}>
                          {ref.patient.name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            {ref.patient.name}
                            <span className="text-gray-400 ml-1 font-normal text-xs">{ref.patient.age}岁 · {ref.patient.gender}</span>
                          </div>
                          <div className="text-xs text-gray-400">{ref.diagnosis.code} {ref.diagnosis.name}</div>
                        </div>
                      </div>
                      <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#ecfdf5', color: '#047857' }}>
                        {ref.referralNo || ref.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">姓名 <span className="text-red-500">*</span></label>
                <input className={inputCls} value={form.patientName} onChange={e => setF('patientName', e.target.value)} placeholder="患者姓名" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">性别 <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  {['男', '女'].map(g => (
                    <button key={g} type="button" onClick={() => setF('patientGender', g)}
                      className="flex-1 py-2 rounded-lg text-sm border transition-colors"
                      style={form.patientGender === g ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' } : { background: '#fff', color: '#4b5563', borderColor: '#d1d5db' }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">年龄 <span className="text-red-500">*</span></label>
                <input className={inputCls} type="number" value={form.patientAge} onChange={e => setF('patientAge', e.target.value)} placeholder="岁" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">联系电话</label>
                <input className={inputCls} value={form.patientPhone} onChange={e => setF('patientPhone', e.target.value)} placeholder="138****5678" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">诊断</label>
                <input className={inputCls} value={form.diagnosisText} onChange={e => setF('diagnosisText', e.target.value)} placeholder="如：I63.9 脑梗死（急性期治疗完成，进入康复期）" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">本次住院概况</label>
                <textarea className={inputCls + ' resize-none'} rows={3}
                  value={form.chiefComplaint} onChange={e => setF('chiefComplaint', e.target.value)}
                  placeholder="简述患者此次住院经过、治疗情况及当前状态（如：脑梗死急性期治疗，溶栓后生命体征平稳，左侧肢体功能受限…）" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">住院天数</label>
                <input className={inputCls} type="number" value={form.stayDays} onChange={e => setF('stayDays', e.target.value)} placeholder="天" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">下转原因 <span className="text-red-500">*</span></label>
                <input className={inputCls} value={form.reason} onChange={e => setF('reason', e.target.value)} placeholder="如：急性期治疗完成，需转基层继续康复管理" />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: 康复方案 ── */}
        {step === 1 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">填写康复方案</h2>
            <div className="space-y-5">

              {/* 用药清单 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">带药清单</label>
                  <button onClick={addMed} className="text-xs px-2.5 py-1 rounded-lg text-white" style={{ background: '#0BBECF' }}>+ 添加药物</button>
                </div>
                <div className="space-y-2">
                  {form.medications.map((med, i) => (
                    <div key={i} className="flex gap-2 items-start p-3 rounded-lg" style={{ background: '#F8FDFE', border: '1px solid #DDF0F3' }}>
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <input className={inputCls} value={med.name} onChange={e => updateMed(i, 'name', e.target.value)} placeholder="药品名称" />
                        <input className={inputCls} value={med.spec} onChange={e => updateMed(i, 'spec', e.target.value)} placeholder="规格（如 100mg）" />
                        <input className={inputCls} value={med.usage} onChange={e => updateMed(i, 'usage', e.target.value)} placeholder="用法（如 口服，每日1次）" />
                      </div>
                      {form.medications.length > 1 && (
                        <button onClick={() => removeMed(i)} className="text-gray-400 hover:text-red-500 mt-1.5 text-lg leading-none">×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 护理要点 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">护理要点 <span className="text-red-500">*</span></label>
                <textarea className={inputCls + ' resize-none'} rows={3}
                  value={form.rehabNotes} onChange={e => setF('rehabNotes', e.target.value)}
                  placeholder="如：注意观察血压变化，每日测量并记录；饮食清淡，低盐低脂；加强肢体功能锻炼，每日2次，每次30分钟" />
              </div>

              {/* 随访日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">首次随访日期 <span className="text-red-500">*</span></label>
                <input type="date" className={inputCls} value={form.followupDate} onChange={e => setF('followupDate', e.target.value)} />
              </div>

              {/* 监测指标 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">需监测指标（多选）</label>
                <div className="flex flex-wrap gap-2">
                  {MONITOR_OPTIONS.map(ind => (
                    <button key={ind} type="button" onClick={() => toggleIndicator(ind)}
                      className="px-3 py-1.5 rounded-lg text-sm border transition-colors"
                      style={form.indicators.includes(ind)
                        ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                        : { background: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}
                      onMouseEnter={e => { if (!form.indicators.includes(ind)) e.currentTarget.style.background = '#F0FBFC' }}
                      onMouseLeave={e => { if (!form.indicators.includes(ind)) e.currentTarget.style.background = '#fff' }}>
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              {/* C-02：出院医嘱/检查报告附件 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  出院医嘱/检查报告附件
                  <span className="text-xs text-gray-400 font-normal ml-2">（出院小结、检查报告等，选填）</span>
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-[#0BBECF] transition-colors">
                  {attachments.length === 0 ? (
                    <label className="flex flex-col items-center gap-2 cursor-pointer">
                      <span className="text-2xl">📎</span>
                      <span className="text-sm text-gray-500">点击选择或拖拽文件到此处</span>
                      <span className="text-xs text-gray-400">PDF、JPG、PNG，单文件 ≤ 10MB</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={e => {
                          const files = Array.from(e.target.files || [])
                          const newFiles = files.map(f => ({
                            name: f.name,
                            size: (f.size / 1024 / 1024).toFixed(2) + 'MB',
                            type: f.type,
                            url: URL.createObjectURL(f)
                          }))
                          setAttachments(prev => [...prev, ...newFiles])
                          e.target.value = ''
                        }}
                      />
                    </label>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span>{file.type?.includes('pdf') ? '📄' : '🖼️'}</span>
                            <span className="text-gray-800 truncate max-w-[200px]">{file.name}</span>
                            <span className="text-gray-400 text-xs">{file.size}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-red-500 text-xs ml-2"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                      <label className="flex items-center gap-1 text-xs cursor-pointer mt-1" style={{ color: '#0BBECF' }}>
                        <span>+ 继续添加</span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={e => {
                            const files = Array.from(e.target.files || [])
                            const newFiles = files.map(f => ({
                              name: f.name,
                              size: (f.size / 1024 / 1024).toFixed(2) + 'MB',
                              type: f.type,
                              url: URL.createObjectURL(f)
                            }))
                            setAttachments(prev => [...prev, ...newFiles])
                            e.target.value = ''
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: 选择机构 ── */}
        {step === 2 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">选择接收机构及科室</h2>
            <div className="space-y-3">
              {INSTITUTIONS.filter(i => i.type === 'primary').map(inst => (
                <div key={inst.id} onClick={() => setForm(f => ({ ...f, toInstitutionId: inst.id, toDept: '' }))}
                  className="border rounded-xl p-4 cursor-pointer transition-all"
                  style={form.toInstitutionId === inst.id
                    ? { borderColor: '#0BBECF', background: '#F0FBFC', boxShadow: '0 0 0 2px #a4edf5' }
                    : { borderColor: '#e5e7eb', background: '#fff' }}
                  onMouseEnter={e => { if (form.toInstitutionId !== inst.id) e.currentTarget.style.borderColor = '#67dfe9' }}
                  onMouseLeave={e => { if (form.toInstitutionId !== inst.id) e.currentTarget.style.borderColor = '#e5e7eb' }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-gray-800">{inst.name}</div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full">{inst.status}</span>
                  </div>
                  <div className="text-xs text-gray-400">医共体成员机构 · 基层卫生院</div>
                </div>
              ))}
            </div>

            {selectedInst && (
              <div className="mt-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">接收科室 <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {selectedInst.departments.map(dept => (
                    <button key={dept} type="button" onClick={() => setF('toDept', dept)}
                      className="px-3 py-1.5 rounded-lg text-sm border transition-colors"
                      style={form.toDept === dept
                        ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                        : { background: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}>
                      {dept}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: 知情同意（B-03） ── */}
        {step === CONSENT_STEP_INDEX && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">患者知情同意</h2>
            <div className="space-y-5">

              {/* 政策说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 text-base mt-0.5">📋</span>
                  <div>
                    <p className="text-sm font-medium text-blue-800 mb-1">下转转诊知情同意要求</p>
                    <p className="text-sm text-blue-700">
                      根据卫健委要求，下转转诊需患者或家属签署知情同意书后方可提交。
                      请选择签署方式并完成签署流程。
                    </p>
                  </div>
                </div>
              </div>

              {/* 本次转诊信息确认 */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">本次下转转诊信息确认</p>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-sm">
                  <div><span className="text-gray-500">患者姓名：</span><span className="font-medium text-gray-900">{form.patientName || '—'}</span></div>
                  <div><span className="text-gray-500">接收机构：</span><span className="font-medium text-gray-900">{INSTITUTIONS.find(i => i.id === form.toInstitutionId)?.name || '—'}</span></div>
                  <div><span className="text-gray-500">诊断：</span><span className="font-medium text-gray-900">{form.diagnosisText || '—'}</span></div>
                  <div><span className="text-gray-500">转诊类型：</span><span className="font-medium text-gray-900">下转（康复期管理）</span></div>
                </div>
              </div>

              {/* 签署方式选择 */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  选择知情同意签署方式 <span className="text-red-500">*</span>
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label
                    className="flex items-start gap-3 border-2 rounded-lg p-4 cursor-pointer transition-colors"
                    style={consentMethod === 'onsite'
                      ? { borderColor: '#0BBECF', background: '#F0FBFC' }
                      : { borderColor: '#e5e7eb', background: '#fff' }}
                  >
                    <input
                      type="radio"
                      name="consentMethod"
                      value="onsite"
                      checked={consentMethod === 'onsite'}
                      onChange={() => { setConsentMethod('onsite'); setConsentSent(false); setConsentSigned(false) }}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">患者在场签署</p>
                      <p className="text-xs text-gray-500 mt-0.5">患者或家属当面在平板/手机上扫码签署电子知情同意书</p>
                    </div>
                  </label>
                  <label
                    className="flex items-start gap-3 border-2 rounded-lg p-4 cursor-pointer transition-colors"
                    style={consentMethod === 'sms'
                      ? { borderColor: '#0BBECF', background: '#F0FBFC' }
                      : { borderColor: '#e5e7eb', background: '#fff' }}
                  >
                    <input
                      type="radio"
                      name="consentMethod"
                      value="sms"
                      checked={consentMethod === 'sms'}
                      onChange={() => { setConsentMethod('sms'); setConsentSent(false); setConsentSigned(false) }}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">短信链接签署</p>
                      <p className="text-xs text-gray-500 mt-0.5">发送签署链接至患者手机，患者远程完成签署</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 签署操作区 */}
              {consentMethod && (
                <div className="border border-gray-200 rounded-lg p-4">
                  {consentMethod === 'onsite' ? (
                    <div className="text-center py-2">
                      {/* 模拟二维码占位 */}
                      <div className="w-36 h-36 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg mx-auto flex flex-col items-center justify-center mb-3">
                        <span className="text-4xl mb-1">📷</span>
                        <span className="text-xs text-gray-400">知情同意二维码</span>
                        <span className="text-xs text-gray-300 mt-0.5">（法大大·电子签名）</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">请让患者或家属扫描上方二维码签署知情同意书</p>
                      <p className="text-xs text-gray-400 mb-3">签署完成后系统自动生成带时间戳PDF存档</p>
                      {/* TODO: 接入电子签名平台后替换为真实二维码轮询逻辑 */}
                      {!consentSigned && (
                        <button
                          onClick={() => setConsentSigned(true)}
                          className="mt-1 text-white px-6 py-2 rounded-lg text-sm transition-colors"
                          style={{ background: '#059669' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#047857'}
                          onMouseLeave={e => e.currentTarget.style.background = '#059669'}
                        >
                          模拟：患者已扫码完成签署
                        </button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-700 mb-2">发送签署链接至患者手机</p>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
                          placeholder="患者手机号（自动填入）"
                          value={form.patientPhone || '138****5678'}
                          readOnly
                        />
                        <button
                          onClick={() => setConsentSent(true)}
                          disabled={consentSent}
                          className="text-white px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                          style={consentSent
                            ? { background: '#10b981', cursor: 'default' }
                            : { background: '#0BBECF' }}
                        >
                          {consentSent ? '已发送 ✓' : '发送签署链接'}
                        </button>
                      </div>
                      {consentSent && !consentSigned && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center justify-between">
                          <span>等待患者完成签署...</span>
                          {/* TODO: 原型模式下手动触发，生产中通过webhook回调 */}
                          <button
                            onClick={() => setConsentSigned(true)}
                            className="text-xs underline text-amber-700 hover:text-amber-900"
                          >
                            模拟：患者已签署
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {consentSigned && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-center gap-2">
                      <span>✅</span>
                      <span>知情同意书已签署完成，可继续提交转诊申请。</span>
                    </div>
                  )}
                </div>
              )}

              {/* 无法完成电子签署说明 */}
              <p className="text-xs text-gray-400">
                * 如遇特殊情况无法完成电子签署，请联系管理员处理。
                {/* TODO: 补充纸质签署备案流程 */}
              </p>
            </div>
          </div>
        )}

        {/* ── Step 4: 确认提交 ── */}
        {step === 4 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">确认提交信息</h2>
            <div className="space-y-3">
              {[
                { label: '患者信息', rows: [['姓名', form.patientName], ['性别', form.patientGender], ['年龄', `${form.patientAge}岁`], ['联系电话', form.patientPhone]] },
                { label: '下转信息', rows: [['诊断', form.diagnosisText], ['下转原因', form.reason], ['住院天数', `${form.stayDays}天`]] },
                { label: '接收机构', rows: [['机构', selectedInst?.name], ['科室', form.toDept]] },
              ].map(section => (
                <div key={section.label} className="rounded-xl overflow-hidden divide-y divide-gray-100" style={{ background: '#f9fafb' }}>
                  <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                    <span className="text-xs font-semibold uppercase" style={{ color: '#0892a0' }}>{section.label}</span>
                  </div>
                  <div className="grid grid-cols-2">
                    {section.rows.map(([k, v]) => (
                      <div key={k} className="px-4 py-2.5">
                        <div className="text-xs text-gray-400">{k}</div>
                        <div className="text-sm font-medium text-gray-800 mt-0.5">{v || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* 康复方案摘要 */}
              <div className="rounded-xl overflow-hidden" style={{ background: '#f9fafb' }}>
                <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                  <span className="text-xs font-semibold uppercase" style={{ color: '#0892a0' }}>康复方案</span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {form.medications.filter(m => m.name).length > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">带药清单</div>
                      {form.medications.filter(m => m.name).map((m, i) => (
                        <div key={i} className="text-sm text-gray-700">{m.name} {m.spec} — {m.usage}</div>
                      ))}
                    </div>
                  )}
                  {form.indicators.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">监测指标</div>
                      <div className="flex flex-wrap gap-1">
                        {form.indicators.map(ind => (
                          <span key={ind} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#E0F6F9', color: '#0892a0' }}>{ind}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">首次随访</div>
                    <div className="text-sm text-gray-700">{form.followupDate}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="px-6 py-4 flex items-center justify-between rounded-b-xl" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/county/dashboard')}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors">
            {step === 0 ? '取消' : '← 上一步'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              disabled={!canNext}
              onClick={() => {
                // B-03: 知情同意步骤额外校验
                if (step === CONSENT_STEP_INDEX && !consentSigned) {
                  alert('请先完成知情同意签署后再继续')
                  return
                }
                setStep(s => s + 1)
              }}
              className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              style={canNext ? { background: '#0BBECF', color: '#fff' } : { background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }}>
              下一步 →
            </button>
          ) : (
            <button onClick={handleSubmit}
              className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: '#0BBECF' }}>
              ✓ 提交下转申请
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

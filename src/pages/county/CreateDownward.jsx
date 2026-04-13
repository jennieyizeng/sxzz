import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { INSTITUTIONS, MOCK_USERS, ROLES, UPWARD_STATUS } from '../../data/mockData'
import { pullMockPatientBundle } from '../../utils/mockPatientBundle'

const STEPS = ['患者与基本信息', '转出交接资料', '知情同意', '确认提交']
const CONSENT_STEP_INDEX = 2

const EMPTY_MED = { name: '', spec: '', usage: '' }

const SOURCE_LIBRARY = {
  patient360: { label: '患者360全息视图', desc: '基础档案、联系方式、历史转诊、健康画像' },
  dischargeSummary: { label: '出院小结', desc: '出院诊断、诊疗经过、出院建议' },
  inpatientHome: { label: '住院病历首页', desc: '主要诊断、住院信息' },
  progressNotes: { label: '病程记录', desc: '病情变化、治疗经过、康复计划' },
  orders: { label: '医嘱', desc: '出院医嘱、护理要求、监测要求' },
  prescription: { label: '出院处方', desc: '带药清单、服药方式、疗程建议' },
  lab: { label: '检验报告', desc: '近期检验结果与指标趋势' },
  imaging: { label: '检查报告', desc: '影像、超声、心电等检查结果' },
  surgery: { label: '手术记录', desc: '手术经过、术后处理与注意事项' },
}

const MONITOR_RULES = [
  { match: ['I63', 'I61'], items: ['血压', '肢体活动度', '语言功能', '吞咽功能'] },
  { match: ['I21', 'I22'], items: ['血压', '心率', '体重', '疼痛评分'] },
  { match: ['E11', 'E14'], items: ['血糖', '体重', '血压'] },
  { match: ['J18'], items: ['体温', '心率', '血氧饱和度'] },
]

const DEFAULT_ATTACHMENTS = [
  { key: 'dischargeSummary', name: '出院小结.pdf', source: '出院小结', tag: '推荐' },
  { key: 'imaging', name: '检查报告汇总.pdf', source: '检查报告', tag: '推荐' },
  { key: 'lab', name: '检验报告汇总.pdf', source: '检验报告', tag: '推荐' },
  { key: 'surgery', name: '手术记录.pdf', source: '手术记录', tag: '可选' },
]

const PRIMARY_RECEIVER_OPTIONS = {
  inst002: [
    { id: 'u001', name: '王医生', team: '全科团队A', isReferralCoordinator: false, recentCount30d: 12, seenIn90d: true, isFamilyDoctor: true },
    { id: 'u009', name: '李医生', team: '慢病管理组', isReferralCoordinator: false, recentCount30d: 7, seenIn90d: false, isFamilyDoctor: false },
    { id: 'u001_head', name: '赵负责人', team: '全科团队', isReferralCoordinator: true, recentCount30d: 5, seenIn90d: false, isFamilyDoctor: false },
  ],
  inst003: [
    { id: 'u010', name: '周医生', team: '全科团队B', isReferralCoordinator: false, recentCount30d: 10, seenIn90d: false, isFamilyDoctor: true },
    { id: 'u011', name: '陈医生', team: '慢病管理组', isReferralCoordinator: false, recentCount30d: 6, seenIn90d: true, isFamilyDoctor: false },
    { id: 'u012_head', name: '刘负责人', team: '全科团队', isReferralCoordinator: true, recentCount30d: 4, seenIn90d: false, isFamilyDoctor: false },
  ],
}

function StepProgress({ steps, currentStep }) {
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, index) => (
        <div key={label} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
              style={index < currentStep
                ? { background: '#10b981', color: '#fff' }
                : index === currentStep
                  ? { background: '#0BBECF', color: '#fff', boxShadow: '0 0 0 4px #B2EEF5' }
                  : { background: '#f3f4f6', color: '#9ca3af' }}
            >
              {index < currentStep ? '✓' : index + 1}
            </div>
            <div
              className="text-xs mt-1.5 whitespace-nowrap"
              style={index === currentStep
                ? { color: '#0BBECF', fontWeight: 600 }
                : index < currentStep
                  ? { color: '#10b981' }
                  : { color: '#9ca3af' }}
            >
              {label}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className="flex-1 h-0.5 mx-2 mt-[-12px] rounded"
              style={{ background: index < currentStep ? '#67dfe9' : '#e5e7eb' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function SourceDialog({ title, sources, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[560px] max-w-[92vw] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">关闭</button>
        </div>
        <div className="p-6 space-y-3">
          {sources.map(key => (
            <div key={key} className="rounded-xl px-4 py-3" style={{ background: '#F8FDFE', border: '1px solid #DDF0F3' }}>
              <div className="text-sm font-medium text-gray-800">{SOURCE_LIBRARY[key]?.label || key}</div>
              <div className="text-xs text-gray-500 mt-1">{SOURCE_LIBRARY[key]?.desc || '系统数据来源'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ title, desc }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      {desc && <div className="text-xs text-gray-400 mt-1">{desc}</div>}
    </div>
  )
}

function AutoCard({ title, sourceText, onRefresh, onViewSource, children, badge = '系统带入' }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#F5FAFF', border: '1px solid #D7EAFE' }}>
      <div className="px-4 py-3 flex items-center justify-between border-b border-blue-100" style={{ background: '#ECF5FF' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{title}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{badge}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">来源：{sourceText}</div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onRefresh} className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-white">重新拉取</button>
          <button type="button" onClick={onViewSource} className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-white">查看来源</button>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function FieldLabel({ children, required = false, hint }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
      {hint && <span className="text-xs text-gray-400 font-normal ml-2">{hint}</span>}
    </label>
  )
}

function buildAutoMedications(ref) {
  const code = String(ref?.diagnosis?.code || '').toUpperCase()
  if (code.startsWith('I63') || code.startsWith('I61')) {
    return [
      { name: '阿司匹林肠溶片', spec: '100mg', usage: '口服，每日1次' },
      { name: '阿托伐他汀钙片', spec: '20mg', usage: '口服，每晚1次' },
      { name: '胞磷胆碱钠片', spec: '0.2g', usage: '口服，每日3次' },
    ]
  }
  if (code.startsWith('I21') || code.startsWith('I22')) {
    return [
      { name: '氯吡格雷片', spec: '75mg', usage: '口服，每日1次' },
      { name: '阿托伐他汀钙片', spec: '20mg', usage: '口服，每晚1次' },
      { name: '美托洛尔缓释片', spec: '47.5mg', usage: '口服，每日1次' },
    ]
  }
  if (code.startsWith('E11') || code.startsWith('E14')) {
    return [
      { name: '二甲双胍片', spec: '0.5g', usage: '口服，每日2次' },
      { name: '格列美脲片', spec: '2mg', usage: '口服，每日1次' },
    ]
  }

  return [
    { name: '常规出院带药', spec: '按出院处方', usage: '按医嘱执行' },
  ]
}

function buildIndicatorRecommendations(ref) {
  const code = String(ref?.diagnosis?.code || '').toUpperCase()
  for (const rule of MONITOR_RULES) {
    if (rule.match.some(prefix => code.startsWith(prefix))) return rule.items
  }
  return ['血压', '体温', '体重']
}

function buildAutoSummary(ref) {
  const diagnosisName = ref?.diagnosis?.name || '当前主要疾病'
  const institutionName = ref?.toInstitution || '县医院'
  const stayDays = ref?.stayDays || 8
  return `患者因${diagnosisName}在${institutionName}完成阶段性诊疗，当前生命体征平稳，主要治疗目标已达成，建议转基层继续开展康复训练、护理监测与规律随访。住院期间累计治疗${stayDays}天，现病情适合转出。`
}

function buildAutoData(ref) {
  const recommendedIndicators = buildIndicatorRecommendations(ref)
  return {
    patientId: ref?.patient?.id || '',
    patientName: ref?.patient?.name || '',
    patientGender: ref?.patient?.gender || '',
    patientAge: ref?.patient?.age ? String(ref.patient.age) : '',
    patientPhone: ref?.patient?.phone || '',
    patientIdCard: ref?.patient?.idCard || '',
    diagnosis: ref?.diagnosis || null,
    diagnosisText: ref?.diagnosis?.name || '',
    icd10: ref?.diagnosis?.code || '',
    dischargeDiagnosis: ref?.diagnosis?.name || '',
    stayDays: String(ref?.stayDays || 8),
    clinicalSummary: buildAutoSummary(ref),
    medications: buildAutoMedications(ref),
    recommendedIndicators,
    attachments: DEFAULT_ATTACHMENTS.map(item => ({
      ...item,
      size: item.key === 'surgery' ? '1.4MB' : '0.8MB',
      from360: true,
    })),
    autoPulledAt: new Date().toLocaleString('zh-CN'),
  }
}

function getAgeFromIdCard(idCard) {
  const normalized = String(idCard || '').trim()
  if (!/^\d{17}[\dXx]$/.test(normalized)) return ''
  const birth = normalized.slice(6, 14)
  const year = Number(birth.slice(0, 4))
  const month = Number(birth.slice(4, 6))
  const day = Number(birth.slice(6, 8))
  if (!year || !month || !day) return ''

  const today = new Date()
  let age = today.getFullYear() - year
  const currentMonth = today.getMonth() + 1
  const currentDay = today.getDate()
  if (currentMonth < month || (currentMonth === month && currentDay < day)) {
    age -= 1
  }
  return age >= 0 ? String(age) : ''
}

export default function CreateDownward() {
  const navigate = useNavigate()
  const { createDownwardReferral, referrals } = useApp()
  const [step, setStep] = useState(0)
  const [sourceDialog, setSourceDialog] = useState(null)
  const [pulledReferralId, setPulledReferralId] = useState('')
  const [consentMethod, setConsentMethod] = useState('')
  const [consentSent, setConsentSent] = useState(false)
  const [consentSigned, setConsentSigned] = useState(false)
  const [customIndicatorInput, setCustomIndicatorInput] = useState('')
  const [pullResult, setPullResult] = useState({ type: '', message: '' })
  const [isPullingPatientData, setIsPullingPatientData] = useState(false)

  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    patientGender: '',
    patientAge: '',
    patientPhone: '',
    patientIdCard: '',
    diagnosis: null,
    diagnosisText: '',
    icd10: '',
    clinicalSummary: '',
    autoPulledAt: '',
    medications: [],
    recommendedIndicators: [],
    indicators: [],
    attachments: [],
    reason: '',
    nursingNotes: '',
    rehabSuggestion: '',
    followupDate: '',
    warningNotes: '',
    supplementNote: '',
    toInstitutionId: '',
    toDept: '',
    allocationMode: 'designated',
    designatedDoctorId: '',
    designatedDoctorName: '',
  })

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'

  const completedUpward = useMemo(
    () => referrals.filter(item => item.type === 'upward' && item.status === UPWARD_STATUS.COMPLETED),
    [referrals],
  )

  const selectedRef = useMemo(
    () => completedUpward.find(item => item.id === pulledReferralId) || null,
    [completedUpward, pulledReferralId],
  )

  const selectedInst = useMemo(
    () => INSTITUTIONS.find(item => item.id === form.toInstitutionId),
    [form.toInstitutionId],
  )

  const configuredCoordinator = useMemo(
    () => Object.values(MOCK_USERS).find(user =>
      user.role === ROLES.PRIMARY_HEAD &&
      user.institution === selectedInst?.name &&
      user.isReferralCoordinator
    ),
    [selectedInst],
  )

  const selectedDoctorOptions = useMemo(
    () => (PRIMARY_RECEIVER_OPTIONS[form.toInstitutionId] || []).filter(item => !item.isReferralCoordinator).sort((a, b) => {
      if (a.isFamilyDoctor && !b.isFamilyDoctor) return -1
      if (!a.isFamilyDoctor && b.isFamilyDoctor) return 1
      return (b.recentCount30d || 0) - (a.recentCount30d || 0)
    }),
    [form.toInstitutionId],
  )

  const setF = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const applyAutoData = (ref) => {
    if (!ref) return
    const autoData = buildAutoData(ref)
    setForm(prev => ({
      ...prev,
      patientId: autoData.patientId,
      patientName: autoData.patientName,
      patientGender: autoData.patientGender,
      patientAge: autoData.patientAge,
      patientPhone: autoData.patientPhone,
      patientIdCard: autoData.patientIdCard,
      diagnosis: autoData.diagnosis,
      diagnosisText: autoData.diagnosisText,
      icd10: autoData.icd10,
      clinicalSummary: autoData.clinicalSummary,
      autoPulledAt: autoData.autoPulledAt,
      medications: autoData.medications,
      recommendedIndicators: autoData.recommendedIndicators,
      indicators: prev.indicators.length > 0 ? prev.indicators : autoData.recommendedIndicators,
      attachments: prev.attachments.length > 0 ? prev.attachments : autoData.attachments,
    }))
  }

  const handlePullPatientData = async () => {
    const name = form.patientName.trim()
    const phone = form.patientPhone.trim()
    const idCard = form.patientIdCard.trim()

    if (!name) {
      setPullResult({ type: 'warning', message: '请先填写患者姓名，再执行一键拉取。' })
      return
    }

    setIsPullingPatientData(true)
    setPullResult({ type: '', message: '' })

    const matchedRef = await pullMockPatientBundle({
      referrals,
      patientName: name,
      patientPhone: phone,
      patientIdCard: idCard,
    })

    if (!matchedRef) {
      setIsPullingPatientData(false)
      setPulledReferralId('')
      setPullResult({ type: 'warning', message: '未拉取到可用资料，请继续手动填写，或后续补充上传附件。' })
      return
    }

    setPulledReferralId(matchedRef.id)
    setPullResult({ type: 'success', message: `已自动带入 ${matchedRef.patient.name} 的诊疗摘要、出院用药和附件建议，请继续确认交接信息。` })
    setForm(prev => ({
      ...prev,
      diagnosis: matchedRef.diagnosis || prev.diagnosis,
    }))
    applyAutoData(matchedRef)
    setIsPullingPatientData(false)
  }

  const handlePullSpecificData = (handler) => {
    if (!selectedRef) {
      setPullResult({ type: 'warning', message: '请先填写患者信息并执行一键拉取，未拉取成功时也可继续手动补充。' })
      return
    }

    handler()
  }

  const handleViewSource = (title, sources) => {
    setSourceDialog({ title, sources })
  }

  const handleImportPrescription = () => {
    if (!selectedRef) return
    setF('medications', buildAutoMedications(selectedRef))
  }

  const handleImportAttachments = () => {
    if (!selectedRef) return
    const autoData = buildAutoData(selectedRef)
    setF('attachments', autoData.attachments)
  }

  const addMedication = () => setF('medications', [...form.medications, { ...EMPTY_MED }])

  const updateMedication = (index, key, value) => {
    const next = [...form.medications]
    next[index] = { ...next[index], [key]: value }
    setF('medications', next)
  }

  const removeMedication = (index) => {
    setF('medications', form.medications.filter((_, currentIndex) => currentIndex !== index))
  }

  const toggleIndicator = (item) => {
    setF('indicators', form.indicators.includes(item)
      ? form.indicators.filter(current => current !== item)
      : [...form.indicators, item])
  }

  const addCustomIndicator = () => {
    const value = customIndicatorInput.trim()
    if (!value) return
    if (!form.recommendedIndicators.includes(value)) {
      setF('recommendedIndicators', [...form.recommendedIndicators, value])
    }
    if (!form.indicators.includes(value)) {
      setF('indicators', [...form.indicators, value])
    }
    setCustomIndicatorInput('')
  }

  const handleUploadAttachment = (event) => {
    const files = Array.from(event.target.files || [])
    const next = files.map(file => ({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      source: '补充上传',
      tag: '补充',
      from360: false,
    }))
    setF('attachments', [...form.attachments, ...next])
    event.target.value = ''
  }

  const removeAttachment = (index) => {
    setF('attachments', form.attachments.filter((_, currentIndex) => currentIndex !== index))
  }

  const chooseInstitution = (instId) => {
    const inst = INSTITUTIONS.find(item => item.id === instId)
    setForm(prev => ({
      ...prev,
      toInstitutionId: instId,
      toDept: inst?.departments?.[0] || '全科门诊',
      designatedDoctorId: '',
      designatedDoctorName: '',
    }))
  }

  const derivedAge = useMemo(
    () => getAgeFromIdCard(form.patientIdCard) || form.patientAge,
    [form.patientAge, form.patientIdCard],
  )

  const canNext = [
    !!form.patientName && !!form.diagnosisText && !!form.toInstitutionId && !!form.allocationMode && (form.allocationMode === 'coordinator' || !!form.designatedDoctorId),
    !!form.reason && !!form.nursingNotes && !!form.followupDate,
    !!consentSigned,
    true,
  ][step]

  const handleSubmit = () => {
    const inst = INSTITUTIONS.find(item => item.id === form.toInstitutionId)
    const payload = {
      patient: {
        id: form.patientId || `p${Date.now()}`,
        name: form.patientName,
        gender: form.patientGender,
        age: parseInt(derivedAge || '0', 10),
        phone: form.patientPhone,
        idCard: form.patientIdCard,
      },
      diagnosis: form.diagnosis || { code: form.icd10 || '—', name: form.diagnosisText || '—' },
      chiefComplaint: form.clinicalSummary,
      reason: form.reason,
      toInstitution: inst?.name,
      toDept: form.toDept || inst?.departments?.[0] || '全科门诊',
      allocationMode: form.allocationMode,
      designatedDoctorId: form.allocationMode === 'designated' ? form.designatedDoctorId : null,
      designatedDoctorName: form.allocationMode === 'designated' ? form.designatedDoctorName : null,
      structuredData: {
        title: '转出资料包',
        sections: [
          {
            title: '诊疗摘要',
            items: [
              { label: '当前诊断', value: form.diagnosisText || '—' },
              { label: 'ICD-10', value: form.icd10 || '—' },
              { label: '摘要', value: form.clinicalSummary || '—' },
            ],
          },
          {
            title: '出院用药',
            items: form.medications.filter(item => item.name).length > 0
              ? form.medications.filter(item => item.name).map(item => ({ label: item.name, value: `${item.spec || '—'} · ${item.usage || '—'}` }))
              : [{ label: '用药', value: '未填写' }],
          },
        ],
      },
      rehabPlan: {
        medications: form.medications.filter(item => item.name),
        notes: form.nursingNotes,
        rehabSuggestion: form.rehabSuggestion,
        followupDate: form.followupDate,
        warningNotes: form.warningNotes,
        supplementNote: form.supplementNote,
        indicators: form.indicators,
      },
      attachments: form.attachments.map(item => ({ name: item.name, size: item.size, source: item.source })),
      autoDataMeta: {
        pulledAt: form.autoPulledAt,
        sources: ['patient360', 'inpatientHome', 'dischargeSummary', 'progressNotes', 'orders', 'prescription'],
      },
    }

    const id = createDownwardReferral(payload)
    navigate(`/referral/${id}`)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/county/dashboard')} className="hover:underline" style={{ color: '#0BBECF' }}>工作台</button>
          <span>›</span>
          <span>发起转出</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-800">发起转出申请</h1>
      </div>

      <StepProgress steps={STEPS} currentStep={step} />

      <div className="rounded-xl overflow-hidden bg-white" style={{ border: '1px solid #DDF0F3' }}>
        {step === 0 && (
          <div className="p-6">
            <SectionTitle
              title="患者与基本信息"
              desc="先填写患者基础信息，再一键拉取系统资料；重点确认系统已带入内容，并补充目标基层机构与接收安排。"
            />

            <div className="mb-5 rounded-xl px-4 py-3" style={{ background: '#F8FDFE', border: '1px solid #DDF0F3' }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-medium text-gray-700">数据来源说明</div>
                    <div className="text-xs text-gray-500 mt-1">填写患者姓名后即可一键拉取系统资料；未拉取成功时，可继续手动填写并在后续补充上传资料。</div>
                  </div>
                <button
                  type="button"
                  onClick={handlePullPatientData}
                  disabled={isPullingPatientData}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={isPullingPatientData
                    ? { background: '#9EDFE6', color: '#fff', cursor: 'wait' }
                    : { background: '#0BBECF', color: '#fff' }}
                >
                  {isPullingPatientData ? '正在拉取资料...' : '一键拉取患者资料'}
                </button>
              </div>
            </div>

            {pullResult.message && (
              <div
                className="mb-5 rounded-xl px-4 py-3 text-sm"
                style={pullResult.type === 'success'
                  ? { background: '#F0FBF5', border: '1px solid #BDE7D0', color: '#0F7A45' }
                  : { background: '#FFF9ED', border: '1px solid #F6D48A', color: '#9A6700' }}
              >
                {pullResult.message}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <FieldLabel required>姓名</FieldLabel>
                <input className={inputCls} value={form.patientName} onChange={event => setF('patientName', event.target.value)} placeholder="请输入患者姓名" />
              </div>
              <div>
                <FieldLabel>联系电话</FieldLabel>
                <input className={inputCls} value={form.patientPhone} onChange={event => setF('patientPhone', event.target.value)} placeholder="请输入联系电话" />
              </div>
              <div>
                <FieldLabel>性别</FieldLabel>
                <select className={inputCls} value={form.patientGender} onChange={event => setF('patientGender', event.target.value)}>
                  <option value="">请选择</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
              <div>
                <FieldLabel>身份证号</FieldLabel>
                <input className={inputCls} value={form.patientIdCard} onChange={event => setF('patientIdCard', event.target.value)} placeholder="请输入身份证号，便于提高匹配准确度" />
              </div>
              <div>
                <FieldLabel hint="根据身份证自动计算展示">年龄</FieldLabel>
                <div className={`${inputCls} bg-gray-50 text-gray-600 flex items-center`}>
                  {derivedAge ? `${derivedAge}岁` : '填写身份证号后自动显示'}
                </div>
              </div>
              <div>
                <FieldLabel required>当前诊断</FieldLabel>
                <input className={inputCls} value={form.diagnosisText} onChange={event => setF('diagnosisText', event.target.value)} placeholder="请输入当前诊断" />
              </div>
              <div>
                <FieldLabel hint="系统辅助带入，默认只读">ICD-10</FieldLabel>
                <input className={`${inputCls} bg-gray-50 text-gray-600`} value={form.icd10} readOnly placeholder="拉取资料后自动显示" />
              </div>
              <div>
                <FieldLabel required>目标基层机构</FieldLabel>
                <select className={inputCls} value={form.toInstitutionId} onChange={event => chooseInstitution(event.target.value)}>
                  <option value="">请选择目标基层机构</option>
                  {INSTITUTIONS.filter(item => item.type === 'primary').map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedInst && (
              <div className="mb-6 rounded-xl px-4 py-3" style={{ background: '#F8FDFE', border: '1px solid #DDF0F3' }}>
                <div className="text-sm font-medium text-gray-700">系统默认承接科室</div>
                <div className="text-xs text-gray-500 mt-1">系统已根据目标机构带出默认承接科室，提交后可由基层侧继续分配执行。</div>
                <div className="mt-2 text-sm font-semibold text-gray-800">{form.toDept || '全科门诊'}</div>
              </div>
            )}

            {selectedInst && (
              <div className="space-y-4">
                <div>
                  <FieldLabel required>接收方式</FieldLabel>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label
                      className="border-2 rounded-xl p-4 cursor-pointer transition-colors"
                      style={form.allocationMode === 'designated'
                        ? { borderColor: '#0BBECF', background: '#F0FBFC' }
                        : { borderColor: '#e5e7eb', background: '#fff' }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="allocationMode"
                          checked={form.allocationMode === 'designated'}
                          onChange={() => setF('allocationMode', 'designated')}
                          className="mt-1"
                        />
                          <div>
                            <div className="text-sm font-medium text-gray-900">指定接收医生</div>
                            <div className="text-xs text-gray-500 mt-1">由当前发起人直接指定接收人，基层负责人同步知情。</div>
                          </div>
                      </div>
                    </label>

                    <label
                      className={`border-2 rounded-xl p-4 transition-colors ${configuredCoordinator ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                      style={form.allocationMode === 'coordinator'
                        ? { borderColor: '#0BBECF', background: '#F0FBFC' }
                        : { borderColor: '#e5e7eb', background: '#fff' }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="allocationMode"
                          checked={form.allocationMode === 'coordinator'}
                          disabled={!configuredCoordinator}
                          onChange={() => setForm(prev => ({ ...prev, allocationMode: 'coordinator', designatedDoctorId: '', designatedDoctorName: '' }))}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">仅指定机构</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {configuredCoordinator
                              ? `提交后进入基层转诊负责人 ${configuredCoordinator.name} 的待分配队列。`
                              : '当前机构未配置基层转诊负责人，暂不可用。'}
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {form.allocationMode === 'designated' ? (
                  <div>
                    <FieldLabel required>指定接收医生</FieldLabel>
                    <div className="space-y-3">
                      {selectedDoctorOptions.map(doctor => (
                        <button
                          key={doctor.id}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, designatedDoctorId: doctor.id, designatedDoctorName: doctor.name }))}
                          className="w-full text-left border rounded-xl p-4 transition-all"
                          style={form.designatedDoctorId === doctor.id
                            ? { borderColor: '#0BBECF', background: '#F0FBFC', boxShadow: '0 0 0 2px #B2EEF5' }
                            : { borderColor: '#e5e7eb', background: '#fff' }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="text-sm font-semibold text-gray-900">{doctor.name}</span>
                                {doctor.isFamilyDoctor && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">签约家庭医生推荐</span>}
                                {doctor.seenIn90d && <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">近期接诊</span>}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{doctor.team}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-400">近30天转入承接量</div>
                              <div className="text-sm font-semibold" style={{ color: '#0892A0' }}>{doctor.recentCount30d}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border px-4 py-3" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
                    <div className="text-sm font-medium text-gray-700">基层负责人配置提示</div>
                    <div className="text-xs text-gray-500 mt-1">
                      该申请提交后将由 {configuredCoordinator?.name || '基层转诊负责人'} 分配具体接收医生，也可由负责人本人接收或判定本机构无法承接。
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="p-6 space-y-5">
            <SectionTitle
              title="转出资料与康复方案"
              desc="重点确认系统带入资料，并补充基层执行交接信息，无需重复填写完整病历。"
            />

            <div className="rounded-xl px-4 py-3" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="text-sm font-semibold text-gray-800">转出资料包</div>
              <div className="text-xs text-gray-500 mt-1">系统已带入可交接的核心资料，请医生编辑确认后再转出。</div>
            </div>

            <AutoCard
              title="诊疗摘要"
              sourceText="患者360全息视图 / 出院小结 / 病程记录"
              onRefresh={handlePullPatientData}
              onViewSource={() => handleViewSource('诊疗摘要来源', ['patient360', 'dischargeSummary', 'progressNotes'])}
              badge="系统带入 / 可编辑确认"
            >
              <textarea
                className={`${inputCls} resize-none bg-white`}
                rows={4}
                value={form.clinicalSummary}
                onChange={event => setF('clinicalSummary', event.target.value)}
                placeholder="请输入诊疗摘要"
              />
            </AutoCard>

            <AutoCard
              title="出院医嘱"
              sourceText="出院处方 / 医嘱"
              onRefresh={() => handlePullSpecificData(handleImportPrescription)}
              onViewSource={() => handleViewSource('药物清单来源', ['prescription', 'orders'])}
              badge="系统带入 / 可编辑确认"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-gray-500">系统已默认带出处方，可继续手动新增、编辑、删除。</div>
                <button type="button" onClick={() => handlePullSpecificData(handleImportPrescription)} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: '#0BBECF' }}>
                  从处方代入
                </button>
              </div>
              <div className="space-y-2">
                {form.medications.length === 0 && (
                  <div className="text-sm text-gray-400">暂无药物清单，请先从处方带入。</div>
                )}
                {form.medications.map((med, index) => (
                  <div key={`${med.name}-${index}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start p-3 rounded-lg bg-white border border-blue-100">
                    <input className={inputCls} value={med.name} onChange={event => updateMedication(index, 'name', event.target.value)} placeholder="药品名称" />
                    <input className={inputCls} value={med.spec} onChange={event => updateMedication(index, 'spec', event.target.value)} placeholder="规格" />
                    <input className={inputCls} value={med.usage} onChange={event => updateMedication(index, 'usage', event.target.value)} placeholder="用法" />
                    <button type="button" onClick={() => removeMedication(index)} className="px-3 py-2 text-sm text-gray-400 hover:text-red-500">删除</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addMedication} className="mt-3 text-xs px-3 py-1.5 rounded-lg border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
                + 手动新增药物
              </button>
            </AutoCard>

            <AutoCard
              title="附件资料"
              sourceText="患者360全息视图 / 出院小结 / 检查检验 / 手术记录"
              onRefresh={() => handlePullSpecificData(handleImportAttachments)}
              onViewSource={() => handleViewSource('附件资料来源', ['patient360', 'dischargeSummary', 'lab', 'imaging', 'surgery'])}
              badge="推荐带出"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-gray-500">推荐带出出院小结、检查报告、检验报告、手术记录，上传仅作为补充。</div>
                <button type="button" onClick={() => handlePullSpecificData(handleImportAttachments)} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: '#0BBECF' }}>
                  从360选择附件
                </button>
              </div>
              <div className="space-y-2">
                {form.attachments.length === 0 && (
                  <div className="text-sm text-gray-400">尚未选择附件资料。</div>
                )}
                {form.attachments.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 bg-white border border-blue-100 rounded-lg px-3 py-2.5 text-sm">
                    <div>
                      <div className="font-medium text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.source} · {item.size}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: item.from360 ? '#DBEAFE' : '#F3F4F6', color: item.from360 ? '#1D4ED8' : '#6B7280' }}>
                        {item.tag}
                      </span>
                      <button type="button" onClick={() => removeAttachment(index)} className="text-xs text-gray-400 hover:text-red-500">删除</button>
                    </div>
                  </div>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 mt-3 text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
                <span>+ 补充上传附件</span>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadAttachment} />
              </label>
            </AutoCard>

            <div className="rounded-xl px-4 py-3" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="text-sm font-semibold text-gray-800">基层执行方案</div>
              <div className="text-xs text-gray-500 mt-1">补充基层承接后需要执行的护理、康复和随访交接信息。</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FieldLabel required>转出原因</FieldLabel>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.reason} onChange={event => setF('reason', event.target.value)} placeholder="说明转出原因与基层承接目标" />
              </div>
              <div className="col-span-2">
                <FieldLabel required>护理要点</FieldLabel>
                <textarea className={`${inputCls} resize-none`} rows={3} value={form.nursingNotes} onChange={event => setF('nursingNotes', event.target.value)} placeholder="填写护理重点、观察要求、家庭照护建议" />
              </div>
              <div className="col-span-2">
                <FieldLabel>康复建议</FieldLabel>
                <textarea className={`${inputCls} resize-none`} rows={3} value={form.rehabSuggestion} onChange={event => setF('rehabSuggestion', event.target.value)} placeholder="填写康复训练建议、功能恢复目标与阶段安排" />
              </div>
              <div>
                <FieldLabel required>首次随访时间</FieldLabel>
                <input type="date" className={inputCls} value={form.followupDate} onChange={event => setF('followupDate', event.target.value)} />
              </div>
              <div>
                <FieldLabel hint="系统推荐，可勾选确认并补充">随访监测指标</FieldLabel>
                <div className="rounded-lg border border-gray-200 p-3 bg-white min-h-[42px]">
                  <div className="flex flex-wrap gap-2">
                    {form.recommendedIndicators.map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleIndicator(item)}
                        className="px-3 py-1.5 rounded-lg text-sm border transition-colors"
                        style={form.indicators.includes(item)
                          ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                          : { background: '#fff', color: '#4B5563', borderColor: '#E5E7EB' }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      className={inputCls}
                      value={customIndicatorInput}
                      onChange={event => setCustomIndicatorInput(event.target.value)}
                      placeholder="补充自定义监测指标"
                    />
                    <button type="button" onClick={addCustomIndicator} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: '#0BBECF' }}>
                      添加
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <FieldLabel>预警事项</FieldLabel>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.warningNotes} onChange={event => setF('warningNotes', event.target.value)} placeholder="如出现血压波动、胸闷加重、血糖失控等情况请及时上报" />
              </div>
              <div>
                <FieldLabel>补充说明</FieldLabel>
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.supplementNote} onChange={event => setF('supplementNote', event.target.value)} placeholder="补充其他交接说明" />
              </div>
            </div>
          </div>
        )}

        {step === CONSENT_STEP_INDEX && (
          <div className="p-6">
            <SectionTitle title="知情同意" desc="转出申请需完成知情同意签署后方可提交。" />

            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 text-base mt-0.5">📋</span>
                  <div>
                    <p className="text-sm font-medium text-blue-800 mb-1">签署说明</p>
                    <p className="text-sm text-blue-700">
                      请选择签署方式并完成签署流程，系统将保存签署结果用于后续归档。
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">本次转出信息确认</p>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-sm">
                  <div><span className="text-gray-500">患者姓名：</span><span className="font-medium text-gray-900">{form.patientName || '—'}</span></div>
                  <div><span className="text-gray-500">接收机构：</span><span className="font-medium text-gray-900">{selectedInst?.name || '—'}</span></div>
                  <div><span className="text-gray-500">主要诊断：</span><span className="font-medium text-gray-900">{form.diagnosisText || '—'}</span></div>
                  <div><span className="text-gray-500">转出类型：</span><span className="font-medium text-gray-900">康复期管理</span></div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">选择知情同意签署方式 <span className="text-red-500">*</span></p>
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
                      <p className="text-xs text-gray-500 mt-0.5">患者或家属当面扫码完成电子签署</p>
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
                      <p className="text-xs text-gray-500 mt-0.5">发送签署链接至患者手机，远程完成签署</p>
                    </div>
                  </label>
                </div>
              </div>

              {consentMethod && (
                <div className="border border-gray-200 rounded-lg p-4">
                  {consentMethod === 'onsite' ? (
                    <div className="text-center py-2">
                      <div className="w-36 h-36 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg mx-auto flex flex-col items-center justify-center mb-3">
                        <span className="text-4xl mb-1">📷</span>
                        <span className="text-xs text-gray-400">知情同意二维码</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">请让患者或家属扫描二维码完成签署</p>
                      <p className="text-xs text-gray-400 mb-3">签署完成后系统自动存档电子签名文件</p>
                      {!consentSigned && (
                        <button
                          onClick={() => setConsentSigned(true)}
                          className="mt-1 text-white px-6 py-2 rounded-lg text-sm transition-colors"
                          style={{ background: '#059669' }}
                        >
                          登记患者已完成签署
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
                          value={form.patientPhone || '—'}
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
                          <button
                            onClick={() => setConsentSigned(true)}
                            className="text-xs underline text-amber-700 hover:text-amber-900"
                          >
                            登记患者已签署
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {consentSigned && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-center gap-2">
                      <span>✅</span>
                      <span>知情同意已完成，可继续提交转出申请。</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="p-6 space-y-4">
            <SectionTitle title="确认提交" desc="请确认系统带入资料与基层执行交接信息后再提交。" />

            <div className="rounded-xl overflow-hidden divide-y divide-gray-100" style={{ background: '#F9FAFB' }}>
              <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                <span className="text-xs font-semibold uppercase" style={{ color: '#0892A0' }}>患者与基本信息</span>
              </div>
              <div className="grid grid-cols-2">
                {[
                  ['姓名', form.patientName],
                  ['性别', form.patientGender],
                  ['年龄', derivedAge ? `${derivedAge}岁` : '—'],
                  ['联系电话', form.patientPhone],
                  ['身份证号', form.patientIdCard],
                  ['当前诊断', form.diagnosisText],
                  ['ICD-10', form.icd10],
                  ['目标基层机构', selectedInst?.name || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="px-4 py-2.5">
                    <div className="text-xs text-gray-400">{label}</div>
                    <div className="text-sm font-medium text-gray-800 mt-0.5">{value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden divide-y divide-gray-100" style={{ background: '#F9FAFB' }}>
              <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                <span className="text-xs font-semibold uppercase" style={{ color: '#0892A0' }}>转出资料包</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">诊疗摘要</div>
                  <div className="text-sm text-gray-700 leading-6 whitespace-pre-line">{form.clinicalSummary || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">出院用药</div>
                  {form.medications.filter(item => item.name).length === 0 ? (
                    <div className="text-sm text-gray-400">暂无</div>
                  ) : form.medications.filter(item => item.name).map((item, index) => (
                    <div key={`${item.name}-${index}`} className="text-sm text-gray-700">{item.name} {item.spec} · {item.usage}</div>
                  ))}
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">附件资料</div>
                  <div className="flex flex-wrap gap-2">
                    {form.attachments.length === 0
                      ? <span className="text-sm text-gray-400">暂无</span>
                      : form.attachments.map(item => (
                        <span key={`${item.name}-${item.source}`} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#E0F6F9', color: '#0892A0' }}>
                          {item.name}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden divide-y divide-gray-100" style={{ background: '#F9FAFB' }}>
              <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                <span className="text-xs font-semibold uppercase" style={{ color: '#0892A0' }}>基层执行方案</span>
              </div>
              <div className="grid grid-cols-2">
                {[
                  ['转出原因', form.reason],
                  ['护理要点', form.nursingNotes],
                  ['康复建议', form.rehabSuggestion || '—'],
                  ['首次随访时间', form.followupDate],
                  ['预警事项', form.warningNotes || '—'],
                  ['补充说明', form.supplementNote || '—'],
                  ['随访监测指标', form.indicators.length > 0 ? form.indicators.join('、') : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="px-4 py-2.5">
                    <div className="text-xs text-gray-400">{label}</div>
                    <div className="text-sm font-medium text-gray-800 mt-0.5 whitespace-pre-line">{value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden divide-y divide-gray-100" style={{ background: '#F9FAFB' }}>
              <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                <span className="text-xs font-semibold uppercase" style={{ color: '#0892A0' }}>接收安排</span>
              </div>
              <div className="grid grid-cols-2">
                {[
                  ['目标机构', selectedInst?.name || '—'],
                  ['承接科室', form.toDept || '—'],
                  ['接收方式', form.allocationMode === 'designated' ? '指定接收医生' : '仅指定机构'],
                  ['指定对象', form.allocationMode === 'designated' ? form.designatedDoctorName : (configuredCoordinator?.name ? `${configuredCoordinator.name}（基层负责人）` : '—')],
                ].map(([label, value]) => (
                  <div key={label} className="px-4 py-2.5">
                    <div className="text-xs text-gray-400">{label}</div>
                    <div className="text-sm font-medium text-gray-800 mt-0.5">{value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        <div className="px-6 py-4 flex items-center justify-between rounded-b-xl" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <button
            onClick={() => step > 0 ? setStep(current => current - 1) : navigate('/county/dashboard')}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
          >
            {step === 0 ? '取消并返回工作台' : '← 上一步'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              disabled={!canNext}
              onClick={() => {
                if (step === CONSENT_STEP_INDEX && !consentSigned) return
                setStep(current => current + 1)
              }}
              className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              style={canNext
                ? { background: '#0BBECF', color: '#fff' }
                : { background: '#E5E7EB', color: '#9CA3AF', cursor: 'not-allowed' }}
            >
              下一步 →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: '#0BBECF' }}
            >
              ✓ 提交转出申请
            </button>
          )}
        </div>
      </div>

      {sourceDialog && (
        <SourceDialog
          title={sourceDialog.title}
          sources={sourceDialog.sources}
          onClose={() => setSourceDialog(null)}
        />
      )}
    </div>
  )
}

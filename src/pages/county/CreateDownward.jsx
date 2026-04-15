import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { INSTITUTIONS, MOCK_USERS, ROLES } from '../../data/mockData'
import { buildConsentFileRecord, downloadConsentTemplate, validateConsentFile } from '../../utils/consentUpload'

const STEPS = ['患者信息', '接收资料', '知情同意', '提交确认']
const MONITOR_RECOMMENDATIONS = [
  '血压',
  '血糖',
  '体温',
  '心率',
  '呼吸情况',
  '疼痛评分',
  '睡眠情况',
  '饮食情况',
  '排便情况',
  '伤口恢复',
  '用药依从性',
  '肢体活动情况',
]
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

const PATIENT_SEARCH_RESULTS = [
  {
    id: 'mock-downward-zhangguifang',
    inpatientNo: 'ZY2026041001',
    patientId: 'p-mock-zhangguifang',
    patientName: '张桂芳',
    patientGender: '女',
    patientAge: '67',
    patientPhone: '13800138000',
    patientIdCard: '510623195904101248',
    patientIdCardMasked: '510623********1248',
    recentVisit: 'xx市人民医院心内科住院，2026/04/10 出院',
    diagnosisText: '冠状动脉粥样硬化性心脏病',
    icd10: 'I25.1',
    clinicalSummary: '患者因反复胸闷胸痛住院治疗，完善心电图、心肌酶及冠脉相关检查后，诊断为冠状动脉粥样硬化性心脏病。住院期间予以抗血小板、调脂、改善循环等治疗，当前病情平稳，建议下转基层继续康复管理与长期随访。',
    medications: [
      { name: '阿司匹林肠溶片', spec: '100mg', usage: 'qd', displayText: '阿司匹林肠溶片 100mg qd' },
      { name: '阿托伐他汀钙片', spec: '20mg', usage: 'qn', displayText: '阿托伐他汀钙片 20mg qn' },
      { name: '单硝酸异山梨酯缓释片', spec: '40mg', usage: 'qd', displayText: '单硝酸异山梨酯缓释片 40mg qd' },
    ],
    otherExecutionAdvice: '继续监测血压、心率\n规律服药，避免擅自停药\n建议低盐低脂饮食，适量活动',
    attachments: [
      { key: 'dischargeSummary', name: '出院小结.pdf', source: '出院小结', category: 'recommended', fromSystem: true, size: '0.8MB' },
      { key: 'ecg', name: '心电图报告.pdf', source: '检查报告', category: 'recommended', fromSystem: true, size: '0.5MB' },
      { key: 'bloodLipid', name: '血脂检验报告.pdf', source: '检验报告', category: 'recommended', fromSystem: true, size: '0.4MB' },
      { key: 'cta', name: '冠脉CTA报告.pdf', source: '检查报告', category: 'supplemental', fromSystem: true, size: '1.2MB' },
    ],
    diagnosis: { code: 'I25.1', name: '冠状动脉粥样硬化性心脏病' },
  },
  {
    id: 'mock-downward-liujianguo',
    inpatientNo: 'ZY2026041202',
    patientId: 'p-mock-liujianguo',
    patientName: '刘建国',
    patientGender: '男',
    patientAge: '58',
    patientPhone: '13900139000',
    patientIdCard: '510623196804015621',
    patientIdCardMasked: '510623********5621',
    recentVisit: 'xx市人民医院神经内科住院，2026/04/12 出院',
    diagnosisText: '脑梗死恢复期',
    icd10: 'I63.9',
    clinicalSummary: '患者因肢体乏力、言语含糊住院治疗，完善头颅影像及神经系统评估后，诊断为脑梗死恢复期。住院期间予以抗血小板、调脂、改善循环及康复训练等治疗，当前病情稳定，建议下转基层继续康复随访。',
    medications: [
      { name: '阿司匹林肠溶片', spec: '100mg', usage: 'qd', displayText: '阿司匹林肠溶片 100mg qd' },
      { name: '阿托伐他汀钙片', spec: '20mg', usage: 'qn', displayText: '阿托伐他汀钙片 20mg qn' },
      { name: '胞磷胆碱钠片', spec: '0.2g', usage: 'tid', displayText: '胞磷胆碱钠片 0.2g tid' },
    ],
    otherExecutionAdvice: '继续监测血压、血糖\n按计划开展肢体康复训练\n如出现言语含糊或肢体无力加重请及时就诊',
    attachments: [
      { key: 'dischargeSummary', name: '出院小结.pdf', source: '出院小结', category: 'recommended', fromSystem: true, size: '0.8MB' },
      { key: 'brainCt', name: '头颅CT报告.pdf', source: '检查报告', category: 'recommended', fromSystem: true, size: '0.7MB' },
      { key: 'coagulation', name: '凝血功能检验报告.pdf', source: '检验报告', category: 'recommended', fromSystem: true, size: '0.4MB' },
    ],
    diagnosis: { code: 'I63.9', name: '脑梗死恢复期' },
  },
]

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

function SectionTitle({ title, desc }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      {desc && <div className="text-xs text-gray-400 mt-1">{desc}</div>}
    </div>
  )
}

function FieldLabel({ children, required = false, hint, badge }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
      {badge && <span className="text-xs font-normal ml-2" style={{ color: '#0892A0' }}>{badge}</span>}
      {hint && <span className="text-xs text-gray-400 font-normal ml-2">{hint}</span>}
    </label>
  )
}

function SummaryBlock({ title, items }) {
  return (
    <div className="rounded-xl overflow-hidden divide-y divide-gray-100" style={{ background: '#F9FAFB' }}>
      <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
        <span className="text-xs font-semibold" style={{ color: '#0892A0' }}>{title}</span>
      </div>
      <div className="grid grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className={`px-4 py-2.5 ${String(value || '').length > 40 ? 'col-span-2' : ''}`}>
            <div className="text-xs text-gray-400">{label}</div>
            {Array.isArray(value) ? (
              <div className="flex flex-wrap gap-2 mt-1">
                {value.length === 0 ? (
                  <span className="text-sm font-medium text-gray-800">—</span>
                ) : value.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: '#E0F6F9', color: '#0892A0' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm font-medium text-gray-800 mt-0.5 whitespace-pre-line">{value || '—'}</div>
            )}
          </div>
        ))}
      </div>
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

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-[440px] max-w-[92vw] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="px-6 py-5 text-sm text-gray-600 leading-6">{message}</div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
            取消
          </button>
          <button type="button" onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: '#0BBECF' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
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

function buildAutoData(record) {
  return {
    patientId: record.patientId,
    patientName: record.patientName,
    patientGender: record.patientGender,
    patientAge: record.patientAge,
    patientPhone: record.patientPhone,
    patientIdCard: record.patientIdCard,
    diagnosis: record.diagnosis,
    diagnosisText: record.diagnosisText,
    icd10: record.icd10,
    clinicalSummary: record.clinicalSummary,
    medications: record.medications,
    otherExecutionAdvice: record.otherExecutionAdvice,
    attachments: record.attachments,
    autoPulledAt: new Date().toLocaleString('zh-CN'),
  }
}

function matchesPatientSearch(record, keyword) {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return true

  const candidates = [
    record.patientName,
    record.patientIdCard,
    record.patientIdCardMasked,
    record.patientPhone,
    record.inpatientNo,
    record.recentVisit,
  ]

  return candidates.some(value => String(value || '').toLowerCase().includes(normalized))
}

function getDoctorRecommendationReason(doctor) {
  if (doctor.isFamilyDoctor) return '签约家庭医生'
  if (doctor.seenIn90d) return '最近承接过该患者'
  return '该机构推荐承接人'
}

function maskIdCard(idCard) {
  if (!idCard) return '—'
  const value = String(idCard)
  if (value.length < 8) return value
  return `${value.slice(0, 3)}****${value.slice(-4)}`
}

export default function CreateDownward() {
  const navigate = useNavigate()
  const { createDownwardReferral } = useApp()
  const [step, setStep] = useState(0)
  const [sourceDialog, setSourceDialog] = useState(null)
  const [showRepullConfirm, setShowRepullConfirm] = useState(false)
  const [isPullingPatientData, setIsPullingPatientData] = useState(false)
  const [patientSearchQuery, setPatientSearchQuery] = useState('张桂芳')
  const [patientSearchState, setPatientSearchState] = useState('idle')
  const [patientSearchResults, setPatientSearchResults] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [pullStatus, setPullStatus] = useState('未拉取')
  const [pullResult, setPullResult] = useState('')
  const [customIndicatorInput, setCustomIndicatorInput] = useState('')
  const [consentFile, setConsentFile] = useState(null)
  const [consentError, setConsentError] = useState('')
  const [signerType, setSignerType] = useState('patient')
  const [signerRelation, setSignerRelation] = useState('')
  const [signerReason, setSignerReason] = useState('')
  const [fieldBadges, setFieldBadges] = useState({})
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
    medications: [],
    otherExecutionAdvice: '',
    attachments: [],
    autoPulledAt: '',
    reason: '',
    nursingNotes: '',
    rehabSuggestion: '',
    followupDate: '',
    indicators: [],
    customIndicators: [],
    warningNotes: '',
    supplementNote: '',
    toInstitutionId: '',
    toDept: '',
    allocationMode: 'designated',
    designatedDoctorId: '',
    designatedDoctorName: '',
  })

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'

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
    () => (PRIMARY_RECEIVER_OPTIONS[form.toInstitutionId] || [])
      .filter(item => !item.isReferralCoordinator)
      .sort((a, b) => {
        if (a.isFamilyDoctor && !b.isFamilyDoctor) return -1
        if (!a.isFamilyDoctor && b.isFamilyDoctor) return 1
        return (b.recentCount30d || 0) - (a.recentCount30d || 0)
      }),
    [form.toInstitutionId],
  )

  const derivedAge = useMemo(
    () => getAgeFromIdCard(form.patientIdCard) || form.patientAge,
    [form.patientAge, form.patientIdCard],
  )

  const recommendedAttachments = form.attachments.filter(item => item.category === 'recommended')
  const supplementalAttachments = form.attachments.filter(item => item.category === 'supplemental')
  const canEditPatientAndTransfer = patientSearchState === 'not_found' || !!selectedPatient

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const setPulledFields = (values) => {
    const pulledKeys = Object.keys(values)
    setForm(prev => ({ ...prev, ...values }))
    setFieldBadges(prev => pulledKeys.reduce((acc, key) => ({ ...acc, [key]: true }), prev))
  }

  const resetPatientRelatedFields = () => {
    setForm(prev => ({
      ...prev,
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
      medications: [],
      otherExecutionAdvice: '',
      attachments: [],
      autoPulledAt: '',
    }))
    setFieldBadges({})
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

  const handleSearchPatients = async () => {
    setIsPullingPatientData(true)
    const matches = PATIENT_SEARCH_RESULTS.filter(record => matchesPatientSearch(record, patientSearchQuery))
    setPatientSearchResults(matches)
    setSelectedPatient(null)
    resetPatientRelatedFields()
    if (matches.length === 0) {
      setPatientSearchState('not_found')
      setPullStatus('拉取失败')
      setPullResult('未检索到患者资料，请手工填写患者信息，并在下方补充转出资料。')
      setIsPullingPatientData(false)
      return
    }
    setPatientSearchState('results')
    setPullStatus('未拉取')
    setPullResult('')
    setIsPullingPatientData(false)
  }

  const applySelectedPatient = (record, successMessage) => {
    const autoData = buildAutoData(record)
    setPulledFields({
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
      medications: autoData.medications,
      otherExecutionAdvice: autoData.otherExecutionAdvice,
      attachments: autoData.attachments,
      autoPulledAt: autoData.autoPulledAt,
    })
    setSelectedPatient(record)
    setPatientSearchState('selected')
    setPullStatus('拉取成功')
    setPullResult(successMessage || `已自动带出 ${record.patientName} 的患者资料和转出资料。`)
  }

  const handleSelectPatient = (record) => {
    applySelectedPatient(record, `已自动带出 ${record.patientName} 的患者资料、诊疗摘要、出院医嘱和附件资料。`)
  }

  const handleChangePatient = () => {
    setSelectedPatient(null)
    setPatientSearchState(patientSearchResults.length > 0 ? 'results' : 'idle')
    setPullStatus('未拉取')
    setPullResult('')
    resetPatientRelatedFields()
  }

  const handleConfirmRepull = () => {
    if (!selectedPatient) return
    setShowRepullConfirm(false)
    setIsPullingPatientData(true)
    applySelectedPatient(selectedPatient, `已重新带出 ${selectedPatient.patientName} 的患者资料和转出资料。`)
    setIsPullingPatientData(false)
  }

  const handleViewSource = (title, sources) => setSourceDialog({ title, sources })

  const addMedication = () => {
    setForm(prev => ({ ...prev, medications: [...prev.medications, { ...EMPTY_MED }] }))
  }

  const updateMedication = (index, key, value) => {
    setForm(prev => ({
      ...prev,
      medications: prev.medications.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [key]: value } : item
      ),
    }))
  }

  const removeMedication = (index) => {
    setForm(prev => ({ ...prev, medications: prev.medications.filter((_, currentIndex) => currentIndex !== index) }))
  }

  const handleUploadAttachment = (event) => {
    const files = Array.from(event.target.files || [])
    const next = files.map(file => ({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      source: '手工补充',
      category: 'supplemental',
      fromSystem: false,
    }))
    setForm(prev => ({ ...prev, attachments: [...prev.attachments, ...next] }))
    event.target.value = ''
  }

  const removeAttachment = (name) => {
    setForm(prev => ({ ...prev, attachments: prev.attachments.filter(item => item.name !== name) }))
  }

  const toggleIndicator = (item) => {
    setForm(prev => ({
      ...prev,
      indicators: prev.indicators.includes(item)
        ? prev.indicators.filter(current => current !== item)
        : [...prev.indicators, item],
    }))
  }

  const addCustomIndicator = () => {
    const value = customIndicatorInput.trim()
    if (!value) return
    if (form.indicators.includes(value)) {
      setCustomIndicatorInput('')
      return
    }

    setForm(prev => ({
      ...prev,
      customIndicators: prev.customIndicators.includes(value) ? prev.customIndicators : [...prev.customIndicators, value],
      indicators: [...prev.indicators, value],
    }))
    setCustomIndicatorInput('')
  }

  const removeIndicator = (item) => {
    setForm(prev => ({
      ...prev,
      indicators: prev.indicators.filter(current => current !== item),
      customIndicators: prev.customIndicators.filter(current => current !== item),
    }))
  }

  const handleConsentFileSelect = (file) => {
    if (!file) return
    const validation = validateConsentFile(file)
    if (!validation.valid) {
      setConsentError(validation.error)
      return
    }

    if (consentFile?.fileUrl) {
      URL.revokeObjectURL(consentFile.fileUrl)
    }
    setConsentFile(buildConsentFileRecord(file))
    setConsentError('')
  }

  const clearConsentFile = () => {
    if (consentFile?.fileUrl) {
      URL.revokeObjectURL(consentFile.fileUrl)
    }
    setConsentFile(null)
    setConsentError('')
  }

  const stepCanNext = [
    !!form.patientName && !!form.patientGender && !!derivedAge && !!form.patientIdCard && !!form.patientPhone && !!form.diagnosisText && !!form.clinicalSummary,
    !!form.reason && !!form.nursingNotes && !!form.followupDate && !!form.toInstitutionId && !!form.toDept && !!form.allocationMode && (form.allocationMode === 'coordinator' || !!form.designatedDoctorId),
    !!consentFile && (signerType !== 'family' || (!!signerRelation && !!signerReason)),
    true,
  ][step]

  const handleSubmit = () => {
    if (!consentFile) {
      setConsentError('请先上传已签署的知情同意书')
      return
    }

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
        title: '转出资料摘要',
        sections: [
          {
            title: '转出资料确认',
            items: [
              { label: '当前诊断', value: form.diagnosisText || '—' },
              { label: 'ICD-10', value: form.icd10 || '—' },
              { label: '诊疗摘要', value: form.clinicalSummary || '—' },
              { label: '其他执行建议', value: form.otherExecutionAdvice || '—' },
            ],
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
        otherExecutionAdvice: form.otherExecutionAdvice,
      },
      attachments: form.attachments.map(item => ({ name: item.name, size: item.size, source: item.source })),
      consentMethod: 'offline_upload',
      consentSigned: true,
      consentFileUrl: consentFile?.fileUrl || null,
      consentUploadedAt: consentFile?.uploadedAt || new Date().toISOString(),
      consentSignedBy: signerType,
      autoDataMeta: {
        pulledAt: form.autoPulledAt || null,
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
          <div className="p-6 space-y-6">
            <SectionTitle title="患者信息" />

            <div className="rounded-xl px-4 py-4" style={{ background: '#F8FDFE', border: '1px solid #DDF0F3' }}>
              {patientSearchState === 'selected' && selectedPatient ? (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">已选择患者：{selectedPatient.patientName}</div>
                    <div className="text-xs text-gray-500 mt-1">数据状态：已成功带出患者资料</div>
                    <div className="text-xs text-gray-400 mt-1">拉取状态：{pullStatus}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleChangePatient}
                      className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-white"
                    >
                      更换患者
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRepullConfirm(true)}
                      disabled={isPullingPatientData}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ background: '#0BBECF', opacity: isPullingPatientData ? 0.7 : 1 }}
                    >
                      {isPullingPatientData ? '正在拉取...' : '重新拉取资料'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">患者资料获取</div>
                  </div>
                  <div className="mt-4 flex gap-3 flex-wrap">
                    <input
                      className={`${inputCls} flex-1 min-w-[280px]`}
                      value={patientSearchQuery}
                      onChange={event => setPatientSearchQuery(event.target.value)}
                      placeholder="请输入患者姓名 / 身份证号 / 住院号"
                    />
                    <button
                      type="button"
                      onClick={handleSearchPatients}
                      disabled={isPullingPatientData}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ background: '#0BBECF', opacity: isPullingPatientData ? 0.7 : 1 }}
                    >
                      {isPullingPatientData ? '检索中...' : '搜索患者'}
                    </button>
                  </div>
                </>
              )}

              {patientSearchState === 'results' && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {patientSearchResults.map(patient => (
                    <div key={patient.id} className="rounded-xl px-4 py-4 bg-white border border-gray-200">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-gray-900">{patient.patientName}</div>
                          <div className="text-sm text-gray-500 mt-1">{patient.patientGender} / {patient.patientAge}岁</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectPatient(patient)}
                          className="px-3 py-1.5 rounded-lg text-sm text-white"
                          style={{ background: '#0BBECF' }}
                        >
                          选择该患者
                        </button>
                      </div>
                      <div className="text-sm text-gray-600 mt-3">身份证号：{patient.patientIdCardMasked}</div>
                      <div className="text-sm text-gray-600 mt-1">联系电话：{patient.patientPhone}</div>
                      <div className="text-sm text-gray-600 mt-1">最近就诊：{patient.recentVisit}</div>
                    </div>
                  ))}
                </div>
              )}

              {patientSearchState === 'not_found' && (
                <div
                  className="mt-4 rounded-lg px-3 py-2 text-sm flex items-center justify-between gap-3 flex-wrap"
                  style={{ background: '#FFF9ED', border: '1px solid #F6D48A', color: '#9A6700' }}
                >
                  <span>{pullResult}</span>
                  <button
                    type="button"
                    onClick={handleSearchPatients}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-sm"
                  >
                    重新检索
                  </button>
                </div>
              )}

              {patientSearchState === 'selected' && pullResult && (
                <div
                  className="mt-4 rounded-lg px-3 py-2 text-sm"
                  style={{ background: '#F0FBF5', border: '1px solid #BDE7D0', color: '#0F7A45' }}
                >
                  {pullResult}
                </div>
              )}
            </div>

            <div style={{ opacity: canEditPatientAndTransfer ? 1 : 0.55, pointerEvents: canEditPatientAndTransfer ? 'auto' : 'none' }}>
              <SectionTitle title="患者基础信息" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel required hint={fieldBadges.patientName ? '可编辑补充' : ''}>姓名</FieldLabel>
                  <input className={inputCls} value={form.patientName} onChange={event => setField('patientName', event.target.value)} placeholder="请输入姓名" />
                </div>
                <div>
                  <FieldLabel required hint={fieldBadges.patientGender ? '可编辑补充' : ''}>性别</FieldLabel>
                  <select className={inputCls} value={form.patientGender} onChange={event => setField('patientGender', event.target.value)}>
                    <option value="">请选择</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                <div>
                  <FieldLabel required hint={fieldBadges.patientAge ? '可编辑补充' : ''}>年龄</FieldLabel>
                  <div className={`${inputCls} bg-gray-50 text-gray-600 flex items-center`}>
                    {derivedAge ? `${derivedAge}岁` : '填写身份证号后自动计算'}
                  </div>
                </div>
                <div>
                  <FieldLabel required hint={fieldBadges.patientIdCard ? '可编辑补充' : ''}>身份证号</FieldLabel>
                  <input className={inputCls} value={form.patientIdCard} onChange={event => setField('patientIdCard', event.target.value)} placeholder="请输入身份证号" />
                </div>
                <div>
                  <FieldLabel required hint={fieldBadges.patientPhone ? '可编辑补充' : ''}>联系电话</FieldLabel>
                  <input className={inputCls} value={form.patientPhone} onChange={event => setField('patientPhone', event.target.value)} placeholder="请输入联系电话" />
                </div>
              </div>
            </div>

            <div style={{ opacity: canEditPatientAndTransfer ? 1 : 0.55, pointerEvents: canEditPatientAndTransfer ? 'auto' : 'none' }}>
              <SectionTitle title="转出资料确认" desc="可保留来源、重新拉取、查看来源等轻交互，先完成资料核对再进入接收资料。" />
              <div className="space-y-4">
                <div className="rounded-xl border px-4 py-4" style={{ background: '#F5FAFF', borderColor: '#D7EAFE' }}>
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                    <div className="text-sm font-semibold text-gray-800">当前诊断</div>
                    <div className="flex items-center gap-2 text-xs">
                      {selectedPatient && <button type="button" onClick={() => setShowRepullConfirm(true)} className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-white">重新拉取资料</button>}
                      <button type="button" onClick={() => handleViewSource('当前诊断来源', ['inpatientHome', 'dischargeSummary'])} className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-white">查看来源</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required hint={fieldBadges.diagnosisText ? '可编辑补充' : ''}>当前诊断</FieldLabel>
                      <input className={inputCls} value={form.diagnosisText} onChange={event => setField('diagnosisText', event.target.value)} placeholder="请输入当前诊断" />
                    </div>
                    <div>
                      <FieldLabel required hint={fieldBadges.icd10 ? '可编辑补充' : ''}>ICD-10</FieldLabel>
                      <input className={inputCls} value={form.icd10} onChange={event => setField('icd10', event.target.value)} placeholder="请输入 ICD-10" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border px-4 py-4" style={{ background: '#F5FAFF', borderColor: '#D7EAFE' }}>
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                    <div className="text-sm font-semibold text-gray-800">诊疗摘要</div>
                    <div className="flex items-center gap-2 text-xs">
                      {selectedPatient && <button type="button" onClick={() => setShowRepullConfirm(true)} className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-white">重新拉取资料</button>}
                      <button type="button" onClick={() => handleViewSource('诊疗摘要来源', ['patient360', 'dischargeSummary', 'progressNotes'])} className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-white">查看来源</button>
                    </div>
                  </div>
                  <div className="text-xs mb-2" style={{ color: fieldBadges.clinicalSummary ? '#0892A0' : '#9CA3AF' }}>
                    {fieldBadges.clinicalSummary ? '可编辑补充' : '可编辑补充'}
                  </div>
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={4}
                    value={form.clinicalSummary}
                    onChange={event => setField('clinicalSummary', event.target.value)}
                    placeholder="请输入诊疗摘要"
                  />
                </div>

                <div className="rounded-xl border px-4 py-4" style={{ background: '#F5FAFF', borderColor: '#D7EAFE' }}>
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                    <div className="text-sm font-semibold text-gray-800">出院医嘱</div>
                    <div className="flex items-center gap-2 text-xs">
                      {selectedPatient && <button type="button" onClick={() => setShowRepullConfirm(true)} className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-white">重新拉取资料</button>}
                      <button type="button" onClick={() => handleViewSource('出院医嘱来源', ['prescription', 'orders'])} className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-white">查看来源</button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <FieldLabel hint={fieldBadges.medications ? '可编辑补充' : ''}>药物交接</FieldLabel>
                    <div className="space-y-2">
                      {form.medications.length === 0 && (
                        <div className="text-sm text-gray-400">暂无药物交接内容，可手工补充。</div>
                      )}
                      {form.medications.map((med, index) => (
                        <div key={`${med.name}-${index}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start p-3 rounded-lg bg-white border border-blue-100">
                          <input className={inputCls} value={med.name} onChange={event => updateMedication(index, 'name', event.target.value)} placeholder="药品名称" />
                          <input className={inputCls} value={med.spec} onChange={event => updateMedication(index, 'spec', event.target.value)} placeholder="规格" />
                          <input className={inputCls} value={med.usage} onChange={event => updateMedication(index, 'usage', event.target.value)} placeholder="用法" />
                          <button type="button" onClick={() => removeMedication(index)} className="px-3 py-2 text-sm text-gray-400 hover:text-red-500">删除</button>
                        </div>
                      ))}
                      <button type="button" onClick={addMedication} className="text-xs px-3 py-1.5 rounded-lg border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
                        + 手工新增药物
                      </button>
                    </div>
                  </div>

                  <div>
                    <FieldLabel hint={fieldBadges.otherExecutionAdvice ? '可编辑补充' : ''}>其他执行建议</FieldLabel>
                    <textarea
                      className={`${inputCls} resize-none`}
                      rows={3}
                      value={form.otherExecutionAdvice}
                      onChange={event => setField('otherExecutionAdvice', event.target.value)}
                      placeholder="请输入其他执行建议"
                    />
                  </div>
                </div>

                <div className="rounded-xl border px-4 py-4" style={{ background: '#F5FAFF', borderColor: '#D7EAFE' }}>
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                    <div className="text-sm font-semibold text-gray-800">附件资料</div>
                    <div className="flex items-center gap-2 text-xs">
                      {selectedPatient && <button type="button" onClick={() => setShowRepullConfirm(true)} className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-white">重新拉取资料</button>}
                      <button type="button" onClick={() => handleViewSource('附件资料来源', ['patient360', 'dischargeSummary', 'lab', 'imaging', 'surgery'])} className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-white">查看来源</button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      推荐必带
                    </div>
                    <div className="space-y-2">
                      {recommendedAttachments.length === 0 ? (
                        <div className="text-sm text-gray-400">暂无推荐必带资料</div>
                      ) : recommendedAttachments.map(item => (
                        <div key={item.name} className="flex items-center justify-between gap-3 bg-white border border-blue-100 rounded-lg px-3 py-2.5 text-sm">
                          <div>
                            <div className="font-medium text-gray-800">{item.name}</div>
                            <div className="text-xs text-gray-400 mt-1">{item.source} · {item.size || '静态示例'}</div>
                          </div>
                          <button type="button" onClick={() => removeAttachment(item.name)} className="text-xs text-gray-400 hover:text-red-500">删除</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      补充资料
                      {fieldBadges.attachments && <span className="text-xs font-normal ml-2 text-gray-400">可编辑补充</span>}
                    </div>
                    <div className="space-y-2">
                      {supplementalAttachments.length === 0 ? (
                        <div className="text-sm text-gray-400">暂无补充资料，可上传补充。</div>
                      ) : supplementalAttachments.map(item => (
                        <div key={item.name} className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
                          <div>
                            <div className="font-medium text-gray-800">{item.name}</div>
                            <div className="text-xs text-gray-400 mt-1">{item.source} · {item.size || '静态示例'}</div>
                          </div>
                          <button type="button" onClick={() => removeAttachment(item.name)} className="text-xs text-gray-400 hover:text-red-500">删除</button>
                        </div>
                      ))}
                    </div>
                    <label className="inline-flex items-center gap-2 mt-3 text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
                      <span>+ 补充上传附件</span>
                      <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadAttachment} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="p-6 space-y-6">
            <SectionTitle title="接收资料" desc="先填写基层执行方案，再确认接收安排。" />

            <div>
              <SectionTitle title="基层执行方案" />
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FieldLabel required>转出原因</FieldLabel>
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.reason} onChange={event => setField('reason', event.target.value)} placeholder="说明转出原因与基层承接目标" />
                </div>
                <div className="col-span-2">
                  <FieldLabel required>护理要点</FieldLabel>
                  <textarea className={`${inputCls} resize-none`} rows={3} value={form.nursingNotes} onChange={event => setField('nursingNotes', event.target.value)} placeholder="填写护理重点、观察要求、家庭照护建议" />
                </div>
                <div className="col-span-2">
                  <FieldLabel>康复建议</FieldLabel>
                  <textarea className={`${inputCls} resize-none`} rows={3} value={form.rehabSuggestion} onChange={event => setField('rehabSuggestion', event.target.value)} placeholder="填写康复训练建议、功能恢复目标与阶段安排" />
                </div>
                <div>
                  <FieldLabel required>首次随访时间</FieldLabel>
                  <input type="date" className={inputCls} value={form.followupDate} onChange={event => setField('followupDate', event.target.value)} />
                </div>
                <div className="col-span-2">
                  <FieldLabel>随访监测指标</FieldLabel>
                  <div className="rounded-xl border px-4 py-4" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
                    <div className="text-xs text-gray-500 mb-3">请选择基层随访时需要重点观察的指标，可勾选推荐项，也可补充自定义指标。</div>
                    <div className="flex flex-wrap gap-2">
                      {MONITOR_RECOMMENDATIONS.map(item => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleIndicator(item)}
                          className="px-3 py-1.5 rounded-full text-sm border transition-colors"
                          style={form.indicators.includes(item)
                            ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                            : { background: '#fff', color: '#4B5563', borderColor: '#E5E7EB' }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">已选指标</div>
                      <div className="flex flex-wrap gap-2 min-h-[36px]">
                        {form.indicators.length === 0 ? (
                          <span className="text-sm text-gray-400">暂未选择指标</span>
                        ) : form.indicators.map(item => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => removeIndicator(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border"
                            style={{ background: '#fff', borderColor: '#D1D5DB', color: '#374151' }}
                          >
                            <span>{item}</span>
                            <span className="text-xs">×</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <input
                        className={inputCls}
                        value={customIndicatorInput}
                        onChange={event => setCustomIndicatorInput(event.target.value)}
                        placeholder="补充其他需要随访观察的指标"
                      />
                      <button type="button" onClick={addCustomIndicator} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: '#0BBECF' }}>
                        添加
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <FieldLabel>预警事项</FieldLabel>
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.warningNotes} onChange={event => setField('warningNotes', event.target.value)} placeholder="填写需要重点预警的问题" />
                </div>
                <div>
                  <FieldLabel>补充说明</FieldLabel>
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.supplementNote} onChange={event => setField('supplementNote', event.target.value)} placeholder="补充其他交接说明" />
                </div>
              </div>
            </div>

            <div>
              <SectionTitle title="接收安排" />
              <div className="space-y-4">
                <div>
                  <FieldLabel required>目标基层机构</FieldLabel>
                  <select className={inputCls} value={form.toInstitutionId} onChange={event => chooseInstitution(event.target.value)}>
                    <option value="">请选择目标基层机构</option>
                    {INSTITUTIONS.filter(item => item.type === 'primary').map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel required>自动匹配承接科室</FieldLabel>
                  <div className={`${inputCls} bg-gray-50 text-gray-600 flex items-center`}>
                    {form.toDept || '选择目标基层机构后自动展示'}
                  </div>
                </div>

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
                          onChange={() => setField('allocationMode', 'designated', '手工填写')}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">指定接收医生</div>
                          <div className="text-xs text-gray-500 mt-1">直接通知指定医生，同时抄送基层负责人</div>
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
                          <div className="text-xs text-gray-500 mt-1">进入基层机构负责人待分配列表</div>
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
                                {doctor.isFamilyDoctor && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">推荐</span>}
                                {doctor.seenIn90d && <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">近期承接</span>}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{doctor.team}</div>
                              <div className="text-xs text-gray-400 mt-1">推荐理由：{getDoctorRecommendationReason(doctor)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-400">近30天承接量</div>
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
                      该申请提交后将由 {configuredCoordinator?.name || '基层转诊负责人'} 进入待分配列表处理。
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-6 space-y-6">
            <SectionTitle title="知情同意" desc="第3步仅保留签署相关内容，完成上传后才可进入提交确认。" />

            <div className="rounded-xl border px-4 py-4" style={{ background: '#F8FDFE', borderColor: '#DDF0F3' }}>
              <div className="text-sm font-semibold text-gray-800 mb-2">签署说明</div>
              <div className="text-sm text-gray-600 leading-6">请先下载模板，完成线下签字后上传签字文件。未上传签字文件前不能进入下一步。</div>
            </div>

            <div className="rounded-xl border px-4 py-4" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
              <div className="text-sm font-semibold text-gray-800 mb-3">下载模板</div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => downloadConsentTemplate('pdf')} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#0BBECF' }}>
                  下载 PDF 模板
                </button>
                <button type="button" onClick={() => downloadConsentTemplate('word')} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-white">
                  下载 Word 模板
                </button>
              </div>
            </div>

            <div className="rounded-xl border px-4 py-4" style={{ background: '#fff', borderColor: '#E5E7EB' }}>
              <div className="text-sm font-semibold text-gray-800 mb-3">上传签字文件</div>
              {!consentFile ? (
                <label className="flex flex-col items-center gap-2 cursor-pointer border-2 border-dashed border-gray-200 rounded-xl p-5 hover:border-[#0BBECF] transition-colors">
                  <span className="text-2xl">📎</span>
                  <span className="text-sm text-gray-700 font-medium">选择已签字文件</span>
                  <span className="text-xs text-gray-400">支持 JPG / PNG / PDF，单文件 ≤ 10MB</span>
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={event => handleConsentFileSelect(event.target.files?.[0] || null)} />
                </label>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{consentFile.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{consentFile.size}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs cursor-pointer" style={{ color: '#0BBECF' }}>
                      重新选择
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={event => handleConsentFileSelect(event.target.files?.[0] || null)} />
                    </label>
                    <button type="button" onClick={clearConsentFile} className="text-xs text-gray-400 hover:text-red-500">删除</button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border px-4 py-4" style={{ background: '#fff', borderColor: '#E5E7EB' }}>
              <div className="text-sm font-semibold text-gray-800 mb-3">签署人类型</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'patient', label: '患者本人' },
                  { value: 'family', label: '家属代签' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSignerType(option.value)}
                    className="rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
                    style={signerType === option.value
                      ? { borderColor: '#0BBECF', background: '#F0FBFC', color: '#0F766E' }
                      : { borderColor: '#E5E7EB', background: '#fff', color: '#374151' }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {signerType === 'family' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel required>代签关系</FieldLabel>
                  <input className={inputCls} value={signerRelation} onChange={event => setSignerRelation(event.target.value)} placeholder="请输入代签关系" />
                </div>
                <div>
                  <FieldLabel required>代签原因</FieldLabel>
                  <input className={inputCls} value={signerReason} onChange={event => setSignerReason(event.target.value)} placeholder="请输入代签原因" />
                </div>
              </div>
            )}

            <div className="rounded-xl border px-4 py-4" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
              <div className="text-sm font-semibold text-gray-800 mb-2">上传状态</div>
              <div className="text-sm text-gray-700">状态：{consentFile ? '已完成' : '未上传'}</div>
              <div className="text-sm text-gray-700 mt-1">已上传文件名：{consentFile?.name || '未上传'}</div>
            </div>

            {!consentFile && !consentError && (
              <div className="rounded-lg px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200">
                上传签字文件后，“下一步”会自动解锁。
              </div>
            )}

            {consentError && (
              <div className="rounded-lg px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200">
                {consentError}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="p-6 space-y-4">
            <SectionTitle title="提交确认" desc="请核对以下摘要信息，确认无误后提交转出申请。" />

            <SummaryBlock
              title="患者信息"
              items={[
                ['姓名', form.patientName || '—'],
                ['性别', form.patientGender || '—'],
                ['年龄', derivedAge ? `${derivedAge}岁` : '—'],
                ['身份证号', maskIdCard(form.patientIdCard)],
                ['联系电话', form.patientPhone || '—'],
              ]}
            />

            <SummaryBlock
              title="转出资料"
              items={[
                ['当前诊断', form.diagnosisText || '—'],
                ['ICD-10', form.icd10 || '—'],
                ['诊疗摘要', form.clinicalSummary || '—'],
                ['出院医嘱概要', form.medications.filter(item => item.name).length > 0 ? form.medications.filter(item => item.name).map(item => `${item.name} ${item.spec || ''} ${item.usage || ''}`.trim()).join('；') : form.otherExecutionAdvice || '—'],
                ['附件资料数量 / 关键附件', `${form.attachments.length} 份${form.attachments.length > 0 ? ` · ${form.attachments.slice(0, 3).map(item => item.name).join('、')}` : ''}`],
              ]}
            />

            <SummaryBlock
              title="基层执行方案"
              items={[
                ['转出原因', form.reason || '—'],
                ['护理要点', form.nursingNotes || '—'],
                ['康复建议', form.rehabSuggestion || '—'],
                ['首次随访时间', form.followupDate || '—'],
                ['随访监测指标', form.indicators],
                ['预警事项', form.warningNotes || '—'],
                ['补充说明', form.supplementNote || '—'],
              ]}
            />

            <SummaryBlock
              title="接收安排"
              items={[
                ['目标基层机构', selectedInst?.name || '—'],
                ['自动匹配承接科室', form.toDept || '—'],
                ['接收方式', form.allocationMode === 'designated' ? '指定接收医生' : '仅指定机构'],
                ['指定接收医生', form.allocationMode === 'designated' ? (form.designatedDoctorName || '—') : '—'],
              ]}
            />

            <SummaryBlock
              title="知情同意"
              items={[
                ['签署方式', '线下签字后上传'],
                ['签署人', signerType === 'family' ? `家属代签（${signerRelation || '未填写'}）` : '患者本人'],
                ['已上传文件名', consentFile?.name || '未上传'],
                ['状态', '已完成'],
              ]}
            />
          </div>
        )}

        <div className="px-6 py-4 flex items-center justify-between rounded-b-xl" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <button
            onClick={() => step > 0 ? setStep(current => current - 1) : navigate('/county/dashboard')}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
          >
            {step === 0 ? '取消并返回工作台' : '上一步'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              disabled={!stepCanNext}
              onClick={() => setStep(current => current + 1)}
              className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              style={stepCanNext
                ? { background: '#0BBECF', color: '#fff' }
                : { background: '#E5E7EB', color: '#9CA3AF', cursor: 'not-allowed' }}
            >
              下一步
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: '#0BBECF' }}
            >
              提交转出申请
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

      {showRepullConfirm && (
        <ConfirmDialog
          title="重新拉取资料"
          message="重新拉取可能覆盖已填写的患者基础信息和转出资料，是否继续？"
          confirmLabel="继续拉取"
          onCancel={() => setShowRepullConfirm(false)}
          onConfirm={handleConfirmRepull}
        />
      )}
    </div>
  )
}

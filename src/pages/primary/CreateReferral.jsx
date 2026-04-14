import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ConsentOfflinePanel from '../../components/ConsentOfflinePanel'
import { useApp } from '../../context/AppContext'
import { ICD10_LIST, INSTITUTIONS } from '../../data/mockData'
import {
  buildEmergencyInitialSms,
  buildEmergencyUrgencyFeedback,
  canProceedEmergencyReferral,
  getEmergencyHospitalConfig,
  isValidChineseMainlandMobile,
} from '../../utils/emergencyReferral'
import { buildConsentFileRecord, validateConsentFile } from '../../utils/consentUpload'

const URGENCY_LEVELS = [
  { level: 1, label: 'I级·急危', shortLabel: 'I级·急危', color: '#ef4444', bg: '#fef2f2' },
  { level: 2, label: 'II级·急重', shortLabel: 'II级·急重', color: '#f97316', bg: '#fff7ed' },
  { level: 3, label: 'III级·急症', shortLabel: 'III级·急症', color: '#eab308', bg: '#fefce8' },
  { level: 4, label: 'IV级·亚急', shortLabel: 'IV级·亚急', color: '#6b7280', bg: '#f9fafb' },
]

const NORMAL_STEPS = ['患者信息', '诊断及原因', '选择机构', '知情同意', '确认提交']
const EMERGENCY_STEPS = ['急诊信息', '确认提交']
const EMERGENCY_ENTRY_MODES = [
  { value: 'realtime', label: '实时转诊', description: '默认模式，提交后立即触发急诊联动、工作台通知和患者短信。' },
  { value: 'retro', label: '补录录入', description: '仅用于患者已先到院的事后补录，不触发实时通知，也不发送患者短信。' },
]

const ICD10_DEPT_MAPPING = {
  I10: ['内科', '心血管科'],
  I21: ['心血管科'],
  I22: ['心血管科'],
  I63: ['神经内科'],
  I61: ['神经内科'],
  J18: ['呼吸科'],
  K35: ['外科'],
  N20: ['外科'],
  E11: ['内分泌科'],
  E14: ['内分泌科'],
  M16: ['骨科'],
  S72: ['骨科'],
}

function getLinkedSpecialtySuggestion(diagnosisCode, institution) {
  const code = String(diagnosisCode || '').toUpperCase()
  const departmentCandidates = institution?.departments || []
  const match = (
    code.startsWith('I21') || code.startsWith('I22')
      ? ['心内科', '心血管科']
      : code.startsWith('I63') || code.startsWith('I61')
        ? ['神经内科']
        : code.startsWith('S') || code.startsWith('T')
          ? ['骨科', '外科', '骨伤科']
          : code.startsWith('O')
            ? ['妇产科']
            : code.startsWith('P')
              ? ['儿科']
              : []
  )

  return match.find(item => departmentCandidates.includes(item)) || null
}

function StepProgress({ steps, currentStep, accentColor = '#0BBECF' }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, index) => (
        <div key={label} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
              style={
                index < currentStep
                  ? { background: '#10b981', color: '#fff' }
                  : index === currentStep
                    ? { background: accentColor, color: '#fff', boxShadow: `0 0 0 4px ${accentColor}22` }
                    : { background: '#f3f4f6', color: '#9ca3af' }
              }
            >
              {index < currentStep ? '✓' : index + 1}
            </div>
            <div
              className="text-xs mt-1.5 whitespace-nowrap"
              style={
                index === currentStep
                  ? { color: accentColor, fontWeight: '500' }
                  : index < currentStep
                    ? { color: '#10b981' }
                    : { color: '#9ca3af' }
              }
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

function ICD10Search({ value, onChange, required = false, placeholder = '输入诊断名称或ICD编码（如：高血压、I10）' }) {
  const [query, setQuery] = useState(value?.name || '')
  const [open, setOpen] = useState(false)

  const filtered = query.length >= 1
    ? ICD10_LIST.filter(item =>
      item.name.includes(query) || item.code.toLowerCase().includes(query.toLowerCase())
    )
    : []

  const handleSelect = (item) => {
    onChange(item)
    setQuery(item.name)
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={event => {
            setQuery(event.target.value)
            setOpen(true)
            if (!event.target.value.trim()) onChange(null)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          aria-required={required}
        />
        {value && (
          <div className="flex items-center px-3 py-2 rounded-lg text-sm" style={{ background: '#E0F6F9', border: '1px solid #a4edf5', color: '#0892a0' }}>
            <span className="font-mono font-semibold mr-1">{value.code}</span>
          </div>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto">
          {filtered.map(item => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              onMouseEnter={event => { event.currentTarget.style.background = '#F0FBFC' }}
              onMouseLeave={event => { event.currentTarget.style.background = '#fff' }}
            >
              <span className="font-mono text-xs px-1.5 py-0.5 rounded w-16 text-center" style={{ background: '#E0F6F9', color: '#0892a0' }}>{item.code}</span>
              <span className="text-sm text-gray-700">{item.name}</span>
            </button>
          ))}
        </div>
      )}

      {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}
    </div>
  )
}

function ClinicRecordPicker({ isOpen, onClose, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('')
  const mockClinicRecords = [
    { id: 'C001', patientName: '张三', gender: '男', age: 45, phone: '13800138000', dept: '内科', doctor: '李医生', visitTime: '2026-04-14 09:30' },
    { id: 'C002', patientName: '李四', gender: '女', age: 32, phone: '13900139000', dept: '儿科', doctor: '王医生', visitTime: '2026-04-14 10:15' },
  ]
  const filtered = searchQuery
    ? mockClinicRecords.filter(r => r.patientName.includes(searchQuery))
    : mockClinicRecords

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">选择门诊记录</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索患者姓名..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="px-4 pb-4 space-y-2 max-h-96 overflow-y-auto">
          {filtered.map(record => (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelect(record)}
              className="w-full text-left p-3 rounded-lg border hover:border-[#0BBECF] transition-colors"
            >
              <div className="font-medium text-gray-800">{record.patientName}</div>
              <div className="text-xs text-gray-500 mt-1">
                {record.gender} · {record.age}岁 · {record.phone} · {record.dept} · {record.doctor} · {record.visitTime}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CreateReferral() {
  const navigate = useNavigate()
  const location = useLocation()
  const { submitReferral, submitForInternalReview, currentUser, referrals } = useApp()

  const prefill = location.state?.prefill
  const prefillInstitutionId = prefill?.toInstitutionId ||
    (prefill?.toInstitution ? (INSTITUTIONS.find(item => item.name === prefill.toInstitution)?.id || '') : '')
  const emergencyHospitalConfig = getEmergencyHospitalConfig(INSTITUTIONS)
  const initialFlow = prefill ? 'normal' : null

  const [selectedFlow, setSelectedFlow] = useState(initialFlow)
  const [normalStep, setNormalStep] = useState(0)
  const [emergencyStep, setEmergencyStep] = useState(0)
  // CHG-39: 知情同意改为线下签署+附件上传
  const [consentMethod, setConsentMethod] = useState('offline_upload')
  const [consentFile, setConsentFile] = useState(null)
  const [consentSignedBy, setConsentSignedBy] = useState('patient')
  const [consentError, setConsentError] = useState('')
  // CHG-41: 急诊新增“实时转诊 / 补录录入”模式切换
  const [emergencyEntryMode, setEmergencyEntryMode] = useState('realtime')
  const [urgencyLevel, setUrgencyLevel] = useState(null)
  const [linkedSpecialty, setLinkedSpecialty] = useState(null)
  const [consciousnessStatus, setConsciousnessStatus] = useState('')
  const [admissionTypePref, setAdmissionTypePref] = useState('outpatient')
  const [deptSuggestion, setDeptSuggestion] = useState(null)
  const [attachments, setAttachments] = useState([])
  // CHG-40: 护理记录附件与检查附件分开展示
  const [nursingAttachments, setNursingAttachments] = useState([])
  const [showEmergencySupplementary, setShowEmergencySupplementary] = useState(false)
  const [patientLinkMode, setPatientLinkMode] = useState(null)
  const [linkedPatient, setLinkedPatient] = useState(null)
  const [form, setForm] = useState({
    patientId: prefill?.patient?.id || '',
    patientName: prefill?.patient?.name || '',
    patientGender: prefill?.patient?.gender || '',
    patientAge: prefill?.patient?.age ? String(prefill.patient.age) : '',
    patientIdCard: prefill?.patient?.idCard || '',
    patientPhone: prefill?.patient?.phone || '',
    emergencyContactPhone: '',
    // CHG-40: 基层当前就诊类型，仅作上转参考信息
    sourceVisitType: '',
    // CHG-41: 补录模式下要求在发起页前置录入患者到院时间
    patientArrivedAt: '',
    chiefComplaint: prefill?.chiefComplaint || '',
    diagnosis: prefill?.diagnosis || null,
    reason: prefill?.reason || '',
    medicationSummary: '',
    inpatientAdmissionDate: '',
    inpatientDiagnosis: '',
    currentTreatmentPlanSummary: '',
    conditionChangeNote: '',
    toInstitutionId: prefillInstitutionId,
    toDept: prefill?.toDept || '急诊科',
    remark: '',
  })

  const selectedInstitution = INSTITUTIONS.find(item => item.id === form.toInstitutionId)
  const selectedDeptInfo = selectedInstitution?.departmentInfo?.[form.toDept]
  const selectedDeptFull = selectedDeptInfo && selectedDeptInfo.dailyQuota > 0
    && (selectedDeptInfo.dailyQuota - selectedDeptInfo.todayReserved) <= 0

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const bedOccupied = form.toDept && selectedDeptInfo?.dailyReservedBeds > 0
    ? referrals.filter(item =>
      item.toDept === form.toDept &&
      item.bedStatus === 'bed_reserved' &&
      item.admissionArrangement?.bedReservedAt &&
      new Date(item.admissionArrangement.bedReservedAt) >= todayStart
    ).length
    : 0
  const bedRemaining = (selectedDeptInfo?.dailyReservedBeds ?? 0) - bedOccupied
  const bedFull = selectedDeptInfo?.dailyReservedBeds > 0 && bedRemaining <= 0

  const phoneIsValid = isValidChineseMainlandMobile(form.patientPhone)
  const selectedUrgency = URGENCY_LEVELS.find(item => item.level === urgencyLevel)
  const urgencyFeedback = buildEmergencyUrgencyFeedback(urgencyLevel)
  const greenChannelSelected = urgencyFeedback?.greenChannelAutoEnabled || false
  const isInpatientSource = form.sourceVisitType === 'inpatient'
  const visitTypeLabel = form.sourceVisitType === 'inpatient' ? '住院' : form.sourceVisitType === 'outpatient' ? '门诊' : '—'
  const isRetroEntry = selectedFlow === 'emergency' && emergencyEntryMode === 'retro'

  const normalCanNext = [
    form.sourceVisitType && form.patientName && form.patientGender && form.patientAge && form.patientPhone,
    form.chiefComplaint
      && form.diagnosis
      && form.reason
      && (!isInpatientSource || (
        form.medicationSummary
        && form.inpatientAdmissionDate
        && form.inpatientDiagnosis
        && form.currentTreatmentPlanSummary
      )),
    form.toInstitutionId && form.toDept,
    !!consentFile,
    true,
  ][normalStep]

  const emergencyCanNext = [
    canProceedEmergencyReferral({
      patientName: form.patientName,
      patientPhone: form.patientPhone,
      urgencyLevel,
      consciousnessStatus,
      toInstitutionId: form.toInstitutionId,
    }) && (!isRetroEntry || !!form.patientArrivedAt),
    true,
  ][emergencyStep]

  const handleDiagnosisChange = (diagnosis) => {
    setForm(prev => ({ ...prev, diagnosis }))
    if (!diagnosis) {
      setDeptSuggestion(null)
      return
    }
    const prefix = diagnosis.code.slice(0, 3)
    const suggested = ICD10_DEPT_MAPPING[prefix] || ICD10_DEPT_MAPPING[diagnosis.code]
    setDeptSuggestion(suggested ? { depts: suggested } : null)
    if (greenChannelSelected) {
      const suggestedSpecialty = getLinkedSpecialtySuggestion(diagnosis.code, selectedInstitution)
      if (suggestedSpecialty) setLinkedSpecialty(prev => prev || suggestedSpecialty)
    }
  }

  const toAttachmentRecord = (file) => ({
    name: file.name,
    size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    type: file.type,
    url: URL.createObjectURL(file),
  })

  const appendFiles = (setter, files) => {
    const nextFiles = files.map(toAttachmentRecord)
    setter(prev => [...prev, ...nextFiles])
  }

  const handleAttachmentSelect = (event) => {
    const files = Array.from(event.target.files || [])
    appendFiles(setAttachments, files)
    event.target.value = ''
  }

  const handleNursingAttachmentSelect = (event) => {
    const files = Array.from(event.target.files || [])
    appendFiles(setNursingAttachments, files)
    event.target.value = ''
  }

  const resetSourceVisitFields = () => {
    // CHG-40: 切换基层就诊类型时清空依赖该类型的输入内容
    setForm(prev => ({
      ...prev,
      chiefComplaint: '',
      diagnosis: null,
      reason: '',
      medicationSummary: '',
      inpatientAdmissionDate: '',
      inpatientDiagnosis: '',
      currentTreatmentPlanSummary: '',
      conditionChangeNote: '',
    }))
    setAttachments([])
    setNursingAttachments([])
    setDeptSuggestion(null)
  }

  const shouldConfirmSourceVisitTypeSwitch = () => {
    return !!(
      form.chiefComplaint
      || form.diagnosis
      || form.reason
      || form.medicationSummary
      || form.inpatientAdmissionDate
      || form.inpatientDiagnosis
      || form.currentTreatmentPlanSummary
      || form.conditionChangeNote
      || attachments.length > 0
      || nursingAttachments.length > 0
    )
  }

  const handleSourceVisitTypeChange = (nextValue) => {
    if (form.sourceVisitType === nextValue) return
    if (shouldConfirmSourceVisitTypeSwitch() && !window.confirm('切换类型将清空已填内容，确认切换？')) {
      return
    }
    resetSourceVisitFields()
    setForm(prev => ({ ...prev, sourceVisitType: nextValue }))
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
    setConsentMethod('offline_upload')
    setConsentError('')
  }

  const clearConsentFile = () => {
    if (consentFile?.fileUrl) {
      URL.revokeObjectURL(consentFile.fileUrl)
    }
    setConsentFile(null)
    setConsentError('')
  }

  const handleSelectFlow = (flow) => {
    setSelectedFlow(flow)
    // CHG-39: 切换流程时重置知情同意演示状态
    setConsentMethod(flow === 'emergency' ? 'pending_upload' : 'offline_upload')
    setConsentError('')
    clearConsentFile()
    setConsentSignedBy('patient')
    // CHG-41: 切换到急诊流程时默认进入实时转诊模式
    setEmergencyEntryMode('realtime')
    // CHG-40: 切换流程时重置基层当前就诊类型及相关动态字段
    resetSourceVisitFields()
    setForm(prev => ({ ...prev, sourceVisitType: '', patientArrivedAt: '' }))
    if (flow === 'normal') {
      setNormalStep(0)
      setUrgencyLevel(null)
      setLinkedSpecialty(null)
      setConsciousnessStatus('')
      return
    }

    setEmergencyStep(0)
    setUrgencyLevel(null)
    setLinkedSpecialty(null)
    setConsciousnessStatus('')
    const defaultHospital = emergencyHospitalConfig.selectedHospital
    setForm(prev => ({
      ...prev,
      toInstitutionId: prev.toInstitutionId || defaultHospital?.id || '',
      toDept: '急诊科',
    }))
  }

  const handlePatientLink = (mode) => {
    setPatientLinkMode(mode)
    if (mode === 'manual') {
      setLinkedPatient(null)
    }
  }

  const buildPatientPayload = () => ({
    id: form.patientId || `p${Date.now()}`,
    name: form.patientName,
    gender: form.patientGender || '未知',
    age: form.patientAge ? parseInt(form.patientAge, 10) : null,
    idCard: form.patientIdCard || '510623***0000',
    phone: form.patientPhone,
  })

  const handleNormalSubmit = () => {
    const institution = INSTITUTIONS.find(item => item.id === form.toInstitutionId)
    const referralPayload = {
      type: 'upward',
      patient: buildPatientPayload(),
      diagnosis: form.diagnosis,
      chiefComplaint: form.chiefComplaint,
      reason: form.reason,
      // CHG-40: 上转写入基层当前就诊类型与对应补充字段
      sourceVisitType: form.sourceVisitType,
      medicationSummary: form.medicationSummary,
      inpatientAdmissionDate: form.inpatientAdmissionDate || null,
      inpatientDiagnosis: form.inpatientDiagnosis || '',
      currentTreatmentPlanSummary: form.currentTreatmentPlanSummary || '',
      conditionChangeNote: form.conditionChangeNote || '',
      fromInstitution: currentUser.institution,
      fromDoctor: currentUser.name,
      toInstitution: institution?.name,
      toDept: form.toDept,
      referral_type: 'normal',
      urgencyLevel: null,
      consciousnessStatus: null,
      is_emergency: false,
      ...(selectedDeptFull ? { internalNote: '提交时号源已满，需人工协调' } : {}),
      admissionTypePref,
      attachments: attachments.map(file => ({ name: file.name, size: file.size })),
      nursingAttachments: nursingAttachments.map(file => ({ name: file.name, size: file.size })),
      consentMethod: 'offline_upload',
      consentSigned: true,
      consentFileUrl: consentFile?.fileUrl || null,
      consentUploadedAt: consentFile?.uploadedAt || new Date().toISOString(),
      consentSignedBy,
      consentDeferred: false,
      logs: consentFile
        ? [{ time: new Date().toISOString(), actor: currentUser.name, action: '上传已签署知情同意书', note: `${consentSignedBy === 'family' ? '家属代签' : '患者本人'} · ${consentFile.name} · 基层就诊类型：${visitTypeLabel}` }]
        : [],
    }

    const newId = submitForInternalReview(referralPayload)
    navigate(`/referral/${newId}`)
  }

  const handleEmergencySubmit = () => {
    // CHG-39: 急诊若选择已上传，则必须先有附件
    if (consentMethod === 'offline_upload' && !consentFile) {
      setConsentError('请先上传已签署的知情同意书')
      return
    }

    const institution = INSTITUTIONS.find(item => item.id === form.toInstitutionId)
    const finalType = greenChannelSelected ? 'green_channel' : 'emergency'
    const fallbackDiagnosis = form.diagnosis || { code: '—', name: '未填写ICD-10诊断' }
    const newId = submitReferral({
      type: 'upward',
      patient: buildPatientPayload(),
      diagnosis: fallbackDiagnosis,
      chiefComplaint: form.chiefComplaint,
      reason: form.reason,
      // CHG-40: 急诊场景也保留基层当前就诊类型，但为选填
      sourceVisitType: form.sourceVisitType || null,
      medicationSummary: form.medicationSummary || '',
      inpatientAdmissionDate: form.inpatientAdmissionDate || null,
      inpatientDiagnosis: form.inpatientDiagnosis || '',
      currentTreatmentPlanSummary: form.currentTreatmentPlanSummary || '',
      conditionChangeNote: form.conditionChangeNote || '',
      fromInstitution: currentUser.institution,
      fromDoctor: currentUser.name,
      toInstitution: institution?.name,
      toDept: '急诊科',
      linkedSpecialty: linkedSpecialty || null,
      referral_type: finalType,
      urgencyLevel,
      consciousnessStatus: consciousnessStatus || null,
      is_emergency: true,
      // CHG-41: 急诊补录模式字段
      isRetroEntry,
      patientArrivedAt: isRetroEntry ? form.patientArrivedAt : null,
      admissionTypePref: 'outpatient',
      attachments: attachments.map(file => ({ name: file.name, size: file.size })),
      nursingAttachments: nursingAttachments.map(file => ({ name: file.name, size: file.size })),
      consentMethod,
      consentSigned: consentMethod === 'offline_upload',
      consentFileUrl: consentMethod === 'offline_upload' ? (consentFile?.fileUrl || null) : null,
      consentUploadedAt: consentMethod === 'offline_upload' ? (consentFile?.uploadedAt || new Date().toISOString()) : null,
      consentSignedBy,
      consentDeferred: consentMethod === 'pending_upload',
      logs: [
        { time: new Date().toISOString(), actor: currentUser.name, action: consentMethod === 'pending_upload' ? '急诊知情同意后置，待患者到院后补传签署附件' : '急诊知情同意已线下签署并上传附件', note: `${consentMethod === 'offline_upload' && consentFile ? `${consentSignedBy === 'family' ? '家属代签' : '患者本人'} · ${consentFile.name} · ` : ''}基层就诊类型：${visitTypeLabel}` },
        ...(isRetroEntry ? [{
          time: new Date().toISOString(),
          actor: currentUser.name,
          action: 'CHG-41：以补录模式提交急诊转诊',
          note: `isRetroEntry=true；患者到院时间=${form.patientArrivedAt || '—'}`,
        }] : []),
        ...(finalType === 'green_channel'
          ? [{ time: new Date().toISOString(), actor: currentUser.name, action: `${isRetroEntry ? '补录绿色通道' : '启用绿色通道'}（${selectedUrgency?.label || '未标记分级'}）`, note: linkedSpecialty ? `${isRetroEntry ? '记录联动专科' : '联动专科'}：${linkedSpecialty}` : '' }]
          : [{ time: new Date().toISOString(), actor: currentUser.name, action: `${isRetroEntry ? '补录急诊转诊' : '发起急诊转诊'}（${selectedUrgency?.label || '未标记分级'}）`, note: linkedSpecialty ? `${isRetroEntry ? '记录联动专科' : '已通知联动专科'}：${linkedSpecialty}` : '' }]),
      ],
    })

    navigate(`/referral/${newId}`, {
      state: {
        submitSuccess: {
          referralId: newId,
          mode: 'emergency',
          title: isRetroEntry ? '急诊补录已提交' : '急诊转诊已提交',
          isRetroEntry,
        },
      },
    })
  }

  const renderEntrySelector = () => (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">请选择转诊类型</h2>
        <p className="text-sm text-gray-500 mb-6">普通转诊保持现有流程，急诊转诊将走前置分流后的专属快速通道。</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleSelectFlow('normal')}
            className="rounded-2xl border p-5 text-left transition-all"
            style={{ borderColor: '#dbeafe', background: '#fff' }}
          >
            <div className="text-3xl mb-4">📋</div>
            <div className="text-lg font-semibold text-gray-800">普通转诊</div>
            <div className="text-sm text-gray-500 mt-2">常规流程</div>
            <div className="text-sm text-gray-500">经院内审核后推送县级医生</div>
          </button>
          <button
            type="button"
            onClick={() => handleSelectFlow('emergency')}
            className="rounded-2xl border p-5 text-left transition-all"
            style={{ borderColor: '#fecaca', background: '#fff' }}
          >
            <div className="text-3xl mb-4">🚨</div>
            <div className="text-lg font-semibold text-gray-800">急诊转诊</div>
            <div className="text-sm text-gray-500 mt-2">立即通知三方</div>
            <div className="text-sm text-gray-500">豁免院内审核，知情同意后置</div>
          </button>
        </div>
      </div>
    </div>
  )

  const renderAttachmentUploader = ({
    title = '病历附件',
    hint = '（选填，支持 PDF / JPG / PNG，单文件 ≤ 10MB）',
    files = attachments,
    onChange = handleAttachmentSelect,
    onRemove = (index) => setAttachments(prev => prev.filter((_, currentIndex) => currentIndex !== index)),
  } = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {title}
        <span className="text-xs text-gray-400 font-normal ml-2">{hint}</span>
      </label>
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-[#0BBECF] transition-colors">
        {files.length === 0 ? (
          <label className="flex flex-col items-center gap-2 cursor-pointer">
            <span className="text-2xl">📎</span>
            <span className="text-sm text-gray-500">点击选择或拖拽文件到此处</span>
            <span className="text-xs text-gray-400">PDF、JPG、PNG，单文件 ≤ 10MB</span>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={onChange}
            />
          </label>
        ) : (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>{file.type?.includes('pdf') ? '📄' : '🖼️'}</span>
                  <span className="text-gray-800 truncate max-w-[220px]">{file.name}</span>
                  <span className="text-gray-400 text-xs">{file.size}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
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
                onChange={onChange}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  )

  const renderSourceVisitTypeSelector = ({ required }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        患者当前就诊类型 {required && <span className="text-red-500">*</span>}
      </label>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: 'outpatient', label: '门诊患者', desc: '重点填写主诉、诊断、转诊原因和检查资料' },
          { value: 'inpatient', label: '住院患者', desc: '需补充入院日期、住院诊断、治疗方案等住院信息' },
        ].map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSourceVisitTypeChange(option.value)}
            className="rounded-xl border px-4 py-4 text-left transition-colors"
            style={form.sourceVisitType === option.value
              ? { borderColor: '#0BBECF', background: '#F0FBFC' }
              : { borderColor: '#E5E7EB', background: '#fff' }}
          >
            <div className="text-sm font-semibold text-gray-900">{option.label}</div>
            <div className="text-xs text-gray-500 mt-1 leading-5">{option.desc}</div>
          </button>
        ))}
      </div>
      {!form.sourceVisitType && (
        <div className="mt-2 text-xs text-amber-600">未选择时其余表单字段不展示。</div>
      )}
    </div>
  )

  const renderNormalFlow = () => (
    <>
      <StepProgress steps={NORMAL_STEPS} currentStep={normalStep} />
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        {normalStep === 0 && (
          <div className="p-6">
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
              <span>💡 优先通过门诊记录或居民档案关联患者信息，减少重复录入。</span>
            </div>
            <div className="mb-6 p-4 rounded-xl border" style={{ background: '#FAFCFE', borderColor: '#DDF0F3' }}>
              <div className="text-sm font-medium text-gray-700 mb-3">患者关联</div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handlePatientLink('clinic')}
                  className="rounded-xl border px-4 py-3 text-left transition-colors"
                  style={{ borderColor: '#0BBECF', background: '#F0FBFC' }}
                >
                  <div className="text-sm font-semibold text-gray-800">📋 关联门诊记录</div>
                  <div className="text-xs text-gray-500 mt-1">从今日门诊就诊记录中选择患者</div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePatientLink('archive')}
                  className="rounded-xl border px-4 py-3 text-left transition-colors"
                  style={{ borderColor: '#E5E7EB', background: '#fff' }}
                >
                  <div className="text-sm font-semibold text-gray-800">📁 关联居民档案</div>
                  <div className="text-xs text-gray-500 mt-1">从公共卫生档案中匹配患者</div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePatientLink('manual')}
                  className="rounded-xl border px-4 py-3 text-left transition-colors"
                  style={{ borderColor: '#E5E7EB', background: '#fff' }}
                >
                  <div className="text-sm font-semibold text-gray-800">✏️ 手工新增患者</div>
                  <div className="text-xs text-gray-500 mt-1">未检索到患者时，手动补录</div>
                </button>
              </div>
            </div>
            {patientLinkMode === 'manual' && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <span>未检索到患者时，可手工补录基础信息。</span>
              </div>
            )}
            <h2 className="text-base font-semibold text-gray-800 mb-4">患者基本信息</h2>
            <div className="space-y-5">
              {/* CHG-40: 上转表单顶部新增基层当前就诊类型，未选时其余字段不渲染 */}
              {renderSourceVisitTypeSelector({ required: true })}

              {form.sourceVisitType && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      姓名 {patientLinkMode !== 'manual' && <span className="text-gray-400 font-normal">(已关联)</span>}
                    </label>
                    <input
                      type="text"
                      value={form.patientName}
                      onChange={event => setForm(prev => ({ ...prev, patientName: event.target.value }))}
                      placeholder="患者姓名"
                      readOnly={!!linkedPatient}
                      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      性别 {patientLinkMode !== 'manual' && <span className="text-gray-400 font-normal">(已关联)</span>}
                    </label>
                    <div className="flex gap-3">
                      {['男', '女'].map(gender => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, patientGender: gender }))}
                          disabled={!!linkedPatient}
                          className="flex-1 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50"
                          style={form.patientGender === gender
                            ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                            : { background: '#fff', color: '#4b5563', borderColor: '#d1d5db' }}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      年龄
                    </label>
                    <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
                      {form.patientAge ? `${form.patientAge}岁` : '—'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">根据关联信息自动带出</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      联系电话 {patientLinkMode !== 'manual' && <span className="text-gray-400 font-normal">(已关联)</span>}
                    </label>
                    <input
                      type="text"
                      value={form.patientPhone}
                      onChange={event => setForm(prev => ({ ...prev, patientPhone: event.target.value }))}
                      placeholder="13800138000"
                      readOnly={!!linkedPatient}
                      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      身份证号
                      <span className="text-gray-400 text-xs ml-1">（后4位显示，系统自动脱敏）</span>
                    </label>
                    <input
                      type="text"
                      value={form.patientIdCard}
                      onChange={event => setForm(prev => ({ ...prev, patientIdCard: event.target.value }))}
                      placeholder="510623***1234"
                      readOnly={!!linkedPatient}
                      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`}
                    />
                  </div>
                  {linkedPatient?.clinicId && (
                    <div className="col-span-2 mt-2 p-3 rounded-lg" style={{ background: '#F0FBFC', border: '1px solid #DDF0F3' }}>
                      <div className="text-xs font-medium" style={{ color: '#0892a0' }}>当前门诊信息</div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>
                          <span className="text-gray-400">门诊号：</span>
                          <span className="font-medium text-gray-800">{linkedPatient.clinicId}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">科室：</span>
                          <span className="font-medium text-gray-800">{linkedPatient.dept}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">医生：</span>
                          <span className="font-medium text-gray-800">{linkedPatient.doctor}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">就诊时间：</span>
                          <span className="font-medium text-gray-800">{linkedPatient.visitTime}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {normalStep === 1 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">诊断及转诊原因</h2>
            <div className="space-y-4">
              {/* CHG-40: 根据基层当前就诊类型动态渲染字段组 */}
              <div className="rounded-lg border px-4 py-3 text-sm" style={{ background: '#F8FDFE', borderColor: '#DDF0F3' }}>
                <span className="text-gray-500">患者当前就诊类型：</span>
                <span className="font-semibold text-gray-800 ml-1">{visitTypeLabel}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">主诉与现病史 <span className="text-red-500">*</span></label>
                <textarea
                  value={form.chiefComplaint}
                  onChange={event => setForm(prev => ({ ...prev, chiefComplaint: event.target.value }))}
                  rows={3}
                  placeholder="描述患者主要症状、发病时间、病情演变等"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">初步诊断（ICD-10） <span className="text-red-500">*</span></label>
                <ICD10Search value={form.diagnosis} onChange={handleDiagnosisChange} required />
                {form.diagnosis && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                    <span>✓</span>
                    <span>已选：<strong>{form.diagnosis.code}</strong> {form.diagnosis.name}</span>
                  </div>
                )}
                {deptSuggestion && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <span style={{ color: '#2563EB' }}>💡 推荐科室：</span>
                    {deptSuggestion.depts.map(dept => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({ ...prev, toDept: dept }))
                          setDeptSuggestion(null)
                        }}
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: '#DBEAFE', color: '#1D4ED8' }}
                      >
                        {dept}
                      </button>
                    ))}
                    <button type="button" onClick={() => setDeptSuggestion(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">忽略</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">转诊原因 <span className="text-red-500">*</span></label>
                <textarea
                  value={form.reason}
                  onChange={event => setForm(prev => ({ ...prev, reason: event.target.value }))}
                  rows={2}
                  placeholder="说明转诊必要性"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  用药情况 {isInpatientSource && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={form.medicationSummary}
                  onChange={event => setForm(prev => ({ ...prev, medicationSummary: event.target.value }))}
                  rows={2}
                  placeholder={isInpatientSource ? '请填写当前住院用药情况' : '如门诊已有用药可填写'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                />
              </div>
              {renderAttachmentUploader({
                title: '已做检查/检验报告',
                hint: '（可上传附件，支持 PDF / JPG / PNG，单文件 ≤ 10MB）',
                files: attachments,
                onChange: handleAttachmentSelect,
                onRemove: (index) => setAttachments(prev => prev.filter((_, currentIndex) => currentIndex !== index)),
              })}

              {isInpatientSource && (
                <div className="grid grid-cols-2 gap-4 rounded-xl border p-4" style={{ background: '#FCFCFD', borderColor: '#E5E7EB' }}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">入院日期 <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={form.inpatientAdmissionDate}
                      onChange={event => setForm(prev => ({ ...prev, inpatientAdmissionDate: event.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">住院诊断 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.inpatientDiagnosis}
                      onChange={event => setForm(prev => ({ ...prev, inpatientDiagnosis: event.target.value }))}
                      placeholder="请输入住院诊断"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">当前治疗方案摘要 <span className="text-red-500">*</span></label>
                    <textarea
                      value={form.currentTreatmentPlanSummary}
                      onChange={event => setForm(prev => ({ ...prev, currentTreatmentPlanSummary: event.target.value }))}
                      rows={3}
                      placeholder="请输入当前治疗方案摘要"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">病情变化说明</label>
                    <textarea
                      value={form.conditionChangeNote}
                      onChange={event => setForm(prev => ({ ...prev, conditionChangeNote: event.target.value }))}
                      rows={2}
                      placeholder="如有近期病情变化可补充说明"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                    />
                  </div>
                  <div className="col-span-2">
                    {renderAttachmentUploader({
                      title: '护理记录',
                      hint: '（可上传附件，支持 PDF / JPG / PNG，单文件 ≤ 10MB）',
                      files: nursingAttachments,
                      onChange: handleNursingAttachmentSelect,
                      onRemove: (index) => setNursingAttachments(prev => prev.filter((_, currentIndex) => currentIndex !== index)),
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {normalStep === 2 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">选择接收机构及科室</h2>
            <div className="space-y-3">
              {INSTITUTIONS.filter(item => item.type === 'county').map(inst => (
                <div
                  key={inst.id}
                  onClick={() => setForm(prev => ({ ...prev, toInstitutionId: inst.id, toDept: '' }))}
                  className="border rounded-xl p-4 cursor-pointer transition-all"
                  style={form.toInstitutionId === inst.id
                    ? { borderColor: '#0BBECF', background: '#F0FBFC', boxShadow: '0 0 0 2px #a4edf5' }
                    : { borderColor: '#e5e7eb', background: '#fff' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-gray-800">{inst.name}</div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full">{inst.status}</span>
                  </div>
                  <div className="text-xs text-gray-500">医共体成员机构 · 县级医院</div>
                </div>
              ))}
            </div>

            {selectedInstitution && (
              <div className="mt-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">期望接收科室 <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedInstitution.departments.map(dept => {
                    const deptInfo = selectedInstitution.departmentInfo?.[dept]
                    const remaining = deptInfo ? deptInfo.dailyQuota - deptInfo.todayReserved : null
                    const isFull = deptInfo && deptInfo.dailyQuota > 0 && remaining <= 0
                    const isSelected = form.toDept === dept
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, toDept: dept }))}
                        className="rounded-lg border transition-all text-left"
                        style={isSelected
                          ? { borderColor: '#0BBECF', background: '#F0FBFC', boxShadow: '0 0 0 2px #a4edf5' }
                          : { borderColor: '#e5e7eb', background: '#fff' }}
                      >
                        <div className="px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={isSelected ? { color: '#0892a0' } : { color: '#374151' }}>{dept}</span>
                            {deptInfo && deptInfo.dailyQuota > 0 && (
                              isFull
                                ? <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#fff7ed', color: '#ea580c' }}>今日已满（0/{deptInfo.dailyQuota}）</span>
                                : <span className="text-xs" style={{ color: '#6b7280' }}>剩余 {remaining}/{deptInfo.dailyQuota} 名额</span>
                            )}
                            {deptInfo && deptInfo.dailyQuota === 0 && (
                              <span className="text-xs text-gray-400">未配置转诊专用号源</span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-400">以上为转诊专用保留名额，不代表全院实际资源情况</div>
                {selectedDeptFull && (
                  <div className="mt-3 flex items-start gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    <span className="flex-shrink-0 mt-0.5">⚠️</span>
                    <div>
                      <div className="font-medium">该科室今日转诊名额已满（0/{selectedDeptInfo.dailyQuota}）</div>
                      <div className="text-xs mt-0.5 text-amber-700">仍可提交申请，接诊医生将人工协调就诊安排</div>
                    </div>
                  </div>
                )}
                {form.toDept && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-sm font-medium text-gray-700 mb-2">承接方式偏好（供转诊中心参考）</div>
                    <div className="flex gap-2">
                      {[
                        { value: 'outpatient', label: '门诊就诊' },
                        { value: 'inpatient', label: '住院收治' },
                      ].map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAdmissionTypePref(option.value)}
                          className="flex-1 py-2 rounded-lg border text-sm transition-colors"
                          style={admissionTypePref === option.value
                            ? { borderColor: '#0BBECF', background: '#f0fbfc', color: '#0892a0', fontWeight: '500' }
                            : { borderColor: '#e5e7eb', color: '#6b7280' }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {admissionTypePref === 'inpatient' && (
                      <div className="mt-3 rounded-lg border p-3" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                        <div className="text-sm font-semibold text-blue-800 mb-1">🏥 转诊专用床位</div>
                        {selectedDeptInfo?.dailyReservedBeds > 0 ? (
                          <>
                            <div className="text-sm">
                              今日剩余 <span className={`font-bold ${bedFull ? 'text-orange-500' : 'text-green-600'}`}>{bedRemaining}</span> / {selectedDeptInfo.dailyReservedBeds} 床
                            </div>
                            {bedFull && (
                              <div className="mt-1.5 text-xs font-medium" style={{ color: '#C2410C' }}>
                                ⚠️ 今日转诊床位已满，仍可提交，转诊中心将人工协调
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-gray-400">该科室未配置转诊专用床位</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1.5">以上为转诊预留床位，不代表全院实际床位情况</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {normalStep === 3 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-2">患者知情同意</h2>
            <p className="text-sm text-gray-500 mb-5">根据 CHG-39，普通上转需改为线下签署并上传附件后才能提交。</p>
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                <span>ℹ️</span>
                <span>请先下载模板、完成线下签字，再上传已签署文件。</span>
              </div>
              <ConsentOfflinePanel
                signedBy={consentSignedBy}
                onSignedByChange={setConsentSignedBy}
                file={consentFile}
                onSelectFile={handleConsentFileSelect}
                onRemoveFile={clearConsentFile}
                error={consentError}
              />
              {!consentFile && (
                <div className="rounded-lg px-4 py-3 bg-blue-50 border border-blue-200 text-sm text-blue-800">
                  请先上传已签署的知情同意书，再进入下一步。
                </div>
              )}
            </div>
          </div>
        )}

        {normalStep === 4 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">确认提交信息</h2>
            <div className="space-y-3">
              <div className="rounded-xl divide-y divide-gray-100 overflow-hidden" style={{ background: '#f9fafb' }}>
                <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                  <span className="text-xs font-semibold uppercase" style={{ color: '#0892a0' }}>患者信息</span>
                </div>
                <div className="grid grid-cols-3 gap-0">
                  {[
                    ['姓名', form.patientName],
                    ['性别', form.patientGender],
                    ['年龄', `${linkedPatient?.age || form.patientAge}岁`],
                    ['联系电话', form.patientPhone],
                    ['身份证号', form.patientIdCard || '—'],
                    ['当前就诊类型', visitTypeLabel],
                  ].map(([key, value]) => (
                    <div key={key} className="px-4 py-2.5">
                      <div className="text-xs text-gray-400">{key}</div>
                      <div className="text-sm text-gray-800 font-medium mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl divide-y divide-gray-100 overflow-hidden" style={{ background: '#f9fafb' }}>
                <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                  <span className="text-xs font-semibold uppercase" style={{ color: '#0892a0' }}>诊断及原因</span>
                </div>
                <div className="px-4 py-2.5">
                  <div className="text-xs text-gray-400">初步诊断</div>
                  <div className="text-sm font-medium text-gray-800 mt-0.5">{form.diagnosis?.code} {form.diagnosis?.name}</div>
                </div>
                <div className="px-4 py-2.5">
                  <div className="text-xs text-gray-400">主诉</div>
                  <div className="text-sm text-gray-800 mt-0.5 line-clamp-2">{form.chiefComplaint}</div>
                </div>
                <div className="px-4 py-2.5">
                  <div className="text-xs text-gray-400">转诊原因</div>
                  <div className="text-sm text-gray-800 mt-0.5">{form.reason}</div>
                </div>
                <div className="px-4 py-2.5">
                  <div className="text-xs text-gray-400">用药情况</div>
                  <div className="text-sm text-gray-800 mt-0.5">{form.medicationSummary || '—'}</div>
                </div>
                {isInpatientSource && (
                  <>
                    <div className="px-4 py-2.5">
                      <div className="text-xs text-gray-400">入院日期</div>
                      <div className="text-sm text-gray-800 mt-0.5">{form.inpatientAdmissionDate || '—'}</div>
                    </div>
                    <div className="px-4 py-2.5">
                      <div className="text-xs text-gray-400">住院诊断</div>
                      <div className="text-sm text-gray-800 mt-0.5">{form.inpatientDiagnosis || '—'}</div>
                    </div>
                    <div className="px-4 py-2.5">
                      <div className="text-xs text-gray-400">当前治疗方案摘要</div>
                      <div className="text-sm text-gray-800 mt-0.5">{form.currentTreatmentPlanSummary || '—'}</div>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-xl divide-y divide-gray-100 overflow-hidden" style={{ background: '#f9fafb' }}>
                <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                  <span className="text-xs font-semibold uppercase" style={{ color: '#0892a0' }}>接收机构</span>
                </div>
                <div className="grid grid-cols-2 gap-0">
                  <div className="px-4 py-2.5">
                    <div className="text-xs text-gray-400">机构</div>
                    <div className="text-sm font-medium text-gray-800 mt-0.5">{selectedInstitution?.name}</div>
                  </div>
                  <div className="px-4 py-2.5">
                    <div className="text-xs text-gray-400">科室</div>
                    <div className="text-sm font-medium text-gray-800 mt-0.5">{form.toDept}</div>
                  </div>
                  <div className="px-4 py-2.5">
                    <div className="text-xs text-gray-400">承接方式偏好</div>
                    <div className="text-sm font-medium text-gray-800 mt-0.5">
                      {admissionTypePref === 'inpatient' ? '住院收治' : '门诊就诊'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
                <span>📋</span>
                <span className="font-medium">普通转诊</span>
                <span className="text-blue-700">— 提交后进入院内审核流程</span>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-4 flex items-center justify-between rounded-b-xl" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <button
            onClick={() => normalStep > 0 ? setNormalStep(prev => prev - 1) : setSelectedFlow(null)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-white transition-colors"
          >
            {normalStep === 0 ? '← 返回选类型' : '← 上一步'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/primary/dashboard')}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
            >
              {normalStep === 0 ? '取消并返回工作台' : '💾 保存草稿并返回工作台'}
            </button>
            {normalStep < NORMAL_STEPS.length - 1 ? (
              <button
                disabled={!normalCanNext}
                onClick={() => setNormalStep(prev => prev + 1)}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                style={normalCanNext
                  ? { background: '#0BBECF', color: '#fff' }
                  : { background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }}
              >
                下一步 →
              </button>
            ) : (
              <button
                onClick={handleNormalSubmit}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                ✓ 提交转出申请
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )

  const renderEmergencyFlow = () => (
    <>
      <StepProgress steps={EMERGENCY_STEPS} currentStep={emergencyStep} accentColor="#ef4444" />
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #FAD1D1' }}>
        {emergencyStep === 0 && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-2">急诊转诊/绿色通道发起</h2>
              <p className="text-sm text-gray-500">面向急诊协同场景，固定由目标医院急诊科先行接诊；若为历史补录，可切换到补录录入模式。</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">录入方式</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {EMERGENCY_ENTRY_MODES.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEmergencyEntryMode(option.value)}
                    className="rounded-xl border px-4 py-4 text-left transition-colors"
                    style={emergencyEntryMode === option.value
                      ? { borderColor: option.value === 'retro' ? '#6B7280' : '#ef4444', background: option.value === 'retro' ? '#F9FAFB' : '#FEF2F2' }
                      : { borderColor: '#E5E7EB', background: '#fff' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-gray-900">{option.label}</div>
                      {option.value === 'realtime' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
                          默认
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2 leading-5">{option.description}</div>
                  </button>
                ))}
              </div>
              {isRetroEntry && (
                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  CHG-41：补录模式仅记录转诊事实，不触发急诊科/专科实时通知，不发送患者短信，也不会开启15分钟紧急修改窗口。
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">基本信息</h3>
              <div className="space-y-4">
                {/* CHG-40: 急诊上转仍展示基层当前就诊类型，但为选填 */}
                {renderSourceVisitTypeSelector({ required: false })}
                {isRetroEntry && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">患者到院时间 <span className="text-red-500">*</span></label>
                    <input
                      type="datetime-local"
                      value={form.patientArrivedAt}
                      onChange={event => setForm(prev => ({ ...prev, patientArrivedAt: event.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    />
                    <div className="text-xs text-gray-500 mt-1">补录模式下，此时间同时作为知情同意后补传时限的起算基准。</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">患者姓名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.patientName}
                    onChange={event => setForm(prev => ({ ...prev, patientName: event.target.value }))}
                    placeholder="患者姓名"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">联系电话 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.patientPhone}
                    onChange={event => setForm(prev => ({ ...prev, patientPhone: event.target.value }))}
                    placeholder="13800138000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                  <div className="text-xs mt-1" style={{ color: phoneIsValid || !form.patientPhone ? '#9ca3af' : '#ef4444' }}>
                    {phoneIsValid || !form.patientPhone
                      ? '提交后系统将优先向该号码发送就诊提醒短信'
                      : '请输入有效的11位手机号'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">紧急联系方式</label>
                  <input
                    type="text"
                    value={form.emergencyContactPhone}
                    onChange={event => setForm(prev => ({ ...prev, emergencyContactPhone: event.target.value }))}
                    placeholder="用于补充联系"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                  <div className="text-xs text-gray-400 mt-1">用于患者电话无法接通时的补充联系与到院沟通</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">性别</label>
                  <div className="flex gap-2">
                    {['男', '女'].map(gender => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, patientGender: gender }))}
                        className="flex-1 py-2 rounded-lg text-sm border transition-colors"
                        style={form.patientGender === gender
                          ? { background: '#FEF2F2', color: '#B91C1C', borderColor: '#FCA5A5' }
                          : { background: '#fff', color: '#4b5563', borderColor: '#d1d5db' }}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">年龄</label>
                  <input
                    type="number"
                    value={form.patientAge}
                    onChange={event => setForm(prev => ({ ...prev, patientAge: event.target.value }))}
                    placeholder="选填"
                    min={0}
                    max={150}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">患者意识状态 <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    {[
                      { value: 'conscious', label: '意识清醒' },
                      { value: 'unclear', label: '意识不清' },
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setConsciousnessStatus(option.value)}
                        className="flex-1 py-2 rounded-lg text-sm border transition-colors"
                        style={consciousnessStatus === option.value
                          ? { borderColor: '#ef4444', background: '#fef2f2', color: '#b91c1c' }
                          : { borderColor: '#d1d5db', color: '#4b5563' }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">该信息将影响患者到院后知情同意补签时间的计算规则</div>
                </div>
              </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">急诊信息</h3>
              <label className="block text-sm font-medium text-gray-700 mb-2">急诊紧急程度 <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-4 gap-3">
                {URGENCY_LEVELS.map(level => (
                  <button
                    key={level.level}
                    type="button"
                    onClick={() => {
                      setUrgencyLevel(level.level)
                      if (level.level === 1) {
                        const suggestedSpecialty = getLinkedSpecialtySuggestion(form.diagnosis?.code, selectedInstitution)
                        if (suggestedSpecialty) {
                          setLinkedSpecialty(prev => prev || suggestedSpecialty)
                        }
                      }
                    }}
                    className="rounded-xl border px-3 py-4 text-left transition-colors"
                    style={urgencyLevel === level.level
                      ? { borderColor: level.color, background: level.bg, boxShadow: `0 0 0 2px ${level.color}22` }
                      : { borderColor: '#e5e7eb', background: '#fff' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-bold" style={{ color: level.color }}>{level.shortLabel}</div>
                      {level.level === 1 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[11px] font-medium" style={{ background: '#dcfce7', color: '#166534' }}>
                          自动启用绿通
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {urgencyFeedback && (
                <div
                  className="mt-3 rounded-xl border px-4 py-3"
                  style={
                    urgencyFeedback.tone === 'critical'
                      ? { background: '#DCFCE7', borderColor: '#86EFAC' }
                      : urgencyFeedback.tone === 'urgent'
                        ? { background: '#FEF3C7', borderColor: '#FCD34D' }
                        : { background: '#F3F4F6', borderColor: '#E5E7EB' }
                  }
                >
                  <div
                    className="text-sm font-medium"
                    style={
                      urgencyFeedback.tone === 'critical'
                        ? { color: '#14532d' }
                        : urgencyFeedback.tone === 'urgent'
                          ? { color: '#92400e' }
                          : { color: '#374151' }
                    }
                  >
                    {urgencyFeedback.message}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">主诉/急转原因</label>
                <textarea
                  value={form.chiefComplaint}
                  onChange={event => setForm(prev => ({ ...prev, chiefComplaint: event.target.value }))}
                  rows={3}
                  placeholder="请简要填写本次急诊转诊原因，如突发胸痛、意识障碍、外伤出血等"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">接收准备</h3>
              <label className="block text-sm font-medium text-gray-700 mb-2">目标接收医院 <span className="text-red-500">*</span></label>
              {emergencyHospitalConfig.mode === 'single' ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  {emergencyHospitalConfig.selectedHospital?.name}（医共体县级医院）
                </div>
              ) : (
                <div className="space-y-2 mb-3">
                  {emergencyHospitalConfig.hospitals.map(hospital => (
                    <button
                      key={hospital.id}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, toInstitutionId: hospital.id, toDept: '急诊科' }))}
                      className="w-full rounded-lg border px-4 py-3 text-left transition-colors"
                      style={form.toInstitutionId === hospital.id
                        ? { borderColor: '#ef4444', background: '#fef2f2' }
                        : { borderColor: '#e5e7eb', background: '#fff' }}
                    >
                      <div className="font-medium text-gray-800">{hospital.name}</div>
                      <div className="text-xs text-gray-400 mt-1">县级医院 · 急诊不受名额限制</div>
                    </button>
                  ))}
                </div>
              )}

              {selectedInstitution && (
                <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900">
                  已选：{selectedInstitution.name} · 急诊科
                </div>
              )}

              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-sm font-medium text-gray-800">接诊入口：急诊科</div>
                <div className="text-xs text-gray-500 mt-1">急诊转诊由目标医院急诊科先行接诊</div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">联动专科通知 <span className="text-gray-400 text-xs font-normal">（选填）</span></label>
                <select
                  value={linkedSpecialty || ''}
                  onChange={event => setLinkedSpecialty(event.target.value || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                >
                  <option value="">请选择需要提前通知的专科...</option>
                  {(selectedInstitution?.departments || [])
                    .filter(dept => dept !== '急诊科')
                    .map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>
                <div className="text-xs text-gray-500 mt-2">用于提前通知相关专科做接诊准备，不作为最终接收科室</div>
                {greenChannelSelected && (
                  <div className="text-xs text-green-700 mt-2">绿色通道场景下，可提前联动相关专科</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowEmergencySupplementary(prev => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 text-sm font-medium text-gray-700"
              >
                <span>{showEmergencySupplementary ? '－' : '＋'} 接诊准备信息（选填）</span>
                <span className="text-xs text-gray-400">{showEmergencySupplementary ? '收起' : '展开'}</span>
              </button>
              {showEmergencySupplementary && (
                <div className="p-4 space-y-4">
                  {form.sourceVisitType && (
                    <div className="rounded-lg border px-4 py-3" style={{ background: '#F8FDFE', borderColor: '#DDF0F3' }}>
                      <div className="text-sm font-medium text-gray-800 mb-2">基层来源信息</div>
                      <div className="text-xs text-gray-500 mb-3">仅供县级医生参考，不影响后续 admissionType 判断。</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            用药情况 {isInpatientSource && <span className="text-red-500">*</span>}
                          </label>
                          <textarea
                            value={form.medicationSummary}
                            onChange={event => setForm(prev => ({ ...prev, medicationSummary: event.target.value }))}
                            rows={2}
                            placeholder={isInpatientSource ? '如选择住院患者，建议填写当前住院用药情况' : '可选填写门诊当前用药情况'}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                          />
                        </div>
                        {isInpatientSource && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1.5">入院日期</label>
                              <input
                                type="date"
                                value={form.inpatientAdmissionDate}
                                onChange={event => setForm(prev => ({ ...prev, inpatientAdmissionDate: event.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1.5">住院诊断</label>
                              <input
                                type="text"
                                value={form.inpatientDiagnosis}
                                onChange={event => setForm(prev => ({ ...prev, inpatientDiagnosis: event.target.value }))}
                                placeholder="请输入住院诊断"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1.5">当前治疗方案摘要</label>
                              <textarea
                                value={form.currentTreatmentPlanSummary}
                                onChange={event => setForm(prev => ({ ...prev, currentTreatmentPlanSummary: event.target.value }))}
                                rows={2}
                                placeholder="请输入当前治疗方案摘要"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1.5">病情变化说明</label>
                              <textarea
                                value={form.conditionChangeNote}
                                onChange={event => setForm(prev => ({ ...prev, conditionChangeNote: event.target.value }))}
                                rows={2}
                                placeholder="可选填写病情变化说明"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                              />
                            </div>
                            <div className="col-span-2">
                              {renderAttachmentUploader({
                                title: '护理记录',
                                hint: '（可上传附件，支持 PDF / JPG / PNG，单文件 ≤ 10MB）',
                                files: nursingAttachments,
                                onChange: handleNursingAttachmentSelect,
                                onRemove: (index) => setNursingAttachments(prev => prev.filter((_, currentIndex) => currentIndex !== index)),
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500 mb-3">用于补充当前病情、已做处置等信息，帮助目标医院提前准备</div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">病情补充/已做处置</label>
                    <textarea
                      value={form.reason}
                      onChange={event => setForm(prev => ({ ...prev, reason: event.target.value }))}
                      rows={3}
                      placeholder="选填"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">ICD-10诊断</label>
                    <ICD10Search value={form.diagnosis} onChange={handleDiagnosisChange} placeholder="选填，输入诊断名称或ICD编码" />
                  </div>
                  {renderAttachmentUploader()}
                </div>
              )}
            </div>
          </div>
        )}

        {emergencyStep === 1 && (
          <div className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">急诊转出提交确认</h2>
            <div className="rounded-xl border border-red-100 overflow-hidden">
              <div className="px-4 py-3 bg-red-50 flex items-center justify-between">
                <div className="text-sm font-semibold text-red-800">信息摘要</div>
                <button type="button" onClick={() => setEmergencyStep(0)} className="text-xs text-red-500 hover:text-red-700">返回修改</button>
              </div>
              <div className="px-4 py-4 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">患者：</span>
                  <span className="font-medium text-gray-800">{form.patientName}</span>
                  {selectedUrgency && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: selectedUrgency.bg, color: selectedUrgency.color }}>
                      {selectedUrgency.label}
                    </span>
                  )}
                  {greenChannelSelected && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: '#16A34A' }}>
                      绿色通道
                    </span>
                  )}
                </div>
                <div><span className="text-gray-500">联系电话：</span><span className="font-medium text-gray-800">{form.patientPhone || '—'}</span></div>
                <div><span className="text-gray-500">录入方式：</span><span className="font-medium text-gray-800">{isRetroEntry ? '补录录入' : '实时转诊'}</span></div>
                {isRetroEntry && (
                  <div><span className="text-gray-500">患者到院时间：</span><span className="font-medium text-gray-800">{form.patientArrivedAt ? new Date(form.patientArrivedAt).toLocaleString('zh-CN') : '—'}</span></div>
                )}
                <div><span className="text-gray-500">基层当前就诊类型：</span><span className="font-medium text-gray-800">{visitTypeLabel}</span></div>
                <div><span className="text-gray-500">目标医院：</span><span className="font-medium text-gray-800">{selectedInstitution?.name || '—'}</span></div>
                <div><span className="text-gray-500">接诊入口：</span><span className="font-medium text-gray-800">急诊科</span></div>
                <div><span className="text-gray-500">患者意识状态：</span><span className="font-medium text-gray-800">{consciousnessStatus === 'unclear' ? '意识不清' : consciousnessStatus === 'conscious' ? '意识清醒' : '—'}</span></div>
                <div><span className="text-gray-500">主诉/急转原因：</span><span className="font-medium text-gray-800">{form.chiefComplaint || '—'}</span></div>
                {linkedSpecialty && (
                  <div><span className="text-gray-500">联动专科：</span><span className="font-medium text-gray-800">{linkedSpecialty || '—'}</span></div>
                )}
              </div>
            </div>

            <div className="rounded-xl border px-4 py-4" style={{ background: isRetroEntry ? '#F9FAFB' : '#FFFBEB', borderColor: isRetroEntry ? '#D1D5DB' : '#FDE68A' }}>
              {isRetroEntry ? (
                <>
                  <div className="text-sm font-semibold text-gray-900 mb-3">提交后将按补录模式入账</div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div>本次仅生成急诊转诊记录，不触发急诊科值班、专科负责人和转诊中心的实时通知。</div>
                    <div>患者短信不会发送，详情页将直接显示“补录”标记，供转诊中心后续一次性完成补录确认。</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold text-amber-900 mb-3">提交后将立即启动急诊联动</div>
                  <div className="space-y-2 text-sm text-amber-900">
                    <div>📱 已向患者发送到院指引短信</div>
                    <div className="rounded-lg bg-white/70 px-3 py-3 text-xs font-mono whitespace-pre-line">
                      {buildEmergencyInitialSms({
                        institutionName: selectedInstitution?.name || '目标医院',
                        targetDepartment: linkedSpecialty,
                        emergencyDeptPhone: selectedInstitution?.emergencyDeptPhone || '—',
                        referralCode: '提交后生成',
                        isGreenChannel: greenChannelSelected,
                      })}
                    </div>
                    <div>🔔 已通知县医院相关接诊方优先处理</div>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-xl border px-4 py-4" style={{ background: '#F8FDFE', borderColor: '#DDF0F3' }}>
              <div className="text-sm font-semibold text-gray-800 mb-3">知情同意处理方式</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setConsentMethod('pending_upload')
                    setConsentError('')
                    clearConsentFile()
                  }}
                  className="rounded-xl border px-4 py-3 text-left transition-colors"
                  style={consentMethod === 'pending_upload'
                    ? { borderColor: '#F59E0B', background: '#FFF7ED' }
                    : { borderColor: '#E5E7EB', background: '#fff' }}
                >
                  <div className="text-sm font-medium text-gray-900">待补传</div>
                  <div className="text-xs text-gray-500 mt-1">{isRetroEntry ? '以已录入的患者到院时间为基准，后续补传线下签署附件' : '患者到院后 24 小时内线下签署并补传附件'}</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConsentMethod('offline_upload')
                    setConsentError('')
                  }}
                  className="rounded-xl border px-4 py-3 text-left transition-colors"
                  style={consentMethod === 'offline_upload'
                    ? { borderColor: '#0BBECF', background: '#F0FBFC' }
                    : { borderColor: '#E5E7EB', background: '#fff' }}
                >
                  <div className="text-sm font-medium text-gray-900">已线下签署并上传</div>
                  <div className="text-xs text-gray-500 mt-1">适用于已完成签字并能立即上传附件的急诊场景</div>
                </button>
              </div>

              {consentMethod === 'offline_upload' ? (
                <ConsentOfflinePanel
                  signedBy={consentSignedBy}
                  onSignedByChange={setConsentSignedBy}
                  file={consentFile}
                  onSelectFile={handleConsentFileSelect}
                  onRemoveFile={clearConsentFile}
                  error={consentError}
                />
              ) : (
                <div className="rounded-lg px-4 py-3 text-sm text-amber-800 bg-amber-50 border border-amber-200">
                  当前将以“待补传”提交，转诊单详情页将提示补传时限与附件上传入口。
                </div>
              )}
            </div>

            <div className="rounded-xl border px-4 py-4" style={{ background: '#F3F4F6', borderColor: '#E5E7EB' }}>
              <div className="text-sm text-gray-600 leading-6">
                {isRetroEntry
                  ? '补录模式下仍沿用线下签署知情同意方案；若选择待补传，后续时限仍以患者到院时间为准。'
                  : '急诊场景可先提交，知情同意改为线下签署并上传附件；患者意识状态将影响到院后的补传时点计算。'}
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-4 flex items-center justify-between rounded-b-xl" style={{ borderTop: '1px solid #FDE2E2', background: '#FFF8F8' }}>
          <button
            onClick={() => emergencyStep > 0 ? setEmergencyStep(prev => prev - 1) : setSelectedFlow(null)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-white transition-colors"
          >
            {emergencyStep === 0 ? '← 返回选类型' : '← 返回修改'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/primary/dashboard')}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
            >
              {emergencyStep === 0 ? '取消并返回工作台' : '保存草稿'}
            </button>
            {emergencyStep === 0 ? (
              <div className="flex flex-col items-end gap-2">
                {!emergencyCanNext && (
                  <div className="text-xs text-gray-400">{isRetroEntry ? '请完善必填信息及患者到院时间后继续' : '请完善必填信息后继续'}</div>
                )}
                <button
                  disabled={!emergencyCanNext}
                  onClick={() => setEmergencyStep(1)}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={emergencyCanNext
                    ? { background: '#ef4444', color: '#fff' }
                    : { background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }}
                >
                  下一步 →
                </button>
              </div>
            ) : (
              <button
                onClick={handleEmergencySubmit}
                className="px-6 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#DC2626', minWidth: 220 }}
              >
                {isRetroEntry ? '📝 提交补录' : '🚨 立即提交'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/primary/dashboard')} className="hover:underline" style={{ color: '#0BBECF' }}>工作台</button>
          <span>›</span>
          <span>发起转出</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-800">发起转出申请</h1>
      </div>

      {!selectedFlow && renderEntrySelector()}
      {selectedFlow === 'normal' && renderNormalFlow()}
      {selectedFlow === 'emergency' && renderEmergencyFlow()}

      <ClinicRecordPicker
        isOpen={patientLinkMode === 'clinic'}
        onClose={() => setPatientLinkMode(null)}
        onSelect={(record) => {
          setLinkedPatient({
            name: record.patientName,
            gender: record.gender,
            age: record.age,
            phone: record.phone,
            idCard: '',
            clinicId: record.id,
            dept: record.dept,
            doctor: record.doctor,
            visitTime: record.visitTime,
          })
          setPatientLinkMode(null)
        }}
      />
    </div>
  )
}

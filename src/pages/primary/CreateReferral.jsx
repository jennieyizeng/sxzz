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
import {
  UPWARD_REFERRAL_PURPOSE_OPTIONS,
  getReasonOptionLabel,
} from '../../constants/reasonCodes'

const URGENCY_LEVELS = [
  { level: 1, label: 'I级·急危', shortLabel: 'I级·急危', color: '#ef4444', bg: '#fef2f2' },
  { level: 2, label: 'II级·急重', shortLabel: 'II级·急重', color: '#f97316', bg: '#fff7ed' },
  { level: 3, label: 'III级·急症', shortLabel: 'III级·急症', color: '#eab308', bg: '#fefce8' },
  { level: 4, label: 'IV级·亚急', shortLabel: 'IV级·亚急', color: '#6b7280', bg: '#f9fafb' },
]

const NORMAL_STEPS = ['患者信息', '诊断及目的', '选择机构', '知情同意', '确认提交']
const EMERGENCY_STEPS = ['急诊信息', '确认提交']
const EMERGENCY_ENTRY_MODES = [
  { value: 'realtime', label: '实时转诊', description: '默认模式，提交后立即触发急诊联动、工作台通知和患者短信。' },
  { value: 'retro', label: '补录录入', description: '仅用于患者已先到院的事后补录，不触发实时通知，也不发送患者短信。' },
]

const EMERGENCY_TRANSPORT_CONDITION_OPTIONS = [
  '适合转运',
  '需评估后转运',
]

const EMERGENCY_TRANSPORT_NEED_OPTIONS = [
  '吸氧',
  '监护',
  '担架',
  '医护陪同',
  '120转运',
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

const OUTPATIENT_CONDITION_ASSESSMENT_OPTIONS = [
  '病情稳定',
  '建议尽快就诊',
  '需重点关注',
]

const ADMISSION_TYPE_PREFERENCE_OPTIONS = [
  { value: 'outpatient', label: '门诊专科就诊' },
  { value: 'inpatient', label: '建议住院评估' },
  { value: 'byHospital', label: '由上级医院判断' },
]

const CONSENT_PROXY_RELATION_OPTIONS = [
  '配偶',
  '父母',
  '子女',
  '兄弟姐妹',
  '其他监护人',
  '其他',
]

const CONSENT_PROXY_REASON_OPTIONS = [
  '患者意识不清',
  '认知障碍',
  '患者授权',
  '其他',
]

const MOCK_INPATIENT_PATIENTS = [
  {
    id: 'P001',
    name: '张建国',
    gender: '男',
    birthDate: '1968-03-15',
    age: 58,
    idCard: '510121196803150012',
    phone: '13812345678',
    hasHealthRecord: true,
    healthRecordSummary: {
      chronicDiseases: ['高血压（3级）', '2型糖尿病'],
      lastVisit: '2026-02-10 内科门诊',
    },
  },
  {
    id: 'P002',
    name: '李秀梅',
    gender: '女',
    birthDate: '1975-11-02',
    age: 50,
    idCard: '510121197511020034',
    phone: '13987654321',
    hasHealthRecord: false,
  },
]

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

function EmergencyRetroConfirmModal({ onCancel, onConfirm }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
          <div className="p-6">
            <div className="text-base font-semibold text-gray-800 mb-3">确认切换为补录录入</div>
            <div className="text-sm text-gray-600 leading-6">
              仅用于患者已先行到院后的事后登记，不触发实时通知，不作为实时接诊依据
            </div>
          </div>
          <div className="px-6 py-4 flex justify-end gap-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
              style={{ background: '#ef4444' }}
            >
              确认切换
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function CreateReferral() {
  const navigate = useNavigate()
  const location = useLocation()
  const { submitReferral, submitForInternalReview, currentUser } = useApp()

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
  const [showRetroConfirmModal, setShowRetroConfirmModal] = useState(false)
  const [emergencyTransportCondition, setEmergencyTransportCondition] = useState('')
  const [emergencyTransportNeeds, setEmergencyTransportNeeds] = useState([])
  const [admissionTypePref, setAdmissionTypePref] = useState('outpatient')
  const [deptSuggestion, setDeptSuggestion] = useState(null)
  const [attachments, setAttachments] = useState([])
  // CHG-40: 护理记录附件与检查附件分开展示
  const [nursingAttachments, setNursingAttachments] = useState([])
  const [showEmergencySupplementary, setShowEmergencySupplementary] = useState(false)
  const [patientSearchQuery, setPatientSearchQuery] = useState('')
  const [inpatientTransferPurpose, setInpatientTransferPurpose] = useState('')
  const [inpatientTransferPurposeOther, setInpatientTransferPurposeOther] = useState('')
  const [conditionAssessment, setConditionAssessment] = useState('')
  const [transportSuitability, setTransportSuitability] = useState('')
  const [transportNotes, setTransportNotes] = useState('')
  const [signerType, setSignerType] = useState('patient')
  const [signerRelation, setSignerRelation] = useState('')
  const [signerReason, setSignerReason] = useState('')
  const [outpatientTransferPurpose, setOutpatientTransferPurpose] = useState([])
  const [outpatientTransferPurposeOther, setOutpatientTransferPurposeOther] = useState('')
  const [outpatientConditionAssessment, setOutpatientConditionAssessment] = useState('')
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
    inpatientWardNo: '',
    inpatientWard: '',
    inpatientDoctor: '',
    outpatientNo: '',
    outpatientVisitTime: '',
    outpatientDept: '',
    outpatientDoctor: '',
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

  const phoneIsValid = isValidChineseMainlandMobile(form.patientPhone)
  const selectedUrgency = URGENCY_LEVELS.find(item => item.level === urgencyLevel)
  const urgencyFeedback = buildEmergencyUrgencyFeedback(urgencyLevel)
  const greenChannelSelected = urgencyFeedback?.greenChannelAutoEnabled || false
  const isInpatientSource = form.sourceVisitType === 'inpatient'
  const visitTypeLabel = form.sourceVisitType === 'inpatient' ? '住院' : form.sourceVisitType === 'outpatient' ? '门诊' : '—'
  const isRetroEntry = selectedFlow === 'emergency' && emergencyEntryMode === 'retro'
  const admissionTypePrefLabel = ADMISSION_TYPE_PREFERENCE_OPTIONS.find(option => option.value === admissionTypePref)?.label || '—'
  const outpatientTransferPurposeSummary = outpatientTransferPurpose.length > 0
    ? outpatientTransferPurpose.map((code) => {
      if (code === 'other') {
        return outpatientTransferPurposeOther ? `其他：${outpatientTransferPurposeOther}` : '其他'
      }
      return getReasonOptionLabel(UPWARD_REFERRAL_PURPOSE_OPTIONS, code) || code
    }).join('、')
    : '—'
  const outpatientReasonSummary = [
    outpatientTransferPurpose.length > 0 ? `转诊目的：${outpatientTransferPurposeSummary}` : '',
    outpatientConditionAssessment ? `当前病情评估：${outpatientConditionAssessment}` : '',
    form.reason ? `补充说明：${form.reason}` : '',
  ].filter(Boolean).join('；')

  const normalCanNext = [
    form.sourceVisitType && form.patientName && form.patientGender && form.patientAge && form.patientPhone
      && (isInpatientSource
        ? true
        : form.outpatientDoctor),
    form.chiefComplaint
      && form.diagnosis
      && (isInpatientSource
        ? (inpatientTransferPurpose && conditionAssessment && transportSuitability && form.medicationSummary
          && (inpatientTransferPurpose !== '其他' || inpatientTransferPurposeOther))
        : (outpatientTransferPurpose.length > 0
          && (!outpatientTransferPurpose.includes('other') || outpatientTransferPurposeOther.trim()))),
    form.toInstitutionId && form.toDept,
    !!consentFile && (signerType !== 'family' || (signerRelation && signerReason)),
    true,
  ][normalStep]

  const emergencyCanNext = [
    canProceedEmergencyReferral({
      patientName: form.patientName,
      patientPhone: form.patientPhone,
      urgencyLevel,
      consciousnessStatus,
      toInstitutionId: form.toInstitutionId,
    }) && emergencyTransportCondition && (!isRetroEntry || !!form.patientArrivedAt),
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
    setForm(prev => ({
      ...prev,
      chiefComplaint: '',
      diagnosis: null,
      reason: '',
      medicationSummary: '',
      inpatientAdmissionDate: '',
      inpatientDiagnosis: '',
      inpatientWardNo: '',
      inpatientWard: '',
      inpatientDoctor: '',
      currentTreatmentPlanSummary: '',
      conditionChangeNote: '',
      outpatientNo: '',
      outpatientVisitTime: '',
      outpatientDept: '',
      outpatientDoctor: '',
    }))
    setAttachments([])
    setNursingAttachments([])
    setDeptSuggestion(null)
    setOutpatientTransferPurpose([])
    setOutpatientTransferPurposeOther('')
    setOutpatientConditionAssessment('')
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
      || form.outpatientNo
      || form.outpatientVisitTime
      || form.outpatientDept
      || form.outpatientDoctor
      || outpatientTransferPurpose.length > 0
      || outpatientTransferPurposeOther
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
    setShowRetroConfirmModal(false)
    setEmergencyTransportCondition('')
    setEmergencyTransportNeeds([])
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

  const applyPatientLink = (patient) => {
    setLinkedPatient(patient)
    setForm(prev => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.name,
      patientGender: patient.gender,
      patientAge: String(patient.age),
      patientIdCard: patient.idCard,
      patientPhone: patient.phone,
    }))
    setPatientSearchQuery('')
  }

  const clearLinkedPatientFields = () => {
    setLinkedPatient(null)
    setForm(prev => ({
      ...prev,
      patientId: '',
      patientName: '',
      patientGender: '',
      patientAge: '',
      patientIdCard: '',
      patientPhone: '',
    }))
  }

  const handleEmergencyEntryModeChange = (nextMode) => {
    if (nextMode === emergencyEntryMode) return
    if (nextMode === 'retro') {
      setShowRetroConfirmModal(true)
      return
    }
    setEmergencyEntryMode(nextMode)
  }

  const toggleEmergencyTransportNeed = (need) => {
    setEmergencyTransportNeeds(prev =>
      prev.includes(need)
        ? prev.filter(item => item !== need)
        : [...prev, need]
    )
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
      reason: isInpatientSource ? form.reason : outpatientReasonSummary,
      // CHG-40: 上转写入基层当前就诊类型与对应补充字段
      sourceVisitType: form.sourceVisitType,
      medicationSummary: form.medicationSummary,
      inpatientAdmissionDate: form.inpatientAdmissionDate || null,
      inpatientDiagnosis: form.inpatientDiagnosis || '',
      currentTreatmentPlanSummary: form.currentTreatmentPlanSummary || '',
      conditionChangeNote: form.conditionChangeNote || '',
      outpatientNo: form.outpatientNo || '',
      outpatientVisitTime: form.outpatientVisitTime || '',
      outpatientDept: form.outpatientDept || '',
      outpatientDoctor: form.outpatientDoctor || '',
      outpatientTransferPurpose,
      referralPurposeCodes: outpatientTransferPurpose,
      outpatientTransferPurposeOther: outpatientTransferPurpose.includes('other') ? outpatientTransferPurposeOther.trim() : '',
      referralPurposeText: outpatientTransferPurpose.includes('other') ? outpatientTransferPurposeOther.trim() || null : null,
      outpatientSupplementNote: form.reason || '',
      outpatientConditionAssessment: outpatientConditionAssessment || '',
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
      consentFileName: consentFile?.name || null,
      consentFileNames: consentFile ? [consentFile.name] : [],
      consentFileUrl: consentFile?.fileUrl || null,
      consentFileUrls: consentFile?.fileUrl ? [consentFile.fileUrl] : [],
      consentUploadedAt: consentFile?.uploadedAt || new Date().toISOString(),
      consentSignedBy,
      consentProxyRelation: signerType === 'family' ? signerRelation : null,
      consentProxyReason: signerType === 'family' ? signerReason : null,
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
    if (consentMethod === 'offline_upload' && consentSignedBy === 'family' && (!signerRelation || !signerReason)) {
      setConsentError('请选择与患者关系和代签原因')
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
      sourceVisitType: null,
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
      transportCondition: emergencyTransportCondition || null,
      transportNeeds: emergencyTransportNeeds,
      is_emergency: true,
      // CHG-41: 急诊补录模式字段
      isRetroEntry,
      patientArrivedAt: isRetroEntry ? form.patientArrivedAt : null,
      admissionTypePref: 'outpatient',
      attachments: attachments.map(file => ({ name: file.name, size: file.size })),
      nursingAttachments: nursingAttachments.map(file => ({ name: file.name, size: file.size })),
      consentMethod,
      consentSigned: consentMethod === 'offline_upload',
      consentFileName: consentMethod === 'offline_upload' ? (consentFile?.name || null) : null,
      consentFileNames: consentMethod === 'offline_upload' && consentFile ? [consentFile.name] : [],
      consentFileUrl: consentMethod === 'offline_upload' ? (consentFile?.fileUrl || null) : null,
      consentFileUrls: consentMethod === 'offline_upload' && consentFile?.fileUrl ? [consentFile.fileUrl] : [],
      consentUploadedAt: consentMethod === 'offline_upload' ? (consentFile?.uploadedAt || new Date().toISOString()) : null,
      consentSignedBy,
      consentProxyRelation: consentSignedBy === 'family' ? signerRelation : null,
      consentProxyReason: consentSignedBy === 'family' ? signerReason : null,
      consentDeferred: consentMethod === 'pending_upload',
      logs: [
        { time: new Date().toISOString(), actor: currentUser.name, action: consentMethod === 'pending_upload' ? '急诊知情同意后置，待患者到院后补传签署附件' : '急诊知情同意已线下签署并上传附件', note: consentMethod === 'offline_upload' && consentFile ? `${consentSignedBy === 'family' ? '家属代签' : '患者本人'} · ${consentFile.name}` : '' },
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

  const openUploadedFiles = (files) => {
    files
      .map(file => file?.url || file?.fileUrl)
      .filter(Boolean)
      .forEach((url) => window.open(url, '_blank', 'noopener,noreferrer'))
  }

  const renderUploadedSummaryRow = (label, files, fallback = '未上传') => {
    const fileList = Array.isArray(files) ? files.filter(Boolean) : []
    const fileNames = fileList.length > 0
      ? fileList.map(file => file?.name || file?.label || '未命名文件').join('、')
      : fallback

    return (
      <div key={label} className="px-4 py-2.5 border-t border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-400">{label}</div>
            <div className="text-sm text-gray-800 mt-0.5 break-all">{fileNames}</div>
          </div>
          {fileList.length > 0 && (
            <button
              type="button"
              onClick={() => openUploadedFiles(fileList)}
              className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg border border-[#B6EDF2] text-[#0F766E] bg-white hover:bg-[#F0FBFC]"
            >
              查看
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderSourceVisitTypeSelector = ({ required }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        患者当前就诊类型 {required && <span className="text-red-500">*</span>}
      </label>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: 'outpatient', label: '门诊患者', desc: '重点填写门诊关联信息、诊断、转诊目的和检查资料' },
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
            <div className="space-y-5">
              {renderSourceVisitTypeSelector({ required: true })}

              {form.sourceVisitType && (
                <>
                  {/* ===== INPATIENT: 搜索患者 / 手工新增 ===== */}
                  {isInpatientSource ? (
                    <div className="rounded-xl border p-4" style={{ background: '#FAFCFE', borderColor: '#DDF0F3' }}>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                          type="button"
                          onClick={() => { handlePatientLink('search'); setPatientSearchQuery('') }}
                          className="rounded-xl border px-4 py-3 text-left transition-colors"
                          style={patientLinkMode === 'search' || patientLinkMode === null
                            ? { borderColor: '#0BBECF', background: '#F0FBFC' }
                            : { borderColor: '#E5E7EB', background: '#fff' }}
                        >
                          <div className="text-sm font-semibold text-gray-800">🔍 搜索患者</div>
                          <div className="text-xs text-gray-500 mt-1">在医共体平台患者主索引中按姓名或身份证号搜索</div>
                        </button>
                          <button
                            type="button"
                            onClick={() => { handlePatientLink('manual'); }}
                            className="rounded-xl border px-4 py-3 text-left transition-colors"
                            style={patientLinkMode === 'manual'
                              ? { borderColor: '#0BBECF', background: '#F0FBFC' }
                              : { borderColor: '#E5E7EB', background: '#fff' }}
                          >
                            <div className="text-sm font-semibold text-gray-800">✏️ 新增患者</div>
                          </button>
                      </div>

                      {/* Patient search input */}
                      {(patientLinkMode === 'search' || patientLinkMode === null) && !linkedPatient && (
                        <div className="relative">
                          <input
                            type="text"
                            value={patientSearchQuery}
                            onChange={e => setPatientSearchQuery(e.target.value)}
                            placeholder="输入姓名或身份证号"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                          />
                          {patientSearchQuery && (
                            <div className="mt-1 border border-gray-200 rounded-lg shadow-sm bg-white">
                              {MOCK_INPATIENT_PATIENTS.filter(p =>
                                p.name.includes(patientSearchQuery) || p.idCard.includes(patientSearchQuery)
                              ).map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setLinkedPatient(p)
                                    setForm(prev => ({
                                      ...prev,
                                      patientId: p.id,
                                      patientName: p.name,
                                      patientGender: p.gender,
                                      patientAge: String(p.age),
                                      patientIdCard: p.idCard,
                                      patientPhone: p.phone,
                                    }))
                                    setPatientSearchQuery('')
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                                >
                                  <div className="font-medium text-sm text-gray-800">{p.name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{p.gender} · {p.age}岁 · {p.idCard.slice(0, 6)}****{p.idCard.slice(-4)} · {p.phone}</div>
                                </button>
                              ))}
                              {MOCK_INPATIENT_PATIENTS.filter(p =>
                                p.name.includes(patientSearchQuery) || p.idCard.includes(patientSearchQuery)
                              ).length === 0 && (
                                <div className="px-4 py-3 text-sm text-gray-400">未找到匹配患者，请切换至手工新增</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Linked patient display */}
                      {linkedPatient && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: '#E0F6F9', color: '#0892a0' }}>✅ 已关联患者主索引</span>
                            <button type="button" onClick={() => { setLinkedPatient(null); setForm(prev => ({ ...prev, patientId: '', patientName: '', patientGender: '', patientAge: '', patientIdCard: '', patientPhone: '' })) }} className="text-xs text-gray-400 hover:text-gray-600">重新搜索</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ===== OUTPATIENT: search patient / manual entry ===== */
                    <div className="rounded-xl border p-4" style={{ background: '#FAFCFE', borderColor: '#DDF0F3' }}>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                          type="button"
                          onClick={() => { handlePatientLink('search'); setPatientSearchQuery(''); }}
                          className="rounded-xl border px-4 py-3 text-left transition-colors"
                          style={patientLinkMode === 'search' || patientLinkMode === null
                            ? { borderColor: '#0BBECF', background: '#F0FBFC' }
                            : { borderColor: '#E5E7EB', background: '#fff' }}
                        >
                          <div className="text-sm font-semibold text-gray-800">🔍 搜索患者</div>
                          <div className="text-xs text-gray-500 mt-1">在医共体平台患者主索引中按姓名或身份证号搜索</div>
                        </button>
                          <button
                            type="button"
                            onClick={() => { handlePatientLink('manual'); setPatientSearchQuery('') }}
                            className="rounded-xl border px-4 py-3 text-left transition-colors"
                            style={patientLinkMode === 'manual'
                              ? { borderColor: '#0BBECF', background: '#F0FBFC' }
                              : { borderColor: '#E5E7EB', background: '#fff' }}
                          >
                            <div className="text-sm font-semibold text-gray-800">✏️ 新增患者</div>
                          </button>
                      </div>

                      {/* Patient search input */}
                      {(patientLinkMode === 'search' || patientLinkMode === null) && !linkedPatient && (
                        <div className="relative">
                          <input
                            type="text"
                            value={patientSearchQuery}
                            onChange={e => setPatientSearchQuery(e.target.value)}
                            placeholder="输入姓名或身份证号"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                          />
                          {patientSearchQuery && (
                            <div className="mt-1 border border-gray-200 rounded-lg shadow-sm bg-white">
                              {MOCK_INPATIENT_PATIENTS.filter(p =>
                                p.name.includes(patientSearchQuery) || p.idCard.includes(patientSearchQuery)
                              ).map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setLinkedPatient(p)
                                    setForm(prev => ({
                                      ...prev,
                                      patientId: p.id,
                                      patientName: p.name,
                                      patientGender: p.gender,
                                      patientAge: String(p.age),
                                      patientIdCard: p.idCard,
                                      patientPhone: p.phone,
                                    }))
                                    setPatientSearchQuery('')
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                                >
                                  <div className="font-medium text-sm text-gray-800">{p.name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{p.gender} · {p.age}岁 · {p.idCard.slice(0, 6)}****{p.idCard.slice(-4)} · {p.phone}</div>
                                </button>
                              ))}
                              {MOCK_INPATIENT_PATIENTS.filter(p =>
                                p.name.includes(patientSearchQuery) || p.idCard.includes(patientSearchQuery)
                              ).length === 0 && (
                                <div className="px-4 py-3 text-sm text-gray-400">未找到匹配患者，请切换至手工新增</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Linked patient badge */}
                      {linkedPatient && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: '#E0F6F9', color: '#0892a0' }}>✅ 已关联患者主索引</span>
                          <button
                            type="button"
                            onClick={() => {
                              setLinkedPatient(null)
                              setForm(prev => ({ ...prev, patientId: '', patientName: '', patientGender: '', patientAge: '', patientIdCard: '', patientPhone: '' }))
                              setPatientSearchQuery('')
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            重新搜索
                          </button>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Patient basic info */}
                  <h2 className="text-base font-semibold text-gray-800 mt-2">患者基本信息</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">姓名 <span className="text-red-500">*</span></label>
                      <input type="text" value={form.patientName}
                        onChange={event => setForm(prev => ({ ...prev, patientName: event.target.value }))}
                        placeholder="患者姓名" readOnly={!!linkedPatient}
                        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">性别 <span className="text-red-500">*</span></label>
                      <div className="flex gap-3">
                        {['男', '女'].map(gender => (
                          <button key={gender} type="button"
                            onClick={() => setForm(prev => ({ ...prev, patientGender: gender }))}
                            disabled={!!linkedPatient}
                            className="flex-1 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50"
                            style={form.patientGender === gender
                              ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                              : { background: '#fff', color: '#4b5563', borderColor: '#d1d5db' }}>
                            {gender}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">出生日期 / 年龄</label>
                      {linkedPatient ? (
                        <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
                          {linkedPatient.age}岁
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input type="text" value={form.patientAge}
                            onChange={event => setForm(prev => ({ ...prev, patientAge: event.target.value }))}
                            placeholder="岁" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                        </div>
                      )}
                      {linkedPatient && <div className="text-xs text-gray-400 mt-1">根据关联信息自动带出</div>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">联系电话 <span className="text-red-500">*</span></label>
                      <input type="text" value={form.patientPhone}
                        onChange={event => setForm(prev => ({ ...prev, patientPhone: event.target.value }))}
                        placeholder="13800138000" readOnly={!!linkedPatient}
                        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">身份证号</label>
                      <input type="text" value={form.patientIdCard}
                        onChange={event => setForm(prev => ({ ...prev, patientIdCard: event.target.value }))}
                        placeholder="510623***1234" readOnly={!!linkedPatient}
                        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`} />
                    </div>
                  </div>

                  {!isInpatientSource && (
                    <div className="rounded-xl border p-4" style={{ borderColor: '#E5E7EB', background: '#FCFCFD' }}>
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-gray-700">门诊关联信息</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">当前门诊科室</label>
                          <input
                            type="text"
                            value={form.outpatientDept}
                            onChange={event => setForm(prev => ({ ...prev, outpatientDept: event.target.value }))}
                            placeholder="如：全科门诊、内科门诊"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">当前接诊医生 <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={form.outpatientDoctor}
                            onChange={event => setForm(prev => ({ ...prev, outpatientDoctor: event.target.value }))}
                            placeholder="请输入医生姓名"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">就诊时间</label>
                          <input
                            type="datetime-local"
                            value={form.outpatientVisitTime}
                            onChange={event => setForm(prev => ({ ...prev, outpatientVisitTime: event.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">门诊号 / 就诊记录号</label>
                          <input
                            type="text"
                            value={form.outpatientNo}
                            onChange={event => setForm(prev => ({ ...prev, outpatientNo: event.target.value }))}
                            placeholder="请输入门诊号或就诊记录号"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </>
              )}
            </div>
          </div>
        )}

        {normalStep === 1 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">诊断及转诊目的</h2>
            <div className="space-y-4">
              {/* ===== INPATIENT specific ===== */}
              {isInpatientSource ? (
                <>
                  {/* Group 1: 诊断与转诊目的 */}
                  <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: '#E5E7EB', background: '#FCFCFD' }}>
                    <div className="text-sm font-semibold text-gray-700">诊断与转诊目的</div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">转院目的 <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {['需上级医院进一步明确诊断', '需专科进一步评估', '需进一步治疗', '需手术 / 介入 / 特殊处置', '当前医院资源或能力不足', '患者 / 家属主动要求', '其他'].map(opt => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="radio" name="transferPurpose" value={opt}
                              checked={inpatientTransferPurpose === opt}
                              onChange={() => setInpatientTransferPurpose(opt)}
                              className="text-cyan-500" />
                            <span className="text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                      {inpatientTransferPurpose === '其他' && (
                        <input type="text" value={inpatientTransferPurposeOther}
                          onChange={e => setInpatientTransferPurposeOther(e.target.value)}
                          placeholder="请说明其他原因（必填）"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none mt-3" />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">当前病情评估 <span className="text-red-500">*</span></label>
                      <div className="flex flex-wrap gap-3">
                        {['病情稳定', '相对稳定，建议尽快转院', '需重点关注'].map(opt => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="radio" name="conditionAssessment" value={opt}
                              checked={conditionAssessment === opt}
                              onChange={() => setConditionAssessment(opt)} />
                            <span className="text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">是否适合转运 <span className="text-red-500">*</span></label>
                      <div className="flex flex-wrap gap-3">
                        {['适合转运', '需评估后转运', '暂不建议转运'].map(opt => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="radio" name="transportSuitability" value={opt}
                              checked={transportSuitability === opt}
                              onChange={() => setTransportSuitability(opt)} />
                            <span className="text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">转运注意事项 <span className="text-gray-400 text-xs">（选填）</span></label>
                      <textarea value={transportNotes} onChange={e => setTransportNotes(e.target.value)}
                        rows={2} placeholder="如有特殊转运注意事项可补充"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                    </div>
                  </div>

                  {/* Group 2: 病历摘要 */}
                  <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: '#E5E7EB', background: '#FCFCFD' }}>
                    <div className="text-sm font-semibold text-gray-700">病历摘要</div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">主诉与现病史 <span className="text-red-500">*</span></label>
                      <textarea value={form.chiefComplaint}
                        onChange={event => setForm(prev => ({ ...prev, chiefComplaint: event.target.value }))}
                        rows={3} placeholder="描述患者主要症状、发病时间、病情演变等"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">当前住院诊断（ICD-10）<span className="text-red-500">*</span></label>
                      <ICD10Search value={form.diagnosis} onChange={handleDiagnosisChange} required
                        placeholder="可填写当前住院主要诊断编码，如 J18.9" />
                      {form.diagnosis && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                          <span>✓</span>
                          <span>已选：<strong>{form.diagnosis.code}</strong> {form.diagnosis.name}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">当前治疗经过 / 当前用药情况 <span className="text-red-500">*</span></label>
                      <textarea value={form.medicationSummary}
                        onChange={event => setForm(prev => ({ ...prev, medicationSummary: event.target.value }))}
                        rows={3} placeholder="请填写当前住院治疗经过及用药情况"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">当前治疗方案摘要 <span className="text-gray-400 text-xs">（选填）</span></label>
                      <textarea value={form.currentTreatmentPlanSummary}
                        onChange={event => setForm(prev => ({ ...prev, currentTreatmentPlanSummary: event.target.value }))}
                        rows={3} placeholder="请输入当前治疗方案摘要"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">病情变化说明 <span className="text-gray-400 text-xs">（选填）</span></label>
                      <textarea value={form.conditionChangeNote}
                        onChange={event => setForm(prev => ({ ...prev, conditionChangeNote: event.target.value }))}
                        rows={2} placeholder="如有近期病情变化可补充说明"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                    </div>
                  </div>

                  {/* Group 3: 资料上传 */}
                  <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: '#E5E7EB', background: '#FCFCFD' }}>
                    <div className="text-sm font-semibold text-gray-700">资料上传</div>
                    {renderAttachmentUploader({
                      title: '检查 / 检验资料上传',
                      hint: '（选填，支持 PDF / JPG / PNG，单文件 ≤ 10MB）',
                      files: attachments,
                      onChange: handleAttachmentSelect,
                      onRemove: (index) => setAttachments(prev => prev.filter((_, i) => i !== index)),
                    })}
                    {renderAttachmentUploader({
                      title: '护理记录上传',
                      hint: '（选填，支持 PDF / JPG / PNG，单文件 ≤ 10MB）',
                      files: nursingAttachments,
                      onChange: handleNursingAttachmentSelect,
                      onRemove: (index) => setNursingAttachments(prev => prev.filter((_, i) => i !== index)),
                    })}
                  </div>
                </>
              ) : (
                /* ===== OUTPATIENT ===== */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">主诉与现病史 <span className="text-red-500">*</span></label>
                    <textarea value={form.chiefComplaint}
                      onChange={event => setForm(prev => ({ ...prev, chiefComplaint: event.target.value }))}
                      rows={3} placeholder="描述患者主要症状、发病时间、病情演变等"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
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
                          <button key={dept} type="button"
                            onClick={() => { setForm(prev => ({ ...prev, toDept: dept })); setDeptSuggestion(null) }}
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ background: '#DBEAFE', color: '#1D4ED8' }}>{dept}</button>
                        ))}
                        <button type="button" onClick={() => setDeptSuggestion(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">忽略</button>
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: '#E5E7EB', background: '#FCFCFD' }}>
                    <div className="text-sm font-semibold text-gray-700">转诊目的 <span className="text-red-500">*</span></div>
                    <div className="grid grid-cols-2 gap-3">
                      {UPWARD_REFERRAL_PURPOSE_OPTIONS.map(option => (
                        <label key={option.code} className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={outpatientTransferPurpose.includes(option.code)}
                            onChange={() => setOutpatientTransferPurpose((prev) => {
                              const nextPurposes = prev.includes(option.code)
                                ? prev.filter(item => item !== option.code)
                                : [...prev, option.code]
                              if (!nextPurposes.includes('other')) {
                                setOutpatientTransferPurposeOther('')
                              }
                              return nextPurposes
                            })}
                            className="mt-0.5"
                          />
                          <span className="text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                    {outpatientTransferPurpose.includes('other') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">其他转诊目的 <span className="text-red-500">*</span></label>
                        <textarea
                          value={outpatientTransferPurposeOther}
                          onChange={event => setOutpatientTransferPurposeOther(event.target.value)}
                          rows={2}
                          placeholder="请填写其他转诊目的"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">当前病情评估</label>
                    <div className="flex flex-wrap gap-3">
                      {OUTPATIENT_CONDITION_ASSESSMENT_OPTIONS.map(option => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="radio"
                            name="outpatientConditionAssessment"
                            value={option}
                            checked={outpatientConditionAssessment === option}
                            onChange={() => setOutpatientConditionAssessment(option)}
                          />
                          <span className="text-gray-700">{option}</span>
                        </label>
                      ))}
                      {outpatientConditionAssessment && (
                        <button
                          type="button"
                          onClick={() => setOutpatientConditionAssessment('')}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          清空
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">补充说明</label>
                    <textarea value={form.reason}
                      onChange={event => setForm(prev => ({ ...prev, reason: event.target.value }))}
                      rows={2} placeholder="如需补充说明当前判断依据、已沟通情况，可填写"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">用药情况</label>
                    <textarea value={form.medicationSummary}
                      onChange={event => setForm(prev => ({ ...prev, medicationSummary: event.target.value }))}
                      rows={2} placeholder="如门诊已有用药可填写"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                  </div>
                  {renderAttachmentUploader({
                    title: '已做检查/检验报告',
                    hint: '（可上传附件，支持 PDF / JPG / PNG，单文件 ≤ 10MB）',
                    files: attachments,
                    onChange: handleAttachmentSelect,
                    onRemove: (index) => setAttachments(prev => prev.filter((_, i) => i !== index)),
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {normalStep === 2 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">选择目标医院及科室</h2>
            <div className="space-y-3">
              {INSTITUTIONS.filter(item => item.type === 'county').map(inst => (
                <div key={inst.id} onClick={() => setForm(prev => ({ ...prev, toInstitutionId: inst.id, toDept: '' }))}
                  className="border rounded-xl p-4 cursor-pointer transition-all"
                  style={form.toInstitutionId === inst.id
                    ? { borderColor: '#0BBECF', background: '#F0FBFC', boxShadow: '0 0 0 2px #a4edf5' }
                    : { borderColor: '#e5e7eb', background: '#fff' }}>
                  <div className="font-medium text-gray-800 mb-2">{inst.name}</div>
                  <div className="text-xs text-gray-500">医共体成员机构 · 县级医院</div>
                </div>
              ))}
            </div>

            {selectedInstitution && (
              <div className="mt-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">目标科室 <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedInstitution.departments.map(dept => {
                    const isSelected = form.toDept === dept
                    const deptInfo = selectedInstitution.departmentInfo?.[dept]
                    const totalQuota = deptInfo?.dailyQuota ?? 0
                    const remainingQuota = Math.max(totalQuota - (deptInfo?.todayReserved ?? 0), 0)
                    const isQuotaEmpty = totalQuota > 0 && remainingQuota <= 0
                    return (
                      <button key={dept} type="button"
                        onClick={() => setForm(prev => ({ ...prev, toDept: dept }))}
                        className="rounded-lg border transition-all text-left"
                        style={isSelected
                          ? { borderColor: '#0BBECF', background: '#F0FBFC', boxShadow: '0 0 0 2px #a4edf5' }
                          : { borderColor: '#e5e7eb', background: '#fff' }}>
                        <div className="px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={isSelected ? { color: '#0892a0' } : { color: '#374151' }}>{dept}</span>
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={isQuotaEmpty
                                ? { background: '#FEF2F2', color: '#DC2626' }
                                : { background: '#F3F4F6', color: '#4B5563' }}
                            >
                              {`${remainingQuota}/${totalQuota}`}
                            </span>
                          </div>
                          <div className="text-xs mt-1" style={isQuotaEmpty ? { color: '#DC2626' } : { color: '#6B7280' }}>
                            {isQuotaEmpty ? '当前无可用号源' : '可提交转诊申请'}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-400">若号源已满仍可提交申请，是否接诊以院方实际安排为准。</div>

                {form.toDept && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-sm font-medium text-gray-700 mb-2">期望处理方式</div>
                    <div className="flex flex-col gap-2">
                      {ADMISSION_TYPE_PREFERENCE_OPTIONS.map(option => (
                        <label key={option.value} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="radio" name="admissionTypePref" value={option.value}
                            checked={admissionTypePref === option.value}
                            onChange={() => setAdmissionTypePref(option.value)} />
                          <span className="text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 rounded-lg border p-3" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
                      <div className="text-sm text-gray-700">
                        系统将按所选医院与科室进入后续审核/受理流程，最终处理方式以受理结果为准。
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {normalStep === 3 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">患者知情同意</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                <span>ℹ️</span>
                <span>请先下载模板、完成线下签字，再上传已签署文件。</span>
              </div>

              {/* Signer type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">签署人类型 <span className="text-red-500">*</span></label>
                <div className="flex gap-4">
                  {[{ value: 'patient', label: '患者本人' }, { value: 'family', label: '家属代签' }].map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="radio" name="signerType" value={opt.value}
                        checked={signerType === opt.value}
                        onChange={() => setSignerType(opt.value)} />
                      <span className="text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
                {signerType === 'family' && (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">与患者关系 <span className="text-red-500">*</span></label>
                      <select value={signerRelation}
                        onChange={e => setSignerRelation(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                        <option value="">请选择</option>
                        {CONSENT_PROXY_RELATION_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">代签原因 <span className="text-red-500">*</span></label>
                      <select value={signerReason}
                        onChange={e => setSignerReason(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                        <option value="">请选择</option>
                        {CONSENT_PROXY_REASON_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <ConsentOfflinePanel
                signedBy={consentSignedBy}
                onSignedByChange={setConsentSignedBy}
                file={consentFile}
                onSelectFile={handleConsentFileSelect}
                onRemoveFile={clearConsentFile}
                error={consentError}
                showSignerSelector={false}
                showIntroTitle={false}
                showIntroDescription={false}
                templateButtonVariant="uniform"
                uploadLabel="上传已签署的转院知情同意书"
              />
              {!consentFile && (
                <div className="text-center">
                  <div className="text-sm text-gray-400">请上传已签署的知情同意书后继续</div>
                </div>
              )}
            </div>
          </div>
        )}

        {normalStep === 4 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">确认提交摘要</h2>
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                  <span className="text-xs font-semibold" style={{ color: '#0892a0' }}>患者基础信息</span>
                </div>
                <div className="grid grid-cols-3">
                  {[
                    ['姓名', form.patientName],
                    ['性别', form.patientGender],
                    ['年龄', form.patientAge ? `${form.patientAge}岁` : '—'],
                    ['联系电话', form.patientPhone],
                    ['身份证号', form.patientIdCard ? `${form.patientIdCard.slice(0, 3)}****${form.patientIdCard.slice(-4)}` : '—'],
                    ['患者类型', visitTypeLabel],
                  ].map(([key, value]) => (
                    <div key={key} className="px-4 py-2.5 border-t border-gray-100">
                      <div className="text-xs text-gray-400">{key}</div>
                      <div className="text-sm text-gray-800 font-medium mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {!isInpatientSource && (
                <div className="rounded-xl overflow-hidden" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                    <span className="text-xs font-semibold" style={{ color: '#0892a0' }}>门诊关联信息</span>
                  </div>
                  <div className="grid grid-cols-2">
                    {[
                      ['当前门诊科室', form.outpatientDept || '—'],
                      ['当前接诊医生', form.outpatientDoctor || '—'],
                      ['就诊时间', form.outpatientVisitTime || '—'],
                      ['门诊号 / 就诊记录号', form.outpatientNo || '—'],
                    ].map(([key, value]) => (
                      <div key={key} className="px-4 py-2.5 border-t border-gray-100">
                        <div className="text-xs text-gray-400">{key}</div>
                        <div className="text-sm text-gray-800 font-medium mt-0.5">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl overflow-hidden" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                  <span className="text-xs font-semibold" style={{ color: '#0892a0' }}>诊断与转诊目的</span>
                </div>
                {isInpatientSource ? (
                  <div>
                    {[
                      ['转院目的', inpatientTransferPurpose === '其他' ? `其他：${inpatientTransferPurposeOther}` : inpatientTransferPurpose],
                      ['当前病情评估', conditionAssessment],
                      ['是否适合转运', transportSuitability],
                      ...(transportNotes ? [['转运注意事项', transportNotes]] : []),
                      ['当前治疗经过 / 当前用药情况', form.medicationSummary || '—'],
                      ...(form.conditionChangeNote ? [['病情变化说明', form.conditionChangeNote]] : []),
                    ].map(([key, value]) => (
                      <div key={key} className="px-4 py-2.5 border-t border-gray-100">
                        <div className="text-xs text-gray-400">{key}</div>
                        <div className="text-sm text-gray-800 mt-0.5">{value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    {[
                      ['初步诊断', `${form.diagnosis?.code || ''} ${form.diagnosis?.name || ''}`],
                      ['主诉', form.chiefComplaint],
                      ['转诊目的', outpatientTransferPurposeSummary],
                      ['当前病情评估', outpatientConditionAssessment || '未填写'],
                      ...(outpatientTransferPurpose.includes('other') && outpatientTransferPurposeOther ? [['其他转诊目的', outpatientTransferPurposeOther]] : []),
                      ...(form.reason ? [['补充说明', form.reason]] : []),
                      ['用药情况', form.medicationSummary || '—'],
                    ].map(([key, value]) => (
                      <div key={key} className="px-4 py-2.5 border-t border-gray-100">
                        <div className="text-xs text-gray-400">{key}</div>
                        <div className="text-sm text-gray-800 mt-0.5">{value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl overflow-hidden" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                  <span className="text-xs font-semibold" style={{ color: '#0892a0' }}>目标医院与处理方式</span>
                </div>
                <div className="grid grid-cols-3">
                  {[
                    ['目标医院', selectedInstitution?.name || '—'],
                    ['目标科室', form.toDept || '—'],
                    ['期望处理方式', admissionTypePrefLabel],
                  ].map(([key, value]) => (
                    <div key={key} className="px-4 py-2.5 border-t border-gray-100">
                      <div className="text-xs text-gray-400">{key}</div>
                      <div className="text-sm text-gray-800 font-medium mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl overflow-hidden" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                  <span className="text-xs font-semibold" style={{ color: '#0892a0' }}>已上传资料清单</span>
                </div>
                <div>
                  {renderUploadedSummaryRow('上传检查/检验资料', attachments)}
                  {renderUploadedSummaryRow('上传护理记录', nursingAttachments)}
                  {renderUploadedSummaryRow('上传知情同意', consentFile ? [consentFile] : [])}
                  <div className="px-4 py-2.5 border-t border-gray-100">
                    <div className="text-xs text-gray-400">签署人类型</div>
                    <div className="text-sm text-gray-800 mt-0.5">
                      {signerType === 'family' ? `家属代签（${signerRelation}）` : '患者本人'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#92400E' }}>
                <span>⚠️</span>
                <span>提交后将进入后续审核/受理流程，若资料不完整可能被退回补充。</span>
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
                    onClick={() => handleEmergencyEntryModeChange(option.value)}
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
                  补录模式仅记录转诊事实，不触发急诊科/专科实时通知，不发送患者短信，也不会开启15分钟紧急修改窗口。
                </div>
              )}
            </div>

            <div className="rounded-xl border p-4" style={{ background: '#FAFCFE', borderColor: '#FAD1D1' }}>
              <div className="text-sm font-semibold text-gray-800">患者资料获取</div>
              <div className="text-xs text-gray-500 mt-1">急诊发起可先检索患者主索引自动带出基本信息，也可新增患者后手工填写。</div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    handlePatientLink('search')
                    setPatientSearchQuery('')
                  }}
                  className="rounded-xl border px-4 py-3 text-left transition-colors"
                  style={patientLinkMode === 'search' || patientLinkMode === null
                    ? { borderColor: '#ef4444', background: '#FEF2F2' }
                    : { borderColor: '#E5E7EB', background: '#fff' }}
                >
                  <div className="text-sm font-semibold text-gray-800">🔍 搜索患者</div>
                  <div className="text-xs text-gray-500 mt-1">在医共体平台患者主索引中按姓名或身份证号搜索</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePatientLink('manual')
                    setPatientSearchQuery('')
                    clearLinkedPatientFields()
                  }}
                  className="rounded-xl border px-4 py-3 text-left transition-colors"
                  style={patientLinkMode === 'manual'
                    ? { borderColor: '#ef4444', background: '#FEF2F2' }
                    : { borderColor: '#E5E7EB', background: '#fff' }}
                >
                  <div className="text-sm font-semibold text-gray-800">✏️ 新增患者</div>
                  <div className="text-xs text-gray-500 mt-1">直接手工填写患者基本信息，再继续补充急诊转诊资料</div>
                </button>
              </div>

              {(patientLinkMode === 'search' || patientLinkMode === null) && !linkedPatient && (
                <div className="relative mt-4">
                  <input
                    type="text"
                    value={patientSearchQuery}
                    onChange={event => setPatientSearchQuery(event.target.value)}
                    placeholder="输入姓名或身份证号"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                  {patientSearchQuery && (
                    <div className="mt-1 border border-gray-200 rounded-lg shadow-sm bg-white">
                      {MOCK_INPATIENT_PATIENTS.filter(patient =>
                        patient.name.includes(patientSearchQuery) || patient.idCard.includes(patientSearchQuery)
                      ).map(patient => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => applyPatientLink(patient)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                        >
                          <div className="font-medium text-sm text-gray-800">{patient.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{patient.gender} · {patient.age}岁 · {patient.idCard.slice(0, 6)}****{patient.idCard.slice(-4)} · {patient.phone}</div>
                        </button>
                      ))}
                      {MOCK_INPATIENT_PATIENTS.filter(patient =>
                        patient.name.includes(patientSearchQuery) || patient.idCard.includes(patientSearchQuery)
                      ).length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-400">未找到匹配患者，请切换至新增患者</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {linkedPatient && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: '#FEE2E2', color: '#B91C1C' }}>✅ 已关联患者主索引</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearLinkedPatientFields()
                      setPatientSearchQuery('')
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    重新搜索
                  </button>
                </div>
              )}

              {patientLinkMode === 'manual' && !linkedPatient && (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  已切换为新增患者，请在下方手工填写患者基本信息后继续完成急诊转诊。
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">基本信息</h3>
              <div className="space-y-4">
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
                    readOnly={!!linkedPatient}
                    className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">联系电话 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.patientPhone}
                    onChange={event => setForm(prev => ({ ...prev, patientPhone: event.target.value }))}
                    placeholder="13800138000"
                    readOnly={!!linkedPatient}
                    className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`}
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
                        onClick={() => {
                          if (!linkedPatient) {
                            setForm(prev => ({ ...prev, patientGender: gender }))
                          }
                        }}
                        disabled={!!linkedPatient}
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
                    readOnly={!!linkedPatient}
                    className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">身份证号</label>
                  <input
                    type="text"
                    value={form.patientIdCard}
                    onChange={event => setForm(prev => ({ ...prev, patientIdCard: event.target.value }))}
                    placeholder="510623********1234"
                    readOnly={!!linkedPatient}
                    className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`}
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
              <h3 className="text-sm font-semibold text-gray-700 mb-3">转运评估</h3>
              <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">是否具备转运条件 <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-3">
                    {EMERGENCY_TRANSPORT_CONDITION_OPTIONS.map(option => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="emergencyTransportCondition"
                          value={option}
                          checked={emergencyTransportCondition === option}
                          onChange={() => setEmergencyTransportCondition(option)}
                        />
                        <span className="text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">转运需求</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {EMERGENCY_TRANSPORT_NEED_OPTIONS.map(option => (
                      <label key={option} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={emergencyTransportNeeds.includes(option)}
                          onChange={() => toggleEmergencyTransportNeed(option)}
                        />
                        <span className="text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
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

              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
                <span className="font-medium text-gray-700">接诊入口：急诊科</span>
                <span>急诊转诊由目标医院急诊科先行接诊</span>
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
                <div className="text-sm font-semibold text-red-800">确认提交摘要</div>
                <button type="button" onClick={() => setEmergencyStep(0)} className="text-xs text-red-500 hover:text-red-700">返回修改</button>
              </div>
              <div className="px-4 py-4 space-y-3">
                <div className="rounded-xl overflow-hidden" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div className="px-4 py-2" style={{ background: '#FEE2E2' }}>
                    <span className="text-xs font-semibold text-red-700">患者基础信息</span>
                  </div>
                  <div className="grid grid-cols-3">
                    {[
                      ['姓名', form.patientName],
                      ['性别', form.patientGender || '—'],
                      ['年龄', form.patientAge ? `${form.patientAge}岁` : '—'],
                      ['联系电话', form.patientPhone || '—'],
                      ['身份证号', form.patientIdCard ? `${form.patientIdCard.slice(0, 3)}****${form.patientIdCard.slice(-4)}` : '—'],
                      ['患者类型', '急诊'],
                    ].map(([key, value]) => (
                      <div key={key} className="px-4 py-2.5 border-t border-gray-100">
                        <div className="text-xs text-gray-400">{key}</div>
                        <div className="text-sm text-gray-800 font-medium mt-0.5">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div className="px-4 py-2" style={{ background: '#FEE2E2' }}>
                    <span className="text-xs font-semibold text-red-700">急诊信息</span>
                  </div>
                  <div className="grid grid-cols-2">
                    {[
                      ['录入方式', isRetroEntry ? '补录录入' : '实时转诊'],
                      ['初步诊断', `${form.diagnosis?.code || '—'} ${form.diagnosis?.name || '—'}`.trim()],
                      ['紧急程度', selectedUrgency?.label || '—'],
                      ['患者意识状态', consciousnessStatus === 'unclear' ? '意识不清' : consciousnessStatus === 'conscious' ? '意识清醒' : '—'],
                      ['患者到院时间', isRetroEntry && form.patientArrivedAt ? new Date(form.patientArrivedAt).toLocaleString('zh-CN') : '—'],
                      ['主诉 / 急转原因', form.chiefComplaint || '—'],
                    ].map(([key, value]) => (
                      <div key={key} className="px-4 py-2.5 border-t border-gray-100">
                        <div className="text-xs text-gray-400">{key}</div>
                        <div className="text-sm text-gray-800 font-medium mt-0.5">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div className="px-4 py-2" style={{ background: '#FEE2E2' }}>
                    <span className="text-xs font-semibold text-red-700">转运评估</span>
                  </div>
                  <div className="grid grid-cols-2">
                    {[
                      ['是否具备转运条件', emergencyTransportCondition || '—'],
                      ['转运需求', emergencyTransportNeeds.length > 0 ? emergencyTransportNeeds.join('、') : '—'],
                    ].map(([key, value]) => (
                      <div key={key} className="px-4 py-2.5 border-t border-gray-100">
                        <div className="text-xs text-gray-400">{key}</div>
                        <div className="text-sm text-gray-800 font-medium mt-0.5">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div className="px-4 py-2" style={{ background: '#FEE2E2' }}>
                    <span className="text-xs font-semibold text-red-700">接收准备</span>
                  </div>
                  <div className="grid grid-cols-3">
                    {[
                      ['目标医院', selectedInstitution?.name || '—'],
                      ['接诊入口', '急诊科'],
                      ['联动专科', linkedSpecialty || '—'],
                    ].map(([key, value]) => (
                      <div key={key} className="px-4 py-2.5 border-t border-gray-100">
                        <div className="text-xs text-gray-400">{key}</div>
                        <div className="text-sm text-gray-800 font-medium mt-0.5">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div className="px-4 py-2" style={{ background: '#FEE2E2' }}>
                    <span className="text-xs font-semibold text-red-700">已上传资料清单</span>
                  </div>
                  <div>
                    {renderUploadedSummaryRow('上传检查/检验资料', attachments)}
                    {renderUploadedSummaryRow('上传护理记录', nursingAttachments)}
                    {renderUploadedSummaryRow('上传知情同意', consentMethod === 'offline_upload' && consentFile ? [consentFile] : [], consentMethod === 'offline_upload' ? '未上传' : '待补传')}
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
                  middleContent={consentSignedBy === 'family' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">与患者关系 <span className="text-red-500">*</span></label>
                        <select value={signerRelation}
                          onChange={e => setSignerRelation(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                          <option value="">请选择</option>
                          {CONSENT_PROXY_RELATION_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">代签原因 <span className="text-red-500">*</span></label>
                        <select value={signerReason}
                          onChange={e => setSignerReason(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                          <option value="">请选择</option>
                          {CONSENT_PROXY_REASON_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : null}
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
      {showRetroConfirmModal && (
        <EmergencyRetroConfirmModal
          onCancel={() => setShowRetroConfirmModal(false)}
          onConfirm={() => {
            setEmergencyEntryMode('retro')
            setShowRetroConfirmModal(false)
          }}
        />
      )}
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

    </div>
  )
}

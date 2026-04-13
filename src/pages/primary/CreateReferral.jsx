import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ICD10_LIST, INSTITUTIONS } from '../../data/mockData'
import {
  buildEmergencyInitialSms,
  buildEmergencyUrgencyFeedback,
  canProceedEmergencyReferral,
  getEmergencyHospitalConfig,
  isValidChineseMainlandMobile,
} from '../../utils/emergencyReferral'

const URGENCY_LEVELS = [
  { level: 1, label: 'I级·急危', shortLabel: 'I级·急危', color: '#ef4444', bg: '#fef2f2' },
  { level: 2, label: 'II级·急重', shortLabel: 'II级·急重', color: '#f97316', bg: '#fff7ed' },
  { level: 3, label: 'III级·急症', shortLabel: 'III级·急症', color: '#eab308', bg: '#fefce8' },
  { level: 4, label: 'IV级·亚急', shortLabel: 'IV级·亚急', color: '#6b7280', bg: '#f9fafb' },
]

const NORMAL_STEPS = ['患者信息', '诊断及原因', '选择机构', '知情同意', '确认提交']
const EMERGENCY_STEPS = ['急诊信息', '确认提交']

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

function ConsentModal({ patient, onSign, onSendSMS, onClose }) {
  const [mode, setMode] = useState('qrcode')
  const [smsSent, setSmsSent] = useState(false)
  const [signed, setSigned] = useState(false)

  const handleSign = () => {
    setSigned(true)
    window.setTimeout(() => onSign(), 1500)
  }

  const handleSendSMS = () => {
    setSmsSent(true)
    window.setTimeout(() => onSendSMS(), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden">
        <div className="px-6 py-4 text-white" style={{ background: '#0BBECF' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg">患者知情同意签署</div>
              <div className="text-sm mt-0.5" style={{ color: '#d0f7fa' }}>患者：{patient?.name} · {patient?.phone}</div>
            </div>
            <button onClick={onClose} className="text-xl" style={{ color: '#a4edf5' }}>×</button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex gap-3 mb-5">
            <button
              onClick={() => setMode('qrcode')}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors"
              style={mode === 'qrcode'
                ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                : { background: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}
            >
              📱 患者在场扫码签署
            </button>
            <button
              onClick={() => setMode('sms')}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors"
              style={mode === 'sms'
                ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                : { background: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}
            >
              💬 发短信链接签署
            </button>
          </div>

          {mode === 'qrcode' ? (
            <div className="text-center">
              <div className="w-40 h-40 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 mb-4">
                <div className="text-4xl mb-1">📷</div>
                <div className="text-xs">知情同意二维码</div>
                <div className="text-xs text-gray-300 mt-1">（法大大·电子签名）</div>
              </div>
              <p className="text-sm text-gray-600 mb-2">请患者使用微信扫描上方二维码</p>
              <p className="text-xs text-gray-400 mb-4">签署完成后系统自动生成带时间戳PDF存档</p>

              {!signed ? (
                <button
                  onClick={handleSign}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  ✓ 模拟：患者已完成签署
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 py-3 bg-green-50 border border-green-200 rounded-lg text-green-600">
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-medium">签署完成，正在处理...</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-600 mb-2">短信将发送至患者手机：</div>
                <div className="font-mono text-base font-semibold text-gray-800">{patient?.phone}</div>
                <div className="text-xs text-gray-400 mt-1">短信内容：【双向转诊】您好，医生申请为您办理转诊，请点击链接签署知情同意书：[链接]</div>
              </div>

              {!smsSent ? (
                <button
                  onClick={handleSendSMS}
                  className="w-full py-2.5 text-white rounded-lg text-sm font-medium transition-colors"
                  style={{ background: '#0BBECF' }}
                >
                  📤 发送知情同意短信
                </button>
              ) : (
                <div>
                  <div className="flex items-center gap-2 py-3 bg-green-50 border border-green-200 rounded-lg text-green-600 px-4 mb-3">
                    <span>✅</span>
                    <span className="text-sm">短信已发送，等待患者签署...</span>
                  </div>
                  <div className="text-xs text-gray-500 text-center mb-3">患者完成签署后，可点击下方按钮继续。</div>
                  <button
                    onClick={handleSign}
                    className="w-full py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    患者已完成签署
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2">
            <span className="text-xs">ℹ️</span>
            <p className="text-xs text-gray-400">
              知情同意由法大大/e签宝提供电子签名服务，签署后生成带时间戳PDF文件存档，符合《电子签名法》要求
            </p>
          </div>
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
  const [showConsent, setShowConsent] = useState(false)
  const [consentDone, setConsentDone] = useState(false)
  const [urgencyLevel, setUrgencyLevel] = useState(null)
  const [linkedSpecialty, setLinkedSpecialty] = useState(null)
  const [consciousnessStatus, setConsciousnessStatus] = useState('')
  const [admissionTypePref, setAdmissionTypePref] = useState('outpatient')
  const [deptSuggestion, setDeptSuggestion] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [showEmergencySupplementary, setShowEmergencySupplementary] = useState(false)
  const [form, setForm] = useState({
    patientId: prefill?.patient?.id || '',
    patientName: prefill?.patient?.name || '',
    patientGender: prefill?.patient?.gender || '',
    patientAge: prefill?.patient?.age ? String(prefill.patient.age) : '',
    patientIdCard: prefill?.patient?.idCard || '',
    patientPhone: prefill?.patient?.phone || '',
    emergencyContactPhone: '',
    chiefComplaint: prefill?.chiefComplaint || '',
    diagnosis: prefill?.diagnosis || null,
    reason: prefill?.reason || '',
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

  const normalCanNext = [
    form.patientName && form.patientGender && form.patientAge && form.patientPhone,
    form.chiefComplaint && form.diagnosis && form.reason,
    form.toInstitutionId && form.toDept,
    consentDone,
    true,
  ][normalStep]

  const emergencyCanNext = [
    canProceedEmergencyReferral({
      patientName: form.patientName,
      patientPhone: form.patientPhone,
      urgencyLevel,
      consciousnessStatus,
      toInstitutionId: form.toInstitutionId,
    }),
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

  const handleAttachmentSelect = (event) => {
    const files = Array.from(event.target.files || [])
    const newFiles = files.map(file => ({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      type: file.type,
      url: URL.createObjectURL(file),
    }))
    setAttachments(prev => [...prev, ...newFiles])
    event.target.value = ''
  }

  const handleSelectFlow = (flow) => {
    setSelectedFlow(flow)
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
      consentSigned: consentDone,
      consentDeferred: false,
      logs: consentDone
        ? [{ time: new Date().toISOString(), actor: currentUser.name, action: '完成患者知情同意签署' }]
        : [],
    }

    const newId = submitForInternalReview(referralPayload)
    navigate(`/referral/${newId}`)
  }

  const handleEmergencySubmit = () => {
    const institution = INSTITUTIONS.find(item => item.id === form.toInstitutionId)
    const finalType = greenChannelSelected ? 'green_channel' : 'emergency'
    const fallbackDiagnosis = form.diagnosis || { code: '—', name: '未填写ICD-10诊断' }
    const newId = submitReferral({
      type: 'upward',
      patient: buildPatientPayload(),
      diagnosis: fallbackDiagnosis,
      chiefComplaint: form.chiefComplaint,
      reason: form.reason,
      fromInstitution: currentUser.institution,
      fromDoctor: currentUser.name,
      toInstitution: institution?.name,
      toDept: '急诊科',
      linkedSpecialty: linkedSpecialty || null,
      referral_type: finalType,
      urgencyLevel,
      consciousnessStatus: consciousnessStatus || null,
      is_emergency: true,
      admissionTypePref: 'outpatient',
      attachments: attachments.map(file => ({ name: file.name, size: file.size })),
      consentSigned: false,
      consentDeferred: true,
      logs: [
        { time: new Date().toISOString(), actor: currentUser.name, action: '急诊知情同意后置，待患者到院后补签' },
        ...(finalType === 'green_channel'
          ? [{ time: new Date().toISOString(), actor: currentUser.name, action: `启用绿色通道（${selectedUrgency?.label || '未标记分级'}）`, note: linkedSpecialty ? `联动专科：${linkedSpecialty}` : '' }]
          : [{ time: new Date().toISOString(), actor: currentUser.name, action: `发起急诊转诊（${selectedUrgency?.label || '未标记分级'}）`, note: linkedSpecialty ? `已通知联动专科：${linkedSpecialty}` : '' }]),
      ],
    })

    navigate(`/referral/${newId}`, {
      state: {
        submitSuccess: {
          referralId: newId,
          mode: 'emergency',
          title: '急诊转诊已提交',
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

  const renderAttachmentUploader = () => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        病历附件
        <span className="text-xs text-gray-400 font-normal ml-2">（选填，支持 PDF / JPG / PNG，单文件 ≤ 10MB）</span>
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
              onChange={handleAttachmentSelect}
            />
          </label>
        ) : (
          <div className="space-y-2">
            {attachments.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>{file.type?.includes('pdf') ? '📄' : '🖼️'}</span>
                  <span className="text-gray-800 truncate max-w-[220px]">{file.name}</span>
                  <span className="text-gray-400 text-xs">{file.size}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachments(prev => prev.filter((_, currentIndex) => currentIndex !== index))}
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
                onChange={handleAttachmentSelect}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  )

  const renderNormalFlow = () => (
    <>
      <StepProgress steps={NORMAL_STEPS} currentStep={normalStep} />
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        {normalStep === 0 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">患者基本信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">姓名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.patientName}
                  onChange={event => setForm(prev => ({ ...prev, patientName: event.target.value }))}
                  placeholder="患者姓名"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">性别 <span className="text-red-500">*</span></label>
                <div className="flex gap-3">
                  {['男', '女'].map(gender => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, patientGender: gender }))}
                      className="flex-1 py-2 rounded-lg text-sm border transition-colors"
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">年龄 <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={form.patientAge}
                  onChange={event => setForm(prev => ({ ...prev, patientAge: event.target.value }))}
                  placeholder="岁"
                  min={0}
                  max={150}
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {normalStep === 1 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">诊断及转诊原因</h2>
            <div className="space-y-4">
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
              {renderAttachmentUploader()}
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
            <p className="text-sm text-gray-500 mb-5">根据医疗规范，患者转诊前须完成知情同意签署。系统通过法大大/e签宝提供合法电子签名服务。</p>
            {!consentDone ? (
              <div className="space-y-3">
                <button
                  onClick={() => setShowConsent(true)}
                  className="w-full flex items-center justify-between px-5 py-4 text-white rounded-xl transition-colors"
                  style={{ background: '#0BBECF' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📱</span>
                    <div className="text-left">
                      <div className="font-semibold">患者在场 — 扫码签署</div>
                      <div className="text-sm" style={{ color: '#d0f7fa' }}>展示二维码，患者现场完成电子签名</div>
                    </div>
                  </div>
                  <span style={{ color: '#a4edf5' }}>›</span>
                </button>
                <button
                  onClick={() => setShowConsent(true)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💬</span>
                    <div className="text-left">
                      <div className="font-semibold">患者不在场 — 短信链接</div>
                      <div className="text-gray-400 text-sm">发送短信至 {form.patientPhone}，患者手机签署</div>
                    </div>
                  </div>
                  <span className="text-gray-300">›</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mb-4">✅</div>
                <div className="text-lg font-semibold text-green-700 mb-1">知情同意已完成</div>
                <div className="text-sm text-gray-500">患者已完成电子签名，系统已生成带时间戳PDF存档</div>
                <div className="mt-3 text-xs text-gray-400">签署时间：{new Date().toLocaleString('zh-CN')}</div>
              </div>
            )}
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
                    ['年龄', `${form.patientAge}岁`],
                    ['联系电话', form.patientPhone],
                    ['身份证号', form.patientIdCard || '—'],
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
              <p className="text-sm text-gray-500">面向急诊协同场景，固定由目标医院急诊科先行接诊，联动专科仅用于提前通知准备。</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">基本信息</h3>
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
                <div><span className="text-gray-500">目标医院：</span><span className="font-medium text-gray-800">{selectedInstitution?.name || '—'}</span></div>
                <div><span className="text-gray-500">接诊入口：</span><span className="font-medium text-gray-800">急诊科</span></div>
                <div><span className="text-gray-500">患者意识状态：</span><span className="font-medium text-gray-800">{consciousnessStatus === 'unclear' ? '意识不清' : consciousnessStatus === 'conscious' ? '意识清醒' : '—'}</span></div>
                <div><span className="text-gray-500">主诉/急转原因：</span><span className="font-medium text-gray-800">{form.chiefComplaint || '—'}</span></div>
                {linkedSpecialty && (
                  <div><span className="text-gray-500">联动专科：</span><span className="font-medium text-gray-800">{linkedSpecialty || '—'}</span></div>
                )}
              </div>
            </div>

            <div className="rounded-xl border px-4 py-4" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
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
            </div>

            <div className="rounded-xl border px-4 py-4" style={{ background: '#F3F4F6', borderColor: '#E5E7EB' }}>
              <div className="text-sm text-gray-600 leading-6">
                急诊场景可先提交，知情同意可按规则后补；患者意识状态将影响到院后的补签时点计算。
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
                  <div className="text-xs text-gray-400">请完善必填信息后继续</div>
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
                🚨 立即提交
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

      {showConsent && (
        <ConsentModal
          patient={{ name: form.patientName, phone: form.patientPhone }}
          onSign={() => { setConsentDone(true); setShowConsent(false) }}
          onSendSMS={() => { setConsentDone(true); setShowConsent(false) }}
          onClose={() => setShowConsent(false)}
        />
      )}
    </div>
  )
}

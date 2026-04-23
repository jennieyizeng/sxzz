import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ROLES, UPWARD_STATUS, DOWNWARD_STATUS, INSTITUTIONS } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'
import ReferralClosureTimeline from '../../components/ReferralClosureTimeline'
import MinimalArrangementStatusCard from '../../components/MinimalArrangementStatusCard'
import ArrangementModal from '../../components/ArrangementModal'
import ReferralSummaryCard from '../../components/ReferralSummaryCard'
import ClinicalStructuredSection from '../../components/ClinicalStructuredSection'
import RehabPlanSection from '../../components/RehabPlanSection'
import AttachmentSection from '../../components/AttachmentSection'
import StructuredReasonSelector from '../../components/StructuredReasonSelector'
import { buildClinicalPackage } from '../../utils/clinicalPackage'
import { getReferralClosureEvents } from '../../utils/referralClosureEvents'
import { getConsentInfo } from '../../utils/consentUpload'
import { canViewEmergencyModifyWindowInfo, canViewEmergencyReferralDetail, getEmergencyHospitalConfig } from '../../utils/emergencyReferral'
import { canCurrentCountyDoctorHandleOrdinaryUpward, canViewCountyUpwardReferralDetail } from '../../utils/countyReferralAccess'
import { getUpwardDetailSections } from '../../utils/upwardReferralDisplay'
import { getDownwardDetailSections } from '../../utils/downwardReferralDisplay'
import { getReferralDisplayStatus } from '../../utils/downwardStatusPresentation'
import {
  DEFAULT_PATIENT_NOTICE_TEMPLATE,
  buildMinimalArrangementStatusText,
  getAdmissionArrangementVisibility,
  getAppointmentCodeVisibility,
  renderPatientNoticeTemplate,
  shouldShowPatientNotice,
  shouldShowUpwardLogsTab,
} from '../../utils/upwardDetailPresentation'
import {
  buildStructuredReasonText,
  CANCEL_REASON_OPTIONS,
  DOWNWARD_CLOSE_REASON_OPTIONS,
  DOWNWARD_DOCTOR_REJECT_REASON_OPTIONS,
  DOWNWARD_INSTITUTION_RETURN_REASON_OPTIONS,
  INTERNAL_REJECT_REASON_OPTIONS,
  UPWARD_CLOSE_REASON_OPTIONS,
  UPWARD_REJECT_REASON_OPTIONS,
} from '../../constants/reasonCodes'

function formatTime(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function renderDetailValue(item) {
  if (item?.type === 'tags' && Array.isArray(item?.value)) {
    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {item.value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: '#E0F6F9', color: '#0892A0' }}
          >
            {tag}
          </span>
        ))}
      </div>
    )
  }

  if (Array.isArray(item?.value)) {
    return (
      <div className="space-y-1 mt-0.5">
        {item.value.map(value => (
          <div key={value} className="text-sm text-gray-800 font-medium">{value}</div>
        ))}
      </div>
    )
  }

  return <div className="text-sm text-gray-800 font-medium mt-0.5 whitespace-pre-line">{item?.value || '—'}</div>
}

function formatStructuredReasonDisplay(options, code, text, fallback = '—') {
  return buildStructuredReasonText(options, code, text) || fallback
}

const DOWNWARD_RECEIVER_OPTIONS = {
  'xx市拱星镇卫生院': [
    { id: 'u001', name: '王医生', team: '全科团队A', isReferralCoordinator: false },
    { id: 'u009', name: '李医生', team: '慢病管理组', isReferralCoordinator: false },
    { id: 'u001_head', name: '赵负责人', team: '全科团队', isReferralCoordinator: true },
  ],
  'xx市汉旺镇卫生院': [
    { id: 'u010', name: '周医生', team: '全科团队B', isReferralCoordinator: false },
    { id: 'u011', name: '陈医生', team: '慢病管理组', isReferralCoordinator: false },
    { id: 'u012_head', name: '刘负责人', team: '全科团队', isReferralCoordinator: true },
  ],
}

function getDownwardReceiverOptions(institutionName) {
  return (DOWNWARD_RECEIVER_OPTIONS[institutionName] || []).filter(item => !item.isReferralCoordinator)
}

// ── 确认对话框 ──
function ConfirmDialog({ title, description, inputLabel, inputRequired, onConfirm, onCancel, confirmText, confirmColor = 'blue' }) {
  const [inputVal, setInputVal] = useState('')
  const canConfirm = !inputRequired || inputVal.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-96 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
          {typeof description === 'string'
            ? <p className="text-sm text-gray-500 mt-1">{description}</p>
            : <div className="mt-2">{description}</div>}
        </div>
        <div className="p-6">
          {inputLabel && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{inputLabel}</label>
              <textarea
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                rows={3}
                placeholder="请填写原因（必填）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={onCancel}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              disabled={!canConfirm}
              onClick={() => onConfirm(inputVal)}
              className={`flex-1 py-2 rounded text-sm font-medium text-white transition-colors ${!canConfirm ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}`}
              style={canConfirm ? {
                background: confirmColor === 'red' ? '#ef4444' : confirmColor === 'green' ? '#10b981' : '#0BBECF'
              } : {}}
            >
              {confirmText || '确认'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StructuredReasonDialog({
  title,
  description,
  options,
  onConfirm,
  onCancel,
  confirmText,
  confirmColor = 'red',
  confirmLabel = '原因',
  canTransferUpToHigherLevel = true,
}) {
  const filteredOptions = options.filter(option => option.code !== 'need_higher_level' || canTransferUpToHigherLevel)
  const [reasonCode, setReasonCode] = useState('')
  const [reasonText, setReasonText] = useState('')
  const isOther = reasonCode === 'other'
  const canConfirm = !!reasonCode && (!isOther || !!reasonText.trim())

  function handleChange(next) {
    setReasonCode(next.reasonCode)
    setReasonText(next.reasonText)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        <div className="p-6 space-y-4">
          <div className="text-sm font-medium text-gray-700">{confirmLabel}（必填）</div>
          <StructuredReasonSelector
            options={filteredOptions}
            value={reasonCode}
            textValue={reasonText}
            onChange={handleChange}
            placeholder="如选择“其他”，请补充说明"
          />
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              disabled={!canConfirm}
              onClick={() => onConfirm({ reasonCode, reasonText: reasonText.trim() || null })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium text-white ${!canConfirm ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}`}
              style={canConfirm ? {
                background: confirmColor === 'green' ? '#10b981' : confirmColor === 'blue' ? '#0BBECF' : '#ef4444',
              } : {}}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NoticeDialog({ title, description, onClose, closeText = '知道了' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-96 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
        </div>
        <div className="p-6">
          {typeof description === 'string'
            ? <p className="text-sm text-gray-500 leading-6 whitespace-pre-line">{description}</p>
            : <div>{description}</div>}
          <div className="mt-5">
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#0BBECF' }}
            >
              {closeText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DownwardReturnDialog({ onConfirm, onCancel }) {
  return (
    <StructuredReasonDialog
      title="退回下转申请"
      description="请选择退回理由，系统将通知县级发起医生做后续处理。"
      options={DOWNWARD_INSTITUTION_RETURN_REASON_OPTIONS}
      confirmText="确认退回"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}

function CollaborativeCloseDialog({ onConfirm, onCancel, isUpward = false, canTransferUpToHigherLevel = true }) {
  return (
    <StructuredReasonDialog
      title="协商关闭转诊单"
      description="请选择协商关闭原因。"
      options={isUpward ? UPWARD_CLOSE_REASON_OPTIONS : DOWNWARD_CLOSE_REASON_OPTIONS}
      canTransferUpToHigherLevel={canTransferUpToHigherLevel}
      confirmText="确认关闭"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}

function EmergencySupplementDialog({
  referral,
  referrals,
  onConfirm,
  onCancel,
  title = '补录接诊信息',
  description = '患者到院后填写实际接诊信息，急诊不生成预约码。',
  confirmText = '保存补录信息',
}) {
  const institution = INSTITUTIONS.find(item => item.name === referral?.toInstitution)
  const departmentOptions = institution?.departments?.length ? institution.departments : ['急诊科']
  const initialDept = referral?.admissionArrangement?.department || referral?.admissionArrangement?.emergencyNotifiedDepts?.[0] || referral?.toDept || '急诊科'
  const initialDeptConfig = institution?.departmentInfo?.[initialDept]
  const initialArrivedAt = referral?.patientArrivedAt
    ? new Date(referral.patientArrivedAt).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16)
  const [form, setForm] = useState({
    patientArrivedAt: initialArrivedAt,
    department: initialDept,
    visitTime: initialArrivedAt,
    emergencyAdmissionType: referral?.emergencyAdmissionType || 'outpatient',
    specialistConsultRequested: !!referral?.specialistConsultRequested,
    doctorName: '',
    room: '',
    floor: '',
    departmentPhone: '',
    ward: initialDeptConfig?.ward || '',
    bedNumber: '',
    nurseStationPhone: initialDeptConfig?.nurseStationPhone || '',
  })

  const deptConfig = institution?.departmentInfo?.[form.department]
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const occupiedBeds = form.emergencyAdmissionType === 'inpatient'
    ? referrals.filter(item =>
        item.id !== referral?.id &&
        item.toInstitution === referral?.toInstitution &&
        (item.admissionArrangement?.department || item.toDept) === form.department &&
        item.bedStatus === 'bed_reserved' &&
        item.admissionArrangement?.bedReservedAt &&
        new Date(item.admissionArrangement.bedReservedAt) >= todayStart
      ).length
    : 0
  const bedTotal = deptConfig?.dailyReservedBeds ?? 0
  const bedRemaining = Math.max(bedTotal - occupiedBeds, 0)
  const canConfirm = form.department.trim() && form.visitTime && form.patientArrivedAt && form.emergencyAdmissionType

  function update(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'patientArrivedAt' && prev.visitTime === prev.patientArrivedAt) {
        next.visitTime = value
      }
      if (field === 'department') {
        const nextDeptConfig = institution?.departmentInfo?.[value]
        next.departmentPhone = value === '急诊科'
          ? (institution?.emergencyDeptPhone || '')
          : (nextDeptConfig?.nurseStationPhone || '')
        next.ward = nextDeptConfig?.ward || ''
        next.nurseStationPhone = nextDeptConfig?.nurseStationPhone || ''
      }
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">患者到院时间 *</label>
            <div className="flex items-center gap-3">
              <input type="datetime-local" value={form.patientArrivedAt} onChange={e => update('patientArrivedAt', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
              <span className="text-xs text-gray-400 whitespace-nowrap">此时间为知情同意补签24小时的起算基准</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">实际接诊科室 *</label>
            <select value={form.department} onChange={e => update('department', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200">
              {departmentOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">按目标医院已配置科室选择，避免补录口径不一致。</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">实际承接方式 *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'outpatient', label: '门诊' },
                { value: 'inpatient', label: '住院' },
                { value: 'observation', label: '留观' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update('emergencyAdmissionType', option.value)}
                  className="py-2 rounded-lg border text-sm transition-colors"
                  style={form.emergencyAdmissionType === option.value
                    ? { borderColor: '#ef4444', background: '#fef2f2', color: '#b91c1c', fontWeight: '500' }
                    : { borderColor: '#d1d5db', color: '#4b5563' }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">实际就诊时间 *</label>
            <input type="datetime-local" value={form.visitTime} onChange={e => update('visitTime', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
          </div>
          {form.emergencyAdmissionType === 'inpatient' && (
            <div className="rounded-lg border px-4 py-4" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <div className="text-sm font-medium text-blue-800 mb-2">住院信息</div>
              {bedTotal > 0 && (
                <div className="text-xs text-blue-700 mb-3">今日剩余 {bedRemaining}/{bedTotal} 床</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">病区</label>
                  <input value={form.ward} onChange={e => update('ward', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">床位号</label>
                  <input value={form.bedNumber} onChange={e => update('bedNumber', e.target.value)} placeholder="可填“入院时由护士站安排”" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">护士站电话</label>
                  <input value={form.nurseStationPhone} onChange={e => update('nurseStationPhone', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              </div>
            </div>
          )}
          {referral?.referral_type === 'green_channel' && (
            <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-gray-700">是否启动专科会诊</div>
                <div className="text-xs text-gray-400 mt-0.5">记录用途，V2版本将对接远程会诊模块</div>
              </div>
              <button
                type="button"
                onClick={() => update('specialistConsultRequested', !form.specialistConsultRequested)}
                className={`w-11 h-6 rounded-full relative transition-colors ${form.specialistConsultRequested ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${form.specialistConsultRequested ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">实际接诊医生</label>
              <input value={form.doctorName} onChange={e => update('doctorName', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">科室联系电话</label>
              <input value={form.departmentPhone} onChange={e => update('departmentPhone', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">诊室/区域</label>
              <input value={form.room} onChange={e => update('room', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">楼层</label>
              <input value={form.floor} onChange={e => update('floor', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">取消</button>
            <button
              disabled={!canConfirm}
              onClick={() => onConfirm(form)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium text-white ${!canConfirm ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}`}
              style={canConfirm ? { background: '#ef4444' } : {}}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmergencyModifyDialog({ referral, onConfirm, onCancel, remainingText }) {
  const hospitalConfig = getEmergencyHospitalConfig(INSTITUTIONS)
  const countyInstitutions = hospitalConfig.hospitals
  const initialInstitution = countyInstitutions.find(item => item.name === referral?.toInstitution)?.id || countyInstitutions[0]?.id || ''
  const [institutionId, setInstitutionId] = useState(initialInstitution)
  const [linkedSpecialty, setLinkedSpecialty] = useState(referral?.linkedSpecialty || '')

  const selectedInstitution = countyInstitutions.find(item => item.id === institutionId)
  const specialtyOptions = (selectedInstitution?.departments || []).filter(item => item !== '急诊科')

  const canConfirm = !!institutionId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-lg">紧急修改目标信息</h3>
          <p className="text-sm text-red-500 mt-1">修改窗口剩余 {remainingText}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标接收机构 *</label>
            {hospitalConfig.mode === 'single' ? (
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">
                {selectedInstitution?.name || referral?.toInstitution}（唯一签约医院，不可修改）
              </div>
            ) : (
              <select
                value={institutionId}
                onChange={e => {
                  const nextId = e.target.value
                  setInstitutionId(nextId)
                  const nextInstitution = countyInstitutions.find(item => item.id === nextId)
                  if (!(nextInstitution?.departments || []).includes(linkedSpecialty)) {
                    setLinkedSpecialty('')
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                {countyInstitutions.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">接诊入口</label>
            <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
              急诊科
            </div>
            <div className="text-xs text-gray-400 mt-2">急诊转诊固定由目标医院急诊科先行接诊</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">联动专科通知</label>
            <select
              value={linkedSpecialty}
              onChange={e => setLinkedSpecialty(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">不额外联动专科</option>
              {specialtyOptions.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <div className="text-xs text-gray-400 mt-2">仅用于同步通知相关专科做接诊准备，不改变急诊科接诊入口</div>
          </div>
          <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            修改后系统将重新通知相关方，并向患者重新发送更新短信
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">取消</button>
            <button
              disabled={!canConfirm}
              onClick={() => onConfirm({ toInstitutionId: institutionId, linkedSpecialty })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium text-white ${!canConfirm ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}`}
              style={canConfirm ? { background: '#f97316' } : {}}
            >
              确认修改
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DownwardReassignDialog({ referral, mode = 'reassign', onConfirm, onCancel, transferLabel = '下转' }) {
  const rejectedDoctorIds = new Set(referral?.rejectedDoctorIds || [])
  const doctorOptions = getDownwardReceiverOptions(referral?.toInstitution)
  const [doctorId, setDoctorId] = useState('')
  const selectedDoctor = doctorOptions.find(item => item.id === doctorId)
  const canConfirm = !!selectedDoctor
  const isInitialAssign = mode === 'assign'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-lg">{isInitialAssign ? `分配${transferLabel}申请` : `改派${transferLabel}申请`}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isInitialAssign
              ? '请选择基层接收医生，完成首次分配。'
              : '请选择新的基层接收医生。已拒绝过的医生会置灰，不可重复改派。'}
          </p>
        </div>
        <div className="p-6 space-y-3">
          {doctorOptions.length === 0 ? (
            <div className="text-sm text-gray-400">当前机构暂无可改派医生，请选择“本人直接接收”或“退回申请”。</div>
          ) : doctorOptions.map(doctor => {
            const disabled = rejectedDoctorIds.has(doctor.id)
            return (
              <button
                key={doctor.id}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setDoctorId(doctor.id)}
                className={`w-full text-left border rounded-xl p-4 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={doctorId === doctor.id
                  ? { borderColor: '#0BBECF', background: '#F0FBFC', boxShadow: '0 0 0 2px #a4edf5' }
                  : { borderColor: '#e5e7eb', background: '#fff' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{doctor.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{doctor.team}</div>
                  </div>
                  {disabled && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">已拒绝</span>
                  )}
                </div>
              </button>
            )
          })}
          <div className="flex gap-3 pt-2">
            <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">取消</button>
            <button
              disabled={!canConfirm}
              onClick={() => canConfirm && onConfirm(selectedDoctor.id, selectedDoctor.name)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium text-white ${!canConfirm ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}`}
              style={canConfirm ? { background: '#0BBECF' } : {}}
            >
              {isInitialAssign ? '确认分配' : '确认改派'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Assumption: is_emergency 字段由后端返回，mockData 中仅 REF2026001 有示例值，其余记录缺省视为 false

export default function ReferralDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    currentRole, currentUser, referrals,
    acceptReferral, rejectReferral, cancelReferral, closeReferral, collaborativeCloseReferral, reopenReferral, completeReferral, completeRetroEmergencyReferral,
    acceptDownwardReferral, completeDownwardReferral, rejectDownwardReferral, cancelDownwardReferral,
    reassignDownwardReferral, selfAcceptDownwardReferral, rejectDownwardByCoordinator,
    approveInternalReview, rejectInternalReview, fillAdmissionArrangement, supplementEmergencyAdmission, emergencyModifyReferral,
    markEmergencyFirstViewed, confirmEmergencyPatientNotified,
  } = useApp()

  const ref = referrals.find(r => r.id === id)
  const [activeTab, setActiveTab] = useState('detail')
  const [dialog, setDialog] = useState(null) // null | { type, ... }
  const [admissionType, setAdmissionType] = useState('outpatient') // P0-3 承接方式
  // S-02：知情同意记录折叠状态
  const [showConsentRecord, setShowConsentRecord] = useState(false)
  const [showAuditHistory, setShowAuditHistory] = useState(true) // 默认展开
  const [showMessageRecord, setShowMessageRecord] = useState(false)
  // M-7：管理员填写接诊安排 Modal
  const [showArrangementModal, setShowArrangementModal] = useState(false)
  // 变更五：模拟短信预览弹窗
  const [showSmsPreview, setShowSmsPreview] = useState(false)
  const [showEmergencySuccessSms, setShowEmergencySuccessSms] = useState(false)
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (currentRole === ROLES.ADMIN && ref?.is_emergency && !ref?.firstViewedAt) {
      markEmergencyFirstViewed(id)
    }
  }, [currentRole, id, markEmergencyFirstViewed, ref?.firstViewedAt, ref?.is_emergency])

  const isUpward = ref?.type === 'upward'
  const isDownward = ref?.type === 'downward'

  if (!ref) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-400 text-lg">找不到转诊单</div>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline text-sm">← 返回</button>
      </div>
    )
  }
  const isAdmin = currentRole === ROLES.ADMIN
  const downwardAllocationMode = ref.allocationMode || (ref.designatedDoctorId ? 'designated' : 'coordinator')
  const isEmergencyReferral = !!ref.is_emergency
  const isRetroEntry = !!ref.isRetroEntry
  const isGreenChannel = ref.referral_type === 'green_channel'  // CHG-30
  const clinicalPackage = buildClinicalPackage(ref)
  const emergencyModifiableUntilTs = isEmergencyReferral
    ? new Date(ref.emergencyModifiableUntil || (new Date(new Date(ref.createdAt).getTime() + 15 * 60 * 1000).toISOString())).getTime()
    : null
  const emergencyWindowRemainingMs = emergencyModifiableUntilTs ? Math.max(0, emergencyModifiableUntilTs - nowTs) : 0
  const emergencyWindowOpen = emergencyModifiableUntilTs ? nowTs < emergencyModifiableUntilTs : false
  const emergencyWindowMinutes = String(Math.floor(emergencyWindowRemainingMs / 60000)).padStart(2, '0')
  const emergencyWindowSeconds = String(Math.floor((emergencyWindowRemainingMs % 60000) / 1000)).padStart(2, '0')
  const emergencySupplementPending = isEmergencyReferral && !ref.admissionArrangement?.department
  const emergencySupplemented = isEmergencyReferral && !!ref.admissionArrangement?.department
  const emergencySubmitState = location.state?.submitSuccess?.referralId === id ? location.state.submitSuccess : null
  const hasPendingEmergencyModifyNotice = !!ref.emergencyModifyAt && !ref.emergencyModifyNotifiedAt
  // CHG-39: 详情页统一使用新知情同意字段，旧字段作为兼容回退
  const consentInfo = getConsentInfo(ref)
  const consentPreviewAvailable = !!consentInfo.consentFileUrl
  const isTerminalReferralStatus = [
    UPWARD_STATUS.COMPLETED,
    UPWARD_STATUS.CANCELLED,
    UPWARD_STATUS.CLOSED,
    DOWNWARD_STATUS.COMPLETED,
    DOWNWARD_STATUS.RETURNED,
    DOWNWARD_STATUS.CANCELLED,
    DOWNWARD_STATUS.CLOSED,
  ].includes(ref.status)
  const canShowConsentUploadPlaceholder = consentInfo.isPendingUpload && currentUser?.name === ref.fromDoctor && !isTerminalReferralStatus
  const upwardDetailSections = isUpward ? getUpwardDetailSections(ref, consentInfo) : []
  const downwardDetailSections = isDownward ? getDownwardDetailSections(ref, consentInfo) : []
  const closureEvents = getReferralClosureEvents(ref)
  const arrangementVisibility = getAdmissionArrangementVisibility({ currentRole, isUpward })
  const appointmentCodeVisibility = getAppointmentCodeVisibility({ currentRole, isUpward, isEmergencyReferral })
  const showLogsTab = shouldShowUpwardLogsTab({ currentRole, isUpward })
  const patientNoticeTemplate = INSTITUTIONS.find(item => item.name === ref.toInstitution)?.patientNoticeTemplate || DEFAULT_PATIENT_NOTICE_TEMPLATE
  const detailTabs = [
    { key: 'detail', label: '申请详情' },
    !isDownward ? { key: 'clinical', label: '转诊资料' } : null,
    showLogsTab ? { key: 'logs', label: `操作日志 (${ref.logs?.length || 0})` } : null,
    { key: 'history', label: '患者历史转诊' },
  ].filter(Boolean)
  const currentTab = isDownward && activeTab === 'clinical' ? 'detail' : activeTab

  // ── 角色操作权限判断 ──
  const isCountyAttendingDoctor = currentRole === ROLES.COUNTY
  const isCountyDepartmentHead = currentRole === ROLES.COUNTY2
  const isCountyDoctor = isCountyAttendingDoctor || isCountyDepartmentHead
  const isPrimaryDoctor = currentRole === ROLES.PRIMARY
  const isPrimaryCoordinator = currentRole === ROLES.PRIMARY_HEAD && currentUser?.institution === ref.toInstitution
  const isPrimaryScopedRole = [ROLES.PRIMARY, ROLES.PRIMARY_HEAD].includes(currentRole)
  const isCountyScopedRole = [ROLES.COUNTY, ROLES.COUNTY2].includes(currentRole)
  const upwardDisplayLabel = isPrimaryScopedRole ? '转出' : isCountyScopedRole ? '转入' : '上转'
  const downwardDisplayLabel = isPrimaryScopedRole ? '转入' : isCountyScopedRole ? '转出' : '下转'
  const currentTransferLabel = isUpward ? upwardDisplayLabel : downwardDisplayLabel
  const displayedStatus = getReferralDisplayStatus(ref, { role: currentRole, userId: currentUser?.id })
  const isCountyInitiator = isCountyDoctor && currentUser?.name === ref.fromDoctor
  const isDownwardAssignedDoctor = ref.downwardAssignedDoctorId === currentUser?.id
  const isDesignatedDoctor = ref.designatedDoctorId === currentUser?.id
  const canTransferUpToHigherLevel = isUpward && isCountyAttendingDoctor
  const canViewEmergencyModifyInfo = canViewEmergencyModifyWindowInfo({
    currentRole,
    currentUserName: currentUser?.name,
    fromDoctor: ref.fromDoctor,
    isEmergencyReferral,
    isUpward,
    status: ref.status,
  })
  const canViewEmergencyDetail = canViewEmergencyReferralDetail({
    currentRole,
    currentUser,
    referral: ref,
  })
  const canViewCountyOrdinaryUpwardDetail = canViewCountyUpwardReferralDetail({
    currentRole,
    currentUser,
    referral: ref,
  })

  if (isEmergencyReferral && !canViewEmergencyDetail) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-400 text-lg">当前角色无权查看该急诊转诊单</div>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline text-sm">← 返回</button>
      </div>
    )
  }

  if (isUpward && !isEmergencyReferral && isCountyDoctor && !canViewCountyOrdinaryUpwardDetail) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-400 text-lg">当前角色无权查看该普通{upwardDisplayLabel}转诊单</div>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline text-sm">← 返回</button>
      </div>
    )
  }

  // P0-6：受理锁定——只有经办医生（或未受理时）才可接收/拒绝，改用 assignedDoctorId 比较
  const claimLockOk = !ref.assignedDoctorId || ref.assignedDoctorId === currentUser?.id
  const canAcceptUpward = isCountyAttendingDoctor && !isEmergencyReferral && ref.status === UPWARD_STATUS.PENDING && claimLockOk && canCurrentCountyDoctorHandleOrdinaryUpward(ref, currentUser)
  const canRejectUpward = isCountyAttendingDoctor && !isEmergencyReferral && ref.status === UPWARD_STATUS.PENDING && claimLockOk && canCurrentCountyDoctorHandleOrdinaryUpward(ref, currentUser)
  const canCompleteUpward = isAdmin && isUpward && ref.status === UPWARD_STATUS.IN_TRANSIT && (
    isEmergencyReferral ? emergencySupplemented : !!ref.admissionArrangement
  )
  // C-3 修复：PENDING_INTERNAL_REVIEW 状态下基层医生也可撤销（state-machine v1.3）
  // 注意：PRIMARY_HEAD 是审核人，不应有撤销权限，故此处只允许 ROLES.PRIMARY
  const canCancelUpward = currentRole === ROLES.PRIMARY && (ref.status === UPWARD_STATUS.PENDING || ref.status === UPWARD_STATUS.PENDING_INTERNAL_REVIEW)
  const canCollaborativeCloseUpward = isUpward && ref.status === UPWARD_STATUS.IN_TRANSIT && (
    currentRole === ROLES.PRIMARY || isCountyAttendingDoctor || (isAdmin && (isEmergencyReferral || !!ref.admissionArrangement))
  )
  const canCollaborativeCloseDownward = isDownward && ref.status === DOWNWARD_STATUS.IN_TRANSIT && (
    isCountyInitiator || isDownwardAssignedDoctor
  )
  const canCollaborativeClose = canCollaborativeCloseUpward || canCollaborativeCloseDownward
  const canEmergencyModify = currentRole === ROLES.PRIMARY &&
    isUpward &&
    isEmergencyReferral &&
    !isRetroEntry &&
    ref.status === UPWARD_STATUS.IN_TRANSIT &&
    emergencyWindowOpen &&
    currentUser?.name === ref.fromDoctor
  const emergencyModifyLocked = currentRole === ROLES.PRIMARY &&
    isUpward &&
    isEmergencyReferral &&
    !isRetroEntry &&
    ref.status === UPWARD_STATUS.IN_TRANSIT &&
    !emergencyWindowOpen &&
    currentUser?.name === ref.fromDoctor
  // CHG-32：下转受理锁（同上转受理锁逻辑）
  const canAcceptDownward = isPrimaryDoctor && isDownward && ref.status === DOWNWARD_STATUS.PENDING && isDesignatedDoctor
  const canCompleteDownward = isPrimaryDoctor && isDownward && ref.status === DOWNWARD_STATUS.IN_TRANSIT && isDownwardAssignedDoctor
  const canRejectDownward = isPrimaryDoctor && isDownward && ref.status === DOWNWARD_STATUS.PENDING && isDesignatedDoctor
  const canCancelDownward = isCountyInitiator && isDownward && [DOWNWARD_STATUS.PENDING].includes(ref.status)
  const canCoordinatorManageDownward = isPrimaryCoordinator && isDownward && ref.status === DOWNWARD_STATUS.PENDING && ['coordinator', 'coordinator_reassign'].includes(downwardAllocationMode)
  const canCoordinatorReassignDownward = canCoordinatorManageDownward
  const canCoordinatorSelfAcceptDownward = canCoordinatorManageDownward
  const canCoordinatorRejectDownward = canCoordinatorManageDownward

  // CHG-32：科主任院内审核权限
  const isPrimaryHead = currentRole === ROLES.PRIMARY_HEAD
  const canApproveInternalReview = isPrimaryHead && isUpward && ref.status === UPWARD_STATUS.PENDING_INTERNAL_REVIEW
  const canRejectInternalReview = isPrimaryHead && isUpward && ref.status === UPWARD_STATUS.PENDING_INTERNAL_REVIEW

  // 修复 B：被拒绝后的后续操作入口
  const canRejectedFollowUpUpward = isPrimaryDoctor && isUpward && ref.status === UPWARD_STATUS.REJECTED

  // 问题三修复：草稿状态 + 有内审拒绝记录 → 基层医生可修改并重新提交
  const hasInternalRejection = (ref.internalAuditLog || []).some(
    e => e.result === 'rejected' || e.action === 'INTERNAL_AUDIT_REJECT'
  )
  const canResubmitAfterInternalReject = currentRole === ROLES.PRIMARY && isUpward &&
    ref.status === UPWARD_STATUS.DRAFT && hasInternalRejection
  const canRejectedFollowUpDownward = isCountyDoctor && isDownward && displayedStatus === DOWNWARD_STATUS.RETURNED

  // 修复 C：管理员介入按钮
  // TODO: 生产环境替换为真实超时判断（pending_review > 24h、in_transfer > 48h、pending_accept > 24h）
  // 原型 mock 模式：直接显示按钮，不做时间判断，以确保演示时管理员能看到
  const adminCanUrgeUpwardReview = isAdmin && isUpward && !isEmergencyReferral && ref.status === UPWARD_STATUS.PENDING
  const adminCanUrgeDownwardAccept = isAdmin && isDownward && ref.status === DOWNWARD_STATUS.PENDING
  // M-7：管理员可在详情页直接填写接诊安排（role-permission-matrix v1.3 第3A节）
  const adminCanArrange = isAdmin && isUpward && !isEmergencyReferral && ref.status === UPWARD_STATUS.IN_TRANSIT && !ref.admissionArrangement
  const adminCanRetroCompleteEmergency = isAdmin && isUpward && isEmergencyReferral && isRetroEntry && ref.status === UPWARD_STATUS.IN_TRANSIT && emergencySupplementPending
  const adminCanSupplementEmergency = isAdmin && isUpward && ref.status === UPWARD_STATUS.IN_TRANSIT && emergencySupplementPending && !isRetroEntry
  const adminCanCompleteEmergency = isAdmin && isUpward && ref.status === UPWARD_STATUS.IN_TRANSIT && emergencySupplemented

  const handleAction = (type) => {
    switch (type) {
      case 'acceptUpward':
        setAdmissionType('outpatient')
        setDialog({ type: 'acceptUpward' })
        break
      case 'acceptUpwardConfirm':
        acceptReferral(id, admissionType)
        setDialog(null)
        break
      case 'rejectUpward':
        // open dialog
        setDialog({ type: 'rejectUpward' })
        break
      case 'rejectUpwardConfirm':
        rejectReferral(id, dialog.reason)
        setDialog(null)
        break
      case 'cancelUpward':
        setDialog({ type: 'cancelUpward' })
        break
      case 'cancelUpwardConfirm':
        cancelReferral(id, dialog.reason)
        setDialog(null)
        break
      case 'cancelDownward':
        setDialog({ type: 'cancelDownward' })
        break
      case 'cancelDownwardConfirm':
        cancelDownwardReferral(id, dialog.reason)
        setDialog(null)
        break
      case 'completeUpward':
        setDialog({ type: 'completeUpward' })
        break
      case 'completeUpwardConfirm':
        completeReferral(id)
        setDialog(null)
        break
      case 'supplementEmergency':
        setDialog({ type: 'supplementEmergency' })
        break
      case 'supplementEmergencyConfirm':
        supplementEmergencyAdmission(id, dialog.form)
        setDialog(null)
        break
      case 'completeRetroEmergency':
        setDialog({ type: 'completeRetroEmergency' })
        break
      case 'completeRetroEmergencyConfirm':
        completeRetroEmergencyReferral(id, dialog.form)
        setDialog(null)
        break
      case 'emergencyModify':
        setDialog({ type: 'emergencyModify' })
        break
      case 'emergencyModifyConfirm':
        emergencyModifyReferral(id, dialog.form)
        setDialog(null)
        break
      case 'confirmPatientNotified':
        confirmEmergencyPatientNotified(id)
        break
      case 'collaborativeClose':
        setDialog({ type: 'collaborativeClose' })
        break
      case 'collaborativeCloseConfirm':
        collaborativeCloseReferral(id, dialog.reason)
        setDialog(null)
        break
      case 'acceptDownward':
        acceptDownwardReferral(id)
        setDialog(null)
        break
      case 'completeDownward':
        setDialog({ type: 'completeDownward' })
        break
      case 'completeDownwardConfirm':
        completeDownwardReferral(id)
        setDialog(null)
        break
      case 'rejectDownward':
        setDialog({ type: 'rejectDownward' })
        break
      case 'rejectDownwardConfirm':
        rejectDownwardReferral(id, dialog.reason)
        setDialog(null)
        break
      case 'reassignDownward':
        setDialog({ type: 'reassignDownward' })
        break
      case 'reassignDownwardConfirm':
        reassignDownwardReferral(id, dialog.doctorId, dialog.doctorName)
        setDialog(null)
        break
      case 'selfAcceptDownward':
        selfAcceptDownwardReferral(id)
        setDialog(null)
        break
      case 'rejectDownwardByCoordinator':
        setDialog({ type: 'rejectDownwardByCoordinator' })
        break
      case 'rejectDownwardByCoordinatorConfirm':
        rejectDownwardByCoordinator(id, dialog.reason)
        setDialog(null)
        break

      // 修复 B：被拒绝后的后续操作
      case 'changeInstitution':
        setDialog({ type: 'changeInstitution' })
        break
      case 'changeInstitutionConfirm':
        // 换机构重新申请：关闭当前单（已关闭），跳转到对应发起页并携带患者基本信息预填
        closeReferral(id, '患者换机构重新申请，当前转诊单关闭')
        setDialog(null)
        navigate(isDownward ? '/county/create-downward' : '/primary/create-referral', {
          state: { prefill: { patient: ref.patient, diagnosis: ref.diagnosis } },
        })
        break
      case 'resubmit':
        setDialog({ type: 'resubmit' })
        break
      case 'resubmitConfirm':
        // 修改重提：重置当前单回「待受理」，经办医生清空，重新进入受理队列
        reopenReferral(id)
        setDialog(null)
        break
      case 'resubmitInternalReject':
        // 内审拒绝后修改重提：携带全量表单数据跳转创建页预填
        navigate('/primary/create-referral', {
          state: {
            prefill: {
              patient: ref.patient,
              diagnosis: ref.diagnosis,
              chiefComplaint: ref.chiefComplaint,
              reason: ref.reason,
              toInstitution: ref.toInstitution,
              toDept: ref.toDept,
              originalDraftId: ref.id,   // 供 CreateReferral 知晓来源，可选用于关闭旧草稿
            }
          }
        })
        break

      case 'terminateRejected':
        setDialog({ type: 'terminateRejected' })
        break
      case 'terminateRejectedConfirm':
        // 终止申请目标状态为 CLOSED（已关闭），与 cancelReferral（已撤销）语义不同
        closeReferral(id, dialog.reason)
        setDialog(null)
        break

      // CHG-32：院内审核（科主任）
      case 'approveInternal':
        setDialog({ type: 'approveInternal' })
        break
      case 'approveInternalConfirm':
        approveInternalReview(id, dialog.comment || '')
        setDialog(null)
        break
      case 'rejectInternal':
        setDialog({ type: 'rejectInternal' })
        break
      case 'rejectInternalConfirm':
        rejectInternalReview(id, dialog.reason)
        setDialog(null)
        break

      // 修复 C：管理员催办
      case 'adminUrge':
        // TODO: 生产环境对接催办通知推送接口
        setDialog({
          type: 'notice',
          title: '催办通知已发送',
          description: '系统已向相关医生发送催办提醒。'
        })
        break
    }
  }

  const emergencyElapsedMinutes = isEmergencyReferral ? Math.max(0, Math.floor((nowTs - new Date(ref.createdAt).getTime()) / 60000)) : 0
  const emergencyElapsedHours = Math.floor(emergencyElapsedMinutes / 60)
  const emergencyElapsedRemainMinutes = emergencyElapsedMinutes % 60
  const maskedPatientPhone = ref.patient?.phone?.replace(/^(\d{3})\d*(\d{4})$/, '$1****$2') || ref.patient?.phone || '—'
  const messageTimeline = (ref.patientSmsLog || []).map(item => ({
    ...item,
    label: item.kind === 'initial'
      ? '首发短信'
      : item.kind === 'modify'
        ? '紧急修改短信'
        : item.kind === 'completion'
          ? '就诊确认短信'
      : '短信记录',
    status: item.status || '已送达',
  }))
  const rejectReasonLabel = isDownward && displayedStatus === DOWNWARD_STATUS.RETURNED
    ? formatStructuredReasonDisplay(
        DOWNWARD_INSTITUTION_RETURN_REASON_OPTIONS,
        ref.institutionRejectReasonCode || ref.rejectReasonCode,
        ref.institutionRejectReasonText || ref.returnReason || ref.rejectReason,
        ref.rejectReason || ref.returnReason || '—',
      )
    : formatStructuredReasonDisplay(
        UPWARD_REJECT_REASON_OPTIONS,
        ref.rejectReasonCode,
        ref.rejectReasonText || ref.rejectReason,
        ref.rejectReason || '—',
      )
  const cancelReasonLabel = formatStructuredReasonDisplay(
    CANCEL_REASON_OPTIONS,
    ref.cancelReasonCode,
    ref.cancelReasonText || ref.closeReason,
    ref.closeReason || '—',
  )
  const closeReasonLabel = formatStructuredReasonDisplay(
    isDownward ? DOWNWARD_CLOSE_REASON_OPTIONS : UPWARD_CLOSE_REASON_OPTIONS,
    ref.closeReasonCode,
    ref.closeReasonText || ref.closeReason,
    ref.closeReason || '—',
  )
  const showTransferUpCloseActions = isUpward
    && ref.status === UPWARD_STATUS.CLOSED
    && ((ref.closeReasonCode === 'need_higher_level') || ref.closeReason === '需转诊至上级机构')
  const completionSmsPreview = isEmergencyReferral
    ? `【就诊确认】您在${ref.toInstitution || '目标医院'}的急诊
转诊已完成接诊确认。
实际就诊科室：${ref.admissionArrangement?.department || ref.toDept || '—'}
承接方式：${ref.emergencyAdmissionType === 'inpatient'
      ? `住院收治（病区：${ref.admissionArrangement?.ward || '—'}，护士站电话：${ref.admissionArrangement?.nurseStationPhone || '—'}）`
      : ref.emergencyAdmissionType === 'observation'
        ? '留观处理'
        : '门诊就诊'}
如有疑问请联系：${ref.admissionArrangement?.departmentPhone || '—'}`
    : null

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => navigate(-1)} className="hover:text-primary-600" style={{ color: '#0BBECF' }}>← 返回</button>
        <span>›</span>
        <span>转诊单详情</span>
        <span>›</span>
        <span className="font-mono text-gray-700">{ref.id}</span>
      </div>

      {emergencySubmitState && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="text-3xl">✅</div>
            <div>
              <div className="text-lg font-semibold text-emerald-900">{emergencySubmitState.title || '急诊转诊已提交'}</div>
              <div className="text-sm text-emerald-700">转诊单号 {ref.referralCode || ref.referralNo || ref.id}</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-emerald-100 bg-white px-4 py-4">
            <div className="text-sm font-medium text-gray-700 mb-3">{isRetroEntry ? '补录说明' : '已发出的通知'}</div>
            {isRetroEntry ? (
              <div className="space-y-2 text-sm text-gray-700">
                <div>本单已按 CHG-41 以补录模式入账，不触发急诊实时联动通知，也不发送患者短信。</div>
                <div>转诊中心后续将在详情页一次性完成“补录并确认”，完成后直接进入数据上报。</div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                  <div className="font-medium text-gray-800">✅ 患者短信 已发送至 {maskedPatientPhone}</div>
                  <button
                    type="button"
                    onClick={() => setShowEmergencySuccessSms(prev => !prev)}
                    className="mt-2 text-xs text-emerald-700 hover:text-emerald-900"
                  >
                    {showEmergencySuccessSms ? '收起短信内容 ▲' : '展开查看短信内容 ▼'}
                  </button>
                  {showEmergencySuccessSms && (
                    <div className="mt-2 text-sm font-mono whitespace-pre-line text-gray-700">
                      {messageTimeline[0]?.content || emergencySubmitState.smsPreview}
                    </div>
                  )}
                </div>
                <div className="text-gray-700">✅ 转诊中心 已推送工作台通知</div>
                <div className="text-gray-700">✅ 急诊科值班 已推送信息通知</div>
                <div className="text-gray-700">✅ {isGreenChannel ? (ref.linkedSpecialty || '联动专科') : '急诊科'}负责人 已推送通知</div>
                {isGreenChannel && ref.linkedSpecialty && (
                  <div className="text-gray-700">✅ {ref.linkedSpecialty}科室 绿色通道双线联动通知</div>
                )}
              </div>
            )}
          </div>

          {canViewEmergencyModifyInfo && !isRetroEntry && (
            <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-4">
              <div className="text-sm font-semibold text-orange-900">紧急修改窗口</div>
              <div className="text-sm text-orange-800 mt-2">提交后15分钟内可修改目标医院及联动专科通知</div>
              <div className="text-sm font-mono text-orange-900 mt-1">
                {emergencyWindowOpen ? `剩余时间：${emergencyWindowMinutes}:${emergencyWindowSeconds}` : '修改窗口已关闭'}
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {canEmergencyModify && (
                  <button
                    onClick={() => handleAction('emergencyModify')}
                    className="px-4 py-2 bg-white hover:bg-orange-100 text-orange-600 border border-orange-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    ⚡ 紧急修改目标医院
                  </button>
                )}
                {emergencyModifyLocked && (
                  <div className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200 bg-gray-50">
                    修改窗口已关闭
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => navigate(`/referral/${ref.id}`)}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              查看转诊单详情
            </button>
            <button
              onClick={() => navigate('/primary/dashboard')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              返回工作台
            </button>
          </div>
        </div>
      )}

      {isEmergencyReferral && ref.isUrgentUnhandled && !isRetroEntry && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-5 py-4">
          <div className="text-sm font-semibold text-red-700">⚠️ 该急诊转诊已提交超过4小时仍未完成接诊确认，已升级告警</div>
          <div className="text-xs text-red-500 mt-1">已提交 {emergencyElapsedHours}小时{emergencyElapsedRemainMinutes}分钟</div>
        </div>
      )}

      {isEmergencyReferral && hasPendingEmergencyModifyNotice && !isRetroEntry && currentRole === ROLES.PRIMARY && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-5 py-4">
          <div className="text-sm font-semibold text-red-700">⚠️ 重要提示</div>
          <div className="text-sm text-red-700 mt-2">
            目标信息已修改，但无法确认患者是否已收到更新短信。请立即电话联系患者，告知新的就诊地点：
          </div>
          <div className="text-sm font-medium text-red-800 mt-2">
            {ref.toInstitution} · {ref.toDept}
          </div>
          <div className="text-xs text-red-600 mt-1">
            急诊科电话：{INSTITUTIONS.find(item => item.name === ref.toInstitution)?.emergencyDeptPhone || '—'}
          </div>
        </div>
      )}

      {isEmergencyReferral && hasPendingEmergencyModifyNotice && !isRetroEntry && (
        <div className="mb-4 rounded-xl border border-orange-300 bg-orange-50 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-orange-900">⚠️ 目标信息已于 {formatTime(ref.emergencyModifyAt)} 修改</div>
              <div className="text-sm text-orange-800 mt-1">请确认患者已知晓新的就诊信息。</div>
            </div>
            {currentRole === ROLES.ADMIN && (
              <button
                onClick={() => handleAction('confirmPatientNotified')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors"
              >
                转诊中心：确认患者已通知
              </button>
            )}
          </div>
        </div>
      )}

      {/* 标题栏 */}
      <div className="bg-white rounded mb-4" style={{ border: '1px solid #DDF0F3', boxShadow: '0 1px 4px rgba(11,190,207,0.06)' }}>
        <div className="px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">{isUpward ? '⬆️' : '⬇️'}</span>
              <h1 className="text-lg font-semibold text-gray-800">
                {currentTransferLabel}申请 · {ref.patient.name}
              </h1>
              <StatusBadge status={displayedStatus} />
              {/* CHG-30：绿色通道标识 */}
              {isEmergencyReferral && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded border border-red-300">
                  {ref.isUrgentUnhandled ? '急诊·超时' : '急诊'}
                </span>
              )}
              {isRetroEntry && (
                <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded border border-gray-300">
                  补录
                </span>
              )}
              {isGreenChannel && (
                <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#10b981' }}>
                  绿通
                </span>
              )}
              {/* CHG-32：紧急等级 I-IV */}
              {ref.urgencyLevel && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  ref.urgencyLevel === 1 ? 'bg-red-600 text-white border-red-700' :
                  ref.urgencyLevel === 2 ? 'bg-orange-500 text-white border-orange-600' :
                  ref.urgencyLevel === 3 ? 'bg-yellow-400 text-yellow-900 border-yellow-500' :
                  'bg-gray-200 text-gray-700 border-gray-300'
                }`}>
                  {'I级急危 II级急重 III级急症 IV级亚急'.split(' ')[ref.urgencyLevel - 1]}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>患者：{ref.patient.name} · {ref.patient.gender || '未知'} · {ref.patient.age ? `${ref.patient.age}岁` : '年龄未填'}</span>
              <span className="text-gray-300">|</span>
              <span>诊断：<span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{ref.diagnosis.code}</span> {ref.diagnosis.name}</span>
              {(ref.referralCode || ref.referralNo) && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>转诊单号：<span className="font-mono" style={{ color: '#0892a0' }}>{ref.referralCode || ref.referralNo}</span></span>
                </>
              )}
              {isGreenChannel && ref.linkedSpecialty && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>联动专科：<span className="font-medium text-gray-700">{ref.linkedSpecialty}</span></span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
              <span>{ref.fromInstitution} ({ref.fromDoctor})</span>
              <span>→</span>
              <span>{ref.toInstitution || '待选'} {ref.toDept ? `· ${ref.toDept}` : ''}</span>
              <span className="text-gray-300">|</span>
              <span>创建于 {formatTime(ref.createdAt)}</span>
            </div>
          </div>

          {/* 操作按钮区 */}
          <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
            {isCountyDoctor && isEmergencyReferral && (
              <div className="px-4 py-2 rounded-lg text-xs text-red-600 border border-red-200 bg-red-50">
                急诊转诊由转诊中心处理，县级医生此处只读。
              </div>
            )}
            {isCountyDepartmentHead && isUpward && !isEmergencyReferral && (
              <div className="px-4 py-2 rounded-lg text-xs text-amber-700 border border-amber-200 bg-amber-50">
                县级科主任此页仅查看本科室转诊详情，不在详情页直接执行受理或拒绝。
              </div>
            )}
            {/* 县级医生：审核上转 */}
            {canAcceptUpward && (
              <button
                onClick={() => handleAction('acceptUpward')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ✓ 受理申请
              </button>
            )}
            {canRejectUpward && (
              <button
                onClick={() => handleAction('rejectUpward')}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors"
              >
                ✕ 不予受理
              </button>
            )}

            {/* 县级医生：完成接诊 */}
            {canCompleteUpward && (
              <button
                onClick={() => handleAction('completeUpward')}
                className="px-4 py-2 text-white rounded text-sm font-medium transition-colors"
              style={{ background: '#0BBECF' }}
              >
                ✓ 完成接诊确认
              </button>
            )}

            {adminCanSupplementEmergency && (
              <button
                onClick={() => handleAction('supplementEmergency')}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors"
              >
                补录接诊信息
              </button>
            )}

            {adminCanRetroCompleteEmergency && (
              <button
                onClick={() => handleAction('completeRetroEmergency')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
              >
                完成补录并确认
              </button>
            )}

            {adminCanCompleteEmergency && (
              <button
                onClick={() => handleAction('completeUpward')}
                className="px-4 py-2 text-white rounded text-sm font-medium transition-colors"
                style={{ background: '#0BBECF' }}
              >
                ✓ 完成接诊确认
              </button>
            )}

            {(canEmergencyModify || canCollaborativeClose) && (
              <div className="flex gap-2">
                {canEmergencyModify && (
                  <button
                    onClick={() => handleAction('emergencyModify')}
                    className="flex-1 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    紧急修改
                  </button>
                )}
                {canCollaborativeClose && (
                  <button
                    onClick={() => handleAction('collaborativeClose')}
                    className="flex-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    协商关闭
                  </button>
                )}
              </div>
            )}
            {emergencyModifyLocked && (
              <div className="px-4 py-2 rounded-lg text-xs text-gray-500 border border-gray-200 bg-gray-50">
                提交后15分钟修改窗口已关闭
              </div>
            )}

            {/* 基层医生：撤销上转 */}
            {canCancelUpward && (
              <button
                onClick={() => handleAction('cancelUpward')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 rounded-lg text-sm transition-colors"
              >
                撤销申请
              </button>
            )}
            {canCancelDownward && (
              <button
                onClick={() => handleAction('cancelDownward')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 rounded-lg text-sm transition-colors"
              >
                撤销下转
              </button>
            )}

            {canCoordinatorReassignDownward && (
              <button
                onClick={() => handleAction('reassignDownward')}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
                style={{ background: '#0BBECF' }}
              >
                {downwardAllocationMode === 'coordinator_reassign' ? '改派给其他医生' : '分配给医生'}
              </button>
            )}
            {canCoordinatorSelfAcceptDownward && (
              <button
                onClick={() => handleAction('selfAcceptDownward')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                负责人本人接收
              </button>
            )}
            {canCoordinatorRejectDownward && (
              <button
                onClick={() => handleAction('rejectDownwardByCoordinator')}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm transition-colors"
              >
                退回
              </button>
            )}

            {/* 基层医生：接收下转 */}
            {canAcceptDownward && (
              <button
                onClick={() => handleAction('acceptDownward')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ✓ 确认接收
              </button>
            )}
            {canRejectDownward && (
              <button
                onClick={() => handleAction('rejectDownward')}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm transition-colors"
              >
                ✕ 拒绝
              </button>
            )}

            {/* 基层医生：完成下转接收 */}
            {canCompleteDownward && (
              <button
                onClick={() => handleAction('completeDownward')}
                className="px-4 py-2 text-white rounded text-sm font-medium transition-colors"
              style={{ background: '#0BBECF' }}
              >
                ✓ 患者已到达，完成接收
              </button>
            )}

            {/* M-7：管理员填写接诊安排（IN_TRANSIT + 无 admissionArrangement 时显示） */}
            {adminCanArrange && (
              <button
                onClick={() => setShowArrangementModal(true)}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
                style={{ background: '#0BBECF' }}
              >
                🏥 填写接诊安排
              </button>
            )}

            {/* 修复 C：管理员催办按钮（原型模式：不做超时判断，直接显示） */}
            {adminCanUrgeUpwardReview && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleAction('adminUrge')}
                  className="px-4 py-2 border rounded-lg text-sm font-medium transition-colors"
                  style={{ borderColor: '#f59e0b', color: '#b45309', background: '#fffbeb' }}
                >
                  催办受理
                </button>
                <span className="text-xs text-gray-400 text-center">超时后可见</span>
              </div>
            )}
            {adminCanUrgeDownwardAccept && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleAction('adminUrge')}
                  className="px-4 py-2 border rounded-lg text-sm font-medium transition-colors"
                  style={{ borderColor: '#f59e0b', color: '#b45309', background: '#fffbeb' }}
                >
                  催办接收
                </button>
                <span className="text-xs text-gray-400 text-center">超时后可见</span>
              </div>
            )}

            {/* CHG-32：科主任院内审核按钮 */}
            {canApproveInternalReview && (
              <button
                onClick={() => handleAction('approveInternal')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ✓ 院内审核通过
              </button>
            )}
            {canRejectInternalReview && (
              <button
                onClick={() => handleAction('rejectInternal')}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors"
              >
                ✕ 院内审核拒绝
              </button>
            )}

            {/* 导出PDF（占位） */}
            <button className="px-4 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              📄 导出PDF
            </button>
          </div>
        </div>
      </div>

      {/* 转诊闭环信息 */}
      {!(isEmergencyReferral && isRetroEntry) && (
        <div className="mb-4">
          <ReferralClosureTimeline type={ref.type} events={closureEvents} />
        </div>
      )}

      {/* 拒绝/撤销原因提示 */}
      {(ref.status === UPWARD_STATUS.REJECTED || displayedStatus === DOWNWARD_STATUS.RETURNED) && rejectReasonLabel !== '—' && (
        <div className={`mb-4 flex items-start gap-3 px-4 py-3 rounded-xl text-sm ${displayedStatus === DOWNWARD_STATUS.RETURNED ? 'bg-orange-50 border border-orange-200 text-orange-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          <span className="text-lg flex-shrink-0">{displayedStatus === DOWNWARD_STATUS.RETURNED ? '↩️' : '❌'}</span>
          <div>
            <span className="font-medium">{displayedStatus === DOWNWARD_STATUS.RETURNED ? '退回原因：' : '拒绝原因：'}</span>
            {rejectReasonLabel}
          </div>
        </div>
      )}

      {/* 修复 B：被拒绝后的后续操作面板 */}
      {(canRejectedFollowUpUpward || canRejectedFollowUpDownward) && (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 mb-3">
            {displayedStatus === DOWNWARD_STATUS.RETURNED ? '申请已被退回，请选择后续处理方式：' : '申请已被拒绝，请选择后续处理方式：'}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleAction('changeInstitution')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: '#0BBECF' }}
              onMouseOver={e => e.currentTarget.style.background = '#0892a0'}
              onMouseOut={e => e.currentTarget.style.background = '#0BBECF'}
            >
              换机构重新申请
            </button>
            <button
              onClick={() => handleAction('resubmit')}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors text-gray-700 hover:bg-gray-100"
              style={{ borderColor: '#d1d5db' }}
            >
              修改重提
            </button>
            <button
              onClick={() => handleAction('terminateRejected')}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
              onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              终止申请
            </button>
          </div>
        </div>
      )}
      {ref.status === UPWARD_STATUS.CANCELLED && cancelReasonLabel !== '—' && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
          <span className="text-lg flex-shrink-0">ℹ️</span>
          <div><span className="font-medium">撤销原因：</span>{cancelReasonLabel}</div>
        </div>
      )}
      {ref.status === UPWARD_STATUS.CLOSED && closeReasonLabel !== '—' && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span className="text-lg flex-shrink-0">⛔</span>
          <div className="flex-1">
            <div><span className="font-medium">关闭原因：</span>{closeReasonLabel}</div>
            {showTransferUpCloseActions && (
              <div className="mt-3">
                <div className="text-xs text-red-600 mb-2">协商关闭后如需继续转诊至上级机构，可打印或导出当前转诊单。</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                  >
                    打印转诊单
                  </button>
                  <button
                    onClick={() => setDialog({
                      type: 'notice',
                      title: '导出任务已创建',
                      description: '转诊单导出任务已创建，请稍后下载 PDF。',
                    })}
                    className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                  >
                    导出PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 问题三修复：院内审核拒绝后操作面板（草稿 + 有内审拒绝记录） */}
      {canResubmitAfterInternalReject && (
        <div className="mb-4 border border-orange-200 bg-orange-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">📋</span>
            <div className="flex-1">
              <div className="font-medium text-orange-800 text-sm mb-1">院内审核未通过，申请已退回</div>
              <div className="text-xs text-orange-600 mb-3">
                请查看上方「院内审核记录」了解拒绝原因，修改后可重新提交至院内审核。
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction('resubmitInternalReject')}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ background: '#f97316' }}
                  onMouseOver={e => e.currentTarget.style.background = '#ea6c0a'}
                  onMouseOut={e => e.currentTarget.style.background = '#f97316'}
                >
                  ✏️ 修改并重新提交
                </button>
                <button
                  onClick={() => handleAction('cancelUpward') }
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  撤销申请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHG-39: 急诊知情同意改为线下签署后补传 */}
      {ref.is_emergency && consentInfo.isPendingUpload && ref.status !== UPWARD_STATUS.COMPLETED && ref.status !== UPWARD_STATUS.CANCELLED && ref.status !== UPWARD_STATUS.CLOSED && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-800">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <span className="font-medium">急诊知情同意待补传</span>
            <span className="ml-2 text-amber-600 text-xs">（需在接诊后24小时内完成线下签署并上传附件，起算时间以患者到院时间为准）</span>
          </div>
          {currentRole === ROLES.PRIMARY && (
            <button
              onClick={() => setDialog({
                type: 'notice',
                title: '上传知情同意附件',
                description: '当前版本请由发起医生在对应流程中补传线下签署附件。'
              })}
              className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              上传附件
            </button>
          )}
        </div>
      )}

      {/* P1-03：转诊预约码展示（转诊中状态，有预约码时显示）*/}
      {(ref.appointmentCode || ref.admissionArrangement?.appointmentCode) && isUpward && ref.status === UPWARD_STATUS.IN_TRANSIT && appointmentCodeVisibility === 'full' && (
        <div className="mb-4 px-5 py-4 rounded-xl" style={{ background: '#f0fdfe', border: '1px solid #a5f3fc' }}>
          <div className="text-xs font-medium mb-2" style={{ color: '#0e7490' }}>转诊预约码</div>
          <div className="flex items-center gap-5">
            <span className="font-mono text-2xl font-bold tracking-widest" style={{ color: '#0BBECF' }}>{ref.appointmentCode || ref.admissionArrangement?.appointmentCode}</span>
            <div className="text-xs leading-relaxed" style={{ color: '#0891b2' }}>
              <div>有效期至：{new Date(ref.appointmentCodeExpireAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div>凭此码到 <span className="font-medium">{ref.admissionArrangement?.department || ref.toDept}</span> 挂号窗口出示，优先排队就诊</div>
              {currentRole !== ROLES.ADMIN && (
                <div>患者就诊时需出示此码，短信中已同步发送至患者手机</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHG-30：到院安排卡（转诊中状态，管理员已填写时显示蓝色卡，未填写时显示灰色占位） */}
      {isUpward && ref.status === UPWARD_STATUS.IN_TRANSIT && arrangementVisibility !== 'hidden' && (
        <div className="mb-4">
          {arrangementVisibility === 'minimal' ? (
            <MinimalArrangementStatusCard
              text={buildMinimalArrangementStatusText(
                ref.admissionArrangement
                  ? {
                    visitTime: formatTime(ref.admissionArrangement.visitTime),
                    department: ref.admissionArrangement.department,
                  }
                  : null
              )}
            />
          ) : isEmergencyReferral && !ref.admissionArrangement?.department ? (
            <div className="px-5 py-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fdba74' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-orange-700">{isRetroEntry ? '📝 急诊补录待确认' : '⚡ 急诊待补录'}</span>
                <span className="text-xs text-orange-400">提交于 {formatTime(ref.createdAt)}</span>
              </div>
              <div className="text-xs text-orange-600 mb-3">
                {isRetroEntry
                  ? '补录模式未触发实时通知；转诊中心完成补录并确认后将直接进入已完成。'
                  : `已通知：急诊科值班✓ 科室负责人✓ 转诊中心✓${isGreenChannel && ref.linkedSpecialty ? ` · ${ref.linkedSpecialty}负责人✓` : ''}`}
              </div>
              <div className={`grid gap-3 text-sm ${canViewEmergencyModifyInfo ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <span className="text-orange-500 text-xs">当前状态</span>
                  <div className="font-medium text-orange-900">{isRetroEntry ? '待完成补录并确认' : '待补录接诊信息'}</div>
                </div>
                {isRetroEntry && ref.patientArrivedAt && (
                  <div>
                    <span className="text-orange-500 text-xs">患者到院时间</span>
                    <div className="font-medium text-orange-900">{formatTime(ref.patientArrivedAt)}</div>
                  </div>
                )}
                {canViewEmergencyModifyInfo && !isRetroEntry && (
                  <div>
                    <span className="text-orange-500 text-xs">紧急修改窗口</span>
                    <div className="font-medium text-orange-900">{emergencyWindowOpen ? `剩余 ${emergencyWindowMinutes}:${emergencyWindowSeconds}` : '已关闭'}</div>
                  </div>
                )}
              </div>
            </div>
          ) : ref.admissionArrangement ? (
            <div className="px-5 py-4 rounded-xl" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-blue-800">🏥 到院接诊安排</span>
                  {isGreenChannel && ref.specialistConsultRequested && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#16a34a' }}>
                      已启动专科会诊
                    </span>
                  )}
                </div>
                <span className="text-xs text-blue-400">
                  由 {ref.admissionArrangement.arrangedBy || '转诊中心'} 安排 · {formatTime(ref.admissionArrangement.arrangedAt)}
                </span>
              </div>
              {[ROLES.PRIMARY, ROLES.PRIMARY_HEAD].includes(currentRole) && (
                <div className="text-xs text-cyan-700 mb-3 font-medium">请告知患者按以下信息到院就诊</div>
              )}
              {isEmergencyReferral && (
                <div className="text-xs text-blue-500 mb-3">
                  {isRetroEntry
                    ? '补录模式：未触发急诊科、专科负责人和转诊中心实时通知'
                    : `已通知：急诊科值班✓ 科室负责人✓ 转诊中心✓${isGreenChannel && ref.linkedSpecialty ? ` · ${ref.linkedSpecialty}负责人✓` : ''}`}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {ref.patientArrivedAt && (
                  <div>
                    <span className="text-blue-500 text-xs">患者到院时间</span>
                    <div className="font-medium text-blue-900">{formatTime(ref.patientArrivedAt)}</div>
                  </div>
                )}
                <div>
                  <span className="text-blue-500 text-xs">就诊时间</span>
                  <div className="font-medium text-blue-900">{formatTime(ref.admissionArrangement.visitTime)}</div>
                </div>
                <div>
                  <span className="text-blue-500 text-xs">接诊科室</span>
                  <div className="font-medium text-blue-900">{ref.admissionArrangement.department}</div>
                </div>
                <div>
                  <span className="text-blue-500 text-xs">楼层/区域</span>
                  <div className="font-medium text-blue-900">{ref.admissionArrangement.floor}</div>
                </div>
                {ref.admissionType !== 'inpatient' && (
                  <div>
                    <span className="text-blue-500 text-xs">诊室/床位</span>
                    <div className="font-medium text-blue-900">{ref.admissionArrangement.room || '—'}</div>
                  </div>
                )}
                <div>
                  <span className="text-blue-500 text-xs">科室电话</span>
                  <div className="font-medium text-blue-900">{ref.admissionArrangement.departmentPhone}</div>
                </div>
                {ref.admissionArrangement.doctorName && (
                  <div>
                    <span className="text-blue-500 text-xs">参考医生</span>
                    <div className="font-medium text-blue-900">
                      {ref.admissionArrangement.doctorName}
                      <span className="text-blue-400 text-xs ml-1">（仅供参考）</span>
                    </div>
                  </div>
                )}
              </div>

              {/* J-4：住院安排 */}
              {(ref.admissionType === 'inpatient' || ref.emergencyAdmissionType === 'inpatient') && ref.admissionArrangement.ward && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-blue-800">🛏 住院安排</span>
                    {/* bedStatus 角标 */}
                    {ref.bedStatus === 'bed_reserved' && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#dcfce7', color: '#16a34a' }}>床位已预占</span>
                    )}
                    {ref.bedStatus === 'bed_used' && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#f3f4f6', color: '#6B7280' }}>已入院核销</span>
                    )}
                    {ref.bedStatus === 'bed_expired' && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#fff7ed', color: '#F97316' }}>已超时释放</span>
                    )}
                    {ref.bedStatus === 'bed_released' && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#f3f4f6', color: '#6B7280' }}>已释放</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-500 text-xs">病区</span>
                      <div className="font-medium text-blue-900">{ref.admissionArrangement.ward}</div>
                    </div>
                    <div>
                      <span className="text-blue-500 text-xs">床位号</span>
                      <div className="font-medium text-blue-900">{ref.admissionArrangement.bedNumber || '入院时由护士站安排'}</div>
                    </div>
                    <div>
                      <span className="text-blue-500 text-xs">护士站</span>
                      <div className="font-medium text-blue-900">{ref.admissionArrangement.nurseStationPhone || '—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {ref.admissionArrangement.appointmentCode && (
                <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-3">
                  <span className="text-blue-500 text-xs">取号码</span>
                  <span className="font-mono text-xl font-bold tracking-widest text-blue-700">
                    {ref.admissionArrangement.appointmentCode}
                  </span>
                  <span className="text-xs text-blue-400">
                    {ref.admissionType === 'inpatient' ? '持本取号码至护士站办理入院' : '到挂号窗口出示，优先取号'}
                  </span>
                </div>
              )}
              {/* 变更五：模拟短信预览入口（管理员视角） */}
              {currentRole === ROLES.ADMIN && (
                <div className="mt-3 pt-3 border-t border-blue-200 flex justify-end">
                  <button
                    onClick={() => setShowSmsPreview(true)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: '#bfdbfe', color: '#1d4ed8', background: '#dbeafe' }}
                  >
                    📱 预览患者通知短信
                  </button>
                </div>
              )}
              {[ROLES.PRIMARY, ROLES.PRIMARY_HEAD].includes(currentRole) && (
                <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-500">
                  实际接诊医生以到院现场安排为准
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 py-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">🏥</span>
                <span className="text-sm text-gray-500">到院接诊安排</span>
                <span className="ml-2 text-xs text-orange-500 font-medium">
                  {isEmergencyReferral ? '⏳ 转诊中心尚未补录接诊信息，请等待处理' : '⏳ 管理员尚未安排就诊时间，请等待通知'}
                </span>
              </div>
              {currentRole === ROLES.ADMIN && (
                <div className="mt-2 text-xs text-blue-500">
                  → {isEmergencyReferral ? '请补录接诊信息，补录完成后再执行完成接诊确认' : '请前往管理员工作台「待协调」Tab 安排到院信息'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* P0-5：就诊须知区块（转诊中状态） */}
      {isUpward && ref.status === UPWARD_STATUS.IN_TRANSIT && !isEmergencyReferral && !isGreenChannel && shouldShowPatientNotice() && (
        <div className="mb-4 bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
          <div className="px-5 py-3 text-sm font-semibold text-gray-700" style={{ borderBottom: '1px solid #E0F6F9', background: '#f9fefe' }}>
            就诊须知
          </div>
          <div className="px-5 py-4 space-y-2.5 text-sm text-gray-700">
            <div className="flex gap-2">
              <span className="font-semibold text-gray-400 flex-shrink-0">①</span>
              <span>携带材料：身份证 + 医保卡 + 本转诊单（截图即可）+ 既往检查资料</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-gray-400 flex-shrink-0">②</span>
              <span>
                {ref.admissionType === 'inpatient'
                  ? <>到院后前往<span className="font-medium">住院部</span>办理入院手续，告知持有转诊单，出示预约码 <span className="font-mono font-bold" style={{ color: '#0BBECF' }}>{ref.appointmentCode || '—'}</span></>
                  : ref.admissionType === 'emergency'
                  ? <>请直接前往<span className="font-medium">{ref.admissionArrangement?.department || '急诊科'}</span>，告知为转诊患者并配合急诊接诊分诊{ref.admissionArrangement?.room ? `（${ref.admissionArrangement.room}）` : ''}</>
                  : <>到院后前往<span className="font-medium">{ref.toDept}</span>挂号窗口，出示预约码 <span className="font-mono font-bold" style={{ color: '#0BBECF' }}>{ref.appointmentCode || '—'}</span>，优先排队就诊{!ref.appointmentCode && '（无预约码，正常挂号即可）'}</>
                }
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-gray-400 flex-shrink-0">③</span>
              <span>到院后仍需正常挂号缴费，预约码用于优先排队，<span className="font-medium">不免除挂号及诊疗费用</span></span>
            </div>
            <div className="flex gap-2 px-3 py-2 rounded-lg" style={{ background: '#f0fdf4' }}>
              <span className="font-semibold text-gray-400 flex-shrink-0">④</span>
              <span className="text-green-700">持本转诊单就诊，按分级诊疗比例报销，<span className="font-medium">高于自行就诊比例</span>，请携带医保卡</span>
            </div>
            {ref.appointmentCode && (
              <div className="flex gap-2">
                <span className="font-semibold text-gray-400 flex-shrink-0">⑤</span>
                <span className="text-gray-500">预约码有效期至：{new Date(ref.appointmentCodeExpireAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* G6：诊疗结果回传（已完成上转，基层/县级/管理员均可见）*/}
      {ref.treatmentResult && isUpward && ref.status === UPWARD_STATUS.COMPLETED && (
        <div className="mb-4 bg-white rounded" style={{ border: '1px solid #DDF0F3', boxShadow: '0 1px 4px rgba(11,190,207,0.06)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E0F6F9' }}>
            <span className="text-sm font-semibold text-gray-700">诊疗结果</span>
            <span className="text-xs text-gray-400">由 {ref.treatmentResult.filledBy} 填写 · {formatDate(ref.treatmentResult.filledAt)}</span>
          </div>
          <div className="px-5 py-4 space-y-3 text-sm">
            <div>
              <span className="text-gray-500 mr-2">诊治摘要：</span>
              <span className="text-gray-800 leading-relaxed">{ref.treatmentResult.summary}</span>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-gray-500 pt-1 border-t border-gray-50">
              {ref.treatmentResult.dischargeDate && <span>出院日期：{formatDate(ref.treatmentResult.dischargeDate)}</span>}
              {ref.treatmentResult.nextFollowup && <span>复诊建议：{ref.treatmentResult.nextFollowup}</span>}
            </div>
          </div>
        </div>
      )}

      {/* CHG-32：待内审提示条（PENDING_INTERNAL_REVIEW 状态，提示申请者和科主任） */}
      {isUpward && ref.status === UPWARD_STATUS.PENDING_INTERNAL_REVIEW && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <span className="text-lg flex-shrink-0">📋</span>
          <div className="flex-1">
            <span className="font-medium text-blue-800">院内审核中</span>
            <span className="ml-2 text-blue-600 text-xs">（普通转出须经院内审核通过可至县级医院）</span>
            {currentRole === ROLES.PRIMARY_HEAD && (
              <div className="mt-1 text-blue-700">请审核此转出申请的合理性与规范性，通过后将推送至县级医院</div>
            )}
            {currentRole === ROLES.PRIMARY && (
              <div className="mt-1 text-blue-600">您的申请正等待xx（负责人）审核</div>
            )}
          </div>
        </div>
      )}

      {/* CHG-32：下转受理锁定提示（下转待接收，已被他人受理时显示） */}
      {isDownward && ref.status === DOWNWARD_STATUS.PENDING && downwardAllocationMode === 'designated' && isPrimaryDoctor && isDesignatedDoctor && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          <span>✅</span>
          <span>该{downwardDisplayLabel}申请已定向指派给您，当前处于待您处理状态。您可直接接收，或填写原因后拒绝并转交基层负责人改派。</span>
        </div>
      )}
      {isDownward && ref.status === DOWNWARD_STATUS.PENDING && downwardAllocationMode === 'designated' && isPrimaryDoctor && !isDesignatedDoctor && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span>🔒</span>
          <span>该{downwardDisplayLabel}申请已定向指派给 <span className="font-medium">{ref.designatedDoctorName || '指定基层医生'}</span>，您当前不可操作。</span>
        </div>
      )}
      {isDownward && ref.status === DOWNWARD_STATUS.PENDING && downwardAllocationMode === 'designated' && isPrimaryCoordinator && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
          <span>ℹ️</span>
          <span>该{downwardDisplayLabel}申请已定向指派给 <span className="font-medium">{ref.designatedDoctorName || '指定基层医生'}</span>。您当前为知情角色，如医生拒绝或超时将进入改派窗口。</span>
        </div>
      )}
      {isDownward && ref.status === DOWNWARD_STATUS.PENDING && downwardAllocationMode === 'coordinator' && isPrimaryCoordinator && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
          <span>📌</span>
          <span>该{downwardDisplayLabel}申请当前处于 <span className="font-medium">待分配</span> 状态。请执行首次分配、本人接收，或直接退回申请。</span>
        </div>
      )}
      {isDownward && ref.status === DOWNWARD_STATUS.PENDING && downwardAllocationMode === 'coordinator_reassign' && isPrimaryCoordinator && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span>↺</span>
          <span>该{downwardDisplayLabel}申请已进入 <span className="font-medium">负责人改派窗口</span>。请改派其他医生、本人直接接收，或直接退回申请。</span>
        </div>
      )}

      {/* Tab 内容区 */}
      <div className="bg-white rounded" style={{ border: '1px solid #DDF0F3', boxShadow: '0 1px 4px rgba(11,190,207,0.06)' }}>
        {/* Tab 切换 */}
        <div className="flex" style={{ borderBottom: '1px solid #E0F6F9' }}>
          {detailTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
              style={currentTab === tab.key
                ? { borderBottomColor: '#0BBECF', color: '#0BBECF' }
                : { borderBottomColor: 'transparent', color: '#6b7280' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* 申请详情 Tab */}
          {currentTab === 'detail' && (
            <div className="space-y-5">
              {isUpward ? (
                <>
                  {upwardDetailSections.map(summary => (
                    <ReferralSummaryCard key={summary.title} summary={summary} />
                  ))}

                  {isGreenChannel && INSTITUTIONS.find(i => i.name === ref.toInstitution)?.departmentInfo?.[ref.toDept]?.rescueResources && (
                    <div className="rounded-xl border px-4 py-4" style={{ background: '#fffbeb', borderColor: '#fcd34d' }}>
                      <div className="text-sm font-medium text-amber-800 mb-1">目标科室抢救资源参考</div>
                      <div className="text-xs text-amber-700 leading-relaxed">
                        {INSTITUTIONS.find(i => i.name === ref.toInstitution)?.departmentInfo?.[ref.toDept]?.rescueResources}
                      </div>
                    </div>
                  )}

                  {(consentInfo.isUploaded || canShowConsentUploadPlaceholder) && (
                    <div className={`px-4 py-4 rounded-xl text-sm ${consentInfo.isUploaded
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-orange-50 border border-orange-200 text-orange-700'
                    }`}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <div className="font-medium">知情同意附件</div>
                          <div>签署人：{consentInfo.signedByLabel}</div>
                          <div>上传时间：{formatTime(consentInfo.consentUploadedAt)}</div>
                          {!consentInfo.isUploaded && (
                            <div className="text-orange-700">提示：急诊患者请于到院后24小时内上传签署文件</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {consentInfo.isUploaded && (
                            <>
                              <button
                                type="button"
                                onClick={() => setDialog({
                                  type: 'notice',
                                  title: consentPreviewAvailable ? '附件预览' : '暂无原件预览',
                                  description: consentPreviewAvailable ? '当前版本暂不支持在详情页直接预览附件，请通过归档渠道查看原件。' : '当前记录未上传可预览的签署附件。'
                                })}
                                className="text-xs px-3 py-1.5 rounded-lg border border-green-200 hover:bg-white"
                              >
                                预览
                              </button>
                              <button
                                type="button"
                                onClick={() => setDialog({
                                  type: 'notice',
                                  title: consentPreviewAvailable ? '附件下载' : '暂无可下载附件',
                                  description: consentPreviewAvailable ? '当前版本暂不支持在详情页直接下载附件，请通过归档渠道获取原件。' : '当前记录未上传可下载的签署附件。'
                                })}
                                className="text-xs px-3 py-1.5 rounded-lg border border-green-200 hover:bg-white"
                              >
                                下载
                              </button>
                            </>
                          )}
                          {canShowConsentUploadPlaceholder && (
                            <button
                              type="button"
                              onClick={() => setDialog({
                                type: 'notice',
                                title: '上传知情同意附件',
                                description: '当前版本请由发起医生在对应流程中补传线下签署附件。'
                              })}
                              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              上传附件
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {downwardDetailSections.map(section => (
                    <div key={section.title}>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">{section.title}</h3>
                      <div className="rounded p-4" style={{ background: '#F5FCFD', border: '1px solid #DDF0F3' }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {section.items.map(item => (
                            <div key={`${section.title}-${item.label}`} className={typeof item.value === 'string' && item.value.length > 60 ? 'md:col-span-2' : ''}>
                              <div className="text-xs text-gray-400">{item.label}</div>
                              {renderDetailValue(item)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {isEmergencyReferral && (
                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowMessageRecord(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700"
                  >
                    <span>消息记录</span>
                    <span className="text-gray-400 text-xs">{showMessageRecord ? '收起 ▲' : '展开 ▼'}</span>
                  </button>
                  {showMessageRecord && (
                    <div className="px-4 py-3 space-y-3">
                      {messageTimeline.length === 0 ? (
                        <div className="text-sm text-gray-400">暂无短信记录</div>
                      ) : messageTimeline.map(item => (
                        <div key={`${item.kind}-${item.sentAt}`} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <div className="text-xs text-gray-700 font-medium">{item.label}</div>
                            <div className="text-[11px] text-gray-400">{formatTime(item.sentAt)}</div>
                          </div>
                          <div className="px-4 py-3 space-y-2 bg-white">
                            <div className="text-xs text-gray-500">接收方：患者 / {maskedPatientPhone}</div>
                            <div className="text-xs text-green-600">发送状态：{item.status}</div>
                            <div className="text-sm font-mono whitespace-pre-line text-gray-700">{item.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {currentTab === 'clinical' && (
            <div className="space-y-5">
              {!isUpward && <ReferralSummaryCard summary={clinicalPackage.summary} />}
              {!isUpward && clinicalPackage.displayMode === 'structured' && (
                <>
                  <ClinicalStructuredSection data={clinicalPackage.structuredData} />
                  <RehabPlanSection data={clinicalPackage.rehabPlan} />
                </>
              )}
              <AttachmentSection
                attachments={clinicalPackage.attachments}
                emptyText={clinicalPackage.displayMode === 'attachment_only' ? '当前未上传附件资料' : '暂无补充附件资料'}
              />
            </div>
          )}

          {/* 操作日志 Tab */}
          {currentTab === 'logs' && (
            <div>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-0">
                  {(ref.logs || []).map((log, i) => (
                    <div key={i} className="flex gap-4 pb-5 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold z-10 flex-shrink-0 ${log.actor === '系统' ? 'bg-gray-200 text-gray-500' :
                        log.actor.includes('医生') || log.actor.includes('管理员') ? 'bg-blue-100 text-blue-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                        {log.actor === '系统' ? '⚙' : log.actor.charAt(0)}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-medium text-gray-800 text-sm">{log.actor}</span>
                          <span className="text-gray-600 text-sm">{log.action}</span>
                          {log.note && (
                            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{log.note}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{formatTime(log.time)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CHG-30-D：院内审核记录（有记录时显示可折叠时间线，兼容新旧字段格式） */}
              {(ref.internalAuditLog || []).length > 0 && (
                <div className="mt-4 border border-blue-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowAuditHistory(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-blue-700">院内审核记录</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">
                        {ref.internalAuditLog.length} 条
                      </span>
                    </div>
                    <span className="text-blue-400 text-xs">{showAuditHistory ? '收起 ▲' : '展开 ▼'}</span>
                  </button>
                  {showAuditHistory && (
                    <div className="px-4 py-3 space-y-3">
                      {[...ref.internalAuditLog].reverse().map((entry, i) => {
                        // 兼容旧格式 (entry.result) 和新格式 (entry.action)
                        const isPassed = entry.result === 'approved' || entry.action === 'INTERNAL_AUDIT_PASS'
                        const auditorName = entry.auditorName || entry.actor || '—'
                        const timestamp = entry.timestamp || entry.time
                        return (
                          <div key={i} className="flex items-start gap-3">
                            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${isPassed ? 'bg-green-500' : 'bg-red-400'}`}>
                                {isPassed
                                  ? <svg width="8" height="6" viewBox="0 0 8 6"><polyline points="1,3 3,5 7,1" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  : <svg width="8" height="8" viewBox="0 0 8 8"><line x1="1" y1="1" x2="7" y2="7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/><line x1="7" y1="1" x2="1" y2="7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                }
                              </div>
                              {i < ref.internalAuditLog.length - 1 && (
                                <div className="w-px flex-1 bg-gray-200 mt-1" style={{ minHeight: 16 }} />
                              )}
                            </div>
                            <div className="flex-1 pb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isPassed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                  {isPassed ? '通过' : '拒绝'}
                                </span>
                                <span className="text-sm font-medium text-gray-800">{auditorName}</span>
                                <span className="text-xs text-gray-400">{formatTime(timestamp)}</span>
                              </div>
                              {entry.comment && (
                                <div className="mt-1 text-xs text-gray-600 bg-gray-50 px-2 py-1.5 rounded border border-gray-100">
                                  {entry.comment}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* S-02：知情同意签署记录（折叠块，置于操作日志下方） */}
              <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowConsentRecord(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700"
                >
                  <span>知情同意签署记录</span>
                  <span className="text-gray-400 text-xs">{showConsentRecord ? '收起 ▲' : '展开 ▼'}</span>
                </button>
                {showConsentRecord && (
                  <div className="px-4 py-3">
                    {ref.consentRecord ? (
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-600">签署人：</span>
                          <span className="font-medium text-gray-900">{ref.consentRecord.signerName}</span>
                          <span className="text-gray-400 mx-2">|</span>
                          <span className="text-gray-600">上传时间：</span>
                          <span className="text-gray-900">{ref.consentRecord.signedAt}</span>
                        </div>
                        <button
                            onClick={() => setDialog({
                              type: 'notice',
                              title: '签署原件查看',
                              description: '当前版本暂不支持在详情页直接打开原件，请通过归档渠道查看签署附件。'
                            })}
                          className="text-sm hover:underline"
                          style={{ color: '#0BBECF' }}
                        >
                          查看签署原件 →
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-600">签署人：</span>
                          <span className="font-medium text-gray-800">{consentInfo.signedByLabel}</span>
                          <span className="text-gray-400 mx-2">|</span>
                          <span className="text-gray-600">上传时间：</span>
                          <span className="text-gray-800">
                            {consentInfo.consentUploadedAt ? new Date(consentInfo.consentUploadedAt).toLocaleString('zh-CN') : (ref.createdAt ? new Date(ref.createdAt).toLocaleString('zh-CN') : '—')}
                          </span>
                          {!consentPreviewAvailable && <span className="ml-2 text-xs text-orange-500">（当前未上传可查看原件）</span>}
                        </div>
                        <button
                            onClick={() => setDialog({
                              type: 'notice',
                              title: consentPreviewAvailable ? '签署原件查看' : '暂无可打开的原件',
                              description: consentPreviewAvailable ? '当前版本暂不支持在详情页直接打开原件，请通过归档渠道查看签署附件。' : '当前记录未上传可查看的签署附件。'
                            })}
                          className="text-sm hover:underline"
                          style={{ color: '#0BBECF' }}
                        >
                          查看签署原件 →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* S-03：患者历史转诊 Tab */}
          {currentTab === 'history' && (
            <div className="p-4">
              <p className="text-xs text-gray-400 mb-3">
                以下为患者 <span className="font-medium text-gray-700">{ref.patient?.name}</span> 的历史转诊记录（含本次）
              </p>
              {(() => {
                // Assumption: 通过 patient.name 匹配同一患者（生产环境应使用 patient.id）
                const patientRefs = referrals
                  .filter(r => r.patient?.name === ref.patient?.name)
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

                if (patientRefs.length === 0) {
                  return <p className="text-sm text-gray-400 text-center py-8">暂无历史转诊记录</p>
                }

                return (
                  <div className="space-y-2">
                    {patientRefs.map(r => (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                          r.id === ref.id ? 'border-[#0BBECF] bg-cyan-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs w-8 flex-shrink-0">
                            {r.id === ref.id ? '📍 本次' : ''}
                          </span>
                          <span className="font-medium text-gray-800">
                            {r.type === 'upward' ? `⬆️ ${upwardDisplayLabel}` : `⬇️ ${downwardDisplayLabel}`}
                          </span>
                          <span className="text-gray-500">{r.diagnosis?.name || '—'}</span>
                          <span className="text-xs text-gray-400">{r.fromInstitution}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('zh-CN') : '—'}
                          </span>
                          {(() => {
                            const historyStatus = getReferralDisplayStatus(r, { role: currentRole, userId: currentUser?.id })
                            return (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                historyStatus === '已完成' ? 'bg-green-100 text-green-700' :
                                historyStatus === '已退回' ? 'bg-orange-50 text-orange-700' :
                                historyStatus === '已拒绝' ? 'bg-gray-100 text-gray-500' :
                                historyStatus === '已撤销' ? 'bg-gray-100 text-gray-500' :
                                historyStatus === '转诊中' ? 'bg-blue-50 text-blue-700' :
                                ['待受理', '待审核'].includes(historyStatus) ? 'bg-orange-50 text-orange-600' :
                                historyStatus === '待接收' ? 'bg-orange-50 text-orange-600' :
                                'bg-gray-100 text-gray-600'
                              }`}>{historyStatus === '待审核' ? '待受理' : historyStatus}</span>
                            )
                          })()}
                          {r.id !== ref.id && (
                            <button
                              onClick={() => navigate(`/referral/${r.id}`)}
                              className="text-xs font-medium hover:underline"
                              style={{ color: '#0BBECF' }}
                            >
                              查看
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* P0-3 接收转诊——承接方式选择弹窗 */}
      {dialog?.type === 'acceptUpward' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDialog(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-96 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-lg">受理转诊申请</h3>
              <p className="text-sm text-gray-500 mt-1">请选择患者承接方式（受理后不可更改）</p>
            </div>
            {ref.internalNote?.includes('号源已满') && (
              <div className="mx-6 mt-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                ⚠️ 注意：该患者提交时号源已满，请在备注中说明就诊安排
              </div>
            )}
            <div className="p-6">
              <div className="space-y-2 mb-6">
                {[
                  { value: 'outpatient', label: '门诊就诊', desc: '患者持预约码到门诊挂号就诊' },
                  { value: 'inpatient',  label: '住院收治', desc: '患者直接前往住院部办理入院' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                    style={admissionType === opt.value ? { borderColor: '#0BBECF', background: '#F0FBFC' } : { borderColor: '#e5e7eb' }}
                  >
                    <input type="radio" name="admissionType" value={opt.value}
                      checked={admissionType === opt.value}
                      onChange={() => setAdmissionType(opt.value)}
                      className="mt-0.5 accent-[#0BBECF]"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDialog(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">取消</button>
                <button
                  onClick={() => handleAction('acceptUpwardConfirm')}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: '#10b981' }}
                >
                  ✓ 确认受理
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      {dialog?.type === 'rejectUpward' && (
        <StructuredReasonDialog
          title="拒绝转诊申请"
          description="请填写拒绝原因，系统将通知基层医生"
          options={UPWARD_REJECT_REASON_OPTIONS}
          confirmText="确认拒绝"
          confirmColor="red"
          onConfirm={(reason) => { setDialog({ type: 'rejectUpward', reason }); handleAction('rejectUpwardConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'cancelUpward' && (
        <StructuredReasonDialog
          title={`撤销${upwardDisplayLabel}申请`}
          description="申请将变更为已撤销状态，县级医生将收到通知"
          options={CANCEL_REASON_OPTIONS}
          confirmText="确认撤销"
          confirmColor="red"
          onConfirm={(reason) => { setDialog({ type: 'cancelUpward', reason }); handleAction('cancelUpwardConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'completeUpward' && (
        <ConfirmDialog
          title="完成接诊确认"
          description={isEmergencyReferral ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-500">确认患者已到院，将由转诊中心完成状态更新和数据上报。</div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                确认后将向患者发送就诊确认短信
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                <div className="text-xs font-medium text-gray-700 mb-2">短信预览</div>
                <div className="text-sm font-mono whitespace-pre-line text-gray-700">{completionSmsPreview}</div>
              </div>
            </div>
          ) : '确认患者已到院，将由转诊中心完成状态更新和数据上报'}
          inputRequired={false}
          confirmText="确认完成接诊"
          confirmColor="green"
          onConfirm={() => handleAction('completeUpwardConfirm')}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'supplementEmergency' && (
        <EmergencySupplementDialog
          referral={ref}
          referrals={referrals}
          onConfirm={(form) => { supplementEmergencyAdmission(id, form); setDialog(null) }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'completeRetroEmergency' && (
        <EmergencySupplementDialog
          referral={ref}
          referrals={referrals}
          title="完成补录并确认"
          description="补录模式下请一次性填写到院与接诊信息，保存后将直接完成接诊确认并触发数据上报。"
          confirmText="完成补录并确认"
          onConfirm={(form) => { setDialog({ type: 'completeRetroEmergency', form }); handleAction('completeRetroEmergencyConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'emergencyModify' && (
        <EmergencyModifyDialog
          referral={ref}
          remainingText={`${emergencyWindowMinutes}:${emergencyWindowSeconds}`}
          onConfirm={(form) => { setDialog({ type: 'emergencyModify', form }); handleAction('emergencyModifyConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'collaborativeClose' && (
        <CollaborativeCloseDialog
          isUpward={isUpward}
          canTransferUpToHigherLevel={canTransferUpToHigherLevel}
          onConfirm={(reason) => { setDialog({ type: 'collaborativeClose', reason }); handleAction('collaborativeCloseConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'completeDownward' && (
        <ConfirmDialog
          title={`完成${downwardDisplayLabel}接收确认`}
          description="确认患者已到达基层机构，系统将自动创建随访任务"
          inputRequired={false}
          confirmText="确认患者已到达"
          confirmColor="green"
          onConfirm={() => handleAction('completeDownwardConfirm')}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'rejectDownward' && (
        <StructuredReasonDialog
          title={`拒绝接收${downwardDisplayLabel}`}
          description="请填写拒绝原因。提交后不会直接终局拒绝，而是进入基层负责人的改派窗口。"
          options={DOWNWARD_DOCTOR_REJECT_REASON_OPTIONS}
          confirmText="确认拒绝"
          confirmColor="red"
          onConfirm={(reason) => { setDialog({ type: 'rejectDownward', reason }); handleAction('rejectDownwardConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'cancelDownward' && (
        <StructuredReasonDialog
          title={`撤销${downwardDisplayLabel}申请`}
          description={`当前${downwardDisplayLabel}单仍处于待接收阶段，撤销后将变为只读存档。`}
          options={CANCEL_REASON_OPTIONS}
          confirmText="确认撤销"
          confirmColor="red"
          onConfirm={(reason) => { setDialog({ type: 'cancelDownward', reason }); handleAction('cancelDownwardConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'reassignDownward' && (
        <DownwardReassignDialog
          referral={ref}
          mode={downwardAllocationMode === 'coordinator' ? 'assign' : 'reassign'}
          transferLabel={downwardDisplayLabel}
          onConfirm={(doctorId, doctorName) => {
            setDialog({ type: 'reassignDownward', doctorId, doctorName })
            handleAction('reassignDownwardConfirm')
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'rejectDownwardByCoordinator' && (
        <DownwardReturnDialog
          onConfirm={(reason) => { setDialog({ type: 'rejectDownwardByCoordinator', reason }); handleAction('rejectDownwardByCoordinatorConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* 修复 B：换机构重新申请确认框 */}
      {dialog?.type === 'changeInstitution' && (
        <ConfirmDialog
          title="换机构重新申请"
          description="将基于当前申请信息创建新转诊单，接收机构需重新选择。原申请单将保持已退回状态。"
          inputRequired={false}
          confirmText="确认创建新申请"
          confirmColor="blue"
          onConfirm={() => handleAction('changeInstitutionConfirm')}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* 修复 B：修改重提确认框 */}
      {dialog?.type === 'resubmit' && (
        <ConfirmDialog
          title="修改重提"
          description="将在原申请基础上修改后重新提交审核，原申请单将保持已退回状态。"
          inputRequired={false}
          confirmText="确认修改重提"
          confirmColor="blue"
          onConfirm={() => handleAction('resubmitConfirm')}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* 修复 B：终止申请确认框（需填写原因） */}
      {dialog?.type === 'terminateRejected' && (
        <StructuredReasonDialog
          title="终止申请"
          description="申请将变更为已关闭状态，本次转诊流程结束。"
          options={isUpward ? UPWARD_CLOSE_REASON_OPTIONS : DOWNWARD_CLOSE_REASON_OPTIONS}
          canTransferUpToHigherLevel={canTransferUpToHigherLevel}
          confirmText="确认终止"
          confirmColor="red"
          onConfirm={(reason) => { setDialog({ type: 'terminateRejected', reason }); handleAction('terminateRejectedConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* P1-3：管理员催办接诊确认（无需弹窗，直接记录日志） */}

      {/* CHG-32：院内审核通过确认框 */}
      {dialog?.type === 'approveInternal' && (
        <ConfirmDialog
          title="院内审核通过"
          description="通过后申请将进入「待受理」状态，系统将通知县级医生"
          inputLabel="审核意见（可选）"
          inputRequired={false}
          confirmText="确认通过"
          confirmColor="green"
          onConfirm={(comment) => { setDialog({ type: 'approveInternal', comment }); handleAction('approveInternalConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* CHG-32：院内审核拒绝确认框 */}
      {dialog?.type === 'rejectInternal' && (
        <StructuredReasonDialog
          title="院内审核拒绝"
          description="申请将退回草稿，基层医生可在原单修改后重新提交"
          options={INTERNAL_REJECT_REASON_OPTIONS}
          confirmText="确认拒绝"
          confirmColor="red"
          onConfirm={(reason) => { setDialog({ type: 'rejectInternal', reason }); handleAction('rejectInternalConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* 变更五：模拟患者通知短信预览弹窗 */}
      {showSmsPreview && (() => {
        const arr = ref.admissionArrangement || {}
        const isInpatient = ref.admissionType === 'inpatient'
        const emergencySmsHistory = (ref.patientSmsLog || []).map(item => ({
          ...item,
          label: item.kind === 'initial'
            ? '首条短信'
            : item.kind === 'completion'
              ? '就诊确认短信'
              : item.kind === 'modify'
                ? '紧急修改短信'
                : '短信记录',
        }))

        let smsBody = ''
        let smsHint = '以上为短信内容预览，实际短信由系统推送平台发送'
        let smsSubtitle = isInpatient ? (ref.bedStatus === 'bed_reserved' ? '住院转诊·已预占床位' : '住院转诊·床位协调中') : '门诊转诊'
        const renderedNotice = renderPatientNoticeTemplate(patientNoticeTemplate, {
          department: arr.department || ref.toDept || '',
          appointmentCode: arr.appointmentCode || ref.appointmentCode || '',
          admissionType: isInpatient ? 'inpatient' : 'outpatient',
          ward: arr.ward || '',
          bedNumber: arr.bedNumber || '',
          nurseStationPhone: arr.nurseStationPhone || '',
        })

        if (isEmergencyReferral && emergencySmsHistory.length > 0) {
          smsSubtitle = `${isGreenChannel ? '绿通' : '急诊'}转诊短信记录`
          smsHint = '首条短信在提交时发送；紧急修改后会重新发送患者短信；完成接诊确认后会发送就诊确认短信'
        } else if (!isInpatient) {
          smsBody = `您的转诊已确认
就诊科室：${arr.department || '—'}（${arr.floor || ''}${arr.room || ''}）
接诊医生：${arr.doctorName || '科室安排'}
就诊时间：${arr.visitTime ? new Date(arr.visitTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
联系电话：${arr.departmentPhone || '—'}
预约码：${arr.appointmentCode || '—'}
凭本短信优先就诊

——就诊须知——
${renderedNotice}`
        } else if (ref.bedStatus === 'bed_reserved') {
          smsBody = `您的转诊已确认
就诊科室：${arr.department || '—'}
就诊时间：${arr.visitTime ? new Date(arr.visitTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
预约码：${arr.appointmentCode || '—'}
━━━━━━━━━━━
住院安排：
病区：${arr.ward || '—'}
床位：${arr.bedNumber || '入院时由护士站安排'}
护士站电话：${arr.nurseStationPhone || '—'}
请持本短信至护士站办理入院

——就诊须知——
${renderedNotice}`
        } else {
          // bedFull / not_applicable（住院但床位未锁定）
          smsBody = `您的转诊已确认
就诊科室：${arr.department || '—'}
就诊时间：${arr.visitTime ? new Date(arr.visitTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
预约码：${arr.appointmentCode || '—'}
━━━━━━━━━━━
住院安排：床位正在协调中，
请至${arr.ward || '护士站'}联系：${arr.nurseStationPhone || arr.departmentPhone || '—'}

——就诊须知——
${renderedNotice}`
        }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowSmsPreview(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl w-[380px]">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-800">📱 患者通知短信预览</div>
                  <div className="text-xs text-gray-400 mt-0.5">{smsSubtitle}</div>
                </div>
                <button onClick={() => setShowSmsPreview(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              <div className="p-5">
                {isEmergencyReferral && emergencySmsHistory.length > 0 ? (
                  <div className="space-y-3">
                    {emergencySmsHistory.map(item => (
                      <div key={`${item.kind}-${item.sentAt}`} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">{item.label}</span>
                          <span className="text-[11px] text-gray-400">{formatTime(item.sentAt)}</span>
                        </div>
                        <div className="px-4 py-3 text-sm font-mono whitespace-pre-line text-gray-700 leading-relaxed bg-white">
                          {item.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono whitespace-pre-line text-gray-700 leading-relaxed">
                    {smsBody}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3">{smsHint}</p>
              </div>
              <div className="px-5 pb-4 flex justify-end">
                <button
                  onClick={() => setShowSmsPreview(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >关闭</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* M-7：管理员填写接诊安排 Modal */}
      {showArrangementModal && !isEmergencyReferral && (() => {
        const inst = INSTITUTIONS.find(i => i.name === ref.toInstitution)
        const deptBedInfo = inst?.departmentInfo?.[ref.toDept]
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
        const bedOccupied = deptBedInfo?.dailyReservedBeds > 0
          ? referrals.filter(r =>
              r.toDept === ref.toDept &&
              r.bedStatus === 'bed_reserved' &&
              r.admissionArrangement?.bedReservedAt &&
              new Date(r.admissionArrangement.bedReservedAt) >= todayStart
            ).length
          : 0
        return (
          <ArrangementModal
            referral={ref}
            admissionType={ref.admissionType}
            deptBedInfo={deptBedInfo}
            bedOccupied={bedOccupied}
            onClose={() => setShowArrangementModal(false)}
            onSubmit={(form) => {
              fillAdmissionArrangement(id, form)
              setShowArrangementModal(false)
              setDialog({
                type: 'notice',
                title: '接诊安排已提交',
                description: `预约取号码已发送至基层医生，患者可按安排到院就诊。${ref.appointmentCode ? `\n当前预约码：${ref.appointmentCode}` : ''}`
              })
            }}
          />
        )
      })()}

      {dialog?.type === 'notice' && (
        <NoticeDialog
          title={dialog.title}
          description={dialog.description}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

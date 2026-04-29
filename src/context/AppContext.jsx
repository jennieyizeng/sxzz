import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  ROLES, MOCK_USERS, MOCK_REFERRALS_INIT, MOCK_NOTIFICATIONS_INIT, INSTITUTIONS,
  UPWARD_STATUS, DOWNWARD_STATUS
} from '../data/mockData'
import { getAuditConfig } from '../data/auditRuleConfig'
import {
  buildEmergencyInitialSms,
  buildEmergencyModifySms,
  buildEmergencyReferralCode,
  canViewEmergencyReferralDetail,
  shouldShowNotificationToUser,
} from '../utils/emergencyReferral'
import { resolveFollowupTaskMeta } from '../utils/followupTasks'
import {
  buildDownwardReopenState,
  buildDownwardSelfAcceptState,
} from '../utils/downwardReferralTransitions'
import {
  buildStructuredReasonText,
  CANCEL_REASON_OPTIONS,
  DOWNWARD_CLOSE_REASON_OPTIONS,
  DOWNWARD_DOCTOR_REJECT_REASON_OPTIONS,
  DOWNWARD_INSTITUTION_RETURN_REASON_OPTIONS,
  INTERNAL_REJECT_REASON_OPTIONS,
  UPWARD_CLOSE_REASON_OPTIONS,
  UPWARD_REJECT_REASON_OPTIONS,
} from '../constants/reasonCodes'
import { buildPhoneCallLogEntry } from '../utils/phoneCall'

// F-09 操作日志事件类型枚举（P2-2：补充新增类型）
// eslint-disable-next-line react-refresh/only-export-components
export const LOG_EVENTS = {
  // 转诊生命周期
  REFERRAL_SUBMITTED:           'REFERRAL_SUBMITTED',
  REFERRAL_CLAIMED:             'REFERRAL_CLAIMED',
  REFERRAL_ACCEPTED:            'REFERRAL_ACCEPTED',
  REFERRAL_REJECTED:            'REFERRAL_REJECTED',
  REFERRAL_CANCELLED:           'REFERRAL_CANCELLED',
  REFERRAL_COMPLETED:           'REFERRAL_COMPLETED',
  REFERRAL_CLOSED:              'REFERRAL_CLOSED',
  REFERRAL_REOPENED:            'REFERRAL_REOPENED',
  // 下转
  DOWNWARD_CREATED:             'DOWNWARD_CREATED',
  DOWNWARD_ACCEPTED:            'DOWNWARD_ACCEPTED',
  DOWNWARD_REJECTED:            'DOWNWARD_REJECTED',
  DOWNWARD_CANCELLED:           'DOWNWARD_CANCELLED',
  DOWNWARD_REASSIGNED:          'DOWNWARD_REASSIGNED',
  DOWNWARD_COORDINATOR_ACCEPTED:'DOWNWARD_COORDINATOR_ACCEPTED',
  DOWNWARD_COORDINATOR_REJECTED:'DOWNWARD_COORDINATOR_REJECTED',
  DOWNWARD_COLLABORATIVE_CLOSED:'DOWNWARD_COLLABORATIVE_CLOSED',
  DOWNWARD_COMPLETED:           'DOWNWARD_COMPLETED',
  DOWNWARD_TIMEOUT_CLOSED:      'DOWNWARD_TIMEOUT_CLOSED',
  // 预约码
  APPOINTMENT_CODE_GENERATED:   'APPOINTMENT_CODE_GENERATED',
  APPOINTMENT_CODE_CONSUMED:    'APPOINTMENT_CODE_CONSUMED',
  APPOINTMENT_CODE_EXPIRED:     'APPOINTMENT_CODE_EXPIRED',     // 新增
  APPOINTMENT_CODE_RELEASED:    'APPOINTMENT_CODE_RELEASED',    // 新增（撤销/关闭时释放）
  // 号源
  QUOTA_RESERVED:               'QUOTA_RESERVED',               // 新增
  QUOTA_RELEASED:               'QUOTA_RELEASED',               // 新增
  // 床位池（J-4）
  BED_RESERVED:                 'BED_RESERVED',
  BED_USED:                     'BED_USED',
  BED_RELEASED:                 'BED_RELEASED',
  BED_EXPIRED:                  'BED_EXPIRED',
  // 管理员操作
  ADMIN_ASSIGNED_DOCTOR:        'ADMIN_ASSIGNED_DOCTOR',
  URGE_CONFIRM:                 'URGE_CONFIRM',
  // 急诊告警
  EMERGENCY_ESCALATED:          'EMERGENCY_ESCALATED',          // 新增
  // 知情同意
  CONSENT_SIGNED:               'CONSENT_SIGNED',
  CONSENT_DEFERRED:             'CONSENT_DEFERRED',
  CONSENT_SUPPLEMENTED:         'CONSENT_SUPPLEMENTED',
}

const AppContext = createContext(null)

function getInstitutionByName(name) {
  return INSTITUTIONS.find(inst => inst.name === name) || null
}

function getDepartmentConfig(institutionName, departmentName) {
  const inst = getInstitutionByName(institutionName)
  return inst?.departmentInfo?.[departmentName] || null
}

function formatSmsTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function buildEmergencyCompletionSms({ institutionName, actualDepartment, admissionType, departmentPhone, ward, nurseStationPhone }) {
  const admissionTypeLabel = admissionType === 'inpatient'
    ? `住院收治（病区：${ward || '—'}，护士站电话：${nurseStationPhone || '—'}）`
    : admissionType === 'observation'
      ? '留观处理'
      : '门诊就诊'
  return `【就诊确认】您在${institutionName || '目标医院'}的急诊\n转诊已完成接诊确认。\n实际就诊科室：${actualDepartment || '—'}\n承接方式：${admissionTypeLabel}\n如有疑问请联系：${departmentPhone || '—'}`
}

function toDateOnly(value) {
  if (!value) return new Date().toISOString().split('T')[0]
  const normalized = String(value)
  return normalized.includes('T') ? normalized.split('T')[0] : normalized
}

function normalizeConsentFields(referral) {
  const consentMethod = referral?.consentMethod
    || (referral?.consentDeferred ? 'pending_upload' : referral?.consentSigned ? 'offline_upload' : null)

  return {
    ...referral,
    consentMethod,
    consentFileUrl: referral?.consentFileUrl
      ?? (consentMethod === 'offline_upload' && referral?.consentSigned ? `mock://consent/${referral.id || Date.now()}` : null),
    consentUploadedAt: referral?.consentUploadedAt ?? referral?.consentTime ?? null,
    consentSignedBy: referral?.consentSignedBy || 'patient',
  }
}

function normalizeStructuredReasonSelection(value, options = []) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const reasonCode = value.reasonCode || 'other'
    const reasonText = String(value.reasonText || '').trim() || null
    return {
      reasonCode,
      reasonText,
      label: buildStructuredReasonText(options, reasonCode, reasonText) || reasonText || '',
    }
  }

  const legacyText = String(value || '').trim()
  return {
    reasonCode: legacyText ? 'other' : null,
    reasonText: legacyText || null,
    label: legacyText,
  }
}

export function AppProvider({ children }) {
  // 当前登录角色（演示用切换器）——持久化到 sessionStorage，防止 URL 直接导航后角色重置
  const [currentRole, setCurrentRole] = useState(() => {
    const saved = sessionStorage.getItem('demo_current_role')
    return (saved && Object.values(ROLES).includes(saved)) ? saved : ROLES.PRIMARY
  })

  // 包装 setCurrentRole，同步写入 sessionStorage
  const setCurrentRoleAndPersist = (role) => {
    sessionStorage.setItem('demo_current_role', role)
    setCurrentRole(role)
  }

  // 转诊记录列表（全局 state，所有角色共享）
  // CHG-39: 初始化时统一补齐知情同意新字段，兼容历史 mock 数据
  const [referrals, setReferrals] = useState(() => MOCK_REFERRALS_INIT.map(normalizeConsentFields))

  // 通知消息
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS_INIT)

  // ─────────────── 通知操作 ───────────────

  const addNotification = useCallback((notif) => {
    setNotifications(prev => [{
      id: `n${Date.now()}`,
      ...notif,
      read: false,
      createdAt: new Date().toISOString(),
    }, ...prev])
  }, [])

  const markNotificationRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  // 当前用户信息
  const currentUser = MOCK_USERS[currentRole]

  // ─────────────── 状态机操作 ───────────────

  // 提交上转申请（草稿→待受理，急诊直接进入转诊中）
  // P0-7：急诊转诊提交时立即同时通知三方（对口医生 + 科室负责人 + 转诊管理员）
  const submitReferral = useCallback((referralData) => {
    const isEmergencyBypass = referralData.is_emergency && !referralData.consentSigned
    const isEmergency = !!referralData.is_emergency
    // CHG-41: 急诊补录模式仅记账，不触发实时联动
    const isRetroEntry = isEmergency && !!referralData.isRetroEntry
    const shouldSendEmergencyRealtimeSignals = isEmergency && !isRetroEntry
    const nowIso = new Date().toISOString()
    const targetInstitution = getInstitutionByName(referralData.toInstitution)
    const emergencyDeptPhone = targetInstitution?.emergencyDeptPhone || targetInstitution?.departmentInfo?.['急诊科']?.nurseStationPhone || ''
    const referralCode = isEmergency ? buildEmergencyReferralCode(nowIso) : null
    const initialSmsContent = shouldSendEmergencyRealtimeSignals
      ? buildEmergencyInitialSms({
          institutionName: referralData.toInstitution,
          targetDepartment: referralData.linkedSpecialty || referralData.toDept,
          emergencyDeptPhone,
          referralCode,
          isGreenChannel: referralData.referral_type === 'green_channel',
        })
      : null
    const newRef = {
      ...referralData,
      id: `REF${Date.now()}`,
      status: isEmergency ? UPWARD_STATUS.IN_TRANSIT : UPWARD_STATUS.PENDING,
      admissionType: isEmergency ? 'emergency' : referralData.admissionType,
      referralCode,
      referralNo: isEmergency ? referralCode : (referralData.referralNo ?? null),
      createdAt: nowIso,
      updatedAt: nowIso,
      transferredAt: isEmergency ? nowIso : null,
      // CHG-39: 线下签署字段，旧字段继续保留以兼容现有页面逻辑
      consentMethod: referralData.consentMethod || (isEmergencyBypass ? 'pending_upload' : 'offline_upload'),
      consentFileUrl: referralData.consentFileUrl ?? null,
      consentUploadedAt: referralData.consentUploadedAt ?? (isEmergencyBypass ? null : nowIso),
      consentSignedBy: referralData.consentSignedBy || 'patient',
      consentSigned: !isEmergencyBypass,
      consentTime: isEmergencyBypass ? null : nowIso,
      consentDeferred: isEmergencyBypass || undefined,
      // P0-6 默认字段
      assignedDoctorId: referralData.assignedDoctorId ?? null,
      assignedDoctorName: referralData.assignedDoctorName ?? null,
      isUrgentUnhandled: false,
      isRetroEntry,
      retroEntryOperatorId: isRetroEntry ? currentUser.id : null,
      retroEntryOperatorName: isRetroEntry ? currentUser.name : null,
      adminAssigned: false,
      internalNote: referralData.internalNote ?? '',
      emergencyModifiableUntil: shouldSendEmergencyRealtimeSignals ? new Date(new Date(nowIso).getTime() + 15 * 60 * 1000).toISOString() : null,
      emergencyAlertConfirmedAt: null,
      emergencyAlertConfirmedBy: null,
      emergencyAlertConfirmedByName: null,
      firstViewedAt: null,
      linkedSpecialty: referralData.linkedSpecialty || null,
      admissionArrangement: null,
      emergencyModifyAt: null,
      emergencyModifyNotifiedAt: null,
      closeReason: null,
      hisVisitId: null,
      reminderSent48h: false,
      patientSmsLog: shouldSendEmergencyRealtimeSignals
        ? [{ kind: 'initial', sentAt: nowIso, content: initialSmsContent, status: '已送达' }]
        : [],
      emergencyNotificationStatus: isEmergency
        ? {
            emergencyDuty: shouldSendEmergencyRealtimeSignals,
            departmentHead: shouldSendEmergencyRealtimeSignals,
            referralCenter: shouldSendEmergencyRealtimeSignals,
            targetSpecialistHead: shouldSendEmergencyRealtimeSignals && referralData.referral_type === 'green_channel' && !!referralData.linkedSpecialty,
          }
        : null,
      patientArrivedAt: isRetroEntry ? (referralData.patientArrivedAt || null) : null,
      emergencyAdmissionType: null,
      specialistConsultRequested: false,
      logs: [
        ...(referralData.logs || []),
        { time: nowIso, actor: currentUser.name, action: isEmergency ? (isRetroEntry ? '提交急诊补录申请，直接进入转诊中' : '提交急诊上转申请，直接进入转诊中') : '提交上转申请' },
        // CHG-40: 记录上转提交时的基层当前就诊类型
        ...(referralData.sourceVisitType ? [{
          time: nowIso,
          actor: currentUser.name,
          action: `提交字段记录：基层当前就诊类型=${referralData.sourceVisitType === 'inpatient' ? '住院' : '门诊'}`,
        }] : []),
        ...(isRetroEntry ? [{
          time: nowIso,
          actor: currentUser.name,
          action: 'CHG-41：提交字段记录：isRetroEntry=true',
          note: `补录操作人=${currentUser.name}${referralData.patientArrivedAt ? `；患者到院时间=${formatSmsTime(referralData.patientArrivedAt)}` : ''}`,
        }] : []),
        ...(isEmergencyBypass ? [{ time: nowIso, actor: '系统', action: '急诊知情同意待补传，需24小时内完成线下签署并上传附件' }] : []),
        ...(isEmergency ? [{
          time: nowIso,
          actor: '系统',
          action: shouldSendEmergencyRealtimeSignals
            ? (
                referralData.referral_type === 'green_channel' && referralData.linkedSpecialty
                  ? `急诊转诊：已自动通知转诊中心、急诊科值班及${referralData.linkedSpecialty}负责人，并向患者发送首条就诊短信`
                  : '急诊转诊：已自动通知转诊中心、急诊科值班及相关负责人，并向患者发送首条就诊短信'
              )
            : 'CHG-41：补录模式提交，不触发实时通知、不发送患者短信、不进入紧急修改窗口',
        }] : [
          { time: nowIso, actor: '系统', action: '通知推送至县级接诊科室' },
        ]),
      ],
    }
    setReferrals(prev => [newRef, ...prev])

    if (shouldSendEmergencyRealtimeSignals) {
      // P0-7 ① 对口联系医生（isPreferredDoctor=true → ROLES.COUNTY）
      addNotification({
        type: 'emergency_new',
        title: '🚨 急诊上转申请——请立即处理',
        content: `【急诊】患者${referralData.patient?.name}（${referralData.diagnosis?.name}）急诊上转已自动通知，急诊科电话：${emergencyDeptPhone || '待配置'}`,
        targetRole: ROLES.COUNTY,
        targetInstitution: referralData.toInstitution,
        referralId: newRef.id,
      })
      // P0-7 ② 科室负责人（isDepartmentHead=true → ROLES.COUNTY2）
      addNotification({
        type: 'emergency_new',
        title: '🚨 急诊上转申请——请立即处理',
        content: `【急诊·科室负责人】患者${referralData.patient?.name}（${referralData.diagnosis?.name}）急诊上转已自动通知，请督促科室尽快响应`,
        targetRole: ROLES.COUNTY2,
        targetInstitution: referralData.toInstitution,
        referralId: newRef.id,
      })
      // P0-7 ③ 转诊管理员
      addNotification({
        type: 'emergency_new',
        title: '🚨 急诊上转申请——请关注处理进度',
        content: `【急诊·管理员】患者${referralData.patient?.name}（${referralData.diagnosis?.name}）急诊上转已提交，请尽快补录接诊信息并跟进流程`,
        targetRole: ROLES.ADMIN,
        referralId: newRef.id,
      })
    } else if (!isEmergency) {
      // 普通上转只通知县级医生
      addNotification({
        type: 'upward_new',
        title: '新上转申请待受理',
        content: `患者${referralData.patient?.name}（${referralData.diagnosis?.name}）上转申请待受理`,
        targetRole: ROLES.COUNTY,
        referralId: newRef.id,
      })
    }

    return newRef.id
  }, [addNotification, currentUser])

  // P0-6：县级医生受理（待受理→待受理，锁定经办医生）
  // 广播=信息通知，受理动作明确责任归属；防重复受理
  const claimReferral = useCallback((referralId) => {
    const target = referrals.find(r => r.id === referralId)
    if (!target) return { success: false, error: 'NOT_FOUND' }
    // 已被他人受理则拒绝
    if (target.assignedDoctorId && target.assignedDoctorId !== currentUser.id) {
      return { success: false, error: 'ALREADY_ASSIGNED', assignedDoctorName: target.assignedDoctorName }
    }
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        assignedDoctor: currentUser.name,       // 兼容旧字段
        assignedDoctorId: currentUser.id,       // P0-6 新字段
        assignedDoctorName: currentUser.name,   // P0-6 新字段
        assignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '受理申请，已归入名下处理' },
          { time: new Date().toISOString(), actor: '系统', action: '其他医生已不可受理该申请' },
        ],
      }
    }))
    return { success: true }
  }, [currentUser, referrals])

  // 县级接收上转（待审核→转诊中，无独立已接收状态）
  // C-4 修复：预约码由管理员填写 admissionArrangement 时生成，接收时不再生成
  const acceptReferral = useCallback((referralId, admissionType = 'outpatient') => {
    const refNo = `ZZ${Date.now()}`
    const admissionLabel = { outpatient: '门诊就诊', inpatient: '住院收治', emergency: '急诊处置' }[admissionType] || '门诊就诊'
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        status: UPWARD_STATUS.IN_TRANSIT,
        toDoctor: currentUser.name,
        referralNo: refNo,
        admissionType,
        acceptedAt: new Date().toISOString(),
        transferredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reminderSent48h: false,
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: `接收转诊申请，承接方式：${admissionLabel}` },
          { time: new Date().toISOString(), actor: '系统', action: `生成电子转诊单 ${refNo}` },
          { time: new Date().toISOString(), actor: '系统', action: '通知基层医生：申请已受理，待转诊中心安排到院时间' },
        ],
      }
    }))

    const ref = referrals.find(r => r.id === referralId)
    addNotification({
      type: 'upward_accepted',
      title: '转诊申请已受理',
      content: `您发起的患者${ref?.patient?.name}的转诊申请已被受理，转诊单编号：${refNo}。请告知患者：到院仍需正常挂号缴费，预约码不免除费用。`,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
  }, [addNotification, currentUser, referrals])

  // 县级拒绝上转（待审核→已拒绝）
  // J-4：拒绝时将 bed_reserved → bed_released
  const rejectReferral = useCallback((referralId, reason) => {
    const normalizedReason = normalizeStructuredReasonSelection(reason, UPWARD_REJECT_REASON_OPTIONS)
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const newBedStatus = r.bedStatus === 'bed_reserved' ? 'bed_released' : r.bedStatus
      return {
        ...r,
        status: UPWARD_STATUS.REJECTED,
        rejectReason: normalizedReason.label,
        rejectReasonCode: normalizedReason.reasonCode,
        rejectReasonText: normalizedReason.reasonText,
        updatedAt: new Date().toISOString(),
        bedStatus: newBedStatus,
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '拒绝转诊申请', note: normalizedReason.label },
          { time: new Date().toISOString(), actor: '系统', action: '通知基层医生：申请被拒绝' },
          ...(newBedStatus === 'bed_released' ? [{ time: new Date().toISOString(), actor: '系统', action: '床位已释放（申请被拒绝）' }] : []),
        ],
      }
    }))

    const ref = referrals.find(r => r.id === referralId)
    addNotification({
      type: 'upward_rejected',
      title: '转诊申请被拒绝',
      content: `患者${ref?.patient?.name}的转诊申请被拒绝，原因：${normalizedReason.label}`,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
  }, [addNotification, currentUser, referrals])

  // 撤销上转（待审核→已撤销）
  // J-4：撤销时将 bed_reserved → bed_released（主动释放床位）
  const cancelReferral = useCallback((referralId, reason) => {
    const normalizedReason = normalizeStructuredReasonSelection(reason, CANCEL_REASON_OPTIONS)
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const newBedStatus = r.bedStatus === 'bed_reserved' ? 'bed_released' : r.bedStatus
      return {
        ...r,
        status: UPWARD_STATUS.CANCELLED,
        closeReason: normalizedReason.label,
        cancelReasonCode: normalizedReason.reasonCode,
        cancelReasonText: normalizedReason.reasonText,
        updatedAt: new Date().toISOString(),
        bedStatus: newBedStatus,
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '撤销转诊申请', note: normalizedReason.label },
          ...(newBedStatus === 'bed_released' ? [{ time: new Date().toISOString(), actor: '系统', action: '床位已释放（申请撤销）' }] : []),
        ],
      }
    }))
  }, [currentUser])

  // 转诊中心完成接诊确认（转诊中→已完成）
  // CHG-35：接诊确认权从县级医生转移给转诊管理员
  const completeReferral = useCallback((referralId) => {
    const completedAt = new Date().toISOString()
    const ref = referrals.find(r => r.id === referralId)
    const isRetroEntry = !!ref?.isRetroEntry
    const completionSms = ref?.is_emergency && !isRetroEntry
      ? buildEmergencyCompletionSms({
          institutionName: ref?.toInstitution,
          actualDepartment: ref?.admissionArrangement?.department,
          admissionType: ref?.emergencyAdmissionType,
          departmentPhone: ref?.admissionArrangement?.departmentPhone,
          ward: ref?.admissionArrangement?.ward,
          nurseStationPhone: ref?.admissionArrangement?.nurseStationPhone,
        })
      : null
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const newBedStatus = r.bedStatus === 'bed_reserved' ? 'bed_used' : r.bedStatus
      return {
        ...r,
        status: UPWARD_STATUS.COMPLETED,
        completedAt,
        updatedAt: completedAt,
        appointmentCodeStatus: r.appointmentInfo?.status === 'reserved' ? 'used' : (r.appointmentCodeStatus || null),
        hisVisitId: r.hisVisitId ?? null,
        appointmentInfo: r.appointmentInfo?.status === 'reserved'
          ? {
              ...r.appointmentInfo,
              status: 'used',
              consumedAt: completedAt,
              consumedBy: currentUser.id,
            }
          : r.appointmentInfo,
        patientSmsLog: completionSms
          ? [...(r.patientSmsLog || []), { kind: 'completion', sentAt: completedAt, content: completionSms, status: '已送达' }]
          : r.patientSmsLog,
        bedStatus: newBedStatus,
        logs: [
          ...r.logs,
          { time: completedAt, actor: currentUser.name, action: '完成接诊确认（转诊中心）' },
          { time: completedAt, actor: '系统', action: isRetroEntry ? 'CHG-41：补录模式完成接诊确认，状态更新为已完成并触发数据上报（未发送实时通知）' : '状态更新为已完成，触发数据上报' },
          ...(completionSms ? [{ time: completedAt, actor: '系统', action: '已向患者发送就诊确认短信' }] : []),
          ...(r.appointmentInfo?.status === 'reserved' ? [{ time: completedAt, actor: '系统', action: '预约码已核销（转诊完成）' }] : []),
          ...(newBedStatus === 'bed_used' ? [{ time: completedAt, actor: '系统', action: '床位已核销（患者已入院）' }] : []),
        ],
      }
    }))
    if (!isRetroEntry) {
      addNotification({
        type: 'upward_completed',
        title: '上转已完成',
        content: `患者${ref?.patient?.name}上转已完成`,
        targetRole: ROLES.PRIMARY,
        referralId,
      })
      addNotification({
        type: 'upward_completed',
        title: '上转已完成',
        content: `患者${ref?.patient?.name}上转已完成，转诊中心已确认接诊`,
        targetRole: ROLES.ADMIN,
        referralId,
      })
    }
  }, [addNotification, currentUser, referrals])

  // 基层接收下转（待接收→转诊中，与上转对称，无独立已接收状态）
  // C-1 修复：接收时同步写入 downwardAssignedDoctorId，完成接收锁定（CHG-31）
  const acceptDownwardReferral = useCallback((referralId) => {
    const target = referrals.find(r => r.id === referralId)
    if (!target) return
    if (target.designatedDoctorId && target.designatedDoctorId !== currentUser.id) return
    // 已被他人受理则拒绝（防御性检查，UI层也有锁定逻辑）
    if (target.downwardAssignedDoctorId && target.downwardAssignedDoctorId !== currentUser.id) return
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        status: DOWNWARD_STATUS.IN_TRANSIT,
        allocationMode: r.allocationMode === 'coordinator_reassign' ? 'coordinator_reassign' : r.allocationMode,
        downwardAssignedDoctorId: currentUser.id,
        downwardAssignedDoctorName: currentUser.name,
        designatedDoctorId: currentUser.id,
        designatedDoctorName: currentUser.name,
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '确认接收下转申请，患者转入转诊中' },
          { time: new Date().toISOString(), actor: '系统', action: '接收锁定：其他医生已不可重复接收该下转申请' },
          { time: new Date().toISOString(), actor: '系统', action: '通知县级医生：下转已接收' },
        ],
      }
    }))
  }, [currentUser, referrals])

  // 基层完成下转接收（已接收→已完成）
  const completeDownwardReferral = useCallback((referralId) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const taskMeta = resolveFollowupTaskMeta(r)
      return {
        ...r,
        status: DOWNWARD_STATUS.COMPLETED,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        followUpTaskMeta: {
          ...taskMeta,
          id: r.followUpTaskId || taskMeta.id,
          status: 'pending',
          nextVisitDate: r.rehabPlan?.followupDate || taskMeta.nextVisitDate,
          visitCount: taskMeta.visitCount ?? 0,
          lastFollowupAt: taskMeta.lastFollowupAt ?? null,
          records: taskMeta.records ?? [],
          assignedDoctorId: r.downwardAssignedDoctorId || taskMeta.assignedDoctorId,
          assignedDoctorName: r.downwardAssignedDoctorName || taskMeta.assignedDoctorName,
          indicators: r.rehabPlan?.indicators || taskMeta.indicators || [],
          createdAt: taskMeta.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '完成患者接收确认' },
          { time: new Date().toISOString(), actor: '系统', action: '自动创建随访任务' },
          { time: new Date().toISOString(), actor: '系统', action: '触发四川健康通数据上报' },
        ],
      }
    }))
  }, [currentUser])

  const recordFollowupVisit = useCallback((referralId, payload) => {
    const nowIso = new Date().toISOString()
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const taskMeta = resolveFollowupTaskMeta(r)
      const entry = {
        id: `fur-${Date.now()}`,
        type: 'followup',
        status: '随访已记录',
        method: payload.method,
        followupDate: toDateOnly(payload.followupDate),
        patientStatus: payload.patientStatus,
        metricSummary: Object.entries(payload.metrics || {})
          .filter(([, value]) => value)
          .map(([label, value]) => `${label} ${value}`)
          .join('；'),
        summary: payload.summary || '—',
        advice: payload.patientStatus === '需上转'
          ? '建议尽快复诊并评估是否重新发起转诊。'
          : (payload.nextFollowupDate ? `建议于 ${toDateOnly(payload.nextFollowupDate)} 前完成下一次随访。` : '按医嘱继续居家观察与康复训练。'),
        nextFollowupDate: payload.nextFollowupDate || '',
        doctorName: currentUser.name,
      }

      return {
        ...r,
        updatedAt: nowIso,
        followUpTaskMeta: {
          ...taskMeta,
          status: 'in_progress',
          nextVisitDate: payload.nextFollowupDate || taskMeta.nextVisitDate || r.rehabPlan?.followupDate || '',
          visitCount: (taskMeta.visitCount || 0) + 1,
          lastFollowupAt: toDateOnly(payload.followupDate),
          records: [entry, ...(taskMeta.records || [])],
          assignedDoctorId: r.downwardAssignedDoctorId || taskMeta.assignedDoctorId,
          assignedDoctorName: r.downwardAssignedDoctorName || taskMeta.assignedDoctorName,
          indicators: r.rehabPlan?.indicators || taskMeta.indicators || [],
          createdAt: taskMeta.createdAt || nowIso,
          updatedAt: nowIso,
        },
        logs: [
          ...r.logs,
          { time: nowIso, actor: currentUser.name, action: `记录一次随访，患者状态：${payload.patientStatus}` },
        ],
      }
    }))
    return { success: true }
  }, [currentUser.name])

  const markFollowupUnreachable = useCallback((referralId, reason) => {
    const nowIso = new Date().toISOString()
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const taskMeta = resolveFollowupTaskMeta(r)
      const entry = {
        id: `fur-unreachable-${Date.now()}`,
        type: 'unreachable',
        status: '未联系上',
        method: '电话',
        followupDate: toDateOnly(nowIso),
        patientStatus: '未联系上',
        metricSummary: '',
        summary: reason || '本次尝试联系未成功',
        advice: '任务保持待随访，请后续继续联系患者。',
        nextFollowupDate: taskMeta.nextVisitDate || r.rehabPlan?.followupDate || '',
        doctorName: currentUser.name,
      }

      return {
        ...r,
        updatedAt: nowIso,
        followUpTaskMeta: {
          ...taskMeta,
          status: 'pending',
          nextVisitDate: taskMeta.nextVisitDate || r.rehabPlan?.followupDate || '',
          visitCount: taskMeta.visitCount || 0,
          lastFollowupAt: taskMeta.lastFollowupAt || null,
          records: [entry, ...(taskMeta.records || [])],
          assignedDoctorId: r.downwardAssignedDoctorId || taskMeta.assignedDoctorId,
          assignedDoctorName: r.downwardAssignedDoctorName || taskMeta.assignedDoctorName,
          indicators: r.rehabPlan?.indicators || taskMeta.indicators || [],
          createdAt: taskMeta.createdAt || nowIso,
          updatedAt: nowIso,
        },
        logs: [
          ...r.logs,
          { time: nowIso, actor: currentUser.name, action: '记录一次未联系随访，任务保持待随访', note: reason || '本次尝试联系未成功' },
        ],
      }
    }))
    return { success: true }
  }, [currentUser.name])

  const requestFollowupReassign = useCallback((referralId, reason) => {
    const nowIso = new Date().toISOString()
    const referral = referrals.find(item => item.id === referralId)
    if (!referral) return { success: false, error: 'NOT_FOUND' }

    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const taskMeta = resolveFollowupTaskMeta(r)
      const entry = {
        id: `fur-reassign-${Date.now()}`,
        type: 'reassign',
        status: '已申请转派',
        method: '系统提交',
        followupDate: toDateOnly(nowIso),
        patientStatus: '待负责人处理',
        metricSummary: '',
        summary: reason || '已提交转派申请',
        advice: '等待基层负责人处理转派申请。',
        nextFollowupDate: taskMeta.nextVisitDate || r.rehabPlan?.followupDate || '',
        doctorName: currentUser.name,
      }

      return {
        ...r,
        updatedAt: nowIso,
        followUpTaskMeta: {
          ...taskMeta,
          status: taskMeta.status || 'pending',
          nextVisitDate: taskMeta.nextVisitDate || r.rehabPlan?.followupDate || '',
          visitCount: taskMeta.visitCount || 0,
          lastFollowupAt: taskMeta.lastFollowupAt || null,
          records: [entry, ...(taskMeta.records || [])],
          pendingReassignReason: reason || '已提交转派申请',
          assignedDoctorId: r.downwardAssignedDoctorId || taskMeta.assignedDoctorId,
          assignedDoctorName: r.downwardAssignedDoctorName || taskMeta.assignedDoctorName,
          indicators: r.rehabPlan?.indicators || taskMeta.indicators || [],
          createdAt: taskMeta.createdAt || nowIso,
          updatedAt: nowIso,
        },
        logs: [
          ...r.logs,
          { time: nowIso, actor: currentUser.name, action: '提交随访转派申请', note: reason || '已提交转派申请' },
        ],
      }
    }))

    addNotification({
      type: 'followup_reassign_request',
      title: '随访转派申请待处理',
      content: `${currentUser.name} 为患者${referral.patient?.name || '—'}提交了随访转派申请，请尽快处理`,
      targetRole: ROLES.PRIMARY_HEAD,
      targetInstitution: referral.toInstitution,
      referralId,
    })

    return { success: true }
  }, [addNotification, currentUser.name, referrals])

  // 县级发起下转（新建下转单）
  const createDownwardReferral = useCallback((data) => {
    const nowIso = new Date().toISOString()
    const allocationMode = data.allocationMode || (data.designatedDoctorId ? 'designated' : 'coordinator')
    const newRef = {
      ...data,
      id: `REF${Date.now()}`,
      type: 'downward',
      status: DOWNWARD_STATUS.PENDING,
      fromDoctor: currentUser.name,
      fromInstitution: currentUser.institution,
      allocationMode,
      allocationModeChangedAt: nowIso,
      designatedDoctorId: data.designatedDoctorId || null,
      designatedDoctorName: data.designatedDoctorName || null,
      rejectedDoctorIds: data.rejectedDoctorIds || [],
      designatedDoctorRejectLog: data.designatedDoctorRejectLog || [],
      coordinatorActionAt: null,
      coordinatorRejectReason: null,
      coordinatorActionLog: data.coordinatorActionLog || [],
      createdAt: nowIso,
      updatedAt: nowIso,
      // CHG-39: 下转默认走线下签署并上传
      consentMethod: data.consentMethod || 'offline_upload',
      consentFileUrl: data.consentFileUrl ?? null,
      consentUploadedAt: data.consentUploadedAt ?? nowIso,
      consentSignedBy: data.consentSignedBy || 'patient',
      consentSigned: true,
      consentTime: nowIso,
      closeReason: null,
      hisVisitId: null,
      logs: [
        {
          time: nowIso,
          actor: currentUser.name,
          action: '上传已签署知情同意书',
          note: `${data.consentSignedBy === 'family' ? '家属代签' : '患者本人'}${data.consentFileUrl ? ' · 已挂载附件' : ''}`,
        },
        {
          time: nowIso,
          actor: currentUser.name,
          action: '发起下转申请，已附康复方案',
          note: allocationMode === 'designated'
            ? `接收方式：指定医生（${data.designatedDoctorName || '未指定姓名'}）`
            : '接收方式：仅指定机构，由基层转诊负责人分配',
        },
        {
          time: nowIso,
          actor: '系统',
          action: allocationMode === 'designated'
            ? `定向推送至${data.designatedDoctorName || '指定基层医生'}，基层转诊负责人同步知情`
            : `推送至${data.toInstitution}基层转诊负责人待分配队列`,
        },
      ],
    }
    setReferrals(prev => [newRef, ...prev])
    addNotification({
      type: 'downward_new',
      title: allocationMode === 'designated' ? '新下转申请待接收' : '新下转申请待分配',
      content: allocationMode === 'designated'
        ? `患者${data.patient?.name}（${data.diagnosis?.name}）下转申请已定向指派，请接收处理`
        : `患者${data.patient?.name}（${data.diagnosis?.name}）下转申请待基层负责人分配`,
      targetRole: allocationMode === 'designated' ? ROLES.PRIMARY : ROLES.PRIMARY_HEAD,
      referralId: newRef.id,
    })
    if (allocationMode === 'designated') {
      addNotification({
        type: 'downward_coordinator_notice',
        title: '下转申请已定向指派',
        content: `患者${data.patient?.name}的下转申请已定向指派给${data.designatedDoctorName || '指定基层医生'}，您可查看并在必要时协调改派`,
        targetRole: ROLES.PRIMARY_HEAD,
        referralId: newRef.id,
      })
    }
    return newRef.id
  }, [addNotification, currentUser])

  const cancelDownwardReferral = useCallback((referralId, reason) => {
    const normalizedReason = normalizeStructuredReasonSelection(reason, CANCEL_REASON_OPTIONS)
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        status: DOWNWARD_STATUS.CANCELLED,
        closeReason: normalizedReason.label,
        cancelReasonCode: normalizedReason.reasonCode,
        cancelReasonText: normalizedReason.reasonText,
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '撤销下转申请', note: normalizedReason.label },
        ],
      }
    }))

    addNotification({
      type: 'downward_cancelled',
      title: '下转申请已撤销',
      content: `下转申请已撤销，原因：${normalizedReason.label}`,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
    addNotification({
      type: 'downward_cancelled',
      title: '下转申请已撤销',
      content: `下转申请已撤销，原因：${normalizedReason.label}`,
      targetRole: ROLES.PRIMARY_HEAD,
      referralId,
    })
  }, [addNotification, currentUser])

  // 修改重提（已拒绝→待审核，原转诊单重置，保留历史日志）
  // M-9 修复：清空 assignedDoctorId/assignedDoctorName，避免重提后残留旧经办医生
  const reopenReferral = useCallback((referralId) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const isDownward = r.type === 'downward'
      if (isDownward) {
        return buildDownwardReopenState(r, currentUser, new Date().toISOString())
      }
      return {
        ...r,
        status: isDownward ? DOWNWARD_STATUS.PENDING : UPWARD_STATUS.PENDING,
        rejectReason: null,
        returnReason: null,
        coordinatorRejectReason: null,
        coordinatorReturnReason: null,
        assignedDoctor: null,
        assignedDoctorId: null,
        assignedDoctorName: null,
        assignedAt: null,
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          {
            time: new Date().toISOString(),
            actor: currentUser.name,
            action: isDownward ? '修改重提：申请重置为待接收' : '修改重提：申请重置为待审核，经办医生已清空',
          },
          {
            time: new Date().toISOString(),
            actor: '系统',
            action: isDownward ? '通知推送至基层接收机构（重提）' : '通知推送至县级接诊科室（重提）',
          },
        ],
      }
    }))
  }, [currentUser])

  // 终止申请 / 关闭申请（通用）
  const closeReferral = useCallback((referralId, reason) => {
    const ref = referrals.find(r => r.id === referralId)
    const normalizedReason = normalizeStructuredReasonSelection(
      reason,
      ref?.type === 'downward' ? DOWNWARD_CLOSE_REASON_OPTIONS : UPWARD_CLOSE_REASON_OPTIONS,
    )
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const closedStatus = r.type === 'downward' ? DOWNWARD_STATUS.CLOSED : UPWARD_STATUS.CLOSED
      const newBedStatus = r.bedStatus === 'bed_reserved' ? 'bed_released' : r.bedStatus
      const nextAppointmentStatus = r.appointmentInfo?.status === 'reserved' ? 'released' : r.appointmentInfo?.status
      return {
        ...r,
        status: closedStatus,
        closeReason: normalizedReason.label,
        closeReasonCode: normalizedReason.reasonCode,
        closeReasonText: normalizedReason.reasonText,
        closedAt: new Date().toISOString(),
        closedBy: currentUser.id,
        updatedAt: new Date().toISOString(),
        appointmentCodeStatus: nextAppointmentStatus || r.appointmentCodeStatus || null,
        appointmentInfo: nextAppointmentStatus
          ? { ...r.appointmentInfo, status: nextAppointmentStatus }
          : r.appointmentInfo,
        bedStatus: newBedStatus,
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '终止/关闭转诊申请', note: normalizedReason.label },
          { time: new Date().toISOString(), actor: '系统', action: '状态变更为已关闭，已通知双方医生' },
          ...(newBedStatus === 'bed_released' ? [{ time: new Date().toISOString(), actor: '系统', action: '床位已释放（申请关闭）' }] : []),
        ],
      }
    }))
  }, [currentUser, referrals])

  // CHG-35 / CHG-39：协商关闭（上下转转诊中阶段）
  const collaborativeCloseReferral = useCallback((referralId, reason) => {
    const ref = referrals.find(r => r.id === referralId)
    const normalizedReason = normalizeStructuredReasonSelection(
      reason,
      ref?.type === 'downward' ? DOWNWARD_CLOSE_REASON_OPTIONS : UPWARD_CLOSE_REASON_OPTIONS,
    )
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const newBedStatus = r.bedStatus === 'bed_reserved' ? 'bed_released' : r.bedStatus
      const nextAppointmentStatus = r.appointmentInfo?.status === 'reserved' ? 'released' : r.appointmentInfo?.status
      return {
        ...r,
        status: r.type === 'downward' ? DOWNWARD_STATUS.CLOSED : UPWARD_STATUS.CLOSED,
        closeReason: normalizedReason.label,
        closeReasonCode: normalizedReason.reasonCode,
        closeReasonText: normalizedReason.reasonText,
        closedAt: new Date().toISOString(),
        closedBy: currentUser.id,
        updatedAt: new Date().toISOString(),
        appointmentCodeStatus: nextAppointmentStatus || r.appointmentCodeStatus || null,
        appointmentInfo: nextAppointmentStatus
          ? { ...r.appointmentInfo, status: nextAppointmentStatus }
          : r.appointmentInfo,
        bedStatus: newBedStatus,
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: 'COLLABORATIVE_CLOSE', note: normalizedReason.label },
          ...(nextAppointmentStatus === 'released' ? [{ time: new Date().toISOString(), actor: '系统', action: '预约码已释放（协商关闭）' }] : []),
          ...(newBedStatus === 'bed_released' ? [{ time: new Date().toISOString(), actor: '系统', action: '床位已释放（协商关闭）' }] : []),
          { time: new Date().toISOString(), actor: '系统', action: `转诊单已协商关闭：${normalizedReason.label}` },
        ],
      }
    }))

    const content = `转诊单已协商关闭：${normalizedReason.label}`
    if (ref?.type === 'downward') {
      addNotification({ type: 'collaborative_closed', title: '下转单已协商关闭', content, targetRole: ROLES.COUNTY, referralId })
      addNotification({ type: 'collaborative_closed', title: '下转单已协商关闭', content, targetRole: ROLES.PRIMARY, referralId })
      addNotification({ type: 'collaborative_closed', title: '下转单已协商关闭', content, targetRole: ROLES.PRIMARY_HEAD, referralId })
    } else {
      addNotification({ type: 'collaborative_closed', title: '转诊单已协商关闭', content, targetRole: ROLES.PRIMARY, referralId })
      addNotification({ type: 'collaborative_closed', title: '转诊单已协商关闭', content, targetRole: ROLES.COUNTY, referralId })
      addNotification({ type: 'collaborative_closed', title: '转诊单已协商关闭', content, targetRole: ROLES.ADMIN, referralId })
      if (ref?.assignedDoctorId === 'county_doctor_2') {
        addNotification({ type: 'collaborative_closed', title: '转诊单已协商关闭', content, targetRole: ROLES.COUNTY2, referralId })
      }
    }
  }, [addNotification, currentUser, referrals])

  const emergencyModifyReferral = useCallback((referralId, updates) => {
    const targetInstitution = INSTITUTIONS.find(inst => inst.id === updates.toInstitutionId) || getInstitutionByName(updates.toInstitution)
    const updatedAt = new Date().toISOString()
    const nextInstitutionName = targetInstitution?.name || updates.toInstitution || ''
    const nextDept = '急诊科'
    const nextLinkedSpecialty = updates.linkedSpecialty || null
    const nextEmergencyDeptPhone = targetInstitution?.emergencyDeptPhone || targetInstitution?.departmentInfo?.['急诊科']?.nurseStationPhone || ''
    const ref = referrals.find(r => r.id === referralId)
    if (ref?.isRetroEntry) {
      return { success: false, error: 'RETRO_ENTRY_LOCKED' }
    }
    const updatedSms = buildEmergencyModifySms({
      institutionName: nextInstitutionName,
      targetDepartment: nextLinkedSpecialty || ref?.linkedSpecialty || nextDept,
      emergencyDeptPhone: nextEmergencyDeptPhone,
      referralCode: ref?.referralCode,
      isGreenChannel: ref?.referral_type === 'green_channel',
    })

    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        toInstitution: nextInstitutionName,
        toDept: nextDept,
        linkedSpecialty: nextLinkedSpecialty,
        updatedAt,
        emergencyModifyAt: updatedAt,
        emergencyModifyNotifiedAt: null,
        patientSmsLog: [
          ...(r.patientSmsLog || []),
          { kind: 'modify', sentAt: updatedAt, content: updatedSms, status: '已发送' },
        ],
        emergencyNotificationStatus: {
          ...(r.emergencyNotificationStatus || {}),
          emergencyDuty: true,
          departmentHead: true,
          referralCenter: true,
          targetSpecialistHead: r.referral_type === 'green_channel' && !!nextLinkedSpecialty,
        },
        logs: [
          ...r.logs,
          { time: updatedAt, actor: currentUser.name, action: 'EMERGENCY_MODIFY', note: `修改目标医院：${nextInstitutionName}；接诊入口固定为急诊科${nextLinkedSpecialty ? `；联动专科：${nextLinkedSpecialty}` : ''}` },
          { time: updatedAt, actor: '系统', action: '紧急修改后已重新通知相关方，原通知作废，并重新发送患者短信' },
        ],
      }
    }))

    const content = `急诊转诊目标已改为 ${nextInstitutionName} · 急诊科${nextLinkedSpecialty ? `，并已同步联动${nextLinkedSpecialty}` : ''}，请按新路径处理`
    addNotification({ type: 'emergency_modified', title: '🚨 急诊转诊目标已更新', content, targetRole: ROLES.COUNTY, targetInstitution: nextInstitutionName, referralId })
    addNotification({ type: 'emergency_modified', title: '🚨 急诊转诊目标已更新', content, targetRole: ROLES.COUNTY2, targetInstitution: nextInstitutionName, referralId })
    addNotification({ type: 'emergency_modified', title: '🚨 急诊转诊目标已更新', content: `患者${ref?.patient?.name}的急诊转诊已紧急修改为 ${nextInstitutionName} · ${nextDept}`, targetRole: ROLES.ADMIN, referralId })
  }, [addNotification, currentUser, referrals])

  const completeRetroEmergencyReferral = useCallback((referralId, data) => {
    const requiredFields = ['patientArrivedAt', 'department', 'emergencyAdmissionType', 'visitTime']
    if (requiredFields.some(field => !data?.[field])) {
      return { success: false, error: 'MISSING_REQUIRED' }
    }

    const completedAt = new Date().toISOString()
    const ref = referrals.find(r => r.id === referralId)
    if (!ref) return { success: false, error: 'NOT_FOUND' }

    const departmentConfig = getDepartmentConfig(ref.toInstitution, data.department)
    const isInpatient = data.emergencyAdmissionType === 'inpatient'
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const occupiedBeds = isInpatient
      ? referrals.filter(r =>
          r.id !== referralId &&
          r.toInstitution === ref.toInstitution &&
          (r.admissionArrangement?.department || r.toDept) === data.department &&
          r.bedStatus === 'bed_reserved' &&
          r.admissionArrangement?.bedReservedAt &&
          new Date(r.admissionArrangement.bedReservedAt) >= todayStart
        ).length
      : 0
    const dailyReservedBeds = departmentConfig?.dailyReservedBeds ?? 0
    const canReserveBed = isInpatient && data.ward && (dailyReservedBeds === 0 || occupiedBeds < dailyReservedBeds)
    const bedReservedAt = canReserveBed ? completedAt : undefined

    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const newBedStatus = isInpatient ? (canReserveBed ? 'bed_reserved' : 'not_applicable') : 'not_applicable'
      return {
        ...r,
        status: UPWARD_STATUS.COMPLETED,
        completedAt,
        updatedAt: completedAt,
        admissionType: isInpatient ? 'inpatient' : (data.emergencyAdmissionType === 'outpatient' ? 'outpatient' : 'emergency'),
        patientArrivedAt: data.patientArrivedAt,
        emergencyAdmissionType: data.emergencyAdmissionType,
        specialistConsultRequested: !!data.specialistConsultRequested,
        isUrgentUnhandled: false,
        reminderSent48h: false,
        bedStatus: newBedStatus,
        admissionArrangement: {
          ...(r.admissionArrangement || {}),
          department: data.department,
          visitTime: data.visitTime,
          doctorName: data.doctorName || '',
          room: data.room || '',
          floor: data.floor || '',
          departmentPhone: data.departmentPhone || '',
          ward: data.ward || '',
          bedNumber: data.bedNumber || '',
          nurseStationPhone: data.nurseStationPhone || '',
          emergencyNotifiedDepts: r.admissionArrangement?.emergencyNotifiedDepts || ['急诊科', ...(r.referral_type === 'green_channel' && r.linkedSpecialty ? [r.linkedSpecialty] : [])],
          emergencyNotes: r.admissionArrangement?.emergencyNotes || '',
          arrangedAt: completedAt,
          arrangedBy: currentUser.name,
          ...(bedReservedAt ? { bedReservedAt } : {}),
        },
        logs: [
          ...r.logs,
          {
            time: completedAt,
            actor: currentUser.name,
            action: `CHG-41：完成补录并确认：${data.department}，就诊时间：${new Date(data.visitTime).toLocaleString('zh-CN')}`,
            note: `isRetroEntry=true；患者到院=${formatSmsTime(data.patientArrivedAt)}；承接方式=${data.emergencyAdmissionType}${data.specialistConsultRequested ? '；已启动专科会诊' : ''}`,
          },
          ...(canReserveBed ? [{ time: completedAt, actor: '系统', action: `床位已预占：${data.ward} ${data.bedNumber || '（入院时分配）'}` }] : []),
          { time: completedAt, actor: '系统', action: 'CHG-41：补录模式完成接诊确认，未发送实时通知与患者短信，已触发数据上报' },
        ],
      }
    }))

    return { success: true }
  }, [currentUser, referrals])

  const markEmergencyFirstViewed = useCallback((referralId) => {
    const viewedAt = new Date().toISOString()
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId || !r.is_emergency || r.firstViewedAt) return r
      return {
        ...r,
        firstViewedAt: viewedAt,
        updatedAt: viewedAt,
        logs: [
          ...r.logs,
          { time: viewedAt, actor: '系统', action: '转诊中心已查看' },
        ],
      }
    }))
  }, [])

  const confirmEmergencyPatientNotified = useCallback((referralId) => {
    const confirmedAt = new Date().toISOString()
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        emergencyModifyNotifiedAt: confirmedAt,
        updatedAt: confirmedAt,
        logs: [
          ...r.logs,
          { time: confirmedAt, actor: currentUser.name, action: 'PATIENT_NOTIFIED_CONFIRMED', note: '转诊中心确认患者已知晓最新就诊信息' },
        ],
      }
    }))
  }, [currentUser])

  // 拒绝下转（待接收→已拒绝）
  const rejectDownwardReferral = useCallback((referralId, reason) => {
    const target = referrals.find(r => r.id === referralId)
    if (!target) return
    const normalizedReason = normalizeStructuredReasonSelection(reason, DOWNWARD_DOCTOR_REJECT_REASON_OPTIONS)
    const rejectedAt = new Date().toISOString()
    const shouldRouteToCoordinator = ['designated', 'coordinator', 'coordinator_reassign'].includes(target.allocationMode || '')
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      if (!shouldRouteToCoordinator) {
        return {
          ...r,
          status: DOWNWARD_STATUS.REJECTED,
          rejectReason: normalizedReason.label,
          doctorRejectReasonCode: normalizedReason.reasonCode,
          doctorRejectReasonText: normalizedReason.reasonText,
          updatedAt: rejectedAt,
          logs: [
            ...r.logs,
            { time: rejectedAt, actor: currentUser.name, action: '拒绝下转申请', note: normalizedReason.label },
          ],
        }
      }
      return {
        ...r,
        status: DOWNWARD_STATUS.PENDING,
        allocationMode: 'coordinator_reassign',
        allocationModeChangedAt: rejectedAt,
        rejectReason: null,
        designatedDoctorId: null,
        designatedDoctorName: null,
        downwardAssignedDoctorId: null,
        downwardAssignedDoctorName: null,
        coordinatorActionAt: null,
        rejectedDoctorIds: Array.from(new Set([...(r.rejectedDoctorIds || []), currentUser.id])),
        designatedDoctorRejectLog: [
          ...(r.designatedDoctorRejectLog || []),
          { time: rejectedAt, doctorId: currentUser.id, doctorName: currentUser.name, reason: normalizedReason.label, reasonCode: normalizedReason.reasonCode, reasonText: normalizedReason.reasonText },
        ],
        coordinatorActionLog: [
          ...(r.coordinatorActionLog || []),
          { time: rejectedAt, actorId: 'system', actorName: '系统', action: '待基层负责人改派' },
        ],
        updatedAt: rejectedAt,
        logs: [
          ...r.logs,
          {
            time: rejectedAt,
            actor: currentUser.name,
            action: target.allocationMode === 'designated' ? 'DESIGNATED_DOCTOR_REJECT' : 'COORDINATOR_ASSIGNED_DOCTOR_REJECT',
            note: normalizedReason.label,
          },
          { time: rejectedAt, actor: '系统', action: '已转交基层转诊负责人改派处理' },
        ],
      }
    }))

    if (shouldRouteToCoordinator) {
      addNotification({
        type: 'downward_reassign_needed',
        title: '下转申请待改派',
        content: `患者${target.patient?.name}的下转申请被拒绝，请基层转诊负责人尽快改派`,
        targetRole: ROLES.PRIMARY_HEAD,
        referralId,
      })
    }
  }, [addNotification, currentUser, referrals])

  const reassignDownwardReferral = useCallback((referralId, doctorId, doctorName) => {
    const actedAt = new Date().toISOString()
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        status: DOWNWARD_STATUS.PENDING,
        allocationMode: 'coordinator_reassign',
        allocationModeChangedAt: actedAt,
        designatedDoctorId: doctorId,
        designatedDoctorName: doctorName,
        downwardAssignedDoctorId: null,
        downwardAssignedDoctorName: null,
        coordinatorActionAt: actedAt,
        coordinatorActionLog: [
          ...(r.coordinatorActionLog || []),
          { time: actedAt, actorId: currentUser.id, actorName: currentUser.name, action: `改派给${doctorName}` },
        ],
        updatedAt: actedAt,
        logs: [
          ...r.logs,
          { time: actedAt, actor: currentUser.name, action: 'COORDINATOR_REASSIGN', note: `改派给${doctorName}` },
        ],
      }
    }))
    addNotification({
      type: 'downward_reassigned',
      title: '下转申请已改派给您',
      content: `您被指定为该下转申请的新接收医生，请及时处理`,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
  }, [addNotification, currentUser])

  const selfAcceptDownwardReferral = useCallback((referralId) => {
    const acceptedAt = new Date().toISOString()
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return buildDownwardSelfAcceptState(r, currentUser, acceptedAt)
    }))
  }, [currentUser])

  const rejectDownwardByCoordinator = useCallback((referralId, reason) => {
    const rejectedAt = new Date().toISOString()
    const target = referrals.find(r => r.id === referralId)
    const normalizedReason = normalizeStructuredReasonSelection(reason, DOWNWARD_INSTITUTION_RETURN_REASON_OPTIONS)
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        status: DOWNWARD_STATUS.RETURNED,
        rejectReason: normalizedReason.label,
        rejectReasonCode: normalizedReason.reasonCode,
        rejectReasonText: normalizedReason.reasonText,
        returnReason: normalizedReason.label,
        institutionRejectReasonCode: normalizedReason.reasonCode,
        institutionRejectReasonText: normalizedReason.reasonText,
        coordinatorRejectReason: normalizedReason.label,
        coordinatorReturnReason: normalizedReason.label,
        coordinatorActionAt: rejectedAt,
        coordinatorActionLog: [
          ...(r.coordinatorActionLog || []),
          { time: rejectedAt, actorId: currentUser.id, actorName: currentUser.name, action: '退回下转申请', reason: normalizedReason.label, reasonCode: normalizedReason.reasonCode, reasonText: normalizedReason.reasonText },
        ],
        updatedAt: rejectedAt,
        logs: [
          ...r.logs,
          { time: rejectedAt, actor: currentUser.name, action: 'COORDINATOR_INSTITUTION_RETURN', note: normalizedReason.label },
          { time: rejectedAt, actor: '系统', action: '通知县级发起医生：下转申请已退回', note: normalizedReason.label },
        ],
      }
    }))

    if (target) {
      addNotification({
        type: 'downward_returned',
        title: '下转申请已退回',
        content: `患者${target.patient?.name}的下转申请已被基层机构退回，原因：${normalizedReason.label}`,
        targetRole: ROLES.COUNTY,
        referralId,
      })
      addNotification({
        type: 'downward_returned',
        title: '下转申请已退回',
        content: `患者${target.patient?.name}的下转申请已被基层机构退回，原因：${normalizedReason.label}`,
        targetRole: ROLES.COUNTY2,
        referralId,
      })
    }
  }, [addNotification, currentUser, referrals])

  // 下转超时7天自动关闭（G1决策，state-machine.md 2026-03-25确认）
  const closeDownwardByTimeout = useCallback((referralId) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        status: DOWNWARD_STATUS.CLOSED,
        closeReason: '超时7天未到达，系统自动关闭',
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: '系统', action: '下转超时7天自动关闭', note: '患者未完成到达确认' },
          { time: new Date().toISOString(), actor: '系统', action: '已通知双方医生及转诊管理员' },
        ],
      }
    }))
  }, [])

  // P0-6：管理员指派经办医生（超时无人受理后介入，flow-input.md 第四节）
  const assignDoctorByAdmin = useCallback((referralId, doctorId, doctorName) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        assignedDoctor: doctorName,         // 兼容旧字段
        assignedDoctorId: doctorId,         // P0-6 新字段
        assignedDoctorName: doctorName,     // P0-6 新字段
        adminAssigned: true,                // P0-6 新字段
        assignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: `管理员指派经办医生：${doctorName}`, note: '超时无人受理，管理员介入' },
          { time: new Date().toISOString(), actor: '系统', action: `已向${doctorName}发送强推通知：您已被指派处理该转诊申请` },
        ],
      }
    }))
    // 向被指派医生发送强推通知
    addNotification({
      type: 'admin_assigned',
      title: '📌 您已被指派处理转诊申请',
      content: `管理员已将一条超时转诊申请指派给您，请尽快受理处理`,
      targetRole: null, // 生产环境替换为 doctorId 定向推送
      referralId,
    })
  }, [addNotification, currentUser])

  // P0-7：急诊2h无受理 → 再次催办三方
  const renotifyEmergency = useCallback((referralId) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: '系统', action: '急诊转诊2小时无人受理，已再次催办三方', note: '对口联系医生、科室负责人、转诊管理员均已收到通知' },
        ],
      }
    }))
    const ref = referrals.find(r => r.id === referralId)
    const patientName = ref?.patient?.name
    // ① 对口联系医生
    addNotification({
      type: 'emergency_renotify',
      title: '⚠️ 急诊转诊2h未受理——再次提醒',
      content: `【再次提醒】急诊转诊（患者${patientName}）已超2小时无人受理，请尽快处理`,
      targetRole: ROLES.COUNTY,
      targetInstitution: ref?.toInstitution,
      referralId,
    })
    // ② 科室负责人
    addNotification({
      type: 'emergency_renotify',
      title: '⚠️ 急诊转诊2h未受理——督促科室',
      content: `【督促提醒】急诊转诊（患者${patientName}）已超2小时无人受理，请督促科室医生立即处理`,
      targetRole: ROLES.COUNTY2,
      targetInstitution: ref?.toInstitution,
      referralId,
    })
    // ③ 转诊管理员
    addNotification({
      type: 'emergency_renotify',
      title: '⚠️ 急诊转诊2h未受理——请关注',
      content: `急诊转诊（患者${patientName}）已超2小时无人受理，如继续无人处理将于4h后升级告警`,
      targetRole: ROLES.ADMIN,
      referralId,
    })
  }, [addNotification, referrals])

  // P0-7 / P1-2：急诊4h升级告警（替代原"系统自动接收"）
  // 同时兼容新字段 isUrgentUnhandled（P0-6）和旧字段 urgentFlag（向后兼容）
  const escalateEmergencyAlert = useCallback((referralId) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        urgentFlag: 'urgent_unhandled',   // 旧字段，向后兼容
        isUrgentUnhandled: true,          // P0-6 新字段
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: '系统', action: '急诊转诊4小时无人受理，已升级为紧急告警', note: '已通知科室负责人及转诊管理员' },
        ],
      }
    }))
    const ref = referrals.find(r => r.id === referralId)
    const patientName = ref?.patient?.name
    addNotification({
      type: 'emergency_escalated',
      title: '🔴 急诊转诊4h超时——紧急告警',
      content: `急诊转诊（患者${patientName}）已超4小时无人受理，请立即介入处理`,
      targetRole: ROLES.ADMIN,
      referralId,
    })
    // 同时通知科室负责人
    addNotification({
      type: 'emergency_escalated',
      title: '🔴 急诊转诊4h超时——请立即受理',
      content: `急诊转诊（患者${patientName}）已超4小时无人受理，管理员已升级告警，请立即处理`,
      targetRole: ROLES.COUNTY2,
      targetInstitution: ref?.toInstitution,
      referralId,
    })
  }, [addNotification, referrals])

  // 挂号员核验并核销预约码（P0-2）
  const verifyAndConsumeAppointmentCode = useCallback((code, operatorId) => {
    if (!operatorId?.trim()) return { success: false, error: 'OPERATOR_ID_REQUIRED' }
    const referral = referrals.find(r => r.appointmentCode === code)
    if (!referral) return { success: false, error: 'NOT_FOUND' }
    const info = referral.appointmentInfo || {}
    const status = info.status || (referral.appointmentCode ? 'reserved' : null)
    if (status !== 'reserved') {
      return { success: false, error: (status || 'UNKNOWN').toUpperCase(), referral }
    }
    setReferrals(prev => prev.map(r => {
      if (r.id !== referral.id) return r
      return {
        ...r,
        appointmentInfo: {
          ...r.appointmentInfo,
          status: 'used',
          consumedAt: new Date().toISOString(),
          consumedBy: operatorId,
        },
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: `挂号员（工号:${operatorId}）`, action: '核销转诊预约码，患者已到院就诊' },
        ],
      }
    }))
    return { success: true, referral }
  }, [referrals])

  const recordReferralDocumentAction = useCallback((referralId, payload) => {
    const nowIso = new Date().toISOString()
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const log = {
        referralNo: r.referralNo || r.id,
        templateId: payload.templateId,
        templateVersion: payload.templateVersion,
        actionType: payload.actionType,
        operator: currentUser.name,
        operatedAt: nowIso,
        referralStatus: r.status,
      }
      return {
        ...r,
        updatedAt: nowIso,
        documentPrintLogs: [...(r.documentPrintLogs || []), log],
        logs: [
          ...(r.logs || []),
          {
            time: nowIso,
            actor: currentUser.name,
            action: `转诊文书${payload.actionType}`,
            note: `转诊单编号：${log.referralNo}；模板：${log.templateId} ${log.templateVersion}；状态：${log.referralStatus}`,
          },
        ],
      }
    }))
  }, [currentUser.name])

  const recordPhoneCallAction = useCallback((referralId, payload) => {
    const entry = buildPhoneCallLogEntry({
      ...payload,
      actorId: payload?.actorId || currentUser.id,
      actorRole: payload?.actorRole || currentRole,
      referralId,
      timestamp: payload?.timestamp || new Date().toISOString(),
    })

    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        updatedAt: entry.timestamp,
        phoneCallLogs: [...(r.phoneCallLogs || []), entry],
        logs: [
          ...(r.logs || []),
          {
            time: entry.timestamp,
            actor: currentUser.name,
            action: entry.action,
            note: `source=${entry.source || 'unknown'}；numberType=${entry.numberType || 'unknown'}`,
          },
        ],
      }
    }))

    return entry
  }, [currentRole, currentUser.id, currentUser.name])

  // CHG-32：基层医生提交院内审核（普通上转，F-02=ON时流程）→ PENDING_INTERNAL_REVIEW
  // 急诊/绿通仍走 submitReferral 直接到 PENDING
  // CHG-33：急诊无论开关状态直接跳过内审 → PENDING
  // CHG-34：改为从 auditRuleConfig 动态读取开关，不再硬编码
  const submitForInternalReview = useCallback((referralData) => {
    const isEmergency = !!referralData.is_emergency
    const isRetroEntry = isEmergency && !!referralData.isRetroEntry
    const shouldSendEmergencyRealtimeSignals = isEmergency && !isRetroEntry
    const nowIso = new Date().toISOString()
    // CHG-34：读取提交方（基层机构）的上转审核配置，而非目标科室
    const auditConfig = getAuditConfig(currentUser.dept, 'upward', currentUser.institution)
    const needsInternalReview = auditConfig.enabled && !isEmergency
    const targetInstitution = getInstitutionByName(referralData.toInstitution)
    const emergencyDeptPhone = targetInstitution?.emergencyDeptPhone || targetInstitution?.departmentInfo?.['急诊科']?.nurseStationPhone || ''
    const referralCode = isEmergency ? buildEmergencyReferralCode(nowIso) : null
    const initialSmsContent = shouldSendEmergencyRealtimeSignals
      ? buildEmergencyInitialSms({
          institutionName: referralData.toInstitution,
          targetDepartment: referralData.linkedSpecialty || referralData.toDept,
          emergencyDeptPhone,
          referralCode,
          isGreenChannel: referralData.referral_type === 'green_channel',
        })
      : null
    const newRef = {
      ...referralData,
      id: `REF${Date.now()}`,
      status: isEmergency
        ? UPWARD_STATUS.IN_TRANSIT
        : (needsInternalReview ? UPWARD_STATUS.PENDING_INTERNAL_REVIEW : UPWARD_STATUS.PENDING),
      auditAssignedUserId: needsInternalReview ? auditConfig.auditorUserId : null,
      referralCode,
      referralNo: isEmergency ? referralCode : (referralData.referralNo ?? null),
      createdAt: nowIso,
      updatedAt: nowIso,
      // CHG-39: 普通上转提交时同步写入线下签署字段
      consentMethod: referralData.consentMethod || (referralData.consentSigned ? 'offline_upload' : 'pending_upload'),
      consentFileUrl: referralData.consentFileUrl ?? null,
      consentUploadedAt: referralData.consentUploadedAt ?? (referralData.consentSigned ? nowIso : null),
      consentSignedBy: referralData.consentSignedBy || 'patient',
      consentSigned: referralData.consentSigned ?? false,
      consentTime: referralData.consentSigned ? nowIso : null,
      admissionType: isEmergency ? 'emergency' : referralData.admissionType,
      transferredAt: isEmergency ? nowIso : null,
      // 默认字段
      assignedDoctorId: null,
      assignedDoctorName: null,
      isUrgentUnhandled: false,
      isRetroEntry,
      retroEntryOperatorId: isRetroEntry ? currentUser.id : null,
      retroEntryOperatorName: isRetroEntry ? currentUser.name : null,
      adminAssigned: false,
      internalNote: referralData.internalNote ?? '',
      admissionArrangement: null,
      emergencyModifiableUntil: shouldSendEmergencyRealtimeSignals ? new Date(new Date(nowIso).getTime() + 15 * 60 * 1000).toISOString() : null,
      emergencyAlertConfirmedAt: null,
      firstViewedAt: null,
      linkedSpecialty: referralData.linkedSpecialty || null,
      internalAuditLog: [],
      emergencyModifyAt: null,
      emergencyModifyNotifiedAt: null,
      patientSmsLog: shouldSendEmergencyRealtimeSignals
        ? [{ kind: 'initial', sentAt: nowIso, content: initialSmsContent, status: '已送达' }]
        : [],
      emergencyNotificationStatus: isEmergency
        ? {
            emergencyDuty: shouldSendEmergencyRealtimeSignals,
            departmentHead: shouldSendEmergencyRealtimeSignals,
            referralCenter: shouldSendEmergencyRealtimeSignals,
            targetSpecialistHead: shouldSendEmergencyRealtimeSignals && referralData.referral_type === 'green_channel' && !!referralData.linkedSpecialty,
          }
        : null,
      emergencyAlertConfirmedBy: null,
      emergencyAlertConfirmedByName: null,
      patientArrivedAt: isRetroEntry ? (referralData.patientArrivedAt || null) : null,
      emergencyAdmissionType: null,
      specialistConsultRequested: false,
      downwardAssignedDoctorId: null,
      downwardAssignedDoctorName: null,
      logs: [
        ...(referralData.logs || []),
        isEmergency
          ? { time: nowIso, actor: currentUser.name, action: '提交急诊上转申请（跳过院内审核，直接进入转诊中）' }
          : needsInternalReview
            ? { time: nowIso, actor: currentUser.name, action: `提交上转申请，等待院内审核（${currentUser.institution}·${currentUser.dept}已配置审核规则）` }
            : { time: nowIso, actor: currentUser.name, action: `提交上转申请（${currentUser.institution}·${currentUser.dept}未启用院内审核，直接进入待受理）` },
        // CHG-40: 记录上转提交时的基层当前就诊类型
        ...(referralData.sourceVisitType ? [{
          time: nowIso,
          actor: currentUser.name,
          action: `提交字段记录：基层当前就诊类型=${referralData.sourceVisitType === 'inpatient' ? '住院' : '门诊'}`,
        }] : []),
        ...(isRetroEntry ? [{
          time: nowIso,
          actor: currentUser.name,
          action: 'CHG-41：提交字段记录：isRetroEntry=true',
          note: `补录操作人=${currentUser.name}${referralData.patientArrivedAt ? `；患者到院时间=${formatSmsTime(referralData.patientArrivedAt)}` : ''}`,
        }] : []),
        ...(needsInternalReview ? [{ time: nowIso, actor: '系统', action: '通知科主任：有新转诊申请待院内审核' }] : []),
        ...(!needsInternalReview && isEmergency ? [{
          time: nowIso,
          actor: '系统',
          action: shouldSendEmergencyRealtimeSignals
            ? (
                referralData.referral_type === 'green_channel' && referralData.linkedSpecialty
                  ? `急诊转诊：已自动通知转诊中心、急诊科值班及${referralData.linkedSpecialty}负责人，并向患者发送首条就诊短信`
                  : '急诊转诊：已自动通知转诊中心、急诊科值班及相关负责人，并向患者发送首条就诊短信'
              )
            : 'CHG-41：补录模式提交，不触发实时通知、不发送患者短信、不进入紧急修改窗口',
        }] : []),
      ],
      closeReason: null,
      hisVisitId: null,
      reminderSent48h: false,
    }
    setReferrals(prev => [newRef, ...prev])
    // 仅需院内审核时才通知科主任（CHG-33：急诊已跳过；CHG-34：审核关闭时也跳过）
    if (needsInternalReview) {
      addNotification({
        type: 'internal_review_new',
        title: '📋 新上转申请待院内审核',
        content: `患者${referralData.patient?.name}（${referralData.diagnosis?.name}）上转申请需院内审核，请尽快处理`,
        targetRole: ROLES.PRIMARY_HEAD,
        referralId: newRef.id,
      })
    } else if (shouldSendEmergencyRealtimeSignals) {
      addNotification({
        type: 'emergency_new',
        title: '🚨 急诊上转申请——请立即处理',
        content: `【急诊】患者${referralData.patient?.name}（${referralData.diagnosis?.name}）急诊上转已自动通知，急诊科电话：${emergencyDeptPhone || '待配置'}`,
        targetRole: ROLES.COUNTY,
        targetInstitution: referralData.toInstitution,
        referralId: newRef.id,
      })
      addNotification({
        type: 'emergency_new',
        title: '🚨 急诊上转申请——请立即处理',
        content: `【急诊·科室负责人】患者${referralData.patient?.name}（${referralData.diagnosis?.name}）急诊上转已自动通知，请督促科室尽快响应`,
        targetRole: ROLES.COUNTY2,
        targetInstitution: referralData.toInstitution,
        referralId: newRef.id,
      })
      addNotification({
        type: 'emergency_new',
        title: '🚨 急诊上转申请——请关注处理进度',
        content: `【急诊·管理员】患者${referralData.patient?.name}（${referralData.diagnosis?.name}）急诊上转已提交，请尽快补录接诊信息并跟进流程`,
        targetRole: ROLES.ADMIN,
        referralId: newRef.id,
      })
    }
    return newRef.id
  }, [addNotification, currentUser])

  // CHG-32：科主任通过院内审核 → PENDING（同时推送县级医生通知）
  const approveInternalReview = useCallback((referralId, comment = '') => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const auditEntry = {
        time: new Date().toISOString(),
        actor: currentUser.name,
        action: '院内审核通过',
        comment,
        result: 'approved',
      }
      return {
        ...r,
        status: UPWARD_STATUS.PENDING,
        internalAuditLog: [...(r.internalAuditLog || []), auditEntry],
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '院内审核通过', note: comment || undefined },
          { time: new Date().toISOString(), actor: '系统', action: '状态变更为待受理，已通知县级接诊科室' },
        ],
      }
    }))
    const ref = referrals.find(r => r.id === referralId)
    // 通知申请医生
    addNotification({
      type: 'internal_review_approved',
      title: '✅ 院内审核已通过',
      content: `患者${ref?.patient?.name}的上转申请已通过院内审核，正在等待县级医院受理`,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
    // 通知县级医生
    addNotification({
      type: 'upward_new',
      title: '新上转申请待受理',
      content: `患者${ref?.patient?.name}（${ref?.diagnosis?.name}）上转申请待受理，来自：${ref?.fromInstitution}`,
      targetRole: ROLES.COUNTY,
      referralId,
    })
  }, [addNotification, currentUser, referrals])

  // CHG-32：科主任拒绝院内审核 → DRAFT（在原单修改重提）
  const rejectInternalReview = useCallback((referralId, reason) => {
    const normalizedReason = normalizeStructuredReasonSelection(reason, INTERNAL_REJECT_REASON_OPTIONS)
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const auditEntry = {
        time: new Date().toISOString(),
        actor: currentUser.name,
        action: '院内审核拒绝',
        comment: null,
        rejectReasonCode: normalizedReason.reasonCode,
        rejectReasonText: normalizedReason.reasonText,
        result: 'rejected',
      }
      return {
        ...r,
        status: UPWARD_STATUS.DRAFT,   // 退回草稿，在原单修改重提
        internalAuditLog: [...(r.internalAuditLog || []), auditEntry],
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '院内审核拒绝，退回修改', note: normalizedReason.label },
          { time: new Date().toISOString(), actor: '系统', action: '申请退回为草稿，请在原单上修改后重提' },
        ],
      }
    }))
    const ref = referrals.find(r => r.id === referralId)
    addNotification({
      type: 'internal_review_rejected',
      title: '❌ 院内审核未通过，请修改重提',
      content: `患者${ref?.patient?.name}的上转申请院内审核未通过，原因：${normalizedReason.label}。请修改后重新提交。`,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
  }, [addNotification, currentUser, referrals])

  // CHG-29：管理员填写到院安排（IN_TRANSIT 状态，生成预约码并通知基层）
  // J-4：住院且床位有余量时自动锁定床位（bedStatus → bed_reserved）
  const fillAdmissionArrangement = useCallback((referralId, arrangement) => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const arrangedAt = new Date().toISOString()
    const target = referrals.find(r => r.id === referralId)
    if (target?.is_emergency) return null
    const isInpatient = target?.admissionType === 'inpatient'
    const hasBed = isInpatient && arrangement.ward && (arrangement.bedNumber || arrangement.bedAssignMode === 'on_arrival')
    // 计算今日已预占数（简单判断：同科室 bed_reserved 且今日）
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const occupied = isInpatient
      ? referrals.filter(r =>
          r.toDept === target.toDept &&
          r.bedStatus === 'bed_reserved' &&
          r.admissionArrangement?.bedReservedAt &&
          new Date(r.admissionArrangement.bedReservedAt) >= todayStart
        ).length
      : 0
    // bedRemaining 需依赖 departmentInfo，此处用 arrangement 传入的 dailyReservedBeds（可选），默认保守处理
    const dailyReservedBeds = arrangement._dailyReservedBeds ?? 0
    const canReserveBed = hasBed && (dailyReservedBeds === 0 || occupied < dailyReservedBeds)
    const newBedStatus = isInpatient
      ? (canReserveBed ? 'bed_reserved' : 'not_applicable')
      : 'not_applicable'
    const bedReservedAt = canReserveBed ? arrangedAt : undefined

    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        admissionArrangement: {
          ...arrangement,
          appointmentCode: code,
          arrangedAt,
          arrangedBy: currentUser.name,
          ...(bedReservedAt ? { bedReservedAt } : {}),
        },
        appointmentCode: code,
        appointmentCodeExpireAt: new Date(Date.now() + 48 * 3600000).toISOString(),
        appointmentCodeStatus: 'reserved',
        appointmentInfo: { status: 'reserved' },
        bedStatus: newBedStatus,
        reminderSent48h: false,
        updatedAt: arrangedAt,
        logs: [
          ...r.logs,
          { time: arrangedAt, actor: currentUser.name, action: `安排到院信息：${arrangement.department}，就诊时间：${arrangement.visitTime ? new Date(arrangement.visitTime).toLocaleString('zh-CN') : '待定'}` },
          { time: arrangedAt, actor: '系统', action: `生成预约取号码：${code}，有效期48小时，已通知基层医生转告患者` },
          ...(canReserveBed ? [{ time: arrangedAt, actor: '系统', action: `床位已预占：${arrangement.ward} ${arrangement.bedNumber || '（入院时分配）'}，有效期48小时` }] : []),
          ...(!canReserveBed && isInpatient ? [{ time: arrangedAt, actor: '系统', action: '提交时床位已满，bedStatus=not_applicable，需人工协调' }] : []),
        ],
      }
    }))
    const ref = referrals.find(r => r.id === referralId)
    const notifContent = isInpatient
      ? `患者${ref?.patient?.name}住院安排已填写：${arrangement.ward}，${arrangement.bedNumber || '入院时分配'}，取号码：${code}`
      : `患者${ref?.patient?.name}到院信息已安排：${arrangement.department}，取号码：${code}，请告知患者`
    addNotification({
      type: 'admission_arranged',
      title: '🏥 到院信息已安排',
      content: notifContent,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
    return code
  }, [addNotification, currentUser, referrals])

  const supplementEmergencyAdmission = useCallback((referralId, data) => {
    const arrangedAt = new Date().toISOString()
    const ref = referrals.find(r => r.id === referralId)
    const departmentConfig = getDepartmentConfig(ref?.toInstitution, data.department)
    const isInpatient = data.emergencyAdmissionType === 'inpatient'
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const occupiedBeds = isInpatient
      ? referrals.filter(r =>
          r.id !== referralId &&
          r.toInstitution === ref?.toInstitution &&
          (r.admissionArrangement?.department || r.toDept) === data.department &&
          r.bedStatus === 'bed_reserved' &&
          r.admissionArrangement?.bedReservedAt &&
          new Date(r.admissionArrangement.bedReservedAt) >= todayStart
        ).length
      : 0
    const dailyReservedBeds = departmentConfig?.dailyReservedBeds ?? 0
    const canReserveBed = isInpatient && data.ward && (dailyReservedBeds === 0 || occupiedBeds < dailyReservedBeds)
    const bedReservedAt = canReserveBed ? arrangedAt : undefined
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        admissionType: isInpatient ? 'inpatient' : (data.emergencyAdmissionType === 'outpatient' ? 'outpatient' : 'emergency'),
        patientArrivedAt: data.patientArrivedAt,
        emergencyAdmissionType: data.emergencyAdmissionType,
        specialistConsultRequested: !!data.specialistConsultRequested,
        isUrgentUnhandled: false,
        bedStatus: isInpatient ? (canReserveBed ? 'bed_reserved' : 'not_applicable') : 'not_applicable',
        updatedAt: arrangedAt,
        reminderSent48h: false,
        admissionArrangement: {
          ...(r.admissionArrangement || {}),
          department: data.department,
          visitTime: data.visitTime,
          doctorName: data.doctorName || '',
          room: data.room || '',
          floor: data.floor || '',
          departmentPhone: data.departmentPhone || '',
          ward: data.ward || '',
          bedNumber: data.bedNumber || '',
          nurseStationPhone: data.nurseStationPhone || '',
          emergencyNotifiedDepts: r.admissionArrangement?.emergencyNotifiedDepts || ['急诊科', ...(r.referral_type === 'green_channel' && r.linkedSpecialty ? [r.linkedSpecialty] : [])],
          emergencyNotes: r.admissionArrangement?.emergencyNotes || '',
          arrangedAt,
          arrangedBy: currentUser.name,
          ...(bedReservedAt ? { bedReservedAt } : {}),
        },
        logs: [
          ...r.logs,
          {
            time: arrangedAt,
            actor: currentUser.name,
            action: `补录急诊接诊信息：${data.department}，就诊时间：${new Date(data.visitTime).toLocaleString('zh-CN')}`,
            note: `患者到院：${formatSmsTime(data.patientArrivedAt)}；承接方式：${data.emergencyAdmissionType}${data.specialistConsultRequested ? '；已启动专科会诊' : ''}`,
          },
          ...(canReserveBed ? [{ time: arrangedAt, actor: '系统', action: `床位已预占：${data.ward} ${data.bedNumber || '（入院时分配）'}` }] : []),
          { time: arrangedAt, actor: '系统', action: '急诊接诊信息已补录，可继续完成接诊确认' },
        ],
      }
    }))

    addNotification({
      type: 'emergency_supplemented',
      title: '🏥 急诊接诊信息已补录',
      content: `患者${ref?.patient?.name}的急诊接诊信息已补录，请告知患者直接前往${data.department}`,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
  }, [addNotification, currentUser, referrals])

  // CHG-32：基层医生受理下转（待接收→待接收，锁定经办医生，防重复受理）
  const claimDownwardReferral = useCallback((referralId) => {
    const target = referrals.find(r => r.id === referralId)
    if (!target) return { success: false, error: 'NOT_FOUND' }
    if (target.downwardAssignedDoctorId && target.downwardAssignedDoctorId !== currentUser.id) {
      return { success: false, error: 'ALREADY_ASSIGNED', assignedDoctorName: target.downwardAssignedDoctorName }
    }
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        downwardAssignedDoctorId: currentUser.id,
        downwardAssignedDoctorName: currentUser.name,
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '受理下转申请，已归入名下处理' },
          { time: new Date().toISOString(), actor: '系统', action: '其他医生已不可重复受理该下转申请' },
        ],
      }
    }))
    return { success: true }
  }, [currentUser, referrals])

  useEffect(() => {
    const runTimedChecks = () => {
      const now = Date.now()
      const sevenDays = 7 * 24 * 3600 * 1000
      const fourHours = 4 * 3600 * 1000
      const fortyEightHours = 48 * 3600 * 1000
      const pendingNotifications = []

      setReferrals(prev => {
        let changed = false
        const next = prev.map(ref => {
          if (ref.type !== 'upward' || ref.status !== UPWARD_STATUS.IN_TRANSIT) return ref

          const createdAt = new Date(ref.createdAt).getTime()
          if (ref.is_emergency && !ref.isRetroEntry && !ref.admissionArrangement && Number.isFinite(createdAt) && now - createdAt > fourHours && !ref.isUrgentUnhandled) {
            changed = true
            pendingNotifications.push({
              type: 'emergency_overdue',
              title: '急诊转诊4h超时——紧急告警',
              content: `急诊转诊（患者${ref.patient?.name}）已超4小时未补录接诊信息，请立即介入处理`,
              referralId: ref.id,
            })
            return {
              ...ref,
              urgentFlag: 'urgent_unhandled',
              isUrgentUnhandled: true,
              updatedAt: new Date().toISOString(),
              logs: [
                ...ref.logs,
                { time: new Date().toISOString(), actor: '系统', action: '急诊转诊4小时未补录接诊信息，已升级为紧急告警' },
              ],
            }
          }

          if (ref.is_emergency && ref.admissionArrangement && ref.isUrgentUnhandled) {
            changed = true
            return {
              ...ref,
              urgentFlag: null,
              isUrgentUnhandled: false,
              updatedAt: new Date().toISOString(),
            }
          }

          const transferredAt = new Date(ref.transferredAt || ref.acceptedAt || ref.updatedAt).getTime()
          if (Number.isFinite(transferredAt) && now - transferredAt > sevenDays) {
            changed = true
            const newBedStatus = ref.bedStatus === 'bed_reserved' ? 'bed_released' : ref.bedStatus
            const nextAppointmentStatus = ref.appointmentInfo?.status === 'reserved' ? 'released' : ref.appointmentInfo?.status
            pendingNotifications.push({
              title: '转诊单超时自动关闭',
              content: '转诊单因超时7天无到院记录已自动关闭',
              referralId: ref.id,
            })
            return {
              ...ref,
              status: UPWARD_STATUS.CLOSED,
              closeReason: '超时7天无到院记录，系统自动关闭',
              closedAt: new Date().toISOString(),
              closedBy: 'system',
              updatedAt: new Date().toISOString(),
              appointmentCodeStatus: nextAppointmentStatus || ref.appointmentCodeStatus || null,
              appointmentInfo: nextAppointmentStatus
                ? { ...ref.appointmentInfo, status: nextAppointmentStatus }
                : ref.appointmentInfo,
              bedStatus: newBedStatus,
              logs: [
                ...ref.logs,
                { time: new Date().toISOString(), actor: '系统', action: 'AUTO_CLOSE_TIMEOUT', note: '超时7天无到院记录，系统自动关闭' },
                ...(nextAppointmentStatus === 'released' ? [{ time: new Date().toISOString(), actor: '系统', action: '预约码已释放（自动关闭）' }] : []),
                ...(newBedStatus === 'bed_released' ? [{ time: new Date().toISOString(), actor: '系统', action: '床位已释放（自动关闭）' }] : []),
              ],
            }
          }

          const visitTime = ref.admissionArrangement?.visitTime ? new Date(ref.admissionArrangement.visitTime).getTime() : NaN
          if (Number.isFinite(visitTime) && now > visitTime + fortyEightHours && !ref.reminderSent48h) {
            changed = true
            pendingNotifications.push({
              title: '转诊患者就诊时间已过48小时',
              content: '转诊患者就诊时间已过48小时，请确认：点击「完成接诊确认」或「协商关闭」',
              referralId: ref.id,
            })
            return {
              ...ref,
              reminderSent48h: true,
              updatedAt: new Date().toISOString(),
              logs: [
                ...ref.logs,
                { time: new Date().toISOString(), actor: '系统', action: '48小时催办提醒已发送给转诊中心', note: '请确认完成接诊或协商关闭' },
              ],
            }
          }

          return ref
        })

        return changed ? next : prev
      })

      pendingNotifications.forEach(item => {
        addNotification({
          type: item.type || 'system',
          title: item.title,
          content: item.content,
          targetRole: ROLES.ADMIN,
          referralId: item.referralId,
        })
        if (item.type === 'emergency_overdue') {
          addNotification({
            type: item.type,
            title: item.title,
            content: item.content,
            targetRole: ROLES.COUNTY2,
            targetInstitution: referrals.find(ref => ref.id === item.referralId)?.toInstitution,
            referralId: item.referralId,
          })
        }
        if (item.title === '转诊单超时自动关闭') {
          addNotification({
            type: 'system',
            title: item.title,
            content: item.content,
            targetRole: ROLES.PRIMARY,
            referralId: item.referralId,
          })
        }
      })
    }

    runTimedChecks()
    const timer = window.setInterval(runTimedChecks, 60 * 1000)
    return () => window.clearInterval(timer)
  }, [addNotification, referrals, setReferrals])

  // 当前角色的通知
  const myNotifications = notifications.filter(notification => {
    if (!shouldShowNotificationToUser({
      notification,
      currentRole,
      currentInstitution: currentUser?.institution,
    })) {
      return false
    }

    const relatedReferral = referrals.find(ref => ref.id === notification.referralId)
    if (relatedReferral?.is_emergency) {
      return canViewEmergencyReferralDetail({
        currentRole,
        currentUser,
        referral: relatedReferral,
      })
    }

    if (currentRole === ROLES.COUNTY && relatedReferral?.type === 'upward') {
      const assignedToCurrentDoctor =
        relatedReferral.assignedDoctorId === currentUser?.id ||
        relatedReferral.assignedDoctorName === currentUser?.name ||
        relatedReferral.assignedDoctor === currentUser?.name

      return assignedToCurrentDoctor
    }

    return true
  })
  const unreadCount = myNotifications.filter(n => !n.read).length

  return (
    <AppContext.Provider value={{
      currentRole,
      setCurrentRole: setCurrentRoleAndPersist,
      currentUser,
      referrals,
      setReferrals,
      notifications,
      myNotifications,
      unreadCount,
      markNotificationRead,
      markAllRead,
      // 状态机操作
      submitReferral,
      createDownwardReferral,
      cancelDownwardReferral,
      claimReferral,
      acceptReferral,
      rejectReferral,
      cancelReferral,
      closeReferral,
      collaborativeCloseReferral,
      reopenReferral,
      completeReferral,
      completeRetroEmergencyReferral,
      acceptDownwardReferral,
      completeDownwardReferral,
      rejectDownwardReferral,
      reassignDownwardReferral,
      selfAcceptDownwardReferral,
      rejectDownwardByCoordinator,
      closeDownwardByTimeout,
      assignDoctorByAdmin,
      verifyAndConsumeAppointmentCode,
      recordReferralDocumentAction,
      recordPhoneCallAction,
      escalateEmergencyAlert,
      renotifyEmergency,
      // CHG-29/30/32 新增
      submitForInternalReview,
      approveInternalReview,
      rejectInternalReview,
      fillAdmissionArrangement,
      supplementEmergencyAdmission,
      emergencyModifyReferral,
      markEmergencyFirstViewed,
      confirmEmergencyPatientNotified,
      claimDownwardReferral,
      recordFollowupVisit,
      markFollowupUnreachable,
      requestFollowupReassign,
    }}>
      {children}
    </AppContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

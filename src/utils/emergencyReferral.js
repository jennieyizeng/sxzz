import { ROLES, UPWARD_STATUS } from '../data/mockData.js'

export function isValidChineseMainlandMobile(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || '').trim())
}

export function shouldOfferGreenChannel({ urgencyLevel }) {
  return urgencyLevel === 1 || urgencyLevel === 2
}

export function buildEmergencyUrgencyFeedback(urgencyLevel) {
  if (urgencyLevel === 1) {
    return {
      tone: 'critical',
      message: '已自动启用绿色通道，将同步通知急诊科及联动专科',
      badge: '自动启用绿通',
      greenChannelAutoEnabled: true,
    }
  }

  if (urgencyLevel === 2) {
    return {
      tone: 'urgent',
      message: '将按急诊优先流程处理，可根据病情联动相关专科',
      badge: null,
      greenChannelAutoEnabled: false,
    }
  }

  if (urgencyLevel === 3 || urgencyLevel === 4) {
    return {
      tone: 'standard',
      message: '将通知目标医院急诊科进行接诊准备',
      badge: null,
      greenChannelAutoEnabled: false,
    }
  }

  return null
}

export function canProceedEmergencyReferral({
  patientName,
  patientPhone,
  urgencyLevel,
  consciousnessStatus,
  toInstitutionId,
}) {
  return Boolean(
    String(patientName || '').trim() &&
    isValidChineseMainlandMobile(patientPhone) &&
    urgencyLevel &&
    String(consciousnessStatus || '').trim() &&
    String(toInstitutionId || '').trim()
  )
}

export function shouldShowNotificationToUser({
  notification,
  currentRole,
  currentInstitution,
}) {
  if (!notification) return false
  if (notification.targetRole && notification.targetRole !== currentRole) return false
  if (notification.targetInstitution && notification.targetInstitution !== currentInstitution) return false
  return true
}

export function buildEmergencyReferralCode(date = new Date()) {
  const current = new Date(date)
  const y = current.getFullYear()
  const m = String(current.getMonth() + 1).padStart(2, '0')
  const d = String(current.getDate()).padStart(2, '0')
  const hh = String(current.getHours()).padStart(2, '0')
  const mm = String(current.getMinutes()).padStart(2, '0')
  return `EM${y}${m}${d}${hh}${mm}`
}

export function buildEmergencyInitialSms({ institutionName, targetDepartment, emergencyDeptPhone, referralCode, isGreenChannel }) {
  if (isGreenChannel) {
    return `【绿色通道】您好，您的急诊转诊已启用绿色通道。\n目标医院：${institutionName || '目标医院'}\n接诊入口：急诊科（已同步通知${targetDepartment || '相关联动专科'}）\n急诊科电话：${emergencyDeptPhone || '—'}\n请立即前往就诊。转诊单号：${referralCode || '—'}`
  }

  return `【转诊通知】您好，您的急诊转诊申请已提交。\n目标医院：${institutionName || '目标医院'}\n接诊入口：急诊科（急诊优先接诊）\n急诊科电话：${emergencyDeptPhone || '—'}\n请尽快前往就诊。转诊单号：${referralCode || '—'}`
}

export function buildEmergencyModifySms(payload) {
  return `${buildEmergencyInitialSms(payload)}\n（本条为更新通知，请以此为准）`
}

export function getEmergencyHospitalConfig(institutions = []) {
  const hospitals = institutions.filter(item => item.type === 'county' && item.status === '已签约')
  return {
    mode: hospitals.length <= 1 ? 'single' : 'multiple',
    hospitals,
    selectedHospital: hospitals[0] || null,
  }
}

export function canViewEmergencyModifyWindowInfo({
  currentRole,
  currentUserName,
  fromDoctor,
  isEmergencyReferral,
  isUpward,
  status,
}) {
  return currentRole === ROLES.PRIMARY &&
    currentUserName === fromDoctor &&
    isEmergencyReferral &&
    isUpward &&
    status === UPWARD_STATUS.IN_TRANSIT
}

export function canViewEmergencyReferralDetail({
  currentRole,
  currentUser,
  referral,
}) {
  if (!referral?.is_emergency) return true
  if (currentRole === ROLES.ADMIN) return true

  const currentDept = currentUser?.dept
  const institutionMatches = currentUser?.institution === referral.toInstitution
  const targetDeptMatches = currentDept && currentDept === referral.toDept
  const linkedSpecialtyMatches = referral.referral_type === 'green_channel' && currentDept && currentDept === referral.linkedSpecialty

  if (currentRole === ROLES.COUNTY2) {
    return Boolean(institutionMatches && (targetDeptMatches || linkedSpecialtyMatches))
  }

  if (currentRole === ROLES.COUNTY) {
    return Boolean(
      institutionMatches &&
      currentUser?.isPreferredDoctor &&
      targetDeptMatches
    )
  }

  return true
}

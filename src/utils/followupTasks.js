import { MOCK_FOLLOW_UP_TASKS, ROLES } from '../data/mockData.js'

function getAssignedDoctor(referral, currentUser) {
  if (referral.toDoctor) return referral.toDoctor
  if (referral.downwardAssignedDoctorId === currentUser?.id) return currentUser?.name || '—'
  return '—'
}

function toDateOnly(value) {
  if (!value) return '—'
  const normalized = String(value)
  return normalized.includes('T') ? normalized.split('T')[0] : normalized
}

function normalizeFollowupStatus(rawStatus, visitCount, isOverdue) {
  if (rawStatus === '已完成' || rawStatus === 'completed') return '已完成'
  if (rawStatus === '已失访' || rawStatus === 'lost' || rawStatus === 'lost_contact') return '已失访'
  if (rawStatus === '待随访' || rawStatus === 'pending' || rawStatus === 'active') {
    return isOverdue ? '已逾期' : '待随访'
  }
  if (isOverdue) return '已逾期'
  if (visitCount > 0 || rawStatus === '随访中' || rawStatus === 'in_progress') return '随访中'
  return '待随访'
}

function getLinkedTaskByReferralId(referralId) {
  return MOCK_FOLLOW_UP_TASKS.find(item => item.referralId === referralId) || null
}

export function resolveFollowupTaskMeta(referral) {
  const linkedTask = getLinkedTaskByReferralId(referral?.id)
  const meta = referral?.followUpTaskMeta || {}

  return {
    id: meta.id || referral?.followUpTaskId || linkedTask?.id || `FU${referral?.id || Date.now()}`,
    status: meta.status || linkedTask?.status || 'active',
    nextVisitDate: meta.nextVisitDate || linkedTask?.nextVisitDate || referral?.rehabPlan?.followupDate || referral?.suggestedFirstVisitDate || '',
    visitCount: meta.visitCount ?? linkedTask?.visitCount ?? 0,
    lastFollowupAt: meta.lastFollowupAt ?? linkedTask?.lastFollowupAt ?? null,
    records: Array.isArray(meta.records) ? meta.records : (Array.isArray(linkedTask?.records) ? linkedTask.records : []),
    notes: meta.notes ?? linkedTask?.notes ?? '',
    indicators: meta.indicators ?? linkedTask?.indicators ?? referral?.rehabPlan?.indicators ?? [],
    assignedDoctorName: meta.assignedDoctorName ?? linkedTask?.assignedDoctorName ?? referral?.downwardAssignedDoctorName ?? referral?.toDoctor ?? '—',
    assignedDoctorId: meta.assignedDoctorId ?? linkedTask?.assignedDoctorId ?? referral?.downwardAssignedDoctorId ?? null,
    createdAt: meta.createdAt ?? linkedTask?.createdAt ?? referral?.completedAt ?? referral?.updatedAt ?? referral?.createdAt ?? null,
    updatedAt: meta.updatedAt ?? linkedTask?.updatedAt ?? referral?.updatedAt ?? referral?.createdAt ?? null,
  }
}

const GOAL_HINTS = {
  血压: '观察晨晚血压波动，必要时记录家庭监测值',
  语言功能: '关注表达、理解和吞咽配合情况',
  肢体活动度: '记录步态、肌力和关节活动范围恢复情况',
  服药依从性: '核对是否按时服药、是否存在漏服停药',
}

function buildFollowupGoals(indicators) {
  const normalized = Array.isArray(indicators) ? indicators : []
  const coreGoals = ['血压', '语言功能', '肢体活动度', '服药依从性'].map(label => ({
    label,
    monitored: normalized.includes(label),
    note: GOAL_HINTS[label],
  }))

  const otherIndicators = normalized.filter(item => !GOAL_HINTS[item])

  return {
    coreGoals,
    otherIndicators,
  }
}

function buildInitialRecordDraft(task, referral) {
  const linkedTask = resolveFollowupTaskMeta(referral)
  return {
    method: '电话',
    visitTime: new Date().toISOString().slice(0, 16),
    currentCondition: linkedTask?.notes || referral?.rehabPlan?.notes || '',
    bloodPressure: '',
    languageFunction: '',
    limbMobility: '',
    medicationStatus: '',
    rehabTraining: '',
    abnormalSituation: '',
    doctorAdvice: '',
    nextFollowupDate: linkedTask?.nextVisitDate || task?.followupDate || '',
    otherMetrics: '',
  }
}

function buildHistoryRecords(task, currentUser) {
  if (Array.isArray(task?.records) && task.records.length > 0) {
    return [...task.records].sort((a, b) => new Date(b.followupDate || b.createdAt || 0) - new Date(a.followupDate || a.createdAt || 0))
  }

  if (task?.lastFollowupAt) {
    return [{
      id: `${task.id}-last`,
      type: 'followup',
      status: '随访已记录',
      method: '电话',
      followupDate: task.lastFollowupAt,
      patientStatus: '稳定',
      metricSummary: '已完成一次常规随访',
      summary: task.notes || '已按计划完成随访，当前无额外异常记录。',
      advice: '按既定计划继续下一次随访。',
      nextFollowupDate: task.nextVisitDate || task.followupDate || '',
      doctorName: task.assignedDoctorName || currentUser?.name || '—',
    }]
  }

  return []
}

export function buildScopedFollowups(referrals, currentUser) {
  const isPrimaryHead = currentUser?.role === ROLES.PRIMARY_HEAD

  return referrals
    .filter(referral => {
      const linkedTask = resolveFollowupTaskMeta(referral)
      const hasFollowupTask = Boolean(referral.followUpTaskMeta || referral.followUpTaskId || linkedTask)
      const canEnterFollowupFlow = referral.status === '已完成' || hasFollowupTask

      if (!(referral.type === 'downward' && canEnterFollowupFlow && referral.rehabPlan?.followupDate)) {
        return false
      }

      if (isPrimaryHead) {
        return referral.toInstitution === currentUser.institution
      }

      return referral.downwardAssignedDoctorId === currentUser.id || referral.toDoctor === currentUser.name
    })
    .map(referral => {
      const linkedTask = resolveFollowupTaskMeta(referral)
      const followDate = new Date(referral.rehabPlan.followupDate)
      const today = new Date()
      const daysLeft = Math.ceil((followDate - today) / 86400000)
      const visitCount = linkedTask?.visitCount ?? 0
      const lastFollowupAt = linkedTask?.lastFollowupAt ?? (visitCount > 0 ? linkedTask?.updatedAt : null)
      const downwardDate = referral.completedAt || referral.transferredAt || referral.updatedAt || referral.createdAt
      const status = normalizeFollowupStatus(
        linkedTask?.status,
        visitCount,
        daysLeft < 0,
      )

      return {
        id: `FU${referral.id}`,
        referralId: referral.id,
        patient: referral.patient,
        diagnosis: referral.diagnosis,
        fromInstitution: referral.fromInstitution,
        toInstitution: referral.toInstitution,
        assignedDoctor: getAssignedDoctor(referral, currentUser),
        downwardDate: toDateOnly(downwardDate),
        lastFollowupAt: lastFollowupAt ? toDateOnly(lastFollowupAt) : null,
        followupDate: referral.rehabPlan.followupDate,
        visitCount,
        indicators: referral.rehabPlan?.indicators || [],
        daysLeft,
        isOverdue: daysLeft < 0,
        isUrgent: daysLeft >= 0 && daysLeft <= 3,
        status,
      }
    })
}

export function buildFollowupTaskDetail(referrals, currentUser, taskId) {
  const scopedTasks = buildScopedFollowups(referrals, currentUser)
  const task = scopedTasks.find(item => item.id === taskId || item.referralId === taskId)
  const referral = referrals.find(item => item.id === task?.referralId || item.id === taskId)
  if (!referral) return null
  const linkedTask = resolveFollowupTaskMeta(referral)

  const resolvedTask = task || {
    id: `FU${referral.id}`,
    referralId: referral.id,
    patient: referral.patient,
    diagnosis: referral.diagnosis,
    fromInstitution: referral.fromInstitution,
    toInstitution: referral.toInstitution,
    assignedDoctor: getAssignedDoctor(referral, currentUser),
    downwardDate: toDateOnly(referral.completedAt || referral.transferredAt || referral.updatedAt || referral.createdAt),
    lastFollowupAt: null,
    followupDate: referral.rehabPlan?.followupDate || referral.suggestedFirstVisitDate || '',
    visitCount: 0,
    indicators: referral.rehabPlan?.indicators || [],
    daysLeft: 0,
    isOverdue: false,
    isUrgent: false,
    status: '待随访',
  }

  const { coreGoals, otherIndicators } = buildFollowupGoals(resolvedTask.indicators)
  const historyRecords = buildHistoryRecords(
    linkedTask,
    currentUser,
  )

  return {
    ...resolvedTask,
    referral,
    sourceHospital: resolvedTask.fromInstitution,
    responsibilityDoctor: resolvedTask.assignedDoctor,
    downwardReason: referral.reason
      || (Array.isArray(referral.rehabGoals) && referral.rehabGoals.length > 0 ? referral.rehabGoals.join('、') : null)
      || referral.chiefComplaint
      || '—',
    chiefDiagnosis: referral.diagnosis?.name || '—',
    fromInstitution: referral.fromInstitution || resolvedTask.fromInstitution || '—',
    toInstitution: referral.toInstitution || resolvedTask.toInstitution || currentUser?.institution || '—',
    followupGoals: coreGoals,
    otherIndicators,
    historyRecords,
    draft: buildInitialRecordDraft(resolvedTask, referral),
  }
}

export function getFollowupCounts(followups) {
  return {
    all: followups.length,
    overdue: followups.filter(task => task.isOverdue).length,
    urgent: followups.filter(task => task.isUrgent && !task.isOverdue).length,
    pending: followups.filter(task => task.status === '待随访').length,
  }
}

export function filterFollowupsByTab(followups, tab) {
  if (tab === 'overdue') return followups.filter(task => task.isOverdue)
  if (tab === 'urgent') return followups.filter(task => task.isUrgent && !task.isOverdue)
  if (tab === 'pending') return followups.filter(task => !task.isOverdue)
  return followups
}

export function filterFollowupsByAssignee(followups, assignee) {
  if (!assignee || assignee === 'all') return followups
  return followups.filter(task => task.assignedDoctor === assignee)
}

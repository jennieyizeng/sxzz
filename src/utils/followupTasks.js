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

const ENDED_REASON_BY_LEGACY_STATUS = {
  completed: 'completed_plan',
  '已完成': 'completed_plan',
  lost: 'lost_contact',
  lost_contact: 'lost_contact',
  unreachable: 'lost_contact',
  '已失访': 'lost_contact',
}

const ASSESSMENT_LABELS = {
  stable: '稳定',
  improving: '好转',
  worsening: '恶化加重',
  稳定: '稳定',
  好转: '好转',
  需关注: '恶化加重',
  需上转: '恶化加重',
}

const CHANNEL_LABELS = {
  phone: '电话',
  wechat: '微信',
  in_person: '上门',
  电话: '电话',
  微信: '微信',
  上门: '上门',
  门诊复诊: '门诊复诊',
}

function deriveTaskLifecycle(meta = {}) {
  const rawStatus = meta.taskStatus || meta.status || 'active'
  const endedReason = meta.endedReason || ENDED_REASON_BY_LEGACY_STATUS[rawStatus] || null
  const taskStatus = rawStatus === 'ended' || endedReason ? 'ended' : 'active'

  return {
    taskStatus,
    statusLabel: taskStatus === 'ended' ? '已结束' : '待随访',
    endedReason: taskStatus === 'ended' ? endedReason || 'completed_plan' : null,
  }
}

function deriveReassignDisplayStatus(taskMeta = {}) {
  if (taskMeta.taskStatus === 'ended') return '—'
  if (taskMeta.reassignmentPending) return '转派待处理'
  const latest = Array.isArray(taskMeta.reassignmentLog) ? taskMeta.reassignmentLog.at(-1) : null
  if (latest?.triggeredBy === 'doctor_request_rejected') return '已拒绝'
  if (latest?.toDoctorId) return '已转派'
  return '—'
}

function getLinkedTaskByReferralId(referralId) {
  return MOCK_FOLLOW_UP_TASKS.find(item => item.referralId === referralId) || null
}

export function resolveFollowupTaskMeta(referral) {
  const linkedTask = getLinkedTaskByReferralId(referral?.id)
  const meta = referral?.followUpTaskMeta || {}
  const lifecycle = deriveTaskLifecycle({ ...linkedTask, ...meta })
  const legacyReassignStatus = meta.reassignStatus || linkedTask?.reassignStatus || 'none'
  const reassignmentPending = meta.reassignmentPending || linkedTask?.reassignmentPending || (
    legacyReassignStatus === 'requested'
      ? {
          requestedBy: meta.reassignRequestedById || linkedTask?.reassignRequestedById || null,
          requestedByName: meta.reassignRequestedByName || linkedTask?.reassignRequestedByName || '',
          requestedAt: meta.reassignRequestedAt || linkedTask?.reassignRequestedAt || null,
          requestReason: meta.pendingReassignReason || linkedTask?.pendingReassignReason || '',
          targetSuggestion: meta.proposedDoctorId || linkedTask?.proposedDoctorId || null,
          targetSuggestionName: meta.proposedDoctorName || linkedTask?.proposedDoctorName || '',
        }
      : null
  )

  return {
    id: meta.id || referral?.followUpTaskId || linkedTask?.id || `FU${referral?.id || Date.now()}`,
    status: lifecycle.statusLabel,
    taskStatus: lifecycle.taskStatus,
    endedReason: meta.endedReason || linkedTask?.endedReason || lifecycle.endedReason,
    endedReasonText: meta.endedReasonText || linkedTask?.endedReasonText || '',
    endedBy: meta.endedBy || linkedTask?.endedBy || null,
    endedByName: meta.endedByName || linkedTask?.endedByName || '',
    endedAt: meta.endedAt || linkedTask?.endedAt || (lifecycle.taskStatus === 'ended' ? (meta.updatedAt || linkedTask?.updatedAt || null) : null),
    nextVisitDate: meta.nextScheduledDate || meta.nextVisitDate || linkedTask?.nextScheduledDate || linkedTask?.nextVisitDate || referral?.rehabPlan?.followupDate || referral?.suggestedFirstVisitDate || '',
    visitCount: meta.visitCount ?? linkedTask?.visitCount ?? 0,
    lastFollowupAt: meta.lastFollowupAt ?? linkedTask?.lastFollowupAt ?? null,
    records: Array.isArray(meta.records) ? meta.records : (Array.isArray(linkedTask?.records) ? linkedTask.records : []),
    notes: meta.notes ?? linkedTask?.notes ?? '',
    indicators: meta.indicators ?? linkedTask?.indicators ?? referral?.rehabPlan?.indicators ?? [],
    assignedDoctorName: meta.assignedDoctorName ?? linkedTask?.assignedDoctorName ?? referral?.downwardAssignedDoctorName ?? referral?.toDoctor ?? '—',
    assignedDoctorId: meta.assignedDoctorId ?? linkedTask?.assignedDoctorId ?? referral?.downwardAssignedDoctorId ?? null,
    reassignStatus: reassignmentPending ? 'requested' : 'none',
    reassignmentPending,
    reassignmentLog: Array.isArray(meta.reassignmentLog) ? meta.reassignmentLog : (Array.isArray(linkedTask?.reassignmentLog) ? linkedTask.reassignmentLog : []),
    reassignRequestedById: reassignmentPending?.requestedBy || null,
    reassignRequestedByName: reassignmentPending?.requestedByName || '',
    reassignRequestedAt: reassignmentPending?.requestedAt || null,
    pendingReassignReason: reassignmentPending?.requestReason || '',
    proposedDoctorId: reassignmentPending?.targetSuggestion || null,
    proposedDoctorName: reassignmentPending?.targetSuggestionName || '',
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

function normalizeHistoryRecord(record, currentUser) {
  const outcome = record.outcome || (record.type === 'unreachable' ? 'not_contacted' : 'contacted')
  const visitDate = toDateOnly(record.visitDate || record.followupDate || record.createdAt)
  const channelLabel = CHANNEL_LABELS[record.channel] || CHANNEL_LABELS[record.method] || record.method || '电话'
  const attemptedByName = record.attemptedByName || record.doctorName || currentUser?.name || '—'
  const assessmentLabel = outcome === 'not_contacted'
    ? '未联系上'
    : ASSESSMENT_LABELS[record.assessment] || ASSESSMENT_LABELS[record.patientStatus] || record.patientStatus || '稳定'
  const nextScheduledDate = record.nextScheduledDate || record.nextFollowupDate || ''

  return {
    ...record,
    id: record.visitId || record.id,
    outcome,
    visitDate,
    followupDate: visitDate,
    channelLabel,
    method: channelLabel,
    attemptedByName,
    doctorName: attemptedByName,
    assessmentLabel,
    patientStatus: assessmentLabel,
    status: outcome === 'not_contacted' ? '未联系上' : '随访已记录',
    summary: outcome === 'not_contacted'
      ? (record.notReachedNote || record.summary || '本次尝试联系未成功')
      : (record.summary || '—'),
    advice: outcome === 'not_contacted'
      ? ''
      : (record.advice || '按医嘱继续居家观察与康复训练。'),
    nextScheduledDate,
    nextFollowupDate: nextScheduledDate,
  }
}

function buildHistoryRecords(task, currentUser) {
  if (Array.isArray(task?.records) && task.records.length > 0) {
    return task.records
      .filter(record => record.outcome || ['followup', 'unreachable'].includes(record.type))
      .map(record => normalizeHistoryRecord(record, currentUser))
      .sort((a, b) => new Date(b.visitDate || b.createdAt || 0) - new Date(a.visitDate || a.createdAt || 0))
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
    }].map(record => normalizeHistoryRecord(record, currentUser))
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

      return referral.downwardAssignedDoctorId === currentUser.id ||
        referral.toDoctor === currentUser.name ||
        linkedTask.assignedDoctorId === currentUser.id ||
        linkedTask.assignedDoctorName === currentUser.name ||
        linkedTask.reassignmentPending?.requestedBy === currentUser.id
    })
    .map(referral => {
      const linkedTask = resolveFollowupTaskMeta(referral)
      const followDate = new Date(referral.rehabPlan.followupDate)
      const today = new Date()
      const daysLeft = Math.ceil((followDate - today) / 86400000)
      const visitCount = linkedTask?.visitCount ?? 0
      const lastFollowupAt = linkedTask?.lastFollowupAt ?? (visitCount > 0 ? linkedTask?.updatedAt : null)
      const downwardDate = referral.completedAt || referral.transferredAt || referral.updatedAt || referral.createdAt

      return {
        id: `FU${referral.id}`,
        referralId: referral.id,
        patient: referral.patient,
        diagnosis: referral.diagnosis,
        fromInstitution: referral.fromInstitution,
        toInstitution: referral.toInstitution,
        assignedDoctor: linkedTask.assignedDoctorName || getAssignedDoctor(referral, currentUser),
        assignedDoctorId: linkedTask.assignedDoctorId,
        taskStatus: linkedTask.taskStatus,
        endedReason: linkedTask.endedReason,
        endedReasonText: linkedTask.endedReasonText,
        endedAt: linkedTask.endedAt,
        reassignStatus: linkedTask.reassignStatus,
        reassignmentPending: linkedTask.reassignmentPending,
        reassignmentLog: linkedTask.reassignmentLog,
        reassignDisplayStatus: deriveReassignDisplayStatus(linkedTask),
        reassignRequestedById: linkedTask.reassignRequestedById,
        reassignRequestedByName: linkedTask.reassignRequestedByName,
        pendingReassignReason: linkedTask.pendingReassignReason,
        proposedDoctorId: linkedTask.proposedDoctorId,
        proposedDoctorName: linkedTask.proposedDoctorName,
        reassignRejectedReason: linkedTask.reassignRejectedReason,
        reassignRejectedById: linkedTask.reassignRejectedById,
        reassignRejectedByName: linkedTask.reassignRejectedByName,
        downwardDate: toDateOnly(downwardDate),
        lastFollowupAt: lastFollowupAt ? toDateOnly(lastFollowupAt) : null,
        followupDate: linkedTask.nextVisitDate || referral.rehabPlan.followupDate,
        visitCount,
        indicators: referral.rehabPlan?.indicators || [],
        daysLeft,
        isOverdue: daysLeft < 0,
        isUrgent: daysLeft >= 0 && daysLeft <= 3,
        status: linkedTask.status,
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
    taskStatus: linkedTask.taskStatus,
    endedReason: linkedTask.endedReason,
    endedReasonText: linkedTask.endedReasonText,
    endedAt: linkedTask.endedAt,
    status: linkedTask.status,
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
    reassignmentPending: linkedTask.reassignmentPending,
    reassignmentLog: linkedTask.reassignmentLog,
    canRecordFollowup: linkedTask.taskStatus === 'active',
  }
}

export function getFollowupCounts(followups) {
  return {
    all: followups.length,
    overdue: followups.filter(task => task.isOverdue).length,
    urgent: followups.filter(task => task.isUrgent && !task.isOverdue).length,
    pending: followups.filter(task => task.taskStatus !== 'ended' && !task.isOverdue && !task.isUrgent).length,
  }
}

export function filterFollowupsByTab(followups, tab) {
  if (tab === 'overdue') return followups.filter(task => task.taskStatus !== 'ended' && task.isOverdue)
  if (tab === 'urgent') return followups.filter(task => task.taskStatus !== 'ended' && task.isUrgent && !task.isOverdue)
  if (tab === 'pending') return followups.filter(task => task.taskStatus !== 'ended' && !task.isOverdue && !task.isUrgent)
  return followups
}

export function filterFollowupsByAssignee(followups, assignee) {
  if (!assignee || assignee === 'all') return followups
  return followups.filter(task => task.assignedDoctor === assignee)
}

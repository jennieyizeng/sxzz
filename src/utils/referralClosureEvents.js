const TERMINAL_STATUSES = new Set(['已拒绝', '已退回', '已撤销', '已关闭'])

function getLogs(referral) {
  return Array.isArray(referral?.logs) ? referral.logs : []
}

function matchLog(action = '', keywords = []) {
  return keywords.some(keyword => action.includes(keyword))
}

function findFirstLog(referral, keywords = []) {
  return getLogs(referral).find(log => matchLog(log?.action || '', keywords)) || null
}

function findLastLog(referral, keywords = []) {
  const matched = getLogs(referral).filter(log => matchLog(log?.action || '', keywords))
  return matched.length > 0 ? matched[matched.length - 1] : null
}

function buildEvent(key, label, time = null, note = '') {
  return { key, label, time, note, state: 'future' }
}

function getTerminalNote(referral) {
  return referral?.returnReason || referral?.coordinatorReturnReason || referral?.rejectReason || referral?.closeReason || '当前转诊流程已终止'
}

function withActiveFallbackTime(events, referral, activeIndex) {
  if (activeIndex < 0 || activeIndex >= events.length) return events
  if (events[activeIndex]?.time) return events
  if (!referral?.updatedAt) return events

  return events.map((item, index) => (
    index === activeIndex ? { ...item, time: referral.updatedAt } : item
  ))
}

function getUpwardEvents(referral) {
  const isEmergencyLike = !!referral?.is_emergency || ['emergency', 'green_channel'].includes(referral?.referral_type)
  const startLabel = referral?.referral_type === 'green_channel' ? '发起绿通转诊' : isEmergencyLike ? '发起急诊转诊' : '发起转诊'
  const receptionLabel = isEmergencyLike ? '已通知并进入接诊准备' : '转诊受理'
  const completionLabel = isEmergencyLike ? '急诊处置完成' : '完成诊疗'

  const startLog = findFirstLog(referral, ['发起绿色通道急诊上转', '提交急诊上转申请', '提交上转申请'])
  const receptionLog = isEmergencyLike
    ? findFirstLog(referral, ['急诊转诊：已自动通知', '绿通触发，已自动通知'])
    : findFirstLog(referral, ['接收转诊申请', '受理并接收转诊申请', '院内审核通过'])
  const arrivalLog = isEmergencyLike
    ? findFirstLog(referral, ['补录急诊接诊信息', '完成接诊确认'])
    : findFirstLog(referral, ['安排到院信息', '完成接诊确认', '补录急诊接诊信息'])
  const diagnosisLog = isEmergencyLike
    ? findFirstLog(referral, ['完成接诊确认'])
    : findFirstLog(referral, ['完成接诊确认'])
  const closureLog = findFirstLog(referral, ['状态更新为已完成', '触发数据上报'])

  return [
    buildEvent('start', startLabel, referral?.createdAt || startLog?.time || null, startLog?.note || ''),
    buildEvent('accept', receptionLabel, referral?.acceptedAt || receptionLog?.time || null, receptionLog?.note || ''),
    buildEvent(
      'arrival',
      '到院/接诊',
      referral?.admissionArrangement?.arrangedAt || referral?.admissionArrangement?.visitTime || arrivalLog?.time || null,
      arrivalLog?.note || ''
    ),
    buildEvent(
      'diagnosis',
      completionLabel,
      referral?.treatmentResult?.filledAt || diagnosisLog?.time || null,
      diagnosisLog?.note || referral?.treatmentResult?.summary || ''
    ),
    buildEvent(
      'closure',
      '闭环完成',
      referral?.completedAt || closureLog?.time || null,
      closureLog?.note || (referral?.treatmentResult?.filledAt ? '已完成结果回传/归档' : '')
    ),
  ]
}

function getDownwardEvents(referral) {
  const startLog = findFirstLog(referral, ['发起下转申请'])
  const acceptLog = findLastLog(referral, ['受理下转申请', '改派下转申请', '确认接收下转申请'])
  const transitLog = findFirstLog(referral, ['患者完成转入'])
  const completeLog = findFirstLog(referral, ['确认接收下转申请', '完成患者接收确认'])
  const closureLog = findFirstLog(referral, ['状态更新为已完成'])

  return [
    buildEvent('start', '发起下转', referral?.createdAt || startLog?.time || null, startLog?.note || ''),
    buildEvent(
      'accept',
      '下转接收',
      referral?.coordinatorActionAt || acceptLog?.time || null,
      referral?.downwardAssignedDoctorName ? `当前承接人：${referral.downwardAssignedDoctorName}` : (acceptLog?.note || '')
    ),
    buildEvent('arrival', '患者转入基层', transitLog?.time || referral?.completedAt || null, transitLog?.note || ''),
    buildEvent('complete', '接收完成', referral?.completedAt || completeLog?.time || null, completeLog?.note || ''),
    buildEvent(
      'closure',
      '闭环完成',
      referral?.completedAt || closureLog?.time || null,
      referral?.followUpTaskId ? `已创建随访任务 ${referral.followUpTaskId}` : (closureLog?.note || '')
    ),
  ]
}

function applyEventStates(events, referral) {
  const terminal = TERMINAL_STATUSES.has(referral?.status)
  const completedIndexes = events
    .map((item, index) => (item.time ? index : -1))
    .filter(index => index >= 0)
  const lastCompletedIndex = completedIndexes.length ? completedIndexes[completedIndexes.length - 1] : -1

  if (terminal) {
    const terminalIndex = Math.min(lastCompletedIndex + 1, events.length - 1)
    return events.map((item, index) => {
      if (index <= lastCompletedIndex) return { ...item, state: 'done' }
      if (index === terminalIndex) return { ...item, state: 'terminal', note: item.note || getTerminalNote(referral) }
      return { ...item, state: 'future' }
    })
  }

  const allDone = events.every(item => item.time)
  if (allDone) {
    return events.map(item => ({ ...item, state: 'done' }))
  }

  const activeIndex = lastCompletedIndex + 1
  const eventsWithFallbackTime = withActiveFallbackTime(events, referral, activeIndex)

  return eventsWithFallbackTime.map((item, index) => {
    if (index <= lastCompletedIndex) return { ...item, state: 'done' }
    if (index === activeIndex) return { ...item, state: 'active' }
    return { ...item, state: 'future' }
  })
}

export function getReferralClosureEvents(referral) {
  if (!referral) return []

  const events = referral.type === 'downward'
    ? getDownwardEvents(referral)
    : getUpwardEvents(referral)

  return applyEventStates(events, referral)
}

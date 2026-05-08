const ACTION_LABELS = {
  EMERGENCY_MODIFY: '紧急修改转诊信息',
  PHONE_CALL_CLICKED: '拨打电话',
  EMERGENCY_MODIFY_PATIENT_CALLED: '紧急修改后已电话联系患者',
  EMERGENCY_MODIFY_OTHER_CONTACT: '紧急修改后通过其他方式联系患者',
  COLLABORATIVE_CLOSE: '协商关闭',
  AUTO_CLOSE_TIMEOUT: '协商关闭',
  DESIGNATED_DOCTOR_REJECT: '拒绝接收下转患者',
  COORDINATOR_ASSIGNED_DOCTOR_REJECT: '拒绝接收下转患者',
  COORDINATOR_REASSIGN: '改派下转接收医生',
  COORDINATOR_INSTITUTION_RETURN: '判定本机构无法承接',
}

const SOURCE_LABELS = {
  emergency_detail: '急诊转诊详情',
  emergency_modify_patient: '紧急修改后联系患者',
  admission_arrangement: '接诊安排',
  reassign_window: '转派窗口',
  unknown: '未记录来源',
}

const NUMBER_TYPE_LABELS = {
  emergency_dept: '急诊科电话',
  patient: '患者电话',
  department: '科室电话',
  nurse_station: '护士站电话',
  coordinator: '转诊联系人电话',
  unknown: '未记录电话类型',
}

function pickLogField(note, field) {
  const match = String(note || '').match(new RegExp(`${field}=([^；;]+)`))
  return match?.[1]?.trim()
}

function cleanText(value) {
  return String(value || '').trim()
}

function includesAny(text, patterns) {
  return patterns.some(pattern => text.includes(pattern))
}

function parsePatientArrivedAt(note) {
  const text = cleanText(note)
  return (
    text.match(/患者到院时间[=：]([^；;]+)/)?.[1]?.trim()
    || text.match(/患者到院[=：]([^；;]+)/)?.[1]?.trim()
    || ''
  )
}

function normalizeDateTimeText(value) {
  const text = cleanText(value)
  if (!text) return ''
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return text
  const pad = number => String(number).padStart(2, '0')
  return `${parsed.getFullYear()}/${pad(parsed.getMonth() + 1)}/${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

function parseRetroCompletion(action, note) {
  const actionText = cleanText(action)
  const noteText = cleanText(note)
  const department = actionText.match(/确认[：:](.+?)，就诊时间/)?.[1]?.trim()
    || actionText.match(/补录急诊接诊信息[：:](.+?)，就诊时间/)?.[1]?.trim()
    || ''
  const visitTime = normalizeDateTimeText(actionText.match(/就诊时间[：:]([^；;]+)/)?.[1]?.trim() || '')
  const admissionType = noteText.match(/承接方式[=：]([^；;]+)/)?.[1]?.trim() || ''
  const admissionTypeLabel = {
    emergency: '急诊处置',
    outpatient: '门诊就诊',
    inpatient: '住院收治',
  }[admissionType] || admissionType || '—'

  return [
    `实际接诊科室：${department || '—'}`,
    `实际承接方式：${admissionTypeLabel}`,
    `实际就诊时间：${visitTime || '—'}`,
  ].join('；')
}

const DETAIL_HIDDEN_PATTERNS = [
  'CHG-',
  'isRetroEntry',
  '字段记录',
  '补录模式提交',
  '研发',
  '测试',
  '通知科主任',
  '通知基层医生',
  '通知县级医生',
  '通知推送',
  '已通知双方医生',
  '自动通知',
  '状态变更为',
  '生成电子转诊单',
  '生成预约取号码',
  '生成预约码',
  '预约码已核销',
  '预约码已释放',
  '床位已核销',
  '床位已释放',
  '床位已预占',
  'bedStatus=',
  '其他医生已不可',
  '接收锁定',
  '定向推送',
  '推送至',
  '已向患者发送',
  '发送患者短信',
  '实时通知',
  '转诊中心已查看',
  '催办',
  '紧急告警',
  '48小时',
  '转诊文书',
]

function isHealthReportAction(action) {
  return action.includes('健康通数据上报成功') || action.includes('健康通数据上报失败')
}

function normalizeOrdinaryUpwardAction(action) {
  if (isHealthReportAction(action)) return action.includes('失败') ? '健康通数据上报失败' : '健康通数据上报成功'
  if (action.includes('提交上转申请')) return '提交上转申请'
  if (action.includes('院内审核通过')) return '院内审核通过'
  if (action.includes('院内审核拒绝')) return '院内审核拒绝'
  if (action.includes('接收转诊申请') || action.includes('受理申请')) return '受理上转申请'
  if (action.includes('拒绝转诊申请')) return '驳回上转申请'
  if (action.includes('安排到院信息')) return '填写接诊安排'
  if (action.includes('完成接诊确认')) return '完成接诊确认'
  if (action.includes('终止/关闭转诊申请') || action.includes('COLLABORATIVE_CLOSE')) return '协商关闭'
  if (action.includes('撤销转诊申请')) return '撤销申请'
  return null
}

function normalizeEmergencyAction(action, referral) {
  if (isHealthReportAction(action)) return action.includes('失败') ? '健康通数据上报失败' : '健康通数据上报成功'
  if (referral?.isRetroEntry && action.includes('补录急诊上转申请')) return '补录急诊上转申请'
  if (referral?.isRetroEntry && action.includes('提交字段记录') && action.includes('isRetroEntry')) return '补录急诊上转申请'
  if (action.includes('提交急诊补录申请')) return '提交急诊补录申请'
  if (referral?.referral_type === 'green_channel' && action.includes('提交急诊上转申请')) return '提交绿色通道上转申请'
  if (action.includes('提交急诊上转申请')) return '提交急诊上转申请'
  if (action.includes('紧急修改转诊信息') || action === 'EMERGENCY_MODIFY') return '修改急诊目标信息'
  if (action.includes('拨打') || action === 'PHONE_CALL_CLICKED') return '拨打电话'
  if (action.includes('确认已联系患者') || action === 'EMERGENCY_MODIFY_PATIENT_CALLED' || action === 'EMERGENCY_MODIFY_OTHER_CONTACT') return '确认已电话通知患者'
  if (action.includes('补录急诊接诊信息')) return '补录急诊接诊信息'
  if (referral?.isRetroEntry && action.includes('完成补录并确认')) return '完成补录并确认接诊'
  if (action.includes('完成接诊确认')) return '完成接诊确认'
  if (action.includes('上传已签署知情同意书')) return '上传知情同意附件'
  if (action.includes('急诊知情同意待补传')) return '标记知情同意待补签'
  if (action.includes('终止/关闭转诊申请') || action.includes('COLLABORATIVE_CLOSE')) return '协商关闭'
  return null
}

function normalizeDownwardAction(action) {
  if (isHealthReportAction(action)) return action.includes('失败') ? '健康通数据上报失败' : '健康通数据上报成功'
  if (action.includes('发起下转申请')) return '提交下转申请'
  if (action.includes('院内审核通过')) return '院内审核通过'
  if (action.includes('院内审核拒绝')) return '院内审核拒绝'
  if (action.includes('指定接收医生')) return '指定接收医生'
  if (action.includes('分配下转接收医生')) return '分配下转接收医生'
  if (action.includes('确认接收下转')) return '确认接收下转患者'
  if (action.includes('拒绝下转申请') || action === 'DESIGNATED_DOCTOR_REJECT' || action === 'COORDINATOR_ASSIGNED_DOCTOR_REJECT') return '拒绝接收下转患者'
  if (action === 'COORDINATOR_REASSIGN' || action.includes('改派')) return '改派下转接收医生'
  if (action === 'COORDINATOR_INSTITUTION_RETURN') return '判定本机构无法承接'
  if (action.includes('完成患者接收确认')) return '完成患者到达确认'
  if (action.includes('自动创建随访任务')) return '创建随访任务'
  if (action.includes('终止/关闭转诊申请') || action.includes('COLLABORATIVE_CLOSE')) return '协商关闭'
  return null
}

function normalizeDetailAction(log, referral) {
  const rawAction = cleanText(log?.action)
  const action = ACTION_LABELS[rawAction] || rawAction
  const isDownward = referral?.type === 'downward'
  const isEmergency = !!referral?.is_emergency

  if (isDownward) return normalizeDownwardAction(rawAction) || normalizeDownwardAction(action)
  if (isEmergency) return normalizeEmergencyAction(rawAction, referral) || normalizeEmergencyAction(action, referral)
  return normalizeOrdinaryUpwardAction(rawAction) || normalizeOrdinaryUpwardAction(action)
}

function normalizeDetailNote(log, action) {
  const rawAction = cleanText(log?.action)
  const rawNote = cleanText(log?.note)
  if (!rawNote) return ''

  if (action === '补录急诊上转申请') {
    return `录入方式：事后补录；患者到院时间：${normalizeDateTimeText(parsePatientArrivedAt(rawNote)) || '—'}`
  }

  if (action === '完成补录并确认接诊') {
    return parseRetroCompletion(rawAction, rawNote)
  }

  if (includesAny(rawNote, ['CHG-', 'isRetroEntry', '字段记录', 'source=', 'numberType='])) return ''

  if (action === '拨打电话') return ''
  if (action === '确认已电话通知患者') return ''
  if (action === '上传知情同意附件') return ''
  if (action === '标记知情同意待补签') return ''
  if (action === '完成接诊确认') return ''

  return rawNote
}

export function buildKeyReferralOperationLogs(referral = {}) {
  const rawLogs = Array.isArray(referral?.logs) ? referral.logs : []

  return rawLogs
    .map(log => {
      const action = normalizeDetailAction(log, referral)
      if (!action) return null

      const rawAction = cleanText(log?.action)
      const rawNote = cleanText(log?.note)
      const isRetroSubmitRecord = action === '补录急诊上转申请'
      const isRetroCompleteRecord = action === '完成补录并确认接诊'
      if (!isRetroSubmitRecord && !isRetroCompleteRecord && includesAny(`${rawAction} ${rawNote}`, DETAIL_HIDDEN_PATTERNS)) {
        return null
      }

      return {
        ...log,
        action,
        note: normalizeDetailNote(log, action),
      }
    })
    .filter(Boolean)
}

export function formatReferralLogAction(action) {
  if (cleanText(action).includes('提交字段记录') && cleanText(action).includes('isRetroEntry')) return '补录急诊上转申请'
  return ACTION_LABELS[action] || action || '—'
}

export function formatReferralLogNote(note) {
  if (includesAny(cleanText(note), ['CHG-', 'isRetroEntry', '字段记录', '补录模式'])) return ''

  const source = pickLogField(note, 'source')
  const numberType = pickLogField(note, 'numberType')

  if (source || numberType) {
    return [
      source ? `来源：${SOURCE_LABELS[source] || source}` : '',
      numberType ? `电话类型：${NUMBER_TYPE_LABELS[numberType] || numberType}` : '',
    ].filter(Boolean).join('；')
  }

  return note || ''
}

export function formatPhoneCallLogAction(action) {
  return formatReferralLogAction(action)
}

export function formatPhoneCallLogNote(entry = {}) {
  return formatReferralLogNote(`source=${entry.source || 'unknown'}；numberType=${entry.numberType || 'unknown'}`)
}

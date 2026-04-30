const ACTION_LABELS = {
  EMERGENCY_MODIFY: '紧急修改转诊信息',
  PHONE_CALL_CLICKED: '拨打电话',
  EMERGENCY_MODIFY_PATIENT_CALLED: '紧急修改后已电话联系患者',
  EMERGENCY_MODIFY_OTHER_CONTACT: '紧急修改后通过其他方式联系患者',
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

export function formatReferralLogAction(action) {
  return ACTION_LABELS[action] || action || '—'
}

export function formatReferralLogNote(note) {
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

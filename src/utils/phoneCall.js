export const PHONE_CALL_ACTIONS = {
  PHONE_CALL_CLICKED: 'PHONE_CALL_CLICKED',
  EMERGENCY_MODIFY_PATIENT_CALLED: 'EMERGENCY_MODIFY_PATIENT_CALLED',
  EMERGENCY_MODIFY_OTHER_CONTACT: 'EMERGENCY_MODIFY_OTHER_CONTACT',
}

export function getPhoneCallMode({ innerWidth, userAgent } = {}) {
  const width = Number(innerWidth ?? globalThis.window?.innerWidth ?? 1024)
  const ua = String(userAgent ?? globalThis.navigator?.userAgent ?? '')
  const isMobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
  return width < 768 || isMobileUserAgent ? 'dial' : 'copy'
}

export function buildPhoneCallLogEntry({
  action = PHONE_CALL_ACTIONS.PHONE_CALL_CLICKED,
  source,
  numberType,
  actorId,
  actorRole,
  referralId,
  timestamp = new Date().toISOString(),
}) {
  return {
    action,
    source,
    numberType,
    actorId,
    actorRole,
    referralId,
    timestamp,
  }
}

export function maskPhoneNumber(value) {
  const phone = String(value || '').trim()
  if (!phone) return '—'
  if (phone.includes('*')) return phone
  return phone.replace(/^(\d{3})\d*(\d{4})$/, '$1****$2')
}

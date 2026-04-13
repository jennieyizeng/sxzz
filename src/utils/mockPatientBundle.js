import { UPWARD_STATUS } from '../data/mockData.js'

function normalize(value) {
  return String(value || '').trim()
}

export function findMockPatientBundle({ referrals = [], patientName = '', patientPhone = '', patientIdCard = '' }) {
  const name = normalize(patientName)
  const phone = normalize(patientPhone)
  const idCard = normalize(patientIdCard)

  if (!name) return null

  const candidates = referrals.filter(item =>
    item.type === 'upward' &&
    item.status === UPWARD_STATUS.COMPLETED &&
    normalize(item.patient?.name) === name
  )

  if (candidates.length === 0) return null

  const strictMatch = candidates.find(item => {
    const samePhone = phone ? normalize(item.patient?.phone) === phone : true
    const sameIdCard = idCard ? normalize(item.patient?.idCard) === idCard : true
    return samePhone && sameIdCard
  })

  if (strictMatch) return strictMatch
  if (phone || idCard) return null
  return candidates[0]
}

export async function pullMockPatientBundle(params, options = {}) {
  const { delayMs = 700 } = options
  const matched = findMockPatientBundle(params)

  await new Promise(resolve => setTimeout(resolve, delayMs))
  return matched
}

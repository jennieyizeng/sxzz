import { ROLES } from '../data/mockData.js'

const DEPARTMENT_ALIAS_GROUPS = [
  ['心内科', '心血管科'],
]

export function matchesDepartmentScope(referralDept, currentDept) {
  const target = String(referralDept || '').trim()
  const current = String(currentDept || '').trim()

  if (!target || !current) return false
  if (target === current) return true

  return DEPARTMENT_ALIAS_GROUPS.some(group => group.includes(target) && group.includes(current))
}

export function isAssignedToCurrentCountyDoctor(referral, currentUser) {
  return Boolean(
    referral?.assignedDoctorId === currentUser?.id ||
    referral?.assignedDoctorName === currentUser?.name ||
    referral?.assignedDoctor === currentUser?.name
  )
}

export function canViewCountyUpwardReferralDetail({
  currentRole,
  currentUser,
  referral,
}) {
  if (referral?.type !== 'upward' || referral?.is_emergency) return true

  if (currentRole === ROLES.COUNTY) {
    return isAssignedToCurrentCountyDoctor(referral, currentUser)
  }

  if (currentRole === ROLES.COUNTY2) {
    return Boolean(
      currentUser?.institution === referral?.toInstitution &&
      matchesDepartmentScope(referral?.toDept, currentUser?.dept)
    )
  }

  return true
}

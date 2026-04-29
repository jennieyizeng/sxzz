export function getDownwardAllocationMode(referral) {
  return referral?.allocationMode || (referral?.designatedDoctorId ? 'designated' : 'coordinator')
}

function matchesCurrentDoctor(referral, currentUser, idKey, nameKey) {
  if (!referral || !currentUser) return false
  return Boolean(
    (currentUser.id && referral[idKey] === currentUser.id)
    || (currentUser.name && referral[nameKey] === currentUser.name),
  )
}

export function isDownwardAllocatedToPrimaryDoctor(referral, currentUser) {
  return matchesCurrentDoctor(referral, currentUser, 'downwardAssignedDoctorId', 'downwardAssignedDoctorName')
    || matchesCurrentDoctor(referral, currentUser, 'designatedDoctorId', 'designatedDoctorName')
}

export function shouldShowDownwardReferralForPrimaryDoctor(referral, currentUser) {
  if (referral?.type !== 'downward') return false
  if (!currentUser?.institution || referral.toInstitution !== currentUser.institution) return false

  const mode = getDownwardAllocationMode(referral)
  if (mode === 'designated') {
    return matchesCurrentDoctor(referral, currentUser, 'designatedDoctorId', 'designatedDoctorName')
      || matchesCurrentDoctor(referral, currentUser, 'downwardAssignedDoctorId', 'downwardAssignedDoctorName')
  }

  return isDownwardAllocatedToPrimaryDoctor(referral, currentUser)
}

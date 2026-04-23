import { DOWNWARD_STATUS, ROLES } from '../data/mockData'

export function isInstitutionReturnedDownward(referral) {
  if (referral?.type !== 'downward') return false
  return referral?.status === DOWNWARD_STATUS.RETURNED
    || (referral?.status === DOWNWARD_STATUS.REJECTED && !!referral?.coordinatorRejectReason)
}

export function getDownwardDisplayStatus(referral, viewer = {}) {
  if (referral?.type !== 'downward') return referral?.status

  if (isInstitutionReturnedDownward(referral)) return DOWNWARD_STATUS.RETURNED

  if (referral?.status === DOWNWARD_STATUS.PENDING_INTERNAL_REVIEW) {
    return DOWNWARD_STATUS.PENDING
  }

  if (referral?.status === DOWNWARD_STATUS.REJECTED) {
    const isDesignatedDoctorViewer = viewer?.role === ROLES.PRIMARY
      && viewer?.userId
      && referral?.designatedDoctorId === viewer.userId

    return isDesignatedDoctorViewer ? DOWNWARD_STATUS.REJECTED : DOWNWARD_STATUS.RETURNED
  }

  return referral?.status
}

export function getReferralDisplayStatus(referral, viewer = {}) {
  if (referral?.type === 'downward') return getDownwardDisplayStatus(referral, viewer)
  return referral?.status
}

export function matchesDownwardDisplayStatus(referral, filter, viewer = {}) {
  if (!filter || filter === '全部' || filter === 'all') return true
  return getDownwardDisplayStatus(referral, viewer) === filter
}

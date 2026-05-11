export const COUNTY_RECEIVER_TYPES = ['county', '县级医院', '综合医院', '中医医院', '专科医院', '妇幼保健院']
export const PRIMARY_RECEIVER_TYPES = ['primary', '基层机构', '社区卫生服务中心', '乡镇卫生院']

export function isCountyReceiverInstitution(institution) {
  return COUNTY_RECEIVER_TYPES.includes(institution?.type)
}

export function isPrimaryReceiverInstitution(institution) {
  return PRIMARY_RECEIVER_TYPES.includes(institution?.type)
}

export function getInstitutionLevel(institution) {
  if (isCountyReceiverInstitution(institution)) return '县级'
  if (isPrimaryReceiverInstitution(institution)) return '基层'
  return institution?.level || '—'
}

export function getReceivingAbilityLabel(institution) {
  if (isCountyReceiverInstitution(institution)) return '接收上转能力'
  if (isPrimaryReceiverInstitution(institution)) return '接收转入能力'
  return '接收转诊能力'
}

export function getReceivingAbilityTip(institution) {
  if (isCountyReceiverInstitution(institution)) return '允许该机构接收基层机构发起的上转申请。'
  if (isPrimaryReceiverInstitution(institution)) return '允许该机构接收上级医院发起的转出申请。'
  return '允许该机构接收双向转诊申请。'
}

export function getReceivingAbilityKey(institution) {
  return isPrimaryReceiverInstitution(institution) ? 'canDown' : 'canUp'
}

export function isReceivingAbilityEnabled(institution) {
  if (!institution) return false
  if (institution.enabled === false) return false
  const key = getReceivingAbilityKey(institution)
  return institution[key] !== false
}

function userBelongsToInstitution(user, institution) {
  if (!user || !institution) return false
  return user.institutionId === institution.id ||
    user.auditInstitutionId === institution.id ||
    user.institution === institution.name
}

function hasInstitutionUser(institution, users, roles = []) {
  return users.some(user =>
    user.enabled &&
    userBelongsToInstitution(user, institution) &&
    (roles.length === 0 || roles.includes(user.role))
  )
}

function getDepartmentConfigs(institution, deptConfigs) {
  if (Array.isArray(deptConfigs)) return deptConfigs
  if (deptConfigs?.[institution?.id]) return deptConfigs[institution.id]
  return []
}

export function hasReceivingConfigComplete(institution, options = {}) {
  return getReceivingMissingItems(institution, options).length === 0
}

export function getReceivingMissingItems(institution, options = {}) {
  const { users = [], deptConfigs = [] } = options
  if (!institution) return ['未检测到机构信息']
  const missingItems = []

  if (isCountyReceiverInstitution(institution)) {
    const configs = getDepartmentConfigs(institution, deptConfigs)
    const departments = institution.departments || configs.map(item => item.dept).filter(Boolean)
    const hasDept = departments.length > 0
    const hasDeptPhone = Object.values(institution.departmentInfo || {}).some(info =>
      info?.departmentPhone || info?.nurseStationPhone
    ) || configs.some(item => item.departmentPhone || item.nurseStationPhone)
    const hasEmergencyPhone = Boolean(
      institution.emergencyDeptPhone ||
      institution.departmentInfo?.['急诊科']?.departmentPhone ||
      configs.find(item => item.dept === '急诊科')?.departmentPhone
    )
    const hasReceiverUser = Boolean(institution.referralContactUserId || institution.referralContactName) ||
      hasInstitutionUser(institution, users, ['县级医生', '县级科主任'])

    if (!hasReceiverUser) missingItems.push('未检测到具备上转受理权限的用户')
    if (!hasDept) missingItems.push('未配置接收科室')
    if (!hasDeptPhone) missingItems.push('未配置科室联系电话')
    if (!hasEmergencyPhone) missingItems.push('未配置急诊科联系电话')
    return missingItems
  }

  if (isPrimaryReceiverInstitution(institution)) {
    const hasCoordinator = Boolean(institution.referralCoordinatorUserId || institution.referralCoordinatorName) ||
      hasInstitutionUser(institution, users, ['基层负责人'])
    const hasPhone = Boolean(institution.referralCoordinatorPhone || institution.referralContactPhone || institution.referralConsultPhone || institution.phone)
    if (!hasCoordinator) missingItems.push('未检测到基层转诊负责人')
    if (!hasPhone) missingItems.push('未配置联系电话')
    return missingItems
  }

  return ['机构类别暂不支持接收转诊']
}

export function getReceivingServiceStatusDescription(status) {
  if (status === '未启用') return '该机构当前未开启接收转诊能力，发起端不可选择。'
  if (status === '配置不完整') return '该机构已开启接收转诊能力，但缺少必要用户、权限、科室或联系电话，发起端暂不可选择。'
  return '该机构已完成接收转诊配置，发起端可选择。'
}

export function getReceivingServiceStatus(institution, options = {}) {
  if (!isReceivingAbilityEnabled(institution)) return '未启用'
  return getReceivingMissingItems(institution, options).length === 0 ? '可用' : '配置不完整'
}

export function getReceivingServiceStatusDetail(institution, options = {}) {
  const status = getReceivingServiceStatus(institution, options)
  return {
    status,
    description: getReceivingServiceStatusDescription(status),
    missingItems: status === '配置不完整' ? getReceivingMissingItems(institution, options) : [],
    tagClass: status === '可用'
      ? 'bg-green-100 text-green-700'
      : status === '配置不完整'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-500',
  }
}

export function isReceivingServiceAvailable(institution, options = {}) {
  return getReceivingServiceStatus(institution, options) === '可用'
}

export const RECEIVING_INCOMPLETE_HINT = '该机构接收配置不完整，暂不可选择，请联系管理员完善配置。'

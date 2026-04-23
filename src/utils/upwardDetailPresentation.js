import { ROLES } from '../data/mockData.js'

export const DEFAULT_PATIENT_NOTICE_TEMPLATE = `1. 携带材料：身份证 + 医保卡 + 本转诊短信（截图可）+ 既往检查资料
2. 到院后前往[接诊科室]挂号窗口，出示预约码[预约码]，优先排队就诊
3. 到院后仍需正常挂号缴费，预约码用于优先排队，不免除挂号及诊疗费用
4. 持本转诊单就诊，按分级诊疗比例报销，高于自行就诊比例，请携带医保卡
5. 病区：[病区]
6. 床位号：[床位号]
7. 护士站电话：[护士站电话]`

export function getAdmissionArrangementVisibility({ currentRole, isUpward }) {
  if (!isUpward) return 'hidden'
  if ([ROLES.PRIMARY, ROLES.PRIMARY_HEAD, ROLES.ADMIN].includes(currentRole)) return 'full'
  if ([ROLES.COUNTY, ROLES.COUNTY2].includes(currentRole)) return 'minimal'
  return 'hidden'
}

export function getAppointmentCodeVisibility({ currentRole, isUpward, isEmergencyReferral }) {
  if (!isUpward || isEmergencyReferral) return 'hidden'
  if ([ROLES.PRIMARY, ROLES.PRIMARY_HEAD, ROLES.ADMIN].includes(currentRole)) return 'full'
  return 'hidden'
}

export function shouldShowPatientNotice() {
  return false
}

export function shouldShowUpwardLogsTab({ currentRole, isUpward }) {
  if (!isUpward) return true
  return currentRole === ROLES.ADMIN
}

export function buildMinimalArrangementStatusText(arrangement) {
  if (!arrangement) {
    return '⏳ 转诊中心正在安排接诊资源，请等待。'
  }

  return `📌 转诊中心已完成接诊安排，患者预计 ${arrangement.visitTime || '待定'} 到 ${arrangement.department || '目标科室'} 就诊。`
}

export function renderPatientNoticeTemplate(template = DEFAULT_PATIENT_NOTICE_TEMPLATE, context = {}) {
  const normalized = (template || DEFAULT_PATIENT_NOTICE_TEMPLATE)
    .replace(/\[接诊科室\]/g, context.department || '')
    .replace(/\[预约码\]/g, context.appointmentCode || '')

  const lines = normalized.split('\n')

  if (context.admissionType === 'inpatient') {
    return lines
      .map(line => line
        .replace(/\[病区\]/g, context.ward || '')
        .replace(/\[床位号\]/g, context.bedNumber || '')
        .replace(/\[护士站电话\]/g, context.nurseStationPhone || '')
      )
      .join('\n')
  }

  return lines
    .filter(line => !/\[病区\]|\[床位号\]|\[护士站电话\]/.test(line))
    .join('\n')
}

export const UPWARD_REFERRAL_PURPOSE_OPTIONS = [
  { code: 'lack_examination', label: '基层缺乏检查条件' },
  { code: 'lack_treatment', label: '基层缺乏治疗条件' },
  { code: 'specialist_needed', label: '需要专科进一步诊疗' },
  { code: 'surgery_intervention', label: '需要手术/介入治疗' },
  { code: 'condition_deteriorating', label: '病情加重，需上级救治' },
  { code: 'need_followup_rehab_plan', label: '术后复查/随访中发现异常' },
  { code: 'admission_evaluation', label: '建议住院评估' },
  { code: 'patient_request', label: '患者/家属主动要求' },
  { code: 'other', label: '其他' },
]

export const DOWNWARD_REASON_OPTIONS = [
  { code: 'acute_treatment_completed', label: '急性期治疗完成，病情稳定' },
  { code: 'post_surgery', label: '术后康复' },
  { code: 'chronic_management', label: '慢病长期管理' },
  { code: 'wound_care', label: '伤口/造瘘换药护理' },
  { code: 'rehabilitation_training', label: '康复训练（功能锻炼）' },
  { code: 'palliative_care', label: '姑息治疗/临终关怀' },
  { code: 'patient_preference', label: '患者/家属要求回基层就近就医' },
  { code: 'other', label: '其他' },
]

export const UPWARD_REJECT_REASON_OPTIONS = [
  { code: 'out_of_scope', label: '病种非本科室收治范围' },
  { code: 'insufficient_info', label: '转诊资料不充分，无法判断' },
  { code: 'not_meet_admission', label: '患者不符合收治指征' },
  { code: 'suggest_other_dept', label: '建议转至其他专科' },
  { code: 'suggest_higher_level', label: '建议转至上级医院（市级及以上）' },
  { code: 'resource_limited', label: '近期本科室资源受限' },
  { code: 'other', label: '其他' },
]

export const DOWNWARD_DOCTOR_REJECT_REASON_OPTIONS = [
  { code: 'doctor_unavailable', label: '本人近期不在岗（外出培训/休假）' },
  { code: 'not_my_patient', label: '患者非本人签约管理范围' },
  { code: 'beyond_capability', label: '该病种超出本人能力范围' },
  { code: 'workload_saturated', label: '本人当前患者已饱和' },
  { code: 'not_suitable_for_downward', label: '患者病情尚不适合下转到基层' },
  { code: 'suggest_other_doctor', label: '建议由本机构其他医生承接' },
  { code: 'other', label: '其他' },
]

export const DOWNWARD_INSTITUTION_RETURN_REASON_OPTIONS = [
  { code: 'no_capability', label: '本机构无相关诊疗能力' },
  { code: 'medication_shortage', label: '本机构药品配备不足' },
  { code: 'equipment_shortage', label: '本机构设备/治疗条件不足' },
  { code: 'bed_full', label: '本机构床位/观察位已满' },
  { code: 'all_doctors_rejected', label: '本机构全部医生已拒绝承接' },
  { code: 'out_of_service_area', label: '患者居住地不在本机构服务范围' },
  { code: 'other', label: '其他' },
]

export const UPWARD_CLOSE_REASON_OPTIONS = [
  { code: 'patient_giveup', label: '患者自行放弃就诊' },
  { code: 'patient_other_hospital', label: '患者另择其他医院就医' },
  { code: 'condition_changed', label: '患者病情变化，暂无需就诊' },
  { code: 'need_higher_level', label: '需转诊至上级机构' },
  { code: 'other', label: '其他' },
]

export const DOWNWARD_CLOSE_REASON_OPTIONS = [
  { code: 'patient_giveup', label: '患者自行放弃就诊' },
  { code: 'patient_other_hospital', label: '患者另择其他医院就医' },
  { code: 'condition_changed', label: '患者病情变化，暂无需下转' },
  { code: 'other', label: '其他' },
]

export const CANCEL_REASON_OPTIONS = [
  { code: 'form_error', label: '申请信息填写有误，需重新申请' },
  { code: 'condition_changed', label: '患者病情变化，暂不需要转诊' },
  { code: 'patient_withdraw', label: '患者/家属取消就医意向' },
  { code: 'other', label: '其他' },
]

export const INTERNAL_REJECT_REASON_OPTIONS = [
  { code: 'incomplete_info', label: '转诊资料不完整，请补充后重新提交' },
  { code: 'insufficient_indication', label: '转诊指征不充分' },
  { code: 'insufficient_diagnosis', label: '诊断依据不足' },
  { code: 'handle_locally', label: '建议先在本级进行处置' },
  { code: 'other', label: '其他' },
]

export function getReasonOptionLabel(options, code) {
  return options.find(option => option.code === code)?.label || ''
}

export function buildStructuredReasonText(options, code, text) {
  if (!code) return ''
  if (code === 'other') return String(text || '').trim()
  return getReasonOptionLabel(options, code) || String(text || '').trim()
}

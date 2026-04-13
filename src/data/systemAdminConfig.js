export const SYSTEM_ADMIN_OPERATOR = '林系统管理员'

export const SYSTEM_ROLE_OPTIONS = ['基层医生', '基层负责人', '县级医生', '县级科主任', '转诊管理员', '系统管理员', '院长']

export const SYSTEM_ROLE_TAG = {
  '基层医生': 'bg-blue-100 text-blue-700',
  '基层负责人': 'bg-cyan-100 text-cyan-700',
  '县级医生': 'bg-purple-100 text-purple-700',
  '县级科主任': 'bg-indigo-100 text-indigo-700',
  '转诊管理员': 'bg-orange-100 text-orange-700',
  '系统管理员': 'bg-slate-100 text-slate-700',
  '院长': 'bg-gray-100 text-gray-700',
}

export const SYSTEM_ROLE_ACCESS_SCOPE = {
  '基层医生': '负责本人转出申请、转入接收与随访执行。',
  '基层负责人': '负责本机构转出审核、下转分配与随访转派处理。',
  '县级医生': '负责本人待受理转入、进行中转入与转出发起。',
  '县级科主任': '负责本科室待处理转入、科室记录与承接能力查看。',
  '转诊管理员': '负责急诊补录、转诊协调、异常督办与转诊中心消息。',
  '系统管理员': '负责系统配置、角色管理、规则维护与日志审计。',
  '院长': '负责统计分析、绩效考核与经营概览查看。',
}

export const SYSTEM_USER_ACCOUNTS = [
  { id: 'U001', name: '王医生', empNo: 'D0001', institution: 'xx市拱星镇卫生院', role: '基层医生', enabled: true, updatedAt: '2026-03-01' },
  { id: 'U002', name: '李慧医生', empNo: 'D0002', institution: 'xx市汉旺镇卫生院', role: '基层医生', enabled: true, updatedAt: '2026-03-01' },
  { id: 'U003', name: '刘医生', empNo: 'D0003', institution: 'xx市人民医院', role: '县级医生', enabled: true, updatedAt: '2026-02-15' },
  { id: 'U004', name: '赵管理员', empNo: 'A0001', institution: 'xx市医共体管理层', role: '转诊管理员', enabled: true, updatedAt: '2026-01-10' },
  { id: 'U005', name: '钱院长', empNo: 'D0010', institution: 'xx市人民医院', role: '院长', enabled: true, updatedAt: '2026-01-10' },
  { id: 'U006', name: '孙医生', empNo: 'D0021', institution: 'xx市清平乡卫生院', role: '基层医生', enabled: false, updatedAt: '2026-02-20' },
  { id: 'U007', name: '周负责人', empNo: 'D0101', institution: 'xx市拱星镇卫生院', role: '基层负责人', enabled: true, updatedAt: '2026-03-06' },
  { id: 'U008', name: '陈主任', empNo: 'D0201', institution: 'xx市人民医院', role: '县级科主任', enabled: true, updatedAt: '2026-03-08' },
  { id: 'U009', name: SYSTEM_ADMIN_OPERATOR, empNo: 'S0001', institution: 'xx市医共体管理层', role: '系统管理员', enabled: true, updatedAt: '2026-03-10' },
]

export const SYSTEM_INSTITUTION_OPTIONS = [
  'xx市人民医院',
  'xx市拱星镇卫生院',
  'xx市汉旺镇卫生院',
  'xx市清平乡卫生院',
  'xx市医共体管理层',
]

export const SYSTEM_INSTITUTION_CONFIGS = [
  { id: 'I001', name: 'xx市人民医院', code: '5106820001', type: '县级医院', contact: '张主任', phone: '0838-6201234', canUp: true, canDown: true, enabled: true, emergencyDutyContactId: 'ed_duty_001', emergencyDutyContactName: '周主任', emergencyDeptPhone: '0838-6213200' },
  { id: 'I002', name: 'xx市拱星镇卫生院', code: '5106820012', type: '乡镇卫生院', contact: '王院长', phone: '0838-6201001', canUp: true, canDown: true, enabled: true },
  { id: 'I003', name: 'xx市汉旺镇卫生院', code: '5106820013', type: '乡镇卫生院', contact: '李主任', phone: '0838-6202001', canUp: true, canDown: false, enabled: true },
  { id: 'I004', name: 'xx市清平乡卫生院', code: '5106820014', type: '乡镇卫生院', contact: '陈主任', phone: '0838-6203001', canUp: true, canDown: true, enabled: true },
  { id: 'I005', name: 'xx市九龙镇卫生室', code: '5106820021', type: '村卫生室', contact: '赵医生', phone: '0838-6204001', canUp: false, canDown: false, enabled: false },
]

export const SYSTEM_DEPT_CONFIGS = {
  I001: [
    { dept: '内科', head: '王主任', partnerDoctor: '—', dailyQuota: 5, dailyReservedBeds: 0, ward: '', nurseStationPhone: '', rescueResources: '', updatedAt: '2026-03-25 08:00', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '外科', head: '李主任', partnerDoctor: '—', dailyQuota: 3, dailyReservedBeds: 0, ward: '', nurseStationPhone: '', rescueResources: '', updatedAt: '2026-03-25 08:00', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '心血管科', head: '陈主任', partnerDoctor: '陈医生', dailyQuota: 2, dailyReservedBeds: 3, ward: '心内科病区（6楼东）', nurseStationPhone: '0836-12345601', rescueResources: '胸痛中心绿色通道已开启，导管室24小时待命', updatedAt: '2026-03-25 09:30', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '神经内科', head: '张主任', partnerDoctor: '张主任', dailyQuota: 0, dailyReservedBeds: 0, ward: '', nurseStationPhone: '', rescueResources: '卒中绿色通道待命，CT室可优先开放', updatedAt: '2026-03-25 09:00', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '呼吸科', head: '刘主任', partnerDoctor: '刘医生', dailyQuota: 4, dailyReservedBeds: 0, ward: '', nurseStationPhone: '', rescueResources: '', updatedAt: '2026-03-25 08:00', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '内分泌科', head: '孙主任', partnerDoctor: '—', dailyQuota: 3, dailyReservedBeds: 0, ward: '', nurseStationPhone: '', rescueResources: '', updatedAt: '2026-03-25 08:00', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '骨科', head: '赵主任', partnerDoctor: '—', dailyQuota: 2, dailyReservedBeds: 0, ward: '', nurseStationPhone: '', rescueResources: '', updatedAt: '2026-03-25 08:30', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '急诊科', head: '周主任', partnerDoctor: '—', dailyQuota: 0, dailyReservedBeds: 2, ward: '急诊留观区', nurseStationPhone: '0838-6213201', rescueResources: '急诊抢救室、除颤仪、呼吸机均已待命', updatedAt: '2026-03-25 09:45', updatedBy: SYSTEM_ADMIN_OPERATOR },
  ],
}

export const SYSTEM_AUDIT_INSTITUTIONS = [
  { id: 'inst001', name: 'xx市人民医院', type: 'county' },
  { id: 'inst002', name: 'xx市拱星镇卫生院', type: 'primary' },
  { id: 'inst003', name: 'xx市汉旺镇卫生院', type: 'primary' },
]

export const SYSTEM_AUDIT_CANDIDATE_USERS = [
  { userId: 'county_doctor_1', name: '李志远', deptName: '内科', institutionId: 'inst001' },
  { userId: 'county_doctor_2', name: '王晓敏', deptName: '心内科', institutionId: 'inst001' },
  { userId: 'c_head_001', name: '周主任', deptName: '骨科', institutionId: 'inst001' },
  { userId: 'c_head_002', name: '吴主任', deptName: '神经内科', institutionId: 'inst001' },
  { userId: 'c_head_003', name: '郑主任', deptName: '呼吸科', institutionId: 'inst001' },
  { userId: 'c_head_004', name: '孙主任', deptName: '内分泌科', institutionId: 'inst001' },
  { userId: 'u001_head', name: '赵负责人', deptName: '全科', institutionId: 'inst002' },
  { userId: 'p_head_003', name: '刘院长', deptName: '全科', institutionId: 'inst003' },
]

export const SYSTEM_AUDIT_RULE_SEEDS = [
  {
    id: 'arc-001',
    institutionId: 'inst001',
    institutionName: 'xx市人民医院',
    deptName: '心血管科',
    upwardAuditEnabled: true,
    upwardAuditorUserId: 'county_doctor_2',
    upwardAuditorName: '王晓敏',
    downwardAuditEnabled: false,
    downwardAuditorUserId: null,
    downwardAuditorName: null,
    updatedAt: '2026-03-20 10:00',
    updatedBy: '赵管理员',
  },
  {
    id: 'arc-002',
    institutionId: 'inst001',
    institutionName: 'xx市人民医院',
    deptName: '骨科',
    upwardAuditEnabled: true,
    upwardAuditorUserId: 'c_head_001',
    upwardAuditorName: '周主任',
    downwardAuditEnabled: false,
    downwardAuditorUserId: null,
    downwardAuditorName: null,
    updatedAt: '2026-03-20 10:00',
    updatedBy: '赵管理员',
  },
  {
    id: 'arc-003',
    institutionId: 'inst001',
    institutionName: 'xx市人民医院',
    deptName: '神经内科',
    upwardAuditEnabled: false,
    upwardAuditorUserId: null,
    upwardAuditorName: null,
    downwardAuditEnabled: false,
    downwardAuditorUserId: null,
    downwardAuditorName: null,
    updatedAt: '2026-03-20 10:00',
    updatedBy: '赵管理员',
  },
  {
    id: 'arc-004',
    institutionId: 'inst001',
    institutionName: 'xx市人民医院',
    deptName: '内科',
    upwardAuditEnabled: true,
    upwardAuditorUserId: 'county_doctor_1',
    upwardAuditorName: '李志远',
    downwardAuditEnabled: false,
    downwardAuditorUserId: null,
    downwardAuditorName: null,
    updatedAt: '2026-03-20 10:00',
    updatedBy: '赵管理员',
  },
  {
    id: 'arc-005',
    institutionId: 'inst001',
    institutionName: 'xx市人民医院',
    deptName: '呼吸科',
    upwardAuditEnabled: true,
    upwardAuditorUserId: 'c_head_003',
    upwardAuditorName: '郑主任',
    downwardAuditEnabled: false,
    downwardAuditorUserId: null,
    downwardAuditorName: null,
    updatedAt: '2026-03-20 10:00',
    updatedBy: '赵管理员',
  },
  {
    id: 'arc-006',
    institutionId: 'inst001',
    institutionName: 'xx市人民医院',
    deptName: '内分泌科',
    upwardAuditEnabled: false,
    upwardAuditorUserId: null,
    upwardAuditorName: null,
    downwardAuditEnabled: false,
    downwardAuditorUserId: null,
    downwardAuditorName: null,
    updatedAt: '2026-03-20 10:00',
    updatedBy: '赵管理员',
  },
  {
    id: 'arc-007',
    institutionId: 'inst001',
    institutionName: 'xx市人民医院',
    deptName: '外科',
    upwardAuditEnabled: true,
    upwardAuditorUserId: 'c_head_001',
    upwardAuditorName: '周主任',
    downwardAuditEnabled: false,
    downwardAuditorUserId: null,
    downwardAuditorName: null,
    updatedAt: '2026-03-20 10:00',
    updatedBy: '赵管理员',
  },
  {
    id: 'arc-008',
    institutionId: 'inst002',
    institutionName: 'xx市拱星镇卫生院',
    deptName: '全科',
    upwardAuditEnabled: true,
    upwardAuditorUserId: 'u001_head',
    upwardAuditorName: '赵负责人',
    downwardAuditEnabled: false,
    downwardAuditorUserId: null,
    downwardAuditorName: null,
    updatedAt: '2026-03-20 10:00',
    updatedBy: '赵管理员',
  },
  {
    id: 'arc-009',
    institutionId: 'inst003',
    institutionName: 'xx市汉旺镇卫生院',
    deptName: '全科',
    upwardAuditEnabled: true,
    upwardAuditorUserId: 'p_head_003',
    upwardAuditorName: '刘院长',
    downwardAuditEnabled: false,
    downwardAuditorUserId: null,
    downwardAuditorName: null,
    updatedAt: '2026-03-20 10:00',
    updatedBy: '赵管理员',
  },
]

export const SYSTEM_OPERATION_LOG_TYPES = ['全部', '角色权限变更', '机构信息变更', '系统配置变更']
export const SYSTEM_OPERATION_LOG_DOMAINS = ['全部', '机构配置', '角色管理', '表单模板', '病种配置', '通知模板', '审核规则', '超时规则']

export let SYSTEM_OPERATION_LOGS = [
  {
    id: 'LOG001',
    time: '2026-03-19 10:32',
    operator: SYSTEM_ADMIN_OPERATOR,
    role: '系统管理员',
    domain: '机构配置',
    type: '机构信息变更',
    target: 'xx市人民医院',
    result: '成功',
    detail: { 机构: 'xx市人民医院', 变更字段: '急诊联系电话', 原值: '0838-6213000', 新值: '0838-6213200', 变更原因: '急诊值班号更新' },
  },
  {
    id: 'LOG002',
    time: '2026-03-18 16:45',
    operator: SYSTEM_ADMIN_OPERATOR,
    role: '系统管理员',
    domain: '角色管理',
    type: '角色权限变更',
    target: '用户：陈主任',
    result: '成功',
    detail: { 用户: '陈主任（工号:D0201）', 原角色: '县级医生', 新角色: '县级科主任', 变更原因: '科室负责人任命' },
  },
  {
    id: 'LOG003',
    time: '2026-03-18 09:20',
    operator: SYSTEM_ADMIN_OPERATOR,
    role: '系统管理员',
    domain: '通知模板',
    type: '系统配置变更',
    target: '转入待受理通知模板',
    result: '成功',
    detail: { 配置项: '通知模板', 模板名称: '转入待受理通知', 变更字段: '消息标题', 原值: '您有新的上转申请待受理', 新值: '您有新的转入申请待受理' },
  },
  {
    id: 'LOG004',
    time: '2026-03-17 14:10',
    operator: SYSTEM_ADMIN_OPERATOR,
    role: '系统管理员',
    domain: '审核规则',
    type: '系统配置变更',
    target: '神经内科审核规则',
    result: '成功',
    detail: { 配置项: '审核规则', 科室: '神经内科', 变更字段: '转入审核人', 原值: '张医生', 新值: '张主任', 变更原因: '审核责任调整' },
  },
  {
    id: 'LOG005',
    time: '2026-03-16 11:05',
    operator: SYSTEM_ADMIN_OPERATOR,
    role: '系统管理员',
    domain: '超时规则',
    type: '系统配置变更',
    target: '转入受理超时规则',
    result: '成功',
    detail: { 配置项: '超时规则', 环节: '县级医生受理', 原值: '24小时', 新值: '12小时', 变更原因: '缩短待受理超时阈值' },
  },
  {
    id: 'LOG006',
    time: '2026-03-15 08:30',
    operator: SYSTEM_ADMIN_OPERATOR,
    role: '系统管理员',
    domain: '表单模板',
    type: '系统配置变更',
    target: '转诊单模板',
    result: '失败',
    detail: { 配置项: '转诊单模板', 变更字段: '主诉字段必填', 原值: '否', 新值: '是', 失败原因: '模板版本冲突，已回滚' },
  },
]

function formatOperationLogTime(date = new Date()) {
  return date.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

function nextOperationLogId() {
  const numericIds = SYSTEM_OPERATION_LOGS
    .map(log => Number(String(log.id || '').replace(/\D/g, '')))
    .filter(num => Number.isFinite(num))
  const nextNum = (numericIds.length ? Math.max(...numericIds) : 0) + 1
  return `LOG${String(nextNum).padStart(3, '0')}`
}

export function getSystemOperationLogs() {
  return SYSTEM_OPERATION_LOGS
}

export function appendSystemOperationLog({
  domain,
  type,
  target,
  result = '成功',
  detail = {},
}) {
  const logEntry = {
    id: nextOperationLogId(),
    time: formatOperationLogTime(),
    operator: SYSTEM_ADMIN_OPERATOR,
    role: '系统管理员',
    domain,
    type,
    target,
    result,
    detail,
  }

  SYSTEM_OPERATION_LOGS = [logEntry, ...SYSTEM_OPERATION_LOGS]

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('system-operation-log-updated'))
  }

  return logEntry
}

export const SYSTEM_NOTIFY_VARIABLES = [
  { key: '{ref_no}', label: '转诊单号' },
  { key: '{patient_name}', label: '患者姓名' },
  { key: '{doctor_name}', label: '医生姓名' },
  { key: '{hospital_name}', label: '医院名称' },
  { key: '{created_time}', label: '创建时间' },
]

export const SYSTEM_NOTIFY_SYS_TEMPLATES = [
  {
    id: 'N001',
    event: '转入申请提交',
    title: '您有新的转入申请待受理',
    content: '您好，基层医生 {doctor_name} 于 {created_time} 提交了一份转入申请（转诊单号：{ref_no}），患者：{patient_name}，请及时登录系统处理。',
    receivers: ['县级医生'],
    enabled: true,
  },
  {
    id: 'N002',
    event: '院内审核通过',
    title: '您的转入申请已通过院内审核',
    content: '您好，您提交的转入申请（转诊单号：{ref_no}）已通过院内审核，患者 {patient_name} 可继续进入后续受理流程，请知悉。',
    receivers: ['基层医生'],
    enabled: true,
  },
  {
    id: 'N003',
    event: '院内审核退回',
    title: '您的转入申请已被退回修改',
    content: '您好，您提交的转入申请（转诊单号：{ref_no}）已被退回修改，退回原因请登录系统查看详情，如有疑问请联系审核医生。',
    receivers: ['基层医生'],
    enabled: true,
  },
  {
    id: 'N004',
    event: '转诊超时提醒',
    title: '转诊单 {ref_no} 已超时，请及时处理',
    content: '系统提醒：转诊单 {ref_no}（患者：{patient_name}）当前环节已超时，请尽快处理，避免影响患者就诊。如已处理请忽略本通知。',
    receivers: ['县级医生', '管理员'],
    enabled: true,
  },
  {
    id: 'N005',
    event: '转出申请提交',
    title: '您有新的转出康复方案待接收',
    content: '您好，县级医院已为患者 {patient_name}（转诊单号：{ref_no}）制定转出康复方案，请登录系统确认接收，继续开展后续康复管理。',
    receivers: ['基层医生'],
    enabled: true,
  },
  {
    id: 'N006',
    event: '协同处理记录',
    title: '转诊中心已记录协同处理转诊单 {ref_no}',
    content: '系统通知：转诊中心已记录转诊单 {ref_no}（患者：{patient_name}）的协同处理操作，详情请登录系统查看操作日志。',
    receivers: ['相关医生'],
    enabled: true,
  },
]

export const SYSTEM_NOTIFY_SMS_TEMPLATES = [
  {
    id: 'S001',
    event: '知情同意请求',
    smsSign: '【绵竹医联体】',
    content: '您有一份知情同意书待签署，转诊单号：{ref_no}，请及时登录"绵竹医联体"平台完成签署，如有疑问请联系您的接诊医生。',
    receivers: ['患者'],
    enabled: true,
  },
  {
    id: 'S002',
    event: '转诊成功通知',
    smsSign: '【绵竹医联体】',
    content: '您的转诊申请已成功，转诊单号：{ref_no}，请按约前往 {hospital_name} 就诊。如需查看详情，请联系您的基层医生或拨打医联体服务热线。',
    receivers: ['患者'],
    enabled: true,
  },
  {
    id: 'S003',
    event: '超时催办（患者）',
    smsSign: '【绵竹医联体】',
    content: '您的转诊单（单号：{ref_no}）尚有待处理事项，请尽快联系您的医生处理，如有疑问请拨打医联体服务热线。',
    receivers: ['患者'],
    enabled: false,
  },
]

export const SYSTEM_TIMEOUT_UP_RULES = [
  {
    id: 'u1',
    stage: '县级医生受理',
    stageNote: '待受理 → 转诊中',
    thresholdValue: 24,
    thresholdUnit: '小时',
    autoAction: '发送催办通知',
    notifyTargets: ['县级医生', '管理员'],
    enabled: true,
  },
  {
    id: 'u2',
    stage: '转诊中心完成接诊确认',
    stageNote: '转诊中 → 已完成',
    thresholdValue: 48,
    thresholdUnit: '小时',
    autoAction: '提醒转诊中心确认或协商关闭',
    notifyTargets: ['管理员'],
    enabled: true,
  },
  {
    id: 'u3',
    stage: '基层机构响应转出接收',
    stageNote: '待接收 → 转诊中',
    thresholdValue: 24,
    thresholdUnit: '小时',
    autoAction: '发送催办通知',
    notifyTargets: ['基层医生', '管理员'],
    enabled: true,
  },
  {
    id: 'u4',
    stage: '患者取消冷静期',
    stageNote: '',
    thresholdValue: 2,
    thresholdUnit: '小时',
    autoAction: '自动解除冻结',
    notifyTargets: ['患者（短信）'],
    enabled: false,
  },
]

export const SYSTEM_TIMEOUT_DOWN_RULES = [
  {
    id: 'd1',
    stage: '基层侧处理下转分配',
    stageNote: '待接收/待分配/待改派 → 转诊中',
    thresholdValue: 24,
    thresholdUnit: '小时',
    autoAction: '发送催办通知',
    notifyTargets: ['基层医生', '管理员'],
    enabled: true,
  },
  {
    id: 'd2',
    stage: '基层医生填报康复完成',
    stageNote: '转诊中 → 已完成',
    thresholdValue: 72,
    thresholdUnit: '小时',
    autoAction: '发送催办通知',
    notifyTargets: ['基层医生'],
    enabled: true,
  },
  {
    id: 'd3',
    stage: '知情同意逾期',
    stageNote: '',
    thresholdValue: 1,
    thresholdUnit: '小时',
    autoAction: '撤回知情同意请求',
    notifyTargets: ['患者（短信）'],
    enabled: false,
  },
]

export const SYSTEM_FORM_UP_FIELDS = [
  { id: 'f1', name: '患者姓名', section: '患者基础信息', type: '文本', visible: true, required: true, hint: '' },
  { id: 'f2', name: '身份证号', section: '患者基础信息', type: '文本', visible: true, required: false, hint: '用于身份核验，建议填写' },
  { id: 'f3', name: '联系电话', section: '患者基础信息', type: '文本', visible: true, required: true, hint: '' },
  { id: 'f4', name: '初步诊断（ICD-10）', section: '临床信息', type: 'ICD搜索', visible: true, required: true, hint: '' },
  { id: 'f5', name: '主诉与现病史', section: '临床信息', type: '多行文本', visible: true, required: true, hint: '建议不少于50字' },
  { id: 'f6', name: '转诊原因', section: '补充信息', type: '多行文本', visible: true, required: true, hint: '' },
  { id: 'f7', name: '病历附件', section: '补充信息', type: '文件上传', visible: true, required: false, hint: '支持 PDF、图片格式，单文件不超过 10MB' },
  { id: 'f8', name: '急诊标记', section: '接诊安排', type: '勾选框', visible: true, required: false, hint: '仅限真实急诊情况勾选' },
]

export const SYSTEM_FORM_DOWN_FIELDS = [
  { id: 'd1', name: '患者姓名', section: '患者基础信息', type: '文本', visible: true, required: true, hint: '' },
  { id: 'd2', name: '身份证号', section: '患者基础信息', type: '文本', visible: true, required: false, hint: '用于身份核验，建议填写' },
  { id: 'd3', name: '联系电话', section: '患者基础信息', type: '文本', visible: true, required: true, hint: '' },
  { id: 'd4', name: '出院诊断', section: '临床信息', type: 'ICD搜索', visible: true, required: true, hint: '' },
  { id: 'd5', name: '住院小结', section: '临床信息', type: '多行文本', visible: true, required: true, hint: '包含治疗经过、用药情况' },
  { id: 'd6', name: '康复方案', section: '补充信息', type: '多行文本', visible: true, required: true, hint: '' },
  { id: 'd7', name: '注意事项', section: '接诊安排', type: '多行文本', visible: false, required: false, hint: '建议填写用药禁忌、复查时间' },
  { id: 'd8', name: '下转病历附件', section: '补充信息', type: '文件上传', visible: true, required: false, hint: '支持 PDF、图片格式，单文件不超过 10MB' },
]

export const SYSTEM_FORM_PHRASES = [
  { id: 'p1', scene: '转入申请', content: '基层检查设备有限，需上级医院进一步检查明确诊断。' },
  { id: 'p2', scene: '转入申请', content: '患者病情危重，需上级医院急诊处理。' },
  { id: 'p3', scene: '退回说明', content: '资料不完整，请补充本次检查结果与转入原因后重新提交。' },
  { id: 'p4', scene: '随访建议', content: '患者急性期治疗已完成，病情稳定，建议基层继续康复管理并定期复查。' },
]

export const SYSTEM_DISEASE_CATEGORIES = ['循环系统', '神经系统', '内分泌系统', '呼吸系统', '其他']

export const SYSTEM_DISEASE_CONFIGS = [
  { id: 'D001', code: 'I10', name: '原发性高血压', category: '循环系统', priority: true, emergencyLinked: false, priorityAccept: true, enabled: true },
  { id: 'D002', code: 'I63.9', name: '脑梗死', category: '循环系统', priority: true, emergencyLinked: true, priorityAccept: true, enabled: true },
  { id: 'D003', code: 'E11.9', name: '2型糖尿病不伴并发症', category: '内分泌系统', priority: true, emergencyLinked: false, priorityAccept: false, enabled: true },
  { id: 'D004', code: 'J18.9', name: '肺炎', category: '呼吸系统', priority: false, emergencyLinked: false, priorityAccept: false, enabled: true },
  { id: 'D005', code: 'I50.9', name: '心力衰竭', category: '循环系统', priority: true, emergencyLinked: true, priorityAccept: true, enabled: true },
  { id: 'D006', code: 'G40.9', name: '癫痫', category: '神经系统', priority: false, emergencyLinked: true, priorityAccept: false, enabled: true },
  { id: 'D007', code: 'K92.1', name: '黑粪', category: '其他', priority: false, emergencyLinked: true, priorityAccept: true, enabled: true },
  { id: 'D008', code: 'I48.9', name: '心房颤动', category: '循环系统', priority: false, emergencyLinked: false, priorityAccept: false, enabled: true },
  { id: 'D009', code: 'N18.9', name: '慢性肾脏病', category: '其他', priority: false, emergencyLinked: false, priorityAccept: false, enabled: false },
  { id: 'D010', code: 'M54.5', name: '腰痛', category: '其他', priority: false, emergencyLinked: false, priorityAccept: false, enabled: false },
]

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

export const SYSTEM_SSO_USERS = [
  { userId: 'county_doc_001', name: '王主任', empNo: 'C0001', institutionId: 'I001', auditInstitutionId: 'inst001', institution: 'xx市人民医院', deptName: '内科', role: '县级科主任', enabled: true },
  { userId: 'county_doc_002', name: '李主任', empNo: 'C0002', institutionId: 'I001', auditInstitutionId: 'inst001', institution: 'xx市人民医院', deptName: '外科', role: '县级科主任', enabled: true },
  { userId: 'county_doc_003', name: '陈主任', empNo: 'C0003', institutionId: 'I001', auditInstitutionId: 'inst001', institution: 'xx市人民医院', deptName: '心血管科', role: '县级科主任', enabled: true },
  { userId: 'county_doc_004', name: '张主任', empNo: 'C0004', institutionId: 'I001', auditInstitutionId: 'inst001', institution: 'xx市人民医院', deptName: '神经内科', role: '县级科主任', enabled: true },
  { userId: 'county_doc_005', name: '刘主任', empNo: 'C0005', institutionId: 'I001', auditInstitutionId: 'inst001', institution: 'xx市人民医院', deptName: '呼吸科', role: '县级科主任', enabled: true },
  { userId: 'county_doc_006', name: '孙主任', empNo: 'C0006', institutionId: 'I001', auditInstitutionId: 'inst001', institution: 'xx市人民医院', deptName: '内分泌科', role: '县级科主任', enabled: true },
  { userId: 'county_doc_007', name: '赵主任', empNo: 'C0007', institutionId: 'I001', auditInstitutionId: 'inst001', institution: 'xx市人民医院', deptName: '骨科', role: '县级科主任', enabled: true },
  { userId: 'county_doc_008', name: '周主任', empNo: 'C0008', institutionId: 'I001', auditInstitutionId: 'inst001', institution: 'xx市人民医院', deptName: '急诊科', role: '县级科主任', enabled: true },
  { userId: 'county_doc_009', name: '王晓敏', empNo: 'C0009', institutionId: 'I001', auditInstitutionId: 'inst001', institution: 'xx市人民医院', deptName: '心内科', role: '县级科主任', enabled: true },
  { userId: 'county_doc_010', name: '李志远', empNo: 'C0010', institutionId: 'I001', auditInstitutionId: 'inst001', institution: 'xx市人民医院', deptName: '内科', role: '县级医生', enabled: true },
  { userId: 'primary_doc_001', name: '王医生', empNo: 'P0001', institutionId: 'I002', auditInstitutionId: 'inst002', institution: 'xx市拱星镇卫生院', deptName: '全科', role: '基层医生', enabled: true },
  { userId: 'primary_doc_002', name: '赵负责人', empNo: 'P0002', institutionId: 'I002', auditInstitutionId: 'inst002', institution: 'xx市拱星镇卫生院', deptName: '全科', role: '基层负责人', enabled: true },
  { userId: 'primary_doc_003', name: '李慧医生', empNo: 'P0003', institutionId: 'I003', auditInstitutionId: 'inst003', institution: 'xx市汉旺镇卫生院', deptName: '全科', role: '基层医生', enabled: true },
  { userId: 'primary_doc_004', name: '刘院长', empNo: 'P0004', institutionId: 'I003', auditInstitutionId: 'inst003', institution: 'xx市汉旺镇卫生院', deptName: '全科', role: '基层负责人', enabled: true },
  { userId: 'primary_doc_005', name: '孙医生', empNo: 'P0005', institutionId: 'I004', auditInstitutionId: 'inst004', institution: 'xx市清平乡卫生院', deptName: '全科', role: '基层医生', enabled: true },
]

export const SYSTEM_INSTITUTION_OPTIONS = [
  'xx市人民医院',
  'xx市拱星镇卫生院',
  'xx市汉旺镇卫生院',
  'xx市清平乡卫生院',
  'xx市医共体管理层',
]

export const SYSTEM_INSTITUTION_CONFIGS = [
  { id: 'I001', name: 'xx市人民医院', code: '5106820001', type: '综合医院', contact: '张主任', phone: '0838-6201234', address: 'xx市中心大道88号', referralConsultPhone: '0838-6213111', referralContactUserId: 'county_doc_004', referralContactName: '张主任', referralContactPhone: '0838-6213111', canUp: true, canDown: true, enabled: true, emergencyDutyContactId: 'ed_duty_001', emergencyDutyContactName: '周主任', emergencyDeptPhone: '0838-6213200', patientNoticeTemplate: '1. 携带身份证、医保卡、本转诊短信及既往检查资料\n2. 到院后前往[接诊科室]挂号窗口，出示预约码[预约码]优先排队\n3. 住院患者请至[病区]办理，床位[床位号]，护士站电话[护士站电话]\n4. 到院后仍需正常挂号缴费，医保按分级诊疗政策执行' },
  { id: 'I002', name: 'xx市拱星镇卫生院', code: '5106820012', type: '乡镇卫生院', contact: '王院长', phone: '0838-6201001', address: 'xx市拱星镇卫生路12号', referralConsultPhone: '0838-6201010', referralContactUserId: 'primary_doc_001', referralContactName: '王医生', referralContactPhone: '0838-6201010', referralCoordinatorUserId: 'primary_doc_002', referralCoordinatorName: '赵负责人', referralCoordinatorPhone: '0838-6201018', canUp: true, canDown: true, enabled: true },
  { id: 'I003', name: 'xx市汉旺镇卫生院', code: '5106820013', type: '乡镇卫生院', contact: '李主任', phone: '0838-6202001', address: 'xx市汉旺镇健康街8号', referralConsultPhone: '0838-6202010', referralContactUserId: 'primary_doc_003', referralContactName: '李慧医生', referralContactPhone: '0838-6202010', referralCoordinatorUserId: '', referralCoordinatorName: '', referralCoordinatorPhone: '0838-6202018', canUp: true, canDown: false, enabled: true },
  { id: 'I004', name: 'xx市清平乡卫生院', code: '5106820014', type: '乡镇卫生院', contact: '陈主任', phone: '0838-6203001', address: 'xx市清平乡清平路6号', referralConsultPhone: '0838-6203010', referralContactUserId: 'primary_doc_005', referralContactName: '孙医生', referralContactPhone: '0838-6203010', referralCoordinatorUserId: '', referralCoordinatorName: '', referralCoordinatorPhone: '0838-6203018', canUp: true, canDown: true, enabled: true },
  { id: 'I005', name: 'xx市九龙镇卫生室', code: '5106820021', type: '社区卫生服务中心', contact: '赵医生', phone: '0838-6204001', address: 'xx市九龙镇便民服务点旁', referralConsultPhone: '', referralContactUserId: '', referralContactName: '', referralContactPhone: '0838-6204001', canUp: false, canDown: false, enabled: false },
]

export const SYSTEM_DEPT_CONFIGS = {
  I001: [
    { dept: '内科', head: '王主任', headUserId: 'county_doc_001', partnerDoctor: '王医生', partnerDoctorUserId: 'primary_doc_001', counterpartInstitutionId: 'I002', dailyQuota: 5, outpatientLocation: '门诊2楼A区', departmentPhone: '0838-6213301', dailyReservedBeds: 0, ward: '', nurseStationPhone: '', rescueResources: '', updatedAt: '2026-03-25 08:00', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '外科', head: '李主任', headUserId: 'county_doc_002', partnerDoctor: '李慧医生', partnerDoctorUserId: 'primary_doc_003', counterpartInstitutionId: 'I003', dailyQuota: 3, outpatientLocation: '门诊3楼外科诊区', departmentPhone: '0838-6213306', dailyReservedBeds: 0, ward: '', nurseStationPhone: '', rescueResources: '', updatedAt: '2026-03-25 08:00', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '心血管科', head: '陈主任', headUserId: 'county_doc_003', partnerDoctor: '赵负责人', partnerDoctorUserId: 'primary_doc_002', counterpartInstitutionId: 'I002', dailyQuota: 2, outpatientLocation: '门诊2楼心血管诊区', departmentPhone: '0838-6213303', dailyReservedBeds: 3, ward: '心内科病区（6楼东）', nurseStationPhone: '0836-12345601', rescueResources: '胸痛中心绿色通道已开启，导管室24小时待命', updatedAt: '2026-03-25 09:30', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '神经内科', head: '张主任', headUserId: 'county_doc_004', partnerDoctor: '刘院长', partnerDoctorUserId: 'primary_doc_004', counterpartInstitutionId: 'I003', dailyQuota: 0, outpatientLocation: '门诊2楼神经内科诊区', departmentPhone: '0838-6213304', dailyReservedBeds: 0, ward: '', nurseStationPhone: '', rescueResources: '卒中绿色通道待命，CT室可优先开放', updatedAt: '2026-03-25 09:00', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '呼吸科', head: '刘主任', headUserId: 'county_doc_005', partnerDoctor: '孙医生', partnerDoctorUserId: 'primary_doc_005', counterpartInstitutionId: 'I004', dailyQuota: 4, outpatientLocation: '门诊2楼B区 / 呼吸科诊区', departmentPhone: '0838-6213302', dailyReservedBeds: 0, ward: '', nurseStationPhone: '', rescueResources: '', updatedAt: '2026-03-25 08:00', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '内分泌科', head: '孙主任', headUserId: 'county_doc_006', partnerDoctor: '—', partnerDoctorUserId: '', counterpartInstitutionId: 'I005', dailyQuota: 3, outpatientLocation: '门诊2楼内分泌诊区', departmentPhone: '0838-6213307', dailyReservedBeds: 0, ward: '', nurseStationPhone: '', rescueResources: '', updatedAt: '2026-03-25 08:00', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '骨科', head: '赵主任', headUserId: 'county_doc_007', partnerDoctor: '王医生', partnerDoctorUserId: 'primary_doc_001', counterpartInstitutionId: 'I002', dailyQuota: 2, outpatientLocation: '门诊3楼骨科诊区', departmentPhone: '0838-6213308', dailyReservedBeds: 0, ward: '', nurseStationPhone: '', rescueResources: '', updatedAt: '2026-03-25 08:30', updatedBy: SYSTEM_ADMIN_OPERATOR },
    { dept: '急诊科', head: '周主任', headUserId: 'county_doc_008', partnerDoctor: '—', partnerDoctorUserId: '', counterpartInstitutionId: 'I004', dailyQuota: 0, outpatientLocation: '急诊楼1楼', departmentPhone: '0838-6213200', dailyReservedBeds: 2, ward: '急诊留观区', nurseStationPhone: '0838-6213201', rescueResources: '急诊抢救室、除颤仪、呼吸机均已待命', updatedAt: '2026-03-25 09:45', updatedBy: SYSTEM_ADMIN_OPERATOR },
  ],
}

export const SYSTEM_AUDIT_INSTITUTIONS = [
  { id: 'inst001', name: 'xx市人民医院', type: 'county' },
  { id: 'inst002', name: 'xx市拱星镇卫生院', type: 'primary' },
  { id: 'inst003', name: 'xx市汉旺镇卫生院', type: 'primary' },
]

export const SYSTEM_AUDIT_CANDIDATE_USERS = [
  { userId: 'county_doc_001', name: '王主任', deptName: '内科', institutionId: 'inst001', role: '县级科主任' },
  { userId: 'county_doc_002', name: '李主任', deptName: '外科', institutionId: 'inst001', role: '县级科主任' },
  { userId: 'county_doc_003', name: '陈主任', deptName: '心血管科', institutionId: 'inst001', role: '县级科主任' },
  { userId: 'county_doc_009', name: '王晓敏', deptName: '心血管科', institutionId: 'inst001', role: '审核人' },
  { userId: 'county_doc_004', name: '张主任', deptName: '神经内科', institutionId: 'inst001', role: '县级科主任' },
  { userId: 'county_doc_005', name: '刘主任', deptName: '呼吸科', institutionId: 'inst001', role: '县级科主任' },
  { userId: 'county_doc_006', name: '孙主任', deptName: '内分泌科', institutionId: 'inst001', role: '县级科主任' },
  { userId: 'county_doc_007', name: '赵主任', deptName: '骨科', institutionId: 'inst001', role: '县级科主任' },
  { userId: 'primary_doc_002', name: '赵负责人', deptName: '全科', institutionId: 'inst002', role: '基层负责人' },
  { userId: 'primary_doc_004', name: '刘院长', deptName: '全科', institutionId: 'inst003', role: '基层负责人' },
]

export const SYSTEM_AUDIT_RULE_SEEDS = [
  {
    id: 'arc-001',
    institutionId: 'inst001',
    institutionName: 'xx市人民医院',
    deptName: '心血管科',
    upwardAuditEnabled: true,
    upwardAuditorUserId: 'county_doc_009',
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
    upwardAuditorUserId: 'county_doc_007',
    upwardAuditorName: '赵主任',
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
    upwardAuditorUserId: 'county_doc_001',
    upwardAuditorName: '王主任',
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
    upwardAuditorUserId: 'county_doc_005',
    upwardAuditorName: '刘主任',
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
    upwardAuditorUserId: 'county_doc_002',
    upwardAuditorName: '李主任',
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
    upwardAuditorUserId: 'primary_doc_002',
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
    upwardAuditorUserId: 'primary_doc_004',
    upwardAuditorName: '刘院长',
    downwardAuditEnabled: false,
    downwardAuditorUserId: null,
    downwardAuditorName: null,
    updatedAt: '2026-03-20 10:00',
    updatedBy: '赵管理员',
  },
]

export const SYSTEM_OPERATION_LOG_TYPES = ['全部', '新增', '编辑', '删除', '启用', '停用', '审核通过', '审核拒绝', '指派', '催办', '撤销', '关闭']
export const SYSTEM_OPERATION_LOG_DOMAINS = ['全部', '机构配置', '角色管理', '专病规则配置', '通知模板', '审核规则', '超时规则']

const LEGACY_OPERATION_TYPE_MAP = {
  角色权限变更: '编辑',
  机构信息变更: '编辑',
  系统配置变更: '编辑',
}

function resolveOperationLogType(type, detail = {}) {
  if (SYSTEM_OPERATION_LOG_TYPES.includes(type)) return type

  const operationText = String(detail.操作 || detail.操作类型 || detail.变更字段 || '')
  const newValueText = String(detail.新值 || '')
  if (operationText.includes('新增') || operationText.includes('添加') || operationText.includes('创建')) return '新增'
  if (operationText.includes('删除')) return '删除'
  if (operationText.includes('启用') || operationText.includes('开启')) return '启用'
  if (operationText.includes('停用') || operationText.includes('禁用') || operationText.includes('关闭')) return operationText.includes('关闭') ? '关闭' : '停用'
  if (operationText.includes('审核通过')) return '审核通过'
  if (operationText.includes('审核拒绝')) return '审核拒绝'
  if (operationText.includes('指派') || operationText.includes('分配')) return '指派'
  if (operationText.includes('催办')) return '催办'
  if (operationText.includes('撤销')) return '撤销'
  if (newValueText.includes('启用') || newValueText.includes('开启')) return '启用'
  if (newValueText.includes('停用') || newValueText.includes('禁用')) return '停用'
  if (newValueText.includes('关闭')) return '关闭'

  return LEGACY_OPERATION_TYPE_MAP[type] || '编辑'
}

function normalizeOperationLog(log) {
  return {
    ...log,
    type: resolveOperationLogType(log.type, log.detail),
  }
}

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
    target: '普通上转无人受理',
    result: '成功',
    detail: { 配置项: '关键业务时限', 环节: '普通上转无人受理', 原值: '2小时', 新值: '1小时', 变更原因: '缩短转诊中心接管前等待时长' },
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
  return SYSTEM_OPERATION_LOGS.map(normalizeOperationLog)
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
    type: resolveOperationLogType(type, detail),
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
  { key: '{转诊单号}', label: '转诊单号' },
  { key: '{患者姓名}', label: '患者姓名' },
  { key: '{发起医生}', label: '发起医生' },
  { key: '{接收/经办医生}', label: '接收/经办医生' },
  { key: '{接收医生}', label: '接收医生' },
  { key: '{机构名称}', label: '机构名称' },
  { key: '{科室}', label: '科室' },
  { key: '{就诊时间}', label: '就诊时间' },
  { key: '{拒绝/退回原因}', label: '拒绝/退回原因' },
  { key: '{关闭原因}', label: '关闭原因' },
  { key: '{超时时长}', label: '超时时长' },
  { key: '{创建时间}', label: '创建时间' },
]

export const SYSTEM_NOTIFY_SMS_VARIABLES = [
  { key: '【转诊单号】', label: '转诊单号' },
  { key: '【接诊医院】', label: '接诊医院' },
  { key: '【接收机构】', label: '接收机构' },
  { key: '【接诊科室】', label: '接诊科室' },
  { key: '【就诊时间】', label: '就诊时间' },
  { key: '【楼层区域】', label: '楼层区域' },
  { key: '【诊室床位】', label: '诊室床位' },
  { key: '【科室电话】', label: '科室电话' },
  { key: '【急诊科电话】', label: '急诊科电话' },
  { key: '【预约码】', label: '预约码' },
  { key: '【就诊须知】', label: '就诊须知' },
  { key: '【病区】', label: '病区' },
  { key: '【床位号】', label: '床位号' },
  { key: '【护士站电话】', label: '护士站电话' },
  { key: '【实际接诊科室】', label: '实际接诊科室' },
  { key: '【承接方式】', label: '承接方式' },
]

export const SYSTEM_NOTIFY_SYS_TEMPLATES = [
  {
    id: '001',
    event: '转入｜申请提交',
    title: '您有新的转入申请待受理',
    content: '来自{机构名称} 的{发起医生} 于 {创建时间} 提交了一份转入申请，转诊单号：{转诊单号}，患者：{患者姓名}，请及时查看并处理。',
    receivers: ['县级医生'],
    enabled: true,
  },
  {
    id: '002',
    event: '转出｜院内审核待处理',
    title: '有新的转出申请待院内审核',
    content: '{发起医生} 提交了一份转出申请，患者：{患者姓名}，转诊单号：{转诊单号}，请及时完成院内审核。',
    receivers: ['基层审核人'],
    enabled: true,
  },
  {
    id: '003',
    event: '转出｜院内审核通过',
    title: '您的转出申请已通过院内审核',
    content: '您提交的转出申请已通过院内审核，转诊单号：{转诊单号}，患者：{患者姓名}，系统已推送至目标机构待受理。',
    receivers: ['基层医生'],
    enabled: true,
  },
  {
    id: '004',
    event: '转出｜院内审核退回',
    title: '您的转出申请已退回修改',
    content: '您提交的转出申请已被退回，转诊单号：{转诊单号}，患者：{患者姓名}，退回原因：{拒绝/退回原因}。请修改后重新提交。',
    receivers: ['基层医生'],
    enabled: true,
  },
  {
    id: '005',
    event: '转入｜审核接收',
    title: '有新的转入申请待安排接诊',
    content: '{接收/经办医生} 已接收转入申请，转诊单号：{转诊单号}，患者：{患者姓名}，请及时填写接诊安排。',
    receivers: ['转诊中心管理员'],
    enabled: true,
  },
  {
    id: '006',
    event: '转出｜审核拒绝',
    title: '您的转出申请已被拒绝',
    content: '您提交的转出申请已被拒绝，转诊单号：{转诊单号}，患者：{患者姓名}，拒绝原因：{拒绝/退回原因}。您可换机构重新发起或修改后重提。',
    receivers: ['基层医生'],
    enabled: true,
  },
  {
    id: '007',
    event: '转出｜接诊安排完成',
    title: '转出接诊安排已完成',
    content: '转诊单 {转诊单号} 已完成转出接诊安排，患者：{患者姓名}，就诊科室：{科室}，就诊时间：{就诊时间}，请及时告知患者按预约信息前往就诊。',
    receivers: ['基层医生'],
    enabled: true,
  },
  {
    id: '008',
    event: '急诊｜实时提交',
    title: '有新的急诊转入申请',
    content: '基层医生 {发起医生} 提交急诊转入申请，患者：{患者姓名}，转诊单号：{转诊单号}，目标科室：{科室}，请立即关注。',
    receivers: ['转诊中心管理员', '急诊科值班'],
    enabled: true,
  },
  {
    id: '009',
    event: '转入｜申请提交',
    title: '您有新的转入申请待接收',
    content: '来自{机构名称}的{科室}{发起医生} 提交了一份转出申请，转诊单号：{转诊单号}，患者：{患者姓名}，请及时查看并处理。',
    receivers: ['基层医生'],
    enabled: true,
  },
  {
    id: '010',
    event: '转入｜待负责人分配',
    title: '有新的转入申请待分配',
    content: '县级医生 {发起医生} 提交转入申请至本机构，转诊单号：{转诊单号}，患者：{患者姓名}，请及时分配接收医生或本人接收。',
    receivers: ['基层转诊负责人'],
    enabled: true,
  },
  {
    id: '011',
    event: '转出｜医生确认接收',
    title: '转出申请已被接收',
    content: '您提交的转出申请已由 {接收/经办医生} 接收，转诊单号：{转诊单号}，患者：{患者姓名}。',
    receivers: ['县级医生'],
    enabled: true,
  },
  {
    id: '012',
    event: '转入｜待改派',
    title: '转入申请待改派',
    content: '转入申请{转诊单号} ,患者：{患者姓名}，被{接收医生}退回，退回原因：{拒绝/退回原因}。请及时改派其他医生或判定机构是否承接。',
    receivers: ['基层转诊负责人'],
    enabled: true,
  },
  {
    id: '013',
    event: '异常｜超时提醒',
    title: '转诊单超时未处理',
    content: '转诊单 {转诊单号} 已超过 {超时时长} 小时未处理，患者：{患者姓名}，请及时查看并处理。',
    receivers: ['转诊中心管理员', '相关负责人'],
    enabled: true,
  },
  {
    id: '014',
    event: '异常｜协商关闭',
    title: '转诊单已协商关闭',
    content: '转诊单 {转诊单号} 已协商关闭，患者：{患者姓名}，关闭原因：{关闭原因}。请知悉。',
    receivers: ['相关医生', '转诊中心'],
    enabled: true,
  },
]

export const SYSTEM_NOTIFY_SMS_TEMPLATES = [
  {
    id: '001',
    event: '急诊上转提交',
    name: '急诊上转到院提醒',
    smsSign: '【xx市医共体】',
    content: '您的急诊转诊已提交，请立即前往【接诊医院】急诊科就诊，急诊科电话：【急诊科电话】。转诊单号：【转诊单号】',
    receivers: ['患者/家属'],
    enabled: true,
    mockData: {
      接诊医院: 'xx市人民医院',
      急诊科电话: '0838-6213120',
      转诊单号: 'ZZ20260427001',
    },
  },
  {
    id: '002',
    event: '接诊安排完成-门诊',
    name: '上转接诊安排通知',
    smsSign: '【xx市医共体】',
    content: '您的转诊已安排：【接诊医院】【接诊科室】，【就诊时间】，【楼层区域】【诊室床位】，预约码【预约码】有效期至：4/29 05:26（7天内）。【就诊须知】①携带材料:身份证+转诊单+既往检查资料\n②到院后前往呼吸科挂号窗口,出示预约码ZP8831就行挂号\n③到院后仍需正常挂号缴费,预约码用于转诊凭证,不免除挂号及诊疗费用',
    previewContent: '您的转诊已安排：【接诊医院】【接诊科室】，【就诊时间】，【楼层区域】【诊室床位】，预约码【预约码】。【就诊须知】①携带材料:身份证+转诊单+既往检查资料\n②到院后前往呼吸科挂号窗口,出示预约码ZP8831就行挂号\n③到院后仍需正常挂号缴费,预约码用于转诊凭证,不免除挂号及诊疗费用',
    receivers: ['患者/家属'],
    enabled: true,
    mockData: {
      接诊医院: 'xx市人民医院',
      接诊科室: '呼吸科',
      就诊时间: '2026/04/27 22:55',
      楼层区域: '2楼B区',
      诊室床位: '2号诊室',
      预约码: 'ZP8831',
    },
  },
  {
    id: '003',
    event: '接诊安排完成-住院',
    name: '上转住院接诊安排通知',
    smsSign: '【xx市医共体】',
    content: '您的住院转诊已安排：【接诊医院】【接诊科室】，【就诊时间】，病区：【病区】，床位：【床位号】，护士站电话：【护士站电话】。预约码【预约码】有效期至：4/29 10:26（7天内有效）',
    previewContent: '您的转诊已安排：【接诊医院】【接诊科室】，【就诊时间】，病区：【病区】，床位：【床位号】，护士站电话：【护士站电话】。预约码【预约码】，实际床位号以现场安排为准。',
    receivers: ['患者/家属'],
    enabled: true,
    mockData: {
      接诊医院: 'xx市人民医院',
      接诊科室: '内科',
      就诊时间: '2026/04/28 09:00',
      病区: '内科病区B',
      床位号: '312床',
      护士站电话: '0838-6213305',
      预约码: 'ZY5628',
    },
  },
  {
    id: '004',
    event: '急诊接诊确认',
    name: '急诊接诊确认通知',
    smsSign: '【xx市医共体】',
    content: '您的急诊转诊已完成接诊确认，实际接诊科室：【实际接诊科室】，承接方式：【承接方式】。如有疑问请联系【科室电话】',
    receivers: ['患者/家属'],
    enabled: false,
    mockData: {
      实际接诊科室: '急诊科',
      承接方式: '留观',
      科室电话: '0838-6213120',
    },
  },
  {
    id: '005',
    event: '下转确认接收',
    name: '下转接收通知',
    smsSign: '【xx市医共体】',
    content: '您的下转申请已由【接收机构】接收，后续请按医生指导前往基层机构就诊或等待随访。转诊单号：【转诊单号】',
    previewContent: '您的转诊申请已由【接收机构】接收，后续请按医生指导前往基层机构就诊或等待随访。转诊单号：【转诊单号】',
    receivers: ['患者/家属'],
    enabled: true,
    mockData: {
      接收机构: 'xx市拱星镇卫生院',
      转诊单号: 'ZZ20260427005',
    },
  },
]

export const SYSTEM_TIMEOUT_RULES = [
  {
    id: 'timeout-upward-unclaimed',
    group: 'upward',
    businessStep: '县级医生未受理',
    trigger: '待受理 → 转诊中心接管',
    thresholdLabel: '2小时',
    timeoutAction: '转诊中心接管并指派医生',
    notifyTargets: '转诊中心/管理员',
    enabled: true,
    threshold: { minutes: 120, minMinutes: 60, maxMinutes: 240 },
    lastModified: '2026-04-23 10:00',
    lastModifiedBy: SYSTEM_ADMIN_OPERATOR,
  },
  {
    id: 'timeout-upward-arrangement',
    group: 'upward',
    businessStep: '接诊安排未完成',
    trigger: '转诊中-待安排 → 待完成安排',
    thresholdLabel: '2小时',
    timeoutAction: '催办转诊中心，必要时告警医务负责人',
    notifyTargets: '转诊中心/管理员',
    enabled: true,
    threshold: { minutes: 120, minMinutes: 60, maxMinutes: 240 },
    lastModified: '2026-04-23 10:05',
    lastModifiedBy: SYSTEM_ADMIN_OPERATOR,
  },
  {
    id: 'timeout-upward-visit-confirm',
    group: 'upward',
    businessStep: '就诊时间后未完成接诊确认',
    trigger: '转诊中-已安排 → 已完成/协商关闭',
    thresholdLabel: '48小时',
    timeoutAction: '提醒转诊中心确认或协商关闭',
    notifyTargets: '转诊中心/管理员',
    enabled: true,
    threshold: { minutes: 2880, minMinutes: 1440, maxMinutes: 4320 },
    lastModified: '2026-04-23 10:06',
    lastModifiedBy: SYSTEM_ADMIN_OPERATOR,
  },
  {
    id: 'timeout-upward-emergency-window',
    group: 'upward',
    businessStep: '急诊紧急修改窗口',
    trigger: '急诊转诊提交后',
    thresholdLabel: '15分钟',
    timeoutAction: '关闭紧急修改入口',
    notifyTargets: '无',
    enabled: true,
    threshold: { minutes: 15, minMinutes: 5, maxMinutes: 30 },
    lastModified: '2026-04-23 10:07',
    lastModifiedBy: SYSTEM_ADMIN_OPERATOR,
  },
  {
    id: 'timeout-upward-emergency-supplement',
    group: 'upward',
    businessStep: '急诊接诊补录未完成',
    trigger: '急诊转诊中，患者到院后未补录接诊信息',
    thresholdLabel: '24小时',
    timeoutAction: '催办转诊中心补录接诊信息',
    notifyTargets: '转诊中心/管理员',
    enabled: true,
    threshold: { minutes: 1440, minMinutes: 720, maxMinutes: 2880 },
    lastModified: '2026-04-23 10:08',
    lastModifiedBy: SYSTEM_ADMIN_OPERATOR,
  },
  {
    id: 'timeout-downward-doctor',
    group: 'downward',
    businessStep: '基层指定医生未响应',
    trigger: '待接收 → 待负责人改派',
    thresholdLabel: '48小时',
    timeoutAction: '转基层转诊负责人改派',
    notifyTargets: '基层转诊负责人',
    enabled: true,
    threshold: { minutes: 2880, minMinutes: 1440, maxMinutes: 4320 },
    lastModified: '2026-04-23 10:09',
    lastModifiedBy: SYSTEM_ADMIN_OPERATOR,
  },
  {
    id: 'timeout-downward-allocation',
    group: 'downward',
    businessStep: '基层负责人分配/改派未处理',
    trigger: '待分配/待改派 → 待接收',
    thresholdLabel: '24/48/72小时',
    timeoutAction: '逐级提醒基层负责人、转诊中心、县级发起医生',
    notifyTargets: '基层转诊负责人/转诊中心/县级医生',
    enabled: true,
    readonlyThreshold: true,
    stagedThresholds: [
      { label: '一级提醒', minutes: 1440 },
      { label: '二级提醒', minutes: 2880 },
      { label: '三级提醒', minutes: 4320 },
    ],
    lastModified: '2026-04-23 10:10',
    lastModifiedBy: SYSTEM_ADMIN_OPERATOR,
  },
  {
    id: 'timeout-downward-arrival-confirm',
    group: 'downward',
    businessStep: '基层经办医生未完成到达确认',
    trigger: '转诊中 → 已完成/协商关闭',
    thresholdLabel: '72小时',
    timeoutAction: '催办基层经办医生完成到达确认',
    notifyTargets: '基层经办医生',
    enabled: true,
    threshold: { minutes: 4320, minMinutes: 1440, maxMinutes: 4320 },
    lastModified: '2026-04-23 10:11',
    lastModifiedBy: SYSTEM_ADMIN_OPERATOR,
  },
  {
    id: 'timeout-cross-auto-close',
    group: 'other',
    businessStep: '转诊中超时自动关闭',
    trigger: '转诊中状态下无到院/到达记录',
    thresholdLabel: '7天',
    timeoutAction: '系统自动关闭转诊单',
    notifyTargets: '基层医生/县级医生/转诊中心，按转诊方向自动匹配',
    enabled: true,
    threshold: { minutes: 10080, minMinutes: 4320, maxMinutes: 20160 },
    lastModified: '2026-04-23 10:12',
    lastModifiedBy: SYSTEM_ADMIN_OPERATOR,
  },
  {
    id: 'timeout-emergency-consent-upload',
    group: 'other',
    businessStep: '急诊知情同意书待上传',
    trigger: '急诊转诊已到院，知情同意书附件未上传',
    thresholdLabel: '24小时',
    timeoutAction: '提醒转诊中心补传知情同意书附件',
    notifyTargets: '转诊中心/管理员',
    enabled: true,
    threshold: { minutes: 1440, minMinutes: 1440, maxMinutes: 1440 },
    lastModified: '2026-04-23 10:13',
    lastModifiedBy: SYSTEM_ADMIN_OPERATOR,
  },
]

export const SYSTEM_TIMEOUT_BUILT_IN_RULES = []

export const SYSTEM_DISEASE_CATEGORIES = ['循环系统', '神经系统', '呼吸系统', '内分泌系统', '消化系统', '其他']

export const SYSTEM_DISEASE_GREEN_CENTER_OPTIONS = ['胸痛中心', '卒中中心', '创伤中心', '危重孕产妇救治中心', '危重儿童和新生儿救治中心']

export const SYSTEM_DISEASE_MANAGEMENT_TAG_OPTIONS = ['慢病管理', '分级诊疗重点病种', '临床路径病种']

export const SYSTEM_TERMINOLOGY_ICD10_MASTER = [
  { id: 'ICD001', code: 'I21', name: '急性心肌梗死', category: '循环系统', sourceSystem: '医共体术语信息管理系统' },
  { id: 'ICD002', code: 'I63.9', name: '脑梗死', category: '神经系统', sourceSystem: '医共体术语信息管理系统' },
  { id: 'ICD003', code: 'I50.9', name: '心力衰竭', category: '循环系统', sourceSystem: '医共体术语信息管理系统' },
  { id: 'ICD004', code: 'I10', name: '原发性高血压', category: '循环系统', sourceSystem: '医共体术语信息管理系统' },
  { id: 'ICD005', code: 'J18.9', name: '肺炎', category: '呼吸系统', sourceSystem: '医共体术语信息管理系统' },
  { id: 'ICD006', code: 'E11.9', name: '2型糖尿病不伴并发症', category: '内分泌系统', sourceSystem: '医共体术语信息管理系统' },
  { id: 'ICD007', code: 'I48.9', name: '心房颤动', category: '循环系统', sourceSystem: '医共体术语信息管理系统' },
  { id: 'ICD008', code: 'K92.1', name: '黑粪', category: '消化系统', sourceSystem: '医共体术语信息管理系统' },
]

export const SYSTEM_DISEASE_CONFIGS = [
  {
    id: 'D001',
    terminologyId: 'ICD001',
    code: 'I21',
    name: '急性心肌梗死',
    category: '循环系统',
    greenChannel: true,
    greenCenter: '胸痛中心',
    managementTags: ['临床路径病种'],
    enabled: true,
  },
  {
    id: 'D002',
    terminologyId: 'ICD002',
    code: 'I63.9',
    name: '脑梗死',
    category: '神经系统',
    greenChannel: true,
    greenCenter: '卒中中心',
    managementTags: ['临床路径病种'],
    enabled: true,
  },
  {
    id: 'D003',
    terminologyId: 'ICD003',
    code: 'I50.9',
    name: '心力衰竭',
    category: '循环系统',
    greenChannel: false,
    greenCenter: '',
    managementTags: ['慢病管理'],
    enabled: true,
  },
  {
    id: 'D004',
    terminologyId: 'ICD005',
    code: 'J18.9',
    name: '肺炎',
    category: '呼吸系统',
    greenChannel: false,
    greenCenter: '',
    managementTags: ['分级诊疗重点病种'],
    enabled: true,
  },
  {
    id: 'D005',
    terminologyId: 'ICD006',
    code: 'E11.9',
    name: '2型糖尿病不伴并发症',
    category: '内分泌系统',
    greenChannel: false,
    greenCenter: '',
    managementTags: ['慢病管理'],
    enabled: false,
  },
]

// ============================================================
// CHG-34 · 审核规则配置 Mock 数据
// 每条记录 = 一个科室的审核规则配置
// institutionId 与 mockData.js 中 INSTITUTIONS[].id 对应
// ============================================================

// 供审核人下拉选择的用户列表（按机构）
export const AUDIT_CANDIDATE_USERS = [
  // inst001 绵竹市人民医院
  { userId: 'county_doctor_1', name: '李志远', deptName: '内科',   institutionId: 'inst001' },
  { userId: 'county_doctor_2', name: '王晓敏', deptName: '心内科', institutionId: 'inst001' },
  { userId: 'c_head_001',      name: '周主任', deptName: '骨科',   institutionId: 'inst001' },
  { userId: 'c_head_002',      name: '吴主任', deptName: '神经内科', institutionId: 'inst001' },
  { userId: 'c_head_003',      name: '郑主任', deptName: '呼吸科', institutionId: 'inst001' },
  { userId: 'c_head_004',      name: '孙主任', deptName: '内分泌科', institutionId: 'inst001' },
  // inst002 绵竹市拱星镇卫生院
  { userId: 'u001_head',       name: '赵科主任', deptName: '全科', institutionId: 'inst002' },
  // inst003 绵竹市汉旺镇卫生院
  { userId: 'p_head_003',      name: '刘院长', deptName: '全科',   institutionId: 'inst003' },
]

// 审核规则配置列表
// upwardAuditEnabled：上转内审开关（默认 true）
// downwardAuditEnabled：下转内审开关（默认 false，避免压床）
let _nextId = 10

export let AUDIT_RULE_CONFIGS = [
  // ── inst001 绵竹市人民医院 ──
  {
    id: 'arc-001',
    institutionId: 'inst001',
    institutionName: '绵竹市人民医院',
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
    institutionName: '绵竹市人民医院',
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
    institutionName: '绵竹市人民医院',
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
    institutionName: '绵竹市人民医院',
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
    institutionName: '绵竹市人民医院',
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
    institutionName: '绵竹市人民医院',
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
    institutionName: '绵竹市人民医院',
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
  // ── inst002 绵竹市拱星镇卫生院 ──
  {
    id: 'arc-008',
    institutionId: 'inst002',
    institutionName: '绵竹市拱星镇卫生院',
    deptName: '全科',
    upwardAuditEnabled: true,
    upwardAuditorUserId: 'u001_head',
    upwardAuditorName: '赵科主任',
    downwardAuditEnabled: false,
    downwardAuditorUserId: null,
    downwardAuditorName: null,
    updatedAt: '2026-03-20 10:00',
    updatedBy: '赵管理员',
  },
  // ── inst003 绵竹市汉旺镇卫生院 ──
  {
    id: 'arc-009',
    institutionId: 'inst003',
    institutionName: '绵竹市汉旺镇卫生院',
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

// 根据科室名 + 转诊方向查找审核配置
// institutionName 可选，传入时精确匹配所属机构，避免多家机构同科室名混淆
// 未配置的科室：上转默认开启（无审核人）、下转默认关闭
export function getAuditConfig(deptName, direction, institutionName = null) {
  const config = institutionName
    ? AUDIT_RULE_CONFIGS.find(c => c.institutionName === institutionName && c.deptName === deptName)
    : AUDIT_RULE_CONFIGS.find(c => c.deptName === deptName)
  if (!config) return { enabled: direction === 'upward', auditorUserId: null }
  return direction === 'upward'
    ? { enabled: config.upwardAuditEnabled, auditorUserId: config.upwardAuditorUserId }
    : { enabled: config.downwardAuditEnabled, auditorUserId: config.downwardAuditorUserId }
}

// 更新配置（供页面调用）
export function updateAuditRuleConfig(id, patch, updatedBy = '管理员') {
  AUDIT_RULE_CONFIGS = AUDIT_RULE_CONFIGS.map(c =>
    c.id === id ? { ...c, ...patch, updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'), updatedBy } : c
  )
}

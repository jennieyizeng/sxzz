import { SYSTEM_AUDIT_CANDIDATE_USERS, SYSTEM_AUDIT_RULE_SEEDS } from './systemAdminConfig'

// ============================================================
// CHG-34 · 审核规则配置数据
// 共享 seed 来自 systemAdminConfig.js；本文件仅承载运行时可变配置
// ============================================================

export const AUDIT_CANDIDATE_USERS = SYSTEM_AUDIT_CANDIDATE_USERS

// 审核规则配置列表
// upwardAuditEnabled：上转内审开关（默认 true）
// downwardAuditEnabled：下转内审开关（默认 false，避免压床）
let _nextId = 10

export let AUDIT_RULE_CONFIGS = SYSTEM_AUDIT_RULE_SEEDS.map(config => ({ ...config }))

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

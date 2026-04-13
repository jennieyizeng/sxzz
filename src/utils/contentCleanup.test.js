import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('removes all inpatient stay reference copy from prototype pages and helpers', () => {
  const files = [
    path.join(rootDir, 'pages/shared/ReferralDetail.jsx'),
    path.join(rootDir, 'pages/county/CreateDownward.jsx'),
    path.join(rootDir, 'utils/clinicalPackage.js'),
  ]

  const bannedPhrases = [
    ['住院', '天数', '参考'].join(''),
    ['住院', '天数'].join(''),
  ]

  files.forEach(file => {
    const source = fs.readFileSync(file, 'utf8')
    bannedPhrases.forEach(phrase => {
      assert.equal(
        source.includes(phrase),
        false,
        `${path.basename(file)} still contains "${phrase}"`,
      )
    })
  })
})

test('uses the corrected internal review copy for primary head review banner', () => {
  const source = fs.readFileSync(path.join(rootDir, 'pages/shared/ReferralDetail.jsx'), 'utf8')

  assert.equal(source.includes('（普通转出须经院内审核通过可至县级医院）'), true)
  assert.equal(source.includes('请审核此转出申请的合理性与规范性，通过后将推送至县级医院'), true)
  assert.equal(source.includes('（普通上转须经院内审核通过后方可推送县级医院）'), false)
  assert.equal(source.includes('请审核此上转申请的必要性与规范性，通过后将自动推送至县级医生'), false)
})

test('separates primary head workbench and internal review routes by explicit mode', () => {
  const appSource = fs.readFileSync(path.join(rootDir, 'App.jsx'), 'utf8')

  assert.equal(appSource.includes('<PrimaryDashboard mode="workbench" />'), true)
  assert.equal(appSource.includes('<PrimaryDashboard mode="internalReview" />'), true)
})

test('keeps primary workbench and internal review content separated in dashboard page', () => {
  const dashboardSource = fs.readFileSync(path.join(rootDir, 'pages/primary/Dashboard.jsx'), 'utf8')

  assert.equal(dashboardSource.includes("mode = 'workbench'"), true)
  assert.equal(dashboardSource.includes("const isInternalReviewPage = mode === 'internalReview'"), true)
  assert.equal(dashboardSource.includes('待院内审核（仅展示待审核的前几条）'), false)
  assert.equal(dashboardSource.includes('全部院内审核记录'), true)
  assert.equal(dashboardSource.includes('查看全部'), true)
})

test('removes create referral entry points for primary head while keeping followup management nav', () => {
  const layoutSource = fs.readFileSync(path.join(rootDir, 'components/Layout.jsx'), 'utf8')
  const dashboardSource = fs.readFileSync(path.join(rootDir, 'pages/primary/Dashboard.jsx'), 'utf8')
  const referralListSource = fs.readFileSync(path.join(rootDir, 'pages/primary/ReferralList.jsx'), 'utf8')

  assert.equal(layoutSource.includes("{ path: '/primary/create-referral', label: '发起转出' }"), true)
  assert.equal(layoutSource.includes("{ path: '/primary/followup', label: '随访任务管理', icon: '📅' }"), true)
  assert.equal(dashboardSource.includes("!isPrimaryHead && ("), true)
  assert.equal(dashboardSource.includes("navigate('/primary/create-referral')"), true)
  assert.equal(referralListSource.includes("!isPrimaryHead && ("), true)
  assert.equal(referralListSource.includes("navigate('/primary/create-referral')"), true)
})

test('shows institution-scoped referral records for primary head and removes personal subtitle copy', () => {
  const referralListSource = fs.readFileSync(path.join(rootDir, 'pages/primary/ReferralList.jsx'), 'utf8')

  assert.equal(referralListSource.includes('const isPrimaryHead = currentUser.role === ROLES.PRIMARY_HEAD'), true)
  assert.equal(referralListSource.includes("r.fromInstitution === currentUser.institution"), true)
  assert.equal(referralListSource.includes('我发起的全部上转申请'), false)
})

test('adds mock followup tasks for primary head so action buttons remain visible', () => {
  const followupListSource = fs.readFileSync(path.join(rootDir, 'pages/primary/FollowupList.jsx'), 'utf8')

  assert.equal(followupListSource.includes('PRIMARY_HEAD_MOCK_FOLLOWUPS'), true)
  assert.equal(followupListSource.includes('查看随访'), true)
  assert.equal(followupListSource.includes('查看转诊单'), true)
  assert.equal(followupListSource.includes('转派'), true)
})

test('makes followup list a task-first workbench for primary doctors', () => {
  const appSource = fs.readFileSync(path.join(rootDir, 'App.jsx'), 'utf8')
  const followupListSource = fs.readFileSync(path.join(rootDir, 'pages/primary/FollowupList.jsx'), 'utf8')

  assert.equal(appSource.includes('/primary/followup-task/:id'), true)
  assert.equal(followupListSource.includes('下转日期'), true)
  assert.equal(followupListSource.includes('上次随访'), true)
  assert.equal(followupListSource.includes('计划随访日期'), true)
  assert.equal(followupListSource.includes('查看随访'), true)
  assert.equal(followupListSource.includes('查看转诊单'), true)
  assert.equal(followupListSource.includes('已失访'), true)
  assert.equal(followupListSource.includes('已完成'), true)
  assert.equal(followupListSource.includes('随访中'), true)
})

test('replaces followup placeholder with a task execution detail page for primary doctor', () => {
  const appSource = fs.readFileSync(path.join(rootDir, 'App.jsx'), 'utf8')
  const followupDetailSource = fs.readFileSync(path.join(rootDir, 'pages/primary/FollowupTaskDetail.jsx'), 'utf8')

  assert.equal(appSource.includes("import PrimaryFollowupTaskDetail from './pages/primary/FollowupTaskDetail'"), true)
  assert.equal(appSource.includes('<PrimaryFollowupTaskDetail />'), true)
  assert.equal(appSource.includes('Placeholder title="随访任务详情"'), false)
  assert.equal(followupDetailSource.includes('患者基本信息'), true)
  assert.equal(followupDetailSource.includes('本次随访要点'), true)
  assert.equal(followupDetailSource.includes('随访操作区（核心）'), true)
  assert.equal(followupDetailSource.includes('历史随访记录'), true)
  assert.equal(followupDetailSource.includes('关联转诊单快捷查看'), true)
  assert.equal(followupDetailSource.includes('记录本次随访'), true)
  assert.equal(followupDetailSource.includes('标记未联系上'), true)
  assert.equal(followupDetailSource.includes('申请转派'), true)
  assert.equal(followupDetailSource.includes('保存记录'), false)
  assert.equal(followupDetailSource.includes('完成本次随访'), false)
  assert.equal(followupDetailSource.includes('上报异常'), false)
})

test('removes linked followup task block from referral detail and keeps followup-linked downward referrals completed', () => {
  const detailSource = fs.readFileSync(path.join(rootDir, 'pages/shared/ReferralDetail.jsx'), 'utf8')
  const mockDataSource = fs.readFileSync(path.join(rootDir, 'data/mockData.js'), 'utf8')

  assert.equal(detailSource.includes('关联随访任务'), false)
  assert.equal(detailSource.includes('转移随访任务'), false)
  assert.equal(mockDataSource.includes("id: 'REF2026018'"), true)
  assert.equal(mockDataSource.includes("id: 'REF2026019'"), true)
  assert.equal(mockDataSource.includes("status: DOWNWARD_STATUS.COMPLETED"), true)
})

test('narrows county doctor menu and dashboard to personal workbench wording', () => {
  const layoutSource = fs.readFileSync(path.join(rootDir, 'components/Layout.jsx'), 'utf8')
  const dashboardSource = fs.readFileSync(path.join(rootDir, 'pages/county/Dashboard.jsx'), 'utf8')
  const reviewListSource = fs.readFileSync(path.join(rootDir, 'pages/county/ReviewList.jsx'), 'utf8')
  const referralRecordsSource = fs.readFileSync(path.join(rootDir, 'pages/county/ReferralRecords.jsx'), 'utf8')

  assert.equal(layoutSource.includes("{ path: '/county/review-list', label: '待受理转入' }"), true)
  assert.equal(layoutSource.includes("{ path: '/county/review-list', label: '上转审核' }"), false)
  assert.equal(dashboardSource.includes('急诊在途监控'), false)
  assert.equal(dashboardSource.includes('待受理转入'), true)
  assert.equal(dashboardSource.includes('我负责的进行中转入'), true)
  assert.equal(dashboardSource.includes('我发起的转出'), true)
  assert.equal(dashboardSource.includes('审核</button>'), false)
  assert.equal(dashboardSource.includes("isCountyDepartmentHead ? '详情' : '受理'"), true)
  assert.equal(dashboardSource.includes('!r.assignedDoctorId || isMine(r)'), false)
  assert.equal(reviewListSource.includes('上转审核列表'), false)
  assert.equal(reviewListSource.includes('待受理转入列表'), true)
  assert.equal(reviewListSource.includes('仅显示当前县级医生本人负责或待本人受理的普通转入单据'), true)
  assert.equal(reviewListSource.includes('(r.status === UPWARD_STATUS.PENDING ? (!r.assignedDoctorId || isMine(r)) : isMine(r))'), false)
  assert.equal(referralRecordsSource.includes('仅显示当前县级医生本人负责的普通转入记录'), true)
  assert.equal(referralRecordsSource.includes('UPWARD_STATUS.PENDING'), true)
})

test('keeps ordinary county doctor messages scoped to personal responsible referrals', () => {
  const appContextSource = fs.readFileSync(path.join(rootDir, 'context/AppContext.jsx'), 'utf8')
  const messagesSource = fs.readFileSync(path.join(rootDir, 'pages/shared/Messages.jsx'), 'utf8')

  assert.equal(appContextSource.includes("if (currentRole === ROLES.COUNTY && relatedReferral?.type === 'upward')"), true)
  assert.equal(messagesSource.includes('我的消息待办'), true)
  assert.equal(messagesSource.includes('仅显示当前县级医生本人负责单据相关消息'), true)
  assert.equal(messagesSource.includes('暂无本人待办消息'), true)
})

test('keeps ordinary county doctor downward records scoped to personal initiated referrals', () => {
  const downwardRecordsSource = fs.readFileSync(path.join(rootDir, 'pages/county/DownwardRecords.jsx'), 'utf8')

  assert.equal(downwardRecordsSource.includes("const isOrdinaryCountyDoctor = currentUser.role === ROLES.COUNTY"), true)
  assert.equal(downwardRecordsSource.includes("if (isOrdinaryCountyDoctor && r.fromDoctor !== currentUser.name) return false"), true)
  assert.equal(downwardRecordsSource.includes('仅显示当前县级医生本人发起的转出记录'), true)
  assert.equal(downwardRecordsSource.includes('暂无本人发起的转出记录'), true)
})

test('distinguishes county department head navigation and pages from ordinary county doctor', () => {
  const layoutSource = fs.readFileSync(path.join(rootDir, 'components/Layout.jsx'), 'utf8')
  const dashboardSource = fs.readFileSync(path.join(rootDir, 'pages/county/Dashboard.jsx'), 'utf8')
  const reviewListSource = fs.readFileSync(path.join(rootDir, 'pages/county/ReviewList.jsx'), 'utf8')
  const referralRecordsSource = fs.readFileSync(path.join(rootDir, 'pages/county/ReferralRecords.jsx'), 'utf8')
  const countyAccessSource = fs.readFileSync(path.join(rootDir, 'utils/countyReferralAccess.js'), 'utf8')

  assert.equal(layoutSource.includes("{ path: '/county/review-list', label: '科室待受理转入' }"), true)
  assert.equal(layoutSource.includes("{ path: '/county/referral-records', label: '科室转入记录' }"), true)
  assert.equal(dashboardSource.includes('const isCountyDepartmentHead = currentUser.role === ROLES.COUNTY2'), true)
  assert.equal(dashboardSource.includes('本科室待处理转入'), true)
  assert.equal(dashboardSource.includes('本科室进行中转入'), true)
  assert.equal(dashboardSource.includes('matchesDepartmentScope(r.toDept, currentUser.dept)'), true)
  assert.equal(reviewListSource.includes('科室待受理转入'), true)
  assert.equal(reviewListSource.includes('仅显示本科室相关普通转入单据'), true)
  assert.equal(reviewListSource.includes('暂无本科室待受理转入'), true)
  assert.equal(reviewListSource.includes('处理状态'), true)
  assert.equal(reviewListSource.includes("const isCountyDepartmentHead = currentUser.role === ROLES.COUNTY2"), true)
  assert.equal(referralRecordsSource.includes("const isCountyDepartmentHead = currentUser.role === ROLES.COUNTY2"), true)
  assert.equal(referralRecordsSource.includes('科室转入记录'), true)
  assert.equal(referralRecordsSource.includes('仅显示本科室相关普通转入记录'), true)
  assert.equal(referralRecordsSource.includes("if (isCountyDepartmentHead && !matchesDepartmentScope(r.toDept, currentUser.dept)) return false"), true)
  assert.equal(countyAccessSource.includes("['心内科', '心血管科']"), true)
})

test('keeps county downward creation page role-neutral for county doctor and department head', () => {
  const createDownwardSource = fs.readFileSync(path.join(rootDir, 'pages/county/CreateDownward.jsx'), 'utf8')

  assert.equal(createDownwardSource.includes('由当前发起人直接指定接收人，基层负责人同步知情。'), true)
  assert.equal(createDownwardSource.includes('由县级医生直接指定接收人，基层负责人同步知情。'), false)
})

test('scopes county department head downward records to department-related referrals', () => {
  const downwardRecordsSource = fs.readFileSync(path.join(rootDir, 'pages/county/DownwardRecords.jsx'), 'utf8')

  assert.equal(downwardRecordsSource.includes("const isCountyDepartmentHead = currentUser.role === ROLES.COUNTY2"), true)
  assert.equal(downwardRecordsSource.includes('仅显示本科室相关转出记录'), true)
  assert.equal(downwardRecordsSource.includes("if (isCountyDepartmentHead && !matchesDepartmentScope(r.toDept, currentUser.dept)) return false"), true)
  assert.equal(downwardRecordsSource.includes('暂无本科室转出记录'), true)
})

test('separates county doctor and county department head detail permissions on ordinary upward referrals', () => {
  const detailSource = fs.readFileSync(path.join(rootDir, 'pages/shared/ReferralDetail.jsx'), 'utf8')
  const countyAccessSource = fs.readFileSync(path.join(rootDir, 'utils/countyReferralAccess.js'), 'utf8')

  assert.equal(detailSource.includes("const isCountyAttendingDoctor = currentRole === ROLES.COUNTY"), true)
  assert.equal(detailSource.includes("const isCountyDepartmentHead = currentRole === ROLES.COUNTY2"), true)
  assert.equal(detailSource.includes('canViewCountyUpwardReferralDetail'), true)
  assert.equal(detailSource.includes('当前角色无权查看该普通{upwardDisplayLabel}转诊单'), true)
  assert.equal(detailSource.includes('县级科主任此页仅查看本科室转诊详情，不在详情页直接执行受理或拒绝。'), true)
  assert.equal(detailSource.includes('const canAcceptUpward = isCountyAttendingDoctor'), true)
  assert.equal(countyAccessSource.includes('isAssignedToCurrentCountyDoctor'), true)
})

test('shows county department head messages with department-scoped wording', () => {
  const messagesSource = fs.readFileSync(path.join(rootDir, 'pages/shared/Messages.jsx'), 'utf8')

  assert.equal(messagesSource.includes("const isCountyDepartmentHead = currentUser?.role === ROLES.COUNTY2"), true)
  assert.equal(messagesSource.includes('科室消息中心'), true)
  assert.equal(messagesSource.includes('仅显示本科室相关消息与提醒'), true)
  assert.equal(messagesSource.includes('暂无本科室消息'), true)
})

test('shows referral admin messages with referral-center wording', () => {
  const messagesSource = fs.readFileSync(path.join(rootDir, 'pages/shared/Messages.jsx'), 'utf8')

  assert.equal(messagesSource.includes("const isReferralAdmin = currentUser?.role === ROLES.ADMIN"), true)
  assert.equal(messagesSource.includes('转诊中心消息中心'), true)
  assert.equal(messagesSource.includes('仅显示转诊协调、急诊升级与督办相关消息'), true)
  assert.equal(messagesSource.includes('暂无转诊中心消息'), true)
})

test('upgrades system admin pages toward configuration-workbench wording and removes demo alerts', () => {
  const institutionSource = fs.readFileSync(path.join(rootDir, 'pages/admin/InstitutionManage.jsx'), 'utf8')
  const roleManageSource = fs.readFileSync(path.join(rootDir, 'pages/admin/RoleManage.jsx'), 'utf8')
  const notifySource = fs.readFileSync(path.join(rootDir, 'pages/admin/NotifyTemplate.jsx'), 'utf8')
  const timeoutSource = fs.readFileSync(path.join(rootDir, 'pages/admin/TimeoutConfig.jsx'), 'utf8')
  const operationLogSource = fs.readFileSync(path.join(rootDir, 'pages/admin/OperationLog.jsx'), 'utf8')
  const systemConfigSource = fs.readFileSync(path.join(rootDir, 'data/systemAdminConfig.js'), 'utf8')

  assert.equal(institutionSource.includes('机构与转诊能力配置'), true)
  assert.equal(institutionSource.includes('机构基础信息维护 · 转诊能力与资源配置'), true)
  assert.equal(institutionSource.includes('科室由机构主数据同步，本页仅维护转诊相关配置，不在此处新增科室'), true)
  assert.equal(institutionSource.includes('最后修改人'), true)
  assert.equal(operationLogSource.includes('buildCompareRows(detail)'), true)
  assert.equal(operationLogSource.includes('变更前后对比'), true)
  assert.equal(operationLogSource.includes('变更前'), true)
  assert.equal(operationLogSource.includes('变更后'), true)

  assert.equal(roleManageSource.includes('用户与角色管理'), true)
  assert.equal(roleManageSource.includes('账号状态、角色归属与变更记录'), true)
  assert.equal(roleManageSource.includes('SYSTEM_ROLE_OPTIONS'), true)
  assert.equal(systemConfigSource.includes('基层负责人'), true)
  assert.equal(systemConfigSource.includes('县级科主任'), true)
  assert.equal(systemConfigSource.includes('系统管理员'), true)
  assert.equal(roleManageSource.includes('角色决定页面与操作范围，详细权限按系统预设执行。'), true)
  assert.equal(roleManageSource.includes('TODO: 调用后端 API，写入操作日志，传入 reason'), false)

  assert.equal(notifySource.includes('SYSTEM_NOTIFY_SYS_TEMPLATES'), true)
  assert.equal(systemConfigSource.includes('新的转入申请待受理'), true)
  assert.equal(systemConfigSource.includes('新的转出康复方案待接收'), true)
  assert.equal(notifySource.includes('管理员已代为处理转诊单'), false)

  assert.equal(timeoutSource.includes('转入流程超时规则'), true)
  assert.equal(timeoutSource.includes('转出流程超时规则'), true)
  assert.equal(timeoutSource.includes('规则变更立即生效，仅影响后续进入该环节的单据'), true)

  assert.equal(operationLogSource.includes("alert('导出操作日志 CSV"), false)
  assert.equal(operationLogSource.includes('导出任务已创建，可在日志中心下载 CSV 文件。'), true)
  assert.equal(operationLogSource.includes('getSystemOperationLogs'), true)
  assert.equal(systemConfigSource.includes('林系统管理员'), true)
  assert.equal(operationLogSource.includes('配置域'), true)
})

test('reframes form templates, audit rules, and disease config toward a more complete system product', () => {
  const formTemplateSource = fs.readFileSync(path.join(rootDir, 'pages/admin/FormTemplate.jsx'), 'utf8')
  const auditRuleSource = fs.readFileSync(path.join(rootDir, 'pages/admin/AuditRuleConfig.jsx'), 'utf8')
  const diseaseSource = fs.readFileSync(path.join(rootDir, 'pages/admin/DiseaseDir.jsx'), 'utf8')
  const systemConfigSource = fs.readFileSync(path.join(rootDir, 'data/systemAdminConfig.js'), 'utf8')

  assert.equal(formTemplateSource.includes('普通转入/转出表单字段配置 · 快捷短语管理'), true)
  assert.equal(formTemplateSource.includes('当前配置覆盖普通转入/转出表单；急诊与绿色通道页面按专用流程固定，不在此页自由配置。'), true)
  assert.equal(formTemplateSource.includes('转入模板'), true)
  assert.equal(formTemplateSource.includes('转出模板'), true)
  assert.equal(formTemplateSource.includes('患者基础信息'), true)
  assert.equal(formTemplateSource.includes('临床信息'), true)
  assert.equal(formTemplateSource.includes('接诊安排'), true)
  assert.equal(formTemplateSource.includes('补充信息'), true)
  assert.equal(formTemplateSource.includes('随访建议'), true)
  assert.equal(formTemplateSource.includes('退回说明'), true)

  assert.equal(auditRuleSource.includes('配置机构与科室的转入/转出院内审核规则'), true)
  assert.equal(auditRuleSource.includes('本页承载既定业务规则配置，不改变急诊豁免等固定政策。'), true)
  assert.equal(auditRuleSource.includes('转入审核'), true)
  assert.equal(auditRuleSource.includes('转出审核'), true)
  assert.equal(auditRuleSource.includes('SYSTEM_ADMIN_OPERATOR'), true)
  assert.equal(systemConfigSource.includes('林系统管理员'), true)
  assert.equal(auditRuleSource.includes('急诊转入无论开关状态自动豁免院内审核'), true)

  assert.equal(diseaseSource.includes('转诊重点病种配置'), true)
  assert.equal(diseaseSource.includes('重点病种、优先病种与急诊联动病种维护'), true)
  assert.equal(diseaseSource.includes('本页维护转诊相关重点病种配置，不承担完整 ICD-10 主数据维护。'), true)
  assert.equal(diseaseSource.includes('是否急诊联动病种'), true)
  assert.equal(diseaseSource.includes('是否优先受理病种'), true)
  assert.equal(diseaseSource.includes('批量导入'), false)
})

test('narrows admin navigation to referral center work menus while retaining hidden system modules in code', () => {
  const layoutSource = fs.readFileSync(path.join(rootDir, 'components/Layout.jsx'), 'utf8')
  const appSource = fs.readFileSync(path.join(rootDir, 'App.jsx'), 'utf8')
  const adminBlock = layoutSource.split('[ROLES.ADMIN]: [')[1]?.split('[ROLES.SYSTEM_ADMIN]: [')[0] || ''
  const systemAdminBlock = layoutSource.split('[ROLES.SYSTEM_ADMIN]: [')[1]?.split('[ROLES.PRIMARY_HEAD]: [')[0] || ''

  assert.equal(adminBlock.includes("{ path: '/admin/dashboard', label: '工作台', icon: '📊' }"), true)
  assert.equal(adminBlock.includes("{ path: '/admin/ledger', label: '转诊台账', icon: '📋' }"), true)
  assert.equal(adminBlock.includes("{ path: '/admin/anomaly', label: '异常处理', icon: '⚠️' }"), true)
  assert.equal(adminBlock.includes('统计报表'), true)
  assert.equal(adminBlock.includes("{ path: '/admin/stats', label: '统计看板' }"), true)
  assert.equal(adminBlock.includes("{ path: '/admin/exam-report', label: '考核报表' }"), true)
  assert.equal(adminBlock.includes("{ path: '/admin/doctor-perf', label: '绩效统计' }"), true)
  assert.equal(adminBlock.includes("{ path: '/admin/data-report', label: '数据上报' }"), true)
  assert.equal(adminBlock.includes("{ path: '/messages', label: '消息中心', icon: '🔔' }"), true)
  assert.equal(adminBlock.includes('/admin/followup'), false)
  assert.equal(adminBlock.includes('系统管理'), false)
  assert.equal(systemAdminBlock.includes("{ path: '/admin/institution-manage', label: '工作台', icon: '📊' }"), true)
  assert.equal(systemAdminBlock.includes('统计报表'), false)
  assert.equal(appSource.includes('/admin/institution-manage'), true)
  assert.equal(appSource.includes('/admin/stats'), true)
  assert.equal(appSource.includes("[ROLES.SYSTEM_ADMIN]: '/admin/institution-manage'"), true)
  assert.equal(appSource.includes("<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminStats /></RoleRoute>"), true)
  assert.equal(appSource.includes("<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminExamReport /></RoleRoute>"), true)
  assert.equal(appSource.includes("<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminDoctorPerf /></RoleRoute>"), true)
  assert.equal(appSource.includes("<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminDataReport /></RoleRoute>"), true)
})

test('reframes admin dashboard as referral center workbench instead of mixed admin backend', () => {
  const dashboardSource = fs.readFileSync(path.join(rootDir, 'pages/admin/Dashboard.jsx'), 'utf8')

  assert.equal(dashboardSource.includes('转诊中心工作台'), true)
  assert.equal(dashboardSource.includes('急诊补录 · 转诊协调 · 异常督办'), true)
  assert.equal(dashboardSource.includes("label: '急诊处理中'"), true)
  assert.equal(dashboardSource.includes("label: '待指派'"), true)
  assert.equal(dashboardSource.includes("label: '待协调'"), true)
  assert.equal(dashboardSource.includes("label: '超时预警'"), true)
  assert.equal(dashboardSource.includes('管理员工作台'), false)
  assert.equal(dashboardSource.includes('整体完成率'), false)
  assert.equal(dashboardSource.includes('今日上转'), false)
  assert.equal(dashboardSource.includes('今日下转'), false)
  assert.equal(dashboardSource.includes('统计看板'), false)
  assert.equal(dashboardSource.includes('随访任务管理'), false)
  assert.equal(dashboardSource.includes('数据上报管理'), false)
  assert.equal(dashboardSource.includes('本月统计概览'), false)
  assert.equal(dashboardSource.includes("alert('请先选择医生')"), false)
  assert.equal(dashboardSource.includes('到院安排已提交！'), false)
  assert.equal(dashboardSource.includes('超时预警（待受理超24小时未处理）'), true)
})

test('reframes admin ledger as referral center process ledger copy', () => {
  const ledgerSource = fs.readFileSync(path.join(rootDir, 'pages/admin/Ledger.jsx'), 'utf8')

  assert.equal(ledgerSource.includes('覆盖上转、下转、急诊与绿通的过程台账'), true)
  assert.equal(ledgerSource.includes("label: '待受理'"), true)
  assert.equal(ledgerSource.includes("label: '待接收'"), true)
  assert.equal(ledgerSource.includes("label: '转诊中'"), true)
  assert.equal(ledgerSource.includes("label: '急诊/绿通'"), true)
  assert.equal(ledgerSource.includes("label: '已完成'"), true)
  assert.equal(ledgerSource.includes('导出台账 Excel'), true)
  assert.equal(ledgerSource.includes('导出台账 PDF'), true)
  assert.equal(ledgerSource.includes("'处理方式'"), true)
  assert.equal(ledgerSource.includes('全机构转诊记录 · 多维度筛查'), false)
  assert.equal(ledgerSource.includes("label: '筛选结果'"), false)
  assert.equal(ledgerSource.includes("'分配方式'"), false)
})

test('reframes admin anomaly page as referral center supervision page without demo-only actions', () => {
  const anomalySource = fs.readFileSync(path.join(rootDir, 'pages/admin/Anomaly.jsx'), 'utf8')

  assert.equal(anomalySource.includes('聚焦超时督办、急诊升级与拒绝回看。下转仅监控催办，不在此页执行操作。'), true)
  assert.equal(anomalySource.includes("label: '紧急升级'"), true)
  assert.equal(anomalySource.includes("label: '超时督办'"), true)
  assert.equal(anomalySource.includes("label: '拒绝回看'"), true)
  assert.equal(anomalySource.includes("label: '今日已处理'"), false)
  assert.equal(anomalySource.includes("alert('已发送催办通知')"), false)
  assert.equal(anomalySource.includes("alert('请填写关闭原因')"), false)
  assert.equal(anomalySource.includes("setNegotiateError('请填写关闭原因')"), true)
  assert.equal(anomalySource.includes('Object.values(MOCK_USERS)'), true)
})

test('exposes existing system pages through a dedicated system admin role without new page duplication', () => {
  const mockDataSource = fs.readFileSync(path.join(rootDir, 'data/mockData.js'), 'utf8')
  const layoutSource = fs.readFileSync(path.join(rootDir, 'components/Layout.jsx'), 'utf8')
  const appSource = fs.readFileSync(path.join(rootDir, 'App.jsx'), 'utf8')
  const statsSource = fs.readFileSync(path.join(rootDir, 'pages/admin/Stats.jsx'), 'utf8')

  assert.equal(mockDataSource.includes("SYSTEM_ADMIN: 'system_admin'"), true)
  assert.equal(mockDataSource.includes("roleLabel: '系统管理员'"), true)
  assert.equal(layoutSource.includes('[ROLES.SYSTEM_ADMIN]'), true)
  assert.equal(layoutSource.includes("{ path: '/admin/institution-manage', label: '工作台', icon: '📊' }"), true)
  assert.equal(layoutSource.includes("{ path: '/admin/institution-manage', label: '机构管理' }"), true)
  assert.equal(layoutSource.includes("{ path: '/admin/operation-log', label: '操作日志' }"), true)
  assert.equal(appSource.includes("[ROLES.SYSTEM_ADMIN]: '/admin/institution-manage'"), true)
  assert.equal(appSource.includes("<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminStats /></RoleRoute>"), true)
  assert.equal(appSource.includes("<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}><AdminInstitutionManage /></RoleRoute>"), true)
  assert.equal(appSource.includes("<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}><AdminOperationLog /></RoleRoute>"), true)
  assert.equal(statsSource.includes('const isSystemAdmin = currentRole === ROLES.SYSTEM_ADMIN'), true)
  assert.equal(statsSource.includes('系统工作台'), true)
})

test('uses transfer-in and transfer-out wording for primary and county roles instead of upward/downward management labels', () => {
  const layoutSource = fs.readFileSync(path.join(rootDir, 'components/Layout.jsx'), 'utf8')
  const primaryDashboardSource = fs.readFileSync(path.join(rootDir, 'pages/primary/Dashboard.jsx'), 'utf8')
  const primaryReferralListSource = fs.readFileSync(path.join(rootDir, 'pages/primary/ReferralList.jsx'), 'utf8')
  const primaryDownwardListSource = fs.readFileSync(path.join(rootDir, 'pages/primary/DownwardList.jsx'), 'utf8')
  const primaryDownwardRecordsSource = fs.readFileSync(path.join(rootDir, 'pages/primary/DownwardRecords.jsx'), 'utf8')
  const primaryCreateReferralSource = fs.readFileSync(path.join(rootDir, 'pages/primary/CreateReferral.jsx'), 'utf8')
  const countyReviewListSource = fs.readFileSync(path.join(rootDir, 'pages/county/ReviewList.jsx'), 'utf8')
  const countyReferralRecordsSource = fs.readFileSync(path.join(rootDir, 'pages/county/ReferralRecords.jsx'), 'utf8')
  const countyDownwardRecordsSource = fs.readFileSync(path.join(rootDir, 'pages/county/DownwardRecords.jsx'), 'utf8')
  const countyCreateDownwardSource = fs.readFileSync(path.join(rootDir, 'pages/county/CreateDownward.jsx'), 'utf8')

  assert.equal(layoutSource.includes("label: '转出管理'"), true)
  assert.equal(layoutSource.includes("label: '转入管理'"), true)
  assert.equal(layoutSource.includes("label: '发起转出'"), true)
  assert.equal(layoutSource.includes("label: '转出记录'"), true)
  assert.equal(layoutSource.includes("label: '转入处理'"), true)
  assert.equal(layoutSource.includes("label: '转入记录'"), true)
  assert.equal(layoutSource.includes("label: '待受理转入'"), true)
  assert.equal(layoutSource.includes("label: '科室待受理转入'"), true)
  assert.equal(layoutSource.includes("label: '科室转入记录'"), true)
  assert.equal(primaryDashboardSource.includes('转出管理'), true)
  assert.equal(primaryDashboardSource.includes('转入管理'), true)
  assert.equal(primaryDashboardSource.includes("label: '转出'"), true)
  assert.equal(primaryDashboardSource.includes('我的转出记录'), true)
  assert.equal(primaryDashboardSource.includes('+ 发起转出'), true)
  assert.equal(primaryDashboardSource.includes('待处理转入'), true)
  assert.equal(primaryDashboardSource.includes('转入科室'), true)
  assert.equal(primaryReferralListSource.includes('转出记录'), true)
  assert.equal(primaryReferralListSource.includes('发起转出'), true)
  assert.equal(primaryDownwardListSource.includes('我的转入处理'), true)
  assert.equal(primaryDownwardRecordsSource.includes('转入记录'), true)
  assert.equal(primaryCreateReferralSource.includes('发起转出申请'), true)
  assert.equal(primaryCreateReferralSource.includes('提交转出申请'), true)
  assert.equal(primaryCreateReferralSource.includes('急诊转出提交确认'), true)
  assert.equal(primaryCreateReferralSource.includes('提交上转申请'), false)
  assert.equal(countyReviewListSource.includes('待受理转入'), true)
  assert.equal(countyReviewListSource.includes('科室待受理转入'), true)
  assert.equal(countyReviewListSource.includes('转入科室'), true)
  assert.equal(countyReferralRecordsSource.includes('转入记录'), true)
  assert.equal(countyReferralRecordsSource.includes('科室转入记录'), true)
  assert.equal(countyDownwardRecordsSource.includes('转出记录'), true)
  assert.equal(countyDownwardRecordsSource.includes('发起转出'), true)
  assert.equal(countyCreateDownwardSource.includes('发起转出申请'), true)
  assert.equal(countyCreateDownwardSource.includes('转出交接资料'), true)
  assert.equal(countyCreateDownwardSource.includes('转出资料包'), true)
  assert.equal(countyCreateDownwardSource.includes('转出原因'), true)
  assert.equal(countyCreateDownwardSource.includes('提交转出申请'), true)
})

test('keeps county internal review and shared role pages aligned with transfer-in and transfer-out wording', () => {
  const countyInternalReviewSource = fs.readFileSync(path.join(rootDir, 'pages/county/InternalReview.jsx'), 'utf8')
  const referralDetailSource = fs.readFileSync(path.join(rootDir, 'pages/shared/ReferralDetail.jsx'), 'utf8')
  const messagesSource = fs.readFileSync(path.join(rootDir, 'pages/shared/Messages.jsx'), 'utf8')
  const settingsSource = fs.readFileSync(path.join(rootDir, 'pages/shared/UserSettings.jsx'), 'utf8')

  assert.equal(countyInternalReviewSource.includes('转入申请院内审核'), true)
  assert.equal(countyInternalReviewSource.includes('转出机构'), true)
  assert.equal(countyInternalReviewSource.includes('病情符合转入指征，同意接收'), true)
  assert.equal(countyInternalReviewSource.includes('不符合转入指征，建议基层继续诊治'), true)
  assert.equal(referralDetailSource.includes("const upwardDisplayLabel = isPrimaryScopedRole ? '转出' : isCountyScopedRole ? '转入' : '上转'"), true)
  assert.equal(referralDetailSource.includes("const downwardDisplayLabel = isPrimaryScopedRole ? '转入' : isCountyScopedRole ? '转出' : '下转'"), true)
  assert.equal(referralDetailSource.includes('currentTransferLabel}申请 ·'), true)
  assert.equal(referralDetailSource.includes('`${upwardDisplayLabel}信息`'), true)
  assert.equal(referralDetailSource.includes('`${downwardDisplayLabel}信息`'), true)
  assert.equal(referralDetailSource.includes('`${downwardDisplayLabel}原因`'), true)
  assert.equal(referralDetailSource.includes('downwardDisplayLabel}分配方式'), true)
  assert.equal(referralDetailSource.includes('完成${downwardDisplayLabel}接收确认'), true)
  assert.equal(referralDetailSource.includes('撤销${downwardDisplayLabel}申请'), true)
  assert.equal(messagesSource.includes("const upwardLabel = isPrimaryScopedRole ? '转出' : isCountyScopedRole ? '转入' : '上转'"), true)
  assert.equal(messagesSource.includes("const downwardLabel = isPrimaryScopedRole ? '转入' : isCountyScopedRole ? '转出' : '下转'"), true)
  assert.equal(messagesSource.includes("label: `${upwardLabel}通知`"), true)
  assert.equal(messagesSource.includes("label: `${downwardLabel}通知`"), true)
  assert.equal(settingsSource.includes('有新的转入/转出申请待处理'), true)
})

test('uses shared config sources across core system-admin configuration pages', () => {
  const systemConfigSource = fs.readFileSync(path.join(rootDir, 'data/systemAdminConfig.js'), 'utf8')
  const roleManageSource = fs.readFileSync(path.join(rootDir, 'pages/admin/RoleManage.jsx'), 'utf8')
  const institutionManageSource = fs.readFileSync(path.join(rootDir, 'pages/admin/InstitutionManage.jsx'), 'utf8')
  const operationLogSource = fs.readFileSync(path.join(rootDir, 'pages/admin/OperationLog.jsx'), 'utf8')
  const notifySource = fs.readFileSync(path.join(rootDir, 'pages/admin/NotifyTemplate.jsx'), 'utf8')
  const timeoutSource = fs.readFileSync(path.join(rootDir, 'pages/admin/TimeoutConfig.jsx'), 'utf8')
  const formTemplateSource = fs.readFileSync(path.join(rootDir, 'pages/admin/FormTemplate.jsx'), 'utf8')
  const auditRuleSource = fs.readFileSync(path.join(rootDir, 'pages/admin/AuditRuleConfig.jsx'), 'utf8')
  const auditRuleDataSource = fs.readFileSync(path.join(rootDir, 'data/auditRuleConfig.js'), 'utf8')
  const diseaseSource = fs.readFileSync(path.join(rootDir, 'pages/admin/DiseaseDir.jsx'), 'utf8')

  assert.equal(systemConfigSource.includes('export const SYSTEM_USER_ACCOUNTS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_INSTITUTION_CONFIGS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_DEPT_CONFIGS = {'), true)
  assert.equal(systemConfigSource.includes('export let SYSTEM_OPERATION_LOGS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_NOTIFY_SYS_TEMPLATES = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_TIMEOUT_UP_RULES = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_FORM_UP_FIELDS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_AUDIT_INSTITUTIONS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_AUDIT_CANDIDATE_USERS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_AUDIT_RULE_SEEDS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_DISEASE_CATEGORIES = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_DISEASE_CONFIGS = ['), true)

  assert.equal(roleManageSource.includes('SYSTEM_USER_ACCOUNTS'), true)
  assert.equal(roleManageSource.includes('SYSTEM_ROLE_OPTIONS'), true)
  assert.equal(roleManageSource.includes('SYSTEM_INSTITUTION_OPTIONS'), true)
  assert.equal(roleManageSource.includes('const MOCK_USERS = ['), false)
  assert.equal(roleManageSource.includes('const ROLES = ['), false)
  assert.equal(roleManageSource.includes('const INSTITUTIONS = ['), false)

  assert.equal(institutionManageSource.includes('SYSTEM_INSTITUTION_CONFIGS'), true)
  assert.equal(institutionManageSource.includes('SYSTEM_DEPT_CONFIGS'), true)
  assert.equal(institutionManageSource.includes('SYSTEM_ADMIN_OPERATOR'), true)
  assert.equal(institutionManageSource.includes('const MOCK_INSTITUTIONS = ['), false)
  assert.equal(institutionManageSource.includes('const DEPT_CONFIG_INIT = {'), false)
  assert.equal(institutionManageSource.includes("const CURRENT_OPERATOR = '林系统管理员'"), false)

  assert.equal(operationLogSource.includes('getSystemOperationLogs'), true)
  assert.equal(operationLogSource.includes('SYSTEM_OPERATION_LOG_TYPES'), true)
  assert.equal(operationLogSource.includes('SYSTEM_OPERATION_LOG_DOMAINS'), true)
  assert.equal(operationLogSource.includes('const MOCK_LOGS = ['), false)
  assert.equal(operationLogSource.includes("const LOG_TYPES = ['全部'"), false)
  assert.equal(operationLogSource.includes("const LOG_DOMAINS = ['全部'"), false)

  assert.equal(notifySource.includes('SYSTEM_NOTIFY_SYS_TEMPLATES'), true)
  assert.equal(notifySource.includes('SYSTEM_NOTIFY_SMS_TEMPLATES'), true)
  assert.equal(notifySource.includes('SYSTEM_NOTIFY_VARIABLES'), true)
  assert.equal(notifySource.includes('const INIT_SYS_TEMPLATES = ['), false)
  assert.equal(notifySource.includes('const INIT_SMS_TEMPLATES = ['), false)

  assert.equal(timeoutSource.includes('SYSTEM_TIMEOUT_UP_RULES'), true)
  assert.equal(timeoutSource.includes('SYSTEM_TIMEOUT_DOWN_RULES'), true)
  assert.equal(timeoutSource.includes('const INIT_UP_RULES = ['), false)
  assert.equal(timeoutSource.includes('const INIT_DOWN_RULES = ['), false)

  assert.equal(formTemplateSource.includes('SYSTEM_FORM_UP_FIELDS'), true)
  assert.equal(formTemplateSource.includes('SYSTEM_FORM_DOWN_FIELDS'), true)
  assert.equal(formTemplateSource.includes('SYSTEM_FORM_PHRASES'), true)
  assert.equal(formTemplateSource.includes('const UPWARD_FIELDS = ['), false)
  assert.equal(formTemplateSource.includes('const DOWNWARD_FIELDS = ['), false)
  assert.equal(formTemplateSource.includes('const MOCK_PHRASES = ['), false)

  assert.equal(auditRuleSource.includes('SYSTEM_ADMIN_OPERATOR'), true)
  assert.equal(auditRuleSource.includes('SYSTEM_AUDIT_INSTITUTIONS'), true)
  assert.equal(auditRuleSource.includes("from '../../data/mockData'"), false)
  assert.equal(auditRuleSource.includes("const CURRENT_OPERATOR = '林系统管理员'"), false)

  assert.equal(auditRuleDataSource.includes('SYSTEM_AUDIT_CANDIDATE_USERS'), true)
  assert.equal(auditRuleDataSource.includes('SYSTEM_AUDIT_RULE_SEEDS'), true)
  assert.equal(auditRuleDataSource.includes('export const AUDIT_CANDIDATE_USERS = ['), false)

  assert.equal(diseaseSource.includes('SYSTEM_DISEASE_CATEGORIES'), true)
  assert.equal(diseaseSource.includes('SYSTEM_DISEASE_CONFIGS'), true)
  assert.equal(diseaseSource.includes('const MOCK_DISEASES = ['), false)
})

test('adds save-impact guidance to key system-admin configuration dialogs', () => {
  const roleManageSource = fs.readFileSync(path.join(rootDir, 'pages/admin/RoleManage.jsx'), 'utf8')
  const timeoutSource = fs.readFileSync(path.join(rootDir, 'pages/admin/TimeoutConfig.jsx'), 'utf8')
  const notifySource = fs.readFileSync(path.join(rootDir, 'pages/admin/NotifyTemplate.jsx'), 'utf8')
  const auditRuleSource = fs.readFileSync(path.join(rootDir, 'pages/admin/AuditRuleConfig.jsx'), 'utf8')

  assert.equal(roleManageSource.includes('变更影响提示'), true)
  assert.equal(roleManageSource.includes('菜单与操作范围将按新角色立即切换'), true)
  assert.equal(roleManageSource.includes('失去系统访问权限，但不会影响其历史转诊记录与操作日志留存'), true)

  assert.equal(timeoutSource.includes('生效影响提示'), true)
  assert.equal(timeoutSource.includes('已产生的超时记录不会自动回写'), true)

  assert.equal(notifySource.includes('生效影响提示'), true)
  assert.equal(notifySource.includes('已发送通知不回溯修改'), true)

  assert.equal(auditRuleSource.includes('生效影响提示'), true)
  assert.equal(auditRuleSource.includes('已进入流程的单据不回写原审核路径'), true)
})

test('writes key system-admin configuration actions into shared operation logs', () => {
  const systemConfigSource = fs.readFileSync(path.join(rootDir, 'data/systemAdminConfig.js'), 'utf8')
  const operationLogSource = fs.readFileSync(path.join(rootDir, 'pages/admin/OperationLog.jsx'), 'utf8')
  const roleManageSource = fs.readFileSync(path.join(rootDir, 'pages/admin/RoleManage.jsx'), 'utf8')
  const timeoutSource = fs.readFileSync(path.join(rootDir, 'pages/admin/TimeoutConfig.jsx'), 'utf8')
  const notifySource = fs.readFileSync(path.join(rootDir, 'pages/admin/NotifyTemplate.jsx'), 'utf8')
  const auditRuleSource = fs.readFileSync(path.join(rootDir, 'pages/admin/AuditRuleConfig.jsx'), 'utf8')
  const institutionManageSource = fs.readFileSync(path.join(rootDir, 'pages/admin/InstitutionManage.jsx'), 'utf8')
  const formTemplateSource = fs.readFileSync(path.join(rootDir, 'pages/admin/FormTemplate.jsx'), 'utf8')
  const diseaseSource = fs.readFileSync(path.join(rootDir, 'pages/admin/DiseaseDir.jsx'), 'utf8')

  assert.equal(systemConfigSource.includes('export function appendSystemOperationLog('), true)
  assert.equal(systemConfigSource.includes("window.dispatchEvent(new CustomEvent('system-operation-log-updated'))"), true)
  assert.equal(systemConfigSource.includes("'病种配置'"), true)
  assert.equal(operationLogSource.includes('getSystemOperationLogs'), true)
  assert.equal(operationLogSource.includes("window.addEventListener('system-operation-log-updated'"), true)

  assert.equal(roleManageSource.includes('appendSystemOperationLog'), true)
  assert.equal(timeoutSource.includes('appendSystemOperationLog'), true)
  assert.equal(notifySource.includes('appendSystemOperationLog'), true)
  assert.equal(auditRuleSource.includes('appendSystemOperationLog'), true)
  assert.equal(institutionManageSource.includes('appendSystemOperationLog'), true)
  assert.equal(formTemplateSource.includes('appendSystemOperationLog'), true)
  assert.equal(diseaseSource.includes('appendSystemOperationLog'), true)
})

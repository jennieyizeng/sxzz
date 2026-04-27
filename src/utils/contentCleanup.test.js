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
  assert.equal(followupListSource.includes('记录随访'), true)
  assert.equal(followupListSource.includes('历史随访记录'), true)
  assert.equal(followupListSource.includes('查看转诊单'), false)
  assert.equal(followupListSource.includes('转派'), true)
})

test('makes followup list a task-first workbench for primary doctors', () => {
  const appSource = fs.readFileSync(path.join(rootDir, 'App.jsx'), 'utf8')
  const followupListSource = fs.readFileSync(path.join(rootDir, 'pages/primary/FollowupList.jsx'), 'utf8')

  assert.equal(appSource.includes('/primary/followup-task/:id'), true)
  assert.equal(followupListSource.includes('下转日期'), true)
  assert.equal(followupListSource.includes('上次随访'), true)
  assert.equal(followupListSource.includes('计划随访日期'), true)
  assert.equal(followupListSource.includes('记录随访'), true)
  assert.equal(followupListSource.includes('历史随访记录'), true)
  assert.equal(followupListSource.includes('查看转诊单'), false)
  assert.equal(followupListSource.includes('仅显示本人负责的随访任务'), false)
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
  assert.equal(followupDetailSource.includes('<InfoCard title="患者基本信息">'), false)
  assert.equal(followupDetailSource.includes('PatientSummaryStrip'), true)
  assert.equal(followupDetailSource.includes('本次随访要点'), true)
  assert.equal(followupDetailSource.includes('继续用药'), true)
  assert.equal(followupDetailSource.includes('用药注意事项'), true)
  assert.equal(followupDetailSource.includes('随访操作区（核心）'), false)
  assert.equal(followupDetailSource.includes('随访操作区'), false)
  assert.equal(followupDetailSource.includes('记录随访信息'), true)
  assert.equal(followupDetailSource.includes('历史随访记录'), false)
  assert.equal(followupDetailSource.includes('暂无历史随访记录'), false)
  assert.equal(followupDetailSource.includes('关联转诊单快捷查看'), false)
  assert.equal(followupDetailSource.includes('查看关联转诊单'), true)
  assert.equal(followupDetailSource.includes('记录本次随访'), true)
  assert.equal(followupDetailSource.includes('标记未联系上'), true)
  assert.equal(followupDetailSource.includes('申请转派'), true)
  assert.equal(followupDetailSource.includes('基层医生不直接转移任务'), false)
  assert.equal(followupDetailSource.includes('转派原因'), true)
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
  assert.equal(reviewListSource.includes('仅显示当前县级医生本人负责或当前可受理的普通转入单据'), true)
  assert.equal(reviewListSource.includes('(r.status === UPWARD_STATUS.PENDING ? (!r.assignedDoctorId || isMine(r)) : isMine(r))'), false)
  assert.equal(referralRecordsSource.includes('仅显示当前县级医生本人负责或当前可受理的普通转入记录'), true)
  assert.equal(referralRecordsSource.includes('UPWARD_STATUS.PENDING'), true)
})

test('keeps ordinary upward status and outpatient referral summary copy aligned with the new form wording', () => {
  const mockDataSource = fs.readFileSync(path.join(rootDir, 'data/mockData.js'), 'utf8')
  const createReferralSource = fs.readFileSync(path.join(rootDir, 'pages/primary/CreateReferral.jsx'), 'utf8')
  const referralDetailSource = fs.readFileSync(path.join(rootDir, 'pages/shared/ReferralDetail.jsx'), 'utf8')
  const upwardDisplaySource = fs.readFileSync(path.join(rootDir, 'utils/upwardReferralDisplay.js'), 'utf8')
  const reasonCodesSource = fs.readFileSync(path.join(rootDir, 'constants/reasonCodes.js'), 'utf8')

  assert.equal(mockDataSource.includes("PENDING:                  '待受理'"), true)
  assert.equal(createReferralSource.includes('期望处理方式'), true)
  assert.equal(createReferralSource.includes('承接方式偏好'), false)
  assert.equal(createReferralSource.includes('当前门诊科室'), true)
  assert.equal(createReferralSource.includes('当前接诊医生'), true)
  assert.equal(createReferralSource.includes('当前接诊医生 <span className="text-red-500">*</span>'), true)
  assert.equal(createReferralSource.includes('住院号 <span className="text-red-500">*</span>'), false)
  assert.equal(createReferralSource.includes('当前主管医生 / 经治医生 <span className="text-red-500">*</span>'), false)
  assert.equal(createReferralSource.includes('就诊时间'), true)
  assert.equal(createReferralSource.includes('门诊号 / 就诊记录号'), true)
  assert.equal(createReferralSource.includes('转诊目的'), true)
  assert.equal(createReferralSource.includes('转诊目的 <span className="text-red-500">*</span>'), true)
  assert.equal(createReferralSource.includes('grid grid-cols-2 gap-x-6 gap-y-3'), true)
  assert.equal(reasonCodesSource.includes("{ code: 'other', label: '其他' }"), true)
  assert.equal(createReferralSource.includes("outpatientTransferPurpose.includes('other')"), true)
  assert.equal(createReferralSource.includes('请填写其他转诊目的'), true)
  assert.equal(createReferralSource.includes('当前病情评估'), true)
  assert.equal(createReferralSource.includes('当前病情评估 <span className="text-gray-400 text-xs">（非必填）</span>'), false)
  assert.equal(createReferralSource.includes('补充说明 <span className="text-gray-400 text-xs">（选填）</span>'), false)
  assert.equal(createReferralSource.includes('按医院已维护的转诊科室范围提交申请'), false)
  assert.equal(createReferralSource.includes('若号源已满仍可提交申请，是否接诊以院方实际安排为准。'), true)
  assert.equal(createReferralSource.includes('当前无可用号源'), true)
  assert.equal(createReferralSource.includes('门诊关联信息'), true)
  assert.equal(createReferralSource.includes('诊断与转诊目的'), true)
  assert.equal(createReferralSource.includes('已上传资料清单'), true)
  assert.equal(createReferralSource.includes('上传检查/检验资料'), true)
  assert.equal(createReferralSource.includes('上传护理记录'), true)
  assert.equal(createReferralSource.includes('上传知情同意'), true)
  assert.equal(createReferralSource.includes('知情同意状态'), false)
  assert.equal(createReferralSource.includes('查看'), true)
  assert.equal(createReferralSource.includes('提交后将进入后续审核/受理流程，若资料不完整可能被退回补充。'), true)
  assert.equal(createReferralSource.includes('选择门诊记录'), false)
  assert.equal(createReferralSource.includes('建议专科评估（门诊）'), false)
  assert.equal(upwardDisplaySource.includes('期望处理方式'), true)
  assert.equal(referralDetailSource.includes('承接方式偏好'), false)
  assert.equal(referralDetailSource.includes('基层来源信息，仅供参考'), false)
  assert.equal(referralDetailSource.includes('getUpwardDetailSections(ref, consentInfo)'), true)
  assert.equal(upwardDisplaySource.includes('门诊关联信息'), true)
  assert.equal(upwardDisplaySource.includes('本次住院信息'), true)
  assert.equal(upwardDisplaySource.includes('诊断与转诊目的'), true)
  assert.equal(upwardDisplaySource.includes('目标医院与处理方式'), true)
  assert.equal(upwardDisplaySource.includes('已上传资料清单'), true)
  assert.equal(upwardDisplaySource.includes('急诊信息'), true)
  assert.equal(upwardDisplaySource.includes('接收准备'), true)
})

test('shows explicit consent upload guidance before normal referral can proceed', () => {
  const createReferralSource = fs.readFileSync(path.join(rootDir, 'pages/primary/CreateReferral.jsx'), 'utf8')
  const consentPanelSource = fs.readFileSync(path.join(rootDir, 'components/ConsentOfflinePanel.jsx'), 'utf8')

  assert.equal(consentPanelSource.includes('选择已签署文件'), true)
  assert.equal(createReferralSource.includes('请上传已签署的知情同意书后继续'), true)
  assert.equal(createReferralSource.includes('showIntroTitle={false}'), true)
  assert.equal(createReferralSource.includes('showIntroDescription={false}'), true)
  assert.equal(createReferralSource.includes('templateButtonVariant="uniform"'), true)
})

test('keeps emergency initiation changes scoped to the primary-doctor emergency page', () => {
  const createReferralSource = fs.readFileSync(path.join(rootDir, 'pages/primary/CreateReferral.jsx'), 'utf8')
  const emergencySection = createReferralSource.split('const renderEmergencyFlow = () => (')[1] || ''

  assert.equal(emergencySection.includes('患者资料获取'), true)
  assert.equal(emergencySection.includes('搜索患者'), true)
  assert.equal(emergencySection.includes('新增患者'), true)
  assert.equal(emergencySection.includes('在医共体平台患者主索引中按姓名或身份证号搜索'), true)
  assert.equal(emergencySection.includes('✅ 已关联患者主索引'), true)
  assert.equal(emergencySection.includes('身份证号'), true)
  assert.equal(emergencySection.includes('转运评估'), true)
  assert.equal(emergencySection.includes('是否具备转运条件'), true)
  assert.equal(emergencySection.includes('转运需求'), true)
  assert.equal(createReferralSource.includes('适合转运'), true)
  assert.equal(createReferralSource.includes('需评估后转运'), true)
  assert.equal(createReferralSource.includes('吸氧'), true)
  assert.equal(createReferralSource.includes('监护'), true)
  assert.equal(createReferralSource.includes('担架'), true)
  assert.equal(createReferralSource.includes('医护陪同'), true)
  assert.equal(createReferralSource.includes('120转运'), true)
  assert.equal(createReferralSource.includes('仅用于患者已先行到院后的事后登记，不触发实时通知，不作为实时接诊依据'), true)
  assert.equal(createReferralSource.includes('确认切换'), true)
  assert.equal(emergencySection.includes('患者当前就诊类型'), false)
  assert.equal(emergencySection.includes('已选：'), false)
  assert.equal(emergencySection.includes('renderSourceVisitTypeSelector'), false)
  assert.equal(createReferralSource.includes('转院目的与转运评估'), false)
})

test('upgrades referral closure timeline visual hierarchy for detail pages', () => {
  const closureTimelineSource = fs.readFileSync(path.join(rootDir, 'components/ReferralClosureTimeline.jsx'), 'utf8')

  assert.equal(closureTimelineSource.includes('流程进度'), true)
  assert.equal(closureTimelineSource.includes('完成进度'), false)
  assert.equal(closureTimelineSource.includes('当前节点'), false)
  assert.equal(closureTimelineSource.includes('关键说明'), false)
  assert.equal(closureTimelineSource.includes('clipPath: getArrowClipPath'), true)
  assert.equal(closureTimelineSource.includes('{event.label}'), true)
})

test('hides closure timeline for retro emergency referrals while keeping shared detail entry for others', () => {
  const detailSource = fs.readFileSync(path.join(rootDir, 'pages/shared/ReferralDetail.jsx'), 'utf8')

  assert.equal(detailSource.includes('{!(isEmergencyReferral && isRetroEntry) && ('), true)
  assert.equal(detailSource.includes('<ReferralClosureTimeline type={ref.type} events={closureEvents} />'), true)
})

test('adds the upward transfer-up close option, county doctor close access, and print export actions', () => {
  const detailSource = fs.readFileSync(path.join(rootDir, 'pages/shared/ReferralDetail.jsx'), 'utf8')

  assert.equal(detailSource.includes('需转诊至上级机构'), true)
  assert.equal(detailSource.includes('currentRole === ROLES.PRIMARY || isCountyAttendingDoctor'), true)
  assert.equal(detailSource.includes('打印转诊单'), true)
  assert.equal(detailSource.includes('协商关闭后如需继续转诊至上级机构，可打印或导出当前转诊单。'), true)
})

test('keeps downward detail pages on one unified five-section structure across roles', () => {
  const detailSource = fs.readFileSync(path.join(rootDir, 'pages/shared/ReferralDetail.jsx'), 'utf8')
  const downwardDisplaySource = fs.readFileSync(path.join(rootDir, 'utils/downwardReferralDisplay.js'), 'utf8')

  assert.equal(downwardDisplaySource.includes("title: '患者信息'"), true)
  assert.equal(downwardDisplaySource.includes("title: '转出资料'"), true)
  assert.equal(downwardDisplaySource.includes("title: '基层执行方案'"), true)
  assert.equal(downwardDisplaySource.includes("title: '接收安排'"), true)
  assert.equal(downwardDisplaySource.includes("title: '知情同意'"), true)
  assert.equal(detailSource.includes("!isDownward ? { key: 'clinical', label: '转诊资料' } : null"), true)
})

test('adds the requested record status filters for county and primary downward views', () => {
  const countyDownwardRecordsSource = fs.readFileSync(path.join(rootDir, 'pages/county/DownwardRecords.jsx'), 'utf8')
  const countyReferralRecordsSource = fs.readFileSync(path.join(rootDir, 'pages/county/ReferralRecords.jsx'), 'utf8')
  const primaryDownwardRecordsSource = fs.readFileSync(path.join(rootDir, 'pages/primary/DownwardRecords.jsx'), 'utf8')

  assert.equal(countyDownwardRecordsSource.includes("const allStatus = ['全部', '草稿', '待接收', '转诊中', '已完成', '已退回', '已撤销', '已关闭']"), true)
  assert.equal(countyReferralRecordsSource.includes("const allStatus = ['全部', '待受理', '转诊中', '已完成', '已拒绝', '已撤销', '已关闭']"), true)
  assert.equal(primaryDownwardRecordsSource.includes("const allStatus = ['全部', '待接收', '转诊中', '已完成', '已拒绝', '已退回', '已撤销', '已关闭']"), true)
})

test('separates downward doctor rejection from institution return across lists and detail dialogs', () => {
  const mockDataSource = fs.readFileSync(path.join(rootDir, 'data/mockData.js'), 'utf8')
  const primaryDownwardListSource = fs.readFileSync(path.join(rootDir, 'pages/primary/DownwardList.jsx'), 'utf8')
  const primaryDownwardRecordsSource = fs.readFileSync(path.join(rootDir, 'pages/primary/DownwardRecords.jsx'), 'utf8')
  const countyDownwardRecordsSource = fs.readFileSync(path.join(rootDir, 'pages/county/DownwardRecords.jsx'), 'utf8')
  const detailSource = fs.readFileSync(path.join(rootDir, 'pages/shared/ReferralDetail.jsx'), 'utf8')

  assert.equal(mockDataSource.includes("RETURNED: '已退回'"), true)
  assert.equal(primaryDownwardListSource.includes("const STATUS_FILTERS = ['全部', '待接收', '转诊中', '已完成', '已退回', '已撤销', '已关闭']"), true)
  assert.equal(primaryDownwardRecordsSource.includes("const allStatus = ['全部', '待接收', '转诊中', '已完成', '已退回', '已撤销', '已关闭']"), true)
  assert.equal(countyDownwardRecordsSource.includes("const allStatus = ['全部', '待接收', '转诊中', '已完成', '已退回', '已撤销', '已关闭']"), true)
  assert.equal(detailSource.includes('当前无对应接收能力'), true)
  assert.equal(detailSource.includes('当前床位/接诊资源不足'), true)
  assert.equal(detailSource.includes('暂无合适承接医生'), true)
  assert.equal(detailSource.includes('退回下转申请'), true)
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

  assert.equal(createDownwardSource.includes('直接通知指定医生，同时抄送基层负责人'), true)
  assert.equal(createDownwardSource.includes('由县级医生直接指定接收人，基层负责人同步知情。'), false)
})

test('removes county downward source and pull-status helper copy from the patient-and-discharge step', () => {
  const createDownwardSource = fs.readFileSync(path.join(rootDir, 'pages/county/CreateDownward.jsx'), 'utf8')

  assert.equal(createDownwardSource.includes('数据状态：已成功带出患者与出院资料'), false)
  assert.equal(createDownwardSource.includes('拉取状态：'), false)
  assert.equal(createDownwardSource.includes("SectionTitle title=\"出院资料\" desc=\"当前诊断、诊疗摘要、出院医嘱和附件资料在本页唯一展示，不再重复确认。\""), false)
  assert.equal(createDownwardSource.includes("FieldLabel required hint={patientInfoLocked ? '来自医共体健康档案' : ''}>姓名"), false)
  assert.equal(createDownwardSource.includes("FieldLabel required hint={patientInfoLocked ? '来自医共体健康档案' : ''}>联系电话"), false)
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

  assert.equal(timeoutSource.includes('关键业务时限'), true)
  assert.equal(timeoutSource.includes('系统内置规则说明'), true)
  assert.equal(timeoutSource.includes('规则变更立即生效，仅影响后续进入该环节的单据；硬约束规则不可修改。'), false)

  assert.equal(operationLogSource.includes("alert('导出操作日志 CSV"), false)
  assert.equal(operationLogSource.includes('导出任务已创建，可在日志中心下载 CSV 文件。'), true)
  assert.equal(operationLogSource.includes('getSystemOperationLogs'), true)
  assert.equal(systemConfigSource.includes('林系统管理员'), true)
  assert.equal(operationLogSource.includes('配置域'), true)
})

test('excludes draft and pending-internal-review referrals from admin ledger mock display', () => {
  const ledgerSource = fs.readFileSync(path.join(rootDir, 'pages/admin/Ledger.jsx'), 'utf8')

  assert.equal(ledgerSource.includes('UPWARD_STATUS.DRAFT'), true)
  assert.equal(ledgerSource.includes('UPWARD_STATUS.PENDING_INTERNAL_REVIEW'), true)
  assert.equal(ledgerSource.includes('if ([UPWARD_STATUS.DRAFT, UPWARD_STATUS.PENDING_INTERNAL_REVIEW].includes(r.status)) return false'), true)
})

test('removes referral template config menu while keeping audit rules and disease config intact', () => {
  const formTemplatePath = path.join(rootDir, 'pages/admin/FormTemplate.jsx')
  const appSource = fs.readFileSync(path.join(rootDir, 'App.jsx'), 'utf8')
  const layoutSource = fs.readFileSync(path.join(rootDir, 'components/Layout.jsx'), 'utf8')
  const auditRuleSource = fs.readFileSync(path.join(rootDir, 'pages/admin/AuditRuleConfig.jsx'), 'utf8')
  const diseaseSource = fs.readFileSync(path.join(rootDir, 'pages/admin/DiseaseDir.jsx'), 'utf8')
  const systemConfigSource = fs.readFileSync(path.join(rootDir, 'data/systemAdminConfig.js'), 'utf8')

  assert.equal(fs.existsSync(formTemplatePath), false)
  assert.equal(appSource.includes('/admin/form-template'), false)
  assert.equal(layoutSource.includes('转诊单模板'), false)
  assert.equal(systemConfigSource.includes('表单模板'), false)
  assert.equal(systemConfigSource.includes('SYSTEM_FORM_UP_FIELDS'), false)
  assert.equal(systemConfigSource.includes('SYSTEM_FORM_DOWN_FIELDS'), false)
  assert.equal(systemConfigSource.includes('SYSTEM_FORM_PHRASES'), false)

  assert.equal(auditRuleSource.includes('配置机构与科室的转入/转出院内审核规则'), true)
  assert.equal(auditRuleSource.includes('本页承载既定业务规则配置，不改变急诊豁免等固定政策。'), true)
  assert.equal(auditRuleSource.includes('转入审核'), true)
  assert.equal(auditRuleSource.includes('转出审核'), true)
  assert.equal(auditRuleSource.includes('SYSTEM_ADMIN_OPERATOR'), true)
  assert.equal(systemConfigSource.includes('林系统管理员'), true)
  assert.equal(auditRuleSource.includes('急诊转入无论开关状态自动豁免院内审核'), true)

  assert.equal(diseaseSource.includes('专病规则配置'), true)
  assert.equal(diseaseSource.includes('主数据同步自医共体术语信息系统'), true)
  assert.equal(diseaseSource.includes('只展示已标记为业务病种的条目'), true)
  assert.equal(diseaseSource.includes('ICD-10 搜索选择'), true)
  assert.equal(diseaseSource.includes('标记为绿色通道病种'), true)
  assert.equal(diseaseSource.includes('政策范围'), true)
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
  assert.equal(systemAdminBlock.includes("{ path: '/admin/institution-manage', label: '工作台', icon: '📊' }"), false)
  assert.equal(systemAdminBlock.includes("{ path: '/admin/disease-dir', label: '专病规则配置' }"), true)
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
  assert.equal(countyCreateDownwardSource.includes('发起下转申请'), true)
  assert.equal(countyCreateDownwardSource.includes('患者与出院资料'), true)
  assert.equal(countyCreateDownwardSource.includes('康复方案与接收安排'), true)
  assert.equal(countyCreateDownwardSource.includes('知情同意'), true)
  assert.equal(countyCreateDownwardSource.includes('提交确认'), true)
  assert.equal(countyCreateDownwardSource.includes('患者与基本信息'), false)
  assert.equal(countyCreateDownwardSource.includes('转出交接资料'), false)
  assert.equal(countyCreateDownwardSource.includes('转出资料与康复方案'), false)
  assert.equal(countyCreateDownwardSource.includes('下转原因'), true)
  assert.equal(countyCreateDownwardSource.includes('提交下转申请'), true)
})

test('restructures county downward creation into the new four-step information flow', () => {
  const createDownwardSource = fs.readFileSync(path.join(rootDir, 'pages/county/CreateDownward.jsx'), 'utf8')

  assert.equal(createDownwardSource.includes("const STEPS = ['患者与出院资料', '康复方案与接收安排', '知情同意', '提交确认']"), true)
  assert.equal(createDownwardSource.includes('患者确认与档案校验'), false)
  assert.equal(createDownwardSource.includes('患者基本信息'), true)
  assert.equal(createDownwardSource.includes('出院核心摘要'), true)
  assert.equal(createDownwardSource.includes('继续用药'), true)
  assert.equal(createDownwardSource.includes('用药注意事项'), true)
  assert.equal(createDownwardSource.includes('<SectionTitle title="复查建议" />'), false)
  assert.equal(createDownwardSource.includes('检查/检验附件资料'), true)
  assert.equal(createDownwardSource.includes('请输入患者姓名 / 身份证号 / 住院号'), true)
  assert.equal(createDownwardSource.includes('检索患者'), true)
  assert.equal(createDownwardSource.includes('新增患者'), true)
  assert.equal(createDownwardSource.includes('选择该患者'), true)
  assert.equal(createDownwardSource.includes('已选择患者：'), true)
  assert.equal(createDownwardSource.includes('更换患者'), true)
  assert.equal(createDownwardSource.includes('重新拉取资料'), true)
  assert.equal(createDownwardSource.includes('重新拉取可能覆盖已补充或修改的下转资料，是否继续？'), true)
  assert.equal(createDownwardSource.includes('继续拉取'), true)
  assert.equal(createDownwardSource.includes('最近一次出院记录时间'), true)
  assert.equal(createDownwardSource.includes('资料更新时间'), true)
  assert.equal(createDownwardSource.includes('✅ 已获取'), true)
  assert.equal(createDownwardSource.includes('❌ 未获取'), true)
  assert.equal(createDownwardSource.includes('患者基础信息'), true)
  assert.equal(createDownwardSource.includes('手工修改仅作用于本次下转申请，不回写健康档案'), true)
  assert.equal(createDownwardSource.includes('签约家庭医生'), false)
  assert.equal(createDownwardSource.includes('出院诊断/主要诊断'), true)
  assert.equal(createDownwardSource.includes('出院小结摘要'), true)
  assert.equal(createDownwardSource.includes('下转交接摘要'), true)
  assert.equal(createDownwardSource.includes('西药/中成药'), true)
  assert.equal(createDownwardSource.includes('中药'), true)
  assert.equal(createDownwardSource.includes('药品名称'), true)
  assert.equal(createDownwardSource.includes('单次剂量'), true)
  assert.equal(createDownwardSource.includes('用药方法'), true)
  assert.equal(createDownwardSource.includes('用药方式/途径'), false)
  assert.equal(createDownwardSource.includes('频次'), true)
  assert.equal(createDownwardSource.includes('血府逐瘀方'), true)
  assert.equal(createDownwardSource.includes('当归 10g'), true)
  assert.equal(createDownwardSource.includes('赤芍 10g'), true)
  assert.equal(createDownwardSource.includes('水煎服'), true)
  assert.equal(createDownwardSource.includes('每日1剂'), true)
  assert.equal(createDownwardSource.includes('更多信息'), true)
  assert.equal(createDownwardSource.includes('用药注意事项'), true)
  assert.equal(createDownwardSource.includes('推荐资料包'), true)
  assert.equal(createDownwardSource.includes('可勾选是否发送'), false)
  assert.equal(createDownwardSource.includes('补充资料'), true)
  assert.equal(createDownwardSource.includes('推荐资料缺失时仅提醒，不阻断提交'), true)
  assert.equal(createDownwardSource.includes('康复方案与接收安排'), true)
  assert.equal(createDownwardSource.includes('接收安排'), true)
  assert.equal(createDownwardSource.includes('目标基层机构'), true)
  assert.equal(createDownwardSource.includes('接收方式'), true)
  assert.equal(createDownwardSource.includes('指定接收医生'), true)
  assert.equal(createDownwardSource.includes('下转原因'), true)
  assert.equal(createDownwardSource.includes('下转触发方'), true)
  assert.equal(createDownwardSource.includes('医生医学判断'), true)
  assert.equal(createDownwardSource.includes('患者/家属主动要求'), true)
  assert.equal(createDownwardSource.includes('两者共同决定'), true)
  assert.equal(createDownwardSource.includes('康复目标'), true)
  assert.equal(createDownwardSource.includes('首次随访时间'), true)
  assert.equal(createDownwardSource.includes('监测指标'), true)
  assert.equal(createDownwardSource.includes('护理要点'), true)
  assert.equal(createDownwardSource.includes('预警症状'), true)
  assert.equal(createDownwardSource.includes('补充说明'), true)
  assert.equal(createDownwardSource.includes('请选择基层随访时需要重点观察的指标，可勾选推荐项，也可补充自定义指标。'), true)
  assert.equal(createDownwardSource.includes('血压'), true)
  assert.equal(createDownwardSource.includes('用药依从性'), true)
  assert.equal(createDownwardSource.includes('肢体活动情况'), true)
  assert.equal(createDownwardSource.includes('补充其他需要随访观察的指标'), true)
  assert.equal(createDownwardSource.includes('下载模板并完成线下签字后，上传签字文件并确认文件完整性。'), true)
  assert.equal(createDownwardSource.includes('下载模板'), true)
  assert.equal(createDownwardSource.includes('上传签字文件'), true)
  assert.equal(createDownwardSource.includes('签署人类型'), true)
  assert.equal(createDownwardSource.includes('家属姓名'), true)
  assert.equal(createDownwardSource.includes('与患者关系'), true)
  assert.equal(createDownwardSource.includes('代签原因'), true)
  assert.equal(createDownwardSource.includes('确认已核对签字文件完整性'), true)
  assert.equal(createDownwardSource.includes('本次转出信息确认'), false)
  assert.equal(createDownwardSource.includes('患者与出院资料'), true)
  assert.equal(createDownwardSource.includes('康复方案与接收安排'), true)
  assert.equal(createDownwardSource.includes('返回修改'), true)
  assert.equal(createDownwardSource.includes('知情同意'), true)
  assert.equal(createDownwardSource.includes('张桂芳'), true)
  assert.equal(createDownwardSource.includes('刘建国'), true)
  assert.equal(createDownwardSource.includes('510623********1248'), true)
  assert.equal(createDownwardSource.includes('510623********5621'), true)
  assert.equal(createDownwardSource.includes('13800138000'), true)
  assert.equal(createDownwardSource.includes('13900139000'), true)
  assert.equal(createDownwardSource.includes('xx市人民医院心内科住院，2026/04/10 出院'), true)
  assert.equal(createDownwardSource.includes('xx市人民医院神经内科住院，2026/04/12 出院'), true)
  assert.equal(createDownwardSource.includes('冠状动脉粥样硬化性心脏病'), true)
  assert.equal(createDownwardSource.includes('I25.1'), true)
  assert.equal(createDownwardSource.includes('患者因反复胸闷胸痛住院治疗'), true)
  assert.equal(createDownwardSource.includes('阿司匹林肠溶片'), true)
  assert.equal(createDownwardSource.includes("singleDose: '100mg'"), true)
  assert.equal(createDownwardSource.includes("route: '口服'"), true)
  assert.equal(createDownwardSource.includes("frequency: 'qd 饭后'"), true)
  assert.equal(createDownwardSource.includes('连服3个月'), true)
  assert.equal(createDownwardSource.includes('当前病情平稳，建议下转基层继续康复管理与长期随访'), true)
  assert.equal(createDownwardSource.includes('出院小结.pdf'), true)
  assert.equal(createDownwardSource.includes('心电图报告.pdf'), true)
  assert.equal(createDownwardSource.includes('血脂检验报告.pdf'), true)
  assert.equal(createDownwardSource.includes('冠脉CTA报告.pdf'), true)
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
  assert.equal(referralDetailSource.includes('upwardDetailSections.map(summary => ('), true)
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
  const auditRuleSource = fs.readFileSync(path.join(rootDir, 'pages/admin/AuditRuleConfig.jsx'), 'utf8')
  const auditRuleDataSource = fs.readFileSync(path.join(rootDir, 'data/auditRuleConfig.js'), 'utf8')
  const diseaseSource = fs.readFileSync(path.join(rootDir, 'pages/admin/DiseaseDir.jsx'), 'utf8')

  assert.equal(systemConfigSource.includes('export const SYSTEM_USER_ACCOUNTS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_INSTITUTION_CONFIGS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_DEPT_CONFIGS = {'), true)
  assert.equal(systemConfigSource.includes('export let SYSTEM_OPERATION_LOGS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_NOTIFY_SYS_TEMPLATES = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_TIMEOUT_RULES = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_FORM_UP_FIELDS = ['), false)
  assert.equal(systemConfigSource.includes('export const SYSTEM_AUDIT_INSTITUTIONS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_AUDIT_CANDIDATE_USERS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_AUDIT_RULE_SEEDS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_DISEASE_CATEGORIES = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_TERMINOLOGY_ICD10_MASTER = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_DISEASE_SPECIALTY_OPTIONS = ['), true)
  assert.equal(systemConfigSource.includes('export const SYSTEM_DISEASE_POLICY_SCOPE_OPTIONS = ['), true)
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

  assert.equal(timeoutSource.includes('SYSTEM_TIMEOUT_RULES'), true)
  assert.equal(timeoutSource.includes('规则类型'), false)
  assert.equal(timeoutSource.includes('适用场景'), false)
  assert.equal(timeoutSource.includes('const INIT_UP_RULES = ['), false)
  assert.equal(timeoutSource.includes('const INIT_DOWN_RULES = ['), false)

  assert.equal(systemConfigSource.includes('SYSTEM_FORM_UP_FIELDS'), false)
  assert.equal(systemConfigSource.includes('SYSTEM_FORM_DOWN_FIELDS'), false)
  assert.equal(systemConfigSource.includes('SYSTEM_FORM_PHRASES'), false)

  assert.equal(auditRuleSource.includes('SYSTEM_ADMIN_OPERATOR'), true)
  assert.equal(auditRuleSource.includes('SYSTEM_AUDIT_INSTITUTIONS'), true)
  assert.equal(auditRuleSource.includes("from '../../data/mockData'"), false)
  assert.equal(auditRuleSource.includes("const CURRENT_OPERATOR = '林系统管理员'"), false)

  assert.equal(auditRuleDataSource.includes('SYSTEM_AUDIT_CANDIDATE_USERS'), true)
  assert.equal(auditRuleDataSource.includes('SYSTEM_AUDIT_RULE_SEEDS'), true)
  assert.equal(auditRuleDataSource.includes('export const AUDIT_CANDIDATE_USERS = ['), false)

  assert.equal(diseaseSource.includes('SYSTEM_DISEASE_CATEGORIES'), true)
  assert.equal(diseaseSource.includes('SYSTEM_TERMINOLOGY_ICD10_MASTER'), true)
  assert.equal(diseaseSource.includes('SYSTEM_DISEASE_SPECIALTY_OPTIONS'), true)
  assert.equal(diseaseSource.includes('SYSTEM_DISEASE_POLICY_SCOPE_OPTIONS'), true)
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

  assert.equal(timeoutSource.includes('生效影响提示'), false)
  assert.equal(timeoutSource.includes('已产生的超时记录不会自动回写'), false)
  assert.equal(timeoutSource.includes('该规则为硬约束，不允许禁用'), false)
  assert.equal(timeoutSource.includes('仅为界面演示，不会触发真实超时逻辑'), false)

  assert.equal(notifySource.includes('生效影响提示'), true)
  assert.equal(notifySource.includes('已发送通知不回溯修改'), true)

  assert.equal(auditRuleSource.includes('生效影响提示'), true)
  assert.equal(auditRuleSource.includes('已进入流程的单据不回写原审核路径'), true)
})

test('rebuilds timeout rules page around the MVP key-business-time-limit structure', () => {
  const systemConfigSource = fs.readFileSync(path.join(rootDir, 'data/systemAdminConfig.js'), 'utf8')
  const timeoutSource = fs.readFileSync(path.join(rootDir, 'pages/admin/TimeoutConfig.jsx'), 'utf8')

  assert.equal(systemConfigSource.includes('export const SYSTEM_TIMEOUT_RULES = ['), true)
  assert.equal(systemConfigSource.includes("id: 'timeout-upward-unclaimed'"), true)
  assert.equal(systemConfigSource.includes("id: 'timeout-upward-arrangement'"), true)
  assert.equal(systemConfigSource.includes("id: 'timeout-downward-doctor'"), true)
  assert.equal(systemConfigSource.includes('转诊中 7 天自动关闭'), true)
  assert.equal(systemConfigSource.includes('急诊 15 分钟紧急修改窗口'), true)
  assert.equal(systemConfigSource.includes('预约码 48h 失效'), true)
  assert.equal(systemConfigSource.includes('床位锁定 48h 释放'), true)
  assert.equal(timeoutSource.includes('关键业务时限'), true)
  assert.equal(timeoutSource.includes('业务环节'), true)
  assert.equal(timeoutSource.includes('默认时限'), true)
  assert.equal(timeoutSource.includes('超时处理'), true)
  assert.equal(timeoutSource.includes('是否可调整'), true)
  assert.equal(timeoutSource.includes('规则类型'), false)
  assert.equal(timeoutSource.includes('状态自动流转'), false)
  assert.equal(timeoutSource.includes('急诊科值班联系人'), false)
  assert.equal(timeoutSource.includes('患者（微信）'), false)
  assert.equal(timeoutSource.includes('重置筛选'), false)
  assert.equal(timeoutSource.includes('系统内置规则说明'), true)
  assert.equal(timeoutSource.includes('普通上转无人受理'), true)
  assert.equal(timeoutSource.includes('下转负责人分配超时'), true)
  assert.equal(timeoutSource.includes('转诊中 7 天自动关闭'), true)
  assert.equal(timeoutSource.includes('异常管理'), false)
})

test('writes key system-admin configuration actions into shared operation logs', () => {
  const systemConfigSource = fs.readFileSync(path.join(rootDir, 'data/systemAdminConfig.js'), 'utf8')
  const operationLogSource = fs.readFileSync(path.join(rootDir, 'pages/admin/OperationLog.jsx'), 'utf8')
  const roleManageSource = fs.readFileSync(path.join(rootDir, 'pages/admin/RoleManage.jsx'), 'utf8')
  const timeoutSource = fs.readFileSync(path.join(rootDir, 'pages/admin/TimeoutConfig.jsx'), 'utf8')
  const notifySource = fs.readFileSync(path.join(rootDir, 'pages/admin/NotifyTemplate.jsx'), 'utf8')
  const auditRuleSource = fs.readFileSync(path.join(rootDir, 'pages/admin/AuditRuleConfig.jsx'), 'utf8')
  const institutionManageSource = fs.readFileSync(path.join(rootDir, 'pages/admin/InstitutionManage.jsx'), 'utf8')
  const diseaseSource = fs.readFileSync(path.join(rootDir, 'pages/admin/DiseaseDir.jsx'), 'utf8')

  assert.equal(systemConfigSource.includes('export function appendSystemOperationLog('), true)
  assert.equal(systemConfigSource.includes("window.dispatchEvent(new CustomEvent('system-operation-log-updated'))"), true)
  assert.equal(systemConfigSource.includes("'专病规则配置'"), true)
  assert.equal(operationLogSource.includes('getSystemOperationLogs'), true)
  assert.equal(operationLogSource.includes("window.addEventListener('system-operation-log-updated'"), true)

  assert.equal(roleManageSource.includes('appendSystemOperationLog'), true)
  assert.equal(timeoutSource.includes('appendSystemOperationLog'), true)
  assert.equal(notifySource.includes('appendSystemOperationLog'), true)
  assert.equal(auditRuleSource.includes('appendSystemOperationLog'), true)
  assert.equal(institutionManageSource.includes('appendSystemOperationLog'), true)
  assert.equal(systemConfigSource.includes('表单模板'), false)
  assert.equal(diseaseSource.includes('appendSystemOperationLog'), true)
})

test('removes demo and integration placeholder copy from consent and review pages', () => {
  const files = [
    path.join(rootDir, 'components/ConsentOfflinePanel.jsx'),
    path.join(rootDir, 'utils/consentUpload.js'),
    path.join(rootDir, 'pages/primary/CreateReferral.jsx'),
    path.join(rootDir, 'pages/county/CreateDownward.jsx'),
    path.join(rootDir, 'pages/county/InternalReview.jsx'),
    path.join(rootDir, 'pages/shared/ReferralDetail.jsx'),
  ]

  const bannedPhrases = [
    '演示版',
    '待对接',
    'TODO: 待对接数据',
    '后续版本接入',
    '后续接入',
    '仅展示按钮',
    '仅保留演示入口',
    '入口位置用于演示',
    '当前仅展示记录',
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

test('adds shared structured reason constants and selector for CHG-43', () => {
  const reasonCodesSource = fs.readFileSync(path.join(rootDir, 'constants/reasonCodes.js'), 'utf8')
  const selectorSource = fs.readFileSync(path.join(rootDir, 'components/StructuredReasonSelector.jsx'), 'utf8')

  assert.equal(reasonCodesSource.includes('UPWARD_REFERRAL_PURPOSE_OPTIONS'), true)
  assert.equal(reasonCodesSource.includes('need_higher_level'), true)
  assert.equal(reasonCodesSource.includes("需转诊至上级机构"), true)
  assert.equal(reasonCodesSource.includes('acute_treatment_completed'), true)
  assert.equal(reasonCodesSource.includes('DOWNWARD_INSTITUTION_RETURN_REASON_OPTIONS'), true)
  assert.equal(reasonCodesSource.includes('INTERNAL_REJECT_REASON_OPTIONS'), true)
  assert.equal(selectorSource.includes('StructuredReasonSelector'), true)
  assert.equal(selectorSource.includes('showOtherInput'), true)
  assert.equal(selectorSource.includes("option.code === otherCode"), true)
})

test('uses structured referral purpose and downward reason fields on creation pages', () => {
  const createReferralSource = fs.readFileSync(path.join(rootDir, 'pages/primary/CreateReferral.jsx'), 'utf8')
  const createDownwardSource = fs.readFileSync(path.join(rootDir, 'pages/county/CreateDownward.jsx'), 'utf8')
  const downwardDisplaySource = fs.readFileSync(path.join(rootDir, 'utils/downwardReferralDisplay.js'), 'utf8')

  assert.equal(createReferralSource.includes('UPWARD_REFERRAL_PURPOSE_OPTIONS'), true)
  assert.equal(createReferralSource.includes('referralPurposeCodes'), true)
  assert.equal(createReferralSource.includes('referralPurposeText'), true)
  assert.equal(createDownwardSource.includes('DOWNWARD_REASON_OPTIONS'), true)
  assert.equal(createDownwardSource.includes('downwardReasonCode'), true)
  assert.equal(createDownwardSource.includes('downwardReasonText'), true)
  assert.equal(downwardDisplaySource.includes('downwardReasonCode'), true)
  assert.equal(downwardDisplaySource.includes('downwardReasonText'), true)
})

test('uses structured reason selector for upward and downward refusal cancel and close dialogs', () => {
  const detailSource = fs.readFileSync(path.join(rootDir, 'pages/shared/ReferralDetail.jsx'), 'utf8')
  const reasonCodesSource = fs.readFileSync(path.join(rootDir, 'constants/reasonCodes.js'), 'utf8')

  assert.equal(detailSource.includes('StructuredReasonSelector'), true)
  assert.equal(detailSource.includes('UPWARD_REJECT_REASON_OPTIONS'), true)
  assert.equal(detailSource.includes('DOWNWARD_DOCTOR_REJECT_REASON_OPTIONS'), true)
  assert.equal(detailSource.includes('DOWNWARD_INSTITUTION_RETURN_REASON_OPTIONS'), true)
  assert.equal(detailSource.includes('UPWARD_CLOSE_REASON_OPTIONS'), true)
  assert.equal(detailSource.includes('DOWNWARD_CLOSE_REASON_OPTIONS'), true)
  assert.equal(detailSource.includes('CANCEL_REASON_OPTIONS'), true)
  assert.equal(detailSource.includes('INTERNAL_REJECT_REASON_OPTIONS'), true)
  assert.equal(detailSource.includes('canTransferUpToHigherLevel'), true)
  assert.equal(detailSource.includes('const canTransferUpToHigherLevel = isUpward && isCountyAttendingDoctor'), true)
  assert.equal(reasonCodesSource.includes("需转上级医疗机构进一步处置"), false)
})

test('persists structured reason codes and text in referral state transitions', () => {
  const appContextSource = fs.readFileSync(path.join(rootDir, 'context/AppContext.jsx'), 'utf8')

  assert.equal(appContextSource.includes('normalizeStructuredReasonSelection'), true)
  assert.equal(appContextSource.includes('rejectReasonCode'), true)
  assert.equal(appContextSource.includes('rejectReasonText'), true)
  assert.equal(appContextSource.includes('cancelReasonCode'), true)
  assert.equal(appContextSource.includes('cancelReasonText'), true)
  assert.equal(appContextSource.includes('closeReasonCode'), true)
  assert.equal(appContextSource.includes('closeReasonText'), true)
  assert.equal(appContextSource.includes('designatedDoctorRejectLog'), true)
  assert.equal(appContextSource.includes('reasonCode:'), true)
  assert.equal(appContextSource.includes('reasonText:'), true)
})

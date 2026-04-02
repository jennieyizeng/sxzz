import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { ROLES } from './data/mockData'
import Layout from './components/Layout'

// Pages
import PrimaryDashboard from './pages/primary/Dashboard'
import CreateReferral from './pages/primary/CreateReferral'
import PrimaryReferralList from './pages/primary/ReferralList'
import DownwardList from './pages/primary/DownwardList'
import PrimaryFollowupList from './pages/primary/FollowupList'
import CountyDashboard from './pages/county/Dashboard'
import CountyReviewList from './pages/county/ReviewList'
import AdminDashboard from './pages/admin/Dashboard'
import AdminLedger from './pages/admin/Ledger'
import AdminStats from './pages/admin/Stats'
import AdminAnomaly from './pages/admin/Anomaly'
import AdminFollowupList from './pages/admin/FollowupList'
import AdminOperationLog from './pages/admin/OperationLog'
import AdminDataReport from './pages/admin/DataReport'
import AdminExamReport from './pages/admin/ExamReport'
import AdminDoctorPerf from './pages/admin/DoctorPerf'
import AdminInstitutionManage from './pages/admin/InstitutionManage'
import AdminRoleManage from './pages/admin/RoleManage'
import AdminFormTemplate from './pages/admin/FormTemplate'
import AdminDiseaseDir from './pages/admin/DiseaseDir'
import AdminTimeoutConfig from './pages/admin/TimeoutConfig'
import AdminNotifyTemplate from './pages/admin/NotifyTemplate'
import AdminAuditRuleConfig from './pages/admin/AuditRuleConfig'
import CountyInternalReview from './pages/county/InternalReview'
import CountyCreateDownward from './pages/county/CreateDownward'
import CountyReferralRecords from './pages/county/ReferralRecords'
import CountyDownwardRecords from './pages/county/DownwardRecords'
import DirectorDashboard from './pages/director/Dashboard'
import DirectorAnalytics from './pages/director/Analytics'
import DirectorReport from './pages/director/Report'
import ReferralDetail from './pages/shared/ReferralDetail'
import Messages from './pages/shared/Messages'
import Placeholder from './pages/shared/Placeholder'
import UserSettings from './pages/shared/UserSettings'
import AppointmentVerify from './pages/AppointmentVerify'
import PatientQuery from './pages/PatientQuery'

// 根据角色重定向到默认工作台
function RoleRedirect() {
  const { currentRole } = useApp()
  const roleDefaultPaths = {
    [ROLES.PRIMARY]:      '/primary/dashboard',
    [ROLES.PRIMARY_HEAD]: '/primary/dashboard',  // CHG-32：科主任默认也进工作台
    [ROLES.COUNTY]:       '/county/dashboard',
    [ROLES.COUNTY2]:      '/county/dashboard',
    [ROLES.ADMIN]:        '/admin/dashboard',
    [ROLES.DIRECTOR]:     '/director/dashboard',
  }
  return <Navigate to={roleDefaultPaths[currentRole] || '/primary/dashboard'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* 独立页面（无需登录，outside Layout） */}
      <Route path="/verify-appointment" element={<AppointmentVerify />} />
      <Route path="/patient-query" element={<PatientQuery />} />

      {/* 主应用（含 Layout 导航） */}
      <Route path="/*" element={
        <Layout>
          <Routes>
            {/* 根路径重定向 */}
            <Route path="/" element={<RoleRedirect />} />

        {/* ── 基层医生 ── */}
        <Route path="/primary/dashboard" element={<PrimaryDashboard />} />
        <Route path="/primary/create-referral" element={<CreateReferral />} />
        <Route path="/primary/referral-list" element={<PrimaryReferralList />} />
        <Route path="/primary/downward-list" element={<DownwardList />} />
        <Route path="/primary/downward-records" element={<Placeholder title="下转记录" />} />
        {/* M-2：基层医生/科主任的随访任务列表 */}
        <Route path="/primary/followup" element={<PrimaryFollowupList />} />
        {/* CHG-32：科主任院内审核列表（复用工作台入口，通过工作台的待内审面板处理，此路由为导航占位） */}
        <Route path="/primary/internal-review" element={<PrimaryDashboard />} />

        {/* ── 县级医生 ── */}
        <Route path="/county/dashboard" element={<CountyDashboard />} />
        <Route path="/county/review-list" element={<CountyReviewList />} />
        <Route path="/county/referral-records" element={<CountyReferralRecords />} />
        <Route path="/county/create-downward" element={<CountyCreateDownward />} />
        <Route path="/county/downward-records" element={<CountyDownwardRecords />} />
        {/* A-14 内部分级审核：MVP不做，列 Should Have 可配置项（project-memory.md 2026-03-20决策）
        <Route path="/county/internal-review" element={<CountyInternalReview />} /> */}

        {/* ── 管理员 ── */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/ledger" element={<AdminLedger />} />
        <Route path="/admin/anomaly" element={<AdminAnomaly />} />
        <Route path="/admin/followup" element={<AdminFollowupList />} />
        <Route path="/admin/stats" element={<AdminStats />} />
        <Route path="/admin/report" element={<AdminExamReport />} />
        <Route path="/admin/exam-report" element={<AdminExamReport />} />
        <Route path="/admin/doctor-perf" element={<AdminDoctorPerf />} />
        <Route path="/admin/data-report" element={<AdminDataReport />} />
        <Route path="/admin/operation-log" element={<AdminOperationLog />} />
        <Route path="/system/operation-log" element={<AdminOperationLog />} />
        <Route path="/admin/institution-manage" element={<AdminInstitutionManage />} />
        <Route path="/admin/role-manage" element={<AdminRoleManage />} />
        <Route path="/admin/form-template" element={<AdminFormTemplate />} />
        <Route path="/admin/disease-dir" element={<AdminDiseaseDir />} />
        <Route path="/admin/timeout-config" element={<AdminTimeoutConfig />} />
        <Route path="/admin/notify-template" element={<AdminNotifyTemplate />} />
        <Route path="/admin/audit-rule-config" element={<AdminAuditRuleConfig />} />
        <Route path="/admin/settings" element={<Placeholder title="系统管理" description="机构信息、角色权限、模板配置等。" />} />

        {/* ── 院长 ── */}
        <Route path="/director/dashboard" element={<DirectorDashboard />} />
        <Route path="/director/analytics" element={<DirectorAnalytics />} />
        <Route path="/director/report" element={<DirectorReport />} />

        {/* ── 共享页面 ── */}
        <Route path="/referral/:id" element={<ReferralDetail />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/settings" element={<UserSettings />} />

            {/* 404 */}
            <Route path="*" element={<Placeholder title="页面不存在" description="请检查链接是否正确" />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}

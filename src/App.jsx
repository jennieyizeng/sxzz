import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { ROLES } from './data/mockData'
import Layout from './components/Layout'

// Pages
import PrimaryDashboard from './pages/primary/Dashboard'
import CreateReferral from './pages/primary/CreateReferral'
import PrimaryReferralList from './pages/primary/ReferralList'
import DownwardList from './pages/primary/DownwardList'
import PrimaryDownwardRecords from './pages/primary/DownwardRecords'
import PrimaryFollowupList from './pages/primary/FollowupList'
import PrimaryFollowupTaskDetail from './pages/primary/FollowupTaskDetail'
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
    [ROLES.SYSTEM_ADMIN]: '/admin/institution-manage',
    [ROLES.DIRECTOR]:     '/director/dashboard',
  }
  return <Navigate to={roleDefaultPaths[currentRole] || '/primary/dashboard'} replace />
}

function RoleRoute({ allowedRoles, children }) {
  const { currentRole } = useApp()

  if (!allowedRoles.includes(currentRole)) {
    return <Placeholder title="无权限访问" description="当前角色暂无此页面访问权限，请切换到有权限的角色后重试。" />
  }

  return children
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
        <Route path="/primary/dashboard" element={<RoleRoute allowedRoles={[ROLES.PRIMARY, ROLES.PRIMARY_HEAD]}><PrimaryDashboard mode="workbench" /></RoleRoute>} />
        <Route path="/primary/create-referral" element={<RoleRoute allowedRoles={[ROLES.PRIMARY]}><CreateReferral /></RoleRoute>} />
        <Route path="/primary/referral-list" element={<RoleRoute allowedRoles={[ROLES.PRIMARY, ROLES.PRIMARY_HEAD]}><PrimaryReferralList /></RoleRoute>} />
        <Route path="/primary/downward-list" element={<RoleRoute allowedRoles={[ROLES.PRIMARY, ROLES.PRIMARY_HEAD]}><DownwardList /></RoleRoute>} />
        <Route path="/primary/downward-records" element={<RoleRoute allowedRoles={[ROLES.PRIMARY, ROLES.PRIMARY_HEAD]}><PrimaryDownwardRecords /></RoleRoute>} />
        {/* M-2：基层医生/科主任的随访任务列表 */}
        <Route path="/primary/followup" element={<RoleRoute allowedRoles={[ROLES.PRIMARY, ROLES.PRIMARY_HEAD]}><PrimaryFollowupList /></RoleRoute>} />
        <Route path="/primary/followup-task/:id" element={<RoleRoute allowedRoles={[ROLES.PRIMARY, ROLES.PRIMARY_HEAD]}><PrimaryFollowupTaskDetail /></RoleRoute>} />
        <Route path="/primary/internal-review" element={<RoleRoute allowedRoles={[ROLES.PRIMARY_HEAD]}><PrimaryDashboard mode="internalReview" /></RoleRoute>} />

        {/* ── 县级医生 ── */}
        <Route path="/county/dashboard" element={<RoleRoute allowedRoles={[ROLES.COUNTY, ROLES.COUNTY2]}><CountyDashboard /></RoleRoute>} />
        <Route path="/county/review-list" element={<RoleRoute allowedRoles={[ROLES.COUNTY, ROLES.COUNTY2]}><CountyReviewList /></RoleRoute>} />
        <Route path="/county/referral-records" element={<RoleRoute allowedRoles={[ROLES.COUNTY, ROLES.COUNTY2]}><CountyReferralRecords /></RoleRoute>} />
        <Route path="/county/create-downward" element={<RoleRoute allowedRoles={[ROLES.COUNTY, ROLES.COUNTY2]}><CountyCreateDownward /></RoleRoute>} />
        <Route path="/county/downward-records" element={<RoleRoute allowedRoles={[ROLES.COUNTY, ROLES.COUNTY2]}><CountyDownwardRecords /></RoleRoute>} />
        {/* A-14 内部分级审核：MVP不做，列 Should Have 可配置项（project-memory.md 2026-03-20决策）
        <Route path="/county/internal-review" element={<CountyInternalReview />} /> */}

        {/* ── 管理员 ── */}
        <Route path="/admin/dashboard" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminDashboard /></RoleRoute>} />
        <Route path="/admin/ledger" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminLedger /></RoleRoute>} />
        <Route path="/admin/anomaly" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminAnomaly /></RoleRoute>} />
        <Route path="/admin/followup" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminFollowupList /></RoleRoute>} />
        <Route path="/admin/stats" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminStats /></RoleRoute>} />
        <Route path="/admin/report" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminExamReport /></RoleRoute>} />
        <Route path="/admin/exam-report" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminExamReport /></RoleRoute>} />
        <Route path="/admin/doctor-perf" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminDoctorPerf /></RoleRoute>} />
        <Route path="/admin/data-report" element={<RoleRoute allowedRoles={[ROLES.ADMIN]}><AdminDataReport /></RoleRoute>} />
        <Route path="/admin/operation-log" element={<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}><AdminOperationLog /></RoleRoute>} />
        <Route path="/system/operation-log" element={<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}><AdminOperationLog /></RoleRoute>} />
        <Route path="/admin/institution-manage" element={<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}><AdminInstitutionManage /></RoleRoute>} />
        <Route path="/admin/role-manage" element={<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}><AdminRoleManage /></RoleRoute>} />
        <Route path="/admin/form-template" element={<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}><AdminFormTemplate /></RoleRoute>} />
        <Route path="/admin/disease-dir" element={<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}><AdminDiseaseDir /></RoleRoute>} />
        <Route path="/admin/timeout-config" element={<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}><AdminTimeoutConfig /></RoleRoute>} />
        <Route path="/admin/notify-template" element={<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}><AdminNotifyTemplate /></RoleRoute>} />
        <Route path="/admin/audit-rule-config" element={<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}><AdminAuditRuleConfig /></RoleRoute>} />
        <Route path="/admin/settings" element={<RoleRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}><Placeholder title="系统管理" description="机构信息、角色权限、模板配置等。" /></RoleRoute>} />

        {/* ── 院长 ── */}
        <Route path="/director/dashboard" element={<RoleRoute allowedRoles={[ROLES.DIRECTOR]}><DirectorDashboard /></RoleRoute>} />
        <Route path="/director/analytics" element={<RoleRoute allowedRoles={[ROLES.DIRECTOR]}><DirectorAnalytics /></RoleRoute>} />
        <Route path="/director/report" element={<RoleRoute allowedRoles={[ROLES.DIRECTOR]}><DirectorReport /></RoleRoute>} />

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

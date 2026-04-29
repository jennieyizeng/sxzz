import { useState } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { ROLES, MOCK_USERS } from '../data/mockData'

const NAV_CONFIG = {
  [ROLES.PRIMARY]: [
    { path: '/primary/dashboard', label: '工作台', icon: '📊' },
    {
      label: '转出管理', icon: '⬆️', children: [
        { path: '/primary/create-referral', label: '发起转出' },
        { path: '/primary/referral-list', label: '转出记录' },
      ]
    },
    {
      label: '转入管理', icon: '⬇️', children: [
        { path: '/primary/downward-list', label: '转入处理' },
        { path: '/primary/downward-records', label: '转入记录' },
      ]
    },
    // M-2：role-permission-matrix v1.3 明确基层医生有「随访任务（本人负责的）」菜单
    { path: '/primary/followup', label: '随访任务', icon: '📅' },
    { path: '/messages', label: '消息中心', icon: '🔔' },
  ],
  [ROLES.COUNTY]: [
    { path: '/county/dashboard', label: '工作台', icon: '📊' },
    {
      label: '转入管理', icon: '⬆️', children: [
        { path: '/county/review-list', label: '待受理转入' },
        { path: '/county/referral-records', label: '转入记录' },
      ]
    },
    {
      label: '转出管理', icon: '⬇️', children: [
        { path: '/county/create-downward', label: '发起转出' },
        { path: '/county/downward-records', label: '转出记录' },
      ]
    },
    { path: '/messages', label: '消息中心', icon: '🔔' },
  ],
  // P0-6：第二县级医生（王晓敏）与第一县级医生共享相同导航
  [ROLES.COUNTY2]: [
    { path: '/county/dashboard', label: '工作台', icon: '📊' },
    {
      label: '转入管理', icon: '⬆️', children: [
        { path: '/county/review-list', label: '待受理转入' },
        { path: '/county/referral-records', label: '转入记录' },
      ]
    },
    {
      label: '转出管理', icon: '⬇️', children: [
        { path: '/county/create-downward', label: '发起转出' },
        { path: '/county/downward-records', label: '转出记录' },
      ]
    },
    { path: '/messages', label: '消息中心', icon: '🔔' },
  ],
  [ROLES.ADMIN]: [
    { path: '/admin/dashboard', label: '工作台', icon: '📊' },
    { path: '/admin/ledger', label: '转诊台账', icon: '📋' },
    { path: '/admin/anomaly', label: '异常处理', icon: '⚠️' },
    {
      label: '统计报表', icon: '📈', children: [
        { path: '/admin/stats', label: '统计看板' },
        { path: '/admin/exam-report', label: '考核报表' },
        { path: '/admin/doctor-perf', label: '绩效统计' },
        { path: '/admin/data-report', label: '数据上报' },
      ]
    },
    { path: '/messages', label: '消息中心', icon: '🔔' },
  ],
  [ROLES.SYSTEM_ADMIN]: [
    {
      label: '系统管理', icon: '⚙️', children: [
        { path: '/admin/institution-manage', label: '机构转诊能力配置' },
        { path: '/admin/role-manage', label: '角色权限' },
        { path: '/admin/disease-dir', label: '专病规则配置' },
        { path: '/admin/timeout-config', label: '超时规则' },
        { path: '/admin/notify-template', label: '通知模板' },
        { path: '/admin/document-template-config', label: '转诊文书模板配置' },
        { path: '/admin/audit-rule-config', label: '审核规则' },
        { path: '/admin/operation-log', label: '操作日志' },
      ]
    },
  ],
  // CHG-32：基层负责人（院内审核）与基层医生共享大部分导航，新增院内审核入口
  [ROLES.PRIMARY_HEAD]: [
    { path: '/primary/dashboard', label: '工作台', icon: '📊' },
    { path: '/primary/internal-review', label: '院内审核', icon: '📋' },
    {
      label: '转出管理', icon: '⬆️', children: [
        { path: '/primary/referral-list', label: '转出记录' },
      ]
    },
    {
      label: '转入管理', icon: '⬇️', children: [
        { path: '/primary/downward-list', label: '转入处理' },
        { path: '/primary/downward-records', label: '转入记录' },
      ]
    },
    { path: '/primary/followup', label: '随访任务管理', icon: '📅' },
    { path: '/messages', label: '消息中心', icon: '🔔' },
  ],
  [ROLES.DIRECTOR]: [
    { path: '/director/dashboard', label: '数据大屏', icon: '📺' },
    { path: '/director/analytics', label: '统计分析', icon: '📈' },
    { path: '/director/report', label: '考核报表', icon: '📑' },
  ],
}

const ROLE_BG = {
  [ROLES.PRIMARY]:      'bg-emerald-500',
  [ROLES.PRIMARY_HEAD]: 'bg-violet-600',   // CHG-32：科主任
  [ROLES.COUNTY]:       'bg-primary-500',
  [ROLES.COUNTY2]:      'bg-cyan-600',     // P0-6：王晓敏
  [ROLES.ADMIN]:        'bg-purple-500',
  [ROLES.SYSTEM_ADMIN]: 'bg-slate-600',
  [ROLES.DIRECTOR]:     'bg-orange-500',
}

function NavItem({ item }) {
  const [open, setOpen] = useState(true)

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-600 hover:bg-primary-50 rounded-md transition-colors"
        >
          <span className="flex items-center gap-2.5">
            <span className="text-base leading-none w-5 text-center">{item.icon}</span>
            <span>{item.label}</span>
          </span>
          <span className={`text-gray-400 text-xs transition-transform duration-150 ${open ? 'rotate-90' : ''}`}>›</span>
        </button>
        {open && (
          <div className="ml-7 border-l-2 border-primary-100 pl-2 mt-0.5 mb-0.5 space-y-0.5">
            {item.children.map(child => (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) =>
                  `block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'text-white font-medium'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-primary-50'
                  }`
                }
                style={({ isActive }) => isActive ? { background: '#0BBECF' } : {}}
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-md transition-colors ${
          isActive
            ? 'text-white font-medium'
            : 'text-gray-600 hover:bg-primary-50 hover:text-gray-800'
        }`
      }
      style={({ isActive }) => isActive ? { background: '#0BBECF' } : {}}
    >
      <span className="text-base leading-none w-5 text-center">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  )
}

export default function Layout({ children }) {
  const { currentRole, setCurrentRole, currentUser, unreadCount } = useApp()
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)
  const navigate = useNavigate()
  const navItems = NAV_CONFIG[currentRole] || []

  const handleRoleSwitch = (role) => {
    setCurrentRole(role)
    setShowRoleSwitcher(false)
    const first = NAV_CONFIG[role]?.[0]
    const path = first?.path || first?.children?.[0]?.path
    if (path) navigate(path)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#EBF8FA' }}>

      {/* 左侧导航 220px */}
      <aside
        className="hidden md:flex w-[220px] bg-white flex-col flex-shrink-0 overflow-y-auto"
        style={{ boxShadow: '2px 0 8px rgba(11,190,207,0.10)' }}
      >
        {/* Logo区 */}
        <div className="flex items-center gap-2.5 px-4 py-[14px] border-b border-gray-100">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: '#0BBECF' }}
          >
            转
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-800 leading-tight truncate">双向转诊平台</div>
            <div className="text-xs text-gray-400 truncate">xx市医共体</div>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full ${ROLE_BG[currentRole]} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
              {currentUser.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-700 truncate">{currentUser.name}</div>
              <div className="text-xs text-gray-400 truncate">{currentUser.institution}</div>
            </div>
          </div>
          <div className="mt-1.5">
            <span
              className="inline-block text-xs px-2 py-0.5 rounded text-white"
              style={{ background: '#0BBECF' }}
            >
              {currentUser.roleLabel}
            </span>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {navItems.map((item, i) => <NavItem key={i} item={item} />)}
        </nav>

      </aside>

      {/* 主区域 */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* 顶部栏 52px */}
        <header
          className="h-[52px] bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-5 flex-shrink-0"
          style={{ boxShadow: '0 1px 4px rgba(11,190,207,0.08)' }}
        >
          <div className="text-sm font-medium text-gray-700">双向转诊平台</div>

          <div className="flex items-center gap-2">
            {/* 角色切换器 */}
            <div className="relative">
              <button
                onClick={() => setShowRoleSwitcher(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border transition-colors"
                style={{ color: '#0BBECF', borderColor: '#0BBECF', background: '#fff' }}
              >
                <span>🎭</span>
                <span>切换角色</span>
                <span className="text-xs">▾</span>
              </button>

              {showRoleSwitcher && (
                <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 text-xs font-medium text-gray-400 bg-gray-50 border-b border-gray-100">
                    切换视角
                  </div>
                  {Object.values(MOCK_USERS).map(user => (
                    <button
                      key={user.role}
                      onClick={() => handleRoleSwitch(user.role)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: currentRole === user.role ? '#E0F6F9' : '#fff',
                      }}
                      onMouseEnter={e => { if (currentRole !== user.role) e.currentTarget.style.background = '#F5FCFD' }}
                      onMouseLeave={e => { e.currentTarget.style.background = currentRole === user.role ? '#E0F6F9' : '#fff' }}
                    >
                      <div className={`w-8 h-8 rounded-full ${ROLE_BG[user.role]} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                        {user.avatar}
                      </div>
                      <div>
                        <div className="text-sm text-gray-800 font-medium">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.roleLabel}</div>
                      </div>
                      {currentRole === user.role && (
                        <span className="ml-auto text-sm" style={{ color: '#0BBECF' }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 消息铃铛 */}
            <NavLink
              to="/messages"
              className="relative p-1.5 text-gray-500 hover:text-gray-700 rounded transition-colors"
              style={{ ':hover': { background: '#E0F6F9' } }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            {/* 用户头像 → 个人设置 */}
            <Link
              to="/settings"
              title="个人设置"
              className={`w-7 h-7 rounded-full ${ROLE_BG[currentRole]} flex items-center justify-center text-white text-xs font-semibold`}
            >
              {currentUser.avatar}
            </Link>
          </div>
        </header>

        {/* 内容区 */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#EBF8FA' }}>
          {children}
        </main>
      </div>

      {showRoleSwitcher && (
        <div className="fixed inset-0 z-40" onClick={() => setShowRoleSwitcher(false)} />
      )}
    </div>
  )
}

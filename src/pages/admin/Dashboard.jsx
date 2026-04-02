import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { UPWARD_STATUS, DOWNWARD_STATUS, MOCK_STATS, INSTITUTIONS } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'
import ArrangementModal from '../../components/ArrangementModal'

// P0-6：指派用的县级医生候选列表
const COUNTY_DOCTORS = [
  { id: 'county_doctor_1', name: '李志远', dept: '内科' },
  { id: 'county_doctor_2', name: '王晓敏', dept: '心内科（负责人）' },
]

function formatRelativeTime(isoStr) {
  const diff = Date.now() - new Date(isoStr)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}天前`
  if (h > 0) return `${h}小时前`
  return '刚刚'
}

export default function AdminDashboard() {
  const { referrals, assignDoctorByAdmin, fillAdmissionArrangement } = useApp()
  const navigate = useNavigate()
  const [mainTab, setMainTab] = useState('overview')
  const [assignSelections, setAssignSelections] = useState({})
  // CHG-29：接诊安排Modal状态
  const [arrangementTarget, setArrangementTarget] = useState(null) // referral object
  const [arrangedSuccessId, setArrangedSuccessId] = useState(null) // 成功提示

  // P0-7：急诊待受理
  const emergencyPending = referrals.filter(r =>
    r.type === 'upward' && r.status === UPWARD_STATUS.PENDING && r.is_emergency === true
  )

  // 超时未处理（待审核超过24h）
  const overdue = referrals.filter(r => {
    if (r.type !== 'upward' || r.status !== UPWARD_STATUS.PENDING) return false
    return (Date.now() - new Date(r.createdAt)) > 24 * 3600 * 1000
  })

  // CHG-29：待指派 = 上转待审核 + 无 assignedDoctorId
  const unassigned = referrals.filter(r =>
    r.type === 'upward' &&
    r.status === UPWARD_STATUS.PENDING &&
    !r.assignedDoctorId
  )

  // CHG-29：待协调 = 上转「转诊中」+ admissionArrangement 为空（尚未安排到院信息）
  const pendingCoordination = referrals.filter(r =>
    r.type === 'upward' &&
    r.status === UPWARD_STATUS.IN_TRANSIT &&
    !r.admissionArrangement
  )

  const stats = MOCK_STATS

  function calcOverdue(ref) {
    const ms = Date.now() - new Date(ref.createdAt)
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}h${m}m`
  }

  function handleAssign(refId) {
    const doctorId = assignSelections[refId]
    const doctor = COUNTY_DOCTORS.find(d => d.id === doctorId)
    if (!doctor) return alert('请先选择医生')
    if (window.confirm(`确认将该转诊申请指派给 ${doctor.name}？`)) {
      assignDoctorByAdmin(refId, doctor.id, doctor.name)
      setAssignSelections(prev => ({ ...prev, [refId]: '' }))
    }
  }

  function handleArrangementSubmit(form) {
    const code = fillAdmissionArrangement(arrangementTarget.id, form)
    setArrangedSuccessId(arrangementTarget.id)
    setArrangementTarget(null)
    setTimeout(() => setArrangedSuccessId(null), 3000)
    // 给出 toast 提示
    alert(`✅ 到院安排已提交！预约取号码：${code || '（系统生成）'}，已通知基层医生转告患者。`)
  }

  const TAB_LIST = [
    { id: 'overview',    label: '工作台概览' },
    { id: 'unassigned',  label: `待指派 (${unassigned.length})`,         urgent: unassigned.some(r => r.is_emergency) },
    { id: 'coordinate',  label: `待协调 (${pendingCoordination.length})`, urgent: pendingCoordination.some(r => r.is_emergency || r.referral_type === 'green_channel') },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-800">管理员工作台</h1>
        <p className="text-sm text-gray-500 mt-0.5">异常监控 · 到院协调 · 台账管理</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TAB_LIST.map(tab => (
          <button
            key={tab.id}
            onClick={() => setMainTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              mainTab === tab.id
                ? 'border-[#0BBECF] text-[#0BBECF]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.urgent && <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-red-500" />}
          </button>
        ))}
      </div>

      {/* ── 待指派 Tab ── */}
      {mainTab === 'unassigned' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <span className="font-medium text-gray-700 text-sm">待指派转诊单</span>
            <span className="text-xs text-gray-400">（待审核且无人受理，可手动指派经办医生）</span>
            {unassigned.length === 0 && (
              <span className="ml-auto text-xs text-green-600">✓ 当前无待指派申请</span>
            )}
          </div>
          {unassigned.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <div className="text-3xl mb-2">✅</div>
              所有申请均已受理
            </div>
          ) : (
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#E0F6F9' }}>
                  {['转诊单编号', '患者姓名', '目标科室', '提交时间', '超时时长', '操作'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap" style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unassigned.map((ref, i) => {
                  const isEmergency = ref.is_emergency === true
                  const rowBg = isEmergency ? '#FFF1F2' : (i % 2 === 0 ? '#fff' : '#FAFEFE')
                  return (
                    <tr key={ref.id} style={{ borderBottom: '1px solid #EEF7F9', background: rowBg }}>
                      <td className="px-4 py-3 text-sm">
                        {isEmergency && <span className="text-xs font-bold text-red-600 mr-1">🔴 急诊</span>}
                        <span className="font-mono text-gray-600">{ref.referralNo || ref.id}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{ref.patient?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{ref.toDept || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(ref.createdAt).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-medium ${isEmergency ? 'text-red-600' : 'text-orange-600'}`}>
                          {calcOverdue(ref)}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <select
                            value={assignSelections[ref.id] || ''}
                            onChange={e => setAssignSelections(prev => ({ ...prev, [ref.id]: e.target.value }))}
                            className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
                          >
                            <option value="">选择医生</option>
                            {COUNTY_DOCTORS.map(d => (
                              <option key={d.id} value={d.id}>{d.name}（{d.dept}）</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssign(ref.id)}
                            disabled={!assignSelections[ref.id]}
                            className="text-xs px-3 py-1.5 rounded font-medium text-white disabled:opacity-40"
                            style={{ background: '#0BBECF' }}
                          >指派</button>
                          <button
                            onClick={() => navigate(`/referral/${ref.id}`)}
                            className="text-xs px-2 py-1.5 rounded border text-gray-600 hover:bg-gray-50"
                          >详情</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 text-xs text-blue-600">
            💡 演示路径B：切换至「李志远」或「王晓敏」角色且均不受理 → 此处出现待指派条目 → 指派后被指派医生收到强推通知
          </div>
        </div>
      )}

      {/* ── 待协调 Tab（CHG-29） ── */}
      {mainTab === 'coordinate' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <span className="font-medium text-gray-700 text-sm">待协调到院安排</span>
            <span className="text-xs text-gray-400">（已接收·转诊中，尚未填写到院信息，需联系科室安排就诊时间）</span>
            {pendingCoordination.length === 0 && (
              <span className="ml-auto text-xs text-green-600">✓ 所有在途转诊均已安排</span>
            )}
          </div>
          {pendingCoordination.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <div className="text-3xl mb-2">✅</div>
              当前无待协调转诊
            </div>
          ) : (
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#E0F6F9' }}>
                  {['患者姓名/诊断', '转出机构', '目标科室', '接收时间', '等待时长', '类型', '操作'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap" style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingCoordination.map((ref, i) => {
                  const isGreenChannel = ref.referral_type === 'green_channel'
                  const isEmergency = ref.is_emergency === true
                  const rowBg = isEmergency ? '#FFF1F2' : (i % 2 === 0 ? '#fff' : '#FAFEFE')
                  const waitMs = Date.now() - new Date(ref.acceptedAt || ref.updatedAt)
                  const waitH = Math.floor(waitMs / 3600000)
                  const waitM = Math.floor((waitMs % 3600000) / 60000)
                  const isOvertime = waitH >= 2  // 超2h等待提示
                  return (
                    <tr key={ref.id} style={{ borderBottom: '1px solid #EEF7F9', background: rowBg }}>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-gray-800">{ref.patient?.name}</span>
                          <span className="text-xs text-gray-500">{ref.diagnosis?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{ref.fromInstitution}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ref.toDept || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {ref.acceptedAt
                          ? new Date(ref.acceptedAt).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-medium ${isOvertime ? 'text-red-600' : 'text-orange-500'}`}>
                          {waitH}h{waitM}m
                          {isOvertime && <span className="ml-1 text-xs">⚠️</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isGreenChannel
                          ? <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#10b981' }}>绿通</span>
                          : isEmergency
                            ? <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white bg-red-500">急诊</span>
                            : <span className="text-xs text-gray-400">普通</span>
                        }
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setArrangementTarget(ref)}
                            className="text-xs px-3 py-1.5 rounded font-medium text-white"
                            style={{ background: '#0BBECF' }}
                          >安排到院</button>
                          <button
                            onClick={() => navigate(`/referral/${ref.id}`)}
                            className="text-xs px-2 py-1.5 rounded border text-gray-600 hover:bg-gray-50"
                          >详情</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 text-xs text-blue-600">
            💡 演示路径C：切换至「李志远」角色接收 REF2026007（绿通急诊）→ 回到管理员视角 → 此处出现「待协调」条目 → 点击「安排到院」填写信息并生成预约码
          </div>
        </div>
      )}

      {/* ── 工作台概览 Tab ── */}
      {mainTab === 'overview' && (<>

      {/* 概览指标 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '今日上转', value: stats.pendingUpward + 8, icon: '⬆️', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: '今日下转', value: stats.pendingDownward + 3, icon: '⬇️', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
          { label: '超时预警', value: overdue.length, icon: '⚠️', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
          { label: '整体完成率', value: `${stats.completionRate}%`, icon: '📊', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} border ${s.border} rounded-xl p-4`}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{s.icon}</span>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
            </div>
            <div className="mt-2 text-sm text-gray-600 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* P0-7：急诊待受理红色横幅 */}
      {emergencyPending.length > 0 && (
        <div className="mb-5 rounded-xl overflow-hidden" style={{ border: '2px solid #ef4444' }}>
          <div className="px-5 py-2.5 flex items-center gap-2 text-sm font-semibold text-white" style={{ background: '#ef4444' }}>
            <span>🚨</span>
            <span>急诊转诊待受理（{emergencyPending.length} 条）— 已立即通知对口医生、科室负责人及管理员</span>
          </div>
          <div className="divide-y divide-red-100 bg-red-50">
            {emergencyPending.map(ref => (
              <div key={ref.id}
                onClick={() => navigate(`/referral/${ref.id}`)}
                className="px-5 py-3 flex items-center gap-4 cursor-pointer hover:bg-red-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-red-700">{ref.patient?.name}</span>
                    <span className="text-xs text-red-600">{ref.diagnosis?.name}</span>
                    {ref.isUrgentUnhandled && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-800">4h未受理</span>
                    )}
                  </div>
                  <div className="text-xs text-red-400 mt-0.5">{ref.fromInstitution} → {ref.toDept} · {calcOverdue(ref)} 前提交</div>
                </div>
                <div className="text-xs text-red-500 font-medium">
                  {ref.assignedDoctorId ? `已由${ref.assignedDoctorName}受理` : '⚠️ 尚无人受理'}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/referral/${ref.id}`) }}
                  className="px-3 py-1 text-xs font-medium text-white rounded"
                  style={{ background: '#ef4444' }}
                >查看详情</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHG-29：待协调横幅（有待协调记录时在概览显示） */}
      {pendingCoordination.length > 0 && (
        <div className="mb-5 rounded-xl overflow-hidden border border-orange-300">
          <div className="px-5 py-2.5 flex items-center gap-2 text-sm font-medium bg-orange-50 border-b border-orange-200">
            <span>🏥</span>
            <span className="text-orange-700">待协调到院安排（{pendingCoordination.length} 条）— 已接收但尚未安排就诊时间</span>
            <button
              onClick={() => setMainTab('coordinate')}
              className="ml-auto text-xs px-3 py-1 rounded text-white font-medium"
              style={{ background: '#0BBECF' }}
            >前往协调</button>
          </div>
          <div className="divide-y divide-orange-50 bg-orange-50/30">
            {pendingCoordination.slice(0, 2).map(ref => (
              <div key={ref.id} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                {ref.referral_type === 'green_channel' && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#10b981' }}>绿通</span>
                )}
                <span className="font-medium text-gray-700">{ref.patient?.name}</span>
                <span className="text-gray-500">→ {ref.toDept}</span>
                <span className="text-xs text-orange-500 ml-auto">等待中，请尽快安排</span>
              </div>
            ))}
            {pendingCoordination.length > 2 && (
              <div className="px-5 py-2 text-xs text-gray-400">还有 {pendingCoordination.length - 2} 条待协调…</div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {/* 超时预警 */}
          {overdue.length > 0 && (
            <div className="bg-white rounded-xl border border-orange-300 shadow-sm">
              <div className="px-5 py-3 bg-orange-50 border-b border-orange-200 rounded-t-xl flex items-center gap-2">
                <span>⚠️</span>
                <span className="font-medium text-orange-700">超时预警（审核超24小时未处理）</span>
                <span className="bg-orange-200 text-orange-700 text-xs px-1.5 py-0.5 rounded-full">{overdue.length}</span>
              </div>
              {overdue.map(ref => (
                <div key={ref.id} onClick={() => navigate(`/referral/${ref.id}`)}
                  className="px-5 py-3.5 border-b last:border-0 border-gray-50 hover:bg-gray-50 cursor-pointer flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 text-sm">{ref.patient.name}</div>
                    <div className="text-xs text-gray-500">{ref.diagnosis.name} · {ref.fromInstitution} → {ref.toDept}</div>
                  </div>
                  <div className="text-xs text-orange-600 font-medium">{formatRelativeTime(ref.createdAt)}提交</div>
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/referral/${ref.id}`) }}
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium hover:bg-orange-200"
                  >催办受理</button>
                </div>
              ))}
            </div>
          )}

          {/* 全部近期转诊 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>📋</span>
                <span className="font-medium text-gray-700">最近转诊记录</span>
              </div>
              <button onClick={() => navigate('/admin/ledger')} className="text-sm hover:underline" style={{ color: '#0BBECF' }}>查看台账</button>
            </div>
            <div className="divide-y divide-gray-50">
              {referrals.slice(0, 6).map(ref => (
                <div key={ref.id} onClick={() => navigate(`/referral/${ref.id}`)}
                  className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3">
                  <span className="text-base">{ref.type === 'upward' ? '⬆️' : '⬇️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-800">{ref.patient.name}</span>
                      <span className="text-xs text-gray-500">{ref.diagnosis.name}</span>
                      {ref.referral_type === 'green_channel' && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ background: '#10b981' }}>绿通</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{ref.fromInstitution} · {formatRelativeTime(ref.updatedAt)}</div>
                  </div>
                  <StatusBadge status={ref.status} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：快捷操作 + 统计概览 */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="font-medium text-gray-700 mb-3 text-sm">快捷操作</div>
            <div className="space-y-2">
              {[
                { label: '转诊台账', icon: '📋', path: '/admin/ledger' },
                { label: '统计看板', icon: '📊', path: '/admin/stats' },
                { label: '随访任务管理', icon: '📅', path: '/admin/followup' },
                { label: '数据上报管理', icon: '📤', path: '/admin/report' },
              ].map(a => (
                <button key={a.path} onClick={() => navigate(a.path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm border border-gray-200 transition-colors">
                  <span>{a.icon}</span><span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 简化统计 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="font-medium text-gray-700 mb-3 text-sm">本月统计概览</div>
            <div className="space-y-2">
              {[
                { label: '上转总量', value: stats.totalUpward },
                { label: '下转总量', value: stats.totalDownward },
                { label: '上转完成率', value: `${Math.round(stats.completedUpward / stats.totalUpward * 100)}%` },
                { label: '平均处理时效', value: `${stats.avgProcessHours}h` },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-semibold text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>)}

      {/* CHG-29：到院安排 Modal */}
      {arrangementTarget && (() => {
        const inst = INSTITUTIONS.find(i => i.name === arrangementTarget.toInstitution)
        const deptBedInfo = inst?.departmentInfo?.[arrangementTarget.toDept]
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
        const bedOccupied = deptBedInfo?.dailyReservedBeds > 0
          ? referrals.filter(r =>
              r.toDept === arrangementTarget.toDept &&
              r.bedStatus === 'bed_reserved' &&
              r.admissionArrangement?.bedReservedAt &&
              new Date(r.admissionArrangement.bedReservedAt) >= todayStart
            ).length
          : 0
        return (
          <ArrangementModal
            referral={arrangementTarget}
            admissionType={arrangementTarget.admissionType}
            deptBedInfo={deptBedInfo}
            bedOccupied={bedOccupied}
            onClose={() => setArrangementTarget(null)}
            onSubmit={handleArrangementSubmit}
          />
        )
      })()}
    </div>
  )
}

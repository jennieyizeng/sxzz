import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { UPWARD_STATUS, INSTITUTIONS } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'
import ArrangementModal from '../../components/ArrangementModal'

// P0-6：指派用的县级医生候选列表
const COUNTY_DOCTORS = [
  { id: 'county_doctor_1', name: '李志远', dept: '内科' },
  { id: 'county_doctor_2', name: '王晓敏', dept: '心内科（科主任）' },
]

function formatRelativeTime(isoStr) {
  const diff = Date.now() - new Date(isoStr)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}天前`
  if (h > 0) return `${h}小时前`
  return '刚刚'
}

function getEmergencySubStatus(ref) {
  if (!ref.admissionArrangement?.department) return '待补录'
  return '已补录'
}

export default function AdminDashboard() {
  const { referrals, assignDoctorByAdmin, fillAdmissionArrangement } = useApp()
  const navigate = useNavigate()
  const [mainTab, setMainTab] = useState('overview')
  const [assignSelections, setAssignSelections] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [nowTs, setNowTs] = useState(() => Date.now())
  // CHG-29：接诊安排Modal状态
  const [arrangementTarget, setArrangementTarget] = useState(null) // referral object

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(null), 3000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const emergencyQueue = referrals
    .filter(r => r.type === 'upward' && r.status === UPWARD_STATUS.IN_TRANSIT && r.is_emergency === true)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  // 超时未处理（待受理超过24h）
  const overdue = referrals.filter(r => {
    if (r.type !== 'upward' || r.status !== UPWARD_STATUS.PENDING) return false
    return (nowTs - new Date(r.createdAt)) > 24 * 3600 * 1000
  })

  // CHG-29：待指派 = 普通上转待受理 + 无 assignedDoctorId
  const unassigned = referrals.filter(r =>
    r.type === 'upward' &&
    r.status === UPWARD_STATUS.PENDING &&
    !r.is_emergency &&
    !r.assignedDoctorId
  )

  // CHG-29：待协调 = 上转「转诊中」+ admissionArrangement 为空（尚未安排到院信息）
  const pendingCoordination = referrals.filter(r =>
    r.type === 'upward' &&
    r.status === UPWARD_STATUS.IN_TRANSIT &&
    !r.is_emergency &&
    !r.admissionArrangement
  )

  function calcOverdue(ref) {
    const ms = nowTs - new Date(ref.createdAt)
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}h${m}m`
  }

  const recentWorkbenchItems = Array.from(new Map([
    ...emergencyQueue.map(ref => [
      ref.id,
      { ref, label: '急诊处理中', note: getEmergencySubStatus(ref), color: '#ef4444' },
    ]),
    ...pendingCoordination.map(ref => [
      ref.id,
      { ref, label: '待协调', note: '尚未安排到院信息', color: '#f59e0b' },
    ]),
    ...overdue.map(ref => [
      ref.id,
      { ref, label: '超时预警', note: '待受理超24小时', color: '#ea580c' },
    ]),
    ...unassigned.map(ref => [
      ref.id,
      { ref, label: '待指派', note: '待指派经办医生', color: '#0BBECF' },
    ]),
  ]).values()).slice(0, 6)

  function handleAssign(refId) {
    const doctorId = assignSelections[refId]
    const doctor = COUNTY_DOCTORS.find(d => d.id === doctorId)
    if (!doctor) {
      setFeedback({ type: 'warning', message: '请先选择医生后再执行指派' })
      return
    }
    if (window.confirm(`确认将该转诊申请指派给 ${doctor.name}？`)) {
      assignDoctorByAdmin(refId, doctor.id, doctor.name)
      setAssignSelections(prev => ({ ...prev, [refId]: '' }))
      setFeedback({ type: 'success', message: `已将转诊申请指派给 ${doctor.name}` })
    }
  }

  function handleArrangementSubmit(form) {
    const code = fillAdmissionArrangement(arrangementTarget.id, form)
    setArrangementTarget(null)
    setFeedback({
      type: 'success',
      message: `到院安排已提交${code ? `，预约取号码：${code}` : ''}，已通知基层医生转告患者。`,
    })
  }

  const TAB_LIST = [
    { id: 'emergency',   label: `急诊处理 (${emergencyQueue.length})`, urgent: emergencyQueue.length > 0 },
    { id: 'overview',    label: '待办总览' },
    { id: 'unassigned',  label: `待指派 (${unassigned.length})`,         urgent: unassigned.some(r => r.is_emergency) },
    { id: 'coordinate',  label: `待协调 (${pendingCoordination.length})`, urgent: pendingCoordination.some(r => r.is_emergency || r.referral_type === 'green_channel') },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {feedback && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white"
          style={{
            minWidth: '320px',
            textAlign: 'center',
            background: feedback.type === 'warning' ? '#d97706' : '#059669',
          }}
        >
          {feedback.message}
        </div>
      )}

      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-800">转诊中心工作台</h1>
        <p className="text-sm text-gray-500 mt-0.5">急诊补录 · 转诊协调 · 异常督办</p>
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

      {mainTab === 'emergency' && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-red-100 bg-red-50 flex items-center gap-2">
            <span className="font-medium text-red-700 text-sm">急诊处理</span>
            <span className="text-xs text-red-400">（急诊/绿通上转提交即自动通知，转诊中心负责补录接诊信息并完成接诊确认）</span>
            {emergencyQueue.length === 0 && (
              <span className="ml-auto text-xs text-green-600">✓ 当前无急诊待处理</span>
            )}
          </div>
          {emergencyQueue.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <div className="text-3xl mb-2">⚡</div>
              当前无急诊处理任务
            </div>
          ) : (
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FEF2F2' }}>
                  {['患者/诊断', '紧急程度', '提交时间', '等待时长', '当前子状态', '操作'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap" style={{ color: '#b91c1c', borderBottom: '1px solid #fecaca' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emergencyQueue.map((ref, i) => {
                  const waitMs = nowTs - new Date(ref.createdAt)
                  const waitH = Math.floor(waitMs / 3600000)
                  const waitM = Math.floor((waitMs % 3600000) / 60000)
                  const emergencyBadge = ref.isUrgentUnhandled
                    ? (ref.firstViewedAt ? '急诊·超时' : '急诊·未查看·超时')
                    : '急诊'
                  return (
                    <tr key={ref.id} style={{ borderBottom: '1px solid #FEE2E2', background: i % 2 === 0 ? '#fff' : '#FFF7F7' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white bg-red-500">
                            {emergencyBadge}
                          </span>
                          {ref.isRetroEntry && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                              补录
                            </span>
                          )}
                          {ref.referral_type === 'green_channel' && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#10b981' }}>
                              绿通
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-gray-800">{ref.patient?.name}</div>
                        <div className="text-xs text-gray-500">{ref.diagnosis?.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {ref.isRetroEntry
                            ? '补录模式：未触发实时通知'
                            : `已通知：急诊科值班✓ 科室负责人✓ 转诊中心✓${ref.referral_type === 'green_channel' && ref.linkedSpecialty ? ` · ${ref.linkedSpecialty}负责人✓` : ''}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{ref.urgencyLevel ? `第${ref.urgencyLevel}级` : '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(ref.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600">{waitH}h{waitM}m</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#b91c1c' }}>
                          {getEmergencySubStatus(ref)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/referral/${ref.id}`)}
                          className="text-xs px-3 py-1.5 rounded font-medium text-white"
                          style={{ background: '#ef4444' }}
                        >
                          进入处理
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── 待指派 Tab ── */}
      {mainTab === 'unassigned' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <span className="font-medium text-gray-700 text-sm">待指派转诊单</span>
            <span className="text-xs text-gray-400">（待受理且无人受理，可手动指派经办医生）</span>
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
                        <span className="font-mono text-gray-600">{ref.referralCode || ref.referralNo || ref.id}</span>
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
        </div>
      )}

      {/* ── 待协调 Tab（CHG-29） ── */}
      {mainTab === 'coordinate' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <span className="font-medium text-gray-700 text-sm">待协调到院安排</span>
            <span className="text-xs text-gray-400">（已受理并进入转诊中，尚未填写到院信息，需联系科室安排就诊时间）</span>
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
                  const waitMs = nowTs - new Date(ref.acceptedAt || ref.updatedAt)
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
        </div>
      )}

      {/* ── 待办总览 Tab ── */}
      {mainTab === 'overview' && (<>

      {/* 待办指标 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '急诊处理中', value: emergencyQueue.length, icon: '🚨', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
          { label: '待指派', value: unassigned.length, icon: '👨‍⚕️', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
          { label: '待协调', value: pendingCoordination.length, icon: '🏥', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
          { label: '超时预警', value: overdue.length, icon: '⚠️', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
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

      {/* CHG-36：急诊处理红色横幅 */}
      {emergencyQueue.length > 0 && (
        <div className="mb-5 rounded-xl overflow-hidden" style={{ border: '2px solid #ef4444' }}>
          <div className="px-5 py-2.5 flex items-center gap-2 text-sm font-semibold text-white" style={{ background: '#ef4444' }}>
            <span>🚨</span>
            <span>急诊处理中（{emergencyQueue.length} 条）— 请优先补录接诊信息并完成接诊确认</span>
            <button
              onClick={() => setMainTab('emergency')}
              className="ml-auto text-xs px-3 py-1 rounded bg-white font-medium"
              style={{ color: '#ef4444' }}
            >
              前往急诊处理
            </button>
          </div>
          <div className="divide-y divide-red-100 bg-red-50">
            {emergencyQueue.slice(0, 3).map(ref => (
              <div key={ref.id}
                onClick={() => navigate(`/referral/${ref.id}`)}
                className="px-5 py-3 flex items-center gap-4 cursor-pointer hover:bg-red-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-red-700">{ref.patient?.name}</span>
                    <span className="text-xs text-red-600">{ref.diagnosis?.name}</span>
                    {ref.isRetroEntry && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                        补录
                      </span>
                    )}
                    {ref.referral_type === 'green_channel' && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#10b981' }}>绿通</span>
                    )}
                  </div>
                  <div className="text-xs text-red-400 mt-0.5">{ref.fromInstitution} → {ref.toDept} · {calcOverdue(ref)} 前提交</div>
                </div>
                <div className="text-xs text-red-500 font-medium">
                  {getEmergencySubStatus(ref)}
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
            <span className="text-orange-700">待协调到院安排（{pendingCoordination.length} 条）— 已受理但尚未安排就诊时间</span>
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

      <div className="space-y-4">
          {/* 超时预警 */}
          {overdue.length > 0 && (
            <div className="bg-white rounded-xl border border-orange-300 shadow-sm">
              <div className="px-5 py-3 bg-orange-50 border-b border-orange-200 rounded-t-xl flex items-center gap-2">
                <span>⚠️</span>
                <span className="font-medium text-orange-700">超时预警（待受理超24小时未处理）</span>
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

          {/* 最近待办动态 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>📋</span>
                <span className="font-medium text-gray-700">最近待办动态</span>
              </div>
              <button onClick={() => navigate('/admin/ledger')} className="text-sm hover:underline" style={{ color: '#0BBECF' }}>查看台账</button>
            </div>
            <div className="divide-y divide-gray-50">
              {recentWorkbenchItems.length === 0 && (
                <div className="px-5 py-10 text-sm text-center text-gray-400">当前无待办动态</div>
              )}
              {recentWorkbenchItems.map(({ ref, label, note, color }) => (
                <div key={ref.id} onClick={() => navigate(`/referral/${ref.id}`)}
                  className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3">
                  <span className="text-base">{ref.type === 'upward' ? '⬆️' : '⬇️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-800">{ref.patient.name}</span>
                      <span className="text-xs font-medium" style={{ color }}>{label}</span>
                      <span className="text-xs text-gray-500">{ref.diagnosis.name}</span>
                      {ref.referral_type === 'green_channel' && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ background: '#10b981' }}>绿通</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{ref.fromInstitution} · {note} · {formatRelativeTime(ref.updatedAt)}</div>
                  </div>
                  <StatusBadge status={ref.status} size="sm" />
                </div>
              ))}
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

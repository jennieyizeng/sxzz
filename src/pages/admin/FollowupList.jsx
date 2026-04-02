import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}
function RowNo({ n }) {
  return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#6366f1' }}>{n}</span>
}
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

// 从已完成下转记录生成随访任务（P1-04：仅 completed 状态，与 state-machine.md 第四节一致）
function buildFollowups(referrals) {
  return referrals
    .filter(r => r.type === 'downward' && r.status === '已完成' && r.rehabPlan?.followupDate)
    .map(ref => {
      const followDate = new Date(ref.rehabPlan.followupDate)
      const today = new Date()
      const daysLeft = Math.ceil((followDate - today) / 86400000)
      const isOverdue = daysLeft < 0
      const isUrgent = daysLeft >= 0 && daysLeft <= 3
      return {
        id: `FU${ref.id}`,
        referralId: ref.id,
        patient: ref.patient,
        diagnosis: ref.diagnosis,
        toInstitution: ref.toInstitution,
        toDoctor: ref.toDoctor || '—',
        followupDate: ref.rehabPlan.followupDate,
        indicators: ref.rehabPlan.indicators || [],
        status: ref.status === '已完成' ? '已完成随访' : isOverdue ? '逾期' : isUrgent ? '即将到期' : '待随访',
        daysLeft,
        isOverdue,
        isUrgent,
      }
    })
}

// 演示用基层医生列表（MOCK_USERS 中基层医生数量不足3人，hardcode 补充）
// Assumption: role 对应 'primary'（基层医生）
const DEMO_DOCTORS = [
  { id: 'u001', name: '王医生', institution: '绵竹市拱星镇卫生院' },
  { id: 'u101', name: '李慧医生', institution: '绵竹市拱星镇卫生院' },
  { id: 'u102', name: '张明医生', institution: '绵竹市汉旺镇卫生院' },
  { id: 'u103', name: '陈芳医生', institution: '绵竹市汉旺镇卫生院' },
]

// 静态模拟随访数据（补充）
// M-1 修复：state-machine v1.3 取消 unassigned 状态，随访任务创建时直接归属下转经办医生（assigned）
// assignedDoctor 字段记录负责医生，管理员可执行「转移」操作
const MOCK_FOLLOWUPS_EXTRA = [
  { id: 'FU_MOCK1', referralId: 'REF2026003', patient: { name: '王五', age: 45, gender: '男' }, diagnosis: { code: 'E11.9', name: '2型糖尿病' }, toInstitution: '绵竹市拱星镇卫生院', toDoctor: '王医生', followupDate: '2026-04-20', indicators: ['血糖', '体重'], status: 'assigned', daysLeft: 21, isOverdue: false, isUrgent: false, assignedDoctor: '王医生' },
  { id: 'FU_MOCK2', referralId: 'REF2026003', patient: { name: '赵大爷', age: 72, gender: '男' }, diagnosis: { code: 'I10', name: '原发性高血压' }, toInstitution: '绵竹市汉旺镇卫生院', toDoctor: '李慧医生', followupDate: '2026-03-14', indicators: ['血压', '心率'], status: '逾期', daysLeft: -16, isOverdue: true, isUrgent: false, assignedDoctor: '李慧医生' },
  { id: 'FU_MOCK3', referralId: 'REF2026005', patient: { name: '钱女士', age: 58, gender: '女' }, diagnosis: { code: 'I63.9', name: '脑梗死' }, toInstitution: '绵竹市拱星镇卫生院', toDoctor: '王医生', followupDate: '2026-04-02', indicators: ['血压', '肢体活动度', '语言功能'], status: 'assigned', daysLeft: 3, isOverdue: false, isUrgent: true, assignedDoctor: '王医生' },
]

export default function AdminFollowupList() {
  const navigate = useNavigate()
  const { referrals } = useApp()
  const [tab, setTab] = useState('all')

  // 分配对话框 state
  const [assignDialog, setAssignDialog] = useState(null) // null 或 { followup }
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [successTip, setSuccessTip] = useState('')

  const dynamicFollowups = buildFollowups(referrals)
  // 用局部 state 管理列表，支持分配更新（不依赖 AppContext.updateFollowup，该方法不存在）
  const [extraFollowups, setExtraFollowups] = useState(MOCK_FOLLOWUPS_EXTRA)

  const all = [...dynamicFollowups, ...extraFollowups]

  const filtered = tab === 'all' ? all
    : tab === 'overdue' ? all.filter(f => f.isOverdue)
    : tab === 'urgent' ? all.filter(f => f.isUrgent)
    : tab === 'completed' ? all.filter(f => f.status === '已完成随访')
    : all.filter(f => !f.isOverdue && !f.isUrgent && f.status !== '已完成随访')

  const counts = {
    all: all.length,
    overdue: all.filter(f => f.isOverdue).length,
    urgent: all.filter(f => f.isUrgent).length,
    completed: all.filter(f => f.status === '已完成随访').length,
    pending: all.filter(f => !f.isOverdue && !f.isUrgent && f.status !== '已完成随访').length,
  }

  // 打开分配对话框
  function openAssign(followup) {
    setSelectedDoctor('')
    setAssignDialog({ followup })
  }

  // 确认分配
  function confirmAssign() {
    if (!selectedDoctor) return
    const doctor = DEMO_DOCTORS.find(d => d.id === selectedDoctor)
    if (!doctor) return
    // 更新 extraFollowups 中的任务；动态生成的任务不含 unassigned，此处仅处理 extra 部分
    setExtraFollowups(prev => prev.map(f =>
      f.id === assignDialog.followup.id
        ? { ...f, status: 'assigned', assignedDoctor: doctor.name, toDoctor: doctor.name }
        : f
    ))
    setAssignDialog(null)
    setSelectedDoctor('')
    setSuccessTip(`已将「${assignDialog.followup.patient.name}」的随访任务分配给 ${doctor.name}`)
    setTimeout(() => setSuccessTip(''), 3000)
  }

  const statusStyle = (f) => {
    if (f.isOverdue) return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }
    if (f.isUrgent) return { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }
    if (f.status === '已完成随访') return { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }
    if (f.status === 'assigned') return { background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd' }
    return { background: '#E0F6F9', color: '#0892a0', border: '1px solid #a4edf5' }
  }

  // 状态显示文字映射
  const statusLabel = (f) => {
    if (f.status === 'assigned') return '待随访'
    return f.status
  }

  return (
    <div className="p-5">
      {/* 成功提示条 */}
      {successTip && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white"
          style={{ background: '#059669', minWidth: '280px', textAlign: 'center' }}>
          {successTip}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">随访任务管理</h2>
        <div className="text-xs text-gray-400 mt-0.5">下转后随访任务追踪 · 逾期催办</div>
      </div>

      {/* 状态卡 */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {[
          { id: 'all', label: '全部任务', color: '#6366f1', bg: '#ede9fe', icon: '📋' },
          { id: 'overdue', label: '已逾期', color: '#ef4444', bg: '#fef2f2', icon: '⏰' },
          { id: 'urgent', label: '即将到期', color: '#f59e0b', bg: '#fef3c7', icon: '⚠️' },
          { id: 'pending', label: '待随访', color: '#0BBECF', bg: '#E0F6F9', icon: '📌' },
          { id: 'completed', label: '已完成', color: '#059669', bg: '#d1fae5', icon: '✅' },
        ].map(item => (
          <div key={item.id} onClick={() => setTab(item.id)}
            className="flex items-center justify-between bg-white rounded-xl px-4 py-3 cursor-pointer transition-all"
            style={{ border: `2px solid ${tab === item.id ? item.color : '#DDF0F3'}` }}
            onMouseEnter={e => e.currentTarget.style.borderColor = item.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = tab === item.id ? item.color : '#DDF0F3'}>
            <div>
              <div className="text-xl font-bold" style={{ color: item.color }}>{counts[item.id]}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: item.bg }}>
              <span>{item.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#E0F6F9' }}>
              {['序号','患者','诊断','随访机构','负责医生','监测指标','计划随访日期','状态','操作'].map(h => (
                <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-gray-400">暂无随访任务</td></tr>
            ) : filtered.map((f, i) => (
              <tr key={f.id} style={{ borderBottom: '1px solid #EEF7F9', background: f.isOverdue ? '#fff9f9' : i % 2 === 0 ? '#fff' : '#FAFEFE' }}>
                <td className={TD}><RowNo n={i+1} /></td>
                <td className={TD}>
                  <div className="font-medium text-gray-800">{f.patient.name}</div>
                  <div className="text-xs text-gray-400">{f.patient.age}岁 · {f.patient.gender}</div>
                </td>
                <td className={TD + ' text-xs text-gray-600'}>{f.diagnosis.name}</td>
                <td className={TD + ' text-xs text-gray-500'}>{f.toInstitution}</td>
                <td className={TD + ' text-gray-600'}>{f.toDoctor}</td>
                <td className={TD}>
                  <div className="flex flex-wrap gap-1">
                    {f.indicators.slice(0, 3).map(ind => (
                      <span key={ind} className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#E0F6F9', color: '#0892a0' }}>{ind}</span>
                    ))}
                    {f.indicators.length > 3 && <span className="text-xs text-gray-400">+{f.indicators.length-3}</span>}
                  </div>
                </td>
                <td className={TD}>
                  <div className="text-sm text-gray-700">{fmt(f.followupDate)}</div>
                  {f.isOverdue && <div className="text-xs text-red-500">逾期 {Math.abs(f.daysLeft)} 天</div>}
                  {f.isUrgent && <div className="text-xs text-amber-500">还剩 {f.daysLeft} 天</div>}
                </td>
                <td className={TD}>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={statusStyle(f)}>{statusLabel(f)}</span>
                </td>
                <td className={TD}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => navigate(`/referral/${f.referralId}`)} className="text-xs font-medium" style={{ color: '#0BBECF' }}>查看</button>
                    {(f.status === 'assigned' || f.status === '待随访') && (
                      <button onClick={() => openAssign(f)} className="text-xs font-medium text-gray-500 hover:text-gray-700">转移医生</button>
                    )}
                    {f.isOverdue && <button className="text-xs font-medium" style={{ color: '#ef4444' }} onClick={() => alert('已发送催办通知')}>催办</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <span className="text-xs text-gray-400">共 <strong>{filtered.length}</strong> 条任务</span>
        </div>
      </div>

      {/* 指定负责医生 — 分配对话框 */}
      {assignDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" style={{ border: '1px solid #DDF0F3' }}>
            {/* 标题 */}
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #EEF7F9' }}>
              <h3 className="text-sm font-semibold text-gray-800">指定负责医生</h3>
            </div>
            {/* 内容 */}
            <div className="px-5 py-4 space-y-4">
              {/* 患者信息 */}
              <div className="rounded-lg px-4 py-3" style={{ background: '#F8FDFE', border: '1px solid #DDF0F3' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800">{assignDialog.followup.patient.name}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">{assignDialog.followup.diagnosis.name}</span>
                </div>
                <div className="text-xs text-gray-400">
                  首次随访日期：{fmt(assignDialog.followup.followupDate)}
                  {assignDialog.followup.toInstitution && (
                    <span className="ml-2 text-gray-400">· {assignDialog.followup.toInstitution}</span>
                  )}
                </div>
              </div>

              {/* 选择医生 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  选择负责医生 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDoctor}
                  onChange={e => setSelectedDoctor(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 outline-none"
                  style={{ borderColor: selectedDoctor ? '#0BBECF' : '#d1d5db', color: selectedDoctor ? '#111827' : '#9ca3af' }}
                >
                  <option value="">请选择医生</option>
                  {DEMO_DOCTORS.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name} · {doc.institution}</option>
                  ))}
                </select>
                {/* Assumption: DEMO_DOCTORS 来自 MOCK_USERS primary 角色补充，实际应从接口获取基层医生列表 */}
              </div>
            </div>
            {/* 底部按钮 */}
            <div className="px-5 py-3.5 flex justify-end gap-2" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE', borderRadius: '0 0 12px 12px' }}>
              <button
                onClick={() => { setAssignDialog(null); setSelectedDoctor('') }}
                className="px-4 py-1.5 text-sm rounded-lg text-gray-600 bg-white"
                style={{ border: '1px solid #d1d5db' }}
              >取消</button>
              <button
                onClick={confirmAssign}
                disabled={!selectedDoctor}
                className="px-4 py-1.5 text-sm rounded-lg text-white font-medium transition-colors"
                style={{ background: selectedDoctor ? '#0BBECF' : '#a5f3fc', cursor: selectedDoctor ? 'pointer' : 'not-allowed' }}
              >确认分配</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

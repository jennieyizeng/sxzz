import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

// M-2：基层医生/科主任视角的随访任务列表（过滤 assignedDoctorId === currentUser.id）
// role-permission-matrix v1.3：基层医生导航「随访任务（本人负责的）」

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

// 从已完成下转记录生成随访任务（仅本医生负责的）
function buildMyFollowups(referrals, currentUser) {
  return referrals
    .filter(r =>
      r.type === 'downward' &&
      r.status === '已完成' &&
      r.rehabPlan?.followupDate &&
      (r.downwardAssignedDoctorId === currentUser.id || r.toDoctor === currentUser.name)
    )
    .map(ref => {
      const followDate = new Date(ref.rehabPlan.followupDate)
      const today = new Date()
      const daysLeft = Math.ceil((followDate - today) / 86400000)
      return {
        id: `FU${ref.id}`,
        referralId: ref.id,
        patient: ref.patient,
        diagnosis: ref.diagnosis,
        fromInstitution: ref.fromInstitution,
        fromDoctor: ref.fromDoctor,
        followupDate: ref.rehabPlan.followupDate,
        indicators: ref.rehabPlan?.indicators || [],
        daysLeft,
        isOverdue: daysLeft < 0,
        isUrgent: daysLeft >= 0 && daysLeft <= 3,
      }
    })
}

export default function PrimaryFollowupList() {
  const { referrals, currentUser } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const myFollowups = buildMyFollowups(referrals, currentUser)
  const filtered = filter === 'overdue' ? myFollowups.filter(f => f.isOverdue)
    : filter === 'urgent' ? myFollowups.filter(f => f.isUrgent && !f.isOverdue)
    : filter === 'pending' ? myFollowups.filter(f => !f.isOverdue)
    : myFollowups

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">我的随访任务</h2>
        <div className="text-xs text-gray-400 mt-0.5">
          {currentUser.name} · {currentUser.institution} — 仅显示本人负责的随访任务
        </div>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { id: 'all', label: '全部', count: myFollowups.length, color: '#6366f1', bg: '#ede9fe' },
          { id: 'overdue', label: '已逾期', count: myFollowups.filter(f => f.isOverdue).length, color: '#ef4444', bg: '#fef2f2' },
          { id: 'urgent', label: '即将到期（≤3天）', count: myFollowups.filter(f => f.isUrgent && !f.isOverdue).length, color: '#f59e0b', bg: '#fef3c7' },
          { id: 'pending', label: '待随访', count: myFollowups.filter(f => !f.isOverdue).length, color: '#059669', bg: '#d1fae5' },
        ].map(c => (
          <div
            key={c.id}
            onClick={() => setFilter(c.id)}
            className="bg-white rounded-xl px-4 py-3 cursor-pointer"
            style={{ border: `2px solid ${filter === c.id ? c.color : '#DDF0F3'}` }}
          >
            <div className="text-xl font-bold" style={{ color: c.color }}>{c.count}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#E0F6F9' }}>
              {['序号', '患者', '诊断', '来源机构', '监测指标', '计划随访日期', '状态', '操作'].map(h => (
                <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                  暂无随访任务
                </td>
              </tr>
            ) : filtered.map((f, i) => (
              <tr key={f.id} style={{ borderBottom: '1px solid #EEF7F9', background: f.isOverdue ? '#fff9f9' : '#fff' }}>
                <td className={TD}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>{i+1}</span>
                </td>
                <td className={TD}>
                  <div className="font-medium text-gray-800">{f.patient.name}</div>
                  <div className="text-xs text-gray-400">{f.patient.age}岁 · {f.patient.gender}</div>
                </td>
                <td className={TD + ' text-xs text-gray-600'}>{f.diagnosis.name}</td>
                <td className={TD + ' text-xs text-gray-500'}>{f.fromInstitution}</td>
                <td className={TD}>
                  <div className="flex flex-wrap gap-1">
                    {(f.indicators || []).slice(0, 3).map(ind => (
                      <span key={ind} className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#E0F6F9', color: '#0892a0' }}>{ind}</span>
                    ))}
                    {f.indicators.length > 3 && <span className="text-xs text-gray-400">+{f.indicators.length-3}</span>}
                  </div>
                </td>
                <td className={TD}>
                  <div className="text-sm text-gray-700">{fmt(f.followupDate)}</div>
                  {f.isOverdue && <div className="text-xs text-red-500">逾期 {Math.abs(f.daysLeft)} 天</div>}
                  {f.isUrgent && !f.isOverdue && <div className="text-xs text-amber-500">还剩 {f.daysLeft} 天</div>}
                </td>
                <td className={TD}>
                  {f.isOverdue
                    ? <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>已逾期</span>
                    : f.isUrgent
                      ? <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>即将到期</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0' }}>待随访</span>
                  }
                </td>
                <td className={TD}>
                  <button
                    onClick={() => navigate(`/referral/${f.referralId}`)}
                    className="text-xs font-medium"
                    style={{ color: '#0BBECF' }}
                  >
                    查看转诊单
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-600">
        ℹ️ 随访任务由系统在下转完成后自动创建并归属至您名下。如需转移任务，请联系管理员。
      </div>
    </div>
  )
}

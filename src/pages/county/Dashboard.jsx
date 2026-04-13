import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ROLES, UPWARD_STATUS, DOWNWARD_STATUS } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'
import { matchesDepartmentScope } from '../../utils/countyReferralAccess'

function fromNow(isoStr, nowTs) {
  const diff = nowTs - new Date(isoStr)
  const d = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (d > 0) return `${d}天前`; if (h > 0) return `${h}小时前`; return `${m}分钟前`
}
function RowNo({ n }) {
  return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>{n}</span>
}
function StatCard({ icon, iconBg, label, items, onClick }) {
  return (
    <div className="bg-white rounded flex items-center gap-3 px-4 py-4 cursor-pointer" style={{ border: '1px solid #DDF0F3', boxShadow: '0 1px 4px rgba(11,190,207,0.06)' }} onClick={onClick}>
      <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ background: iconBg }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700 mb-1.5">{label}</div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
          {items.map((it, i) => <span key={i}>{it.label} <span className="font-semibold" style={{ color: it.color || '#0BBECF' }}>{it.value}</span></span>)}
        </div>
      </div>
    </div>
  )
}
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

export default function CountyDashboard() {
  const { referrals, currentUser, myNotifications } = useApp()
  const navigate = useNavigate()
  const [nowTs, setNowTs] = useState(() => Date.now())
  const isCountyDepartmentHead = currentUser.role === ROLES.COUNTY2
  const isMine = (referral) =>
    referral.assignedDoctorId === currentUser.id ||
    (!referral.assignedDoctorId && referral.assignedDoctorName === currentUser.name)
  const pendingReview = referrals.filter(r => {
    if (r.type !== 'upward' || r.status !== UPWARD_STATUS.PENDING || r.is_emergency) return false
    if (isCountyDepartmentHead) return matchesDepartmentScope(r.toDept, currentUser.dept)
    return isMine(r)
  })
  const inTransitOrdinary = referrals.filter(r => {
    if (r.type !== 'upward' || r.status !== UPWARD_STATUS.IN_TRANSIT || r.is_emergency) return false
    if (isCountyDepartmentHead) return matchesDepartmentScope(r.toDept, currentUser.dept)
    return isMine(r)
  })
  const downwardRecords = referrals.filter(r => {
    if (r.type !== 'downward') return false
    if (isCountyDepartmentHead) return r.fromDoctor === currentUser.name || matchesDepartmentScope(r.toDept, currentUser.dept)
    return r.fromDoctor === currentUser.name
  })
  const unreadNotifs = myNotifications.filter(n => !n.read).slice(0, 3)
  const todayPendingReviewCount = useMemo(
    () => pendingReview.filter(r => nowTs - new Date(r.createdAt) < 86400000).length,
    [nowTs, pendingReview],
  )

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-700">{isCountyDepartmentHead ? '科室工作台' : '首页'}</h2>
        <div className="text-xs text-gray-400 mt-0.5">{currentUser.name} · {currentUser.institution} · {currentUser.dept}</div>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard icon="⏳" iconBg="#FFF8E0" label={isCountyDepartmentHead ? '科室待受理转入' : '待受理转入'} items={[{ label: '待处理', value: pendingReview.length, color: '#f59e0b' }, { label: '今日', value: todayPendingReviewCount }]} onClick={() => navigate('/county/review-list')} />
        <StatCard icon="🏥" iconBg="#D4F5F9" label={isCountyDepartmentHead ? '科室进行中转入' : '进行中转入'} items={[{ label: isCountyDepartmentHead ? '本科室' : '我负责', value: inTransitOrdinary.length }, { label: '今日更新', value: inTransitOrdinary.filter(r => nowTs - new Date(r.updatedAt) < 86400000).length }]} onClick={() => navigate('/county/review-list')} />
        <StatCard
          icon="⬇️"
          iconBg="#C8F5E5"
          label={isCountyDepartmentHead ? '科室相关转出' : '我发起的转出'}
          items={[
            { label: '待接收', value: downwardRecords.filter(r => r.status === DOWNWARD_STATUS.PENDING).length, color: '#10b981' },
            { label: '转诊中', value: downwardRecords.filter(r => r.status === DOWNWARD_STATUS.IN_TRANSIT).length, color: '#f59e0b' },
            { label: '已完成', value: downwardRecords.filter(r => r.status === DOWNWARD_STATUS.COMPLETED).length, color: '#0892a0' },
          ]}
          onClick={() => navigate('/county/downward-records')}
        />
        <StatCard icon="🔔" iconBg="#EDE7F6" label="消息通知" items={[{ label: '未读', value: unreadNotifs.length, color: '#ef4444' }, { label: '总计', value: myNotifications.length, color: '#9ca3af' }]} onClick={() => navigate('/messages')} />
      </div>
      <div className="space-y-4">
        <div className="space-y-4">
          {/* 待受理 */}
          <div className="bg-white rounded" style={{ border: '1px solid #fde68a' }}>
            <div className="flex items-center justify-between px-4 py-2.5 rounded-t" style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#b45309' }}>
                <span>{isCountyDepartmentHead ? '⏳ 本科室待处理转入' : '⏳ 待处理转入'}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#fde68a', color: '#92400e' }}>{pendingReview.length}</span>
              </div>
              <button onClick={() => navigate('/county/review-list')} className="text-xs" style={{ color: '#0BBECF' }}>查看全部 →</button>
            </div>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#E0F6F9' }}>{['序号', '患者', '诊断', '转出机构', '转入科室', '申请时间', '操作'].map(h => <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>)}</tr></thead>
              <tbody>
                {pendingReview.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">暂无待受理申请</td></tr>
                  : pendingReview.map((ref, i) => (
                    <tr key={ref.id} className="cursor-pointer" style={{ borderBottom: '1px solid #EEF7F9' }} onClick={() => navigate(`/referral/${ref.id}`)} onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <td className={TD}><RowNo n={i + 1} /></td>
                      <td className={TD}><span className="font-medium text-gray-800">{ref.patient.name}</span><span className="text-xs text-gray-400 ml-1">{ref.patient.age ? `${ref.patient.age}岁` : '年龄未填'}</span></td>
                      <td className={TD + ' text-xs text-gray-600'}>{ref.diagnosis.name}</td>
                      <td className={TD + ' text-xs text-gray-400'}>{ref.fromInstitution}</td>
                      <td className={TD + ' text-gray-500'}>{ref.toDept}</td>
                      <td className={TD + ' text-xs text-gray-400'}>{fromNow(ref.createdAt, nowTs)}</td>
                      <td className={TD} onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/referral/${ref.id}`)} className={`text-xs px-2 py-1 rounded ${isCountyDepartmentHead ? '' : 'text-white'}`} style={isCountyDepartmentHead ? { color: '#0BBECF' } : { background: '#0BBECF' }}>{isCountyDepartmentHead ? '详情' : '受理'}</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* 转诊中 */}
          <div className="bg-white rounded" style={{ border: '1px solid #DDF0F3' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{isCountyDepartmentHead ? '本科室进行中转入' : '我负责的进行中转入'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#E0F6F9', color: '#0892a0' }}>{inTransitOrdinary.length}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate('/county/create-downward')} className="text-xs px-3 py-1.5 rounded text-white" style={{ background: '#0BBECF' }}>+ 发起转出</button>
                <button onClick={() => navigate('/county/review-list')} className="text-xs px-3 py-1.5 rounded border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>查看全部</button>
              </div>
            </div>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#E0F6F9' }}>{['序号', '患者', '诊断', '来源机构', '转诊单号', '状态', '操作'].map(h => <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>)}</tr></thead>
              <tbody>
                {inTransitOrdinary.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">{isCountyDepartmentHead ? '暂无本科室进行中转入' : '暂无我负责的进行中转入'}</td></tr>
                  : inTransitOrdinary.map((ref, i) => (
                    <tr key={ref.id} className="cursor-pointer" style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE' }} onClick={() => navigate(`/referral/${ref.id}`)} onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'} onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}>
                      <td className={TD}><RowNo n={i + 1} /></td>
                      <td className={TD}><span className="font-medium text-gray-800">{ref.patient.name}</span><span className="text-xs text-gray-400 ml-1">{ref.patient.age ? `${ref.patient.age}岁` : '年龄未填'}</span></td>
                      <td className={TD + ' text-xs text-gray-600'}>{ref.diagnosis.name}</td>
                      <td className={TD + ' text-xs text-gray-400'}>{ref.fromInstitution}</td>
                      <td className={TD}>{ref.referralCode || ref.referralNo ? <span className="font-mono text-xs" style={{ color: '#0892a0' }}>{ref.referralCode || ref.referralNo}</span> : <span className="text-gray-300">—</span>}</td>
                      <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                      <td className={TD} onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs" style={{ color: '#0BBECF' }}>详情</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

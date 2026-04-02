import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { UPWARD_STATUS, DOWNWARD_STATUS } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'

function fromNow(isoStr) {
  const diff = Date.now() - new Date(isoStr)
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
  const pendingReview = referrals.filter(r => r.type === 'upward' && r.status === UPWARD_STATUS.PENDING)
  // M-5 修复：删除不存在的 UPWARD_STATUS.ACCEPTED（state-machine 无该中间状态）
  const pendingConfirm = referrals.filter(r => r.type === 'upward' && r.status === UPWARD_STATUS.IN_TRANSIT)
  const unreadNotifs = myNotifications.filter(n => !n.read).slice(0, 3)

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-700">首页</h2>
        <div className="text-xs text-gray-400 mt-0.5">{currentUser.name} · {currentUser.institution} · {currentUser.dept}</div>
      </div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard icon="⏳" iconBg="#FFF8E0" label="待审核上转" items={[{ label: '待处理', value: pendingReview.length, color: '#f59e0b' }, { label: '今日', value: pendingReview.filter(r => Date.now() - new Date(r.createdAt) < 86400000).length }]} onClick={() => navigate('/county/review-list')} />
        <StatCard icon="🏥" iconBg="#D4F5F9" label="待确认接诊" items={[{ label: '待确认', value: pendingConfirm.length }]} onClick={() => navigate('/county/review-list')} />
        <StatCard icon="⬇️" iconBg="#C8F5E5" label="下转管理" items={[{ label: '今日', value: 2 }, { label: '本月', value: 9, color: '#9ca3af' }]} onClick={() => navigate('/county/downward-records')} />
        <StatCard icon="🔔" iconBg="#EDE7F6" label="消息通知" items={[{ label: '未读', value: unreadNotifs.length, color: '#ef4444' }, { label: '总计', value: myNotifications.length, color: '#9ca3af' }]} onClick={() => navigate('/messages')} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* 待审核 */}
          <div className="bg-white rounded" style={{ border: '1px solid #fde68a' }}>
            <div className="flex items-center justify-between px-4 py-2.5 rounded-t" style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#b45309' }}>
                <span>⏳ 待审核上转申请</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#fde68a', color: '#92400e' }}>{pendingReview.length}</span>
              </div>
              <button onClick={() => navigate('/county/review-list')} className="text-xs" style={{ color: '#0BBECF' }}>查看全部 →</button>
            </div>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#E0F6F9' }}>{['序号', '患者', '诊断', '转出机构', '期望科室', '申请时间', '操作'].map(h => <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>)}</tr></thead>
              <tbody>
                {pendingReview.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">暂无待审核申请</td></tr>
                  : pendingReview.map((ref, i) => (
                    <tr key={ref.id} className="cursor-pointer" style={{ borderBottom: '1px solid #EEF7F9' }} onClick={() => navigate(`/referral/${ref.id}`)} onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <td className={TD}><RowNo n={i + 1} /></td>
                      <td className={TD}><span className="font-medium text-gray-800">{ref.patient.name}</span><span className="text-xs text-gray-400 ml-1">{ref.patient.age}岁</span></td>
                      <td className={TD + ' text-xs text-gray-600'}>{ref.diagnosis.name}</td>
                      <td className={TD + ' text-xs text-gray-400'}>{ref.fromInstitution}</td>
                      <td className={TD + ' text-gray-500'}>{ref.toDept}</td>
                      <td className={TD + ' text-xs text-gray-400'}>{fromNow(ref.createdAt)}</td>
                      <td className={TD} onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs px-2 py-1 rounded text-white" style={{ background: '#0BBECF' }}>审核</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {/* 已接收 */}
          <div className="bg-white rounded" style={{ border: '1px solid #DDF0F3' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">已接收待确认接诊</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#E0F6F9', color: '#0892a0' }}>{pendingConfirm.length}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate('/county/create-downward')} className="text-xs px-3 py-1.5 rounded text-white" style={{ background: '#0BBECF' }}>+ 发起下转</button>
                <button onClick={() => navigate('/county/review-list')} className="text-xs px-3 py-1.5 rounded border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>查看全部</button>
              </div>
            </div>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#E0F6F9' }}>{['序号', '患者', '诊断', '来源机构', '转诊单号', '状态', '操作'].map(h => <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>)}</tr></thead>
              <tbody>
                {pendingConfirm.length === 0 ? <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">暂无待确认接诊</td></tr>
                  : pendingConfirm.map((ref, i) => (
                    <tr key={ref.id} className="cursor-pointer" style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE' }} onClick={() => navigate(`/referral/${ref.id}`)} onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'} onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}>
                      <td className={TD}><RowNo n={i + 1} /></td>
                      <td className={TD}><span className="font-medium text-gray-800">{ref.patient.name}</span><span className="text-xs text-gray-400 ml-1">{ref.patient.age}岁</span></td>
                      <td className={TD + ' text-xs text-gray-600'}>{ref.diagnosis.name}</td>
                      <td className={TD + ' text-xs text-gray-400'}>{ref.fromInstitution}</td>
                      <td className={TD}>{ref.referralNo ? <span className="font-mono text-xs" style={{ color: '#0892a0' }}>{ref.referralNo}</span> : <span className="text-gray-300">—</span>}</td>
                      <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                      <td className={TD} onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs mr-1" style={{ color: '#0BBECF' }}>详情</button>
                        <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs" style={{ color: '#10b981' }}>完成接诊</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* 右侧 */}
        <div className="space-y-4">
          <div className="bg-white rounded p-4" style={{ border: '1px solid #DDF0F3' }}>
            <div className="text-sm font-medium text-gray-700 mb-3">快捷操作</div>
            <div className="space-y-2">
              <button onClick={() => navigate('/county/create-downward')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm font-medium text-white" style={{ background: '#0BBECF' }}><span>⬇️</span><span>发起下转申请</span></button>
              <button onClick={() => navigate('/county/review-list')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}><span>⬆️</span><span>上转审核列表</span></button>
            </div>
          </div>
          <div className="bg-white rounded" style={{ border: '1px solid #DDF0F3' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">消息通知</span>
                {unreadNotifs.length > 0 && <span className="w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">{unreadNotifs.length}</span>}
              </div>
              <button onClick={() => navigate('/messages')} className="text-xs" style={{ color: '#0BBECF' }}>查看全部</button>
            </div>
            <div>
              {unreadNotifs.length === 0 ? <div className="py-6 text-center text-gray-400 text-sm">暂无未读消息</div>
                : unreadNotifs.map(n => (
                  <div key={n.id} onClick={() => navigate(`/referral/${n.referralId}`)} className="px-4 py-3 cursor-pointer" style={{ borderBottom: '1px solid #EEF7F9' }} onMouseEnter={e => e.currentTarget.style.background = '#F5FBFC'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: '#0BBECF' }} />
                      <div><div className="text-sm font-medium text-gray-800 leading-tight">{n.title}</div><div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.content}</div></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

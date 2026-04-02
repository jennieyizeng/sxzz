import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { UPWARD_STATUS, DOWNWARD_STATUS, ROLES } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'

function fromNow(isoStr) {
  const diff = Date.now() - new Date(isoStr)
  const d = Math.floor(diff / 86400000)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (d > 0) return `${d}天前`
  if (h > 0) return `${h}小时前`
  return `${m}分钟前`
}

function RowNo({ n }) {
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white flex-shrink-0"
      style={{ background: '#0BBECF' }}
    >
      {n}
    </span>
  )
}

function StatCard({ icon, iconBg, label, items, onClick }) {
  return (
    <div
      className="bg-white rounded flex items-center gap-3 px-4 py-4 transition-shadow cursor-pointer"
      style={{ border: '1px solid #DDF0F3', boxShadow: '0 1px 4px rgba(11,190,207,0.06)' }}
      onClick={onClick}
    >
      <div className="w-11 h-11 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700 mb-1.5">{label}</div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
          {items.map((it, i) => (
            <span key={i}>{it.label} <span className="font-semibold" style={{ color: it.color || '#0BBECF' }}>{it.value}</span></span>
          ))}
        </div>
      </div>
    </div>
  )
}

const TH = 'px-3 py-2 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

export default function PrimaryDashboard() {
  const { referrals, currentUser, myNotifications } = useApp()
  const navigate = useNavigate()

  // CHG-32：科主任视角 — 待院内审核列表
  const isPrimaryHead = currentUser.role === ROLES.PRIMARY_HEAD
  const pendingInternalReview = referrals.filter(r =>
    r.type === 'upward' &&
    r.status === UPWARD_STATUS.PENDING_INTERNAL_REVIEW &&
    r.fromInstitution === currentUser.institution
  )

  const pendingUpward = referrals.filter(r =>
    r.type === 'upward' && r.fromDoctor === currentUser.name && r.status === UPWARD_STATUS.PENDING
  )
  const pendingDownward = referrals.filter(r =>
    r.type === 'downward' && r.toInstitution === currentUser.institution && r.status === DOWNWARD_STATUS.PENDING
  )
  const myUpward = referrals.filter(r =>
    r.type === 'upward' && r.fromDoctor === currentUser.name
  ).slice(0, 5)
  const completedUpward = referrals.filter(r =>
    r.type === 'upward' && r.fromDoctor === currentUser.name && r.status === UPWARD_STATUS.COMPLETED
  )
  const unreadNotifs = myNotifications.filter(n => !n.read).slice(0, 3)

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-700">首页</h2>
        <div className="text-xs text-gray-400 mt-0.5">{currentUser.name} · {currentUser.institution} · {new Date().toLocaleDateString('zh-CN')}</div>
      </div>

      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard icon="⬆️" iconBg="#D4F5F9" label="上转管理"
          items={[
            { label: '待审核', value: pendingUpward.length },
            { label: '已完成', value: completedUpward.length, color: '#10b981' },
            { label: '草稿', value: referrals.filter(r => r.type === 'upward' && r.status === '草稿' && r.fromDoctor === currentUser.name).length, color: '#9ca3af' },
          ]}
          onClick={() => navigate('/primary/referral-list')}
        />
        {/* M-6 修复：删除不存在的 DOWNWARD_STATUS.ACCEPTED，改用转诊中统计 */}
        <StatCard icon="⬇️" iconBg="#C8F5E5" label="下转管理"
          items={[
            { label: '待接收', value: pendingDownward.length, color: '#f59e0b' },
            { label: '转诊中', value: referrals.filter(r => r.type === 'downward' && r.toInstitution === currentUser.institution && r.status === DOWNWARD_STATUS.IN_TRANSIT).length },
            { label: '已完成', value: referrals.filter(r => r.type === 'downward' && r.toInstitution === currentUser.institution && r.status === DOWNWARD_STATUS.COMPLETED).length, color: '#10b981' },
          ]}
          onClick={() => navigate('/primary/downward-list')}
        />
        <StatCard icon="🔔" iconBg="#EDE7F6" label="消息通知"
          items={[
            { label: '未读', value: unreadNotifs.length, color: '#ef4444' },
            { label: '今日', value: myNotifications.filter(n => Date.now() - new Date(n.createdAt) < 86400000).length },
            { label: '总计', value: myNotifications.length, color: '#9ca3af' },
          ]}
          onClick={() => navigate('/messages')}
        />
        <StatCard icon="📊" iconBg="#FFF3E0" label="本月汇总"
          items={[
            { label: '上转', value: myUpward.length },
            { label: '完成率', value: myUpward.length ? `${Math.round(completedUpward.length / myUpward.length * 100)}%` : '—', color: '#10b981' },
          ]}
          onClick={null}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* 待接收下转（有则优先）*/}
          {pendingDownward.length > 0 && (
            <div className="bg-white rounded" style={{ border: '1px solid #fde68a' }}>
              <div className="flex items-center justify-between px-4 py-2.5 rounded-t" style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#b45309' }}>
                  <span>⬇️ 待接收下转</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#fde68a', color: '#92400e' }}>{pendingDownward.length}</span>
                </div>
                <button onClick={() => navigate('/primary/downward-list')} className="text-xs" style={{ color: '#0BBECF' }}>立即处理 →</button>
              </div>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#E0F6F9' }}>
                    {['序号', '患者', '诊断', '来源机构', '备注', '状态', '操作'].map(h => (
                      <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingDownward.map((ref, i) => (
                    <tr key={ref.id} style={{ borderBottom: '1px solid #EEF7F9' }}>
                      <td className={TD}><RowNo n={i + 1} /></td>
                      <td className={TD}><span className="font-medium text-gray-800">{ref.patient.name}</span><span className="text-xs text-gray-400 ml-1">{ref.patient.age}岁</span></td>
                      <td className={TD + ' text-gray-600'}>{ref.diagnosis.name}</td>
                      <td className={TD + ' text-xs text-gray-400'}>{ref.fromInstitution}</td>
                      <td className={TD}>{ref.rehabPlan && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#E0F6F9', color: '#0892a0' }}>含康复方案</span>}</td>
                      <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                      <td className={TD}><button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs" style={{ color: '#0BBECF' }}>处理</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CHG-32：科主任专属 — 待院内审核转诊单 */}
          {isPrimaryHead && (
            <div className="bg-white rounded overflow-hidden" style={{ border: pendingInternalReview.length > 0 ? '2px solid #a855f7' : '1px solid #e9d5ff' }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ background: pendingInternalReview.length > 0 ? '#faf5ff' : '#fdfaff', borderBottom: '1px solid #e9d5ff' }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: '#7c3aed' }}>📋 待院内审核（F-02）</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#f3e8ff', color: '#6d28d9' }}>{pendingInternalReview.length}</span>
                  {pendingInternalReview.length > 0 && (
                    <span className="text-xs text-purple-500">本机构上转申请待您审核</span>
                  )}
                </div>
              </div>
              {pendingInternalReview.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">暂无待审核的上转申请</div>
              ) : (
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f3e8ff' }}>
                      {['序号', '患者', '诊断', '申请医生', '提交时间', '操作'].map(h => (
                        <th key={h} className={TH} style={{ color: '#6d28d9', borderBottom: '1px solid #e9d5ff' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInternalReview.map((ref, i) => (
                      <tr key={ref.id}
                        className="cursor-pointer"
                        style={{ borderBottom: '1px solid #f3e8ff', background: i % 2 === 0 ? '#fff' : '#fdfaff' }}
                        onClick={() => navigate(`/referral/${ref.id}`)}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f0ff'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fdfaff'}
                      >
                        <td className={TD}><RowNo n={i + 1} /></td>
                        <td className={TD}>
                          <span className="font-medium text-gray-800">{ref.patient.name}</span>
                          <span className="text-xs text-gray-400 ml-1">{ref.patient.gender}/{ref.patient.age}岁</span>
                        </td>
                        <td className={TD + ' text-xs text-gray-600'}>
                          <span className="font-mono mr-1" style={{ color: '#7c3aed' }}>{ref.diagnosis.code}</span>{ref.diagnosis.name}
                        </td>
                        <td className={TD + ' text-gray-500'}>{ref.fromDoctor}</td>
                        <td className={TD + ' text-xs text-gray-400'}>{fromNow(ref.createdAt)}</td>
                        <td className={TD}>
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/referral/${ref.id}`) }}
                            className="text-xs px-3 py-1 rounded font-medium text-white"
                            style={{ background: '#7c3aed' }}
                          >
                            审核
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 上转记录表格 */}
          <div className="bg-white rounded" style={{ border: '1px solid #DDF0F3' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">我的上转记录</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#E0F6F9', color: '#0892a0' }}>{myUpward.length}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate('/primary/create-referral')} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded text-white" style={{ background: '#0BBECF' }}>
                  + 发起上转
                </button>
                <button onClick={() => navigate('/primary/referral-list')} className="text-xs px-3 py-1.5 rounded border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
                  查看全部
                </button>
              </div>
            </div>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#E0F6F9' }}>
                  {['序号', '患者姓名', '诊断（ICD-10）', '期望科室', '状态', '更新时间', '操作'].map(h => (
                    <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myUpward.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">暂无上转记录</td></tr>
                ) : myUpward.map((ref, i) => (
                  <tr
                    key={ref.id}
                    className="cursor-pointer"
                    style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE' }}
                    onClick={() => navigate(`/referral/${ref.id}`)}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}
                  >
                    <td className={TD}><RowNo n={i + 1} /></td>
                    <td className={TD}>
                      <span className="font-medium text-gray-800">{ref.patient.name}</span>
                      <span className="text-xs text-gray-400 ml-1">{ref.patient.gender}/{ref.patient.age}岁</span>
                    </td>
                    <td className={TD + ' text-xs text-gray-600'}>
                      <span className="font-mono mr-1" style={{ color: '#0892a0' }}>{ref.diagnosis.code}</span>{ref.diagnosis.name}
                    </td>
                    <td className={TD + ' text-gray-500'}>{ref.toDept || '—'}</td>
                    <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                    <td className={TD + ' text-xs text-gray-400'}>{fromNow(ref.updatedAt)}</td>
                    <td className={TD}>
                      <button onClick={e => { e.stopPropagation(); navigate(`/referral/${ref.id}`) }} className="text-xs" style={{ color: '#0BBECF' }}>详情</button>
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
              <button onClick={() => navigate('/primary/create-referral')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm font-medium text-white" style={{ background: '#0BBECF' }}>
                <span>⬆️</span><span>发起上转申请</span>
              </button>
              <button onClick={() => navigate('/primary/downward-list')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
                <span>⬇️</span><span>查看下转列表</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded" style={{ border: '1px solid #DDF0F3' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">消息通知</span>
                {unreadNotifs.length > 0 && (
                  <span className="w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">{unreadNotifs.length}</span>
                )}
              </div>
              <button onClick={() => navigate('/messages')} className="text-xs" style={{ color: '#0BBECF' }}>查看全部</button>
            </div>
            <div>
              {unreadNotifs.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-sm">暂无未读消息</div>
              ) : unreadNotifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => navigate(`/referral/${n.referralId}`)}
                  className="px-4 py-3 cursor-pointer"
                  style={{ borderBottom: '1px solid #EEF7F9' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F5FBFC'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: '#0BBECF' }} />
                    <div>
                      <div className="text-sm font-medium text-gray-800 leading-tight">{n.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.content}</div>
                    </div>
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

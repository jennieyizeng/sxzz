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

function buildInternalReviewRecords(referrals, institutionName) {
  return referrals
    .filter(ref =>
      ref.type === 'upward' &&
      ref.fromInstitution === institutionName &&
      (
        ref.status === UPWARD_STATUS.PENDING_INTERNAL_REVIEW ||
        (ref.internalAuditLog || []).length > 0
      )
    )
    .map(ref => {
      const latestAudit = (ref.internalAuditLog || []).at(-1) || null
      const isPending = ref.status === UPWARD_STATUS.PENDING_INTERNAL_REVIEW

      return {
        ...ref,
        reviewStatusLabel: isPending ? '待审核' : '已审核',
        latestAudit,
        latestReviewTime: latestAudit?.time || ref.updatedAt || ref.createdAt,
      }
    })
    .sort((a, b) => {
      if (a.reviewStatusLabel !== b.reviewStatusLabel) {
        return a.reviewStatusLabel === '待审核' ? -1 : 1
      }
      return new Date(b.latestReviewTime) - new Date(a.latestReviewTime)
    })
}

function InternalReviewTable({ records, navigate, emptyText }) {
  const TH = 'px-3 py-2 text-left text-xs font-medium whitespace-nowrap'
  const TD = 'px-3 py-2.5 text-sm'

  return (
    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#f3e8ff' }}>
          {['序号', '患者', '诊断', '申请医生', '提交时间', '审核状态', '最近处理', '操作'].map(h => (
            <th key={h} className={TH} style={{ color: '#6d28d9', borderBottom: '1px solid #e9d5ff' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {records.length === 0 ? (
          <tr>
            <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">{emptyText}</td>
          </tr>
        ) : records.map((ref, i) => (
          <tr
            key={ref.id}
            className="cursor-pointer"
            style={{ borderBottom: '1px solid #f3e8ff', background: i % 2 === 0 ? '#fff' : '#fdfaff' }}
            onClick={() => navigate(`/referral/${ref.id}`)}
            onMouseEnter={e => { e.currentTarget.style.background = '#f5f0ff' }}
            onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fdfaff' }}
          >
            <td className={TD}><RowNo n={i + 1} /></td>
            <td className={TD}>
              <span className="font-medium text-gray-800">{ref.patient.name}</span>
              <span className="text-xs text-gray-400 ml-1">{ref.patient.gender || '未知'}/{ref.patient.age ? `${ref.patient.age}岁` : '年龄未填'}</span>
            </td>
            <td className={TD + ' text-xs text-gray-600'}>
              <span className="font-mono mr-1" style={{ color: '#7c3aed' }}>{ref.diagnosis.code}</span>{ref.diagnosis.name}
            </td>
            <td className={TD + ' text-gray-500'}>{ref.fromDoctor}</td>
            <td className={TD + ' text-xs text-gray-400'}>{fromNow(ref.createdAt)}</td>
            <td className={TD}>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={ref.reviewStatusLabel === '待审核'
                  ? { background: '#f3e8ff', color: '#6d28d9', border: '1px solid #d8b4fe' }
                  : { background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
              >
                {ref.reviewStatusLabel}
              </span>
            </td>
            <td className={TD + ' text-xs text-gray-500'}>
              {ref.reviewStatusLabel === '待审核'
                ? '待负责人处理'
                : `${ref.latestAudit?.action || '已处理'} · ${fromNow(ref.latestReviewTime)}`}
            </td>
            <td className={TD}>
              <button
                onClick={event => {
                  event.stopPropagation()
                  navigate(`/referral/${ref.id}`)
                }}
                className="text-xs px-3 py-1 rounded font-medium text-white"
                style={{ background: ref.reviewStatusLabel === '待审核' ? '#7c3aed' : '#0BBECF' }}
              >
                {ref.reviewStatusLabel === '待审核' ? '处理' : '查看详情'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const TH = 'px-3 py-2 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

export default function PrimaryDashboard({ mode = 'workbench' }) {
  const { referrals, currentUser, myNotifications } = useApp()
  const navigate = useNavigate()

  const isPrimaryHead = currentUser.role === ROLES.PRIMARY_HEAD
  const isInternalReviewPage = mode === 'internalReview'
  const institutionInternalReviewRecords = isPrimaryHead
    ? buildInternalReviewRecords(referrals, currentUser.institution)
    : []
  const pendingInternalReview = institutionInternalReviewRecords.filter(item => item.reviewStatusLabel === '待审核')
  const pendingInternalReviewPreview = pendingInternalReview.slice(0, 3)

  const pendingUpward = referrals.filter(r =>
    r.type === 'upward' && r.fromDoctor === currentUser.name && r.status === UPWARD_STATUS.PENDING
  )
  const emergencyInTransit = referrals.filter(r =>
    r.type === 'upward' && r.fromDoctor === currentUser.name && r.is_emergency === true && r.status === UPWARD_STATUS.IN_TRANSIT
  )
  const scopedDownward = referrals.filter(r => {
    if (r.type !== 'downward' || r.toInstitution !== currentUser.institution) return false
    const mode = r.allocationMode || (r.designatedDoctorId ? 'designated' : 'coordinator')

    if (isPrimaryHead) {
      if (r.status === DOWNWARD_STATUS.PENDING) {
        return mode === 'coordinator' || mode === 'coordinator_reassign' || r.designatedDoctorId === currentUser.id
      }
      return r.downwardAssignedDoctorId === currentUser.id || r.designatedDoctorId === currentUser.id || mode === 'coordinator_reassign'
    }

    if (r.status === DOWNWARD_STATUS.PENDING) {
      return r.designatedDoctorId === currentUser.id
    }

    return r.downwardAssignedDoctorId === currentUser.id || r.designatedDoctorId === currentUser.id
  })
  const pendingDownward = scopedDownward.filter(r => r.status === DOWNWARD_STATUS.PENDING)
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
        <h2 className="text-base font-semibold text-gray-700">{isInternalReviewPage ? '院内审核' : '工作台'}</h2>
        <div className="text-xs text-gray-400 mt-0.5">
          {isInternalReviewPage
            ? `${currentUser.name} · 显示本机构全部院内审核记录`
            : `${currentUser.name} · ${currentUser.institution} · ${new Date().toLocaleDateString('zh-CN')}`}
        </div>
      </div>

      {isInternalReviewPage ? (
        <div className="bg-white rounded overflow-hidden" style={{ border: '1px solid #e9d5ff' }}>
          <div className="px-4 py-3" style={{ background: '#faf5ff', borderBottom: '1px solid #e9d5ff' }}>
            <div className="text-sm font-medium" style={{ color: '#7c3aed' }}>全部院内审核记录</div>
            <div className="text-xs mt-1" style={{ color: '#8b5cf6' }}>显示本机构全部院内审核记录，包含待审核与已审核条目。</div>
          </div>
          <InternalReviewTable
            records={institutionInternalReviewRecords}
            navigate={navigate}
            emptyText="暂无院内审核记录"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <StatCard icon="⬆️" iconBg="#D4F5F9" label="转出管理"
              items={[
                { label: '待受理', value: pendingUpward.length },
                { label: '急诊中', value: emergencyInTransit.length, color: '#ef4444' },
                { label: '已完成', value: completedUpward.length, color: '#10b981' },
                { label: '草稿', value: referrals.filter(r => r.type === 'upward' && r.status === '草稿' && r.fromDoctor === currentUser.name).length, color: '#9ca3af' },
              ]}
              onClick={() => navigate('/primary/referral-list')}
            />
            <StatCard icon="⬇️" iconBg="#C8F5E5" label="转入管理"
              items={[
                { label: '待处理', value: pendingDownward.length, color: '#f59e0b' },
                { label: '转诊中', value: scopedDownward.filter(r => r.status === DOWNWARD_STATUS.IN_TRANSIT).length },
                { label: '已完成', value: scopedDownward.filter(r => r.status === DOWNWARD_STATUS.COMPLETED).length, color: '#10b981' },
              ]}
              onClick={() => navigate('/primary/downward-list')}
            />
            <StatCard icon="🔔" iconBg="#EDE7F6" label="消息通知"
              items={[
                { label: '未读', value: unreadNotifs.length, color: '#ef4444' },
                { label: '总计', value: myNotifications.length, color: '#9ca3af' },
              ]}
              onClick={() => navigate('/messages')}
            />
            <StatCard icon="📊" iconBg="#FFF3E0" label="本月汇总"
              items={[
                { label: '转出', value: myUpward.length },
                { label: '完成率', value: myUpward.length ? `${Math.round(completedUpward.length / myUpward.length * 100)}%` : '—', color: '#10b981' },
              ]}
              onClick={null}
            />
          </div>

          {pendingDownward.length > 0 && (
            <div className="bg-white rounded" style={{ border: '1px solid #fde68a' }}>
              <div className="flex items-center justify-between px-4 py-2.5 rounded-t" style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#b45309' }}>
                  <span>⬇️ 待处理转入</span>
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
                      <td className={TD}><span className="font-medium text-gray-800">{ref.patient.name}</span><span className="text-xs text-gray-400 ml-1">{ref.patient.age ? `${ref.patient.age}岁` : '年龄未填'}</span></td>
                      <td className={TD + ' text-gray-600'}>{ref.diagnosis.name}</td>
                      <td className={TD + ' text-xs text-gray-400'}>{ref.fromInstitution}</td>
                      <td className={TD}>{ref.rehabPlan && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#E0F6F9', color: '#0892a0' }}>含康复方案</span>}</td>
                      <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                      <td className={TD}><button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs" style={{ color: '#0BBECF' }}>查看处理</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {emergencyInTransit.length > 0 && (
            <div className="bg-white rounded overflow-hidden" style={{ border: '2px solid #fecaca' }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-red-700">⚡ 急诊处理中</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#fee2e2', color: '#b91c1c' }}>{emergencyInTransit.length}</span>
                  <span className="text-xs text-red-400">急诊/绿通提交后直接进入转诊中，由转诊中心补录接诊信息并完成接诊确认</span>
                </div>
              </div>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FEF2F2' }}>
                    {['序号', '患者', '诊断', '当前状态', '更新时间', '操作'].map(h => (
                      <th key={h} className={TH} style={{ color: '#b91c1c', borderBottom: '1px solid #fecaca' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {emergencyInTransit.map((ref, i) => (
                    <tr key={ref.id} style={{ borderBottom: '1px solid #FEE2E2', background: i % 2 === 0 ? '#fff' : '#FFF7F7' }}>
                      <td className={TD}><RowNo n={i + 1} /></td>
                      <td className={TD}>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded mr-1 bg-red-100 text-red-700 border border-red-200">
                          {ref.isUrgentUnhandled ? '急诊·超时' : '急诊'}
                        </span>
                        {ref.isRetroEntry && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded mr-1 bg-gray-100 text-gray-700 border border-gray-300">
                            补录
                          </span>
                        )}
                        {ref.referral_type === 'green_channel' && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded mr-1 text-white" style={{ background: '#10b981' }}>绿通</span>
                        )}
                        <span className="font-medium text-gray-800">{ref.patient.name}</span>
                      </td>
                      <td className={TD + ' text-gray-600'}>{ref.diagnosis.name}</td>
                      <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                      <td className={TD + ' text-xs text-gray-400'}>{fromNow(ref.updatedAt)}</td>
                      <td className={TD}><button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs" style={{ color: '#ef4444' }}>查看进度</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isPrimaryHead && (
            <div className="bg-white rounded overflow-hidden" style={{ border: pendingInternalReview.length > 0 ? '2px solid #a855f7' : '1px solid #e9d5ff' }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ background: pendingInternalReview.length > 0 ? '#faf5ff' : '#fdfaff', borderBottom: '1px solid #e9d5ff' }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: '#7c3aed' }}>📋 待院内审核</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#f3e8ff', color: '#6d28d9' }}>{pendingInternalReview.length}</span>
                  {pendingInternalReview.length > 0 && (
                    <span className="text-xs text-purple-500">仅展示待审核的前几条</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate('/primary/internal-review')} className="text-xs px-3 py-1.5 rounded text-white" style={{ background: '#7c3aed' }}>立即处理</button>
                  <button onClick={() => navigate('/primary/internal-review')} className="text-xs px-3 py-1.5 rounded border" style={{ color: '#7c3aed', borderColor: '#c4b5fd' }}>查看全部</button>
                </div>
              </div>
              <InternalReviewTable
                records={pendingInternalReviewPreview}
                navigate={navigate}
                emptyText="暂无待审核记录"
              />
            </div>
          )}

          <div className="bg-white rounded" style={{ border: '1px solid #DDF0F3' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">我的转出记录</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#E0F6F9', color: '#0892a0' }}>{myUpward.length}</span>
              </div>
              <div className="flex gap-2">
                {!isPrimaryHead && (
                  <button onClick={() => navigate('/primary/create-referral')} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded text-white" style={{ background: '#0BBECF' }}>
                    + 发起转出
                  </button>
                )}
                <button onClick={() => navigate('/primary/referral-list')} className="text-xs px-3 py-1.5 rounded border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
                  查看全部
                </button>
              </div>
            </div>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#E0F6F9' }}>
                  {['序号', '患者姓名', '诊断（ICD-10）', '转入科室', '状态', '更新时间', '操作'].map(h => (
                    <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myUpward.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">暂无转出记录</td></tr>
                ) : myUpward.map((ref, i) => (
                  <tr
                    key={ref.id}
                    className="cursor-pointer"
                    style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE' }}
                    onClick={() => navigate(`/referral/${ref.id}`)}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F0FBFC' }}
                    onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE' }}
                  >
                    <td className={TD}><RowNo n={i + 1} /></td>
                    <td className={TD}>
                      <span className="font-medium text-gray-800">{ref.patient.name}</span>
                      <span className="text-xs text-gray-400 ml-1">{ref.patient.gender || '未知'}/{ref.patient.age ? `${ref.patient.age}岁` : '年龄未填'}</span>
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
      )}
    </div>
  )
}

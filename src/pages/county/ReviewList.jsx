import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ROLES, UPWARD_STATUS } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'
import { canCurrentCountyDoctorViewIncomingReferral, matchesDepartmentScope } from '../../utils/countyReferralAccess'

// P0-6：COUNTY2 也属于县级医生角色
const COUNTY_ROLES = [ROLES.COUNTY, ROLES.COUNTY2]

function RowNo({ n }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>
      {n}
    </span>
  )
}

// 急诊角标
function EmergencyTag() {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded mr-1"
      style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5' }}
    >
      🔴 急诊
    </span>
  )
}

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'
const STATUS_FILTERS = ['全部', '待受理', '急诊', '转诊中', '已完成', '已拒绝']

export default function CountyReviewList() {
  const { referrals, currentUser } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('全部')
  const [search, setSearch] = useState('')
  const isOrdinaryCountyDoctor = currentUser.role === ROLES.COUNTY
  const isCountyDepartmentHead = currentUser.role === ROLES.COUNTY2

  const upwardRefs = referrals.filter(r =>
    r.type === 'upward' &&
    (
      isOrdinaryCountyDoctor
        ? (!r.is_emergency && canCurrentCountyDoctorViewIncomingReferral(r, currentUser))
        : isCountyDepartmentHead
          ? (!r.is_emergency && matchesDepartmentScope(r.toDept, currentUser.dept))
          : true
    )
  )

  const availableStatusFilters = (isOrdinaryCountyDoctor || isCountyDepartmentHead)
    ? STATUS_FILTERS.filter(item => item !== '急诊')
    : STATUS_FILTERS
  const filtered = upwardRefs
    .filter(r => {
      if (filter === '全部') return true
      if (filter === '急诊') return r.is_emergency === true
      if (filter === '待受理') return r.status === UPWARD_STATUS.PENDING
      return r.status === filter
    })
    .filter(r => !search || r.patient.name.includes(search) || r.diagnosis.name.includes(search))

  // 急诊置顶排序（state-machine.md：急诊转诊列表中置顶显示）
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_emergency && !b.is_emergency) return -1
    if (!a.is_emergency && b.is_emergency) return 1
    return 0
  })

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-700">{isCountyDepartmentHead ? '科室待受理转入' : '待受理转入列表'}</h2>
        <div className="text-xs text-gray-400 mt-0.5">
          {isOrdinaryCountyDoctor
            ? '仅显示当前县级医生本人负责或当前可受理的普通转入单据'
            : isCountyDepartmentHead
              ? '仅显示本科室相关普通转入单据'
              : '待受理及历史转入申请，急诊申请自动置顶展示 · 急诊/绿通由转诊中心处理，县级医生此页只读查看'}
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded px-4 py-3 mb-3 flex flex-wrap items-center gap-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">患者姓名：</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="请输入患者姓名或诊断"
            className="border border-gray-200 rounded px-2.5 py-1.5 text-sm w-44 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">申请状态：</span>
          <div className="flex gap-2 flex-wrap">
            {availableStatusFilters.map(s => (
              <label key={s} className="flex items-center gap-1 cursor-pointer text-sm text-gray-600">
                <input type="radio" name="rstatus" checked={filter === s} onChange={() => setFilter(s)} style={{ accentColor: '#0BBECF' }} />
                {s === '急诊' ? <span style={{ color: '#DC2626', fontWeight: 600 }}>🔴 急诊</span> : s}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 ml-auto">
          <button className="flex items-center gap-1 px-4 py-1.5 rounded text-sm text-white" style={{ background: '#0BBECF' }}>
            🔍 查询
          </button>
          <button onClick={() => { setSearch(''); setFilter('全部') }} className="flex items-center gap-1 px-4 py-1.5 rounded text-sm border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
            ↺ 重置
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#E0F6F9' }}>
              {['序号', '患者姓名', '性别/年龄', '诊断', '转出机构', '经治医生', '转入科室', '状态', '申请时间', '操作'].map(h => (
                <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={10} className="py-12 text-center text-gray-400 text-sm"><div className="text-3xl mb-2">📭</div>{isCountyDepartmentHead ? '暂无本科室待受理转入' : '暂无待受理转入'}</td></tr>
            ) : sorted.map((ref, i) => {
              const isEmergency = ref.is_emergency === true
              // P0-6：改用 assignedDoctorId 判断受理状态
              const isClaimed = !!ref.assignedDoctorId
              const isClaimedByMe = isClaimed && ref.assignedDoctorId === currentUser?.id
              // P0-6：isUrgentUnhandled=true 时行样式更醒目
              const isUrgent = isEmergency && ref.isUrgentUnhandled
              const rowBg = isUrgent ? '#FEE2E2' : isEmergency ? '#FFF1F2' : (i % 2 === 0 ? '#fff' : '#FAFEFE')
              const rowHoverBg = isUrgent ? '#FECACA' : isEmergency ? '#FFE4E6' : '#F0FBFC'

              return (
                <tr
                  key={ref.id}
                  className="cursor-pointer"
                  style={{ borderBottom: '1px solid #EEF7F9', background: rowBg }}
                  onClick={() => navigate(`/referral/${ref.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = rowHoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}
                >
                  <td className={TD}><RowNo n={i + 1} /></td>
                  <td className={TD}>
                    {isUrgent
                      ? <span className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded mr-1 bg-red-200 text-red-800 border border-red-400">🔴 急诊 · 4h未受理 · 需立即处理</span>
                      : isEmergency && <EmergencyTag />
                    }
                    {ref.isRetroEntry && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded mr-1 bg-gray-100 text-gray-700 border border-gray-300">
                        补录
                      </span>
                    )}
                    <span className="font-medium text-gray-800">{ref.patient.name}</span>
                  </td>
                  <td className={TD + ' text-xs text-gray-500'}>{ref.patient.gender || '未知'}/{ref.patient.age ? `${ref.patient.age}岁` : '年龄未填'}</td>
                  <td className={TD + ' text-xs text-gray-600'}>
                    <span className="font-mono mr-1" style={{ color: '#0892a0' }}>{ref.diagnosis.code}</span>{ref.diagnosis.name}
                  </td>
                  <td className={TD + ' text-xs text-gray-400'}>{ref.fromInstitution}</td>
                  <td className={TD + ' text-gray-600'}>{ref.fromDoctor}</td>
<td className={TD + ' text-gray-500'}>{ref.toDept || '—'}</td>
                   <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                   <td className={TD + ' text-xs text-gray-400'}>{new Date(ref.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                   <td className={TD} onClick={e => e.stopPropagation()}>
                     <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs mr-2" style={{ color: '#0BBECF' }}>详情</button>
                     {!isCountyDepartmentHead && ref.status === UPWARD_STATUS.PENDING && !isEmergency && (isClaimedByMe || !isClaimed) && (
                       <>
                         <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs mr-1" style={{ color: '#10b981' }}>受理</button>
                         <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs" style={{ color: '#ef4444' }}>拒绝</button>
                       </>
                     )}
                   </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {sorted.length > 0 && (
          <div className="px-4 py-2.5 text-xs text-gray-400 flex items-center gap-4" style={{ borderTop: '1px solid #EEF7F9', background: '#FAFEFE' }}>
            <span>共 {sorted.length} 条记录</span>
            {!isOrdinaryCountyDoctor && !isCountyDepartmentHead && sorted.filter(r => r.is_emergency).length > 0 && (
              <span style={{ color: '#DC2626' }}>
                🔴 急诊 {sorted.filter(r => r.is_emergency).length} 条（已置顶，只读展示）
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

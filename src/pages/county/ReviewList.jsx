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

function getReferralNo(ref) {
  return ref.referralNo || ref.referralCode || ref.id || '—'
}

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'
const INITIAL_FILTERS = {
  patientName: '',
  diagnosis: '',
  referralNo: '',
  fromInstitution: '',
  applyDate: '',
}

export default function CountyReviewList() {
  const { referrals, currentUser, deleteDraftReferral } = useApp()
  const navigate = useNavigate()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const isOrdinaryCountyDoctor = currentUser.role === ROLES.COUNTY
  const isCountyDepartmentHead = currentUser.role === ROLES.COUNTY2

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const upwardRefs = referrals.filter(r =>
    r.type === 'upward' &&
    r.status === UPWARD_STATUS.PENDING &&
    (
      isOrdinaryCountyDoctor
        ? (!r.is_emergency && canCurrentCountyDoctorViewIncomingReferral(r, currentUser))
        : isCountyDepartmentHead
          ? (!r.is_emergency && matchesDepartmentScope(r.toDept, currentUser.dept))
          : true
    )
  )

  const filtered = upwardRefs
    .filter(r => {
      const referralNo = getReferralNo(r)
      const applyDate = r.createdAt ? String(r.createdAt).slice(0, 10) : ''
      if (filters.patientName && !r.patient.name.includes(filters.patientName)) return false
      if (filters.diagnosis && !`${r.diagnosis.code || ''}${r.diagnosis.name || ''}`.includes(filters.diagnosis)) return false
      if (filters.referralNo && !referralNo.includes(filters.referralNo)) return false
      if (filters.fromInstitution && !String(r.fromInstitution || '').includes(filters.fromInstitution)) return false
      if (filters.applyDate && applyDate !== filters.applyDate) return false
      return true
    })

  // 急诊置顶排序（state-machine.md：急诊转诊列表中置顶显示）
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_emergency && !b.is_emergency) return -1
    if (!a.is_emergency && b.is_emergency) return 1
    return 0
  })
  const handleDeleteDraft = (ref) => {
    if (window.confirm('确认删除该草稿？删除后无法恢复。')) {
      deleteDraftReferral(ref.id)
    }
  }

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-700">{isCountyDepartmentHead ? '科室待受理转入' : '待受理转入列表'}</h2>
        <div className="text-xs text-gray-400 mt-0.5">
          {isOrdinaryCountyDoctor
            ? '仅显示当前县级医生本人可受理的普通待受理转入单据'
            : isCountyDepartmentHead
              ? '仅显示本科室相关普通待受理转入单据'
              : '仅显示待受理转入申请 · 急诊/绿通由转诊中心处理，县级医生此页只读查看'}
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded px-4 py-3 mb-3 flex flex-wrap items-center gap-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">患者姓名：</span>
          <input
            type="text" value={filters.patientName} onChange={e => updateFilter('patientName', e.target.value)}
            placeholder="请输入患者姓名"
            className="border border-gray-200 rounded px-2.5 py-1.5 text-sm w-36 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">诊断：</span>
          <input
            type="text" value={filters.diagnosis} onChange={e => updateFilter('diagnosis', e.target.value)}
            placeholder="编码或名称"
            className="border border-gray-200 rounded px-2.5 py-1.5 text-sm w-36 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">转诊单号：</span>
          <input
            type="text" value={filters.referralNo} onChange={e => updateFilter('referralNo', e.target.value)}
            placeholder="请输入单号"
            className="border border-gray-200 rounded px-2.5 py-1.5 text-sm w-36 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">转出机构：</span>
          <input
            type="text" value={filters.fromInstitution} onChange={e => updateFilter('fromInstitution', e.target.value)}
            placeholder="请输入机构"
            className="border border-gray-200 rounded px-2.5 py-1.5 text-sm w-36 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">申请时间：</span>
          <input
            type="date" value={filters.applyDate} onChange={e => updateFilter('applyDate', e.target.value)}
            className="border border-gray-200 rounded px-2.5 py-1.5 text-sm w-40 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <button className="flex items-center gap-1 px-4 py-1.5 rounded text-sm text-white" style={{ background: '#0BBECF' }}>
            🔍 查询
          </button>
          <button onClick={() => setFilters(INITIAL_FILTERS)} className="flex items-center gap-1 px-4 py-1.5 rounded text-sm border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
            ↺ 重置
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#E0F6F9' }}>
              {['序号', '患者信息', '诊断（ICD-10）', '转诊单号', '转出机构', '转入科室', '状态', '申请时间', '操作'].map(h => (
                <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm"><div className="text-3xl mb-2">📭</div>{isCountyDepartmentHead ? '暂无本科室待受理转入' : '暂无待受理转入'}</td></tr>
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
                    <div className="flex items-center gap-1 flex-wrap">
                      {isUrgent
                        ? <span className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded bg-red-200 text-red-800 border border-red-400">🔴 急诊 · 4h未受理 · 需立即处理</span>
                        : isEmergency && <EmergencyTag />
                      }
                      {ref.referral_type === 'green_channel' && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ background: '#10b981' }}>绿通</span>
                      )}
                      {ref.isRetroEntry && (
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-300">
                          补录
                        </span>
                      )}
                      <span className="font-medium text-gray-800">{ref.patient.name}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{ref.patient.gender || '未知'} / {ref.patient.age ? `${ref.patient.age}岁` : '年龄未填'}</div>
                  </td>
                  <td className={TD + ' text-xs text-gray-600'}>
                    <span className="font-mono mr-1" style={{ color: '#0892a0' }}>{ref.diagnosis.code}</span>{ref.diagnosis.name}
                  </td>
                  <td className={TD + ' text-xs text-gray-500'}>{getReferralNo(ref)}</td>
                  <td className={TD + ' text-xs text-gray-400'}>{ref.fromInstitution}</td>
<td className={TD + ' text-gray-500'}>{ref.toDept || '—'}</td>
                   <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                   <td className={TD + ' text-xs text-gray-400'}>{new Date(ref.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                   <td className={TD} onClick={e => e.stopPropagation()}>
                     <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs mr-2" style={{ color: '#0BBECF' }}>详情</button>
                     {ref.status === UPWARD_STATUS.DRAFT && (
                       <>
                         <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs mr-2" style={{ color: '#2563eb' }}>编辑</button>
                         <button onClick={() => handleDeleteDraft(ref)} className="text-xs mr-2" style={{ color: '#ef4444' }}>删除</button>
                       </>
                     )}
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

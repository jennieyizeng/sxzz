import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ROLES, UPWARD_STATUS } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'
import { matchesDepartmentScope } from '../../utils/countyReferralAccess'

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}
function RowNo({ n }) {
  return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>{n}</span>
}
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

export default function CountyReferralRecords() {
  const navigate = useNavigate()
  const { referrals, currentUser } = useApp()
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [applied, setApplied] = useState({ keyword: '', status: '全部' })
  const isOrdinaryCountyDoctor = currentUser.role === ROLES.COUNTY
  const isCountyDepartmentHead = currentUser.role === ROLES.COUNTY2
  const isMine = (referral) =>
    referral.assignedDoctorId === currentUser.id ||
    referral.assignedDoctorName === currentUser.name ||
    referral.assignedDoctor === currentUser.name

  const allStatus = ['全部', '待受理', '转诊中', '已完成', '已拒绝']

  const data = referrals.filter(r => {
    if (r.type !== 'upward') return false
    if ((isOrdinaryCountyDoctor || isCountyDepartmentHead) && r.is_emergency) return false
    if (isOrdinaryCountyDoctor && !isMine(r)) return false
    if (isCountyDepartmentHead && !matchesDepartmentScope(r.toDept, currentUser.dept)) return false
    if (applied.status !== '全部' && !(applied.status === '待受理' ? r.status === UPWARD_STATUS.PENDING : r.status === applied.status)) return false
    if (applied.keyword && !r.patient.name.includes(applied.keyword) && !r.diagnosis.name.includes(applied.keyword)) return false
    return true
  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">{isCountyDepartmentHead ? '科室转入记录' : '转入记录'}</h2>
        <div className="text-xs text-gray-400 mt-0.5">
          {isOrdinaryCountyDoctor
            ? '仅显示当前县级医生本人负责的普通转入记录'
            : isCountyDepartmentHead
              ? '仅显示本科室相关普通转入记录'
              : '县级医院接收的全部转入记录'}
        </div>
      </div>

      {/* 筛选 */}
      <div className="bg-white rounded-xl p-4 mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">患者姓名：</span>
            <input value={keyword} onChange={e => setKeyword(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none w-44"
              placeholder="请输入患者姓名或诊断" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">状态：</span>
            <div className="flex gap-1.5 flex-wrap">
              {allStatus.map(s => (
                <label key={s} className="flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="status" checked={statusFilter === s} onChange={() => setStatusFilter(s)} className="accent-teal-500" />
                  <span className="text-sm text-gray-600">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => setApplied({ keyword, status: statusFilter })}
              className="px-4 py-1.5 rounded-lg text-sm text-white" style={{ background: '#0BBECF' }}>🔍 查询</button>
            <button onClick={() => { setKeyword(''); setStatusFilter('全部'); setApplied({ keyword: '', status: '全部' }) }}
              className="px-4 py-1.5 rounded-lg text-sm border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>↺ 重置</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#E0F6F9' }}>
              {['序号','患者','性别/年龄','诊断（ICD-10）','转出机构','转入科室','转诊单号','状态','申请时间','操作'].map(h => (
                <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={10} className="py-12 text-center text-gray-400">{isCountyDepartmentHead ? '暂无本科室转入记录' : '暂无记录'}</td></tr>
            ) : data.map((ref, i) => (
              <tr key={ref.id} style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE', cursor: 'pointer' }}
                onClick={() => navigate(`/referral/${ref.id}`)}
                onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}>
                <td className={TD}><RowNo n={i+1} /></td>
                <td className={TD}>
                  {ref.is_emergency && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded mr-1 bg-red-100 text-red-700 border border-red-200">
                      {ref.isUrgentUnhandled ? '急诊·超时' : '急诊'}
                    </span>
                  )}
                  {ref.referral_type === 'green_channel' && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded mr-1 text-white" style={{ background: '#10b981' }}>绿通</span>
                  )}
                  <span className="font-medium text-gray-800">{ref.patient.name}</span>
                </td>
                <td className={TD + ' text-xs text-gray-500'}>{ref.patient.gender || '未知'}/{ref.patient.age ? `${ref.patient.age}岁` : '年龄未填'}</td>
                <td className={TD + ' text-xs'}>
                  <span className="font-mono mr-1" style={{ color: '#0892a0' }}>{ref.diagnosis.code}</span>
                  {ref.diagnosis.name}
                </td>
                <td className={TD + ' text-xs text-gray-400'}>{ref.fromInstitution}</td>
                <td className={TD + ' text-gray-600'}>{ref.toDept || '—'}</td>
                <td className={TD}>
                  {ref.referralCode || ref.referralNo ? <span className="font-mono text-xs" style={{ color: '#0892a0' }}>{ref.referralCode || ref.referralNo}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                <td className={TD + ' text-xs text-gray-400'}>{fmt(ref.createdAt)}</td>
                <td className={TD} onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs mr-2" style={{ color: '#0BBECF' }}>详情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <span className="text-xs text-gray-400">共 <strong>{data.length}</strong> 条记录</span>
          {!isOrdinaryCountyDoctor && !isCountyDepartmentHead && <span className="text-xs text-gray-400 ml-4">急诊/绿通转入提交后会直接进入转诊中，由转诊中心处理。</span>}
        </div>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { DOWNWARD_STATUS, ROLES } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'
import { getDownwardDisplayStatus, matchesDownwardDisplayStatus } from '../../utils/downwardStatusPresentation'

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function RowNo({ n }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#10b981' }}>
      {n}
    </span>
  )
}

function getAllocationLabel(ref) {
  const mode = ref.allocationMode || (ref.designatedDoctorId ? 'designated' : 'coordinator')
  if (mode === 'designated') return '指定接收医生'
  if (mode === 'coordinator_reassign') return '仅指定机构'
  return '仅指定机构'
}

function getCurrentOwner(ref) {
  const displayStatus = getDownwardDisplayStatus(ref)
  if (displayStatus === DOWNWARD_STATUS.RETURNED) {
    return '机构已退回'
  }
  if (ref.downwardAssignedDoctorName) return ref.downwardAssignedDoctorName
  if (ref.designatedDoctorName) return ref.designatedDoctorName
  if ((ref.allocationMode || 'coordinator') === 'coordinator_reassign') return '基层负责人改派中'
  if ((ref.allocationMode || 'coordinator') === 'coordinator') return '基层负责人待分配'
  return '—'
}

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

export default function PrimaryDownwardRecords() {
  const navigate = useNavigate()
  const { referrals, currentUser } = useApp()
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [applied, setApplied] = useState({ keyword: '', status: '全部' })

  const isCoordinator = currentUser.role === ROLES.PRIMARY_HEAD
  const viewer = { role: currentUser.role, userId: currentUser.id }
  const allStatus = ['全部', '待接收', '转诊中', '已完成', '已拒绝', '已退回', '已撤销', '已关闭']

  const scopedRecords = useMemo(() => referrals.filter(ref => {
    if (ref.type !== 'downward' || ref.toInstitution !== currentUser.institution) return false

    if (isCoordinator) return true

    return ref.downwardAssignedDoctorId === currentUser.id
      || ref.designatedDoctorId === currentUser.id
      || ref.toDoctor === currentUser.name
      || ref.fromDoctor === currentUser.name
  }), [currentUser.id, currentUser.institution, currentUser.name, isCoordinator, referrals])

  const data = scopedRecords.filter(ref => {
    if (!matchesDownwardDisplayStatus(ref, applied.status, viewer)) return false
    if (applied.keyword && !ref.patient.name.includes(applied.keyword) && !ref.diagnosis.name.includes(applied.keyword)) return false
    return true
  }).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">转入记录</h2>
          <div className="text-xs text-gray-400 mt-0.5">
            {isCoordinator ? '本机构全部转入记录，含待分配、改派与经办结果' : '仅展示与您相关的转入记录与处理结果'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">患者姓名：</span>
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none w-44"
              placeholder="请输入患者姓名或诊断"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 whitespace-nowrap">状态：</span>
            <div className="flex gap-1.5 flex-wrap">
              {allStatus.map(status => (
                <label key={status} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="primary-downward-status"
                    checked={statusFilter === status}
                    onChange={() => setStatusFilter(status)}
                    className="accent-teal-500"
                  />
                  <span className="text-sm text-gray-600">{status}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setApplied({ keyword, status: statusFilter })}
              className="px-4 py-1.5 rounded-lg text-sm text-white"
              style={{ background: '#0BBECF' }}
            >
              🔍 查询
            </button>
            <button
              onClick={() => { setKeyword(''); setStatusFilter('全部'); setApplied({ keyword: '', status: '全部' }) }}
              className="px-4 py-1.5 rounded-lg text-sm border"
              style={{ color: '#0BBECF', borderColor: '#0BBECF' }}
            >
              ↺ 重置
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#E0F6F9' }}>
              {['序号', '患者', '性别/年龄', '当前诊断（ICD-10）', '转出机构', '接收方式', '指定接收医生 / 当前归属', '状态', '发起时间', '操作'].map(h => (
                <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={10} className="py-12 text-center text-gray-400">暂无转入记录</td></tr>
            ) : data.map((ref, i) => (
              <tr
                key={ref.id}
                style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE', cursor: 'pointer' }}
                onClick={() => navigate(`/referral/${ref.id}`)}
                onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}
              >
                <td className={TD}><RowNo n={i + 1} /></td>
                <td className={TD + ' font-medium text-gray-800'}>{ref.patient.name}</td>
                <td className={TD + ' text-xs text-gray-500'}>{ref.patient.gender}/{ref.patient.age}岁</td>
                <td className={TD + ' text-xs'}>
                  <span className="font-mono mr-1" style={{ color: '#0892a0' }}>{ref.diagnosis.code}</span>
                  {ref.diagnosis.name}
                </td>
                <td className={TD + ' text-xs text-gray-400'}>{ref.fromInstitution || '—'}</td>
                <td className={TD + ' text-xs text-gray-600'}>{getAllocationLabel(ref)}</td>
                <td className={TD}>
                  <div className="text-sm text-gray-700">{getCurrentOwner(ref)}</div>
                  {ref.rejectedDoctorIds?.length > 0 && (
                    <div className="text-[11px] text-amber-600 mt-0.5">已拒绝 {ref.rejectedDoctorIds.length} 次</div>
                  )}
                </td>
                <td className={TD}><StatusBadge status={getDownwardDisplayStatus(ref, viewer)} size="sm" /></td>
                <td className={TD + ' text-xs text-gray-400'}>{fmt(ref.createdAt)}</td>
                <td className={TD} onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs" style={{ color: '#0BBECF' }}>详情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <span className="text-xs text-gray-400">共 <strong>{data.length}</strong> 条记录</span>
        </div>
      </div>
    </div>
  )
}

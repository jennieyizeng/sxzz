import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { DOWNWARD_STATUS, ROLES } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'
import { getDownwardDisplayStatus, matchesDownwardDisplayStatus } from '../../utils/downwardStatusPresentation'

function RowNo({ n }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>
      {n}
    </span>
  )
}

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'
const STATUS_FILTERS = ['全部', '待接收', '转诊中', '已完成', '已退回', '已撤销', '已关闭']

function getAllocationLabel(ref) {
  const mode = ref.allocationMode || (ref.designatedDoctorId ? 'designated' : 'coordinator')
  if (mode === 'designated') return '指定接收医生'
  if (mode === 'coordinator_reassign') return '仅指定机构'
  return '仅指定机构'
}

function getOwnerLabel(ref) {
  if (getDownwardDisplayStatus(ref) === DOWNWARD_STATUS.RETURNED) return '机构已退回'
  if (ref.downwardAssignedDoctorName) return ref.downwardAssignedDoctorName
  if (ref.designatedDoctorName) return ref.designatedDoctorName
  if ((ref.allocationMode || 'coordinator') === 'coordinator_reassign') return '基层负责人改派中'
  if ((ref.allocationMode || 'coordinator') === 'coordinator') return '基层负责人待分配'
  return '—'
}

function getStageHint(ref, isCoordinator, currentUser) {
  const mode = ref.allocationMode || (ref.designatedDoctorId ? 'designated' : 'coordinator')
  if (!isCoordinator && ref.status === DOWNWARD_STATUS.PENDING && ref.designatedDoctorId === currentUser.id) {
    return '待您接收，可直接接收或拒绝'
  }
  if (isCoordinator && ref.status === DOWNWARD_STATUS.PENDING && mode === 'coordinator') {
    return '待负责人首次分配'
  }
  if (isCoordinator && ref.status === DOWNWARD_STATUS.PENDING && mode === 'coordinator_reassign') {
    return '原指定医生已拒绝，待负责人改派'
  }
  return ''
}

export default function DownwardList() {
  const { referrals, currentUser } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('全部')
  const [search, setSearch] = useState('')
  const isCoordinator = currentUser.role === ROLES.PRIMARY_HEAD
  const viewer = { role: currentUser.role, userId: currentUser.id }

  const scopedDownward = referrals.filter(r => {
    if (r.type !== 'downward' || r.toInstitution !== currentUser.institution) return false
    const mode = r.allocationMode || (r.designatedDoctorId ? 'designated' : 'coordinator')
    const displayStatus = getDownwardDisplayStatus(r, viewer)
    if (isCoordinator) {
      if (displayStatus === DOWNWARD_STATUS.RETURNED) return true
      if (r.status === DOWNWARD_STATUS.PENDING_INTERNAL_REVIEW || r.status === DOWNWARD_STATUS.PENDING) {
        return mode === 'coordinator' || mode === 'coordinator_reassign' || r.designatedDoctorId === currentUser.id
      }
      return r.downwardAssignedDoctorId === currentUser.id || r.designatedDoctorId === currentUser.id || mode === 'coordinator_reassign'
    }
    if (displayStatus === DOWNWARD_STATUS.RETURNED) {
      return r.designatedDoctorId === currentUser.id || r.downwardAssignedDoctorId === currentUser.id
    }
    if (r.status === DOWNWARD_STATUS.PENDING) {
      return r.designatedDoctorId === currentUser.id
    }
    return r.downwardAssignedDoctorId === currentUser.id || r.designatedDoctorId === currentUser.id
  })
  const filtered = scopedDownward
    .filter(r => matchesDownwardDisplayStatus(r, filter, viewer))
    .filter(r => !search || r.patient.name.includes(search) || r.diagnosis.name.includes(search))
  const pendingForMeCount = scopedDownward.filter(r => r.status === DOWNWARD_STATUS.PENDING && r.designatedDoctorId === currentUser.id).length
  const pendingAssignCount = scopedDownward.filter(r => r.status === DOWNWARD_STATUS.PENDING && (r.allocationMode || 'coordinator') === 'coordinator').length
  const pendingReassignCount = scopedDownward.filter(r => r.status === DOWNWARD_STATUS.PENDING && (r.allocationMode || '') === 'coordinator_reassign').length

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-700">{isCoordinator ? '转入待分配 / 改派' : '我的转入处理'}</h2>
        <div className="text-xs text-gray-400 mt-0.5">
          {isCoordinator ? '仅展示需您分配、改派或本人接收的转入申请' : '仅展示定向指派给您的转入申请与本人经办记录'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {!isCoordinator && (
          <div className="rounded-xl px-4 py-3" style={{ background: '#F0FBFC', border: '1px solid #B2EEF5' }}>
            <div className="text-xs text-gray-500">待您处理的定向转入</div>
            <div className="text-2xl font-semibold mt-1" style={{ color: '#0892A0' }}>{pendingForMeCount}</div>
            <div className="text-xs text-gray-500 mt-1">进入详情后可执行接收或拒绝</div>
          </div>
        )}
        {isCoordinator && (
          <>
            <div className="rounded-xl px-4 py-3" style={{ background: '#F0FBFC', border: '1px solid #B2EEF5' }}>
              <div className="text-xs text-gray-500">待负责人分配</div>
              <div className="text-2xl font-semibold mt-1" style={{ color: '#0892A0' }}>{pendingAssignCount}</div>
              <div className="text-xs text-gray-500 mt-1">请尽快分配给具体基层医生</div>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: '#FFF9ED', border: '1px solid #F6D48A' }}>
              <div className="text-xs text-gray-500">待负责人改派</div>
              <div className="text-2xl font-semibold mt-1 text-amber-700">{pendingReassignCount}</div>
              <div className="text-xs text-gray-500 mt-1">原指定医生已拒绝，请重新分配</div>
            </div>
          </>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded px-4 py-3 mb-3 flex flex-wrap items-center gap-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">患者姓名：</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="请输入患者姓名或诊断"
            className="border border-gray-200 rounded px-2.5 py-1.5 text-sm w-44 focus:outline-none focus:border-primary-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">状态：</span>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(s => (
              <label key={s} className="flex items-center gap-1 cursor-pointer text-sm text-gray-600">
                <input type="radio" name="dstatus" checked={filter === s} onChange={() => setFilter(s)} style={{ accentColor: '#0BBECF' }} />
                {s}
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
              {['序号', '患者姓名', '性别/年龄', '当前诊断', '转出机构', '接收方式', '指定接收医生 / 当前归属', '状态', '发起时间', '操作'].map(h => (
                <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="py-12 text-center text-gray-400 text-sm"><div className="text-3xl mb-2">📭</div>暂无转入记录</td></tr>
            ) : filtered.map((ref, i) => (
              <tr
                key={ref.id}
                className="cursor-pointer"
                style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE' }}
                onClick={() => navigate(`/referral/${ref.id}`)}
                onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}
              >
                <td className={TD}><RowNo n={i + 1} /></td>
                <td className={TD}><span className="font-medium text-gray-800">{ref.patient.name}</span></td>
                <td className={TD + ' text-xs text-gray-500'}>{ref.patient.gender}/{ref.patient.age}岁</td>
                <td className={TD + ' text-xs text-gray-600'}>{ref.diagnosis.name}</td>
                <td className={TD + ' text-xs text-gray-400'}>{ref.fromInstitution}</td>
                <td className={TD + ' text-xs text-gray-600'}>{getAllocationLabel(ref)}</td>
                <td className={TD}>
                  <div className="text-sm text-gray-700">{getOwnerLabel(ref)}</div>
                  {getStageHint(ref, isCoordinator, currentUser) && (
                    <div className="text-[11px] text-cyan-700 mt-0.5">{getStageHint(ref, isCoordinator, currentUser)}</div>
                  )}
                  {ref.rejectedDoctorIds?.length > 0 && (
                    <div className="text-[11px] text-amber-600 mt-0.5">已拒绝 {ref.rejectedDoctorIds.length} 次</div>
                  )}
                </td>
                <td className={TD}><StatusBadge status={getDownwardDisplayStatus(ref, viewer)} size="sm" /></td>
                <td className={TD + ' text-xs text-gray-400'}>{new Date(ref.createdAt).toLocaleDateString('zh-CN')}</td>
                <td className={TD} onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs mr-2" style={{ color: '#0BBECF' }}>详情</button>
                  {!isCoordinator && ref.status === DOWNWARD_STATUS.PENDING && ref.designatedDoctorId === currentUser.id && (
                    <>
                      <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs mr-2" style={{ color: '#10b981' }}>接收</button>
                      <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs" style={{ color: '#DC2626' }}>拒绝</button>
                    </>
                  )}
                  {isCoordinator && ref.status === DOWNWARD_STATUS.PENDING && ['coordinator', 'coordinator_reassign'].includes(ref.allocationMode || '') && (
                    <>
                      <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs mr-2" style={{ color: '#10b981' }}>
                        {(ref.allocationMode || '') === 'coordinator_reassign' ? '改派' : '分配'}
                      </button>
                      <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs" style={{ color: '#0892A0' }}>本人接收</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 text-xs text-gray-400" style={{ borderTop: '1px solid #EEF7F9', background: '#FAFEFE' }}>
            共 {filtered.length} 条记录
          </div>
        )}
      </div>
    </div>
  )
}

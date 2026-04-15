import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ROLES, UPWARD_STATUS } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'

// M-3 修复：新增「待内审」筛选项（F-02 开启后普通上转的中间状态）
const STATUS_FILTERS = ['全部', '草稿', '待内审', '待受理', '转诊中', '已完成', '已拒绝', '已撤销', '已关闭']

function RowNo({ n }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>
      {n}
    </span>
  )
}

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

export default function PrimaryReferralList() {
  const { referrals, currentUser } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('全部')
  const [search, setSearch] = useState('')
  const isPrimaryHead = currentUser.role === ROLES.PRIMARY_HEAD

  const scopedReferrals = referrals.filter(r =>
    r.type === 'upward' && (
      isPrimaryHead
        ? r.fromInstitution === currentUser.institution
        : r.fromDoctor === currentUser.name
    )
  )
  const filtered = scopedReferrals
    .filter(r => filter === '全部' || (filter === '待受理' ? r.status === UPWARD_STATUS.PENDING : r.status === filter))
    .filter(r => !search || r.patient.name.includes(search) || r.diagnosis.name.includes(search) || r.diagnosis.code.includes(search))

  return (
    <div className="p-5">
      {/* 页面标题 */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-700">转出记录</h2>
        {!isPrimaryHead && <div className="text-xs text-gray-400 mt-0.5">全部转出申请记录</div>}
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded px-4 py-3 mb-3 flex flex-wrap items-center gap-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">患者姓名：</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="请输入患者姓名或诊断"
            className="border border-gray-200 rounded px-2.5 py-1.5 text-sm w-44 focus:outline-none focus:border-primary-400"
            style={{ '--tw-ring-color': '#0BBECF' }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap">申请状态：</span>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(s => (
              <label key={s} className="flex items-center gap-1 cursor-pointer text-sm text-gray-600">
                <input
                  type="radio"
                  name="status"
                  checked={filter === s}
                  onChange={() => setFilter(s)}
                  style={{ accentColor: '#0BBECF' }}
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            className="flex items-center gap-1 px-4 py-1.5 rounded text-sm text-white"
            style={{ background: '#0BBECF' }}
          >
            🔍 查询
          </button>
          <button
            onClick={() => { setSearch(''); setFilter('全部') }}
            className="flex items-center gap-1 px-4 py-1.5 rounded text-sm border"
            style={{ color: '#0BBECF', borderColor: '#0BBECF' }}
          >
            ↺ 重置
          </button>
        </div>
      </div>

      {/* 操作栏 */}
      {!isPrimaryHead && (
        <div className="mb-3">
          <button
            onClick={() => navigate('/primary/create-referral')}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-sm text-white"
            style={{ background: '#0BBECF' }}
          >
            + 发起转出
          </button>
        </div>
      )}

      {/* 表格 */}
      <div className="bg-white rounded overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#E0F6F9' }}>
              {['序号', '患者姓名', '性别/年龄', '诊断（ICD-10）', '转入科室', '转入机构', '转诊单号', '申请状态', '更新时间', '操作'].map(h => (
                <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-gray-400 text-sm">
                  <div className="text-3xl mb-2">📭</div>
                  暂无{filter !== '全部' ? `"${filter}"状态的` : ''}记录
                </td>
              </tr>
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
                <td className={TD}>
                  {ref.is_emergency && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded mr-1 bg-red-100 text-red-700 border border-red-200">
                      {ref.isUrgentUnhandled ? '急诊·超时' : '急诊'}
                    </span>
                  )}
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
                <td className={TD + ' text-gray-500 text-xs'}>
                  {(ref.patient.gender || '未知')}/{ref.patient.age ? `${ref.patient.age}岁` : '年龄未填'}
                </td>
                <td className={TD + ' text-xs text-gray-600'}>
                  <span className="font-mono mr-1" style={{ color: '#0892a0' }}>{ref.diagnosis.code}</span>
                  {ref.diagnosis.name}
                </td>
                <td className={TD + ' text-gray-500'}>{ref.toDept || '—'}</td>
                <td className={TD + ' text-xs text-gray-400'}>{ref.toInstitution || '—'}</td>
                <td className={TD}>
                  {ref.referralCode || ref.referralNo
                    ? <span className="font-mono text-xs" style={{ color: '#0892a0' }}>{ref.referralCode || ref.referralNo}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                <td className={TD + ' text-xs text-gray-400'}>{new Date(ref.updatedAt).toLocaleDateString('zh-CN')}</td>
                <td className={TD} onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs mr-2" style={{ color: '#0BBECF' }}>详情</button>
                  {ref.status === UPWARD_STATUS.PENDING && (
                    <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs" style={{ color: '#ef4444' }}>撤销</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="px-4 py-2.5 text-xs text-gray-400" style={{ borderTop: '1px solid #EEF7F9', background: '#FAFEFE' }}>
            共 {filtered.length} 条记录
            <span className="ml-4">急诊/绿通转出提交后会直接进入转诊中，由转诊中心处理。</span>
          </div>
        )}
      </div>
    </div>
  )
}

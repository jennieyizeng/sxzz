import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { DOWNWARD_STATUS } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'

function RowNo({ n }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>
      {n}
    </span>
  )
}

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'
// M-8 修复：删除不存在的「已接收」状态（state-machine 无该状态，接收即进入转诊中）
const STATUS_FILTERS = ['全部', '待接收', '转诊中', '已完成', '已拒绝', '已关闭']

export default function DownwardList() {
  const { referrals, currentUser } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('全部')
  const [search, setSearch] = useState('')

  const myDownward = referrals.filter(r => r.type === 'downward' && r.toInstitution === currentUser.institution)
  const filtered = myDownward
    .filter(r => filter === '全部' || r.status === filter)
    .filter(r => !search || r.patient.name.includes(search) || r.diagnosis.name.includes(search))

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-700">下转待接收</h2>
        <div className="text-xs text-gray-400 mt-0.5">县级医院下转至本机构的申请</div>
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
              {['序号', '患者姓名', '性别/年龄', '诊断', '来源机构', '经治医生', '备注', '状态', '发起时间', '操作'].map(h => (
                <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="py-12 text-center text-gray-400 text-sm"><div className="text-3xl mb-2">📭</div>暂无下转记录</td></tr>
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
                <td className={TD + ' text-gray-600'}>{ref.fromDoctor}</td>
                <td className={TD}>
                  {ref.rehabPlan
                    ? <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#E0F6F9', color: '#0892a0' }}>含康复方案</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                <td className={TD + ' text-xs text-gray-400'}>{new Date(ref.createdAt).toLocaleDateString('zh-CN')}</td>
                <td className={TD} onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs mr-2" style={{ color: '#0BBECF' }}>详情</button>
                  {ref.status === DOWNWARD_STATUS.PENDING && (
                    <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs" style={{ color: '#10b981' }}>接收</button>
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

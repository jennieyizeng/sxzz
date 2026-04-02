import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import StatusBadge from '../../components/StatusBadge'

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}
function RowNo({ n }) {
  return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#10b981' }}>{n}</span>
}
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

export default function CountyDownwardRecords() {
  const navigate = useNavigate()
  const { referrals } = useApp()
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [applied, setApplied] = useState({ keyword: '', status: '全部' })

  const allStatus = ['全部', '待接收', '已接收', '转诊中', '已完成', '已拒绝']

  const data = referrals.filter(r => {
    if (r.type !== 'downward') return false
    if (applied.status !== '全部' && r.status !== applied.status) return false
    if (applied.keyword && !r.patient.name.includes(applied.keyword) && !r.diagnosis.name.includes(applied.keyword)) return false
    return true
  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">下转记录</h2>
          <div className="text-xs text-gray-400 mt-0.5">县级医院发起的全部下转记录</div>
        </div>
        <button onClick={() => navigate('/county/create-downward')}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#0BBECF' }}>
          + 发起下转
        </button>
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
                  <input type="radio" name="dstatus" checked={statusFilter === s} onChange={() => setStatusFilter(s)} className="accent-teal-500" />
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
              {['序号','患者','性别/年龄','诊断（ICD-10）','接收机构','科室','住院天数','状态','发起时间','操作'].map(h => (
                <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={10} className="py-12 text-center text-gray-400">暂无下转记录</td></tr>
            ) : data.map((ref, i) => (
              <tr key={ref.id} style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE', cursor: 'pointer' }}
                onClick={() => navigate(`/referral/${ref.id}`)}
                onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE'}>
                <td className={TD}><RowNo n={i+1} /></td>
                <td className={TD + ' font-medium text-gray-800'}>{ref.patient.name}</td>
                <td className={TD + ' text-xs text-gray-500'}>{ref.patient.gender}/{ref.patient.age}岁</td>
                <td className={TD + ' text-xs'}>
                  <span className="font-mono mr-1" style={{ color: '#0892a0' }}>{ref.diagnosis.code}</span>
                  {ref.diagnosis.name}
                </td>
                <td className={TD + ' text-xs text-gray-400'}>{ref.toInstitution || '—'}</td>
                <td className={TD + ' text-gray-600'}>{ref.toDept || '—'}</td>
                <td className={TD + ' text-gray-500'}>{ref.stayDays ? `${ref.stayDays}天` : '—'}</td>
                <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
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

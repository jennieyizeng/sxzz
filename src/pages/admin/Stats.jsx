import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_STATS, ROLES } from '../../data/mockData'
import { useApp } from '../../context/AppContext'

function BarChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.upward + d.downward), 1)
  return (
    <div className="flex items-end gap-2" style={{ height: 96 }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1
        const upH = Math.max((d.upward / maxVal) * 82, 4)
        const dnH = Math.max((d.downward / maxVal) * 82, 4)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full flex items-end justify-center gap-0.5" style={{ height: 84 }}>
              {isLast && (
                <div className="absolute -top-5 left-0 right-0 text-center text-xs font-semibold" style={{ color: '#0BBECF' }}>
                  {d.upward + d.downward}
                </div>
              )}
              <div style={{ flex: 1, height: upH, background: isLast ? '#0BBECF' : '#B2EEF5', borderRadius: '3px 3px 0 0' }} />
              <div style={{ flex: 1, height: dnH, background: isLast ? '#10b981' : '#A7F3D0', borderRadius: '3px 3px 0 0' }} />
            </div>
            <div className="text-xs text-gray-400 whitespace-nowrap">{d.month}</div>
          </div>
        )
      })}
    </div>
  )
}

function StatBlock({ label, value, unit, sub, color = '#0BBECF', bg = '#E0F6F9' }) {
  return (
    <div className="text-center p-4 rounded-xl" style={{ background: bg }}>
      <div className="text-2xl font-bold" style={{ color }}>{value}<span className="text-sm font-normal ml-1 text-gray-500">{unit}</span></div>
      <div className="text-xs text-gray-600 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function AdminStats() {
  const navigate = useNavigate()
  const s = MOCK_STATS
  const { referrals, currentRole } = useApp()
  const isSystemAdmin = currentRole === ROLES.SYSTEM_ADMIN
  const completionRate = Math.round((referrals.filter(r => r.status === '已完成').length / Math.max(referrals.length, 1)) * 100)

  // E-01：筛选维度 state
  const [filterInst, setFilterInst] = useState('')
  const [filterType, setFilterType] = useState('')

  return (
    <div className="p-5">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-800">{isSystemAdmin ? '系统工作台' : '统计看板'}</h2>
        <div className="text-xs text-gray-400 mt-0.5">
          {isSystemAdmin ? '统计报表与系统配置入口总览' : 'xx市医共体 · 转诊综合统计分析'}
        </div>
      </div>

      {/* E-01：筛选区 */}
      <div className="bg-white rounded-xl px-4 py-3 mb-4 flex flex-wrap items-end gap-4" style={{ border: '1px solid #DDF0F3' }}>
        <div>
          <label className="block text-xs text-gray-500 mb-1">机构</label>
          <select
            value={filterInst}
            onChange={e => setFilterInst(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm h-8"
          >
            <option value="">全部机构</option>
            <option>xx市人民医院</option>
            <option>xx市拱星镇卫生院</option>
            <option>xx市汉旺镇卫生院</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">转诊类型</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm h-8"
          >
            <option value="">全部类型</option>
            <option value="upward">上转</option>
            <option value="downward">下转</option>
          </select>
        </div>
        {(filterInst || filterType) && (
          <button
            onClick={() => { setFilterInst(''); setFilterType('') }}
            className="text-xs text-gray-400 hover:text-gray-600 h-8 px-2"
          >
            重置筛选
          </button>
        )}
        {(filterInst || filterType) && (
          <span className="text-xs text-orange-500 self-center">
            当前按已选条件展示统计结果
          </span>
        )}
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatBlock label="累计上转" value={s.totalUpward} unit="例" sub={`完成 ${s.completedUpward} / 拒绝 ${s.rejectedUpward}`} />
        <StatBlock label="累计下转" value={s.totalDownward} unit="例" sub={`完成 ${s.completedDownward} / 待处理 ${s.pendingDownward}`} color="#10b981" bg="#ecfdf5" />
        <StatBlock label="综合完成率" value={completionRate} unit="%" sub="基于当前数据实时计算" color="#f59e0b" bg="#fef3c7" />
        <StatBlock label="平均处理时效" value={s.avgProcessHours} unit="h" sub="目标：≤24h" color="#6366f1" bg="#ede9fe" />
        {/* E-02：新增指标卡片 */}
        {[
          { label: '平均审核响应时长', value: '2.3h', sub: '县级接收响应', color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: '平均接诊时长', value: '18.5h', sub: '患者到达耗时', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: '超时率', value: '4.5%', sub: '超24h未处理', color: 'text-red-600', bg: 'bg-red-50' },
          { label: '上转回转比', value: '1 : 1.3', sub: '上转/下转比例', color: 'text-teal-600', bg: 'bg-teal-50' },
        ].map(card => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.bg}`}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 月度趋势 */}
        <div className="col-span-2 bg-white rounded-xl p-5" style={{ border: '1px solid #DDF0F3' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold text-gray-800">月度转诊趋势</div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#0BBECF' }} />上转</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#10b981' }} />下转</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 mb-4">近6个月数据对比（最新月份高亮）</div>
          <BarChart data={s.byMonth} />
        </div>

        {/* 机构分布 */}
        <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #DDF0F3' }}>
          <div className="text-sm font-semibold text-gray-800 mb-1">机构转诊分布</div>
          <div className="text-xs text-gray-400 mb-4">各成员机构转诊量</div>
          <div className="space-y-4">
            {s.byInstitution.map((inst, i) => {
              const total = inst.upward + inst.downward
              const maxTotal = Math.max(...s.byInstitution.map(b => b.upward + b.downward))
              return (
                <div key={inst.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-700 font-medium">{inst.name}</span>
                    <span className="font-semibold" style={{ color: '#0892a0' }}>{total}例</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E0F6F9' }}>
                    <div style={{ width: `${(total / maxTotal) * 100}%`, height: '100%', background: i === 0 ? '#0BBECF' : '#67dfe9', borderRadius: '999px' }} />
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>上转 <span style={{ color: '#0BBECF' }}>{inst.upward}</span></span>
                    <span>下转 <span style={{ color: '#10b981' }}>{inst.downward}</span></span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 异常分析 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
          <div className="text-sm font-semibold text-gray-800">{isSystemAdmin ? '配置与指标联动提示' : '异常指标分析'}</div>
          {!isSystemAdmin && (
            <button onClick={() => navigate('/admin/anomaly')} className="text-xs" style={{ color: '#0BBECF' }}>处理异常 →</button>
          )}
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          {(isSystemAdmin
            ? [
                { label: '机构配置项', count: '3类', desc: '机构、角色、模板已开放管理', color: '#0BBECF', icon: '🏥' },
                { label: '规则配置项', count: '3类', desc: '病种、超时、审核规则可独立维护', color: '#6366f1', icon: '⚙️' },
                { label: '通知与日志', count: '2类', desc: '通知模板与操作日志已纳入后台', color: '#10b981', icon: '🧾' },
              ]
            : [
                { label: '超24h未处理', count: s.pendingUpward, desc: '上转申请待受理', color: '#ef4444', icon: '⏰' },
                { label: '本月拒绝率', count: `${Math.round(s.rejectedUpward/s.totalUpward*100)}%`, desc: `共 ${s.rejectedUpward} 例被拒`, color: '#f59e0b', icon: '❌' },
                { label: '下转待完成', count: s.pendingDownward, desc: '基层待接收下转', color: '#6366f1', icon: '⏳' },
              ]
          ).map(item => (
            <div key={item.label} className="px-6 py-4 flex items-center gap-4">
              <span className="text-3xl">{item.icon}</span>
              <div>
                <div className="text-2xl font-bold" style={{ color: item.color }}>{item.count}</div>
                <div className="text-xs font-medium text-gray-700">{item.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* E-04：绩效统计跳转入口 */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => navigate(isSystemAdmin ? '/admin/institution-manage' : '/admin/doctor-perf')}
          className="text-sm font-medium hover:underline"
          style={{ color: '#0BBECF' }}
        >
          {isSystemAdmin ? '进入机构管理 →' : '查看医生/科室绩效详情 →'}
        </button>
      </div>
    </div>
  )
}

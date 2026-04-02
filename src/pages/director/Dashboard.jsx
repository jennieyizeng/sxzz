import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { MOCK_STATS } from '../../data/mockData'

// ── 迷你条形图（双色分组，纯 CSS） ──
function BarChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.upward + d.downward), 1)
  return (
    <div className="flex items-end gap-2" style={{ height: 100 }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1
        const upH = Math.max((d.upward / maxVal) * 86, 4)
        const dnH = Math.max((d.downward / maxVal) * 86, 4)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end gap-0.5" style={{ height: 88 }}>
              <div style={{ flex: 1, height: upH, background: isLast ? '#0BBECF' : '#B2EEF5', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
              <div style={{ flex: 1, height: dnH, background: isLast ? '#10b981' : '#A7F3D0', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
            </div>
            <div className="text-xs text-gray-400 whitespace-nowrap">{d.month}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── 环形图（SVG） ──
function DonutChart({ segments, size = 80 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 10
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  let offset = 0
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={10} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ
        const gap = circ - dash
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={10}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round" />
        )
        offset += dash
        return el
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1f2937">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#9ca3af">总转诊</text>
    </svg>
  )
}

// ── KPI 卡片 ──
function KpiCard({ icon, iconBg, label, value, unit, sub, trend, onClick }) {
  return (
    <div onClick={onClick} className="bg-white rounded-xl p-4 cursor-pointer transition-all"
      style={{ border: '1px solid #DDF0F3', boxShadow: '0 1px 4px rgba(11,190,207,0.06)' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(11,190,207,0.14)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(11,190,207,0.06)'}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: iconBg }}>{icon}</div>
        {trend !== undefined && (
          <span className="text-xs px-1.5 py-0.5 rounded-full"
            style={trend >= 0 ? { background: '#ecfdf5', color: '#047857' } : { background: '#fef2f2', color: '#b91c1c' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}<span className="text-sm font-normal text-gray-400 ml-1">{unit}</span></div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

export default function DirectorDashboard() {
  const navigate = useNavigate()
  const { referrals, currentUser } = useApp()
  const s = MOCK_STATS

  // 合并实时数据
  const liveUpward = referrals.filter(r => r.type === 'upward').length
  const liveDownward = referrals.filter(r => r.type === 'downward').length
  const liveCompleted = referrals.filter(r => ['已完成'].includes(r.status)).length
  const liveTotal = referrals.length

  return (
    <div className="p-5" style={{ background: '#EBF8FA', minHeight: '100%' }}>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-800">数据大屏</h2>
          <div className="text-xs text-gray-400 mt-0.5">{currentUser.name} · {currentUser.institution} · 实时数据</div>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: '#0892a0' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#0BBECF' }} />
          数据实时更新
        </div>
      </div>

      {/* KPI 行 */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KpiCard icon="📊" iconBg="#E0F6F9" label="本月总转诊量" value={s.totalUpward + s.totalDownward} unit="例"
          trend={12} sub={`上转 ${s.totalUpward} / 下转 ${s.totalDownward}`} onClick={() => navigate('/director/analytics')} />
        <KpiCard icon="✅" iconBg="#D1FAE5" label="综合完成率" value={s.completionRate} unit="%"
          trend={3} sub={`已完成 ${s.completedUpward + s.completedDownward} 例`} />
        <KpiCard icon="⏱️" iconBg="#FEF3C7" label="平均处理时效" value={s.avgProcessHours} unit="小时"
          trend={-8} sub="较上月缩短 1.6h" />
        <KpiCard icon="⬆️" iconBg="#EDE9FE" label="上转/下转比" value={`${s.totalUpward}/${s.totalDownward}`}
          sub={`上转率 ${s.upwardRate}‰ · 下转率 ${s.downwardRate}‰`} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 月度趋势 */}
        <div className="col-span-2 bg-white rounded-xl p-5" style={{ border: '1px solid #DDF0F3' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-gray-800">月度转诊趋势</div>
              <div className="text-xs text-gray-400 mt-0.5">近6个月上转/下转量对比</div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm" style={{ background: '#0BBECF' }} /> 上转
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm" style={{ background: '#10b981' }} /> 下转
              </div>
            </div>
          </div>
          <BarChart data={s.byMonth} />
          <div className="mt-3 pt-3 grid grid-cols-3 gap-3" style={{ borderTop: '1px solid #EEF7F9' }}>
            {[
              { label: '本月上转', value: s.byMonth[s.byMonth.length-1].upward, color: '#0BBECF' },
              { label: '本月下转', value: s.byMonth[s.byMonth.length-1].downward, color: '#10b981' },
              { label: '环比增长', value: '+9.7%', color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
                <div className="text-xs text-gray-400">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 转诊比例 */}
        <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #DDF0F3' }}>
          <div className="text-sm font-semibold text-gray-800 mb-1">转诊构成</div>
          <div className="text-xs text-gray-400 mb-4">按类型 / 状态分布</div>
          <div className="flex justify-center mb-4">
            <DonutChart size={100} segments={[
              { value: s.totalUpward, color: '#0BBECF' },
              { value: s.totalDownward, color: '#10b981' },
              { value: s.pendingUpward + s.pendingDownward, color: '#f59e0b' },
            ]} />
          </div>
          <div className="space-y-2">
            {[
              { label: '上转', value: s.totalUpward, color: '#0BBECF', pct: Math.round(s.totalUpward/(s.totalUpward+s.totalDownward)*100) },
              { label: '下转', value: s.totalDownward, color: '#10b981', pct: Math.round(s.totalDownward/(s.totalUpward+s.totalDownward)*100) },
              { label: '待处理', value: s.pendingUpward + s.pendingDownward, color: '#f59e0b', pct: Math.round((s.pendingUpward+s.pendingDownward)/(s.totalUpward+s.totalDownward)*100) },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-xs text-gray-600 flex-1">{item.label}</span>
                <span className="text-xs font-semibold text-gray-800">{item.value}</span>
                <span className="text-xs text-gray-400 w-8 text-right">{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 机构绩效 */}
        <div className="col-span-2 bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
            <div className="text-sm font-semibold text-gray-800">成员机构绩效排名</div>
            <button onClick={() => navigate('/director/analytics')} className="text-xs" style={{ color: '#0BBECF' }}>详细分析 →</button>
          </div>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['机构', '上转', '下转', '完成率', '平均时效', '综合评分'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.byInstitution.map((inst, i) => {
                const total = inst.upward + inst.downward
                const rate = Math.round(90 + Math.random() * 8)
                const score = (rate * 0.6 + (total / 160 * 40)).toFixed(1)
                return (
                  <tr key={inst.name} style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                          style={{ background: i === 0 ? '#f59e0b' : '#9ca3af' }}>{i + 1}</span>
                        <span className="text-sm font-medium text-gray-800">{inst.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#0BBECF' }}>{inst.upward}</td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#10b981' }}>{inst.downward}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#E0F6F9' }}>
                          <div style={{ width: `${rate}%`, height: '100%', background: '#0BBECF', borderRadius: '999px' }} />
                        </div>
                        <span className="text-xs text-gray-600">{rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{(16 + i * 3).toFixed(1)}h</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold" style={{ color: '#0892a0' }}>{score}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 右侧：预警 + 高频诊断 */}
        <div className="space-y-4">
          {/* 异常预警 */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #fde68a' }}>
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
              <span className="text-sm font-semibold" style={{ color: '#b45309' }}>⚠️ 异常预警</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#fde68a', color: '#92400e' }}>
                {s.pendingUpward + s.pendingDownward}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { icon: '⏰', label: '超时未处理', count: s.pendingUpward, color: '#ef4444' },
                { icon: '❌', label: '本月拒绝率', count: `${s.rejectedUpward}例`, color: '#f59e0b' },
                { icon: '📉', label: '下转未完成', count: s.pendingDownward, color: '#6366f1' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 高频诊断 Top5 */}
          <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
            <div className="px-4 py-2.5" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
              <span className="text-sm font-semibold text-gray-800">高频转诊诊断 Top 5</span>
            </div>
            <div className="px-4 py-2 space-y-2.5">
              {[
                { name: '原发性高血压', count: 42, pct: 100 },
                { name: '2型糖尿病', count: 31, pct: 74 },
                { name: '急性上呼吸道感染', count: 25, pct: 60 },
                { name: '脑梗死', count: 18, pct: 43 },
                { name: '慢阻肺急性加重', count: 14, pct: 33 },
              ].map((d, i) => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-400 w-3">{i + 1}</span>
                      <span className="text-xs text-gray-700">{d.name}</span>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: '#0892a0' }}>{d.count}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: '#E0F6F9' }}>
                    <div style={{ width: `${d.pct}%`, height: '100%', background: i === 0 ? '#0BBECF' : '#B2EEF5', borderRadius: '999px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

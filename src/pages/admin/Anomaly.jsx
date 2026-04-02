import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { UPWARD_STATUS, DOWNWARD_STATUS } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'

function hoursAgo(iso) {
  const h = Math.floor((Date.now() - new Date(iso)) / 3600000)
  if (h < 1) return '不足1小时'
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h/24)}天前`
}
function RowNo({ n, color = '#ef4444' }) {
  return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: color }}>{n}</span>
}
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

// P0-6：指派医生候选列表（从 mockData MOCK_USERS 中获取县级医生，生产环境从接口获取）
const COUNTY_DOCTORS = [
  { id: 'county_doctor_1', name: '李志远', dept: '内科' },
  { id: 'county_doctor_2', name: '王晓敏', dept: '心内科（科室负责人）' },
]

export default function AdminAnomaly() {
  const navigate = useNavigate()
  const { referrals, closeReferral, assignDoctorByAdmin, closeDownwardByTimeout, escalateEmergencyAlert, renotifyEmergency } = useApp()
  const [tab, setTab] = useState('timeout')

  // A-12：协商关闭弹窗状态
  const [negotiateDialog, setNegotiateDialog] = useState({ open: false, ref: null })
  const [negotiateReason, setNegotiateReason] = useState('')

  // G5：指定医生弹窗状态
  const [assignDialog, setAssignDialog] = useState({ open: false, ref: null })
  const [assignDoctor, setAssignDoctor] = useState('')

  const openNegotiateClose = (ref) => {
    setNegotiateDialog({ open: true, ref })
    setNegotiateReason('')
  }

  // 超时预警规则（state-machine.md）：
  //   待审核/待接收 > 24h → 以 createdAt 为基准
  //   上转转诊中 > 48h 未完成确认 → 以 acceptedAt 为基准
  //   下转转诊中 > 7天 → G1决策，系统自动关闭（以 acceptedAt 为基准）
  const timeoutRefs = referrals.filter(r => {
    if (r.type === 'upward' && r.status === UPWARD_STATUS.PENDING) {
      return Date.now() - new Date(r.createdAt) > 24 * 3600000
    }
    if (r.type === 'downward' && r.status === DOWNWARD_STATUS.PENDING) {
      return Date.now() - new Date(r.createdAt) > 24 * 3600000
    }
    if (r.type === 'upward' && r.status === UPWARD_STATUS.IN_TRANSIT && r.acceptedAt) {
      return Date.now() - new Date(r.acceptedAt) > 48 * 3600000
    }
    // P0-03：下转「转诊中」超时7天（G1决策）
    if (r.type === 'downward' && r.status === DOWNWARD_STATUS.IN_TRANSIT) {
      const base = r.acceptedAt || r.createdAt
      return Date.now() - new Date(base) > 7 * 24 * 3600000
    }
    return false
  })

  // P1-2：紧急未处理（急诊4h无人受理，已标记 urgentFlag 或 isUrgentUnhandled）
  const urgentRefs = referrals.filter(r =>
    (r.urgentFlag === 'urgent_unhandled' || r.isUrgentUnhandled) && r.status === UPWARD_STATUS.PENDING
  )

  // 被拒绝
  const rejectedRefs = referrals.filter(r =>
    r.status === UPWARD_STATUS.REJECTED || r.status === DOWNWARD_STATUS.REJECTED
  )

  const tabs = [
    { id: 'timeout', label: '超时预警', count: timeoutRefs.length + urgentRefs.length, color: '#ef4444' },
    { id: 'rejected', label: '拒绝记录', count: rejectedRefs.length, color: '#f59e0b' },
  ]
  const current = tab === 'timeout' ? timeoutRefs : rejectedRefs

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">异常处理</h2>
        <div className="text-xs text-gray-400 mt-0.5">超时未处理、被拒绝申请的异常监控与介入入口</div>
      </div>

      {/* 概览 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: '⏰', label: '超时待处理', count: timeoutRefs.length, color: '#ef4444', bg: '#fef2f2' },
          { icon: '❌', label: '被拒绝申请', count: rejectedRefs.length, color: '#f59e0b', bg: '#fef3c7' },
          { icon: '✅', label: '今日已处理', count: 3, color: '#10b981', bg: '#ecfdf5' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5" style={{ border: `1px solid ${item.bg}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: item.bg }}>{item.icon}</div>
            <div>
              <div className="text-xl font-bold" style={{ color: item.color }}>{item.count}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 标签页 */}
      <div className="flex gap-0 mb-4" style={{ borderBottom: '2px solid #E0F6F9' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="relative px-5 py-2.5 text-sm font-medium transition-colors"
            style={tab === t.id ? { color: '#0BBECF', borderBottom: '2px solid #0BBECF', marginBottom: '-2px' } : { color: '#6b7280' }}>
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: t.id === 'timeout' ? '#fef2f2' : '#fef3c7', color: t.color }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* P1-2：紧急未处理分区（急诊4h无人接单） */}
      {tab === 'timeout' && urgentRefs.length > 0 && (
        <div className="mb-3 bg-red-50 rounded-xl overflow-hidden" style={{ border: '2px solid #ef4444' }}>
          <div className="px-4 py-2.5 flex items-center gap-2 text-sm font-semibold text-red-700" style={{ borderBottom: '1px solid #fecaca' }}>
            <span>🔴</span>
            <span>紧急未处理 — 急诊4小时无人受理</span>
            <span className="ml-auto text-xs font-normal bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{urgentRefs.length} 条</span>
          </div>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {urgentRefs.map((ref, i) => (
                <tr key={ref.id} className="cursor-pointer" style={{ borderBottom: '1px solid #fecaca', background: '#fff5f5' }}
                  onClick={() => navigate(`/referral/${ref.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff5f5'}>
                  <td className={TD}><RowNo n={i+1} color="#ef4444" /></td>
                  <td className={TD}>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">🚨 急诊 · 4h未受理 · 需立即处理</span>
                  </td>
                  <td className={TD + ' font-medium'}>{ref.patient?.name}</td>
                  <td className={TD + ' text-gray-500'}>{ref.diagnosis?.name}</td>
                  <td className={TD + ' text-gray-500'}>{ref.fromInstitution}</td>
                  <td className={TD}>
                    {/* P0-7：2h催办三方 */}
                    <button onClick={e => { e.stopPropagation(); renotifyEmergency(ref.id) }}
                      className="text-xs px-2 py-1 rounded border font-medium mr-1"
                      style={{ borderColor: '#f59e0b', color: '#b45309', background: '#fffbeb' }}>
                      ⚠️ 再次催办三方
                    </button>
                    {/* P0-7：4h升级告警（已是紧急告警时禁用） */}
                    {!ref.isUrgentUnhandled && (
                      <button onClick={e => { e.stopPropagation(); escalateEmergencyAlert(ref.id) }}
                        className="text-xs px-2 py-1 rounded border font-medium mr-1"
                        style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                        🔴 升级告警
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); navigate(`/referral/${ref.id}`) }}
                      className="text-xs px-2 py-1 rounded border"
                      style={{ borderColor: '#d1d5db', color: '#374151' }}>
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        {current.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">✅</div>
            <div className="text-sm text-gray-500">暂无{tab === 'timeout' ? '超时' : '拒绝'}记录</div>
          </div>
        ) : (
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['序号','类型','患者','诊断','来源机构','状态','异常时长/原因','操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.map((ref, i) => (
                <tr key={ref.id} style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#fff9f9', cursor: 'pointer' }}
                  onClick={() => navigate(`/referral/${ref.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fff9f9'}>
                  <td className={TD}><RowNo n={i+1} color={tab === 'timeout' ? '#ef4444' : '#f59e0b'} /></td>
                  <td className={TD}>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={ref.type === 'upward' ? { background: '#E0F6F9', color: '#0892a0' } : { background: '#ecfdf5', color: '#047857' }}>
                      {ref.type === 'upward' ? '⬆ 上转' : '⬇ 下转'}
                    </span>
                  </td>
                  <td className={TD + ' font-medium text-gray-800'}>{ref.patient.name}<span className="text-xs text-gray-400 ml-1">{ref.patient.age}岁</span></td>
                  <td className={TD + ' text-xs text-gray-600'}>{ref.diagnosis.name}</td>
                  <td className={TD + ' text-xs text-gray-400'}>{ref.fromInstitution}</td>
                  <td className={TD}><StatusBadge status={ref.status} size="sm" /></td>
                  <td className={TD}>
                    {tab === 'timeout' ? (
                      <span className="text-xs font-medium text-red-500">{hoursAgo(ref.createdAt)}</span>
                    ) : (
                      <span className="text-xs text-gray-500 max-w-[160px] truncate block">{ref.rejectReason || '—'}</span>
                    )}
                  </td>
                  <td className={TD} onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={() => navigate(`/referral/${ref.id}`)} className="text-xs font-medium" style={{ color: '#0BBECF' }}>查看</button>
                      {tab === 'timeout' && (
                        <>
                          {/* 催办 */}
                          <button
                            className="border border-orange-300 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs"
                            onClick={() => alert('已发送催办通知')}
                          >催办</button>

                          {/* G5：指派经办医生（上转待审核且无人受理时显示）*/}
                          {ref.type === 'upward' && ref.status === UPWARD_STATUS.PENDING && !ref.assignedDoctorId && (
                            <button
                              className="px-2 py-1 rounded text-xs border"
                              style={{ borderColor: '#0BBECF', color: '#0892a0', background: '#f0fdfe' }}
                              onClick={() => { setAssignDialog({ open: true, ref }); setAssignDoctor('') }}
                            >指定医生</button>
                          )}

                          {/* P0-03：下转超时7天可触发关闭 */}
                          {ref.type === 'downward' && ref.status === DOWNWARD_STATUS.IN_TRANSIT && (
                            <button
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                              onClick={() => {
                                if (window.confirm(`确认关闭下转单 ${ref.id}（超时7天未到达）？`)) {
                                  closeDownwardByTimeout(ref.id)
                                }
                              }}
                            >超时关闭</button>
                          )}

                          {/* 代为确认（上转转诊中超时48h）*/}
                          {ref.type === 'upward' && ref.status === UPWARD_STATUS.IN_TRANSIT &&
                            ref.acceptedAt && (Date.now() - new Date(ref.acceptedAt)) > 48 * 3600000 && (
                            <button
                              className="bg-orange-500 text-white px-2 py-1 rounded text-xs"
                              onClick={() => alert('管理员代为确认操作（原型演示）')}
                            >代为确认接诊</button>
                          )}

                          {/* A-12：协商关闭 */}
                          {(ref.status === UPWARD_STATUS.PENDING || ref.status === UPWARD_STATUS.IN_TRANSIT ||
                            ref.status === DOWNWARD_STATUS.PENDING || ref.status === DOWNWARD_STATUS.IN_TRANSIT) && (
                            <button
                              onClick={() => openNegotiateClose(ref)}
                              className="border border-gray-400 text-gray-600 bg-white hover:bg-gray-50 px-2 py-1 rounded text-xs"
                            >协商关闭</button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* G5：指定医生弹窗 */}
      {assignDialog.open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setAssignDialog({ open: false, ref: null })} />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-96 p-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">指派经办医生</h3>
              <p className="text-xs text-gray-400 mb-4">
                {assignDialog.ref?.id} · {assignDialog.ref?.patient?.name} · {assignDialog.ref?.toDept}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 text-xs text-amber-700">
                指派后该医生将收到强推通知，申请归其名下处理，其他医生不可再受理。操作将写入 F-09 日志。
              </div>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none"
                style={{ '--tw-ring-color': '#0BBECF' }}
                value={assignDoctor}
                onChange={e => setAssignDoctor(e.target.value)}
              >
                <option value="">请选择经办医生</option>
                {COUNTY_DOCTORS.map(d => <option key={d.id} value={d.id}>{d.name}（{d.dept}）</option>)}
              </select>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setAssignDialog({ open: false, ref: null })}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600"
                >取消</button>
                <button
                  disabled={!assignDoctor}
                  onClick={() => {
                    // P0-6：传入 doctorId + doctorName
                    const doctor = COUNTY_DOCTORS.find(d => d.id === assignDoctor)
                    if (doctor) assignDoctorByAdmin(assignDialog.ref.id, doctor.id, doctor.name)
                    setAssignDialog({ open: false, ref: null })
                    setAssignDoctor('')
                  }}
                  className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-40 transition-colors"
                  style={{ background: '#0BBECF' }}
                >确认指定</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* A-12：协商关闭弹窗 */}
      {negotiateDialog.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">协商关闭转诊单</h3>
            <p className="text-sm text-gray-500 mb-4">
              转诊单号：<span className="font-medium text-gray-800">{negotiateDialog.ref?.referralNo ?? negotiateDialog.ref?.id}</span>
              &nbsp;·&nbsp;患者：<span className="font-medium text-gray-800">{negotiateDialog.ref?.patient?.name}</span>
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 text-sm text-amber-800">
              协商关闭将通知转诊双方医生，并将该转诊单状态变更为「已关闭」。此操作将写入操作日志，不可逆。
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                关闭原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 resize-none"
                style={{ '--tw-ring-color': '#0BBECF' }}
                rows={3}
                placeholder="请填写协商关闭原因（必填，将通知双方医生）"
                value={negotiateReason}
                onChange={e => setNegotiateReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setNegotiateDialog({ open: false, ref: null })}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (!negotiateReason.trim()) { alert('请填写关闭原因'); return }
                  closeReferral(negotiateDialog.ref.id, negotiateReason)
                  setNegotiateDialog({ open: false, ref: null })
                  setNegotiateReason('')
                }}
                className="bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-800"
              >
                确认关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

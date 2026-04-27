import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ROLES } from '../../data/mockData'
import {
  buildFollowupTaskDetail,
  buildScopedFollowups,
  filterFollowupsByAssignee,
  filterFollowupsByTab,
  getFollowupCounts,
} from '../../utils/followupTasks.js'

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

const DEMO_PRIMARY_DOCTORS = [
  { id: 'u001', name: '王医生', institution: 'xx市拱星镇卫生院' },
  { id: 'u101', name: '李慧医生', institution: 'xx市拱星镇卫生院' },
  { id: 'u102', name: '张明医生', institution: 'xx市汉旺镇卫生院' },
  { id: 'u103', name: '陈芳医生', institution: 'xx市汉旺镇卫生院' },
]

const PRIMARY_HEAD_MOCK_FOLLOWUPS = [
  {
    id: 'FU_MOCK_HEAD_1',
    referralId: 'REF2026018',
    patient: { name: '吴建平', age: 59, gender: '男' },
    diagnosis: { name: '单侧原发性膝关节炎' },
    fromInstitution: 'xx市人民医院',
    assignedDoctor: '王晓敏',
    downwardDate: '2026-04-09',
    lastFollowupAt: null,
    followupDate: '2026-04-18',
    status: '待随访',
    visitCount: 0,
    indicators: ['伤口愈合', '关节活动度', '凝血功能'],
    daysLeft: 11,
    isOverdue: false,
    isUrgent: false,
  },
  {
    id: 'FU_MOCK_HEAD_2',
    referralId: 'REF2026019',
    patient: { name: '孙秀兰', age: 72, gender: '女' },
    diagnosis: { name: '脑梗死' },
    fromInstitution: 'xx市人民医院',
    assignedDoctor: '王医生',
    downwardDate: '2026-04-08',
    lastFollowupAt: '2026-04-07',
    followupDate: '2026-04-10',
    status: '随访中',
    visitCount: 1,
    indicators: ['血压', '言语功能', '肢体活动度'],
    daysLeft: 3,
    isOverdue: false,
    isUrgent: true,
  },
]

export default function PrimaryFollowupList() {
  const { referrals, currentUser } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [assignDialog, setAssignDialog] = useState(null)
  const [historyDialog, setHistoryDialog] = useState(null)
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [successTip, setSuccessTip] = useState('')
  const [assigneeOverrides, setAssigneeOverrides] = useState({})
  const isPrimaryHead = currentUser.role === ROLES.PRIMARY_HEAD

  const baseFollowups = buildScopedFollowups(referrals, currentUser)
  const mergedFollowups = isPrimaryHead
    ? [...baseFollowups, ...PRIMARY_HEAD_MOCK_FOLLOWUPS.filter(mock => !baseFollowups.some(task => task.referralId === mock.referralId))]
    : baseFollowups
  const scopedFollowups = mergedFollowups.map(task => ({
    ...task,
    assignedDoctor: assigneeOverrides[task.referralId] || task.assignedDoctor,
  }))
  const counts = getFollowupCounts(scopedFollowups)
  const filteredByTab = filterFollowupsByTab(scopedFollowups, filter)
  const filtered = isPrimaryHead ? filterFollowupsByAssignee(filteredByTab, assigneeFilter) : filteredByTab
  const assigneeOptions = Array.from(new Set([
    ...DEMO_PRIMARY_DOCTORS.filter(doctor => doctor.institution === currentUser.institution).map(doctor => doctor.name),
    ...scopedFollowups.map(task => task.assignedDoctor).filter(Boolean),
  ]))

  function openAssign(task) {
    setSelectedDoctor(task.assignedDoctor && task.assignedDoctor !== '—' ? task.assignedDoctor : '')
    setAssignDialog(task)
  }

  function openHistory(task) {
    const detail = buildFollowupTaskDetail(referrals, currentUser, task.referralId)
    setHistoryDialog({
      ...task,
      historyRecords: detail?.historyRecords || [],
    })
  }

  function confirmAssign() {
    if (!assignDialog || !selectedDoctor) return
    setAssigneeOverrides(prev => ({ ...prev, [assignDialog.referralId]: selectedDoctor }))
    setSuccessTip(`已将「${assignDialog.patient.name}」的随访任务转派给 ${selectedDoctor}`)
    setAssignDialog(null)
    setSelectedDoctor('')
    setTimeout(() => setSuccessTip(''), 3000)
  }

  const pageTitle = isPrimaryHead ? '机构随访任务' : '我的随访任务'
  const emptyText = isPrimaryHead ? '当前机构暂无随访任务' : '暂无随访任务'
  const footerText = isPrimaryHead
    ? 'ℹ️ 随访任务由系统在基层确认接收转入后自动创建并归属到机构内执行医生名下，可在本页按需转派。'
    : 'ℹ️ 随访任务由系统在基层确认接收转入后自动创建并归属至您名下。如需申请转派，请联系负责人。'

  return (
    <div className="p-5">
      {successTip && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white" style={{ background: '#059669', minWidth: '280px', textAlign: 'center' }}>
          {successTip}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">{pageTitle}</h2>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { id: 'all', label: '全部', count: counts.all, color: '#6366f1', bg: '#ede9fe' },
          { id: 'overdue', label: '已逾期', count: counts.overdue, color: '#ef4444', bg: '#fef2f2' },
          { id: 'urgent', label: '即将到期（≤3天）', count: counts.urgent, color: '#f59e0b', bg: '#fef3c7' },
          { id: 'pending', label: '待随访', count: counts.pending, color: '#059669', bg: '#d1fae5' },
        ].map(c => (
          <div
            key={c.id}
            onClick={() => setFilter(c.id)}
            className="bg-white rounded-xl px-4 py-3 cursor-pointer"
            style={{ border: `2px solid ${filter === c.id ? c.color : '#DDF0F3'}` }}
          >
            <div className="text-xl font-bold" style={{ color: c.color }}>{c.count}</div>
            <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {isPrimaryHead && (
        <div className="mb-4 flex items-center gap-3">
          <div className="text-xs text-gray-500">负责人/执行医生</div>
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100"
          >
            <option value="all">全部负责人</option>
            {assigneeOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 列表 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#E0F6F9' }}>
              {[
                '序号',
                '患者',
                '诊断',
                '来源机构',
                ...(isPrimaryHead ? ['当前负责人'] : []),
                '监测指标',
                '下转日期',
                '上次随访',
                '计划随访日期',
                '状态',
                '操作',
              ].map(h => (
                <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isPrimaryHead ? 9 : 8} className="py-12 text-center text-gray-400 text-sm">
                  {emptyText}
                </td>
              </tr>
            ) : filtered.map((f, i) => (
              <tr key={f.id} style={{ borderBottom: '1px solid #EEF7F9', background: f.isOverdue ? '#fff9f9' : '#fff' }}>
                <td className={TD}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white" style={{ background: '#0BBECF' }}>{i+1}</span>
                </td>
                <td className={TD}>
                  <div className="font-medium text-gray-800">{f.patient.name}</div>
                  <div className="text-xs text-gray-400">{f.patient.age}岁 · {f.patient.gender}</div>
                </td>
                <td className={TD + ' text-xs text-gray-600'}>{f.diagnosis.name}</td>
                <td className={TD + ' text-xs text-gray-500'}>{f.fromInstitution}</td>
                {isPrimaryHead && <td className={TD + ' text-xs text-gray-600'}>{f.assignedDoctor}</td>}
                <td className={TD}>
                  <div className="flex flex-wrap gap-1">
                    {(f.indicators || []).slice(0, 3).map(ind => (
                      <span key={ind} className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#E0F6F9', color: '#0892a0' }}>{ind}</span>
                    ))}
                    {f.indicators.length > 3 && <span className="text-xs text-gray-400">+{f.indicators.length-3}</span>}
                  </div>
                </td>
                <td className={TD}>
                  <div className="text-sm text-gray-700">{fmt(f.downwardDate)}</div>
                </td>
                <td className={TD}>
                  <div className="text-sm text-gray-700">{fmt(f.lastFollowupAt)}</div>
                  {f.visitCount > 0 && <div className="text-xs text-gray-400">已随访 {f.visitCount} 次</div>}
                </td>
                <td className={TD}>
                  <div className="text-sm text-gray-700">{fmt(f.followupDate)}</div>
                  {f.isOverdue && <div className="text-xs text-red-500">逾期 {Math.abs(f.daysLeft)} 天</div>}
                  {f.isUrgent && !f.isOverdue && <div className="text-xs text-amber-500">还剩 {f.daysLeft} 天</div>}
                </td>
                <td className={TD}>
                  {f.status === '已逾期' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>已逾期</span>
                  )}
                  {f.status === '待随访' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#d1fae5', color: '#047857', border: '1px solid #a7f3d0' }}>待随访</span>
                  )}
                  {f.status === '随访中' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>随访中</span>
                  )}
                  {f.status === '已完成' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>已完成</span>
                  )}
                  {f.status === '已失访' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db' }}>已失访</span>
                  )}
                </td>
                <td className={TD}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/primary/followup-task/${f.referralId}`)}
                      className="text-xs font-medium"
                      style={{ color: '#0892a0' }}
                    >
                      记录随访
                    </button>
                    <button
                      onClick={() => openHistory(f)}
                      className="text-xs font-medium"
                      style={{ color: '#0BBECF' }}
                    >
                      历史随访记录
                    </button>
                    {isPrimaryHead && (
                      <button
                        onClick={() => openAssign(f)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        转派
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-600">
        {footerText}
      </div>

      {historyDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #EEF7F9' }}>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">历史随访记录</h3>
                <div className="text-xs text-gray-400 mt-1">{historyDialog.patient.name} · {historyDialog.diagnosis.name}</div>
              </div>
              <button onClick={() => setHistoryDialog(null)} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 text-lg">×</button>
            </div>
            <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
              {historyDialog.historyRecords.length > 0 ? (
                <div className="space-y-4">
                  {historyDialog.historyRecords.map((item, index) => (
                    <div key={item.id || index} className="relative pl-6">
                      {index !== historyDialog.historyRecords.length - 1 && (
                        <div className="absolute left-[7px] top-6 bottom-[-18px] w-px bg-cyan-100" />
                      )}
                      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full" style={{ background: '#0BBECF' }} />
                      <div className="rounded-xl px-4 py-4" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-medium text-gray-800">{item.status}</div>
                            <div className="text-xs text-gray-400 mt-1">{fmt(item.followupDate)} · {item.method} · {item.doctorName}</div>
                          </div>
                          <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#E0F6F9', color: '#0892a0' }}>
                            {item.patientStatus}
                          </div>
                        </div>
                        {item.metricSummary && <div className="text-sm text-gray-600 mt-3">监测结果：{item.metricSummary}</div>}
                        <div className="text-sm text-gray-600 mt-2">随访小结：{item.summary}</div>
                        <div className="text-sm text-gray-600 mt-2">处理建议：{item.advice}</div>
                        {item.nextFollowupDate && (
                          <div className="text-xs text-gray-400 mt-2">下次随访日期：{fmt(item.nextFollowupDate)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 py-6 text-center">暂无历史随访记录</div>
              )}
            </div>
            <div className="px-5 py-4 flex items-center justify-end gap-3" style={{ borderTop: '1px solid #EEF7F9' }}>
              <button onClick={() => setHistoryDialog(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">关闭</button>
              <button onClick={() => navigate(`/primary/followup-task/${historyDialog.referralId}`)} className="px-4 py-2 text-sm rounded-lg text-white" style={{ background: '#0BBECF' }}>进入随访详情</button>
            </div>
          </div>
        </div>
      )}

      {assignDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" style={{ border: '1px solid #DDF0F3' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #EEF7F9' }}>
              <h3 className="text-sm font-semibold text-gray-800">转派随访任务</h3>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="rounded-lg px-4 py-3" style={{ background: '#F8FDFE', border: '1px solid #DDF0F3' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800">{assignDialog.patient.name}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">{assignDialog.diagnosis.name}</span>
                </div>
                <div className="text-xs text-gray-400">计划随访日期：{fmt(assignDialog.followupDate)}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">负责人/执行医生</label>
                <select
                  value={selectedDoctor}
                  onChange={e => setSelectedDoctor(e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 outline-none"
                  style={{ borderColor: selectedDoctor ? '#0BBECF' : '#d1d5db', color: selectedDoctor ? '#111827' : '#9ca3af' }}
                >
                  <option value="">请选择</option>
                  {assigneeOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-5 py-4 flex items-center justify-end gap-3" style={{ borderTop: '1px solid #EEF7F9' }}>
              <button onClick={() => setAssignDialog(null)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={confirmAssign} disabled={!selectedDoctor} className={`px-4 py-2 text-sm rounded-lg text-white ${selectedDoctor ? '' : 'bg-gray-300 cursor-not-allowed'}`} style={selectedDoctor ? { background: '#0BBECF' } : {}}>确认转派</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

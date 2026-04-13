import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import Placeholder from '../shared/Placeholder'
import StatusBadge from '../../components/StatusBadge'
import { buildFollowupTaskDetail } from '../../utils/followupTasks'

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-100'

function fmtDate(value) {
  if (!value || value === '—') return '—'
  return new Date(value).toLocaleDateString('zh-CN')
}

function InfoCard({ title, children, actions }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoGrid({ items, columns = 4 }) {
  return (
    <div className={`grid gap-4 ${columns === 4 ? 'grid-cols-4' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {items.map(item => (
        <div key={item.label} className="rounded-xl px-4 py-3" style={{ background: '#F5FCFD', border: '1px solid #DDF0F3' }}>
          <div className="text-xs text-gray-500">{item.label}</div>
          <div className="text-sm font-medium text-gray-800 mt-1">{item.value || '—'}</div>
        </div>
      ))}
    </div>
  )
}

function RecordFollowupDialog({ initialValue, indicators, onCancel, onConfirm }) {
  const [form, setForm] = useState(initialValue)

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const canSubmit = form.method && form.followupDate && form.patientStatus

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-base font-semibold text-gray-800">记录本次随访</div>
          <div className="text-sm text-gray-500 mt-1">记录本次随访后将新增一条历史记录，便于后续持续跟踪。</div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">随访方式</label>
            <select value={form.method} onChange={event => update('method', event.target.value)} className={inputCls}>
              <option value="电话">电话</option>
              <option value="上门">上门</option>
              <option value="门诊复诊">门诊复诊</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">随访日期</label>
            <input type="date" value={form.followupDate} onChange={event => update('followupDate', event.target.value)} className={inputCls} />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">患者状态</label>
            <div className="grid grid-cols-4 gap-3">
              {['稳定', '好转', '需关注', '需上转'].map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => update('patientStatus', status)}
                  className="rounded-xl border px-3 py-3 text-sm transition-colors"
                  style={form.patientStatus === status
                    ? { background: '#E0F6F9', borderColor: '#0BBECF', color: '#0892a0' }
                    : { background: '#fff', borderColor: '#E5E7EB', color: '#374151' }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2 rounded-xl p-4" style={{ background: '#F8FDFE', border: '1px solid #DDF0F3' }}>
            <div className="text-sm font-medium text-gray-800 mb-3">监测指标录入</div>
            <div className="grid grid-cols-2 gap-4">
              {indicators.map(label => (
                <div key={label}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <input
                    value={form.metrics[label] || ''}
                    onChange={event => update('metrics', { ...form.metrics, [label]: event.target.value })}
                    className={inputCls}
                    placeholder={`填写${label}本次随访结果`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">随访小结</label>
            <textarea rows={3} value={form.summary} onChange={event => update('summary', event.target.value)} className={`${inputCls} resize-none`} placeholder="补充本次随访总体情况、患者反馈及医生判断" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">下次随访日期</label>
            <input type="date" value={form.nextFollowupDate} onChange={event => update('nextFollowupDate', event.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            取消
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => canSubmit && onConfirm(form)}
            className={`px-4 py-2 text-sm rounded-lg text-white ${canSubmit ? '' : 'opacity-50 cursor-not-allowed'}`}
            style={{ background: '#0BBECF' }}
          >
            确认记录
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionDialog({ title, description, confirmText, onCancel, onConfirm, placeholder }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-base font-semibold text-gray-800">{title}</div>
          <div className="text-sm text-gray-500 mt-1">{description}</div>
        </div>
        <div className="p-5">
          <textarea
            rows={4}
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder={placeholder}
            className={`${inputCls} resize-none`}
          />
          <div className="flex items-center justify-end gap-3 mt-4">
            <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              取消
            </button>
            <button onClick={() => onConfirm(reason)} className="px-4 py-2 text-sm rounded-lg text-white" style={{ background: '#0BBECF' }}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PrimaryFollowupTaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    referrals,
    currentUser,
    recordFollowupVisit,
    markFollowupUnreachable,
    requestFollowupReassign,
  } = useApp()
  const detail = useMemo(() => buildFollowupTaskDetail(referrals, currentUser, id), [referrals, currentUser, id])
  const [showHistory, setShowHistory] = useState(true)
  const [showBackground, setShowBackground] = useState(false)
  const [notice, setNotice] = useState('')
  const [dialog, setDialog] = useState(null)
  const noticeTimerRef = useRef(null)

  if (!detail) {
    return <Placeholder title="随访任务不存在" description="当前任务不存在、已超出您的负责范围，或尚未生成随访任务。" />
  }

  const monitoredIndicators = detail.followupGoals.filter(item => item.monitored).map(item => item.label)
  const backgroundItems = [
    { label: '下转原因', value: detail.downwardReason },
    { label: '转诊机构', value: detail.fromInstitution },
    { label: '接诊机构', value: detail.toInstitution },
  ]

  function flash(message) {
    setNotice(message)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => setNotice(''), 3000)
  }

  function handleRecord(record) {
    recordFollowupVisit(detail.referralId, record)
    setDialog(null)
    flash('已记录本次随访，并写入历次随访记录')
  }

  function handleUnreachable(reason) {
    markFollowupUnreachable(detail.referralId, reason)
    setDialog(null)
    flash('已记录“未联系上”，任务仍保持待随访')
  }

  function handleReassign(reason) {
    requestFollowupReassign(detail.referralId, reason)
    setDialog(null)
    flash(`已提交转派申请${reason ? `：${reason}` : ''}`)
  }

  const recordDraft = {
    method: '电话',
    followupDate: new Date().toISOString().split('T')[0],
    patientStatus: '稳定',
    metrics: monitoredIndicators.reduce((acc, label) => ({ ...acc, [label]: '' }), {}),
    summary: '',
    nextFollowupDate: detail.followupDate || '',
  }

  return (
    <div className="p-5">
      {notice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white" style={{ background: '#059669', minWidth: '280px', textAlign: 'center' }}>
          {notice}
        </div>
      )}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">随访任务详情</h2>
          <div className="text-xs text-gray-400 mt-0.5">
            基层医生执行单个随访任务的工作页，转诊单作为参考资料子入口
          </div>
        </div>
        <button
          onClick={() => navigate('/primary/followup')}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          返回任务列表
        </button>
      </div>

      <div className="space-y-4">
        <InfoCard title="患者基本信息">
          <InfoGrid
            items={[
              { label: '患者姓名', value: detail.patient.name },
              { label: '性别', value: detail.patient.gender },
              { label: '年龄', value: `${detail.patient.age}岁` },
              { label: '主要诊断', value: detail.chiefDiagnosis },
              { label: '来源医院', value: detail.sourceHospital },
              { label: '下转日期', value: fmtDate(detail.downwardDate) },
              { label: '责任医生', value: detail.responsibilityDoctor },
              { label: '任务状态', value: <StatusBadge status={detail.status} size="sm" /> },
              { label: '计划随访日期', value: fmtDate(detail.followupDate) },
              { label: '上次随访', value: detail.lastFollowupAt ? fmtDate(detail.lastFollowupAt) : '暂无' },
            ]}
            columns={4}
          />
        </InfoCard>

        <InfoCard title="本次随访要点">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl p-4" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="text-sm font-medium text-gray-800">监测指标</div>
              <div className="flex flex-wrap gap-2 mt-3">
                {detail.followupGoals.filter(item => item.monitored).map(item => (
                  <span key={item.label} className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#E0F6F9', color: '#0892a0', border: '1px solid #A4EDF5' }}>
                    {item.label}
                  </span>
                ))}
                {detail.otherIndicators.map(item => (
                  <span key={item} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="text-sm font-medium text-gray-800">用药医嘱</div>
              <div className="text-sm text-gray-600 mt-3 space-y-1">
                {(detail.referral.rehabPlan?.medications || []).slice(0, 3).map(item => (
                  <div key={item.name}>{item.name} {item.spec} · {item.usage}</div>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="text-sm font-medium text-gray-800">注意事项</div>
              <div className="text-sm text-gray-600 mt-3 leading-6">
                {detail.referral.rehabPlan?.notes || '暂无特别注意事项'}
              </div>
            </div>
          </div>
        </InfoCard>

        <InfoCard title="随访操作区（核心）">
          <div className="rounded-xl px-4 py-4 mb-4" style={{ background: '#F8FDFE', border: '1px solid #DDF0F3' }}>
            <div className="text-sm text-gray-700">优先记录本次随访；若本次未联系上患者，请直接标记未联系上并保留任务为待随访。</div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setDialog('record')} className="px-4 py-2 text-sm rounded-lg text-white" style={{ background: '#0BBECF' }}>
              记录本次随访
            </button>
            <button onClick={() => setDialog('unreachable')} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              标记未联系上
            </button>
            <button
              onClick={() => setDialog('reassign')}
              className="text-sm font-medium"
              style={{ color: '#0892a0' }}
            >
              申请转派
            </button>
          </div>
        </InfoCard>

        <InfoCard
          title="历史随访记录"
          actions={
            <button
              onClick={() => setShowHistory(prev => !prev)}
              className="text-sm font-medium"
              style={{ color: '#0892a0' }}
            >
              {showHistory ? '收起' : '展开'}
            </button>
          }
        >
          {showHistory ? (
            detail.historyRecords.length > 0 ? (
              <div className="space-y-4">
                {detail.historyRecords.map((item, index) => (
                  <div key={item.id} className="relative pl-6">
                    {index !== detail.historyRecords.length - 1 && (
                      <div className="absolute left-[7px] top-6 bottom-[-18px] w-px bg-cyan-100" />
                    )}
                    <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full" style={{ background: '#0BBECF' }} />
                    <div className="rounded-xl px-4 py-4" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{item.status}</div>
                          <div className="text-xs text-gray-400 mt-1">{fmtDate(item.followupDate)} · {item.method} · {item.doctorName}</div>
                        </div>
                        <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#E0F6F9', color: '#0892a0' }}>
                          {item.patientStatus}
                        </div>
                      </div>
                      {item.metricSummary && <div className="text-sm text-gray-600 mt-3">监测结果：{item.metricSummary}</div>}
                      <div className="text-sm text-gray-600 mt-2">随访小结：{item.summary}</div>
                      <div className="text-sm text-gray-600 mt-2">处理建议：{item.advice}</div>
                      {item.nextFollowupDate && (
                        <div className="text-xs text-gray-400 mt-2">下次随访日期：{fmtDate(item.nextFollowupDate)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">暂无历史随访记录</div>
            )
          ) : (
            <div className="text-sm text-gray-500">已折叠历次随访记录，可展开查看每次随访结果与处理建议。</div>
          )}
        </InfoCard>

        <InfoCard
          title="关联转诊单快捷查看"
          actions={
            <button
              onClick={() => setShowBackground(prev => !prev)}
              className="text-sm font-medium"
              style={{ color: '#0892a0' }}
            >
              {showBackground ? '收起' : '展开'}
            </button>
          }
        >
          {showBackground ? (
            <div className="space-y-3">
              {backgroundItems.map(item => (
                <div key={item.label} className="rounded-xl px-4 py-3" style={{ background: '#F5FCFD', border: '1px solid #DDF0F3' }}>
                  <div className="text-xs text-gray-500">{item.label}</div>
                  <div className="text-sm text-gray-800 mt-1">{item.value || '—'}</div>
                </div>
              ))}
              <button
                onClick={() => navigate(`/referral/${detail.referralId}`)}
                className="text-sm font-medium"
                style={{ color: '#0BBECF' }}
              >
                查看原转诊单 →
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">该区域用于快速查看下转原因与原转诊单入口，不作为主操作区。</div>
          )}
        </InfoCard>
      </div>

      {dialog === 'record' && (
        <RecordFollowupDialog
          initialValue={recordDraft}
          indicators={monitoredIndicators.length > 0 ? monitoredIndicators : ['其他监测指标']}
          onCancel={() => setDialog(null)}
          onConfirm={handleRecord}
        />
      )}

      {dialog === 'unreachable' && (
        <ActionDialog
          title="标记未联系上"
          description="请填写本次未联系上的情况说明。系统将新增一条历史记录，但任务仍保持待随访。"
          confirmText="确认记录"
          placeholder="例如：电话无人接听，计划明日上午再次联系"
          onCancel={() => setDialog(null)}
          onConfirm={handleUnreachable}
        />
      )}

      {dialog === 'reassign' && (
        <ActionDialog
          title="申请转派"
          description="基层医生不直接转移任务，请填写转派申请原因，由负责人后续处理。"
          confirmText="提交申请"
          placeholder="例如：患者迁居外镇，建议改派更近机构继续随访"
          onCancel={() => setDialog(null)}
          onConfirm={handleReassign}
        />
      )}
    </div>
  )
}

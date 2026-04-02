import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ROLES, UPWARD_STATUS, DOWNWARD_STATUS, INSTITUTIONS, MOCK_FOLLOW_UP_TASKS } from '../../data/mockData'
import StatusBadge from '../../components/StatusBadge'
import SwimlaneDiagram from '../../components/SwimlaneDiagram'
import ArrangementModal from '../../components/ArrangementModal'

function formatTime(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// ── 确认对话框 ──
function ConfirmDialog({ title, description, inputLabel, inputRequired, onConfirm, onCancel, confirmText, confirmColor = 'blue' }) {
  const [inputVal, setInputVal] = useState('')
  const canConfirm = !inputRequired || inputVal.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-96 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="p-6">
          {inputLabel && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{inputLabel}</label>
              <textarea
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                rows={3}
                placeholder="请填写原因（必填）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={onCancel}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              disabled={!canConfirm}
              onClick={() => onConfirm(inputVal)}
              className={`flex-1 py-2 rounded text-sm font-medium text-white transition-colors ${!canConfirm ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}`}
              style={canConfirm ? {
                background: confirmColor === 'red' ? '#ef4444' : confirmColor === 'green' ? '#10b981' : '#0BBECF'
              } : {}}
            >
              {confirmText || '确认'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Assumption: is_emergency 字段由后端返回，mockData 中仅 REF2026001 有示例值，其余记录缺省视为 false

export default function ReferralDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    currentRole, currentUser, referrals, setReferrals,
    acceptReferral, rejectReferral, cancelReferral, closeReferral, reopenReferral, completeReferral,
    acceptDownwardReferral, completeDownwardReferral, rejectDownwardReferral,
    approveInternalReview, rejectInternalReview, claimDownwardReferral,
    submitForInternalReview, fillAdmissionArrangement,
  } = useApp()

  const ref = referrals.find(r => r.id === id)
  const [activeTab, setActiveTab] = useState('detail')
  const [dialog, setDialog] = useState(null) // null | { type, ... }
  const [admissionType, setAdmissionType] = useState('outpatient') // P0-3 承接方式
  const [urgedAt, setUrgedAt] = useState(null) // P1-3 催办冷却
  // S-02：知情同意记录折叠状态
  const [showConsentRecord, setShowConsentRecord] = useState(false)
  const [showAuditHistory, setShowAuditHistory] = useState(true) // 默认展开
  // M-7：管理员填写接诊安排 Modal
  const [showArrangementModal, setShowArrangementModal] = useState(false)
  // 变更五：模拟短信预览弹窗
  const [showSmsPreview, setShowSmsPreview] = useState(false)

  if (!ref) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-400 text-lg">找不到转诊单</div>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline text-sm">← 返回</button>
      </div>
    )
  }

  const isUpward = ref.type === 'upward'
  const isDownward = ref.type === 'downward'
  const isGreenChannel = ref.referral_type === 'green_channel'  // CHG-30

  // ── 角色操作权限判断 ──
  // C-2 修复：COUNTY 和 COUNTY2 共享相同操作权限
  const COUNTY_ROLES = [ROLES.COUNTY, ROLES.COUNTY2]
  const isCountyDoctor = COUNTY_ROLES.includes(currentRole)
  const isPrimaryDoctor = currentRole === ROLES.PRIMARY || currentRole === ROLES.PRIMARY_HEAD

  // P0-6：受理锁定——只有经办医生（或未受理时）才可接收/拒绝，改用 assignedDoctorId 比较
  const claimLockOk = !ref.assignedDoctorId || ref.assignedDoctorId === currentUser?.id
  const canAcceptUpward = isCountyDoctor && ref.status === UPWARD_STATUS.PENDING && claimLockOk
  const canRejectUpward = isCountyDoctor && ref.status === UPWARD_STATUS.PENDING && claimLockOk
  // 修复 A：删除 ACCEPTED 中间状态，接收后直接进入 in_transfer，只有 IN_TRANSIT 状态才能触发「完成接诊确认」
  const canCompleteUpward = isCountyDoctor && ref.status === UPWARD_STATUS.IN_TRANSIT
  // C-3 修复：PENDING_INTERNAL_REVIEW 状态下基层医生也可撤销（state-machine v1.3）
  // 注意：PRIMARY_HEAD 是审核人，不应有撤销权限，故此处只允许 ROLES.PRIMARY
  const canCancelUpward = currentRole === ROLES.PRIMARY && (ref.status === UPWARD_STATUS.PENDING || ref.status === UPWARD_STATUS.PENDING_INTERNAL_REVIEW)
  // CHG-32：下转受理锁（同上转受理锁逻辑）
  const downwardClaimLockOk = !ref.downwardAssignedDoctorId || ref.downwardAssignedDoctorId === currentUser?.id
  const canAcceptDownward = isPrimaryDoctor && ref.status === DOWNWARD_STATUS.PENDING && downwardClaimLockOk
  // 基层接收下转后进入转诊中，患者到达后才可完成确认（仅经办医生）
  const canCompleteDownward = isPrimaryDoctor && isDownward && ref.status === DOWNWARD_STATUS.IN_TRANSIT && ref.downwardAssignedDoctorId === currentUser?.id
  const canRejectDownward = isPrimaryDoctor && ref.status === DOWNWARD_STATUS.PENDING && downwardClaimLockOk

  // CHG-32：科主任院内审核权限
  const isPrimaryHead = currentRole === ROLES.PRIMARY_HEAD
  const canApproveInternalReview = isPrimaryHead && isUpward && ref.status === UPWARD_STATUS.PENDING_INTERNAL_REVIEW
  const canRejectInternalReview = isPrimaryHead && isUpward && ref.status === UPWARD_STATUS.PENDING_INTERNAL_REVIEW

  // 修复 B：被拒绝后的后续操作入口
  const canRejectedFollowUpUpward = isPrimaryDoctor && isUpward && ref.status === UPWARD_STATUS.REJECTED

  // 问题三修复：草稿状态 + 有内审拒绝记录 → 基层医生可修改并重新提交
  const hasInternalRejection = (ref.internalAuditLog || []).some(
    e => e.result === 'rejected' || e.action === 'INTERNAL_AUDIT_REJECT'
  )
  const canResubmitAfterInternalReject = currentRole === ROLES.PRIMARY && isUpward &&
    ref.status === UPWARD_STATUS.DRAFT && hasInternalRejection
  const canRejectedFollowUpDownward = isCountyDoctor && isDownward && ref.status === DOWNWARD_STATUS.REJECTED

  // 修复 C：管理员介入按钮
  // TODO: 生产环境替换为真实超时判断（pending_review > 24h、in_transfer > 48h、pending_accept > 24h）
  // 原型 mock 模式：直接显示按钮，不做时间判断，以确保演示时管理员能看到
  const isAdmin = currentRole === ROLES.ADMIN
  const adminCanUrgeUpwardReview = isAdmin && isUpward && ref.status === UPWARD_STATUS.PENDING
  const adminCanProxyCompleteUpward = isAdmin && isUpward && ref.status === UPWARD_STATUS.IN_TRANSIT
  const adminCanUrgeDownwardAccept = isAdmin && isDownward && ref.status === DOWNWARD_STATUS.PENDING
  // M-7：管理员可在详情页直接填写接诊安排（role-permission-matrix v1.3 第3A节）
  const adminCanArrange = isAdmin && isUpward && ref.status === UPWARD_STATUS.IN_TRANSIT && !ref.admissionArrangement

  const handleAction = (type) => {
    switch (type) {
      case 'acceptUpward':
        setAdmissionType('outpatient')
        setDialog({ type: 'acceptUpward' })
        break
      case 'acceptUpwardConfirm':
        acceptReferral(id, admissionType)
        setDialog(null)
        break
      case 'rejectUpward':
        // open dialog
        setDialog({ type: 'rejectUpward' })
        break
      case 'rejectUpwardConfirm':
        rejectReferral(id, dialog.reason)
        setDialog(null)
        break
      case 'cancelUpward':
        setDialog({ type: 'cancelUpward' })
        break
      case 'cancelUpwardConfirm':
        cancelReferral(id, dialog.reason)
        setDialog(null)
        break
      case 'completeUpward':
        setDialog({ type: 'completeUpward' })
        break
      case 'completeUpwardConfirm':
        completeReferral(id)
        setDialog(null)
        break
      case 'acceptDownward':
        acceptDownwardReferral(id)
        setDialog(null)
        break
      case 'completeDownward':
        setDialog({ type: 'completeDownward' })
        break
      case 'completeDownwardConfirm':
        completeDownwardReferral(id)
        setDialog(null)
        break
      case 'rejectDownward':
        setDialog({ type: 'rejectDownward' })
        break
      case 'rejectDownwardConfirm':
        rejectDownwardReferral(id, dialog.reason)
        setDialog(null)
        break

      // 修复 B：被拒绝后的后续操作
      case 'changeInstitution':
        setDialog({ type: 'changeInstitution' })
        break
      case 'changeInstitutionConfirm':
        // 换机构重新申请：关闭当前单（已关闭），跳转到新建上转页并携带患者基本信息预填
        closeReferral(id, '患者换机构重新申请，当前转诊单关闭')
        setDialog(null)
        navigate('/primary/create-referral', { state: { prefill: { patient: ref.patient, diagnosis: ref.diagnosis } } })
        break
      case 'resubmit':
        setDialog({ type: 'resubmit' })
        break
      case 'resubmitConfirm':
        // 修改重提：重置当前单回「待审核」，经办医生清空，重新进入审核队列
        reopenReferral(id)
        setDialog(null)
        break
      case 'resubmitInternalReject':
        // 内审拒绝后修改重提：携带全量表单数据跳转创建页预填
        navigate('/primary/create-referral', {
          state: {
            prefill: {
              patient: ref.patient,
              diagnosis: ref.diagnosis,
              chiefComplaint: ref.chiefComplaint,
              reason: ref.reason,
              toInstitution: ref.toInstitution,
              toDept: ref.toDept,
              originalDraftId: ref.id,   // 供 CreateReferral 知晓来源，可选用于关闭旧草稿
            }
          }
        })
        break

      case 'terminateRejected':
        setDialog({ type: 'terminateRejected' })
        break
      case 'terminateRejectedConfirm':
        // 终止申请目标状态为 CLOSED（已关闭），与 cancelReferral（已撤销）语义不同
        closeReferral(id, dialog.reason)
        setDialog(null)
        break

      // CHG-32：院内审核（科主任）
      case 'approveInternal':
        setDialog({ type: 'approveInternal' })
        break
      case 'approveInternalConfirm':
        approveInternalReview(id, dialog.comment || '')
        setDialog(null)
        break
      case 'rejectInternal':
        setDialog({ type: 'rejectInternal' })
        break
      case 'rejectInternalConfirm':
        rejectInternalReview(id, dialog.reason)
        setDialog(null)
        break

      // 修复 C：管理员催办与代确认
      case 'adminUrge':
        // TODO: 生产环境对接催办通知推送接口
        alert('已发送催办通知至相关医生')
        break
      case 'adminUrgeConfirm':
        // P1-3：管理员催办接诊确认（替代原「代为确认接诊」）
        setUrgedAt(new Date())
        setReferrals(prev => prev.map(r =>
          r.id !== id ? r : {
            ...r,
            logs: [
              ...r.logs,
              { time: new Date().toISOString(), actor: currentUser.name, action: 'URGE_CONFIRM', note: '管理员发送催办通知，要求接诊医生尽快完成确认' },
            ],
          }
        ))
        break
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => navigate(-1)} className="hover:text-primary-600" style={{ color: '#0BBECF' }}>← 返回</button>
        <span>›</span>
        <span>转诊单详情</span>
        <span>›</span>
        <span className="font-mono text-gray-700">{ref.id}</span>
      </div>

      {/* 标题栏 */}
      <div className="bg-white rounded mb-4" style={{ border: '1px solid #DDF0F3', boxShadow: '0 1px 4px rgba(11,190,207,0.06)' }}>
        <div className="px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">{isUpward ? '⬆️' : '⬇️'}</span>
              <h1 className="text-lg font-semibold text-gray-800">
                {isUpward ? '上转' : '下转'}申请 · {ref.patient.name}
              </h1>
              <StatusBadge status={ref.status} />
              {/* CHG-30：绿色通道标识 */}
              {isGreenChannel && (
                <span className="text-xs font-bold px-2 py-0.5 rounded text-white" style={{ background: '#10b981' }}>
                  绿通
                </span>
              )}
              {/* A-13：急诊标识（非绿通急诊单独显示） */}
              {(ref.is_emergency ?? false) && !isGreenChannel && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded border border-red-300">
                  急诊
                </span>
              )}
              {/* CHG-30：急诊·超时（isUrgentUnhandled） */}
              {ref.isUrgentUnhandled && (
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded animate-pulse">
                  急诊·超时
                </span>
              )}
              {/* CHG-32：紧急等级 I-IV */}
              {ref.urgencyLevel && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  ref.urgencyLevel === 1 ? 'bg-red-600 text-white border-red-700' :
                  ref.urgencyLevel === 2 ? 'bg-orange-500 text-white border-orange-600' :
                  ref.urgencyLevel === 3 ? 'bg-yellow-400 text-yellow-900 border-yellow-500' :
                  'bg-gray-200 text-gray-700 border-gray-300'
                }`}>
                  {'I级急危 II级急重 III级急症 IV级亚急'.split(' ')[ref.urgencyLevel - 1]}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>患者：{ref.patient.name} · {ref.patient.gender} · {ref.patient.age}岁</span>
              <span className="text-gray-300">|</span>
              <span>诊断：<span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{ref.diagnosis.code}</span> {ref.diagnosis.name}</span>
              {ref.referralNo && (
                <>
                  <span className="text-gray-300">|</span>
                  <span>转诊单号：<span className="font-mono" style={{ color: '#0892a0' }}>{ref.referralNo}</span></span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
              <span>{ref.fromInstitution} ({ref.fromDoctor})</span>
              <span>→</span>
              <span>{ref.toInstitution || '待选'} {ref.toDept ? `· ${ref.toDept}` : ''}</span>
              <span className="text-gray-300">|</span>
              <span>创建于 {formatTime(ref.createdAt)}</span>
            </div>
          </div>

          {/* 操作按钮区 */}
          <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
            {/* 县级医生：审核上转 */}
            {canAcceptUpward && (
              <button
                onClick={() => handleAction('acceptUpward')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ✓ 受理申请
              </button>
            )}
            {canRejectUpward && (
              <button
                onClick={() => handleAction('rejectUpward')}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors"
              >
                ✕ 不予受理
              </button>
            )}

            {/* 县级医生：完成接诊 */}
            {canCompleteUpward && (
              <button
                onClick={() => handleAction('completeUpward')}
                className="px-4 py-2 text-white rounded text-sm font-medium transition-colors"
              style={{ background: '#0BBECF' }}
              >
                ✓ 完成接诊确认
              </button>
            )}

            {/* 基层医生：撤销上转 */}
            {canCancelUpward && (
              <button
                onClick={() => handleAction('cancelUpward')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200 rounded-lg text-sm transition-colors"
              >
                撤销申请
              </button>
            )}

            {/* 基层医生：接收下转 */}
            {canAcceptDownward && (
              <button
                onClick={() => handleAction('acceptDownward')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ✓ 确认接收
              </button>
            )}
            {canRejectDownward && (
              <button
                onClick={() => handleAction('rejectDownward')}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm transition-colors"
              >
                ✕ 拒绝
              </button>
            )}

            {/* 基层医生：完成下转接收 */}
            {canCompleteDownward && (
              <button
                onClick={() => handleAction('completeDownward')}
                className="px-4 py-2 text-white rounded text-sm font-medium transition-colors"
              style={{ background: '#0BBECF' }}
              >
                ✓ 患者已到达，完成接收
              </button>
            )}

            {/* M-7：管理员填写接诊安排（IN_TRANSIT + 无 admissionArrangement 时显示） */}
            {adminCanArrange && (
              <button
                onClick={() => setShowArrangementModal(true)}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors"
                style={{ background: '#0BBECF' }}
              >
                🏥 填写接诊安排
              </button>
            )}

            {/* 修复 C：管理员催办按钮（原型模式：不做超时判断，直接显示） */}
            {adminCanUrgeUpwardReview && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleAction('adminUrge')}
                  className="px-4 py-2 border rounded-lg text-sm font-medium transition-colors"
                  style={{ borderColor: '#f59e0b', color: '#b45309', background: '#fffbeb' }}
                >
                  催办审核
                </button>
                <span className="text-xs text-gray-400 text-center">超时后可见</span>
              </div>
            )}
            {adminCanProxyCompleteUpward && (() => {
              const cooldownMins = urgedAt ? Math.floor((Date.now() - urgedAt) / 60000) : null
              const isCooling = cooldownMins !== null && cooldownMins < 60
              return (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => !isCooling && handleAction('adminUrgeConfirm')}
                    disabled={isCooling}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={isCooling
                      ? { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
                      : { background: '#f59e0b', color: '#fff' }}
                  >
                    {isCooling ? `已催办（${cooldownMins}分钟前）` : '催办接诊确认'}
                  </button>
                  <span className="text-xs text-gray-400 text-center">超时48h后可见</span>
                </div>
              )
            })()}
            {adminCanUrgeDownwardAccept && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleAction('adminUrge')}
                  className="px-4 py-2 border rounded-lg text-sm font-medium transition-colors"
                  style={{ borderColor: '#f59e0b', color: '#b45309', background: '#fffbeb' }}
                >
                  催办接收
                </button>
                <span className="text-xs text-gray-400 text-center">超时后可见</span>
              </div>
            )}

            {/* CHG-32：科主任院内审核按钮 */}
            {canApproveInternalReview && (
              <button
                onClick={() => handleAction('approveInternal')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ✓ 院内审核通过
              </button>
            )}
            {canRejectInternalReview && (
              <button
                onClick={() => handleAction('rejectInternal')}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors"
              >
                ✕ 院内审核拒绝
              </button>
            )}

            {/* 导出PDF（占位） */}
            <button className="px-4 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              📄 导出PDF
            </button>
          </div>
        </div>
      </div>

      {/* 状态泳道图 */}
      <div className="mb-4">
        <SwimlaneDiagram
          type={ref.type}
          status={ref.status}
          internalAuditEnabled={
            ref.type === 'upward' && (
              ref.status === '待内审' ||
              ((ref.internalAuditLog || []).length > 0)
            )
          }
        />
      </div>

      {/* 拒绝/撤销原因提示 */}
      {(ref.status === UPWARD_STATUS.REJECTED || ref.status === DOWNWARD_STATUS.REJECTED) && ref.rejectReason && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span className="text-lg flex-shrink-0">❌</span>
          <div>
            <span className="font-medium">拒绝原因：</span>
            {ref.rejectReason}
          </div>
        </div>
      )}

      {/* 修复 B：被拒绝后的后续操作面板 */}
      {(canRejectedFollowUpUpward || canRejectedFollowUpDownward) && (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 mb-3">
            申请已被拒绝，请选择后续处理方式：
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleAction('changeInstitution')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: '#0BBECF' }}
              onMouseOver={e => e.currentTarget.style.background = '#0892a0'}
              onMouseOut={e => e.currentTarget.style.background = '#0BBECF'}
            >
              换机构重新申请
            </button>
            <button
              onClick={() => handleAction('resubmit')}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors text-gray-700 hover:bg-gray-100"
              style={{ borderColor: '#d1d5db' }}
            >
              修改重提
            </button>
            <button
              onClick={() => handleAction('terminateRejected')}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
              onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              终止申请
            </button>
          </div>
        </div>
      )}
      {ref.status === UPWARD_STATUS.CANCELLED && ref.closeReason && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
          <span className="text-lg flex-shrink-0">ℹ️</span>
          <div><span className="font-medium">撤销原因：</span>{ref.closeReason}</div>
        </div>
      )}

      {/* 问题三修复：院内审核拒绝后操作面板（草稿 + 有内审拒绝记录） */}
      {canResubmitAfterInternalReject && (
        <div className="mb-4 border border-orange-200 bg-orange-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">📋</span>
            <div className="flex-1">
              <div className="font-medium text-orange-800 text-sm mb-1">院内审核未通过，申请已退回</div>
              <div className="text-xs text-orange-600 mb-3">
                请查看上方「院内审核记录」了解拒绝原因，修改后可重新提交至院内审核。
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction('resubmitInternalReject')}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ background: '#f97316' }}
                  onMouseOver={e => e.currentTarget.style.background = '#ea6c0a'}
                  onMouseOut={e => e.currentTarget.style.background = '#f97316'}
                >
                  ✏️ 修改并重新提交
                </button>
                <button
                  onClick={() => handleAction('cancelUpward') }
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  撤销申请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* G4：急诊知情同意补录提示条（A-13，consentDeferred=true 时显示） */}
      {ref.is_emergency && ref.consentDeferred && ref.status !== UPWARD_STATUS.COMPLETED && ref.status !== UPWARD_STATUS.CANCELLED && ref.status !== UPWARD_STATUS.CLOSED && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-800">
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <span className="font-medium">急诊知情同意待补录</span>
            <span className="ml-2 text-amber-600 text-xs">（需在接诊后24小时内完成，否则将告警管理员）</span>
          </div>
          {currentRole === ROLES.PRIMARY && (
            <button
              onClick={() => alert('原型占位：调用法大大/e签宝补录知情同意签署流程')}
              className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              立即补录
            </button>
          )}
        </div>
      )}

      {/* P1-03：转诊预约码展示（转诊中状态，有预约码时显示）*/}
      {ref.appointmentCode && isUpward && ref.status === UPWARD_STATUS.IN_TRANSIT && (
        <div className="mb-4 px-5 py-4 rounded-xl" style={{ background: '#f0fdfe', border: '1px solid #a5f3fc' }}>
          <div className="text-xs font-medium mb-2" style={{ color: '#0e7490' }}>转诊预约码</div>
          <div className="flex items-center gap-5">
            <span className="font-mono text-2xl font-bold tracking-widest" style={{ color: '#0BBECF' }}>{ref.appointmentCode}</span>
            <div className="text-xs leading-relaxed" style={{ color: '#0891b2' }}>
              <div>有效期至：{new Date(ref.appointmentCodeExpireAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div>凭此码到 <span className="font-medium">{ref.toDept}</span> 挂号窗口出示，优先排队就诊</div>
            </div>
          </div>
        </div>
      )}

      {/* CHG-30：到院安排卡（转诊中状态，管理员已填写时显示蓝色卡，未填写时显示灰色占位） */}
      {isUpward && ref.status === UPWARD_STATUS.IN_TRANSIT && (
        <div className="mb-4">
          {ref.admissionArrangement ? (
            <div className="px-5 py-4 rounded-xl" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-blue-800">🏥 到院接诊安排</span>
                <span className="text-xs text-blue-400">
                  由 {ref.admissionArrangement.arrangedBy} 安排 · {formatTime(ref.admissionArrangement.arrangedAt)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-500 text-xs">就诊时间</span>
                  <div className="font-medium text-blue-900">{formatTime(ref.admissionArrangement.visitTime)}</div>
                </div>
                <div>
                  <span className="text-blue-500 text-xs">接诊科室</span>
                  <div className="font-medium text-blue-900">{ref.admissionArrangement.department}</div>
                </div>
                <div>
                  <span className="text-blue-500 text-xs">楼层/区域</span>
                  <div className="font-medium text-blue-900">{ref.admissionArrangement.floor}</div>
                </div>
                {ref.admissionType !== 'inpatient' && (
                  <div>
                    <span className="text-blue-500 text-xs">诊室/床位</span>
                    <div className="font-medium text-blue-900">{ref.admissionArrangement.room || '—'}</div>
                  </div>
                )}
                <div>
                  <span className="text-blue-500 text-xs">科室电话</span>
                  <div className="font-medium text-blue-900">{ref.admissionArrangement.departmentPhone}</div>
                </div>
                {ref.admissionArrangement.doctorName && (
                  <div>
                    <span className="text-blue-500 text-xs">参考医生</span>
                    <div className="font-medium text-blue-900">
                      {ref.admissionArrangement.doctorName}
                      <span className="text-blue-400 text-xs ml-1">（仅供参考）</span>
                    </div>
                  </div>
                )}
              </div>

              {/* J-4：住院安排 */}
              {ref.admissionType === 'inpatient' && ref.admissionArrangement.ward && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-blue-800">🛏 住院安排</span>
                    {/* bedStatus 角标 */}
                    {ref.bedStatus === 'bed_reserved' && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#dcfce7', color: '#16a34a' }}>床位已预占</span>
                    )}
                    {ref.bedStatus === 'bed_used' && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#f3f4f6', color: '#6B7280' }}>已入院核销</span>
                    )}
                    {ref.bedStatus === 'bed_expired' && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#fff7ed', color: '#F97316' }}>已超时释放</span>
                    )}
                    {ref.bedStatus === 'bed_released' && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#f3f4f6', color: '#6B7280' }}>已释放</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-500 text-xs">病区</span>
                      <div className="font-medium text-blue-900">{ref.admissionArrangement.ward}</div>
                    </div>
                    <div>
                      <span className="text-blue-500 text-xs">床位号</span>
                      <div className="font-medium text-blue-900">{ref.admissionArrangement.bedNumber || '入院时由护士站安排'}</div>
                    </div>
                    <div>
                      <span className="text-blue-500 text-xs">护士站</span>
                      <div className="font-medium text-blue-900">{ref.admissionArrangement.nurseStationPhone || '—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {ref.admissionArrangement.appointmentCode && (
                <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-3">
                  <span className="text-blue-500 text-xs">取号码</span>
                  <span className="font-mono text-xl font-bold tracking-widest text-blue-700">
                    {ref.admissionArrangement.appointmentCode}
                  </span>
                  <span className="text-xs text-blue-400">
                    {ref.admissionType === 'inpatient' ? '持本取号码至护士站办理入院' : '到挂号窗口出示，优先取号'}
                  </span>
                </div>
              )}
              {/* 变更五：模拟短信预览入口（管理员视角） */}
              {currentRole === ROLES.ADMIN && (
                <div className="mt-3 pt-3 border-t border-blue-200 flex justify-end">
                  <button
                    onClick={() => setShowSmsPreview(true)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: '#bfdbfe', color: '#1d4ed8', background: '#dbeafe' }}
                  >
                    📱 预览患者通知短信
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 py-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">🏥</span>
                <span className="text-sm text-gray-500">到院接诊安排</span>
                <span className="ml-2 text-xs text-orange-500 font-medium">⏳ 管理员尚未安排就诊时间，请等待通知</span>
              </div>
              {currentRole === ROLES.ADMIN && (
                <div className="mt-2 text-xs text-blue-500">
                  → 请前往管理员工作台「待协调」Tab 安排到院信息
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* P0-5：就诊须知区块（转诊中状态） */}
      {isUpward && ref.status === UPWARD_STATUS.IN_TRANSIT && (
        <div className="mb-4 bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
          <div className="px-5 py-3 text-sm font-semibold text-gray-700" style={{ borderBottom: '1px solid #E0F6F9', background: '#f9fefe' }}>
            就诊须知
          </div>
          <div className="px-5 py-4 space-y-2.5 text-sm text-gray-700">
            <div className="flex gap-2">
              <span className="font-semibold text-gray-400 flex-shrink-0">①</span>
              <span>携带材料：身份证 + 医保卡 + 本转诊单（截图即可）+ 既往检查资料</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-gray-400 flex-shrink-0">②</span>
              <span>
                {ref.admissionType === 'inpatient'
                  ? <>到院后前往<span className="font-medium">住院部</span>办理入院手续，告知持有转诊单，出示预约码 <span className="font-mono font-bold" style={{ color: '#0BBECF' }}>{ref.appointmentCode || '—'}</span></>
                  : ref.admissionType === 'emergency'
                  ? <>请直接前往<span className="font-medium">急诊科</span>，出示预约码 <span className="font-mono font-bold" style={{ color: '#0BBECF' }}>{ref.appointmentCode || '—'}</span>，告知为转诊患者</>
                  : <>到院后前往<span className="font-medium">{ref.toDept}</span>挂号窗口，出示预约码 <span className="font-mono font-bold" style={{ color: '#0BBECF' }}>{ref.appointmentCode || '—'}</span>，优先排队就诊{!ref.appointmentCode && '（无预约码，正常挂号即可）'}</>
                }
              </span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-gray-400 flex-shrink-0">③</span>
              <span>到院后仍需正常挂号缴费，预约码用于优先排队，<span className="font-medium">不免除挂号及诊疗费用</span></span>
            </div>
            <div className="flex gap-2 px-3 py-2 rounded-lg" style={{ background: '#f0fdf4' }}>
              <span className="font-semibold text-gray-400 flex-shrink-0">④</span>
              <span className="text-green-700">持本转诊单就诊，按分级诊疗比例报销，<span className="font-medium">高于自行就诊比例</span>，请携带医保卡</span>
            </div>
            {ref.appointmentCode && (
              <div className="flex gap-2">
                <span className="font-semibold text-gray-400 flex-shrink-0">⑤</span>
                <span className="text-gray-500">预约码有效期至：{new Date(ref.appointmentCodeExpireAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* G6：诊疗结果回传（已完成上转，基层/县级/管理员均可见）*/}
      {ref.treatmentResult && isUpward && ref.status === UPWARD_STATUS.COMPLETED && (
        <div className="mb-4 bg-white rounded" style={{ border: '1px solid #DDF0F3', boxShadow: '0 1px 4px rgba(11,190,207,0.06)' }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E0F6F9' }}>
            <span className="text-sm font-semibold text-gray-700">诊疗结果</span>
            <span className="text-xs text-gray-400">由 {ref.treatmentResult.filledBy} 填写 · {formatDate(ref.treatmentResult.filledAt)}</span>
          </div>
          <div className="px-5 py-4 space-y-3 text-sm">
            <div>
              <span className="text-gray-500 mr-2">诊治摘要：</span>
              <span className="text-gray-800 leading-relaxed">{ref.treatmentResult.summary}</span>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-gray-500 pt-1 border-t border-gray-50">
              {ref.treatmentResult.dischargeDate && <span>出院日期：{formatDate(ref.treatmentResult.dischargeDate)}</span>}
              {ref.treatmentResult.nextFollowup && <span>复诊建议：{ref.treatmentResult.nextFollowup}</span>}
            </div>
          </div>
        </div>
      )}

      {/* CHG-32：待内审提示条（PENDING_INTERNAL_REVIEW 状态，提示申请者和科主任） */}
      {isUpward && ref.status === UPWARD_STATUS.PENDING_INTERNAL_REVIEW && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: '#faf5ff', border: '1px solid #d8b4fe' }}>
          <span className="text-lg flex-shrink-0">📋</span>
          <div className="flex-1">
            <span className="font-medium text-purple-800">院内审核中</span>
            <span className="ml-2 text-purple-600 text-xs">（F-02：普通上转须经科主任院内审核通过后方可推送县级医院）</span>
            {currentRole === ROLES.PRIMARY_HEAD && (
              <div className="mt-1 text-purple-700">请审核此上转申请的必要性与规范性，通过后将自动推送至县级医生</div>
            )}
            {currentRole === ROLES.PRIMARY && (
              <div className="mt-1 text-purple-600">您的申请正等待科主任审核，审核通过后将进入正式审核流程</div>
            )}
          </div>
        </div>
      )}

      {/* CHG-32：下转受理锁定提示（下转待接收，已被他人受理时显示） */}
      {isDownward && ref.status === DOWNWARD_STATUS.PENDING && ref.downwardAssignedDoctorId && ref.downwardAssignedDoctorId !== currentUser?.id && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <span>🔒</span>
          <span>该下转申请已由 <span className="font-medium">{ref.downwardAssignedDoctorName}</span> 受理，您无法重复受理</span>
        </div>
      )}

      {/* CHG-32：下转受理已锁定（当前用户自己受理时显示确认提示） */}
      {isDownward && ref.status === DOWNWARD_STATUS.PENDING && ref.downwardAssignedDoctorId === currentUser?.id && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          <span>✅</span>
          <span>您已受理该下转申请，其他医生无法重复受理。请等待患者到院后点击「患者已到达，完成接收」</span>
        </div>
      )}

      {/* Tab 内容区 */}
      <div className="bg-white rounded" style={{ border: '1px solid #DDF0F3', boxShadow: '0 1px 4px rgba(11,190,207,0.06)' }}>
        {/* Tab 切换 */}
        <div className="flex" style={{ borderBottom: '1px solid #E0F6F9' }}>
          {[
            { key: 'detail', label: '申请详情' },
            { key: 'medical', label: '病历随诊' },
            isDownward && ref.rehabPlan ? { key: 'rehab', label: '康复方案' } : null,
            { key: 'logs', label: `操作日志 (${ref.logs?.length || 0})` },
            { key: 'history', label: '患者历史转诊' },
          ].filter(Boolean).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
              style={activeTab === tab.key
                ? { borderBottomColor: '#0BBECF', color: '#0BBECF' }
                : { borderBottomColor: 'transparent', color: '#6b7280' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* 申请详情 Tab */}
          {activeTab === 'detail' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">患者基本信息</h3>
                <div className="grid grid-cols-3 gap-4 rounded p-4" style={{ background: '#F5FCFD', border: '1px solid #DDF0F3' }}>
                  {[
                    ['姓名', ref.patient.name],
                    ['性别', ref.patient.gender],
                    ['年龄', `${ref.patient.age}岁`],
                    ['身份证号', ref.patient.idCard],
                    ['联系电话', ref.patient.phone],
                    ['地址', ref.patient.address || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="text-xs text-gray-400">{k}</div>
                      <div className="text-sm text-gray-800 font-medium mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                  {isUpward ? '上转信息' : '下转信息'}
                </h3>
                <div className="space-y-3">
                  <div className="rounded p-4" style={{ background: '#F5FCFD', border: '1px solid #DDF0F3' }}>
                    <div className="text-xs text-gray-400 mb-1">诊断（ICD-10）</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm px-2 py-0.5 rounded" style={{ color: '#0892a0', background: '#E0F6F9' }}>{ref.diagnosis.code}</span>
                      <span className="text-sm font-medium text-gray-800">{ref.diagnosis.name}</span>
                    </div>
                  </div>
                  <div className="rounded p-4" style={{ background: '#F5FCFD', border: '1px solid #DDF0F3' }}>
                    <div className="text-xs text-gray-400 mb-1">主诉与现病史</div>
                    <div className="text-sm text-gray-700 leading-relaxed">{ref.chiefComplaint}</div>
                  </div>
                  <div className="rounded p-4" style={{ background: '#F5FCFD', border: '1px solid #DDF0F3' }}>
                    <div className="text-xs text-gray-400 mb-1">{isUpward ? '转诊原因' : '下转原因'}</div>
                    <div className="text-sm text-gray-700">{ref.reason}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">转诊机构信息</h3>
                <div className="grid grid-cols-2 gap-4 rounded p-4" style={{ background: '#F5FCFD', border: '1px solid #DDF0F3' }}>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">转出机构</div>
                    <div className="text-sm font-medium">{ref.fromInstitution}</div>
                    <div className="text-xs text-gray-500 mt-0.5">经治医生：{ref.fromDoctor}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">接收机构</div>
                    <div className="text-sm font-medium">{ref.toInstitution || '待确认'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      科室：{ref.toDept || '—'}
                      {ref.toDoctor && ` · 接诊医生：${ref.toDoctor}`}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">知情同意</h3>
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${ref.consentSigned
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-orange-50 border border-orange-200 text-orange-700'
                  }`}>
                  <span>{ref.consentSigned ? '✅' : '⏳'}</span>
                  <span>
                    {ref.consentSigned
                      ? `签署完成 · 时间：${formatTime(ref.consentTime)} · 电子存档已生成`
                      : '待签署'
                    }
                  </span>
                </div>
              </div>

              {isDownward && ref.stayDays !== undefined && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">住院天数参考</h3>
                  <div className="flex items-center gap-4 px-4 py-3 rounded" style={{ background: '#E0F6F9', border: '1px solid #C8EEF3' }}>
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: '#0892a0' }}>{ref.stayDays}</div>
                      <div className="text-xs" style={{ color: '#0BBECF' }}>本次住院天数</div>
                    </div>
                    <div style={{ color: '#a4edf5' }}>vs</div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{ref.avgStayDays}</div>
                      <div className="text-xs text-gray-400">同类病种平均</div>
                    </div>
                    <div className="text-xs bg-white px-3 py-2 rounded" style={{ color: '#0892a0', border: '1px solid #C8EEF3' }}>
                      ℹ️ 仅供参考，不强制
                    </div>
                  </div>
                </div>
              )}

              {/* CHG-31-D：关联随访任务（下转且有 followUpTaskId 时显示） */}
              {ref.type === 'downward' && ref.followUpTaskId && (() => {
                const task = (MOCK_FOLLOW_UP_TASKS || []).find(t => t.id === ref.followUpTaskId)
                const isMyTask = task?.assignedDoctorId === currentUser?.id
                return (
                  <div className="border border-teal-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2.5 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-teal-700">关联随访任务</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-600">
                          {task?.status === 'active' ? '随访中' : task?.status === 'transferred' ? '已转移' : task?.status || '—'}
                        </span>
                      </div>
                      <span className="text-xs text-teal-400">{ref.followUpTaskId}</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                        <div>
                          <span className="text-gray-500">负责医生：</span>
                          <span className={`font-medium ${isMyTask ? 'text-teal-700' : 'text-gray-800'}`}>
                            {task?.assignedDoctorName || '—'}
                            {isMyTask && <span className="ml-1 text-xs text-teal-500">（本人）</span>}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">建议首诊日期：</span>
                          <span className="text-gray-800">
                            {task?.suggestedFirstVisitDate ? formatDate(task.suggestedFirstVisitDate) : (ref.suggestedFirstVisitDate ? formatDate(ref.suggestedFirstVisitDate) : '—')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">随访机构：</span>
                          <span className="text-gray-800">{task?.institutionName || ref.toInstitution || '—'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">随访次数：</span>
                          <span className="text-gray-800">{task?.visitCount ?? 0} 次</span>
                        </div>
                      </div>
                      {task?.indicators && task.indicators.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {task.indicators.map(ind => (
                            <span key={ind} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {ind}
                            </span>
                          ))}
                        </div>
                      )}
                      {isMyTask && (
                        <div className="pt-1 border-t border-gray-100 mt-1">
                          <button
                            onClick={() => alert(`TODO: 转移随访任务 ${ref.followUpTaskId}（选择新负责医生）`)}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                          >
                            转移随访任务 →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* 病历随诊 Tab */}
          {activeTab === 'medical' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded text-sm" style={{ background: '#E0F6F9', border: '1px solid #C8EEF3', color: '#0892a0' }}>
                <span>🔗</span>
                <span>数据来源：院内集成平台健康档案全息视图 API（自动拉取）</span>
              </div>

              {/* 检验报告 */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700 flex items-center gap-2">
                  <span>🧪</span> 检验报告
                </div>
                <div className="divide-y divide-gray-50">
                  {[
                    { name: '血压', value: '180/110 mmHg', range: '90-140/60-90', abnormal: true },
                    { name: '空腹血糖', value: '6.2 mmol/L', range: '3.9-6.1', abnormal: false },
                    { name: '总胆固醇', value: '6.8 mmol/L', range: '<5.2', abnormal: true },
                    { name: '血红蛋白', value: '132 g/L', range: '120-160', abnormal: false },
                    { name: '血肌酐', value: '88 μmol/L', range: '44-133', abnormal: false },
                  ].map((item, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-24 flex-shrink-0">{item.name}</span>
                      <span className={`text-sm font-semibold w-28 ${item.abnormal ? 'text-red-600' : 'text-gray-800'}`}>
                        {item.value}
                        {item.abnormal && <span className="ml-1 text-xs bg-red-100 text-red-600 px-1 rounded">↑异常</span>}
                      </span>
                      <span className="text-xs text-gray-400">参考范围：{item.range}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 影像报告 */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700 flex items-center gap-2">
                  <span>🫁</span> 影像报告（文字结论）
                </div>
                <div className="px-4 py-3 text-sm text-gray-700 leading-relaxed">
                  <div className="font-medium text-gray-500 text-xs mb-1">胸部X光</div>
                  双肺纹理增多，心脏形态大小正常，双侧肋膈角清晰，未见明显实质性浸润影。
                  <div className="mt-2 text-xs text-gray-400">注：DICOM原始影像不传输，仅显示文字报告结论</div>
                </div>
              </div>

              {/* 门诊病历 */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700 flex items-center gap-2">
                  <span>📋</span> 近期门诊病历
                </div>
                <div className="px-4 py-3 text-sm text-gray-700 leading-relaxed">
                  <div className="text-xs text-gray-400 mb-1">2026-03-10 · 拱星镇卫生院 · 王医生</div>
                  主诉：反复头痛、头晕3天。测血压180/110 mmHg。予以氨氯地平5mg、缬沙坦80mg口服，血压控制欠佳，建议上级医院进一步诊治。
                </div>
              </div>

              {/* 附件上传区 */}
              <div className="border border-dashed border-gray-300 rounded-xl px-4 py-5 text-center">
                <div className="text-gray-400 text-sm">
                  <div className="text-2xl mb-1">📎</div>
                  <div>手动上传附件（PDF/JPG，最大20MB）</div>
                  <button className="mt-2 hover:underline text-xs" style={{ color: '#0BBECF' }}>点击上传</button>
                </div>
              </div>
            </div>
          )}

          {/* 康复方案 Tab */}
          {activeTab === 'rehab' && ref.rehabPlan && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-lg text-sm text-green-600">
                <span>📋</span>
                <span>康复方案由县级医生填写，用药医嘱从出院处方自动带入</span>
              </div>

              {/* 用药医嘱 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  💊 用药医嘱
                </h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-3 text-xs text-gray-400 px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <span>药品名称</span><span>规格</span><span>用法用量</span>
                  </div>
                  {ref.rehabPlan.medications.map((med, i) => (
                    <div key={i} className="grid grid-cols-3 px-4 py-2.5 text-sm border-b border-gray-50 last:border-0">
                      <span className="font-medium text-gray-800">{med.name}</span>
                      <span className="text-gray-600">{med.spec}</span>
                      <span className="text-gray-600">{med.usage}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 注意事项 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">📝 注意事项</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-gray-700 leading-relaxed">
                  {ref.rehabPlan.notes}
                </div>
              </div>

              {/* 随访时间 + 观察指标 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">📅 首次随访时间</h3>
                  <div className="px-4 py-3 rounded text-base font-semibold" style={{ background: '#E0F6F9', border: '1px solid #C8EEF3', color: '#0892a0' }}>
                    {formatDate(ref.rehabPlan.followupDate)}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">🔍 需观察指标</h3>
                  <div className="flex flex-wrap gap-2">
                    {ref.rehabPlan.indicators.map((ind, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">{ind}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 操作日志 Tab */}
          {activeTab === 'logs' && (
            <div>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-0">
                  {(ref.logs || []).map((log, i) => (
                    <div key={i} className="flex gap-4 pb-5 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold z-10 flex-shrink-0 ${log.actor === '系统' ? 'bg-gray-200 text-gray-500' :
                        log.actor.includes('医生') || log.actor.includes('管理员') ? 'bg-blue-100 text-blue-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                        {log.actor === '系统' ? '⚙' : log.actor.charAt(0)}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-medium text-gray-800 text-sm">{log.actor}</span>
                          <span className="text-gray-600 text-sm">{log.action}</span>
                          {log.note && (
                            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{log.note}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{formatTime(log.time)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CHG-30-D：院内审核记录（有记录时显示可折叠时间线，兼容新旧字段格式） */}
              {(ref.internalAuditLog || []).length > 0 && (
                <div className="mt-4 border border-purple-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowAuditHistory(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-purple-700">院内审核记录</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">
                        {ref.internalAuditLog.length} 条
                      </span>
                    </div>
                    <span className="text-purple-400 text-xs">{showAuditHistory ? '收起 ▲' : '展开 ▼'}</span>
                  </button>
                  {showAuditHistory && (
                    <div className="px-4 py-3 space-y-3">
                      {[...ref.internalAuditLog].reverse().map((entry, i) => {
                        // 兼容旧格式 (entry.result) 和新格式 (entry.action)
                        const isPassed = entry.result === 'approved' || entry.action === 'INTERNAL_AUDIT_PASS'
                        const auditorName = entry.auditorName || entry.actor || '—'
                        const timestamp = entry.timestamp || entry.time
                        return (
                          <div key={i} className="flex items-start gap-3">
                            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${isPassed ? 'bg-green-500' : 'bg-red-400'}`}>
                                {isPassed
                                  ? <svg width="8" height="6" viewBox="0 0 8 6"><polyline points="1,3 3,5 7,1" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  : <svg width="8" height="8" viewBox="0 0 8 8"><line x1="1" y1="1" x2="7" y2="7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/><line x1="7" y1="1" x2="1" y2="7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                }
                              </div>
                              {i < ref.internalAuditLog.length - 1 && (
                                <div className="w-px flex-1 bg-gray-200 mt-1" style={{ minHeight: 16 }} />
                              )}
                            </div>
                            <div className="flex-1 pb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isPassed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                  {isPassed ? '通过' : '拒绝'}
                                </span>
                                <span className="text-sm font-medium text-gray-800">{auditorName}</span>
                                <span className="text-xs text-gray-400">{formatTime(timestamp)}</span>
                              </div>
                              {entry.comment && (
                                <div className="mt-1 text-xs text-gray-600 bg-gray-50 px-2 py-1.5 rounded border border-gray-100">
                                  {entry.comment}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* S-02：知情同意签署记录（折叠块，置于操作日志下方） */}
              <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowConsentRecord(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700"
                >
                  <span>知情同意签署记录</span>
                  <span className="text-gray-400 text-xs">{showConsentRecord ? '收起 ▲' : '展开 ▼'}</span>
                </button>
                {showConsentRecord && (
                  <div className="px-4 py-3">
                    {/* Assumption: 知情同意记录从 ref.consentRecord 字段获取；mockData 中暂无此字段，使用占位演示数据 */}
                    {ref.consentRecord ? (
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-600">签署人：</span>
                          <span className="font-medium text-gray-900">{ref.consentRecord.signerName}</span>
                          <span className="text-gray-400 mx-2">|</span>
                          <span className="text-gray-600">签署时间：</span>
                          <span className="text-gray-900">{ref.consentRecord.signedAt}</span>
                        </div>
                        <button
                          onClick={() => alert('TODO: 打开知情同意书 PDF 查看（第三方签署平台链接或本系统存储）')}
                          className="text-sm hover:underline"
                          style={{ color: '#0BBECF' }}
                        >
                          查看签署原件 →
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-600">签署人：</span>
                          <span className="font-medium text-gray-800">{ref.patient?.name ?? '患者本人'}</span>
                          <span className="text-gray-400 mx-2">|</span>
                          <span className="text-gray-600">签署时间：</span>
                          <span className="text-gray-800">
                            {ref.consentTime ? new Date(ref.consentTime).toLocaleString('zh-CN') : (ref.createdAt ? new Date(ref.createdAt).toLocaleString('zh-CN') : '—')}
                          </span>
                          <span className="ml-2 text-xs text-orange-500">（演示占位数据）</span>
                        </div>
                        <button
                          onClick={() => alert('TODO: 接入知情同意 PDF 查看链接')}
                          className="text-sm hover:underline"
                          style={{ color: '#0BBECF' }}
                        >
                          查看签署原件 →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* S-03：患者历史转诊 Tab */}
          {activeTab === 'history' && (
            <div className="p-4">
              <p className="text-xs text-gray-400 mb-3">
                以下为患者 <span className="font-medium text-gray-700">{ref.patient?.name}</span> 的历史转诊记录（含本次）
              </p>
              {(() => {
                // Assumption: 通过 patient.name 匹配同一患者（生产环境应使用 patient.id）
                const patientRefs = referrals
                  .filter(r => r.patient?.name === ref.patient?.name)
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

                if (patientRefs.length === 0) {
                  return <p className="text-sm text-gray-400 text-center py-8">暂无历史转诊记录</p>
                }

                return (
                  <div className="space-y-2">
                    {patientRefs.map(r => (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                          r.id === ref.id ? 'border-[#0BBECF] bg-cyan-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs w-8 flex-shrink-0">
                            {r.id === ref.id ? '📍 本次' : ''}
                          </span>
                          <span className="font-medium text-gray-800">
                            {r.type === 'upward' ? '⬆️ 上转' : '⬇️ 下转'}
                          </span>
                          <span className="text-gray-500">{r.diagnosis?.name || '—'}</span>
                          <span className="text-xs text-gray-400">{r.fromInstitution}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('zh-CN') : '—'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            r.status === '已完成' ? 'bg-green-100 text-green-700' :
                            r.status === '已拒绝' ? 'bg-gray-100 text-gray-500' :
                            r.status === '已撤销' ? 'bg-gray-100 text-gray-500' :
                            r.status === '转诊中' ? 'bg-blue-50 text-blue-700' :
                            r.status === '待审核' ? 'bg-orange-50 text-orange-600' :
                            r.status === '待接收' ? 'bg-orange-50 text-orange-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>{r.status}</span>
                          {r.id !== ref.id && (
                            <button
                              onClick={() => navigate(`/referral/${r.id}`)}
                              className="text-xs font-medium hover:underline"
                              style={{ color: '#0BBECF' }}
                            >
                              查看
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* P0-3 接收转诊——承接方式选择弹窗 */}
      {dialog?.type === 'acceptUpward' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDialog(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-96 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-lg">受理转诊申请</h3>
              <p className="text-sm text-gray-500 mt-1">请选择患者承接方式（受理后不可更改）</p>
            </div>
            {ref.internalNote?.includes('号源已满') && (
              <div className="mx-6 mt-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                ⚠️ 注意：该患者提交时号源已满，请在备注中说明就诊安排
              </div>
            )}
            <div className="p-6">
              <div className="space-y-2 mb-6">
                {[
                  { value: 'outpatient', label: '门诊就诊', desc: '患者持预约码到门诊挂号就诊' },
                  { value: 'inpatient',  label: '住院收治', desc: '患者直接前往住院部办理入院' },
                  { value: 'emergency',  label: '急诊处置', desc: '患者直接前往急诊科，告知转诊' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                    style={admissionType === opt.value ? { borderColor: '#0BBECF', background: '#F0FBFC' } : { borderColor: '#e5e7eb' }}
                  >
                    <input type="radio" name="admissionType" value={opt.value}
                      checked={admissionType === opt.value}
                      onChange={() => setAdmissionType(opt.value)}
                      className="mt-0.5 accent-[#0BBECF]"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDialog(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">取消</button>
                <button
                  onClick={() => handleAction('acceptUpwardConfirm')}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: '#10b981' }}
                >
                  ✓ 确认受理
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      {dialog?.type === 'rejectUpward' && (
        <ConfirmDialog
          title="拒绝转诊申请"
          description="请填写拒绝原因，系统将通知基层医生"
          inputLabel="拒绝原因（必填）"
          inputRequired={true}
          confirmText="确认拒绝"
          confirmColor="red"
          onConfirm={(reason) => { setDialog({ type: 'rejectUpward', reason }); handleAction('rejectUpwardConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'cancelUpward' && (
        <ConfirmDialog
          title="撤销上转申请"
          description="申请将变更为已撤销状态，县级医生将收到通知"
          inputLabel="撤销原因（必填）"
          inputRequired={true}
          confirmText="确认撤销"
          confirmColor="red"
          onConfirm={(reason) => { setDialog({ type: 'cancelUpward', reason }); handleAction('cancelUpwardConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'completeUpward' && (
        <ConfirmDialog
          title="完成接诊确认"
          description="确认患者已到院，将触发状态更新和数据上报"
          inputRequired={false}
          confirmText="确认完成接诊"
          confirmColor="green"
          onConfirm={() => handleAction('completeUpwardConfirm')}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'completeDownward' && (
        <ConfirmDialog
          title="完成下转接收确认"
          description="确认患者已到达基层机构，系统将自动创建随访任务"
          inputRequired={false}
          confirmText="确认患者已到达"
          confirmColor="green"
          onConfirm={() => handleAction('completeDownwardConfirm')}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'rejectDownward' && (
        <ConfirmDialog
          title="拒绝接收下转"
          description="请填写拒绝原因，县级医生可换机构重新发起"
          inputLabel="拒绝原因（必填）"
          inputRequired={true}
          confirmText="确认拒绝"
          confirmColor="red"
          onConfirm={(reason) => { setDialog({ type: 'rejectDownward', reason }); handleAction('rejectDownwardConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* 修复 B：换机构重新申请确认框 */}
      {dialog?.type === 'changeInstitution' && (
        <ConfirmDialog
          title="换机构重新申请"
          description="将基于当前申请信息创建新转诊单，接收机构需重新选择。原申请单将保持已拒绝状态。"
          inputRequired={false}
          confirmText="确认创建新申请"
          confirmColor="blue"
          onConfirm={() => handleAction('changeInstitutionConfirm')}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* 修复 B：修改重提确认框 */}
      {dialog?.type === 'resubmit' && (
        <ConfirmDialog
          title="修改重提"
          description="将在原申请基础上修改后重新提交审核，原申请单将保持已拒绝状态。"
          inputRequired={false}
          confirmText="确认修改重提"
          confirmColor="blue"
          onConfirm={() => handleAction('resubmitConfirm')}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* 修复 B：终止申请确认框（需填写原因） */}
      {dialog?.type === 'terminateRejected' && (
        <ConfirmDialog
          title="终止申请"
          description="申请将变更为已关闭状态，本次转诊流程结束。"
          inputLabel="终止原因（必填）"
          inputRequired={true}
          confirmText="确认终止"
          confirmColor="red"
          onConfirm={(reason) => { setDialog({ type: 'terminateRejected', reason }); handleAction('terminateRejectedConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* P1-3：管理员催办接诊确认（无需弹窗，直接记录日志） */}

      {/* CHG-32：院内审核通过确认框 */}
      {dialog?.type === 'approveInternal' && (
        <ConfirmDialog
          title="院内审核通过"
          description="通过后申请将进入「待审核」状态，系统将通知县级医生"
          inputLabel="审核意见（可选）"
          inputRequired={false}
          confirmText="确认通过"
          confirmColor="green"
          onConfirm={(comment) => { setDialog({ type: 'approveInternal', comment }); handleAction('approveInternalConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* CHG-32：院内审核拒绝确认框 */}
      {dialog?.type === 'rejectInternal' && (
        <ConfirmDialog
          title="院内审核拒绝"
          description="申请将退回草稿，基层医生可在原单修改后重新提交"
          inputLabel="拒绝原因（必填）"
          inputRequired={true}
          confirmText="确认拒绝"
          confirmColor="red"
          onConfirm={(reason) => { setDialog({ type: 'rejectInternal', reason }); handleAction('rejectInternalConfirm') }}
          onCancel={() => setDialog(null)}
        />
      )}

      {/* 变更五：模拟患者通知短信预览弹窗 */}
      {showSmsPreview && (() => {
        const arr = ref.admissionArrangement || {}
        const isInpatient = ref.admissionType === 'inpatient'
        const bedFull = ref.bedStatus === 'not_applicable' && isInpatient
        let smsBody = ''
        if (!isInpatient) {
          smsBody = `您的转诊已确认
就诊科室：${arr.department || '—'}（${arr.floor || ''}${arr.room || ''}）
接诊医生：${arr.doctorName || '科室安排'}
就诊时间：${arr.visitTime ? new Date(arr.visitTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
联系电话：${arr.departmentPhone || '—'}
预约码：${arr.appointmentCode || '—'}
凭本短信优先就诊`
        } else if (ref.bedStatus === 'bed_reserved') {
          smsBody = `您的转诊已确认
就诊科室：${arr.department || '—'}
就诊时间：${arr.visitTime ? new Date(arr.visitTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
预约码：${arr.appointmentCode || '—'}
━━━━━━━━━━━
住院安排：
病区：${arr.ward || '—'}
床位：${arr.bedNumber || '入院时由护士站安排'}
护士站电话：${arr.nurseStationPhone || '—'}
请持本短信至护士站办理入院`
        } else {
          // bedFull / not_applicable（住院但床位未锁定）
          smsBody = `您的转诊已确认
就诊科室：${arr.department || '—'}
就诊时间：${arr.visitTime ? new Date(arr.visitTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
预约码：${arr.appointmentCode || '—'}
━━━━━━━━━━━
住院安排：床位正在协调中，
请至${arr.ward || '护士站'}联系：${arr.nurseStationPhone || arr.departmentPhone || '—'}`
        }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowSmsPreview(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl w-[380px]">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-800">📱 患者通知短信预览</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {isInpatient ? (ref.bedStatus === 'bed_reserved' ? '住院转诊·已预占床位' : '住院转诊·床位协调中') : '门诊转诊'}
                  </div>
                </div>
                <button onClick={() => setShowSmsPreview(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              <div className="p-5">
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono whitespace-pre-line text-gray-700 leading-relaxed">
                  {smsBody}
                </div>
                <p className="text-xs text-gray-400 mt-3">以上为原型模拟预览，实际短信由系统推送平台发送</p>
              </div>
              <div className="px-5 pb-4 flex justify-end">
                <button
                  onClick={() => setShowSmsPreview(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >关闭</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* M-7：管理员填写接诊安排 Modal */}
      {showArrangementModal && (() => {
        const inst = INSTITUTIONS.find(i => i.name === ref.toInstitution)
        const deptBedInfo = inst?.departmentInfo?.[ref.toDept]
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
        const bedOccupied = deptBedInfo?.dailyReservedBeds > 0
          ? referrals.filter(r =>
              r.toDept === ref.toDept &&
              r.bedStatus === 'bed_reserved' &&
              r.admissionArrangement?.bedReservedAt &&
              new Date(r.admissionArrangement.bedReservedAt) >= todayStart
            ).length
          : 0
        return (
          <ArrangementModal
            referral={ref}
            admissionType={ref.admissionType}
            deptBedInfo={deptBedInfo}
            bedOccupied={bedOccupied}
            onClose={() => setShowArrangementModal(false)}
            onSubmit={(form) => {
              fillAdmissionArrangement(id, form)
              setShowArrangementModal(false)
              alert(`✅ 接诊安排已提交，预约取号码已发送至基层医生`)
            }}
          />
        )
      })()}
    </div>
  )
}

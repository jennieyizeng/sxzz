// 转诊状态泳道图 — 优化版
// 横向时间轴，纵向按角色分泳道，当前节点高亮

// CHG-30-A：上转步骤根据院内审核是否启用动态生成
function upwardSteps(internalAuditEnabled) {
  return [
    { id: 'draft',    label: '填写申请',   lane: 'primary', statuses: ['草稿'] },
    { id: 'submit',   label: '提交申请',   lane: 'primary', statuses: [] },
    ...(internalAuditEnabled ? [
      { id: 'internal', label: '院内审核', lane: 'primary', statuses: ['待内审'] },
    ] : []),
    { id: 'notify',   label: '待受理',     lane: 'system',  statuses: ['待审核'] },
    { id: 'transit',  label: '患者前往',   lane: 'patient', statuses: ['转诊中'] },
    { id: 'confirm',  label: '接诊确认',   lane: 'system',  statuses: ['已完成'] },
    { id: 'complete', label: '上报数据',   lane: 'system',  statuses: ['已完成'] },
  ]
}

function emergencyUpwardSteps() {
  return [
    { id: 'draft', label: '填写申请', lane: 'primary', statuses: ['草稿'] },
    { id: 'supplement', label: '待补录', lane: 'system', statuses: ['转诊中'] },
    { id: 'prepared', label: '已补录', lane: 'patient', statuses: ['转诊中'] },
    { id: 'complete', label: '已完成', lane: 'system', statuses: ['已完成'] },
  ]
}

const DOWNWARD_STEPS = [
  { id: 'initiate', label: '发起下转',        lane: 'county',  statuses: ['待接收'] },
  { id: 'notify',   label: '系统通知',        lane: 'system',  statuses: [] },
  { id: 'transit',  label: '患者前往',        lane: 'patient', statuses: ['转诊中'] },
  { id: 'confirm',  label: '接收确认',        lane: 'primary', statuses: ['已完成'] },
  { id: 'followup', label: '创建随访',        lane: 'system',  statuses: ['已完成'] },
]

const LANES = {
  primary: { label: '基层医生', icon: '🏥', accent: '#10b981', bg: '#f6fffe', border: '#10b981', labelBg: '#ecfdf5', labelColor: '#065f46' },
  county:  { label: '县级医生', icon: '🏨', accent: '#0BBECF', bg: '#f0fbfc', border: '#0BBECF', labelBg: '#E0F6F9', labelColor: '#0892a0' },
  patient: { label: '患者',     icon: '👤', accent: '#f59e0b', bg: '#fffcf0', border: '#f59e0b', labelBg: '#fef3c7', labelColor: '#92400e' },
  system:  { label: '系统',     icon: '⚙️', accent: '#8b5cf6', bg: '#faf8ff', border: '#8b5cf6', labelBg: '#ede9fe', labelColor: '#5b21b6' },
}

function getStepState(step, currentStatus, steps, options = {}) {
  if (options.isEmergencyUpward) {
    const currentStepId = (() => {
      if (currentStatus === '草稿') return 'draft'
      if (currentStatus === '已完成') return 'complete'
      return options.hasEmergencyAdmissionArrangement ? 'prepared' : 'supplement'
    })()
    const currentIndex = steps.findIndex(s => s.id === currentStepId)
    const stepIndex = steps.indexOf(step)

    if (['已撤销', '已拒绝', '已关闭'].includes(currentStatus)) {
      if (stepIndex < currentIndex) return 'done'
      if (stepIndex === currentIndex) return 'terminal'
      return 'future'
    }
    if (stepIndex < currentIndex) return 'done'
    if (stepIndex === currentIndex) return 'active'
    return 'future'
  }

  const currentIndex = steps.findLastIndex(s => s.statuses.includes(currentStatus))
  const stepIndex = steps.indexOf(step)

  if (['已撤销', '已拒绝', '已关闭'].includes(currentStatus)) {
    if (stepIndex < currentIndex) return 'done'
    if (stepIndex === currentIndex) return 'terminal'
    return 'future'
  }
  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'active'
  return 'future'
}

function StepNode({ step, state, index, lane }) {
  const accent = LANES[lane]?.accent || '#0BBECF'

  const nodeStyle = (() => {
    switch (state) {
      case 'done':     return { background: '#10b981', border: '2px solid #10b981', color: '#fff', boxShadow: '0 1px 4px rgba(16,185,129,0.35)' }
      case 'active':   return { background: accent,    border: `2px solid ${accent}`, color: '#fff', boxShadow: `0 0 0 4px ${accent}28, 0 2px 8px ${accent}40` }
      case 'terminal': return { background: '#ef4444', border: '2px solid #ef4444', color: '#fff', boxShadow: '0 1px 4px rgba(239,68,68,0.35)' }
      default:         return { background: '#fff',    border: '2px solid #e5e7eb', color: '#d1d5db', boxShadow: 'none' }
    }
  })()

  const labelStyle = (() => {
    switch (state) {
      case 'done':     return { color: '#374151', fontWeight: '500' }
      case 'active':   return { color: accent, fontWeight: '700' }
      case 'terminal': return { color: '#b91c1c', fontWeight: '600' }
      default:         return { color: '#c4cdd6' }
    }
  })()

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ width: 52 }}>
      {/* 步骤序号 */}
      <div className="text-xs font-mono" style={{ color: state === 'future' ? '#d1d5db' : '#9ca3af', lineHeight: 1, marginBottom: 2 }}>
        {index + 1}
      </div>
      {/* 圆形节点 */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-300"
        style={nodeStyle}
      >
        {state === 'done'     && <svg width="14" height="11" viewBox="0 0 14 11"><polyline points="1,6 5,10 13,1" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        {state === 'terminal' && <svg width="12" height="12" viewBox="0 0 12 12"><line x1="1" y1="1" x2="11" y2="11" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><line x1="11" y1="1" x2="1" y2="11" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>}
        {state === 'active'   && <div className="w-2.5 h-2.5 rounded-full bg-white opacity-95" />}
        {state === 'future'   && <div className="w-2 h-2 rounded-full" style={{ background: '#e5e7eb' }} />}
      </div>
      {/* 步骤标签 */}
      <div className="text-center leading-tight mt-0.5" style={{ ...labelStyle, fontSize: 11, maxWidth: 56 }}>
        {step.label}
      </div>
    </div>
  )
}

export default function SwimlaneDiagram({
  type = 'upward',
  status,
  internalAuditEnabled = false,
  isEmergency = false,
  hasEmergencyAdmissionArrangement = false,
}) {
  const isEmergencyUpward = type === 'upward' && isEmergency
  const steps = type === 'upward'
    ? (isEmergencyUpward ? emergencyUpwardSteps() : upwardSteps(internalAuditEnabled))
    : DOWNWARD_STEPS
  const laneKeys = Object.keys(LANES).filter(k => steps.some(s => s.lane === k))
  const displayStatus = isEmergencyUpward && status === '转诊中'
    ? (hasEmergencyAdmissionArrangement ? '已补录' : '待补录')
    : status

  // 计算进度
  const doneCount = steps.filter(s => getStepState(s, status, steps, { isEmergencyUpward, hasEmergencyAdmissionArrangement }) === 'done').length
  const totalCount = steps.length
  const isTerminal = ['已撤销', '已拒绝', '已关闭'].includes(status)
  const isDone = status === '已完成'

  return (
    <div className="overflow-hidden bg-white" style={{ border: '1px solid #E2F0F3', borderRadius: 12, boxShadow: '0 2px 12px rgba(11,190,207,0.07)' }}>

      {/* 标题栏 */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: 'linear-gradient(135deg, #E8F8FA 0%, #F0FBFC 100%)', borderBottom: '1px solid #D5ECF0' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full" style={{ background: '#0BBECF' }} />
          <span className="text-sm font-semibold" style={{ color: '#1d6d7a' }}>
            {type === 'upward' ? '上转流程进度' : '下转流程进度'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#fff', color: '#8dadb5', border: '1px solid #C8ECF0' }}>
            共 {totalCount} 个环节
          </span>
        </div>
        {/* 进度条 */}
        <div className="flex items-center gap-2.5">
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: '#D5ECF0' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((totalCount - 1) > 0 ? doneCount / (totalCount - 1) : 0) * 100}%`,
                background: isTerminal ? '#ef4444' : isDone ? '#10b981' : '#0BBECF'
              }}
            />
          </div>
          <span className="text-xs font-medium" style={{ color: '#5a9faa', minWidth: 32 }}>
            {doneCount}/{totalCount - 1}
          </span>
        </div>
      </div>

      {/* 泳道主体 */}
      <div>
        {laneKeys.map((laneKey, laneIdx) => {
          const lane = LANES[laneKey]
          const laneHasStep = steps.some(s => s.lane === laneKey)
          if (!laneHasStep) return null

          return (
            <div
              key={laneKey}
              className="flex items-center relative"
              style={{
                background: lane.bg,
                borderBottom: laneIdx < laneKeys.length - 1 ? '1px solid #EBF5F7' : 'none',
                borderLeft: `3px solid ${lane.border}`,
              }}
            >
              {/* 泳道标签 */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1 py-5" style={{ width: 76 }}>
                <span className="text-base leading-none">{lane.icon}</span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: lane.labelBg, color: lane.labelColor }}
                >
                  {lane.label}
                </span>
              </div>

              {/* 分隔线 */}
              <div className="w-px self-stretch flex-shrink-0" style={{ background: '#E5F3F5', margin: '8px 0' }} />

              {/* 步骤行 */}
              <div className="flex-1 px-4 py-3">
                <div className="flex items-start">
                  {steps.map((step, i) => {
                    const isThisLane = step.lane === laneKey
                    const state = getStepState(step, status, steps, { isEmergencyUpward, hasEmergencyAdmissionArrangement })
                    const nextStep = steps[i + 1]
                    const isLast = i === steps.length - 1

                    // 连接线：只在同一泳道相邻步骤之间显示
                    const showConnector = !isLast && isThisLane && nextStep?.lane === laneKey
                    const nextState = nextStep
                      ? getStepState(nextStep, status, steps, { isEmergencyUpward, hasEmergencyAdmissionArrangement })
                      : 'future'
                    const connectorColor = (state === 'done' && (nextState === 'done' || nextState === 'active'))
                      ? (state === 'done' && nextState === 'active' ? `linear-gradient(to right, #10b981, ${lane.accent})` : '#10b981')
                      : '#e5e7eb'

                    return (
                      <div key={step.id + laneKey} className="flex items-center flex-1 min-w-0">
                        {isThisLane ? (
                          <StepNode step={step} state={state} index={i} lane={laneKey} />
                        ) : (
                          // 空占位 - 保持列宽一致
                          <div className="flex-shrink-0" style={{ width: 52 }}>
                            {/* 空泳道中心的微弱虚线 */}
                            <div className="flex justify-center" style={{ paddingTop: 27 }}>
                              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#EFF5F6' }} />
                            </div>
                          </div>
                        )}

                        {/* 连接线 / 间距 */}
                        {!isLast && (
                          <div className="flex-1 flex items-center" style={{ paddingTop: 18, minWidth: 8 }}>
                            {showConnector ? (
                              <div
                                className="w-full rounded-full"
                                style={{
                                  height: 2,
                                  background: connectorColor,
                                  opacity: 0.85,
                                }}
                              />
                            ) : (
                              <div className="w-full" style={{ height: 2 }} />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between px-5 py-2.5" style={{ background: '#F8FDFE', borderTop: '1px solid #E2F0F3' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: '#8dadb5' }}>
          <span>当前状态</span>
          <span
            className="font-semibold px-2.5 py-0.5 rounded-full"
            style={
              isDone ? { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' } :
              isTerminal ? { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' } :
              { background: '#E0F6F9', color: '#0892a0', border: '1px solid #a4edf5' }
            }
          >
            {displayStatus}
          </span>
        </div>
        {/* 图例 */}
        <div className="flex items-center gap-3">
          {[
            { color: '#10b981', label: '已完成' },
            { color: '#0BBECF', label: '进行中' },
            { color: '#e5e7eb', label: '待完成' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs" style={{ color: '#a3b8bc' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

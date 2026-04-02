import { createContext, useContext, useState, useCallback } from 'react'
import {
  ROLES, MOCK_USERS, MOCK_REFERRALS_INIT, MOCK_NOTIFICATIONS_INIT,
  UPWARD_STATUS, DOWNWARD_STATUS
} from '../data/mockData'
import { getAuditConfig } from '../data/auditRuleConfig'

// F-09 操作日志事件类型枚举（P2-2：补充新增类型）
export const LOG_EVENTS = {
  // 转诊生命周期
  REFERRAL_SUBMITTED:           'REFERRAL_SUBMITTED',
  REFERRAL_CLAIMED:             'REFERRAL_CLAIMED',
  REFERRAL_ACCEPTED:            'REFERRAL_ACCEPTED',
  REFERRAL_REJECTED:            'REFERRAL_REJECTED',
  REFERRAL_CANCELLED:           'REFERRAL_CANCELLED',
  REFERRAL_COMPLETED:           'REFERRAL_COMPLETED',
  REFERRAL_CLOSED:              'REFERRAL_CLOSED',
  REFERRAL_REOPENED:            'REFERRAL_REOPENED',
  // 下转
  DOWNWARD_CREATED:             'DOWNWARD_CREATED',
  DOWNWARD_ACCEPTED:            'DOWNWARD_ACCEPTED',
  DOWNWARD_REJECTED:            'DOWNWARD_REJECTED',
  DOWNWARD_COMPLETED:           'DOWNWARD_COMPLETED',
  DOWNWARD_TIMEOUT_CLOSED:      'DOWNWARD_TIMEOUT_CLOSED',
  // 预约码
  APPOINTMENT_CODE_GENERATED:   'APPOINTMENT_CODE_GENERATED',
  APPOINTMENT_CODE_CONSUMED:    'APPOINTMENT_CODE_CONSUMED',
  APPOINTMENT_CODE_EXPIRED:     'APPOINTMENT_CODE_EXPIRED',     // 新增
  APPOINTMENT_CODE_RELEASED:    'APPOINTMENT_CODE_RELEASED',    // 新增（撤销/关闭时释放）
  // 号源
  QUOTA_RESERVED:               'QUOTA_RESERVED',               // 新增
  QUOTA_RELEASED:               'QUOTA_RELEASED',               // 新增
  // 床位池（J-4）
  BED_RESERVED:                 'BED_RESERVED',
  BED_USED:                     'BED_USED',
  BED_RELEASED:                 'BED_RELEASED',
  BED_EXPIRED:                  'BED_EXPIRED',
  // 管理员操作
  ADMIN_ASSIGNED_DOCTOR:        'ADMIN_ASSIGNED_DOCTOR',
  URGE_CONFIRM:                 'URGE_CONFIRM',
  // 急诊告警
  EMERGENCY_ESCALATED:          'EMERGENCY_ESCALATED',          // 新增
  // 知情同意
  CONSENT_SIGNED:               'CONSENT_SIGNED',
  CONSENT_DEFERRED:             'CONSENT_DEFERRED',
  CONSENT_SUPPLEMENTED:         'CONSENT_SUPPLEMENTED',
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  // 当前登录角色（演示用切换器）——持久化到 sessionStorage，防止 URL 直接导航后角色重置
  const [currentRole, setCurrentRole] = useState(() => {
    const saved = sessionStorage.getItem('demo_current_role')
    return (saved && Object.values(ROLES).includes(saved)) ? saved : ROLES.PRIMARY
  })

  // 包装 setCurrentRole，同步写入 sessionStorage
  const setCurrentRoleAndPersist = (role) => {
    sessionStorage.setItem('demo_current_role', role)
    setCurrentRole(role)
  }

  // 转诊记录列表（全局 state，所有角色共享）
  const [referrals, setReferrals] = useState(MOCK_REFERRALS_INIT)

  // 通知消息
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS_INIT)

  // 当前用户信息
  const currentUser = MOCK_USERS[currentRole]

  // ─────────────── 状态机操作 ───────────────

  // 提交上转申请（草稿→待审核）
  // P0-7：急诊转诊提交时立即同时通知三方（对口医生 + 科室负责人 + 转诊管理员）
  const submitReferral = useCallback((referralData) => {
    const isEmergencyBypass = referralData.is_emergency && !referralData.consentSigned
    const isEmergency = !!referralData.is_emergency
    const newRef = {
      ...referralData,
      id: `REF${Date.now()}`,
      status: UPWARD_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      consentSigned: !isEmergencyBypass,
      consentTime: isEmergencyBypass ? null : new Date().toISOString(),
      consentDeferred: isEmergencyBypass || undefined,
      // P0-6 默认字段
      assignedDoctorId: referralData.assignedDoctorId ?? null,
      assignedDoctorName: referralData.assignedDoctorName ?? null,
      isUrgentUnhandled: false,
      adminAssigned: false,
      internalNote: referralData.internalNote ?? '',
      logs: [
        ...(referralData.logs || []),
        { time: new Date().toISOString(), actor: currentUser.name, action: '提交上转申请' },
        ...(isEmergencyBypass ? [{ time: new Date().toISOString(), actor: '系统', action: '急诊豁免知情同意，需24小时内补录' }] : []),
        ...(isEmergency ? [{ time: new Date().toISOString(), actor: '系统', action: '急诊转诊：已立即通知对口联系医生、科室负责人及转诊管理员（P0-7）' }] : [
          { time: new Date().toISOString(), actor: '系统', action: '通知推送至县级接诊科室' },
        ]),
      ],
    }
    setReferrals(prev => [newRef, ...prev])

    if (isEmergency) {
      // P0-7 ① 对口联系医生（isPreferredDoctor=true → ROLES.COUNTY）
      addNotification({
        type: 'emergency_new',
        title: '🚨 急诊上转申请——请立即处理',
        content: `【急诊】患者${referralData.patient?.name}（${referralData.diagnosis?.name}）急诊上转，请立即受理`,
        targetRole: ROLES.COUNTY,
        referralId: newRef.id,
      })
      // P0-7 ② 科室负责人（isDepartmentHead=true → ROLES.COUNTY2）
      addNotification({
        type: 'emergency_new',
        title: '🚨 急诊上转申请——请立即处理',
        content: `【急诊·科室负责人】患者${referralData.patient?.name}（${referralData.diagnosis?.name}）急诊上转，请督促科室尽快受理`,
        targetRole: ROLES.COUNTY2,
        referralId: newRef.id,
      })
      // P0-7 ③ 转诊管理员
      addNotification({
        type: 'emergency_new',
        title: '🚨 急诊上转申请——请关注处理进度',
        content: `【急诊·管理员】患者${referralData.patient?.name}（${referralData.diagnosis?.name}）急诊上转已提交，请监控受理进度`,
        targetRole: ROLES.ADMIN,
        referralId: newRef.id,
      })
    } else {
      // 普通上转只通知县级医生
      addNotification({
        type: 'upward_new',
        title: '新上转申请待审核',
        content: `患者${referralData.patient?.name}（${referralData.diagnosis?.name}）上转申请待审核`,
        targetRole: ROLES.COUNTY,
        referralId: newRef.id,
      })
    }

    return newRef.id
  }, [currentUser])

  // P0-6：县级医生受理（待审核→待审核，锁定经办医生）
  // 广播=信息通知，受理动作明确责任归属；防重复受理
  const claimReferral = useCallback((referralId) => {
    const target = referrals.find(r => r.id === referralId)
    if (!target) return { success: false, error: 'NOT_FOUND' }
    // 已被他人受理则拒绝
    if (target.assignedDoctorId && target.assignedDoctorId !== currentUser.id) {
      return { success: false, error: 'ALREADY_ASSIGNED', assignedDoctorName: target.assignedDoctorName }
    }
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        assignedDoctor: currentUser.name,       // 兼容旧字段
        assignedDoctorId: currentUser.id,       // P0-6 新字段
        assignedDoctorName: currentUser.name,   // P0-6 新字段
        assignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '受理申请，已归入名下处理' },
          { time: new Date().toISOString(), actor: '系统', action: '其他医生已不可受理该申请' },
        ],
      }
    }))
    return { success: true }
  }, [currentUser, referrals])

  // 县级接收上转（待审核→转诊中，无独立已接收状态）
  // C-4 修复：预约码由管理员填写 admissionArrangement 时生成，接收时不再生成
  const acceptReferral = useCallback((referralId, admissionType = 'outpatient') => {
    const refNo = `ZZ${Date.now()}`
    const admissionLabel = { outpatient: '门诊就诊', inpatient: '住院收治', emergency: '急诊处置' }[admissionType] || '门诊就诊'
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        status: UPWARD_STATUS.IN_TRANSIT,
        toDoctor: currentUser.name,
        referralNo: refNo,
        admissionType,
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: `接收转诊申请，承接方式：${admissionLabel}` },
          { time: new Date().toISOString(), actor: '系统', action: `生成电子转诊单 ${refNo}` },
          { time: new Date().toISOString(), actor: '系统', action: '通知基层医生：申请已接收，待转诊中心安排到院时间' },
        ],
      }
    }))

    const ref = referrals.find(r => r.id === referralId)
    addNotification({
      type: 'upward_accepted',
      title: '转诊申请已接收',
      content: `您发起的患者${ref?.patient?.name}的转诊申请已被接收，转诊单编号：${refNo}。请告知患者：到院仍需正常挂号缴费，预约码不免除费用。`,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
  }, [currentUser, referrals])

  // 县级拒绝上转（待审核→已拒绝）
  // J-4：拒绝时将 bed_reserved → bed_released
  const rejectReferral = useCallback((referralId, reason) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const newBedStatus = r.bedStatus === 'bed_reserved' ? 'bed_released' : r.bedStatus
      return {
        ...r,
        status: UPWARD_STATUS.REJECTED,
        rejectReason: reason,
        updatedAt: new Date().toISOString(),
        bedStatus: newBedStatus,
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '拒绝转诊申请', note: reason },
          { time: new Date().toISOString(), actor: '系统', action: '通知基层医生：申请被拒绝' },
          ...(newBedStatus === 'bed_released' ? [{ time: new Date().toISOString(), actor: '系统', action: '床位已释放（申请被拒绝）' }] : []),
        ],
      }
    }))

    const ref = referrals.find(r => r.id === referralId)
    addNotification({
      type: 'upward_rejected',
      title: '转诊申请被拒绝',
      content: `患者${ref?.patient?.name}的转诊申请被拒绝，原因：${reason}`,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
  }, [currentUser, referrals])

  // 撤销上转（待审核→已撤销）
  // J-4：撤销时将 bed_reserved → bed_released（主动释放床位）
  const cancelReferral = useCallback((referralId, reason) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const newBedStatus = r.bedStatus === 'bed_reserved' ? 'bed_released' : r.bedStatus
      return {
        ...r,
        status: UPWARD_STATUS.CANCELLED,
        closeReason: reason,
        updatedAt: new Date().toISOString(),
        bedStatus: newBedStatus,
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '撤销转诊申请', note: reason },
          ...(newBedStatus === 'bed_released' ? [{ time: new Date().toISOString(), actor: '系统', action: '床位已释放（申请撤销）' }] : []),
        ],
      }
    }))
  }, [currentUser])

  // 县级完成接诊（已接收/转诊中→已完成）
  // J-4：完成时将 bed_reserved → bed_used（核销床位）
  const completeReferral = useCallback((referralId) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const newBedStatus = r.bedStatus === 'bed_reserved' ? 'bed_used' : r.bedStatus
      return {
        ...r,
        status: UPWARD_STATUS.COMPLETED,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bedStatus: newBedStatus,
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '完成接诊确认' },
          { time: new Date().toISOString(), actor: '系统', action: '状态更新为已完成，触发数据上报' },
          ...(newBedStatus === 'bed_used' ? [{ time: new Date().toISOString(), actor: '系统', action: '床位已核销（患者已入院）' }] : []),
        ],
      }
    }))

    const ref = referrals.find(r => r.id === referralId)
    addNotification({
      type: 'upward_completed',
      title: '上转已完成',
      content: `患者${ref?.patient?.name}上转已完成`,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
  }, [currentUser, referrals])

  // 基层接收下转（待接收→转诊中，与上转对称，无独立已接收状态）
  // C-1 修复：接收时同步写入 downwardAssignedDoctorId，完成接收锁定（CHG-31）
  const acceptDownwardReferral = useCallback((referralId) => {
    const target = referrals.find(r => r.id === referralId)
    if (!target) return
    // 已被他人受理则拒绝（防御性检查，UI层也有锁定逻辑）
    if (target.downwardAssignedDoctorId && target.downwardAssignedDoctorId !== currentUser.id) return
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        status: DOWNWARD_STATUS.IN_TRANSIT,
        downwardAssignedDoctorId: currentUser.id,
        downwardAssignedDoctorName: currentUser.name,
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '确认接收下转申请，患者转入转诊中' },
          { time: new Date().toISOString(), actor: '系统', action: '接收锁定：其他医生已不可重复接收该下转申请' },
          { time: new Date().toISOString(), actor: '系统', action: '通知县级医生：下转已接收' },
        ],
      }
    }))
  }, [currentUser, referrals])

  // 基层完成下转接收（已接收→已完成）
  const completeDownwardReferral = useCallback((referralId) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        status: DOWNWARD_STATUS.COMPLETED,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '完成患者接收确认' },
          { time: new Date().toISOString(), actor: '系统', action: '自动创建随访任务' },
          { time: new Date().toISOString(), actor: '系统', action: '触发四川健康通数据上报' },
        ],
      }
    }))
  }, [currentUser])

  // 县级发起下转（新建下转单）
  const createDownwardReferral = useCallback((data) => {
    const newRef = {
      ...data,
      id: `REF${Date.now()}`,
      type: 'downward',
      status: DOWNWARD_STATUS.PENDING,
      fromDoctor: currentUser.name,
      fromInstitution: currentUser.institution,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      consentSigned: true,
      consentTime: new Date().toISOString(),
      logs: [
        { time: new Date().toISOString(), actor: currentUser.name, action: '发起下转申请，已附康复方案' },
        { time: new Date().toISOString(), actor: '系统', action: `通知推送至${data.toInstitution}` },
      ],
    }
    setReferrals(prev => [newRef, ...prev])
    addNotification({
      type: 'downward_new',
      title: '新下转申请待接收',
      content: `患者${data.patient?.name}（${data.diagnosis?.name}）下转申请，请安排接收`,
      targetRole: ROLES.PRIMARY,
      referralId: newRef.id,
    })
    return newRef.id
  }, [currentUser])

  // 修改重提（已拒绝→待审核，原转诊单重置，保留历史日志）
  // M-9 修复：清空 assignedDoctorId/assignedDoctorName，避免重提后残留旧经办医生
  const reopenReferral = useCallback((referralId) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        status: UPWARD_STATUS.PENDING,
        rejectReason: null,
        assignedDoctor: null,
        assignedDoctorId: null,
        assignedDoctorName: null,
        assignedAt: null,
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '修改重提：申请重置为待审核，经办医生已清空' },
          { time: new Date().toISOString(), actor: '系统', action: '通知推送至县级接诊科室（重提）' },
        ],
      }
    }))
  }, [currentUser])

  // 协商关闭 / 终止申请（已拒绝→已关闭，或管理员协商关闭）
  // 与 cancelReferral 区分：closeReferral 目标状态为 CLOSED（已关闭），语义为双方协商终止
  // J-4：关闭时将 bed_reserved → bed_released
  const closeReferral = useCallback((referralId, reason) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const closedStatus = r.type === 'downward' ? DOWNWARD_STATUS.CLOSED : UPWARD_STATUS.CLOSED
      const newBedStatus = r.bedStatus === 'bed_reserved' ? 'bed_released' : r.bedStatus
      return {
        ...r,
        status: closedStatus,
        closeReason: reason,
        updatedAt: new Date().toISOString(),
        bedStatus: newBedStatus,
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '终止/关闭转诊申请', note: reason },
          { time: new Date().toISOString(), actor: '系统', action: '状态变更为已关闭，已通知双方医生' },
          ...(newBedStatus === 'bed_released' ? [{ time: new Date().toISOString(), actor: '系统', action: '床位已释放（申请关闭）' }] : []),
        ],
      }
    }))
  }, [currentUser])

  // 拒绝下转（待接收→已拒绝）
  const rejectDownwardReferral = useCallback((referralId, reason) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        status: DOWNWARD_STATUS.REJECTED,
        rejectReason: reason,
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '拒绝下转申请', note: reason },
        ],
      }
    }))
  }, [currentUser])

  // 下转超时7天自动关闭（G1决策，state-machine.md 2026-03-25确认）
  const closeDownwardByTimeout = useCallback((referralId) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        status: DOWNWARD_STATUS.CLOSED,
        closeReason: '超时7天未到达，系统自动关闭',
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: '系统', action: '下转超时7天自动关闭', note: '患者未完成到达确认' },
          { time: new Date().toISOString(), actor: '系统', action: '已通知双方医生及转诊管理员' },
        ],
      }
    }))
  }, [])

  // P0-6：管理员指派经办医生（超时无人受理后介入，flow-input.md 第四节）
  const assignDoctorByAdmin = useCallback((referralId, doctorId, doctorName) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        assignedDoctor: doctorName,         // 兼容旧字段
        assignedDoctorId: doctorId,         // P0-6 新字段
        assignedDoctorName: doctorName,     // P0-6 新字段
        adminAssigned: true,                // P0-6 新字段
        assignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: `管理员指派经办医生：${doctorName}`, note: '超时无人受理，管理员介入' },
          { time: new Date().toISOString(), actor: '系统', action: `已向${doctorName}发送强推通知：您已被指派处理该转诊申请` },
        ],
      }
    }))
    // 向被指派医生发送强推通知
    addNotification({
      type: 'admin_assigned',
      title: '📌 您已被指派处理转诊申请',
      content: `管理员已将一条超时转诊申请指派给您，请尽快受理处理`,
      targetRole: null, // 生产环境替换为 doctorId 定向推送
      referralId,
    })
  }, [currentUser])

  // P0-7：急诊2h无受理 → 再次催办三方
  const renotifyEmergency = useCallback((referralId) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: '系统', action: '急诊转诊2小时无人受理，已再次催办三方', note: '对口联系医生、科室负责人、转诊管理员均已收到通知' },
        ],
      }
    }))
    const ref = referrals.find(r => r.id === referralId)
    const patientName = ref?.patient?.name
    // ① 对口联系医生
    addNotification({
      type: 'emergency_renotify',
      title: '⚠️ 急诊转诊2h未受理——再次提醒',
      content: `【再次提醒】急诊转诊（患者${patientName}）已超2小时无人受理，请尽快处理`,
      targetRole: ROLES.COUNTY,
      referralId,
    })
    // ② 科室负责人
    addNotification({
      type: 'emergency_renotify',
      title: '⚠️ 急诊转诊2h未受理——督促科室',
      content: `【督促提醒】急诊转诊（患者${patientName}）已超2小时无人受理，请督促科室医生立即处理`,
      targetRole: ROLES.COUNTY2,
      referralId,
    })
    // ③ 转诊管理员
    addNotification({
      type: 'emergency_renotify',
      title: '⚠️ 急诊转诊2h未受理——请关注',
      content: `急诊转诊（患者${patientName}）已超2小时无人受理，如继续无人处理将于4h后升级告警`,
      targetRole: ROLES.ADMIN,
      referralId,
    })
  }, [referrals])

  // P0-7 / P1-2：急诊4h升级告警（替代原"系统自动接收"）
  // 同时兼容新字段 isUrgentUnhandled（P0-6）和旧字段 urgentFlag（向后兼容）
  const escalateEmergencyAlert = useCallback((referralId) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        urgentFlag: 'urgent_unhandled',   // 旧字段，向后兼容
        isUrgentUnhandled: true,          // P0-6 新字段
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: '系统', action: '急诊转诊4小时无人受理，已升级为紧急告警', note: '已通知科室负责人及转诊管理员' },
        ],
      }
    }))
    const ref = referrals.find(r => r.id === referralId)
    const patientName = ref?.patient?.name
    addNotification({
      type: 'emergency_escalated',
      title: '🔴 急诊转诊4h超时——紧急告警',
      content: `急诊转诊（患者${patientName}）已超4小时无人受理，请立即介入处理`,
      targetRole: ROLES.ADMIN,
      referralId,
    })
    // 同时通知科室负责人
    addNotification({
      type: 'emergency_escalated',
      title: '🔴 急诊转诊4h超时——请立即受理',
      content: `急诊转诊（患者${patientName}）已超4小时无人受理，管理员已升级告警，请立即处理`,
      targetRole: ROLES.COUNTY2,
      referralId,
    })
  }, [referrals])

  // 挂号员核验并核销预约码（P0-2）
  const verifyAndConsumeAppointmentCode = useCallback((code, operatorId) => {
    if (!operatorId?.trim()) return { success: false, error: 'OPERATOR_ID_REQUIRED' }
    const referral = referrals.find(r => r.appointmentCode === code)
    if (!referral) return { success: false, error: 'NOT_FOUND' }
    const info = referral.appointmentInfo || {}
    const status = info.status || (referral.appointmentCode ? 'reserved' : null)
    if (status !== 'reserved') {
      return { success: false, error: (status || 'UNKNOWN').toUpperCase(), referral }
    }
    setReferrals(prev => prev.map(r => {
      if (r.id !== referral.id) return r
      return {
        ...r,
        appointmentInfo: {
          ...r.appointmentInfo,
          status: 'used',
          consumedAt: new Date().toISOString(),
          consumedBy: operatorId,
        },
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: `挂号员（工号:${operatorId}）`, action: '核销转诊预约码，患者已到院就诊' },
        ],
      }
    }))
    return { success: true, referral }
  }, [referrals])

  // CHG-32：基层医生提交院内审核（普通上转，F-02=ON时流程）→ PENDING_INTERNAL_REVIEW
  // 急诊/绿通仍走 submitReferral 直接到 PENDING
  // CHG-33：急诊无论开关状态直接跳过内审 → PENDING
  // CHG-34：改为从 auditRuleConfig 动态读取开关，不再硬编码
  const submitForInternalReview = useCallback((referralData) => {
    const isEmergency = !!referralData.is_emergency
    // CHG-34：读取提交方（基层机构）的上转审核配置，而非目标科室
    const auditConfig = getAuditConfig(currentUser.dept, 'upward', currentUser.institution)
    const needsInternalReview = auditConfig.enabled && !isEmergency
    const newRef = {
      ...referralData,
      id: `REF${Date.now()}`,
      status: needsInternalReview ? UPWARD_STATUS.PENDING_INTERNAL_REVIEW : UPWARD_STATUS.PENDING,
      auditAssignedUserId: needsInternalReview ? auditConfig.auditorUserId : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      consentSigned: referralData.consentSigned ?? false,
      consentTime: referralData.consentSigned ? new Date().toISOString() : null,
      // 默认字段
      assignedDoctorId: null,
      assignedDoctorName: null,
      isUrgentUnhandled: false,
      adminAssigned: false,
      internalNote: referralData.internalNote ?? '',
      admissionArrangement: null,
      internalAuditLog: [],
      downwardAssignedDoctorId: null,
      downwardAssignedDoctorName: null,
      logs: [
        ...(referralData.logs || []),
        isEmergency
          ? { time: new Date().toISOString(), actor: currentUser.name, action: '提交上转申请（急诊豁免院内审核，CHG-33）' }
          : needsInternalReview
            ? { time: new Date().toISOString(), actor: currentUser.name, action: `提交上转申请，等待院内审核（${currentUser.institution}·${currentUser.dept}已配置审核规则）` }
            : { time: new Date().toISOString(), actor: currentUser.name, action: `提交上转申请（${currentUser.institution}·${currentUser.dept}未启用院内审核，直接进入待审核）` },
        ...(needsInternalReview ? [{ time: new Date().toISOString(), actor: '系统', action: `通知科主任：有新转诊申请待院内审核` }] : []),
      ],
    }
    setReferrals(prev => [newRef, ...prev])
    // 仅需院内审核时才通知科主任（CHG-33：急诊已跳过；CHG-34：审核关闭时也跳过）
    if (needsInternalReview) {
      addNotification({
        type: 'internal_review_new',
        title: '📋 新上转申请待院内审核',
        content: `患者${referralData.patient?.name}（${referralData.diagnosis?.name}）上转申请需院内审核，请尽快处理`,
        targetRole: ROLES.PRIMARY_HEAD,
        referralId: newRef.id,
      })
    }
    return newRef.id
  }, [currentUser])

  // CHG-32：科主任通过院内审核 → PENDING（同时推送县级医生通知）
  const approveInternalReview = useCallback((referralId, comment = '') => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const auditEntry = {
        time: new Date().toISOString(),
        actor: currentUser.name,
        action: '院内审核通过',
        comment,
        result: 'approved',
      }
      return {
        ...r,
        status: UPWARD_STATUS.PENDING,
        internalAuditLog: [...(r.internalAuditLog || []), auditEntry],
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '院内审核通过', note: comment || undefined },
          { time: new Date().toISOString(), actor: '系统', action: '状态变更为待审核，已通知县级接诊科室' },
        ],
      }
    }))
    const ref = referrals.find(r => r.id === referralId)
    // 通知申请医生
    addNotification({
      type: 'internal_review_approved',
      title: '✅ 院内审核已通过',
      content: `患者${ref?.patient?.name}的上转申请已通过院内审核，正在等待县级医院审核`,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
    // 通知县级医生
    addNotification({
      type: 'upward_new',
      title: '新上转申请待审核',
      content: `患者${ref?.patient?.name}（${ref?.diagnosis?.name}）上转申请待审核，来自：${ref?.fromInstitution}`,
      targetRole: ROLES.COUNTY,
      referralId,
    })
  }, [currentUser, referrals])

  // CHG-32：科主任拒绝院内审核 → DRAFT（在原单修改重提）
  const rejectInternalReview = useCallback((referralId, reason) => {
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      const auditEntry = {
        time: new Date().toISOString(),
        actor: currentUser.name,
        action: '院内审核拒绝',
        comment: reason,
        result: 'rejected',
      }
      return {
        ...r,
        status: UPWARD_STATUS.DRAFT,   // 退回草稿，在原单修改重提
        internalAuditLog: [...(r.internalAuditLog || []), auditEntry],
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '院内审核拒绝，退回修改', note: reason },
          { time: new Date().toISOString(), actor: '系统', action: '申请退回为草稿，请在原单上修改后重提' },
        ],
      }
    }))
    const ref = referrals.find(r => r.id === referralId)
    addNotification({
      type: 'internal_review_rejected',
      title: '❌ 院内审核未通过，请修改重提',
      content: `患者${ref?.patient?.name}的上转申请院内审核未通过，原因：${reason}。请修改后重新提交。`,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
  }, [currentUser, referrals])

  // CHG-29：管理员填写到院安排（IN_TRANSIT 状态，生成预约码并通知基层）
  // J-4：住院且床位有余量时自动锁定床位（bedStatus → bed_reserved）
  const fillAdmissionArrangement = useCallback((referralId, arrangement) => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const arrangedAt = new Date().toISOString()
    const target = referrals.find(r => r.id === referralId)
    const isInpatient = target?.admissionType === 'inpatient'
    const hasBed = isInpatient && arrangement.ward && (arrangement.bedNumber || arrangement.bedAssignMode === 'on_arrival')
    // 计算今日已预占数（简单判断：同科室 bed_reserved 且今日）
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const occupied = isInpatient
      ? referrals.filter(r =>
          r.toDept === target.toDept &&
          r.bedStatus === 'bed_reserved' &&
          r.admissionArrangement?.bedReservedAt &&
          new Date(r.admissionArrangement.bedReservedAt) >= todayStart
        ).length
      : 0
    // bedRemaining 需依赖 departmentInfo，此处用 arrangement 传入的 dailyReservedBeds（可选），默认保守处理
    const dailyReservedBeds = arrangement._dailyReservedBeds ?? 0
    const canReserveBed = hasBed && (dailyReservedBeds === 0 || occupied < dailyReservedBeds)
    const newBedStatus = isInpatient
      ? (canReserveBed ? 'bed_reserved' : 'not_applicable')
      : 'not_applicable'
    const bedReservedAt = canReserveBed ? arrangedAt : undefined

    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        admissionArrangement: {
          ...arrangement,
          appointmentCode: code,
          arrangedAt,
          arrangedBy: currentUser.name,
          ...(bedReservedAt ? { bedReservedAt } : {}),
        },
        appointmentCode: code,
        appointmentCodeExpireAt: new Date(Date.now() + 48 * 3600000).toISOString(),
        appointmentInfo: { status: 'reserved' },
        bedStatus: newBedStatus,
        updatedAt: arrangedAt,
        logs: [
          ...r.logs,
          { time: arrangedAt, actor: currentUser.name, action: `安排到院信息：${arrangement.department}，就诊时间：${arrangement.visitTime ? new Date(arrangement.visitTime).toLocaleString('zh-CN') : '待定'}` },
          { time: arrangedAt, actor: '系统', action: `生成预约取号码：${code}，有效期48小时，已通知基层医生转告患者` },
          ...(canReserveBed ? [{ time: arrangedAt, actor: '系统', action: `床位已预占：${arrangement.ward} ${arrangement.bedNumber || '（入院时分配）'}，有效期48小时` }] : []),
          ...(!canReserveBed && isInpatient ? [{ time: arrangedAt, actor: '系统', action: '提交时床位已满，bedStatus=not_applicable，需人工协调' }] : []),
        ],
      }
    }))
    const ref = referrals.find(r => r.id === referralId)
    const notifContent = isInpatient
      ? `患者${ref?.patient?.name}住院安排已填写：${arrangement.ward}，${arrangement.bedNumber || '入院时分配'}，取号码：${code}`
      : `患者${ref?.patient?.name}到院信息已安排：${arrangement.department}，取号码：${code}，请告知患者`
    addNotification({
      type: 'admission_arranged',
      title: '🏥 到院信息已安排',
      content: notifContent,
      targetRole: ROLES.PRIMARY,
      referralId,
    })
    return code
  }, [currentUser, referrals])

  // CHG-32：基层医生受理下转（待接收→待接收，锁定经办医生，防重复受理）
  const claimDownwardReferral = useCallback((referralId) => {
    const target = referrals.find(r => r.id === referralId)
    if (!target) return { success: false, error: 'NOT_FOUND' }
    if (target.downwardAssignedDoctorId && target.downwardAssignedDoctorId !== currentUser.id) {
      return { success: false, error: 'ALREADY_ASSIGNED', assignedDoctorName: target.downwardAssignedDoctorName }
    }
    setReferrals(prev => prev.map(r => {
      if (r.id !== referralId) return r
      return {
        ...r,
        downwardAssignedDoctorId: currentUser.id,
        downwardAssignedDoctorName: currentUser.name,
        updatedAt: new Date().toISOString(),
        logs: [
          ...r.logs,
          { time: new Date().toISOString(), actor: currentUser.name, action: '受理下转申请，已归入名下处理' },
          { time: new Date().toISOString(), actor: '系统', action: '其他医生已不可重复受理该下转申请' },
        ],
      }
    }))
    return { success: true }
  }, [currentUser, referrals])

  // ─────────────── 通知操作 ───────────────

  const addNotification = useCallback((notif) => {
    setNotifications(prev => [{
      id: `n${Date.now()}`,
      ...notif,
      read: false,
      createdAt: new Date().toISOString(),
    }, ...prev])
  }, [])

  const markNotificationRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  // 当前角色的通知
  const myNotifications = notifications.filter(n => n.targetRole === currentRole)
  const unreadCount = myNotifications.filter(n => !n.read).length

  return (
    <AppContext.Provider value={{
      currentRole,
      setCurrentRole: setCurrentRoleAndPersist,
      currentUser,
      referrals,
      setReferrals,
      notifications,
      myNotifications,
      unreadCount,
      markNotificationRead,
      markAllRead,
      // 状态机操作
      submitReferral,
      createDownwardReferral,
      claimReferral,
      acceptReferral,
      rejectReferral,
      cancelReferral,
      closeReferral,
      reopenReferral,
      completeReferral,
      acceptDownwardReferral,
      completeDownwardReferral,
      rejectDownwardReferral,
      closeDownwardByTimeout,
      assignDoctorByAdmin,
      verifyAndConsumeAppointmentCode,
      escalateEmergencyAlert,
      renotifyEmergency,
      // CHG-29/30/32 新增
      submitForInternalReview,
      approveInternalReview,
      rejectInternalReview,
      fillAdmissionArrangement,
      claimDownwardReferral,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

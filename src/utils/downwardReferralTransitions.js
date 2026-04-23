import { DOWNWARD_STATUS } from '../data/mockData.js'

export function buildDownwardReopenState(referral, currentUser, reopenedAt) {
  return {
    ...referral,
    status: DOWNWARD_STATUS.PENDING,
    rejectReason: null,
    rejectReasonCode: null,
    rejectReasonText: null,
    returnReason: null,
    institutionRejectReasonCode: null,
    institutionRejectReasonText: null,
    doctorRejectReasonCode: null,
    doctorRejectReasonText: null,
    coordinatorRejectReason: null,
    coordinatorReturnReason: null,
    assignedDoctor: null,
    assignedDoctorId: null,
    assignedDoctorName: null,
    assignedAt: null,
    designatedDoctorId: null,
    designatedDoctorName: null,
    downwardAssignedDoctorId: null,
    downwardAssignedDoctorName: null,
    coordinatorActionAt: null,
    allocationMode: null,
    allocationModeChangedAt: null,
    updatedAt: reopenedAt,
    logs: [
      ...(referral.logs || []),
      {
        time: reopenedAt,
        actor: currentUser.name,
        action: '修改重提：申请重置为待接收',
      },
      {
        time: reopenedAt,
        actor: '系统',
        action: '通知推送至基层接收机构（重提）',
      },
    ],
  }
}

export function buildDownwardSelfAcceptState(referral, currentUser, acceptedAt) {
  return {
    ...referral,
    status: DOWNWARD_STATUS.IN_TRANSIT,
    allocationMode: referral.allocationMode === 'coordinator' ? 'coordinator' : 'coordinator_reassign',
    designatedDoctorId: currentUser.id,
    designatedDoctorName: currentUser.name,
    downwardAssignedDoctorId: currentUser.id,
    downwardAssignedDoctorName: currentUser.name,
    coordinatorActionAt: acceptedAt,
    coordinatorActionLog: [
      ...(referral.coordinatorActionLog || []),
      { time: acceptedAt, actorId: currentUser.id, actorName: currentUser.name, action: '负责人本人接收' },
    ],
    updatedAt: acceptedAt,
    logs: [
      ...(referral.logs || []),
      { time: acceptedAt, actor: currentUser.name, action: 'COORDINATOR_SELF_ACCEPT', note: '基层转诊负责人本人直接接收' },
      { time: acceptedAt, actor: '系统', action: '下转已进入接收处理中' },
    ],
  }
}

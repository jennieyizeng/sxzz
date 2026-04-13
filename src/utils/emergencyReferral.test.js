import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildEmergencyInitialSms,
  buildEmergencyModifySms,
  buildEmergencyReferralCode,
  buildEmergencyUrgencyFeedback,
  canProceedEmergencyReferral,
  canViewEmergencyReferralDetail,
  canViewEmergencyModifyWindowInfo,
  getEmergencyHospitalConfig,
  isValidChineseMainlandMobile,
  shouldShowNotificationToUser,
  shouldOfferGreenChannel,
} from './emergencyReferral.js'

test('validates mainland mobile numbers for emergency flow', () => {
  assert.equal(isValidChineseMainlandMobile('13800138000'), true)
  assert.equal(isValidChineseMainlandMobile('12800138000'), false)
  assert.equal(isValidChineseMainlandMobile('1380013800'), false)
})

test('offers green channel prompt only for I/II urgency', () => {
  assert.equal(shouldOfferGreenChannel({ urgencyLevel: 1 }), true)
  assert.equal(shouldOfferGreenChannel({ urgencyLevel: 2 }), true)
  assert.equal(shouldOfferGreenChannel({ urgencyLevel: 3 }), false)
})

test('builds urgency feedback for I level with automatic green channel badge', () => {
  assert.deepEqual(buildEmergencyUrgencyFeedback(1), {
    tone: 'critical',
    message: '已自动启用绿色通道，将同步通知急诊科及联动专科',
    badge: '自动启用绿通',
    greenChannelAutoEnabled: true,
  })
})

test('builds urgency feedback for II level without automatic green channel', () => {
  assert.deepEqual(buildEmergencyUrgencyFeedback(2), {
    tone: 'urgent',
    message: '将按急诊优先流程处理，可根据病情联动相关专科',
    badge: null,
    greenChannelAutoEnabled: false,
  })
})

test('builds urgency feedback for III and IV levels as standard emergency intake', () => {
  assert.deepEqual(buildEmergencyUrgencyFeedback(3), {
    tone: 'standard',
    message: '将通知目标医院急诊科进行接诊准备',
    badge: null,
    greenChannelAutoEnabled: false,
  })

  assert.deepEqual(buildEmergencyUrgencyFeedback(4), {
    tone: 'standard',
    message: '将通知目标医院急诊科进行接诊准备',
    badge: null,
    greenChannelAutoEnabled: false,
  })
})

test('allows emergency next step once minimum required fields are complete', () => {
  assert.equal(canProceedEmergencyReferral({
    patientName: '张三',
    patientPhone: '13800138000',
    urgencyLevel: 2,
    consciousnessStatus: 'conscious',
    toInstitutionId: 'inst001',
  }), true)
})

test('does not require linked specialty or optional contact for emergency next step', () => {
  assert.equal(canProceedEmergencyReferral({
    patientName: '张三',
    patientPhone: '13800138000',
    urgencyLevel: 1,
    consciousnessStatus: 'unclear',
    toInstitutionId: 'inst001',
    linkedSpecialty: '',
    emergencyContactPhone: '',
  }), true)
})

test('blocks emergency next step when any minimum required field is missing', () => {
  assert.equal(canProceedEmergencyReferral({
    patientName: '',
    patientPhone: '13800138000',
    urgencyLevel: 1,
    consciousnessStatus: 'unclear',
    toInstitutionId: 'inst001',
  }), false)

  assert.equal(canProceedEmergencyReferral({
    patientName: '张三',
    patientPhone: '1380013800',
    urgencyLevel: 1,
    consciousnessStatus: 'unclear',
    toInstitutionId: 'inst001',
  }), false)

  assert.equal(canProceedEmergencyReferral({
    patientName: '张三',
    patientPhone: '13800138000',
    urgencyLevel: null,
    consciousnessStatus: 'unclear',
    toInstitutionId: 'inst001',
  }), false)

  assert.equal(canProceedEmergencyReferral({
    patientName: '张三',
    patientPhone: '13800138000',
    urgencyLevel: 3,
    consciousnessStatus: '',
    toInstitutionId: 'inst001',
  }), false)

  assert.equal(canProceedEmergencyReferral({
    patientName: '张三',
    patientPhone: '13800138000',
    urgencyLevel: 3,
    consciousnessStatus: 'conscious',
    toInstitutionId: '',
  }), false)
})

test('shows institution-scoped notifications only to matching county users', () => {
  assert.equal(shouldShowNotificationToUser({
    notification: { targetRole: 'county', targetInstitution: 'xx市人民医院' },
    currentRole: 'county',
    currentInstitution: 'xx市人民医院',
  }), true)

  assert.equal(shouldShowNotificationToUser({
    notification: { targetRole: 'county', targetInstitution: 'xx市中医院' },
    currentRole: 'county',
    currentInstitution: 'xx市人民医院',
  }), false)
})

test('shows role-scoped notifications when no institution constraint is present', () => {
  assert.equal(shouldShowNotificationToUser({
    notification: { targetRole: 'admin' },
    currentRole: 'admin',
    currentInstitution: 'xx市医共体管理层',
  }), true)
})

test('builds EM referral code with date prefix', () => {
  assert.match(
    buildEmergencyReferralCode(new Date('2026-04-06T09:00:00Z')),
    /^EM20260406\d{4}$/
  )
})

test('builds emergency initial sms for normal emergency referrals', () => {
  const sms = buildEmergencyInitialSms({
    institutionName: 'xx市人民医院',
    targetDepartment: '心内科',
    emergencyDeptPhone: '0839-1234567',
    referralCode: 'EM2026040601',
    isGreenChannel: false,
  })

  assert.match(sms, /【转诊通知】/)
  assert.match(sms, /目标医院：xx市人民医院/)
  assert.match(sms, /接诊入口：急诊科（急诊优先接诊）/)
  assert.match(sms, /转诊单号：EM2026040601/)
})

test('builds emergency initial sms for green channel referrals', () => {
  const sms = buildEmergencyInitialSms({
    institutionName: 'xx市人民医院',
    targetDepartment: '心内科',
    emergencyDeptPhone: '0839-1234567',
    referralCode: 'EM2026040601',
    isGreenChannel: true,
  })

  assert.match(sms, /接诊入口：急诊科（已同步通知心内科）/)
})

test('builds emergency modify sms with update suffix', () => {
  const sms = buildEmergencyModifySms({
    institutionName: 'xx市人民医院',
    targetDepartment: '急诊科',
    emergencyDeptPhone: '0839-1234567',
    referralCode: 'EM2026040601',
    isGreenChannel: false,
  })

  assert.match(sms, /本条为更新通知，请以此为准/)
})

test('derives single-hospital emergency config when only one county hospital is signed', () => {
  const config = getEmergencyHospitalConfig([
    { id: 'inst001', name: 'xx市人民医院', type: 'county', status: '已签约' },
    { id: 'inst002', name: 'xx镇卫生院', type: 'primary', status: '已签约' },
  ])

  assert.equal(config.mode, 'single')
  assert.equal(config.hospitals.length, 1)
  assert.equal(config.hospitals[0].name, 'xx市人民医院')
})

test('shows emergency modify window info only to the initiating primary doctor', () => {
  assert.equal(
    canViewEmergencyModifyWindowInfo({
      currentRole: 'primary',
      currentUserName: '王医生',
      fromDoctor: '王医生',
      isEmergencyReferral: true,
      isUpward: true,
      status: '转诊中',
    }),
    true
  )
})

test('hides emergency modify window info from non-initiator roles', () => {
  assert.equal(
    canViewEmergencyModifyWindowInfo({
      currentRole: 'admin',
      currentUserName: '赵管理员',
      fromDoctor: '王医生',
      isEmergencyReferral: true,
      isUpward: true,
      status: '转诊中',
    }),
    false
  )

  assert.equal(
    canViewEmergencyModifyWindowInfo({
      currentRole: 'primary',
      currentUserName: '李医生',
      fromDoctor: '王医生',
      isEmergencyReferral: true,
      isUpward: true,
      status: '转诊中',
    }),
    false
  )
})

test('blocks ordinary county doctor from viewing emergency referral details when department does not match', () => {
  assert.equal(
    canViewEmergencyReferralDetail({
      currentRole: 'county',
      currentUser: {
        institution: 'xx市人民医院',
        dept: '内科',
        isPreferredDoctor: true,
      },
      referral: {
        is_emergency: true,
        toInstitution: 'xx市人民医院',
        toDept: '急诊科',
        referral_type: 'emergency',
      },
    }),
    false
  )
})

test('allows department head to view green channel detail when linked specialty matches', () => {
  assert.equal(
    canViewEmergencyReferralDetail({
      currentRole: 'county2',
      currentUser: {
        institution: 'xx市人民医院',
        dept: '心内科',
      },
      referral: {
        is_emergency: true,
        toInstitution: 'xx市人民医院',
        toDept: '急诊科',
        referral_type: 'green_channel',
        linkedSpecialty: '心内科',
      },
    }),
    true
  )
})

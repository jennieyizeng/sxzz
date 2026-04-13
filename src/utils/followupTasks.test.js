import test from 'node:test'
import assert from 'node:assert/strict'
import { ROLES } from '../data/mockData.js'
import { buildFollowupTaskDetail, buildScopedFollowups, filterFollowupsByAssignee, getFollowupCounts } from './followupTasks.js'

const referrals = [
  {
    id: 'REF1',
    type: 'downward',
    status: '已完成',
    toInstitution: 'xx市拱星镇卫生院',
    fromInstitution: 'xx市人民医院',
    toDoctor: '王医生',
    downwardAssignedDoctorId: 'u001',
    completedAt: '2099-04-01T08:00:00.000Z',
    patient: { name: '张三', age: 65, gender: '男' },
    diagnosis: { name: '高血压' },
    rehabPlan: { followupDate: '2099-04-10', indicators: ['血压'] },
    followUpTaskMeta: { status: 'in_progress', lastFollowupAt: '2099-04-05' },
  },
  {
    id: 'REF2',
    type: 'downward',
    status: '已完成',
    toInstitution: 'xx市拱星镇卫生院',
    fromInstitution: 'xx市人民医院',
    toDoctor: '李慧医生',
    downwardAssignedDoctorId: 'u101',
    completedAt: '2099-04-02T08:00:00.000Z',
    patient: { name: '李四', age: 58, gender: '女' },
    diagnosis: { name: '糖尿病' },
    rehabPlan: { followupDate: '2099-04-11', indicators: ['血糖'] },
  },
  {
    id: 'REF3',
    type: 'downward',
    status: '已完成',
    toInstitution: 'xx市汉旺镇卫生院',
    fromInstitution: 'xx市人民医院',
    toDoctor: '陈芳医生',
    downwardAssignedDoctorId: 'u103',
    completedAt: '2099-04-03T08:00:00.000Z',
    patient: { name: '王五', age: 72, gender: '男' },
    diagnosis: { name: '脑梗死' },
    rehabPlan: { followupDate: '2099-04-12', indicators: ['肢体活动度'] },
  },
]

test('shows only personal followup tasks for primary doctor', () => {
  const currentUser = {
    id: 'u001',
    name: '王医生',
    role: ROLES.PRIMARY,
    institution: 'xx市拱星镇卫生院',
  }

  const result = buildScopedFollowups(referrals, currentUser)

  assert.equal(result.length, 1)
  assert.equal(result[0].referralId, 'REF1')
  assert.equal(result[0].assignedDoctor, '王医生')
  assert.equal(result[0].downwardDate, '2099-04-01')
  assert.equal(result[0].lastFollowupAt, '2099-04-05')
  assert.equal(result[0].status, '随访中')
})

test('includes in-transit downward referrals after a followup task has already been created', () => {
  const currentUser = {
    id: 'u001',
    name: '王医生',
    role: ROLES.PRIMARY,
    institution: 'xx市拱星镇卫生院',
  }

  const result = buildScopedFollowups([
    {
      id: 'REF_ACTIVE_TASK',
      type: 'downward',
      status: '转诊中',
      toInstitution: 'xx市拱星镇卫生院',
      fromInstitution: 'xx市人民医院',
      toDoctor: '王医生',
      downwardAssignedDoctorId: 'u001',
      followUpTaskId: 'FU2026002',
      patient: { name: '陈九', age: 68, gender: '女' },
      diagnosis: { name: '脑梗死' },
      rehabPlan: { followupDate: '2099-04-18', indicators: ['血压', '肢体活动度'] },
    },
  ], currentUser)

  assert.equal(result.length, 1)
  assert.equal(result[0].referralId, 'REF_ACTIVE_TASK')
  assert.equal(result[0].status, '待随访')
})

test('shows all institution followup tasks for primary head', () => {
  const currentUser = {
    id: 'u001_head',
    name: '赵负责人',
    role: ROLES.PRIMARY_HEAD,
    institution: 'xx市拱星镇卫生院',
  }

  const result = buildScopedFollowups(referrals, currentUser)

  assert.equal(result.length, 2)
  assert.deepEqual(result.map(task => task.referralId), ['REF1', 'REF2'])
  assert.deepEqual(result.map(task => task.assignedDoctor), ['王医生', '李慧医生'])
})

test('derives followup status variants for overdue, completed, and lost tasks', () => {
  const currentUser = {
    id: 'u001_head',
    name: '赵负责人',
    role: ROLES.PRIMARY_HEAD,
    institution: 'xx市拱星镇卫生院',
  }

  const result = buildScopedFollowups([
    {
      id: 'REF_OVERDUE',
      type: 'downward',
      status: '已完成',
      toInstitution: 'xx市拱星镇卫生院',
      fromInstitution: 'xx市人民医院',
      toDoctor: '王医生',
      downwardAssignedDoctorId: 'u001',
      patient: { name: '赵六', age: 61, gender: '男' },
      diagnosis: { name: '冠心病' },
      rehabPlan: { followupDate: '2020-04-10', indicators: ['血压'] },
    },
    {
      id: 'REF_COMPLETED',
      type: 'downward',
      status: '已完成',
      toInstitution: 'xx市拱星镇卫生院',
      fromInstitution: 'xx市人民医院',
      toDoctor: '王医生',
      downwardAssignedDoctorId: 'u001',
      patient: { name: '孙七', age: 63, gender: '女' },
      diagnosis: { name: '糖尿病' },
      rehabPlan: { followupDate: '2099-04-10', indicators: ['血糖'] },
      followUpTaskMeta: { status: 'completed' },
    },
    {
      id: 'REF_LOST',
      type: 'downward',
      status: '已完成',
      toInstitution: 'xx市拱星镇卫生院',
      fromInstitution: 'xx市人民医院',
      toDoctor: '王医生',
      downwardAssignedDoctorId: 'u001',
      patient: { name: '周八', age: 58, gender: '男' },
      diagnosis: { name: '高血压' },
      rehabPlan: { followupDate: '2099-04-11', indicators: ['血压'] },
      followUpTaskMeta: { status: 'lost' },
    },
  ], currentUser)

  assert.deepEqual(result.map(task => task.status), ['已逾期', '已完成', '已失访'])
})

test('filters institution tasks by assigned doctor', () => {
  const followups = [
    { assignedDoctor: '王医生' },
    { assignedDoctor: '李慧医生' },
    { assignedDoctor: '王医生' },
  ]

  const result = filterFollowupsByAssignee(followups, '王医生')

  assert.equal(result.length, 2)
})

test('counts followup cards by current scope', () => {
  const followups = [
    { status: '待随访', isOverdue: false, isUrgent: false },
    { status: '已逾期', isOverdue: true, isUrgent: false },
    { status: '随访中', isOverdue: false, isUrgent: true },
    { status: '已完成', isOverdue: false, isUrgent: false },
    { status: '已失访', isOverdue: false, isUrgent: false },
  ]

  const counts = getFollowupCounts(followups)

  assert.deepEqual(counts, {
    all: 5,
    overdue: 1,
    urgent: 1,
    pending: 1,
  })
})

test('builds followup task detail from current scoped referral and task meta', () => {
  const currentUser = {
    id: 'u001',
    name: '王医生',
    role: ROLES.PRIMARY,
    institution: 'xx市拱星镇卫生院',
  }

  const detail = buildFollowupTaskDetail(referrals, currentUser, 'FUREF1')

  assert.equal(detail?.patient.name, '张三')
  assert.equal(detail?.chiefDiagnosis, '高血压')
  assert.equal(detail?.sourceHospital, 'xx市人民医院')
  assert.equal(detail?.responsibilityDoctor, '王医生')
  assert.equal(detail?.draft.method, '电话')
  assert.equal(detail?.draft.nextFollowupDate, '2099-04-10')
  assert.equal(detail?.followupGoals.find(item => item.label === '血压')?.monitored, true)
  assert.deepEqual(detail?.otherIndicators, [])
  assert.ok(Array.isArray(detail?.historyRecords))
})

test('prefers referral followup meta history over fallback mock task history', () => {
  const currentUser = {
    id: 'u001',
    name: '王医生',
    role: ROLES.PRIMARY,
    institution: 'xx市拱星镇卫生院',
  }

  const detail = buildFollowupTaskDetail([
    {
      id: 'REF_HISTORY',
      type: 'downward',
      status: '已完成',
      toInstitution: 'xx市拱星镇卫生院',
      fromInstitution: 'xx市人民医院',
      toDoctor: '王医生',
      downwardAssignedDoctorId: 'u001',
      completedAt: '2099-04-02T08:00:00.000Z',
      patient: { name: '赵九', age: 69, gender: '男' },
      diagnosis: { name: '脑梗死' },
      rehabPlan: { followupDate: '2099-04-16', indicators: ['血压', '言语功能'] },
      followUpTaskMeta: {
        status: 'pending',
        visitCount: 1,
        lastFollowupAt: '2099-04-06',
        nextVisitDate: '2099-04-16',
        records: [
          {
            id: 'history-1',
            type: 'unreachable',
            status: '未联系上',
            method: '电话',
            followupDate: '2099-04-06',
            patientStatus: '未联系上',
            metricSummary: '',
            summary: '电话无人接听',
            advice: '任务保持待随访，请后续继续联系患者。',
            nextFollowupDate: '2099-04-16',
            doctorName: '王医生',
          },
        ],
      },
    },
  ], currentUser, 'REF_HISTORY')

  assert.equal(detail?.status, '待随访')
  assert.equal(detail?.historyRecords.length, 1)
  assert.equal(detail?.historyRecords[0].status, '未联系上')
  assert.equal(detail?.lastFollowupAt, '2099-04-06')
})

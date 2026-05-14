import test from 'node:test'
import assert from 'node:assert/strict'

import { getDownwardDetailSections } from './downwardReferralDisplay.js'

test('prefers CHG-43 structured downward fields in detail sections', () => {
  const ref = {
    patient: {
      name: '张桂芳',
      gender: '女',
      age: 67,
      idCard: '510623195904101248',
      phone: '13800138000',
    },
    diagnosis: { code: 'I25.1', name: '冠状动脉粥样硬化性心脏病' },
    chiefComplaint: '患者因反复胸闷胸痛住院治疗，完善检查后当前病情平稳。',
    pastMedicalHistory: '冠心病、高血压病史多年。',
    allergyHistoryStatus: 'has_allergy',
    allergyHistoryDetail: '头孢类药物过敏。',
    handoffSummary: '下转后重点关注血压、心率与服药依从性。',
    westernMedications: [
      {
        drugName: '阿司匹林肠溶片',
        specification: '100mg',
        dose: '100mg',
        route: '口服',
        frequency: 'qd',
        duration: '连服3个月',
        remarks: '饭后服用',
        source: '健康档案带出',
        meta: {
          department: '心内科',
          doctor: '张医生',
          orderedAt: '2026/04/09',
          stoppedAt: '',
          orderType: '出院带药',
        },
      },
    ],
    chineseMedications: [
      {
        formulaName: '补阳还五汤',
        linkedNames: ['黄芪 30g', '当归 10g'],
        dosageForm: '汤剂',
        singleDose: '1剂',
        route: '水煎服',
        frequency: '每日1剂',
        duration: '14天',
        specialNote: '如胃部不适及时反馈',
        source: '手工新增',
        meta: {
          department: '中西医结合科',
          doctor: '赵医生',
          orderedAt: '2026/04/08',
          stoppedAt: '2026/04/15',
          orderType: '中药处方',
        },
      },
    ],
    medicationNotes: [
      '注意监测出血倾向',
      '按时复诊评估',
    ],
    followUpAdvice: '出院后2周复查心电图和血脂。',
    reviewSuggestions: [
      { itemName: '心电图', sampleType: '心脏', timing: '2周后复查', remarks: '如胸闷加重提前复查', source: '健康档案带出' },
    ],
    attachments: [
      { name: '出院小结.pdf', category: 'recommended', selected: true },
      { name: '心电图报告.pdf', category: 'recommended', selected: false },
      { name: '冠脉CTA报告.pdf', category: 'supplemental' },
    ],
    reason: '病情稳定',
    downwardTrigger: 'shared',
    rehabGoals: ['血压控制', '用药管理'],
    rehabPlan: { followupDate: '2026-04-27', indicators: ['血压', '心率'] },
    nursingPoints: ['体位要求'],
    warningSymptoms: ['呼吸困难'],
    doctorRemarks: '请基层团队每周回访一次。',
    toInstitution: 'xx市拱星镇卫生院',
    allocationMode: 'designated',
    designatedDoctorName: '王医生',
    patientDataSource: 'health_archive',
    consentSignedBy: 'family',
    consentProxyName: '李桂英',
    consentProxyRelation: '配偶',
    consentProxyReason: '患者授权',
    consentFileUrl: 'mock://consent/ref-1',
    latestDischargeAt: '2026/04/10 09:30',
    archiveUpdatedAt: '2026/04/17 10:24',
  }

  const consentInfo = {
    signedByLabel: '家属代签',
    fileName: '知情同意书.pdf',
    fileNames: ['知情同意书.pdf', '授权书.pdf'],
    isUploaded: true,
  }

  const sections = getDownwardDetailSections(ref, consentInfo)

  assert.deepEqual(sections.map(section => section.title), [
    '患者信息',
    '出院资料',
    '康复方案',
    '接收安排',
    '知情同意',
  ])
  assert.equal(sections[0].items.some(item => item.label === '数据来源'), false)
  assert.equal(sections[1].items.find(item => item.label === '出院诊断/主要诊断')?.value, '冠状动脉粥样硬化性心脏病')
  assert.deepEqual(sections[1].items.slice(0, 6).map(item => item.label), [
    '最近一次出院记录时间',
    '资料更新时间',
    '出院诊断/主要诊断',
    'ICD-10',
    '出院小结摘要',
    '主要既往史',
  ])
  assert.equal(sections[1].items.find(item => item.label === '最近一次出院记录时间')?.value, '2026/04/10 09:30')
  assert.equal(sections[1].items.find(item => item.label === '资料更新时间')?.value, '2026/04/17 10:24')
  assert.equal(sections[1].items.find(item => item.label === '主要既往史')?.value, '冠心病、高血压病史多年。')
  assert.equal(sections[1].items.find(item => item.label === '过敏史')?.value, '头孢类药物过敏。')
  assert.equal(sections[1].items.find(item => item.label === '下转交接摘要')?.value, '下转后重点关注血压、心率与服药依从性。')
  assert.deepEqual(sections[1].items.find(item => item.label === '继续用药')?.value, [
    '阿司匹林肠溶片 · 100mg · 100mg · 口服 · qd',
    '补阳还五汤 · 汤剂 · 1剂 · 水煎服 · 每日1剂\n  黄芪 30g\n  当归 10g',
  ])
  assert.equal(sections[1].items.find(item => item.label === '继续用药')?.value.some(item => item.includes('/') || item.includes('连服3个月') || item.includes('饭后服用')), false)
  const handFilledIndex = sections[1].items.findIndex(item => item.label === '继续用药')
  const hisHeadingIndex = sections[1].items.findIndex(item => item.label === '健康档案关联信息')
  const firstHisFieldIndex = sections[1].items.findIndex(item => item.label === '西药/中成药：开单科室')
  assert.equal(sections[1].items[hisHeadingIndex]?.type, 'subheading')
  assert.ok(hisHeadingIndex > handFilledIndex)
  assert.ok(firstHisFieldIndex > hisHeadingIndex)
  assert.equal(sections[1].items.find(item => item.label === '西药/中成药：开单科室')?.value, '心内科')
  assert.equal(sections[1].items.find(item => item.label === '西药/中成药：开单医生')?.value, '张医生')
  assert.equal(sections[1].items.find(item => item.label === '西药/中成药：下单日期')?.value, '2026/04/09')
  assert.equal(sections[1].items.find(item => item.label === '西药/中成药：医嘱类型')?.value, '出院带药')
  assert.equal(sections[1].items.find(item => item.label === '中药：开单科室')?.value, '中西医结合科')
  assert.equal(sections[1].items.find(item => item.label === '中药：开单医生')?.value, '赵医生')
  assert.equal(sections[1].items.find(item => item.label === '中药：停单日期')?.value, '2026/04/15')
  assert.equal(sections[1].items.find(item => item.label === '中药：医嘱类型')?.value, '中药处方')
  assert.deepEqual(sections[1].items.find(item => item.label === '用药注意事项')?.value, ['注意监测出血倾向', '按时复诊评估'])
  assert.equal(sections[1].items.find(item => item.label === '复查建议')?.value, '出院后2周复查心电图和血脂。')
  const medicationNotesIndex = sections[1].items.findIndex(item => item.label === '用药注意事项')
  const followUpAdviceIndex = sections[1].items.findIndex(item => item.label === '复查建议')
  const attachmentIndex = sections[1].items.findIndex(item => item.label === '推荐资料包')
  assert.ok(followUpAdviceIndex > medicationNotesIndex)
  assert.ok(attachmentIndex > followUpAdviceIndex)
  assert.deepEqual(sections[1].items.find(item => item.label === '推荐资料包')?.value, ['出院小结.pdf'])
  assert.deepEqual(sections[1].items.find(item => item.label === '补充资料')?.value, ['冠脉CTA报告.pdf'])
  assert.deepEqual(sections[2].items.find(item => item.label === '康复目标')?.value, ['血压控制', '用药管理'])
  assert.equal(sections[2].items.find(item => item.label === '下转触发方')?.value, '两者共同决定')
  assert.deepEqual(sections[2].items.find(item => item.label === '监测指标')?.value, ['血压', '心率'])
  assert.equal(sections[3].items.find(item => item.label === '接收方式')?.value, '指定接收医生')
  assert.equal(sections[4].items.find(item => item.label === '家属姓名')?.value, '李桂英')
  assert.deepEqual(sections[4].items.find(item => item.label === '已上传文件名')?.value, ['知情同意书.pdf', '授权书.pdf'])
})

test('downward detail uses not-filled display for empty medical history and allergy', () => {
  const sections = getDownwardDetailSections({
    patient: { name: '李四', gender: '女', age: 52 },
    diagnosis: { code: 'I63.9', name: '脑梗死' },
    chiefComplaint: '病情平稳',
    pastMedicalHistory: '',
    allergyHistoryStatus: '',
    allergyHistoryDetail: '',
    handoffSummary: '回基层继续康复',
  })

  const transferSection = sections.find(section => section.title === '出院资料')
  assert.equal(transferSection.items.find(item => item.label === '主要既往史')?.value, '未填写')
  assert.equal(transferSection.items.find(item => item.label === '过敏史')?.value, '未填写')
})

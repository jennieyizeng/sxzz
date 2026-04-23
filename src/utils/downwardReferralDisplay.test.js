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
      },
    ],
    chineseMedications: [
      {
        formulaName: '丹参颗粒',
        dosageForm: '颗粒剂',
        dailyDose: '每日2次',
        method: '温水冲服',
        duration: '14天',
        specialNote: '如胃部不适及时反馈',
        source: '手工新增',
      },
    ],
    medicationNotes: [
      '注意监测出血倾向',
      '按时复诊评估',
    ],
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
    '转出资料',
    '基层执行方案',
    '接收安排',
    '知情同意',
  ])
  assert.equal(sections[0].items.some(item => item.label === '数据来源'), false)
  assert.equal(sections[1].items.find(item => item.label === '出院诊断/主要诊断')?.value, '冠状动脉粥样硬化性心脏病')
  assert.equal(sections[1].items.find(item => item.label === '下转交接摘要')?.value, '下转后重点关注血压、心率与服药依从性。')
  assert.equal(sections[1].items.find(item => item.label === '继续用药')?.value.some(item => item.includes('阿司匹林肠溶片')), true)
  assert.equal(sections[1].items.find(item => item.label === '继续用药')?.value.some(item => item.includes('丹参颗粒')), true)
  assert.deepEqual(sections[1].items.find(item => item.label === '用药注意事项')?.value, ['注意监测出血倾向', '按时复诊评估'])
  assert.equal(sections[1].items.find(item => item.label === '复查建议')?.value.some(item => item.includes('心电图')), true)
  assert.deepEqual(sections[1].items.find(item => item.label === '推荐资料包')?.value, ['出院小结.pdf'])
  assert.deepEqual(sections[1].items.find(item => item.label === '补充资料')?.value, ['冠脉CTA报告.pdf'])
  assert.deepEqual(sections[2].items.find(item => item.label === '康复目标')?.value, ['血压控制', '用药管理'])
  assert.equal(sections[2].items.find(item => item.label === '下转触发方')?.value, '两者共同决定')
  assert.deepEqual(sections[2].items.find(item => item.label === '监测指标')?.value, ['血压', '心率'])
  assert.equal(sections[3].items.find(item => item.label === '接收方式')?.value, '指定接收医生')
  assert.equal(sections[4].items.find(item => item.label === '家属姓名')?.value, '李桂英')
  assert.deepEqual(sections[4].items.find(item => item.label === '已上传文件名')?.value, ['知情同意书.pdf', '授权书.pdf'])
})

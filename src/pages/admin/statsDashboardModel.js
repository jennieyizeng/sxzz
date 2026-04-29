export const timeRangeOptions = ['本周', '本月', '上月', '本季度', '本年度']

export const monitoringCards = [
  {
    title: '当前待接收判断',
    value: 8,
    unit: '例',
    description: '已提交但尚未完成接收判断的转诊申请',
    actionLabel: '查看列表',
    route: '/admin/ledger',
    tone: 'cyan',
  },
  {
    title: '当前待接诊安排',
    value: 5,
    unit: '例',
    description: '医生已确认接收，但转诊中心尚未完成接诊安排的转诊申请',
    actionLabel: '查看列表',
    route: '/admin/ledger',
    tone: 'blue',
  },
  {
    title: '急诊/绿通待补录',
    value: 3,
    unit: '例',
    description: '急诊或绿通转诊中，仍待补录实际接诊信息的记录',
    actionLabel: '查看列表',
    route: '/admin/ledger',
    tone: 'amber',
  },
  {
    title: '当前异常预警',
    value: 14,
    unit: '项',
    description: '超时、拒绝、上报失败、知情同意待补传等需关注事项',
    hoverDescription: '当前存在至少一个异常标签的转诊单数，按转诊单去重统计。包括超时、上报失败、知情同意待补传、急诊/绿通补录超时等。',
    actionLabel: '查看异常',
    route: '/admin/anomaly',
    tone: 'red',
  },
]

export const coreMetrics = [
  {
    label: '转诊申请总量',
    value: 245,
    unit: '例',
    sub: '基层→县级 156｜县级→基层 89',
    trend: '↑12%',
    trendTone: 'up',
  },
  {
    label: '综合完成率',
    value: '91.0',
    unit: '%',
    sub: '已完成 223 例',
    trend: '↑3%',
    trendTone: 'up',
  },
  {
    label: '平均闭环时长',
    value: '18.5',
    unit: 'h',
    sub: '仅统计已完成转诊',
    trend: '↓8%',
    trendTone: 'downGood',
  },
  {
    label: '转诊流向结构',
    value: '1.75 : 1',
    unit: '',
    sub: '基层→县级 : 县级→基层 = 156 : 89',
    trend: '持平',
    trendTone: 'flat',
  },
]

export const qualityMetrics = [
  {
    label: '平均响应时长',
    value: '2.3',
    unit: 'h',
    sub: '普通转诊进入待接收判断后，到医生受理或管理员指派完成的平均时长',
  },
  {
    label: '平均接收时长',
    value: '3.8',
    unit: 'h',
    sub: '县级→基层方向，从提交到基层确认接收的平均时长',
  },
  {
    label: '超时率',
    value: '4.5',
    unit: '%',
    sub: '发生任一超时事件的转诊单数 / 有效申请数',
  },
  {
    label: '急诊/绿通 4h 告警数',
    value: '0 / 13',
    unit: '',
    sub: '本期急诊/绿通转诊 13 例，4h 未响应告警 0 例',
  },
]

export const institutionRows = [
  {
    name: 'xx市人民医院',
    type: '县级医院',
    inflow: 156,
    outflow: 89,
    initiatedRejected: 3,
    receivedRejected: 5,
    completionRate: '93.3%',
    avgClosureHours: '16.8h',
    anomalies: 4,
  },
  {
    name: 'xx市中医院',
    type: '县级医院',
    inflow: 42,
    outflow: 18,
    initiatedRejected: 1,
    receivedRejected: 2,
    completionRate: '92.1%',
    avgClosureHours: '17.6h',
    anomalies: 2,
  },
  {
    name: 'xx市拱星镇卫生院',
    type: '基层机构',
    inflow: 52,
    outflow: 89,
    initiatedRejected: 6,
    receivedRejected: 2,
    completionRate: '89.1%',
    avgClosureHours: '20.4h',
    anomalies: 5,
  },
  {
    name: 'xx市汉旺镇卫生院',
    type: '基层机构',
    inflow: 37,
    outflow: 67,
    initiatedRejected: 4,
    receivedRejected: 1,
    completionRate: '90.3%',
    avgClosureHours: '19.2h',
    anomalies: 3,
  },
]

export const diagnosisTabs = ['全部', '基层→县级', '县级→基层']

const allDiagnosisRows = [
  { rank: 1, code: 'I10', name: '原发性高血压', count: 42, pct: '17.1%' },
  { rank: 2, code: 'E11.9', name: '2型糖尿病不伴并发症', count: 31, pct: '12.7%' },
  { rank: 3, code: 'J06.9', name: '急性上呼吸道感染', count: 25, pct: '10.2%' },
  { rank: 4, code: 'I63.9', name: '脑梗死', count: 18, pct: '7.3%' },
  { rank: 5, code: 'J44.1', name: '慢性阻塞性肺疾病急性加重', count: 14, pct: '5.7%' },
  { rank: 6, code: 'I25.1', name: '动脉粥样硬化性心脏病', count: 12, pct: '4.9%' },
  { rank: 7, code: 'S72.0', name: '股骨颈骨折', count: 11, pct: '4.5%' },
  { rank: 8, code: 'K29.7', name: '慢性胃炎', count: 10, pct: '4.1%' },
  { rank: 9, code: 'I50.9', name: '心力衰竭', count: 9, pct: '3.7%' },
  { rank: 10, code: 'R55', name: '晕厥和虚脱', count: 8, pct: '3.3%' },
]

export const diagnosisRowsByTab = {
  全部: allDiagnosisRows,
  '基层→县级': allDiagnosisRows.map(row => ({
    ...row,
    count: Math.max(3, Math.round(row.count * 0.64)),
  })),
  '县级→基层': allDiagnosisRows.map(row => ({
    ...row,
    count: Math.max(2, Math.round(row.count * 0.36)),
  })),
}

export const receivingDeptRejectTop = [
  { institution: 'xx市人民医院', dept: '心血管科', rejected: 5, rate: '6.8%', reason: '当日专科号源已满' },
  { institution: 'xx市人民医院', dept: '神经内科', rejected: 4, rate: '6.1%', reason: '资料不完整，需补充影像' },
  { institution: 'xx市拱星镇卫生院', dept: '全科', rejected: 3, rate: '5.4%', reason: '家庭医生服务容量不足' },
  { institution: 'xx市中医院', dept: '骨伤科', rejected: 2, rate: '4.9%', reason: '床位暂满' },
  { institution: 'xx市汉旺镇卫生院', dept: '全科', rejected: 2, rate: '4.2%', reason: '患者居住地不在服务范围' },
]

export const timeoutStageDistribution = [
  { name: '待内审超时', value: 6 },
  { name: '待受理超时', value: 5 },
  { name: '接诊安排超时', value: 4 },
  { name: '接诊确认超时', value: 3 },
  { name: '转回接收超时', value: 2 },
]

export const greenChannelDistribution = [
  { name: '胸痛中心', value: 4 },
  { name: '卒中中心', value: 3 },
  { name: '创伤中心', value: 2 },
  { name: '危重孕产妇救治中心', value: 1 },
  { name: '危重儿童和新生儿救治中心', value: 1 },
  { name: '其他', value: 2 },
]

export const keyDiseaseTabs = ['慢病管理', '分级诊疗重点病种', '临床路径病种']

export const keyDiseaseRowsByTab = {
  慢病管理: [
    { disease: '原发性高血压', icd: 'I10', count: 42, pct: '17.1%' },
    { disease: '2型糖尿病不伴并发症', icd: 'E11.9', count: 31, pct: '12.7%' },
    { disease: '慢性阻塞性肺疾病急性加重', icd: 'J44.1', count: 14, pct: '5.7%' },
    { disease: '慢性肾脏病', icd: 'N18.9', count: 8, pct: '3.3%' },
  ],
  分级诊疗重点病种: [
    { disease: '脑梗死', icd: 'I63.9', count: 18, pct: '7.3%' },
    { disease: '动脉粥样硬化性心脏病', icd: 'I25.1', count: 12, pct: '4.9%' },
    { disease: '股骨颈骨折', icd: 'S72.0', count: 11, pct: '4.5%' },
    { disease: '心力衰竭', icd: 'I50.9', count: 9, pct: '3.7%' },
  ],
  临床路径病种: [
    { disease: '肺炎', icd: 'J18.9', count: 16, pct: '6.5%' },
    { disease: '胆囊结石伴急性胆囊炎', icd: 'K80.2', count: 10, pct: '4.1%' },
    { disease: '股骨颈骨折', icd: 'S72.0', count: 9, pct: '3.7%' },
    { disease: '感染性腹泻', icd: 'A09', count: 7, pct: '2.9%' },
  ],
}

export const problemSections = [
  '成员机构运行对照',
  '超时环节分布',
  '接收科室拒绝 Top 5',
  '高频转诊诊断 Top 10',
  '绿通病种触发分布',
  '重点管理病种监测',
]

export const timeRangeOptions = ['本周', '本月', '上月', '本季度', '本年度']

export const realtimeMonitoringCards = [
  {
    title: '当前待受理转入',
    value: 8,
    unit: '例',
    description: '基层机构转诊至本机构，仍待县级医生受理的申请',
    tone: 'cyan',
  },
  {
    title: '当前待接收转出',
    value: 5,
    unit: '例',
    description: '本机构转出至基层，仍待基层机构确认接收的申请',
    tone: 'blue',
  },
  {
    title: '急诊/绿通',
    value: 3,
    unit: '例',
    description: '当前急诊/绿通转入数',
    tone: 'amber',
  },
  {
    title: '当前异常预警',
    value: 14,
    unit: '项',
    description: '超时督办中需关注的异常事项',
    tone: 'red',
  },
]

export const periodMetrics = [
  {
    label: '转入',
    value: 156,
    unit: '例',
    sub: '基层机构转诊至本机构',
    trend: '↑12%',
  },
  {
    label: '转出',
    value: 89,
    unit: '例',
    sub: '本机构转诊至基层机构',
    trend: '↑8%',
  },
  {
    label: '综合完成率',
    value: '91.0',
    unit: '%',
    sub: '已完成 223 例',
    trend: '↑3%',
  },
  {
    label: '拒绝率',
    value: '8.0',
    unit: '%',
    sub: '转入拒绝率 6.8%｜转出拒绝率 9.4%',
    trend: '↓1.2%',
  },
  {
    label: '平均响应时长',
    value: '2.3',
    unit: 'h',
    sub: '转入申请进入待受理后至完成受理的平均时长',
    trend: '↓0.6h',
  },
  {
    label: '平均接收时长',
    value: '3.8',
    unit: 'h',
    sub: '转出申请提交后至基层确认接收的平均时长',
    trend: '↓0.4h',
  },
]

export const monthlyTrendTitle = '月度转诊趋势'
export const monthlyTrendSubtitle = '近6个月转入/转出量对比'
export const monthlyTrend = [
  { month: '10月', inbound: 18, outbound: 9 },
  { month: '11月', inbound: 24, outbound: 13 },
  { month: '12月', inbound: 21, outbound: 11 },
  { month: '1月', inbound: 28, outbound: 15 },
  { month: '2月', inbound: 31, outbound: 19 },
  { month: '3月', inbound: 34, outbound: 22 },
]

export const institutionDetailIntro = '转入本机构/本机构转出的数据'
export const institutionDetailColumns = [
  { key: 'name', label: '机构名称' },
  { key: 'referredToHospital', label: '转诊至本机构数' },
  { key: 'referredToHospitalCompleted', label: '转诊至本机构完成数' },
  { key: 'avgResponseHours', label: '平均响应时长' },
  { key: 'inboundRejected', label: '发起申请被拒数' },
  { key: 'outboundFromHospital', label: '本机构转出数' },
  { key: 'avgReceiveHours', label: '平均接收时长' },
  { key: 'outboundRejected', label: '发起申请被拒数' },
]

export const institutionDetailRows = [
  {
    name: 'xx市拱星镇卫生院',
    type: '基层机构',
    referredToHospital: 89,
    referredToHospitalCompleted: 82,
    avgResponseHours: '2.1h',
    inboundRejected: 6,
    outboundFromHospital: 52,
    avgReceiveHours: '3.5h',
    outboundRejected: 2,
  },
  {
    name: 'xx市汉旺镇卫生院',
    type: '基层机构',
    referredToHospital: 67,
    referredToHospitalCompleted: 60,
    avgResponseHours: '2.6h',
    inboundRejected: 4,
    outboundFromHospital: 37,
    avgReceiveHours: '4.1h',
    outboundRejected: 1,
  },
]

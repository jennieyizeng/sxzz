// Assumption: 院长仅查看本院数据，全机构数据由管理员在考核报表页查看
// 本页直接显示最新月度报表数据，无「生成报表」按钮，仅提供 [导出 PDF] [打印]

// ── 从 admin/ExamReport 复用的数据结构 ──
// 完整明细（与 ExamReport.MOCK_EXAM 数据口径相同）
const MOCK_EXAM_ALL = [
  { name: 'xx市人民医院', type: '县级医院', upSend: 0, downRecv: 45, completed: 42, rate: '93.3%', avgResp: 2.1, timeout: 1, rejected: 2 },
  { name: 'xx市拱星镇卫生院', type: '乡镇卫生院', upSend: 28, downRecv: 18, completed: 41, rate: '89.1%', avgResp: 3.5, timeout: 3, rejected: 4 },
  { name: 'xx市汉旺镇卫生院', type: '乡镇卫生院', upSend: 19, downRecv: 12, completed: 28, rate: '90.3%', avgResp: 2.8, timeout: 2, rejected: 3 },
  { name: 'xx市清平乡卫生院', type: '乡镇卫生院', upSend: 12, downRecv: 8, completed: 18, rate: '90.0%', avgResp: 3.2, timeout: 1, rejected: 2 },
  { name: 'xx市九龙镇卫生院', type: '乡镇卫生院', upSend: 8, downRecv: 5, completed: 12, rate: '92.3%', avgResp: 2.9, timeout: 1, rejected: 1 },
]

// 本院行：只保留xx市人民医院
const OWN_ROW = MOCK_EXAM_ALL.filter(r => r.name.includes('xx市人民医院'))

// 汇总行（全机构，供参考对比）
const SUMMARY_ALL = {
  name: '全院网汇总',
  type: '—',
  upSend: MOCK_EXAM_ALL.reduce((s, r) => s + r.upSend, 0),
  downRecv: MOCK_EXAM_ALL.reduce((s, r) => s + r.downRecv, 0),
  completed: MOCK_EXAM_ALL.reduce((s, r) => s + r.completed, 0),
  rate: '91.0%',
  avgResp: (MOCK_EXAM_ALL.reduce((s, r) => s + r.avgResp, 0) / MOCK_EXAM_ALL.length).toFixed(1),
  timeout: MOCK_EXAM_ALL.reduce((s, r) => s + r.timeout, 0),
  rejected: MOCK_EXAM_ALL.reduce((s, r) => s + r.rejected, 0),
}

// ── 指标汇总（本院数据）──
// Assumption: 指标数值为本院汇总口径，与 ExamReport.METRICS 数据相同，实际应由后端按机构过滤
const METRICS = [
  { label: '上转总量', value: 0, unit: '例', color: '#2563eb', bg: '#eff6ff' },
  { label: '下转总量', value: 45, unit: '例', color: '#16a34a', bg: '#f0fdf4' },
  { label: '完成率', value: '93.3', unit: '%', color: '#0BBECF', bg: '#E0F6F9' },
  { label: '拒绝率', value: '4.3', unit: '%', color: '#d97706', bg: '#fffbeb' },
  { label: '超时率', value: '2.4', unit: '%', color: '#dc2626', bg: '#fef2f2' },
  { label: '平均响应时长', value: '2.1', unit: 'h', color: '#7c3aed', bg: '#f5f3ff' },
  { label: '知情同意签署率', value: '99.1', unit: '%', color: '#0891b2', bg: '#ecfeff' },
  { label: '数据上报完成率', value: '97.8', unit: '%', color: '#065f46', bg: '#ecfdf5' },
]

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

export default function DirectorReport() {
  const handleExportPDF = () => alert('已开始导出 PDF，请稍后查看下载结果。')
  const handlePrint = () => window.print()

  return (
    <div className="p-5">
      {/* 页头 */}
      <div className="mb-4">
        {/* 上下文标识 */}
        <div className="text-xs text-gray-400 mb-1">xx市人民医院</div>
        <h2 className="text-base font-semibold text-gray-800">考核报表</h2>
        <div className="text-xs text-gray-400 mt-0.5">xx市人民医院 · 最新月度报表</div>
      </div>

      {/* 报表信息行 */}
      <div
        className="rounded-lg px-4 py-3 mb-4 grid grid-cols-3 gap-4 text-sm"
        style={{ background: '#E0F6F9', border: '1px solid #C8EEF3' }}
      >
        <div>
          <span className="text-gray-500 text-xs">统计周期</span>
          <div className="font-medium text-gray-800 mt-0.5">2026年3月</div>
        </div>
        <div>
          <span className="text-gray-500 text-xs">生成时间</span>
          <div className="font-medium text-gray-800 mt-0.5">2026-03-19 00:00</div>
        </div>
        <div>
          <span className="text-gray-500 text-xs">数据状态</span>
          <div className="mt-0.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">已审核</span>
          </div>
        </div>
      </div>

      {/* 本院数据标识 */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: '#E0F6F9', color: '#0892a0' }}
        >
          本院数据
        </span>
        <span className="text-xs text-gray-400">xx市人民医院</span>
      </div>

      {/* 指标汇总卡片 2行4列 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {METRICS.map(m => (
          <div
            key={m.label}
            className="rounded-xl p-4"
            style={{ background: m.bg, border: `1px solid ${m.bg}` }}
          >
            <div className="text-2xl font-bold" style={{ color: m.color }}>
              {m.value}
              <span className="text-sm font-normal ml-1" style={{ color: m.color, opacity: 0.7 }}>{m.unit}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* 本院机构明细表 */}
      <div className="bg-white rounded-xl overflow-hidden mb-4" style={{ border: '1px solid #DDF0F3' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#F8FDFE', borderBottom: '1px solid #E0F6F9' }}>
          <div className="text-sm font-semibold text-gray-800">本院明细</div>
          <div className="text-xs text-gray-400">
            {/* Assumption: 院长仅查看本院机构行，无法查看其他机构明细 */}
            仅显示本院数据，全机构明细请联系管理员
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['机构名称', '机构类型', '上转发起', '下转接收', '完成数', '完成率', '平均响应时长', '超时数', '拒绝数'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 本院行 */}
              {OWN_ROW.map((row, i) => (
                <tr
                  key={row.name}
                  style={{ borderBottom: '1px solid #EEF7F9', background: i % 2 === 0 ? '#fff' : '#FAFEFE' }}
                >
                  <td className={TD + ' font-medium text-gray-800'}>{row.name}</td>
                  <td className={TD}>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                      {row.type}
                    </span>
                  </td>
                  <td className={TD + ' text-center'}>{row.upSend}</td>
                  <td className={TD + ' text-center'}>{row.downRecv}</td>
                  <td className={TD + ' text-center font-medium'} style={{ color: '#0892a0' }}>{row.completed}</td>
                  <td className={TD + ' text-center'}>
                    <span className="text-xs font-semibold" style={{ color: parseFloat(row.rate) >= 90 ? '#16a34a' : '#d97706' }}>
                      {row.rate}
                    </span>
                  </td>
                  <td className={TD + ' text-center text-xs'}>{row.avgResp}h</td>
                  <td className={TD + ' text-center text-xs'}>
                    <span className={row.timeout > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>{row.timeout}</span>
                  </td>
                  <td className={TD + ' text-center text-xs'}>
                    <span className={row.rejected > 0 ? 'text-red-500' : 'text-gray-400'}>{row.rejected}</span>
                  </td>
                </tr>
              ))}
              {/* 全院网汇总行（参考） */}
              <tr style={{ background: '#F0FBFC', borderTop: '2px solid #C8EEF3' }}>
                <td className={TD + ' font-bold text-gray-600 text-xs'}>{SUMMARY_ALL.name}</td>
                <td className={TD + ' text-gray-400 text-xs'}>{SUMMARY_ALL.type}</td>
                <td className={TD + ' text-center font-bold text-xs'} style={{ color: '#0BBECF' }}>{SUMMARY_ALL.upSend}</td>
                <td className={TD + ' text-center font-bold text-xs'} style={{ color: '#0BBECF' }}>{SUMMARY_ALL.downRecv}</td>
                <td className={TD + ' text-center font-bold text-xs'} style={{ color: '#0BBECF' }}>{SUMMARY_ALL.completed}</td>
                <td className={TD + ' text-center font-bold text-xs text-green-700'}>{SUMMARY_ALL.rate}</td>
                <td className={TD + ' text-center text-xs font-bold'}>{SUMMARY_ALL.avgResp}h</td>
                <td className={TD + ' text-center font-bold text-xs text-orange-600'}>{SUMMARY_ALL.timeout}</td>
                <td className={TD + ' text-center font-bold text-xs text-red-500'}>{SUMMARY_ALL.rejected}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between bg-white rounded-xl px-5 py-3" style={{ border: '1px solid #DDF0F3' }}>
        <div className="text-xs text-gray-400">
          报表数据截止：2026-03-19 00:00 &middot;{' '}
          {/* Assumption: 院长仅查看本院数据，全机构数据由管理员在考核报表页查看 */}
          <span className="text-orange-500">当前仅展示本院数据</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-sm font-medium text-white"
            style={{ background: '#0BBECF' }}
          >
            导出 PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            打印
          </button>
        </div>
      </div>
    </div>
  )
}

import { createElement } from 'react'

function ReportDataTable({ rows }) {
  return (
    <table className="w-full border-collapse text-sm border border-gray-200">
      <tbody>
        {rows.map(row => (
          <tr key={row.map(item => item.label).join('-')}>
            {row.length === 1 ? (
              <>
                <td className="w-[120px] border border-gray-200 bg-gray-50 px-3 py-3 text-right text-xs text-gray-500">
                  {row[0].label}
                </td>
                <td colSpan={3} className="border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
                  {row[0].value || '—'}
                </td>
              </>
            ) : row.map(item => (
              <FragmentCell key={item.label} label={item.label} value={item.value} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FragmentCell({ label, value }) {
  return (
    <>
      <td className="w-[120px] border border-gray-200 bg-gray-50 px-3 py-3 text-right text-xs text-gray-500">
        {label}
      </td>
      <td className="border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
        {value || '—'}
      </td>
    </>
  )
}

function HistoryResponse({ item }) {
  if (item.status === 'success') {
    return <div className="text-xs text-green-600 mt-1">SUCCESS · 确认码 {item.responseCode || '—'}</div>
  }
  if (item.status === 'failed') {
    return <div className="text-xs text-red-600 mt-1">{item.responseCode || 'ERROR'} · {item.responseMessage || '上报失败'}</div>
  }
  return <div className="text-xs text-gray-400 mt-1">等待上报</div>
}

export default function DataReportDetailModal({ detail, loading, onClose, StatusTag: ReportStatusTag }) {
  const patientInfo = !loading && detail
    ? [detail.patientName, detail.patientAge ? `${detail.patientAge}岁` : '', detail.patientGender].filter(Boolean).join(' · ')
    : ''
  const diagnosis = !loading && detail
    ? [detail.g01Fields.icd10, detail.g01Fields.diagnosisName].filter(Boolean).join(' ')
    : ''
  const reportRows = !loading && detail ? [
    [
      { label: '转诊单号', value: detail.referralNo },
      { label: '患者信息', value: patientInfo },
    ],
    [
      { label: '患者证件号', value: detail.g01Fields.patientIdMasked },
      { label: '转诊类型', value: detail.g01Fields.direction },
    ],
    [
      { label: '诊断（ICD-10）', value: diagnosis },
      { label: '上报状态', value: createElement(ReportStatusTag, { status: detail.reportStatus }) },
    ],
    [
      { label: '上报机构代码', value: detail.g01Fields.orgCode },
      { label: '发起机构', value: detail.g01Fields.fromOrgName },
    ],
    [
      { label: '转入机构', value: detail.g01Fields.toOrg },
      { label: '完成时间', value: detail.g01Fields.completedAt },
    ],
    [
      { label: '首次上报时间', value: detail.g01Fields.firstReportedAt },
    ],
  ] : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full overflow-hidden" style={{ width: 680 }}>
        <div className="px-5 py-3 flex items-center justify-end gap-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="text-base font-semibold text-gray-800">正在加载上报详情...</div>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-50"
              aria-label="关闭上报详情"
            >
              ×
            </button>
          </div>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">正在读取健康通上报明细...</div>
          ) : (
            <div className="space-y-5">
              <section>
                <div className="text-sm font-semibold text-gray-800 mb-3">上报数据</div>
                <ReportDataTable rows={reportRows} />
              </section>

              <section>
                <div className="text-sm font-semibold text-gray-800 mb-3">上报历史</div>
                {detail.history.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">暂无上报记录</div>
                ) : (
                  <div className="space-y-3">
                    {detail.history.map((item, index) => (
                      <div key={`${item.timestamp}-${item.action}`} className="flex gap-3">
                        <div className="flex flex-col items-center pt-1">
                          <span className="w-2 h-2 rounded-full" style={{ background: item.status === 'success' ? '#16a34a' : item.status === 'failed' ? '#dc2626' : '#9ca3af' }} />
                          {index < detail.history.length - 1 && <span className="w-px h-full min-h-10 bg-gray-100 mt-1" />}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs text-gray-400">{item.timestamp}</div>
                            {createElement(ReportStatusTag, { status: item.status })}
                          </div>
                          <div className="text-sm text-gray-800 mt-1">{item.action}</div>
                          <HistoryResponse item={item} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

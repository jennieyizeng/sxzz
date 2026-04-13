export default function RehabPlanSection({ data }) {
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-800">{data.title || '转诊方案'}</div>

      {Array.isArray(data.medications) && data.medications.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            用药清单
          </div>
          <div className="grid grid-cols-3 text-xs text-gray-400 px-4 py-2 bg-gray-50 border-b border-gray-100">
            <span>药品名称</span>
            <span>规格</span>
            <span>用法用量</span>
          </div>
          {data.medications.map((med, index) => (
            <div key={`${med.name}-${index}`} className="grid grid-cols-3 px-4 py-2.5 text-sm border-b border-gray-50 last:border-0">
              <span className="font-medium text-gray-800">{med.name || '—'}</span>
              <span className="text-gray-600">{med.spec || '—'}</span>
              <span className="text-gray-600">{med.usage || '—'}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data.sections || []).map(item => (
          <div key={`${item.label}-${item.value}`} className="rounded-xl p-4" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <div className="text-xs text-gray-400 mb-1">{item.label}</div>
            <div className="text-sm text-gray-700 leading-6 whitespace-pre-line">{item.value || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

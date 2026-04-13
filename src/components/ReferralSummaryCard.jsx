export default function ReferralSummaryCard({ summary }) {
  if (!summary || !summary.items || summary.items.length === 0) return null

  return (
    <div className="rounded-xl p-4" style={{ background: '#F5FCFD', border: '1px solid #DDF0F3' }}>
      <div className="text-sm font-semibold text-gray-800 mb-3">{summary.title || '转诊摘要'}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summary.items.map(item => (
          <div key={`${item.label}-${item.value}`}>
            <div className="text-xs text-gray-400 mb-1">{item.label}</div>
            <div className="text-sm text-gray-800 leading-6 whitespace-pre-line">{item.value || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

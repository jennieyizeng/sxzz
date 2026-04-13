export default function ClinicalStructuredSection({ data }) {
  if (!data || !data.sections || data.sections.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-800">{data.title || '结构化临床资料'}</div>
      {data.sections.map(section => (
        <div key={section.title} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            {section.title}
          </div>
          <div className="p-4 space-y-3">
            {section.items.map(item => (
              <div key={`${section.title}-${item.label}-${item.value}`}>
                <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                <div className="text-sm text-gray-700 leading-6 whitespace-pre-line">{item.value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

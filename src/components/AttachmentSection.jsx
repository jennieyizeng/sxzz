function getAttachmentMeta(name = '') {
  const lowerName = String(name).toLowerCase()

  if (lowerName.endsWith('.pdf')) return { icon: '📄', type: 'PDF' }
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png')) {
    return { icon: '🖼️', type: '图片' }
  }

  return { icon: '📎', type: '附件' }
}

export default function AttachmentSection({ attachments, emptyText = '暂无附件资料' }) {
  if (!attachments || attachments.length === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <div className="text-sm font-semibold text-gray-800 mb-2">附件资料</div>
        <div className="text-sm text-gray-400">{emptyText}</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800">附件资料</div>
        <div className="text-xs text-gray-400">共 {attachments.length} 份材料</div>
      </div>
      <div className="space-y-2">
        {attachments.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F3F4F6' }}>
                <span>{getAttachmentMeta(item.name).icon}</span>
              </div>
              <div className="min-w-0">
                <div className="font-medium text-gray-800 truncate">{item.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {item.source || '转诊附件'} · {item.size || '—'} · {getAttachmentMeta(item.name).type}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.tag && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {item.tag}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

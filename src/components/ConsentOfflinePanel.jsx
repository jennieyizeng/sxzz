import { CONSENT_ACCEPT, downloadConsentTemplate } from '../utils/consentUpload'

export default function ConsentOfflinePanel({
  signedBy,
  onSignedByChange,
  file,
  onSelectFile,
  onRemoveFile,
  error,
  showSignerSelector = true,
  uploadLabel = '上传已签署的知情同意书',
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border px-4 py-4" style={{ background: '#F8FDFE', borderColor: '#DDF0F3' }}>
        <div className="text-sm font-semibold text-gray-800 mb-2">线下签署流程</div>
        <div className="text-sm text-gray-600 leading-6">
          下载模板后线下打印签字，再将签署文件拍照或扫描上传至系统归档。
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          <button
            type="button"
            onClick={() => downloadConsentTemplate('pdf')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#0BBECF' }}
          >
            下载 PDF 模板
          </button>
          <button
            type="button"
            onClick={() => downloadConsentTemplate('word')}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-white"
          >
            下载 Word 模板
          </button>
        </div>
      </div>

      {showSignerSelector && (
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">签署人</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'patient', label: '患者本人' },
              { value: 'family', label: '家属代签' },
            ].map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSignedByChange(option.value)}
                className="rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
                style={signedBy === option.value
                  ? { borderColor: '#0BBECF', background: '#F0FBFC', color: '#0F766E' }
                  : { borderColor: '#E5E7EB', background: '#fff', color: '#374151' }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-[#0BBECF] transition-colors">
        {!file ? (
          <label className="flex flex-col items-center gap-2 cursor-pointer">
            <span className="text-2xl">📎</span>
            <span className="text-sm text-gray-700 font-medium">{uploadLabel}</span>
            <span className="text-xs text-gray-400">支持 JPG / PNG / PDF，单文件 ≤ 10MB</span>
            <span
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#0BBECF' }}
            >
              选择已签署文件
            </span>
            <input
              type="file"
              accept={CONSENT_ACCEPT}
              className="hidden"
              onChange={event => onSelectFile(event.target.files?.[0] || null)}
            />
          </label>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-gray-800">{file.name}</div>
              <div className="text-xs text-gray-400 mt-1">{file.size}</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs cursor-pointer" style={{ color: '#0BBECF' }}>
                重新选择
                <input
                  type="file"
                  accept={CONSENT_ACCEPT}
                  className="hidden"
                  onChange={event => onSelectFile(event.target.files?.[0] || null)}
                />
              </label>
              <button
                type="button"
                onClick={onRemoveFile}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                删除
              </button>
            </div>
          </div>
        )}
      </div>

      {!file && !error && (
        <div className="rounded-lg px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200">
          上传签署文件后，“下一步”会自动解锁。
        </div>
      )}

      {error && (
        <div className="rounded-lg px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200">
          {error}
        </div>
      )}
    </div>
  )
}

import { CONSENT_ACCEPT, downloadConsentTemplate } from '../utils/consentUpload'

export default function ConsentOfflinePanel({
  signedBy,
  onSignedByChange,
  file,
  files,
  onSelectFile,
  onSelectFiles,
  onRemoveFile,
  error,
  showSignerSelector = true,
  signerLabel = '签署人',
  uploadLabel = '上传已签署的知情同意书',
  emptyHint = '上传签署文件后，“下一步”会自动解锁。',
  showIntroTitle = true,
  showIntroDescription = true,
  introPanelStyle = 'card',
  introDescriptionClassName = '',
  templateButtonVariant = 'mixed',
  allowMultiple = false,
  middleContent = null,
  confirmationChecked = false,
  onConfirmationChange,
  confirmationLabel = '我已确认上述上传文件均为已签字版本，仅用于本次申请归档。',
}) {
  const isPlainIntroPanel = introPanelStyle === 'plain'
  const isUniformTemplateButton = templateButtonVariant === 'uniform'
  const fileList = Array.isArray(files) ? files : (file ? [file] : [])
  const hasFiles = fileList.length > 0

  const templateButtonClassName = isUniformTemplateButton
    ? 'inline-flex items-center justify-center min-w-[140px] px-4 py-2 rounded-lg text-sm font-medium border border-[#B6EDF2] text-[#0F766E] bg-white hover:bg-[#F0FBFC] transition-colors'
    : 'px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-white'

  return (
    <div className="space-y-4">
      <div
        className={isPlainIntroPanel ? 'space-y-2' : 'rounded-xl border px-4 py-4'}
        style={isPlainIntroPanel ? undefined : { background: '#F8FDFE', borderColor: '#DDF0F3' }}
      >
        {showIntroTitle && (
          <div className="text-sm font-semibold text-gray-800 mb-2">签署说明</div>
        )}
        {showIntroDescription && (
          <div className={introDescriptionClassName || 'text-sm text-gray-600 leading-6'}>
            下载模板后线下打印签字，再将签署文件拍照或扫描上传至系统归档。
          </div>
        )}
        <div className={`text-xs font-medium text-gray-500 ${showIntroTitle || showIntroDescription ? 'mt-3' : ''} mb-2`}>下载模板</div>
        <div className="flex flex-wrap gap-3 mt-3">
          <button
            type="button"
            onClick={() => downloadConsentTemplate('pdf')}
            className={isUniformTemplateButton ? templateButtonClassName : 'px-4 py-2 rounded-lg text-sm font-medium text-white'}
            style={isUniformTemplateButton ? undefined : { background: '#0BBECF' }}
          >
            下载 PDF 模板
          </button>
          <button
            type="button"
            onClick={() => downloadConsentTemplate('word')}
            className={templateButtonClassName}
          >
            下载 Word 模板
          </button>
        </div>
      </div>

      {showSignerSelector && (
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">{signerLabel}</div>
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

      {middleContent}

      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-[#0BBECF] transition-colors">
        {!hasFiles ? (
          <label className="flex flex-col items-center gap-2 cursor-pointer">
            <span className="text-2xl">📎</span>
            <span className="text-sm text-gray-700 font-medium">{uploadLabel}</span>
            <span className="text-xs text-gray-400">
              {allowMultiple ? '支持 JPG / PNG / PDF，可多文件上传，单文件 ≤ 10MB' : '支持 JPG / PNG / PDF，单文件 ≤ 10MB'}
            </span>
            <span
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#0BBECF' }}
            >
              {allowMultiple ? '选择已签署文件' : '选择已签署文件'}
            </span>
            <input
              type="file"
              accept={CONSENT_ACCEPT}
              className="hidden"
              multiple={allowMultiple}
              onChange={event => {
                if (allowMultiple && onSelectFiles) {
                  onSelectFiles(Array.from(event.target.files || []))
                } else {
                  onSelectFile?.(event.target.files?.[0] || null)
                }
                event.target.value = ''
              }}
            />
          </label>
        ) : (
          <div className="space-y-3">
            {fileList.map((currentFile, index) => (
              <div key={`${currentFile.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-gray-800">{currentFile.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{currentFile.size}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFile?.(allowMultiple ? index : currentFile)}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  删除
                </button>
              </div>
            ))}

            <label className="inline-flex items-center text-xs cursor-pointer" style={{ color: '#0BBECF' }}>
              {allowMultiple ? '继续添加文件' : '重新选择'}
              <input
                type="file"
                accept={CONSENT_ACCEPT}
                multiple={allowMultiple}
                className="hidden"
                onChange={event => {
                  if (allowMultiple && onSelectFiles) {
                    onSelectFiles(Array.from(event.target.files || []))
                  } else {
                    onSelectFile?.(event.target.files?.[0] || null)
                  }
                  event.target.value = ''
                }}
              />
            </label>
          </div>
        )}
      </div>

      {allowMultiple && hasFiles && onConfirmationChange && (
        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={confirmationChecked}
            onChange={event => onConfirmationChange(event.target.checked)}
            className="mt-1"
          />
          <span>{confirmationLabel}</span>
        </label>
      )}

      {!hasFiles && !error && (
        <div className="rounded-lg px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200">
          {emptyHint}
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

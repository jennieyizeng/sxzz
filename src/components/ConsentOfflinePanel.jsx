import { useState } from 'react'
import { CONSENT_ACCEPT } from '../utils/consentUpload'
import { buildConsentDocumentModel } from '../utils/referralDocuments'

export function ConsentPreviewModal({ referral, onClose }) {
  const [toast, setToast] = useState('')
  const model = buildConsentDocumentModel(referral)
  const showDownloadTip = () => {
    setToast('已生成知情同意书模板，请线下打印签署后上传。')
    setTimeout(() => setToast(''), 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[86vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
        {toast && (
          <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg">
            {toast}
          </div>
        )}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">转诊知情同意书预览</div>
            <div className="text-xs text-gray-400 mt-1">固定版模板示意，线下打印签署后上传归档</div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto px-8 py-6 text-sm leading-7 text-gray-800">
          <h2 className="text-center text-xl font-bold text-gray-900 mb-6">{model.title}</h2>

          <section>
            <h3 className="font-semibold text-gray-900">一、患者基本信息</h3>
            <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1">
              <p>患者姓名：{model.basicInfo.patientName}</p>
              <p>性别：{model.basicInfo.gender}</p>
              <p>年龄：{model.basicInfo.age}</p>
              <p>证件号：{model.basicInfo.idCard}</p>
              <p className="col-span-2">联系电话：{model.basicInfo.phone}</p>
            </div>
          </section>

          <section className="mt-5">
            <h3 className="font-semibold text-gray-900">二、转诊信息</h3>
            <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1">
              <p>转出机构：{model.referralInfo.fromInstitution}</p>
              <p>转入/转回机构：{model.referralInfo.toInstitution}</p>
              <p className="col-span-2">转诊原因：{model.referralInfo.reason}</p>
              <p>告知医生：{model.referralInfo.doctor}</p>
              <p>告知时间：{model.referralInfo.informedAt}</p>
            </div>
          </section>

          <section className="mt-5">
            <h3 className="font-semibold text-gray-900">三、告知事项</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>医生已向患者或家属说明当前病情、转诊原因、拟转入或转回医疗机构及转诊必要性。</li>
              <li>患者或家属已知晓转诊后仍需按接收机构流程完成挂号、缴费、检查、住院、康复管理或随访等相关手续。</li>
              <li>患者或家属已知晓接收机构最终诊疗安排以现场评估结果为准。</li>
            </ol>
          </section>

          <section className="mt-5">
            <h3 className="font-semibold text-gray-900">四、风险提示</h3>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>转诊途中可能存在病情变化、交通延误等风险。</li>
              <li>接收机构可能因号源、床位、设备、医生排班等原因调整实际接诊安排。</li>
              <li>急诊或绿色通道转诊场景下，可先救治后补充完善相关签署材料。</li>
            </ol>
          </section>

          <section className="mt-5 space-y-1">
            <h3 className="font-semibold text-gray-900">五、患者选择</h3>
            <p>□ 同意转诊</p>
            <p>□ 不同意转诊</p>
          </section>

          <section className="mt-5">
            <h3 className="font-semibold text-gray-900">六、签署区</h3>
            <div className="mt-2 space-y-3">
              <div className="grid grid-cols-3 gap-x-6 gap-y-2">
                <p>患者/家属签名：__________</p>
                <p>与患者关系：__________</p>
                <p>联系电话：__________</p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <p>告知医生签名：__________</p>
                <p>医疗机构名称（盖章）：__________</p>
              </div>
              <p className="text-right">日期：____年__月__日</p>
            </div>
          </section>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            关闭
          </button>
          <button type="button" onClick={showDownloadTip} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: '#0BBECF' }}>
            下载 PDF
          </button>
        </div>
      </div>
    </div>
  )
}

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
  emptyHint = '',
  showIntroTitle = true,
  showIntroDescription = true,
  introPanelStyle = 'card',
  introDescriptionClassName = '',
  templateButtonVariant = 'mixed',
  signerSelectorVariant = 'card',
  allowMultiple = false,
  middleContent = null,
  confirmationChecked = false,
  onConfirmationChange,
  confirmationLabel = '我已确认上述上传文件均为已签字版本，仅用于本次申请归档。',
  templateReferral = null,
  showUploadArea = true,
}) {
  const [showPreview, setShowPreview] = useState(false)
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
            onClick={() => setShowPreview(true)}
            className={isUniformTemplateButton ? templateButtonClassName : 'px-4 py-2 rounded-lg text-sm font-medium text-white'}
            style={isUniformTemplateButton ? undefined : { background: '#0BBECF' }}
          >
            下载 PDF 模板
          </button>
        </div>
      </div>

      {showSignerSelector && (
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">{signerLabel}</div>
          {signerSelectorVariant === 'radio' ? (
            <div className="flex flex-wrap gap-6">
              {[
                { value: 'patient', label: '患者本人' },
                { value: 'family', label: '家属代签' },
              ].map(option => (
                <label key={option.value} className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input
                    type="radio"
                    name="consentSignerType"
                    value={option.value}
                    checked={signedBy === option.value}
                    onChange={() => onSignedByChange(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          ) : (
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
          )}
        </div>
      )}

      {middleContent}

      {showUploadArea && (
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
      )}

      {showUploadArea && allowMultiple && hasFiles && onConfirmationChange && (
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

      {showUploadArea && !hasFiles && !error && emptyHint && (
        <div className="rounded-lg px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200">
          {emptyHint}
        </div>
      )}

      {showUploadArea && error && (
        <div className="rounded-lg px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200">
          {error}
        </div>
      )}

      {showPreview && (
        <ConsentPreviewModal
          referral={templateReferral}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}

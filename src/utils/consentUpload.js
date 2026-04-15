export const CONSENT_MAX_FILE_SIZE = 10 * 1024 * 1024
export const CONSENT_ACCEPT = '.jpg,.jpeg,.png,.pdf'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf']
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

export function formatConsentFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0MB'
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`
}

export function validateConsentFile(file) {
  if (!file) {
    return { valid: false, error: '请选择已签署的知情同意书附件' }
  }

  const name = String(file.name || '')
  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  const mimeType = String(file.type || '').toLowerCase()
  const extensionAllowed = ALLOWED_EXTENSIONS.includes(extension)
  const mimeAllowed = !mimeType || ALLOWED_MIME_TYPES.includes(mimeType)

  if (!extensionAllowed || !mimeAllowed) {
    return { valid: false, error: '仅支持 JPG、PNG、PDF 格式上传' }
  }

  if (file.size > CONSENT_MAX_FILE_SIZE) {
    return { valid: false, error: '文件不能超过 10MB' }
  }

  return { valid: true, error: '' }
}

export function buildConsentFileRecord(file) {
  return {
    name: file.name,
    size: formatConsentFileSize(file.size),
    type: file.type,
    fileUrl: URL.createObjectURL(file),
    uploadedAt: new Date().toISOString(),
  }
}

export function downloadConsentTemplate(format) {
  const extension = format === 'word' ? 'docx' : 'pdf'
  const mimeType = format === 'word'
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'application/pdf'
  const content = [
    '双向转诊知情同意书模板',
    '',
    '患者姓名：',
    '签署人：患者本人 / 家属代签',
    '签署日期：',
    '',
    '说明：请打印后由患者本人或家属签字，并将签署文件上传至系统归档。',
  ].join('\n')

  const blob = new Blob([content], { type: mimeType })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = `知情同意书模板.${extension}`
  anchor.click()
  URL.revokeObjectURL(href)
}

export function getConsentInfo(referral) {
  const consentMethod = referral?.consentMethod
    || (referral?.consentDeferred ? 'pending_upload' : referral?.consentSigned ? 'offline_upload' : null)
  const consentFileUrl = referral?.consentFileUrl || null
  const consentUploadedAt = referral?.consentUploadedAt || referral?.consentTime || null
  const consentSignedBy = referral?.consentSignedBy || 'patient'
  const isPendingUpload = consentMethod === 'pending_upload'
  const isUploaded = consentMethod === 'offline_upload' || (!!consentFileUrl && !isPendingUpload)

  return {
    consentMethod,
    consentFileUrl,
    consentUploadedAt,
    consentSignedBy,
    isPendingUpload,
    isUploaded,
    signedByLabel: consentSignedBy === 'family' ? '家属代签' : '患者本人',
  }
}

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const rootDir = path.resolve(process.cwd(), 'src')

test('consent offline panel opens a preview modal instead of downloading word template', () => {
  const source = fs.readFileSync(path.join(rootDir, 'components/ConsentOfflinePanel.jsx'), 'utf8')
  const uploadSource = fs.readFileSync(path.join(rootDir, 'utils/consentUpload.js'), 'utf8')

  assert.equal(source.includes('转诊知情同意书预览'), true)
  assert.equal(source.includes('已生成知情同意书模板，请线下打印签署后上传。'), true)
  assert.equal(source.includes('下载 Word 模板'), false)
  assert.equal(source.includes("downloadConsentTemplate('word')"), false)
  assert.equal(uploadSource.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), false)
})

test('referral attachment tab keeps existing actions and adds preview/download behavior', () => {
  const source = fs.readFileSync(path.join(rootDir, 'pages/shared/ReferralDetail.jsx'), 'utf8')

  assert.equal(source.includes("import { ConsentPreviewModal } from '../../components/ConsentOfflinePanel'"), true)
  assert.equal(source.includes("type: 'consentPreview'"), true)
  assert.equal(source.includes("title: '已下载'"), true)
  assert.equal(source.includes('开始下载附件'), false)
  assert.equal(source.includes('PDF 文件预览'), true)
  assert.equal(source.includes('图片预览'), true)
})

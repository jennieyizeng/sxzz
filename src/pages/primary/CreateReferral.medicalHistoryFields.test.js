import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./CreateReferral.jsx', import.meta.url), 'utf8')

test('primary referral form keeps medical history and allergy fields in form state and submit payloads', () => {
  assert.match(source, /pastMedicalHistory:\s*prefill\?\.pastMedicalHistory/)
  assert.match(source, /allergyHistoryStatus:\s*prefill\?\.allergyHistoryStatus/)
  assert.match(source, /allergyHistoryDetail:\s*prefill\?\.allergyHistoryDetail/)
  assert.match(source, /pastMedicalHistory:\s*form\.pastMedicalHistory/)
  assert.match(source, /allergyHistoryStatus:\s*form\.allergyHistoryStatus/)
  assert.match(source, /allergyHistoryDetail:[\s\S]*form\.allergyHistoryDetail/)
  assert.match(source, /主要既往史/)
  assert.match(source, /过敏史说明/)
  assert.match(source, /请输入患者主要既往疾病、手术史、慢病史等/)
  assert.match(source, /value:\s*'no_known_allergy'/)
  assert.match(source, /value:\s*'has_allergy'/)
  assert.match(source, /value:\s*'unknown'/)
})

test('primary referral form uses one patient-link path so existing patients can bring medical history and manual entry clears it', () => {
  assert.match(source, /const applyPatientLink = \(patient\) =>/)
  assert.match(source, /pastMedicalHistory:\s*patient\.pastMedicalHistory\s*\|\|\s*''/)
  assert.match(source, /allergyHistoryStatus:\s*patient\.allergyHistoryStatus\s*\|\|\s*''/)
  assert.match(source, /allergyHistoryDetail:\s*patient\.allergyHistoryDetail\s*\|\|\s*''/)
  assert.match(source, /onClick=\{\(\) => applyPatientLink\(p\)\}/)
  assert.match(source, /onClick=\{\(\) => clearLinkedPatientFields\(\)\}/)
})

test('outpatient normal form inserts medical safety fields between chief complaint and diagnosis', () => {
  const outpatientStart = source.indexOf('/* ===== OUTPATIENT ===== */')
  const diagnosisStart = source.indexOf('初步诊断（ICD-10）', outpatientStart)
  const beforeDiagnosis = source.slice(outpatientStart, diagnosisStart)

  assert.match(beforeDiagnosis, /主诉与现病史/)
  assert.match(beforeDiagnosis, /renderMedicalSafetyFields\(\)/)
})

test('inpatient normal form inserts medical safety fields inside medical summary before diagnosis', () => {
  const summaryStart = source.indexOf('病历摘要')
  const diagnosisStart = source.indexOf('当前住院诊断（ICD-10）', summaryStart)
  const beforeDiagnosis = source.slice(summaryStart, diagnosisStart)

  assert.match(beforeDiagnosis, /主诉与现病史/)
  assert.match(beforeDiagnosis, /renderMedicalSafetyFields\(\)/)
})

test('emergency referral form adds patient safety information before emergency information without making it required', () => {
  const consciousnessStart = source.indexOf('患者意识状态')
  const emergencyInfoStart = source.indexOf('急诊信息', consciousnessStart)
  const safetySection = source.slice(consciousnessStart, emergencyInfoStart)

  assert.match(safetySection, /患者安全信息/)
  assert.match(safetySection, /renderMedicalSafetyFields\(\)/)
  const emergencyCanNextStart = source.indexOf('const emergencyCanNext')
  const handleDiagnosisStart = source.indexOf('const handleDiagnosisChange', emergencyCanNextStart)
  const emergencyCanNextBlock = source.slice(emergencyCanNextStart, handleDiagnosisStart)
  assert.doesNotMatch(emergencyCanNextBlock, /pastMedicalHistory/)
  assert.doesNotMatch(emergencyCanNextBlock, /allergyHistory/)
})

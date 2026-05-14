import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./CreateDownward.jsx', import.meta.url), 'utf8')

test('county downward form keeps medical history and allergy fields in state and submit payload', () => {
  assert.match(source, /pastMedicalHistory:\s*''/)
  assert.match(source, /allergyHistoryStatus:\s*''/)
  assert.match(source, /allergyHistoryDetail:\s*''/)
  assert.match(source, /pastMedicalHistory:\s*form\.pastMedicalHistory/)
  assert.match(source, /allergyHistoryStatus:\s*form\.allergyHistoryStatus/)
  assert.match(source, /allergyHistoryDetail:[\s\S]*form\.allergyHistoryDetail/)
  assert.match(source, /value:\s*'no_known_allergy'/)
  assert.match(source, /value:\s*'has_allergy'/)
  assert.match(source, /value:\s*'unknown'/)
  assert.match(source, /pastMedicalHistory:\s*record\.pastMedicalHistory\s*\|\|\s*''/)
  assert.match(source, /allergyHistoryStatus:\s*record\.allergyHistoryStatus\s*\|\|\s*''/)
  assert.match(source, /allergyHistoryDetail:\s*record\.allergyHistoryDetail\s*\|\|\s*''/)
})

test('county downward form inserts medical safety fields inside discharge core summary', () => {
  const summaryStart = source.indexOf('<SectionTitle title="出院核心摘要"')
  const handoffStart = source.indexOf('下转交接摘要', summaryStart)
  const coreSummary = source.slice(summaryStart, handoffStart)

  assert.match(coreSummary, /出院小结摘要/)
  assert.match(coreSummary, /renderMedicalSafetyFields\(\)/)
  assert.match(source, /主要既往史/)
  assert.match(source, /过敏史/)
  assert.match(source, /过敏史说明/)
})

test('county downward form adds follow-up advice after medication notes and before attachments', () => {
  assert.match(source, /followUpAdvice:\s*''/)
  assert.match(source, /followUpAdvice:\s*form\.followUpAdvice/)
  assert.match(source, /<FieldLabel>复查建议<\/FieldLabel>/)
  assert.match(source, /setField\('followUpAdvice',\s*event\.target\.value\.slice\(0,\s*300\)\)/)
  assert.match(source, /请输入随访复查建议，如复查项目、复查时间等（最多 300 字）/)
  assert.match(source, /form\.followUpAdvice\.length}\s*\/300/)

  const formMedicationNotes = source.indexOf('<SectionTitle title="用药注意事项"')
  const formFollowUpAdvice = source.indexOf('<FieldLabel>复查建议</FieldLabel>', formMedicationNotes)
  const formAttachments = source.indexOf('<SectionTitle title="检查/检验附件资料"', formMedicationNotes)
  assert.ok(formMedicationNotes >= 0)
  assert.ok(formFollowUpAdvice > formMedicationNotes)
  assert.ok(formAttachments > formFollowUpAdvice)

  const summaryMedicationNotes = source.indexOf("['用药注意事项'")
  const summaryFollowUpAdvice = source.indexOf("['复查建议', form.followUpAdvice || '—']", summaryMedicationNotes)
  const summaryAttachments = source.indexOf("['推荐资料包'", summaryMedicationNotes)
  assert.ok(summaryFollowUpAdvice > summaryMedicationNotes)
  assert.ok(summaryAttachments > summaryFollowUpAdvice)
})

test('county downward form labels history fields with a medical history section title', () => {
  const summaryStart = source.indexOf('<SectionTitle title="出院核心摘要"')
  const historyTitle = source.indexOf('<SectionTitle title="病史信息" />', summaryStart)
  const safetyFields = source.indexOf('{renderMedicalSafetyFields()}', summaryStart)

  assert.ok(historyTitle > summaryStart)
  assert.ok(safetyFields > historyTitle)
})

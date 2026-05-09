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

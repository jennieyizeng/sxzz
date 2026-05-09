import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./CreateReferral.jsx', import.meta.url), 'utf8')

test('outpatient normal referral form combines supplement and medication into one required treatment field', () => {
  const outpatientStart = source.indexOf('OUTPATIENT_CONDITION_ASSESSMENT_OPTIONS.map')
  const attachmentStart = source.indexOf("title: '已做检查/检验报告'", outpatientStart)
  const outpatientFields = source.slice(outpatientStart, attachmentStart)

  assert.match(outpatientFields, /当前治疗经过\/用药情况\s*<span className="text-red-500">\*<\/span>/)
  assert.equal(outpatientFields.includes('>补充说明</label>'), false)
  assert.equal(outpatientFields.includes('>用药情况</label>'), false)
  assert.match(source, /outpatientTransferPurpose\s*&&\s*form\.medicationSummary\.trim\(\)/)
})

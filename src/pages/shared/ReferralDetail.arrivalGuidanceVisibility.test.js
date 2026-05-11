import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(
  path.resolve(process.cwd(), 'src/pages/shared/ReferralDetail.jsx'),
  'utf8',
)

test('patient arrival guidance is only visible for primary scoped roles', () => {
  assert.equal(source.includes('const canViewPatientArrivalGuidance = isPrimaryScopedRole'), true)
  assert.equal(source.includes('canViewPatientArrivalGuidance && ref.admissionArrangement'), true)
  assert.equal(source.includes('currentRole === ROLES.ADMIN && (\n                  <div className="mt-3 pt-3 border-t border-blue-200 flex justify-end">'), false)
})

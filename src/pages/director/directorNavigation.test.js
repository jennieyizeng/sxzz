import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const layoutSource = fs.readFileSync(new URL('../../components/Layout.jsx', import.meta.url), 'utf8')
const appSource = fs.readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8')

test('director navigation merges dashboard and analytics into one statistics module', () => {
  const directorNavBlock = layoutSource.split('[ROLES.DIRECTOR]: [')[1]?.split('],')[0] || ''

  assert.equal(directorNavBlock.includes("label: '数据大屏'"), false)
  assert.equal(directorNavBlock.includes("path: '/director/dashboard'"), false)
  assert.equal(directorNavBlock.includes("path: '/director/analytics', label: '统计分析'"), true)
  assert.equal(directorNavBlock.includes("label: '考核报表'"), true)
})

test('director default route opens statistics analysis while legacy dashboard path stays reachable', () => {
  assert.equal(appSource.includes("[ROLES.DIRECTOR]:     '/director/analytics'"), true)
  assert.equal(appSource.includes('path="/director/dashboard" element={<Navigate to="/director/analytics" replace />}'), true)
  assert.equal(appSource.includes('DirectorDashboard'), false)
})

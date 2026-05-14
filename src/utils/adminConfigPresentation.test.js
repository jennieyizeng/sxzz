import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const readPage = file => fs.readFileSync(path.join(rootDir, 'pages/admin', file), 'utf8')

test('institution parameter page uses updated tab and receiving ability filter copy', () => {
  const source = readPage('InstitutionManage.jsx')

  assert.equal(source.includes("{ key: 'institutions', label: '机构配置' }"), true)
  assert.equal(source.includes("{ key: 'institutions', label: '机构列表' }"), false)
  assert.equal(source.includes("receiveAbility: 'all'"), true)
  assert.equal(source.includes('接收转诊能力'), true)
  assert.equal(source.includes('<option value="enabled">开启</option>'), true)
  assert.equal(source.includes('<option value="disabled">关闭</option>'), true)
  assert.equal(source.includes('仅医院类机构可配置科室号源（基层机构号源由HIS维护）'), false)
  assert.equal(source.includes('仅医院类机构可配置科室号源'), true)
})

test('disease rule header removes source subtitle and uses polished add button copy', () => {
  const source = readPage('DiseaseDir.jsx')

  assert.equal(source.includes('主数据同步自医共体术语信息系统，仅维护双转业务属性。'), false)
  assert.equal(source.includes('新增病种'), true)
  assert.equal(source.includes('+新增'), false)
})

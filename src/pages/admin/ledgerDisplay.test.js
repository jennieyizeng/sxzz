import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./Ledger.jsx', import.meta.url), 'utf8')

test('admin ledger uses the unified table columns and direction labels', () => {
  assert.match(
    source,
    /\['序号','转诊方向','患者信息','诊断（ICD-10）','转诊单号','转出机构','转入机构','状态','创建时间','操作'\]/
  )
  assert.doesNotMatch(source, /'处理方式'/)
  assert.match(source, /基层至县级/)
  assert.match(source, /县级至基层/)
  assert.doesNotMatch(source, /⬆ 上转|⬇ 下转/)
})

test('admin ledger creation time renders to minute precision', () => {
  assert.match(source, /padStart\(2,'0'\)}:\$\{String\(d\.getMinutes\(\)\)\.padStart\(2,'0'\)\}/)
})

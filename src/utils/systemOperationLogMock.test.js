import assert from 'node:assert/strict'
import test from 'node:test'

import { getSystemOperationLogs } from '../data/systemAdminConfig.js'

test('operation log mock data includes reminder cancel and close examples in default date range', () => {
  const logs = getSystemOperationLogs()
  const requiredTypes = ['催办', '撤销', '关闭']

  for (const type of requiredTypes) {
    const log = logs.find(item => item.type === type && item.time >= '2026-05-02' && item.time <= '2026-05-09 23:59')
    assert.ok(log, `missing ${type} operation log in default range`)
    assert.ok(log.detail && Object.keys(log.detail).length > 0, `${type} log should include detail`)
    assert.ok(log.detail.关联转诊单号, `${type} detail should include 关联转诊单号`)
    assert.ok(log.detail.机构, `${type} detail should include 机构`)
    assert.ok(log.detail.菜单, `${type} detail should include 菜单`)
    assert.ok(log.detail.按钮, `${type} detail should include 按钮`)
    assert.equal(Object.prototype.hasOwnProperty.call(log.detail, '变更原因'), false, `${type} detail should not use 变更原因`)
    assert.equal(Object.prototype.hasOwnProperty.call(log.detail, '操作说明'), false, `${type} detail should not use 操作说明`)
  }
})

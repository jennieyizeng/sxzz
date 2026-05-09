import assert from 'node:assert/strict'
import test from 'node:test'

import { buildOperationLogDetailViewModel } from './operationLogDetail.js'

test('builds operation log detail with metadata before value comparison and hides change reason', () => {
  const detail = {
    机构: 'xx市人民医院',
    变更字段: '急诊联系电话',
    原值: '0838-6213000',
    新值: '0838-6213200',
    变更原因: '急诊值班号更新',
  }

  const model = buildOperationLogDetailViewModel(detail)

  assert.equal(model.mode, 'valueChange')
  assert.deepEqual(model.metadataEntries, [
    ['机构', 'xx市人民医院'],
    ['变更字段', '急诊联系电话'],
  ])
  assert.deepEqual(model.compareRows, [
    { field: '值', before: '0838-6213000', after: '0838-6213200' },
  ])
  assert.equal(JSON.stringify(model).includes('变更原因'), false)
})

test('builds action detail for non-add-or-edit operations', () => {
  const detail = {
    关联转诊单号: 'REF2026003',
    机构: 'xx市人民医院',
    菜单: '超时督办',
    按钮: '启用',
    原值: '停用',
    新值: '启用',
    变更原因: '系统默认规则',
  }

  const model = buildOperationLogDetailViewModel(detail, '启用')

  assert.equal(model.mode, 'action')
  assert.equal(model.associationNo, 'REF2026003')
  assert.equal(model.actionSentence, '在【xx市人民医院】，【超时督办】模块进行了【启用】操作')
  assert.deepEqual(model.compareRows, [])
  assert.deepEqual(model.reasonEntries, [])
  assert.equal(JSON.stringify(model).includes('变更原因'), false)
  assert.equal(JSON.stringify(model).includes('原值'), false)
  assert.equal(JSON.stringify(model).includes('新值'), false)
})

test('builds action details for reminder cancel and close operations without extra operation description', () => {
  const cases = [
    ['催办', {}, []],
    ['撤销', { 撤销原因: '患者暂缓转诊' }, [['撤销原因', '患者暂缓转诊']]],
    ['关闭', { 关闭原因: '双方协商关闭' }, [['关闭原因', '双方协商关闭']]],
  ]

  for (const [operationType, extraDetail, expectedReasonEntries] of cases) {
    const model = buildOperationLogDetailViewModel({
      关联转诊单号: 'REF2026003',
      机构: 'xx市人民医院',
      菜单: '异常处理',
      按钮: operationType,
      操作说明: `${operationType}操作记录`,
      ...extraDetail,
    }, operationType)

    assert.equal(model.mode, 'action')
    assert.equal(model.associationNo, 'REF2026003')
    assert.equal(model.actionSentence, `在【xx市人民医院】，【异常处理】模块进行了【${operationType}】操作`)
    assert.deepEqual(model.compareRows, [], `${operationType} 不应展示值变更前后对比`)
    assert.deepEqual(model.reasonEntries, expectedReasonEntries)
    assert.equal(JSON.stringify(model).includes('操作说明'), false)
  }
})

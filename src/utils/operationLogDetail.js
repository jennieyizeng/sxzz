const HIDDEN_DETAIL_KEYS = new Set(['变更原因', '操作说明'])
const VALUE_CHANGE_TYPES = new Set(['新增', '编辑'])
const REASON_KEYS = ['撤销原因', '关闭原因']

export function buildOperationLogDetailViewModel(detail = {}, operationType = '') {
  const isValueChange = VALUE_CHANGE_TYPES.has(operationType || '编辑')
  if (!isValueChange) {
    const institution = detail.机构 || '—'
    const menu = detail.菜单 || '—'
    const button = detail.按钮 || operationType || '—'
    return {
      mode: 'action',
      associationNo: detail.关联转诊单号 || '—',
      actionSentence: `在【${institution}】，【${menu}】模块进行了【${button}】操作`,
      compareRows: [],
      metadataEntries: [],
      reasonEntries: REASON_KEYS
        .filter(key => detail[key])
        .map(key => [key, detail[key]]),
    }
  }

  const compareRows = []
  const metadataEntries = []
  const handledKeys = new Set()

  Object.entries(detail).forEach(([key, value]) => {
    if (handledKeys.has(key) || HIDDEN_DETAIL_KEYS.has(key)) return

    const pairedNewKey = `新${key.slice(1)}`
    if (key.startsWith('原') && detail[pairedNewKey] !== undefined) {
      compareRows.push({
        field: key.slice(1),
        before: value,
        after: detail[pairedNewKey],
      })
      handledKeys.add(key)
      handledKeys.add(pairedNewKey)
      return
    }

    if (typeof value === 'string' && value.includes(' → ')) {
      const [before, after] = value.split(' → ')
      compareRows.push({ field: key, before, after })
      handledKeys.add(key)
      return
    }

    metadataEntries.push([key, value])
    handledKeys.add(key)
  })

  return { mode: 'valueChange', compareRows, metadataEntries, reasonEntries: [] }
}

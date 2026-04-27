import { useMemo, useState } from 'react'
import {
  CONSENT_DOCUMENT_BLOCKS,
  DEFAULT_CONSENT_TEMPLATES,
  DEFAULT_DOCUMENT_TEMPLATES,
  DOCUMENT_TEMPLATE_DIRECTIONS,
  DOCUMENT_TEMPLATE_EMPTY_RULES,
  DOCUMENT_TEMPLATE_TRANSFER_TYPES,
  DOWNWARD_DOCUMENT_BLOCKS,
  UPWARD_DOCUMENT_BLOCKS,
  getDirectionLabel,
} from '../../data/documentTemplateConfig'
import { SYSTEM_INSTITUTION_OPTIONS } from '../../data/systemAdminConfig'

const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm align-top'

const TEMPLATE_MODES = {
  referral: {
    label: '双向转诊单配置',
    listTitle: '双向转诊单模板列表',
    modalTitle: '配置双向转诊单模板',
    pageDescription: '配置系统生成的双向转诊单在预览、下载 PDF、打印时展示哪些内容。',
    scopeTip: '仅控制预览、下载 PDF、打印文书展示内容，不影响发起转诊表单校验。',
    saveNote: '保存双向转诊单配置',
    newPrefix: 'TPL-NEW',
    copyPrefix: 'TPL-COPY',
    newName: '新建双向转诊单模板',
    defaultTitleByDirection: {
      primary_to_county: '双向转诊（转出）单',
      county_to_primary: '双向转诊下转（回转）单',
    },
    getBlocks: direction => (direction === 'county_to_primary' ? DOWNWARD_DOCUMENT_BLOCKS : UPWARD_DOCUMENT_BLOCKS),
    globalControls: [
      ['showQrCode', '是否显示二维码'],
      ['showPrintTime', '是否显示打印时间'],
      ['showReferralNo', '是否显示转诊单编号'],
      ['showStatusWatermark', '是否显示状态水印'],
      ['showSignatureArea', '是否显示签章区'],
    ],
    footerTip: '不提供 Word/PDF 上传、解析、自由拖拽设计器或医生手工编辑文书内容。',
  },
  consent: {
    label: '知情同意书配置',
    listTitle: '知情同意书模板列表',
    modalTitle: '配置知情同意书模板',
    pageDescription: '配置系统生成的转诊知情同意书在预览、下载、打印时展示哪些内容。',
    scopeTip: '用于线下打印签署，签署后由医生上传附件归档；不提供电子签名。',
    saveNote: '保存知情同意书配置',
    newPrefix: 'CONSENT-NEW',
    copyPrefix: 'CONSENT-COPY',
    newName: '新建知情同意书模板',
    defaultTitleByDirection: {
      primary_to_county: '转诊知情同意书',
      county_to_primary: '转诊知情同意书',
    },
    getBlocks: () => CONSENT_DOCUMENT_BLOCKS,
    globalControls: [
      ['showPrintTime', '是否显示打印时间'],
      ['showReferralNo', '是否显示转诊单编号'],
      ['showSignatureArea', '是否显示签章区'],
    ],
    footerTip: '不做上传 Word/PDF 模板、解析、自由拖拽设计器或电子签名；打印实现由底层报表能力承接。',
  },
}

function Toggle({ value, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="inline-flex items-center gap-2">
      <span className={`relative inline-flex h-5 w-10 rounded-full transition-colors ${value ? 'bg-[#0BBECF]' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
      {label && <span className="text-xs text-gray-500">{label}</span>}
    </button>
  )
}

function StatusBadge({ status }) {
  const cls = status === '已启用'
    ? 'bg-green-50 text-green-700 border-green-100'
    : status === '已停用'
      ? 'bg-gray-100 text-gray-500 border-gray-200'
      : 'bg-amber-50 text-amber-700 border-amber-100'
  return <span className={`inline-flex px-2 py-0.5 rounded-full border text-xs ${cls}`}>{status}</span>
}

function cloneTemplate(template) {
  return {
    ...template,
    blocks: template.blocks.map(item => ({ ...item })),
    fields: template.fields.map(item => ({ ...item })),
    globalOptions: { ...template.globalOptions },
    fixedTexts: template.fixedTexts
      ? {
          notices: [...(template.fixedTexts.notices || [])],
          risks: [...(template.fixedTexts.risks || [])],
        }
      : undefined,
    versions: [...(template.versions || [])],
  }
}

function formatNow() {
  return new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function FixedTextEditor({ title, values, onChange }) {
  function updateText(index, value) {
    onChange(values.map((item, itemIndex) => itemIndex === index ? value : item))
  }

  function removeText(index) {
    onChange(values.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="border border-gray-100 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">{title}</div>
        <button type="button" onClick={() => onChange([...values, ''])} className="text-xs text-[#0892a0] hover:underline">新增一条</button>
      </div>
      {values.map((text, index) => (
        <div key={`${title}-${index}`} className="grid grid-cols-[1fr_52px] gap-2">
          <textarea
            value={text}
            onChange={e => updateText(index, e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
          />
          <button type="button" onClick={() => removeText(index)} className="text-xs text-gray-500 hover:text-red-500">删除</button>
        </div>
      ))}
      {values.length === 0 && <div className="text-xs text-gray-400">暂无固定文本，点击“新增一条”维护。</div>}
    </div>
  )
}

function ConfigModal({ mode, template, onCancel, onSave }) {
  const modeConfig = TEMPLATE_MODES[mode]
  const [draft, setDraft] = useState(() => cloneTemplate(template))
  const directionBlocks = modeConfig.getBlocks(draft.direction)

  function setField(key, value) {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  function setGlobal(key, value) {
    setDraft(prev => ({ ...prev, globalOptions: { ...prev.globalOptions, [key]: value } }))
  }

  function updateBlock(id, patch) {
    setDraft(prev => ({ ...prev, blocks: prev.blocks.map(item => item.id === id ? { ...item, ...patch } : item) }))
  }

  function updateField(id, patch) {
    setDraft(prev => ({ ...prev, fields: prev.fields.map(item => item.id === id ? { ...item, ...patch } : item) }))
  }

  function updateFixedText(key, values) {
    setDraft(prev => ({ ...prev, fixedTexts: { ...(prev.fixedTexts || {}), [key]: values } }))
  }

  function resetBlocksForDirection(direction) {
    const names = modeConfig.getBlocks(direction)
    setDraft(prev => ({
      ...prev,
      direction,
      title: modeConfig.defaultTitleByDirection[direction],
      blocks: names.map((name, index) => ({ id: `block-${index + 1}`, title: name, visible: true, order: index + 1 })),
    }))
  }

  function handleSave() {
    const savedAt = formatNow()
    const nextStatus = draft.enabled ? '已启用' : '已停用'
    onSave({
      ...draft,
      status: nextStatus,
      updatedAt: savedAt,
      versions: [
        { version: draft.version, updatedAt: savedAt, operator: '刘系统', note: modeConfig.saveNote },
        ...(draft.versions || []),
      ],
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800">{modeConfig.modalTitle}</h3>
              <p className="text-xs text-gray-400 mt-1">{modeConfig.scopeTip}</p>
            </div>
            <button onClick={onCancel} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 text-lg">×</button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            <div>
              <div className="text-sm font-semibold text-gray-800 mb-3">基础配置</div>
              <div className="grid grid-cols-3 gap-4">
                <label className="text-sm">
                  <span className="block text-xs text-gray-500 mb-1">模板名称</span>
                  <input value={draft.name} onChange={e => setField('name', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0BBECF]" />
                </label>
                <label className="text-sm">
                  <span className="block text-xs text-gray-500 mb-1">模板标题</span>
                  <input value={draft.title} onChange={e => setField('title', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0BBECF]" />
                </label>
                <label className="text-sm">
                  <span className="block text-xs text-gray-500 mb-1">适用转诊方向</span>
                  <select value={draft.direction} onChange={e => resetBlocksForDirection(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#0BBECF]">
                    {DOCUMENT_TEMPLATE_DIRECTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block text-xs text-gray-500 mb-1">适用地区</span>
                  <input value={draft.region} onChange={e => setField('region', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0BBECF]" />
                </label>
                <label className="text-sm">
                  <span className="block text-xs text-gray-500 mb-1">适用机构</span>
                  <select value={draft.institution} onChange={e => setField('institution', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#0BBECF]">
                    <option value="">当前地区下所有机构</option>
                    {SYSTEM_INSTITUTION_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block text-xs text-gray-500 mb-1">适用转诊类型</span>
                  <select value={draft.transferType} onChange={e => setField('transferType', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#0BBECF]">
                    {DOCUMENT_TEMPLATE_TRANSFER_TYPES.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <div className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-sm text-gray-700">是否默认模板</div>
                    <div className="text-xs text-gray-400">同范围只保留一个默认启用模板</div>
                  </div>
                  <Toggle value={draft.isDefault} onChange={value => setField('isDefault', value)} />
                </div>
                <div className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-sm text-gray-700">是否启用</div>
                    <div className="text-xs text-gray-400">停用后不参与模板匹配</div>
                  </div>
                  <Toggle value={draft.enabled} onChange={value => setField('enabled', value)} />
                </div>
                <label className="text-sm col-span-3">
                  <span className="block text-xs text-gray-500 mb-1">模板说明</span>
                  <textarea value={draft.description} onChange={e => setField('description', e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#0BBECF]" />
                </label>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-800 mb-3">全局展示配置</div>
              <div className="grid grid-cols-3 gap-3">
                {modeConfig.globalControls.map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">{label}</span>
                    <Toggle value={!!draft.globalOptions[key]} onChange={value => setGlobal(key, value)} />
                  </div>
                ))}
                <label className="text-sm">
                  <span className="block text-xs text-gray-500 mb-1">空值显示规则</span>
                  <select value={draft.globalOptions.emptyRule} onChange={e => setGlobal('emptyRule', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white">
                    {DOCUMENT_TEMPLATE_EMPTY_RULES.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600">纸张规格：A4</div>
                <div className="border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600">页面方向：纵向</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-gray-800">区块配置</div>
                <div className="text-xs text-gray-400">默认区块：{directionBlocks.join('、')}</div>
              </div>
              <div className="space-y-2">
                {draft.blocks.map(block => (
                  <div key={block.id} className="grid grid-cols-[80px_1fr_100px] gap-3 items-center border border-gray-100 rounded-lg px-3 py-2">
                    <Toggle value={block.visible} onChange={value => updateBlock(block.id, { visible: value })} label={block.visible ? '显示' : '隐藏'} />
                    <input value={block.title} onChange={e => updateBlock(block.id, { title: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF]" />
                    <input type="number" min="1" value={block.order} onChange={e => updateBlock(block.id, { order: Number(e.target.value) || 1 })} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-800 mb-3">字段配置</div>
              <div className="space-y-2">
                {draft.fields.map(field => (
                  <div key={field.id} className="grid grid-cols-[80px_1fr_100px_160px] gap-3 items-center border border-gray-100 rounded-lg px-3 py-2">
                    <Toggle value={field.visible} onChange={value => updateField(field.id, { visible: value })} label={field.visible ? '显示' : '隐藏'} />
                    <input value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF]" />
                    <input type="number" min="1" value={field.order} onChange={e => updateField(field.id, { order: Number(e.target.value) || 1 })} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                    <select value={field.emptyRule} onChange={e => updateField(field.id, { emptyRule: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
                      {DOCUMENT_TEMPLATE_EMPTY_RULES.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {mode === 'consent' && (
              <div>
                <div className="text-sm font-semibold text-gray-800 mb-3">固定文本配置</div>
                <div className="grid grid-cols-2 gap-4">
                  <FixedTextEditor title="告知事项" values={draft.fixedTexts?.notices || []} onChange={values => updateFixedText('notices', values)} />
                  <FixedTextEditor title="风险提示" values={draft.fixedTexts?.risks || []} onChange={values => updateFixedText('risks', values)} />
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
            <div className="text-xs text-gray-400">{modeConfig.footerTip}</div>
            <div className="flex gap-2">
              <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#0BBECF' }}>保存配置</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function PreviewBlockContent({ mode, template, block }) {
  const title = block.title
  const visibleFields = [...template.fields].sort((a, b) => a.order - b.order).filter(item => item.visible)

  if (mode === 'consent' && title.includes('告知事项')) {
    return (
      <ol className="list-decimal list-inside space-y-1 text-xs text-gray-700">
        {(template.fixedTexts?.notices || []).map((text, index) => <li key={index}>{text || '________'}</li>)}
      </ol>
    )
  }

  if (mode === 'consent' && title.includes('风险提示')) {
    return (
      <ol className="list-decimal list-inside space-y-1 text-xs text-gray-700">
        {(template.fixedTexts?.risks || []).map((text, index) => <li key={index}>{text || '________'}</li>)}
      </ol>
    )
  }

  if (mode === 'consent' && title.includes('患者选择')) {
    return (
      <div className="flex gap-8 text-xs text-gray-700">
        <span>□ 同意转诊</span>
        <span>□ 不同意转诊</span>
      </div>
    )
  }

  if (mode === 'consent' && (title.includes('签署区') || title.includes('医生说明区') || title.includes('机构盖章区'))) {
    return (
      <div className="grid grid-cols-2 gap-4 text-xs text-gray-700">
        <span>签名 / 盖章：________</span>
        <span>日期：________</span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {visibleFields.slice(0, 4).map(field => (
        <div key={`${block.id}-${field.id}`} className="text-xs">
          <span className="text-gray-400">{field.label}：</span>
          <span className="text-gray-700">{field.emptyRule === '显示“未填写”' ? '未填写' : '________'}</span>
        </div>
      ))}
    </div>
  )
}

function PreviewModal({ mode, template, onClose }) {
  const modeConfig = TEMPLATE_MODES[mode]

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800">模板预览</h3>
              <p className="text-xs text-gray-400 mt-1">预览展示打印/下载时的内容结构，不允许医生手动编辑。</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 text-lg">×</button>
          </div>
          <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
            <div className="bg-white border border-gray-200 mx-auto p-8 min-h-[520px] shadow-sm">
              <div className="text-center text-xl font-semibold text-gray-900">{template.title}</div>
              <div className="mt-2 text-center text-xs text-gray-400">纸张：A4 · 方向：纵向 · 版本：{template.version}</div>
              <div className="mt-6 space-y-4">
                {[...template.blocks].sort((a, b) => a.order - b.order).filter(item => item.visible).map(block => (
                  <div key={block.id} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-[#E0F6F9] text-sm font-medium" style={{ color: '#0892a0' }}>{block.title}</div>
                    <div className="p-3">
                      <PreviewBlockContent mode={mode} template={template} block={block} />
                    </div>
                  </div>
                ))}
              </div>
              {template.globalOptions.showSignatureArea && (
                <div className="mt-8 text-right text-sm text-gray-500">
                  {mode === 'consent' ? '患者/家属签名：________ 医疗机构盖章：________' : '转出机构签章：________ 转入机构签章：________'}
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-400">{modeConfig.scopeTip}</div>
        </div>
      </div>
    </>
  )
}

function VersionModal({ template, onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-800">版本记录 · {template.name}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 text-lg">×</button>
          </div>
          <div className="space-y-3">
            {(template.versions || []).map((item, index) => (
              <div key={`${item.version}-${index}`} className="border border-gray-100 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-800">{item.version}</div>
                  <div className="text-xs text-gray-400">{item.updatedAt}</div>
                </div>
                <div className="text-xs text-gray-500 mt-1">操作人：{item.operator} · {item.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function TemplateTable({ mode, templates, onCreate, onEdit, onPreview, onCopy, onToggle, onVersion }) {
  const modeConfig = TEMPLATE_MODES[mode]
  const enabledDefaultScopes = useMemo(() => (
    templates
      .filter(item => item.enabled && item.isDefault)
      .map(item => `${getDirectionLabel(item.direction)} / ${item.region} / ${item.institution || '全部机构'} / ${item.transferType}`)
  ), [templates])

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">{modeConfig.listTitle}</div>
        <button
          onClick={onCreate}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#0BBECF' }}
        >
          新增模板
        </button>
      </div>

      <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
        匹配优先级：机构专属模板 &gt; 区县级模板 &gt; 市级模板 &gt; 省级模板 &gt; 系统内置默认模板。当前默认启用范围：{enabledDefaultScopes.join('；') || '暂无'}
      </div>

      {mode === 'consent' && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          使用规则：普通上转/下转提交前支持下载线下签署；急诊/绿色通道允许先标记待补传，后续补传签署文件；已上传后支持查看、重新上传和下载附件。
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 1180 }}>
          <thead>
            <tr style={{ background: '#E0F6F9' }}>
              {['模板名称', '模板标题', '适用转诊方向', '适用地区', '适用机构', '适用转诊类型', '当前版本', '状态', '是否默认', '更新时间', '操作'].map(head => (
                <th key={head} className={TH} style={{ color: '#0892a0' }}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {templates.map(template => (
              <tr key={template.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className={`${TD} font-medium text-gray-800`}>{template.name}</td>
                <td className={TD}>{template.title}</td>
                <td className={TD}>{getDirectionLabel(template.direction)}</td>
                <td className={TD}>{template.region}</td>
                <td className={TD}>{template.institution || '全部机构'}</td>
                <td className={TD}>{template.transferType}</td>
                <td className={TD}>{template.version}</td>
                <td className={TD}><StatusBadge status={template.status} /></td>
                <td className={TD}>{template.isDefault ? '是' : '否'}</td>
                <td className={TD}>{template.updatedAt}</td>
                <td className={TD}>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onEdit(template)} className="text-xs text-[#0892a0] hover:underline">配置</button>
                    <button onClick={() => onPreview(template)} className="text-xs text-[#0892a0] hover:underline">预览</button>
                    <button onClick={() => onCopy(template)} className="text-xs text-gray-600 hover:underline">复制</button>
                    <button onClick={() => onToggle(template)} className="text-xs text-gray-600 hover:underline">{template.enabled ? '停用' : '启用'}</button>
                    <button onClick={() => onVersion(template)} className="text-xs text-gray-600 hover:underline">版本记录</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function DocumentTemplateConfig() {
  const [activeTab, setActiveTab] = useState('referral')
  const [referralTemplates, setReferralTemplates] = useState(DEFAULT_DOCUMENT_TEMPLATES)
  const [consentTemplates, setConsentTemplates] = useState(DEFAULT_CONSENT_TEMPLATES)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [versionTemplate, setVersionTemplate] = useState(null)

  const activeModeConfig = TEMPLATE_MODES[activeTab]
  const activeTemplates = activeTab === 'consent' ? consentTemplates : referralTemplates
  const setActiveTemplates = activeTab === 'consent' ? setConsentTemplates : setReferralTemplates

  function saveTemplate(nextTemplate) {
    setActiveTemplates(prev => {
      const exists = prev.some(item => item.id === nextTemplate.id)
      const normalizedTemplate = { ...nextTemplate }
      delete normalizedTemplate.isNew
      const source = exists ? prev : [normalizedTemplate, ...prev]

      return source.map(item => {
        const sameScope = item.id !== nextTemplate.id
          && nextTemplate.enabled
          && nextTemplate.isDefault
          && item.direction === nextTemplate.direction
          && item.region === nextTemplate.region
          && item.institution === nextTemplate.institution
          && item.transferType === nextTemplate.transferType

        if (sameScope) return { ...item, isDefault: false }
        return item.id === nextTemplate.id ? normalizedTemplate : item
      })
    })
    setEditingTemplate(null)
  }

  function copyTemplate(template) {
    setActiveTemplates(prev => {
      const copiedAt = formatNow()
      const copied = {
        ...cloneTemplate(template),
        id: `${activeModeConfig.copyPrefix}-${prev.length + 1}`,
        name: `${template.name} 副本`,
        version: 'V1.0',
        status: '草稿',
        enabled: false,
        isDefault: false,
        updatedAt: copiedAt,
        versions: [{ version: 'V1.0', updatedAt: copiedAt, operator: '刘系统', note: `复制自 ${template.id}` }],
      }
      return [copied, ...prev]
    })
  }

  function toggleEnabled(template) {
    setActiveTemplates(prev => prev.map(item => item.id === template.id
      ? { ...item, enabled: !item.enabled, status: !item.enabled ? '已启用' : '已停用', updatedAt: formatNow() }
      : item))
  }

  function createTemplate() {
    const base = cloneTemplate(activeTemplates[0])
    const createdAt = formatNow()
    setEditingTemplate({
      ...base,
      id: `${activeModeConfig.newPrefix}-${activeTemplates.length + 1}`,
      name: activeModeConfig.newName,
      title: activeModeConfig.defaultTitleByDirection.primary_to_county,
      direction: 'primary_to_county',
      version: 'V1.0',
      status: '草稿',
      enabled: false,
      isDefault: false,
      updatedAt: createdAt,
      description: '',
      blocks: activeModeConfig.getBlocks('primary_to_county').map((name, index) => ({ id: `block-${index + 1}`, title: name, visible: true, order: index + 1 })),
      versions: [{ version: 'V1.0', updatedAt: createdAt, operator: '刘系统', note: '新建模板草稿' }],
      isNew: true,
    })
  }

  function closeModal() {
    setEditingTemplate(null)
    setPreviewTemplate(null)
    setVersionTemplate(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">转诊文书模板配置</h1>
        <p className="text-sm text-gray-500 mt-1">{activeModeConfig.pageDescription}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {Object.entries(TEMPLATE_MODES).map(([key, tab]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="px-5 py-3 text-sm font-medium border-b-2"
              style={activeTab === key ? { borderBottomColor: '#0BBECF', color: '#0BBECF' } : { borderBottomColor: 'transparent', color: '#6b7280' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <TemplateTable
          mode={activeTab}
          templates={activeTemplates}
          onCreate={createTemplate}
          onEdit={template => setEditingTemplate(cloneTemplate(template))}
          onPreview={template => setPreviewTemplate(template)}
          onCopy={copyTemplate}
          onToggle={toggleEnabled}
          onVersion={template => setVersionTemplate(template)}
        />
      </div>

      {editingTemplate && <ConfigModal mode={activeTab} template={editingTemplate} onCancel={closeModal} onSave={saveTemplate} />}
      {previewTemplate && <PreviewModal mode={activeTab} template={previewTemplate} onClose={closeModal} />}
      {versionTemplate && <VersionModal template={versionTemplate} onClose={closeModal} />}
    </div>
  )
}

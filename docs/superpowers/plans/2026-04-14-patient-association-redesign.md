# 患者信息（第1步）关联化改造实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将第1步从"手工录入患者基础信息"为主改为"关联已有患者/就诊记录"为主，手工新增为辅

**Architecture:** 在 CreateReferral.jsx 第1步（normalStep === 0）新增患者关联区域，包含三个入口：关联门诊记录（主）、关联居民档案、手工新增患者（兜底）。关联后自动带出患者信息，年龄改为自动计算，保留原有操作按钮。

**Tech Stack:** React, Tailwind CSS, 现有 CreateReferral.jsx 组件

---

### Task 1: 新增患者关联区域组件

**Files:**
- Modify: `src/pages/primary/CreateReferral.jsx:668-737`

- [ ] **Step 1: 在 renderNormalFlow 函数中，第1步表单顶部新增患者关联提示文案**

在 `normalStep === 0` 的 `div.p6` 内，`h2` 元素（第664行）之前插入提示文案：

```jsx
<div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
  <span>💡 优先通过门诊记录或居民档案关联患者信息，减少重复录入。</span>
</div>
```

- [ ] **Step 2: 新增患者关联区域容器**

在提示文案后新增患者关联区域：

```jsx
<div className="mb-6 p-4 rounded-xl border" style={{ background: '#FAFCFE', borderColor: '#DDF0F3' }}>
  <div className="text-sm font-medium text-gray-700 mb-3">患者关联</div>
  <div className="grid grid-cols-3 gap-3">
    <button
      type="button"
      onClick={() => handlePatientLink('clinic')}
      className="rounded-xl border px-4 py-3 text-left transition-colors"
      style={{ borderColor: '#0BBECF', background: '#F0FBFC' }}
    >
      <div className="text-sm font-semibold text-gray-800">📋 关联门诊记录</div>
      <div className="text-xs text-gray-500 mt-1">从今日门诊就诊记录中选择患者</div>
    </button>
    <button
      type="button"
      onClick={() => handlePatientLink('archive')}
      className="rounded-xl border px-4 py-3 text-left transition-colors"
      style={{ borderColor: '#E5E7EB', background: '#fff' }}
    >
      <div className="text-sm font-semibold text-gray-800">📁 关联居民档案</div>
      <div className="text-xs text-gray-500 mt-1">从公共卫生档案中匹配患者</div>
    </button>
    <button
      type="button"
      onClick={() => handlePatientLink('manual')}
      className="rounded-xl border px-4 py-3 text-left transition-colors"
      style={{ borderColor: '#E5E7EB', background: '#fff' }}
    >
      <div className="text-sm font-semibold text-gray-800">✏️ 手工新增患者</div>
      <div className="text-xs text-gray-500 mt-1">未检索到患者时，手动补录</div>
    </button>
  </div>
</div>
```

- [ ] **Step 3: 新增 handlePatientLink 处理函数和关联模式状态**

在组件顶部 useState 声明区域（第199-222行附近）新增状态：

```jsx
const [patientLinkMode, setPatientLinkMode] = useState(null) // 'clinic' | 'archive' | 'manual' | null
const [linkedPatient, setLinkedPatient] = useState(null) // 已关联的患者信息
```

在 handleSelectFlow 函数后（约第412行）新增处理函数：

```jsx
const handlePatientLink = (mode) => {
  setPatientLinkMode(mode)
  if (mode === 'manual') {
    // 手工新增模式：清空��关联信息，允许手工录入
    setLinkedPatient(null)
  }
  // 关联门诊/档案模式由下一步 Task 实现
}
```

- [ ] **Step 4: 新增手工新增模式提示文案**

在患者关联区域后，当选择"手工新增"时显示：

```jsx
{patientLinkMode === 'manual' && (
  <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
    <span>未检索到患者时，可手工补录基础信息。</span>
  </div>
)}
```

---

### Task 2: 实现门诊记录关联弹窗

**Files:**
- Modify: `src/pages/primary/CreateReferral.jsx` (新增弹窗组件)

- [ ] **Step 1: 新增门诊记录关联弹窗组件引用**

在组件文件中添加（import 区域后）：

```jsx
function ClinicRecordPicker({ isOpen, onClose, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('')
  const mockClinicRecords = [
    { id: 'C001', patientName: '张三', gender: '男', age: 45, phone: '13800138000', dept: '内科', doctor: '李医生', visitTime: '2026-04-14 09:30' },
    { id: 'C002', patientName: '李四', gender: '女', age: 32, phone: '13900139000', dept: '儿科', doctor: '王医生', visitTime: '2026-04-14 10:15' },
  ]
  const filtered = searchQuery
    ? mockClinicRecords.filter(r => r.patientName.includes(searchQuery))
    : mockClinicRecords

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">选择门诊记录</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索患者姓名..."
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="px-4 pb-4 space-y-2 max-h-96 overflow-y-auto">
          {filtered.map(record => (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelect(record)}
              className="w-full text-left p-3 rounded-lg border hover:border-[#0BBECF] transition-colors"
            >
              <div className="font-medium text-gray-800">{record.patientName}</div>
              <div className="text-xs text-gray-500 mt-1">
                {record.gender} · {record.age}岁 · {record.phone} · {record.dept} · {record.doctor} · {record.visitTime}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 在主组件中渲染门诊记录弹窗**

在 CreateReferral 组件的 return 前添加弹窗：

```jsx
<ClinicRecordPicker
  isOpen={patientLinkMode === 'clinic'}
  onClose={() => setPatientLinkMode(null)}
  onSelect={(record) => {
    setLinkedPatient({
      name: record.patientName,
      gender: record.gender,
      age: record.age,
      phone: record.phone,
      idCard: '',
      clinicId: record.id,
      dept: record.dept,
      doctor: record.doctor,
      visitTime: record.visitTime,
    })
    setPatientLinkMode(null)
  }}
/>
```

---

### Task 3: 实现患者信息自动带出和表单调整

**Files:**
- Modify: `src/pages/primary/CreateReferral.jsx:668-737`

- [ ] **Step 1: 修改 form 初始化逻辑，根据 linkedPatient 自动带出**

在 renderNormalFlow 第1步中，将原有表单字段改为条件渲染：

```jsx
{form.sourceVisitType && (
  <div className="grid grid-cols-2 gap-4">
    {/* 姓名 - 关联后只读，平时可编辑 */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        姓名 {patientLinkMode !== 'manual' && <span className="text-gray-400 font-normal">(已关联)</span>}
      </label>
      <input
        type="text"
        value={form.patientName}
        onChange={event => setForm(prev => ({ ...prev, patientName: event.target.value }))}
        placeholder="患者姓名"
        readOnly={!!linkedPatient}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`}
      />
    </div>

    {/* 性别 - 关联后只读 */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        性别 {patientLinkMode !== 'manual' && <span className="text-gray-400 font-normal">(已关联)</span>}
      </label>
      <div className="flex gap-3">
        {['男', '女'].map(gender => (
          <button
            key={gender}
            type="button"
            onClick={() => setForm(prev => ({ ...prev, patientGender: gender }))}
            disabled={!!linkedPatient}
            className="flex-1 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50"
            style={form.patientGender === gender
              ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
              : { background: '#fff', color: '#4b5563', borderColor: '#d1d5db' }}
          >
            {gender}
          </button>
        ))}
      </div>
    </div>

    {/* 年龄 - 改为自动计算展示，无独立输入框 */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        年龄
      </label>
      <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
        {linkedPatient?.age || form.patientAge || '—'} {linkedPatient?.age || form.patientAge ? '岁' : ''}
      </div>
      <div className="text-xs text-gray-400 mt-1">根据关联信息自动带出</div>
    </div>

    {/* 联系电话 - 关联后只读 */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        联系电话 {patientLinkMode !== 'manual' && <span className="text-gray-400 font-normal">(已关联)</span>}
      </label>
      <input
        type="text"
        value={form.patientPhone}
        onChange={event => setForm(prev => ({ ...prev, patientPhone: event.target.value }))}
        placeholder="13800138000"
        readOnly={!!linkedPatient}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`}
      />
    </div>

    {/* 身份证号 - 关联后只读 */}
    <div className="col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        身份证号
        <span className="text-gray-400 text-xs ml-1">（后4位显示，系统自动脱敏）</span>
      </label>
      <input
        type="text"
        value={form.patientIdCard}
        onChange={event => setForm(prev => ({ ...prev, patientIdCard: event.target.value }))}
        placeholder="510623***1234"
        readOnly={!!linkedPatient}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none ${linkedPatient ? 'bg-gray-50' : ''}`}
      />
    </div>
  </div>
)}
```

- [ ] **Step 2: 新增关联门诊记录展示字段**

在患者基本信息后（同一 grid 内）新增门诊信息展示：

```jsx
{linkedPatient?.clinicId && (
  <div className="col-span-2 mt-2 p-3 rounded-lg" style={{ background: '#F0FBFC', border: '1px solid #DDF0F3' }}>
    <div className="text-xs font-medium" style={{ color: '#0892a0' }}>���前门诊信息</div>
    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
      <div>
        <span className="text-gray-400">门诊号：</span>
        <span className="font-medium text-gray-800">{linkedPatient.clinicId}</span>
      </div>
      <div>
        <span className="text-gray-400">科室：</span>
        <span className="font-medium text-gray-800">{linkedPatient.dept}</span>
      </div>
      <div>
        <span className="text-gray-400">医生：</span>
        <span className="font-medium text-gray-800">{linkedPatient.doctor}</span>
      </div>
      <div>
        <span className="text-gray-400">就诊时间：</span>
        <span className="font-medium text-gray-800">{linkedPatient.visitTime}</span>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: 修改 normalCanNext 验证逻辑**

在第250-264行的 normalCanNext 条件中，新增关联模式验证：

```jsx
const normalCanNext = [
  form.sourceVisitType && form.patientName && form.patientGender && (form.patientAge || linkedPatient?.age) && form.patientPhone,
  // ... 其他步骤验证保持不变
][normalStep]
```

---

### Task 4: 确认页年龄展示调整

**Files:**
- Modify: `src/pages/primary/CreateReferral.jsx:1029`

- [ ] **Step 1: 修改确认页年龄展示**

在第1029行，将年龄展示改为从 linkedPatient 获取：

```jsx
['年龄', `${linkedPatient?.age || form.patientAge}岁`],
```

---

### Task 5: 提交测试验证

**Files:**
- Modify: 无（运行验证）

- [ ] **Step 1: 启动开发服务器**

运行: `npm run dev`

- [ ] **Step 2: 手动验证项**

1. 进入发起转出申请 → 选择普通转诊
2. 选择门诊患者/住院患者
3. 确认顶部显示"优先通过门诊记录或居民档案关联患者信息，减少重复录入。"
4. 确认显示三个关联入口按钮，"关联门诊记录"视觉最突出
5. 点击"关联门诊记录"，弹出选择窗口
6. 选择一条门诊记录，确认信息自动带出
7. 确���带出字段为只读状态
8. 确认显示门诊号、科室、医生、就诊时间
9. 确认年龄字段为只读展示，无输入框
10. 点击"手工新增患者"，确认提示显示且可手工录入
11. 完成流程到第5步，确认提交成功
12. 确认"返回""下一步""保存草稿并返回工作台"按钮存在

---

### Task 6: 提交代码

- [ ] **Step 1: 提交更改**

```bash
git add src/pages/primary/CreateReferral.jsx
git commit -m "feat: 患者信息第1步改为关联优先模式

- 新增患者关联区域，包含三个入口（关联门诊记录、关联居民档案、手工新增）
- 关联门诊记录可自动带出患者信息
- 年龄字段改为自动计算展示，无独立输入框
- 新增门诊信息展示（门诊号、科室、医生、就诊时间）
- 调整只读/编辑状态逻辑"
```
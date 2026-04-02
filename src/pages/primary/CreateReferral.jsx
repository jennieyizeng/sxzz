import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ICD10_LIST, INSTITUTIONS, MOCK_PATIENTS, ROLES } from '../../data/mockData'

// CHG-31：绿色通道触发诊断（5大中心疾病 ICD-10 前缀）
const GREEN_CHANNEL_ICD_PREFIXES = ['I21', 'I20', 'I63', 'I64', 'I50', 'J80', 'S06', 'K80', 'I46']

// CHG-31：急诊紧急等级配置
const URGENCY_LEVELS = [
  { level: 1, label: 'I级·急危', desc: '生命体征不稳定，需立即处理（如心跳骤停、呼吸衰竭）', color: '#ef4444', bg: '#fef2f2' },
  { level: 2, label: 'II级·急重', desc: '生命体征暂稳，可能迅速恶化（如急性心梗、脑卒中）', color: '#f97316', bg: '#fff7ed' },
  { level: 3, label: 'III级·急症', desc: '有急性症状，需及时处理（如急腹症、骨折）', color: '#eab308', bg: '#fefce8' },
  { level: 4, label: 'IV级·亚急', desc: '症状较轻，病情稳定，需要处理但不紧急', color: '#6b7280', bg: '#f9fafb' },
]

// ── 步骤配置 ──
const STEPS = ['患者信息', '诊断及原因', '选择机构', '知情同意', '确认提交']

// ── ICD-10搜索组件 ──
function ICD10Search({ value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = query.length >= 1
    ? ICD10_LIST.filter(d =>
      d.name.includes(query) || d.code.toLowerCase().includes(query.toLowerCase())
    )
    : []

  const handleSelect = (item) => {
    onChange(item)
    setQuery(item.name)
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={query || (value ? value.name : '')}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="输入诊断名称或ICD编码（如：高血压、I10）"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ '--tw-ring-color': '#0BBECF' }}
        />
        {value && (
          <div className="flex items-center px-3 py-2 rounded-lg text-sm" style={{ background: '#E0F6F9', border: '1px solid #a4edf5', color: '#0892a0' }}>
            <span className="font-mono font-semibold mr-1">{value.code}</span>
          </div>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto">
          {filtered.map(item => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <span className="font-mono text-xs px-1.5 py-0.5 rounded w-16 text-center" style={{ background: '#E0F6F9', color: '#0892a0' }}>{item.code}</span>
              <span className="text-sm text-gray-700">{item.name}</span>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}

// ── 知情同意弹窗 ──
function ConsentModal({ patient, onSign, onSendSMS, onClose }) {
  const [mode, setMode] = useState('qrcode') // qrcode | sms
  const [smsSent, setSmsSent] = useState(false)
  const [signed, setSigned] = useState(false)

  const handleSign = () => {
    setSigned(true)
    setTimeout(() => {
      onSign()
    }, 1500)
  }

  const handleSendSMS = () => {
    setSmsSent(true)
    setTimeout(() => {
      onSendSMS()
    }, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden">
        {/* 弹窗标题 */}
        <div className="px-6 py-4 text-white" style={{ background: '#0BBECF' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg">患者知情同意签署</div>
              <div className="text-sm mt-0.5" style={{ color: '#d0f7fa' }}>患者：{patient?.name} · {patient?.phone}</div>
            </div>
            <button onClick={onClose} className="text-xl" style={{ color: '#a4edf5' }}>×</button>
          </div>
        </div>

        <div className="p-6">
          {/* 签署方式选择 */}
          <div className="flex gap-3 mb-5">
            <button
              onClick={() => setMode('qrcode')}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors"
              style={mode === 'qrcode'
                ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                : { background: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}
            >
              📱 患者在场扫码签署
            </button>
            <button
              onClick={() => setMode('sms')}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors"
              style={mode === 'sms'
                ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                : { background: '#fff', color: '#4b5563', borderColor: '#e5e7eb' }}
            >
              💬 发短信链接签署
            </button>
          </div>

          {mode === 'qrcode' ? (
            <div className="text-center">
              {/* 模拟二维码 */}
              <div className="w-40 h-40 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 mb-4">
                <div className="text-4xl mb-1">📷</div>
                <div className="text-xs">知情同意二维码</div>
                <div className="text-xs text-gray-300 mt-1">（法大大·电子签名）</div>
              </div>
              <p className="text-sm text-gray-600 mb-2">请患者使用微信扫描上方二维码</p>
              <p className="text-xs text-gray-400 mb-4">签署完成后系统自动生成带时间戳PDF存档</p>

              {!signed ? (
                <button
                  onClick={handleSign}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  ✓ 模拟：患者已完成签署
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 py-3 bg-green-50 border border-green-200 rounded-lg text-green-600">
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-medium">签署完成，正在处理...</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-600 mb-2">短信将发送至患者手机：</div>
                <div className="font-mono text-base font-semibold text-gray-800">{patient?.phone}</div>
                <div className="text-xs text-gray-400 mt-1">短信内容：【双向转诊】您好，医生申请为您办理转诊，请点击链接签署知情同意书：[链接]</div>
              </div>

              {!smsSent ? (
                <button
                  onClick={handleSendSMS}
                  className="w-full py-2.5 text-white rounded-lg text-sm font-medium transition-colors"
                  style={{ background: '#0BBECF' }}
                >
                  📤 发送知情同意短信
                </button>
              ) : (
                <div>
                  <div className="flex items-center gap-2 py-3 bg-green-50 border border-green-200 rounded-lg text-green-600 px-4 mb-3">
                    <span>✅</span>
                    <span className="text-sm">短信已发送，等待患者签署...</span>
                  </div>
                  <div className="text-xs text-gray-500 text-center mb-3">（原型模式：点击下方按钮模拟患者签署完成）</div>
                  <button
                    onClick={handleSign}
                    className="w-full py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    模拟患者点击链接并完成签署
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2">
            <span className="text-xs">ℹ️</span>
            <p className="text-xs text-gray-400">
              知情同意由法大大/e签宝提供电子签名服务，签署后生成带时间戳PDF文件存档，符合《电子签名法》要求
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// P1-4：ICD-10 → 推荐科室映射
const ICD10_DEPT_MAPPING = {
  'I10': ['内科', '心血管科'],
  'I21': ['心血管科'],
  'I63': ['神经内科'],
  'J18': ['呼吸科'],
  'K35': ['外科'],
  'N20': ['外科'],
  'E11': ['内分泌科'],
  'E14': ['内分泌科'],
  'M16': ['骨科'],
  'S72': ['骨科'],
}

export default function CreateReferral() {
  const navigate = useNavigate()
  const location = useLocation()
  const { submitReferral, submitForInternalReview, currentUser, referrals } = useApp()
  const [step, setStep] = useState(0)
  const [showConsent, setShowConsent] = useState(false)
  const [consentDone, setConsentDone] = useState(false)
  // CHG-31：转诊类型 + 紧急等级 + 意识状态
  const [referralType, setReferralType] = useState('normal')       // 'normal' | 'emergency' | 'green_channel'
  const [urgencyLevel, setUrgencyLevel] = useState(null)            // null | 1 | 2 | 3 | 4
  const [consciousnessStatus, setConsciousnessStatus] = useState('') // 'conscious' | 'unconscious' | 'unclear'
  // J-4：承接方式偏好（基层医生填写，供转诊中心参考；住院时触发床位余量展示）
  const [admissionTypePref, setAdmissionTypePref] = useState('outpatient') // 'outpatient' | 'inpatient'
  const [showGreenChannelModal, setShowGreenChannelModal] = useState(false)
  // P1-4: ICD-10推荐科室气泡
  const [deptSuggestion, setDeptSuggestion] = useState(null) // null | { depts: [] }
  // C-02: 病历附件上传
  const [attachments, setAttachments] = useState([]) // [{ name, size, type, url }]

  // CHG-31：是否急诊（emergency 或 green_channel 均视为急诊）
  const isEmergency = referralType !== 'normal'
  // CHG-31：ICD-10是否命中5大中心疾病
  const isGreenChannelDiag = form => {
    if (!form.diagnosis) return false
    return GREEN_CHANNEL_ICD_PREFIXES.some(prefix => (form.diagnosis.code || '').startsWith(prefix))
  }

  // 预填数据：来自 navigate state（换机构重新申请 或 内审拒绝后修改重提）
  const prefill = location.state?.prefill
  // 内审拒绝重提时通过机构名反查 ID
  const prefillInstitutionId = prefill?.toInstitutionId ||
    (prefill?.toInstitution ? (INSTITUTIONS.find(i => i.name === prefill.toInstitution)?.id || '') : '')

  // 表单数据
  const [form, setForm] = useState({
    patientId: prefill?.patient?.id || '',
    patientName: prefill?.patient?.name || '',
    patientGender: prefill?.patient?.gender || '',
    patientAge: prefill?.patient?.age ? String(prefill.patient.age) : '',
    patientIdCard: prefill?.patient?.idCard || '',
    patientPhone: prefill?.patient?.phone || '',
    chiefComplaint: prefill?.chiefComplaint || '',
    diagnosis: prefill?.diagnosis || null,
    reason: prefill?.reason || '',
    toInstitutionId: prefillInstitutionId,
    toDept: prefill?.toDept || '',
    remark: '',
  })

  // 快速填入模拟患者
  const fillMockPatient = (patient) => {
    setForm(f => ({
      ...f,
      patientId: patient.id,
      patientName: patient.name,
      patientGender: patient.gender,
      patientAge: String(patient.age),
      patientIdCard: patient.idCard,
      patientPhone: patient.phone,
    }))
  }

  const selectedInstitution = INSTITUTIONS.find(i => i.id === form.toInstitutionId)
  // P0-4: 满额判断（满额不禁用，只显示警告）
  const selectedDeptInfo = selectedInstitution?.departmentInfo?.[form.toDept]
  const selectedDeptFull = selectedDeptInfo && selectedDeptInfo.dailyQuota > 0
    && (selectedDeptInfo.dailyQuota - selectedDeptInfo.todayReserved) <= 0

  // J-4：床位余量计算（住院承接模式下，统计今日已预占床位数）
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const bedOccupied = form.toDept && selectedDeptInfo?.dailyReservedBeds > 0
    ? referrals.filter(r =>
        r.toDept === form.toDept &&
        r.bedStatus === 'bed_reserved' &&
        r.admissionArrangement?.bedReservedAt &&
        new Date(r.admissionArrangement.bedReservedAt) >= todayStart
      ).length
    : 0
  const bedRemaining = (selectedDeptInfo?.dailyReservedBeds ?? 0) - bedOccupied
  const bedFull = selectedDeptInfo?.dailyReservedBeds > 0 && bedRemaining <= 0

  // P1-03 / CHG-31: 急诊/绿通可豁免知情同意（24h内补录）
  const canNext = [
    // step 0: 患者信息
    form.patientName && form.patientGender && form.patientAge && form.patientPhone,
    // step 1: 诊断及原因（急诊仅需主诉+诊断，原因可选填）
    isEmergency
      ? (form.chiefComplaint && form.diagnosis)
      : (form.chiefComplaint && form.diagnosis && form.reason),
    // step 2: 选择机构
    form.toInstitutionId && form.toDept,
    // step 3: 知情同意（急诊/绿通可豁免）
    consentDone || isEmergency,
    // step 4: 确认
    true,
  ][step]

  const handleSubmit = () => {
    const patient = {
      id: form.patientId || `p${Date.now()}`,
      name: form.patientName,
      gender: form.patientGender,
      age: parseInt(form.patientAge),
      idCard: form.patientIdCard || '510623***0000',
      phone: form.patientPhone,
    }
    const institution = INSTITUTIONS.find(i => i.id === form.toInstitutionId)

    // CHG-31：确定最终 referral_type（绿通 > 急诊 > 普通）
    const finalType = referralType
    const finalIsEmergency = finalType !== 'normal'

    const referralPayload = {
      type: 'upward',
      patient,
      diagnosis: form.diagnosis,
      chiefComplaint: form.chiefComplaint,
      reason: form.reason || '（急诊转诊）',
      fromInstitution: currentUser.institution,
      fromDoctor: currentUser.name,
      toInstitution: institution?.name,
      toDept: form.toDept,
      // CHG-31 新增字段
      referral_type: finalType,
      urgencyLevel: finalIsEmergency ? urgencyLevel : null,
      consciousnessStatus: finalIsEmergency ? consciousnessStatus : null,
      // A-13: 急诊转诊标记（向后兼容）
      is_emergency: finalIsEmergency,
      // P0-4: 满额时写入内部备注
      ...(selectedDeptFull ? { internalNote: '提交时号源已满，需人工协调' } : {}),
      // J-4：基层医生填写的承接方式偏好（供转诊中心参考）
      admissionTypePref,
      // C-02: 病历附件
      attachments: attachments.map(f => ({ name: f.name, size: f.size })),
      consentSigned: consentDone,
      consentDeferred: finalIsEmergency && !consentDone,
      logs: [
        ...(consentDone ? [{ time: new Date().toISOString(), actor: currentUser.name, action: '完成患者知情同意签署' }] : []),
        ...(finalIsEmergency && !consentDone ? [{ time: new Date().toISOString(), actor: currentUser.name, action: '急诊豁免知情同意，24小时内补录' }] : []),
        ...(finalType === 'green_channel' ? [{ time: new Date().toISOString(), actor: currentUser.name, action: `发起绿色通道急诊上转（${URGENCY_LEVELS.find(u => u.level === urgencyLevel)?.label || '未指定等级'}）` }] : []),
      ],
    }

    let newId
    // CHG-31/32：急诊/绿通绕过院内审核，直接进入 PENDING；普通上转走 F-02 院内审核流程
    if (finalIsEmergency) {
      newId = submitReferral(referralPayload)
    } else {
      newId = submitForInternalReview(referralPayload)
    }
    navigate(`/referral/${newId}`)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/primary/dashboard')} className="hover:underline" style={{ color: '#0BBECF' }}>工作台</button>
          <span>›</span>
          <span>发起上转</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-800">发起上转申请</h1>
      </div>

      {/* CHG-31：急诊/绿通提示条 */}
      {referralType === 'green_channel' && (
        <div className="mb-4 rounded-lg px-4 py-3 flex items-start gap-3" style={{ background: '#f0fdf4', border: '2px solid #10b981' }}>
          <span className="text-xl flex-shrink-0">🟢</span>
          <div className="flex-1">
            <span className="text-sm font-bold text-green-800">绿色通道已开启</span>
            <span className="text-sm text-green-700 ml-2">提交后将立即同时通知对口医生、科室负责人及管理员，无需等待排队</span>
            <div className="text-xs text-green-600 mt-1">知情同意可在接诊后24小时内补录 · 院内审核自动豁免</div>
          </div>
          <button onClick={() => { setReferralType('emergency'); setShowGreenChannelModal(false) }}
            className="text-green-500 hover:text-green-700 text-xs whitespace-nowrap">取消绿通</button>
        </div>
      )}
      {referralType === 'emergency' && (
        <div className="bg-orange-50 border border-orange-300 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-orange-500 text-base">🚨</span>
          <div className="flex-1">
            <span className="text-sm font-semibold text-orange-800">急诊转诊</span>
            <span className="text-sm text-orange-700 ml-2">提交后立即三方通知，知情同意可24h内补录，院内审核自动豁免</span>
          </div>
          <button onClick={() => { setReferralType('normal'); setUrgencyLevel(null) }}
            className="text-orange-400 hover:text-orange-600 text-sm whitespace-nowrap ml-2">
            取消急诊
          </button>
        </div>
      )}

      {/* 步骤条 */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
                style={
                  i < step ? { background: '#10b981', color: '#fff' } :
                  i === step ? { background: '#0BBECF', color: '#fff', boxShadow: '0 0 0 4px #B2EEF5' } :
                  { background: '#f3f4f6', color: '#9ca3af' }
                }
              >
                {i < step ? '✓' : i + 1}
              </div>
              <div
                className="text-xs mt-1.5 whitespace-nowrap"
                style={
                  i === step ? { color: '#0BBECF', fontWeight: '500' } :
                  i < step ? { color: '#10b981' } :
                  { color: '#9ca3af' }
                }
              >
                {s}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mt-[-12px] rounded"
                style={{ background: i < step ? '#67dfe9' : '#e5e7eb' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* 表单卡片 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        {/* Step 0: 患者信息 */}
        {step === 0 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">患者基本信息</h2>

            {/* 快速填入按钮 */}
            <div className="mb-4 p-3 rounded-lg" style={{ background: '#F0FBFC', border: '1px solid #C8EEF3' }}>
              <div className="text-xs font-medium mb-2" style={{ color: '#0892a0' }}>📝 快速填入模拟患者数据</div>
              <div className="flex gap-2">
                {Object.values(MOCK_PATIENTS).map(p => (
                  <button
                    key={p.id}
                    onClick={() => fillMockPatient(p)}
                    className="px-3 py-1.5 bg-white rounded-lg text-sm transition-colors"
                    style={{ border: '1px solid #a4edf5', color: '#0892a0' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0FBFC'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    {p.name}（{p.age}岁·{p.gender}）
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.patientName}
                  onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))}
                  placeholder="患者姓名"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  性别 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  {['男', '女'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, patientGender: g }))}
                      className="flex-1 py-2 rounded-lg text-sm border transition-colors"
                      style={form.patientGender === g
                        ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                        : { background: '#fff', color: '#4b5563', borderColor: '#d1d5db' }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  年龄 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.patientAge}
                  onChange={e => setForm(f => ({ ...f, patientAge: e.target.value }))}
                  placeholder="岁"
                  min={0} max={150}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  联系电话 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.patientPhone}
                  onChange={e => setForm(f => ({ ...f, patientPhone: e.target.value }))}
                  placeholder="138****5678"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  身份证号
                  <span className="text-gray-400 text-xs ml-1">（后4位显示，系统自动脱敏）</span>
                </label>
                <input
                  type="text"
                  value={form.patientIdCard}
                  onChange={e => setForm(f => ({ ...f, patientIdCard: e.target.value }))}
                  placeholder="510623***1234"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: 诊断及原因 */}
        {step === 1 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">诊断及转诊原因</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  主诉与现病史 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.chiefComplaint}
                  onChange={e => setForm(f => ({ ...f, chiefComplaint: e.target.value }))}
                  rows={3}
                  placeholder="描述患者主要症状、发病时间、病情演变等（如：反复头痛、头晕3天，测血压最高180/110mmHg...）"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  初步诊断（ICD-10）<span className="text-red-500">*</span>
                </label>
                <ICD10Search value={form.diagnosis} onChange={d => {
                  setForm(f => ({ ...f, diagnosis: d }))
                  // P1-4: 触发科室推荐
                  const prefix = d.code.slice(0, 3)
                  const suggested = ICD10_DEPT_MAPPING[prefix] || ICD10_DEPT_MAPPING[d.code]
                  setDeptSuggestion(suggested ? { depts: suggested } : null)
                }} />
                {form.diagnosis && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                    <span>✓</span>
                    <span>已选：<strong>{form.diagnosis.code}</strong> {form.diagnosis.name}</span>
                  </div>
                )}
                {/* P1-4: 推荐科室气泡 */}
                {deptSuggestion && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <span style={{ color: '#2563EB' }}>💡 推荐科室：</span>
                    {deptSuggestion.depts.map(dept => (
                      <button key={dept} type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, toDept: dept }))
                          setDeptSuggestion(null)
                        }}
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                        {dept}
                      </button>
                    ))}
                    <button type="button" onClick={() => setDeptSuggestion(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">忽略</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  转诊原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  rows={2}
                  placeholder="说明转诊必要性（如：血压控制欠佳，需进一步检查和调整治疗方案）"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                />
              </div>

              {/* C-02：病历附件上传 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  病历附件
                  <span className="text-xs text-gray-400 font-normal ml-2">（选填，支持 PDF / JPG / PNG，单文件 ≤ 10MB）</span>
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-[#0BBECF] transition-colors">
                  {attachments.length === 0 ? (
                    <label className="flex flex-col items-center gap-2 cursor-pointer">
                      <span className="text-2xl">📎</span>
                      <span className="text-sm text-gray-500">点击选择或拖拽文件到此处</span>
                      <span className="text-xs text-gray-400">PDF、JPG、PNG，单文件 ≤ 10MB</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={e => {
                          const files = Array.from(e.target.files || [])
                          const newFiles = files.map(f => ({
                            name: f.name,
                            size: (f.size / 1024 / 1024).toFixed(2) + 'MB',
                            type: f.type,
                            url: URL.createObjectURL(f)
                          }))
                          setAttachments(prev => [...prev, ...newFiles])
                          e.target.value = ''
                        }}
                      />
                    </label>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span>{file.type?.includes('pdf') ? '📄' : '🖼️'}</span>
                            <span className="text-gray-800 truncate max-w-[200px]">{file.name}</span>
                            <span className="text-gray-400 text-xs">{file.size}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-red-500 text-xs ml-2"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                      <label className="flex items-center gap-1 text-xs cursor-pointer mt-1" style={{ color: '#0BBECF' }}>
                        <span>+ 继续添加</span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={e => {
                            const files = Array.from(e.target.files || [])
                            const newFiles = files.map(f => ({
                              name: f.name,
                              size: (f.size / 1024 / 1024).toFixed(2) + 'MB',
                              type: f.type,
                              url: URL.createObjectURL(f)
                            }))
                            setAttachments(prev => [...prev, ...newFiles])
                            e.target.value = ''
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* CHG-31：转诊类型选择 */}
              <div className="pt-1 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  转诊类型 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  {[
                    { value: 'normal', label: '普通转诊', icon: '📋', desc: '常规流程，经院内审核后推送县级' },
                    { value: 'emergency', label: '急诊转诊', icon: '🚨', desc: '立即三方通知，豁免院内审核' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setReferralType(opt.value)
                        if (opt.value === 'normal') { setUrgencyLevel(null); setConsciousnessStatus('') }
                      }}
                      className="flex-1 flex items-start gap-2 px-3 py-3 rounded-lg border text-left transition-colors"
                      style={referralType === opt.value || (opt.value === 'emergency' && referralType === 'green_channel')
                        ? { borderColor: opt.value === 'normal' ? '#0BBECF' : '#ef4444', background: opt.value === 'normal' ? '#f0fbfc' : '#fef2f2' }
                        : { borderColor: '#e5e7eb', background: '#fff' }}
                    >
                      <span className="text-base mt-0.5">{opt.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* CHG-31：急诊等级选择（选了急诊后展示） */}
              {referralType !== 'normal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    急诊紧急等级 <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal text-xs ml-1">（I/II级将自动开启绿色通道）</span>
                  </label>
                  <div className="space-y-2">
                    {URGENCY_LEVELS.map(u => (
                      <button
                        key={u.level}
                        type="button"
                        onClick={() => {
                          setUrgencyLevel(u.level)
                          // I/II 级自动触发绿通
                          if (u.level <= 2) {
                            setReferralType('green_channel')
                          } else {
                            setReferralType('emergency')
                          }
                        }}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors"
                        style={urgencyLevel === u.level
                          ? { borderColor: u.color, background: u.bg }
                          : { borderColor: '#e5e7eb', background: '#fff' }}
                      >
                        <span className="font-bold text-sm flex-shrink-0 mt-0.5" style={{ color: u.color }}>{u.label}</span>
                        <span className="text-xs text-gray-500">{u.desc}</span>
                      </button>
                    ))}
                  </div>
                  {urgencyLevel !== null && urgencyLevel <= 2 && (
                    <div className="mt-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d' }}>
                      ✅ 已自动开启绿色通道（I/II级急危重症）：提交后立即三方通知，跳过排队和院内审核
                    </div>
                  )}
                </div>
              )}

              {/* CHG-31：ICD-10命中5大中心疾病提示 */}
              {form.diagnosis && isGreenChannelDiag(form) && referralType === 'normal' && (
                <div className="px-3 py-2.5 rounded-lg text-sm flex items-start gap-2" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                  <span>💡</span>
                  <div>
                    <span className="font-medium text-green-800">该诊断符合绿色通道适应症</span>
                    <span className="text-green-600 ml-1">（{form.diagnosis.name}属于五大中心疾病范围）</span>
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => { setReferralType('emergency'); setShowGreenChannelModal(false) }}
                        className="text-xs text-green-700 underline"
                      >
                        切换为急诊转诊 →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CHG-31：急诊意识状态 */}
              {referralType !== 'normal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    患者意识状态
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'conscious', label: '神志清醒' },
                      { value: 'unclear', label: '意识模糊' },
                      { value: 'unconscious', label: '意识丧失' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setConsciousnessStatus(opt.value)}
                        className="flex-1 py-2 rounded-lg border text-sm transition-colors"
                        style={consciousnessStatus === opt.value
                          ? { borderColor: '#0BBECF', background: '#f0fbfc', color: '#0892a0', fontWeight: '500' }
                          : { borderColor: '#e5e7eb', color: '#6b7280' }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: 选择机构 */}
        {step === 2 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">选择接收机构及科室</h2>
            <div className="space-y-3">
              {INSTITUTIONS.filter(i => i.type === 'county').map(inst => (
                <div
                  key={inst.id}
                  onClick={() => setForm(f => ({ ...f, toInstitutionId: inst.id, toDept: '' }))}
                  className="border rounded-xl p-4 cursor-pointer transition-all"
                  style={form.toInstitutionId === inst.id
                    ? { borderColor: '#0BBECF', background: '#F0FBFC', boxShadow: '0 0 0 2px #a4edf5' }
                    : { borderColor: '#e5e7eb', background: '#fff' }}
                  onMouseEnter={e => { if (form.toInstitutionId !== inst.id) e.currentTarget.style.borderColor = '#67dfe9' }}
                  onMouseLeave={e => { if (form.toInstitutionId !== inst.id) e.currentTarget.style.borderColor = '#e5e7eb' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-gray-800">{inst.name}</div>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full">{inst.status}</span>
                  </div>
                  <div className="text-xs text-gray-500">医共体成员机构 · 县级医院</div>
                </div>
              ))}
            </div>

            {selectedInstitution && (
              <div className="mt-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  期望接收科室 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedInstitution.departments.map(dept => {
                    const deptInfo = selectedInstitution.departmentInfo?.[dept]
                    const isSelected = form.toDept === dept
                    const remaining = deptInfo ? deptInfo.dailyQuota - deptInfo.todayReserved : null
                    const isFull = deptInfo && deptInfo.dailyQuota > 0 && remaining <= 0
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, toDept: dept }))}
                        className="rounded-lg border transition-all text-left"
                        style={isSelected
                          ? { borderColor: '#0BBECF', background: '#F0FBFC', boxShadow: '0 0 0 2px #a4edf5' }
                          : { borderColor: '#e5e7eb', background: '#fff' }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#67dfe9' }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#e5e7eb' }}
                      >
                        <div className="px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={isSelected ? { color: '#0892a0' } : { color: '#374151' }}>{dept}</span>
                            {deptInfo && deptInfo.dailyQuota > 0 && (
                              isFull
                                ? <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#fff7ed', color: '#ea580c' }}>今日已满（0/{deptInfo.dailyQuota}）</span>
                                : <span className="text-xs" style={{ color: '#6b7280' }}>剩余 {remaining}/{deptInfo.dailyQuota} 名额</span>
                            )}
                            {deptInfo && deptInfo.dailyQuota === 0 && (
                              <span className="text-xs text-gray-400">未配置转诊专用号源</span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-400">以上为转诊专用保留名额，不代表全院实际资源情况</div>
                {/* P0-4: 满额警告 Banner */}
                {selectedDeptFull && (
                  <div className="mt-3 flex items-start gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    <span className="flex-shrink-0 mt-0.5">⚠️</span>
                    <div>
                      <div className="font-medium">该科室今日转诊名额已满（0/{selectedDeptInfo.dailyQuota}）</div>
                      <div className="text-xs mt-0.5 text-amber-700">仍可提交申请，接诊医生将人工协调就诊安排</div>
                    </div>
                  </div>
                )}

                {/* J-4：承接方式偏好（基层医生填写供参考，住院时展示床位余量） */}
                {form.toDept && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-sm font-medium text-gray-700 mb-2">承接方式偏好（供转诊中心参考）</div>
                    <div className="flex gap-2">
                      {[
                        { value: 'outpatient', label: '门诊就诊' },
                        { value: 'inpatient',  label: '住院收治' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAdmissionTypePref(opt.value)}
                          className="flex-1 py-2 rounded-lg border text-sm transition-colors"
                          style={admissionTypePref === opt.value
                            ? { borderColor: '#0BBECF', background: '#f0fbfc', color: '#0892a0', fontWeight: '500' }
                            : { borderColor: '#e5e7eb', color: '#6b7280' }}
                        >{opt.label}</button>
                      ))}
                    </div>

                    {/* J-4：住院时显示床位余量 */}
                    {admissionTypePref === 'inpatient' && (
                      <div className="mt-3 rounded-lg border p-3" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                        <div className="text-sm font-semibold text-blue-800 mb-1">🏥 转诊专用床位</div>
                        {selectedDeptInfo?.dailyReservedBeds > 0 ? (
                          <>
                            <div className="text-sm">
                              今日剩余&nbsp;
                              <span className={`font-bold ${bedFull ? 'text-orange-500' : 'text-green-600'}`}>
                                {bedRemaining}
                              </span>
                              &nbsp;/&nbsp;{selectedDeptInfo.dailyReservedBeds} 床
                            </div>
                            {bedFull && (
                              <div className="mt-1.5 text-xs font-medium" style={{ color: '#C2410C' }}>
                                ⚠️ 今日转诊床位已满，仍可提交，转诊中心将人工协调
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-gray-400">该科室未配置转诊专用床位</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1.5">以上为转诊预留床位，不代表全院实际床位情况</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: 知情同意 */}
        {step === 3 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-2">患者知情同意</h2>
            <p className="text-sm text-gray-500 mb-5">
              根据医疗规范，患者转诊前须完成知情同意签署。系统通过法大大/e签宝提供合法电子签名服务。
            </p>

            {/* P1-03: 急诊豁免提示 */}
            {isEmergency && !consentDone && (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-start gap-3">
                <span className="text-orange-500 text-base mt-0.5">🚨</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-orange-800">急诊豁免：可先提交，24小时内补录知情同意</div>
                  <div className="text-xs text-orange-600 mt-0.5">
                    依据急诊绿色通道规范，急诊患者可先办理转诊，须在24小时内完成知情同意补录。
                    补录入口将出现在转诊详情页。
                  </div>
                </div>
              </div>
            )}

            {!consentDone ? (
              <div className="space-y-3">
                <button
                  onClick={() => setShowConsent(true)}
                  className="w-full flex items-center justify-between px-5 py-4 text-white rounded-xl transition-colors"
                  style={{ background: '#0BBECF' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#09A9BA'}
                  onMouseLeave={e => e.currentTarget.style.background = '#0BBECF'}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📱</span>
                    <div className="text-left">
                      <div className="font-semibold">患者在场 — 扫码签署</div>
                      <div className="text-sm" style={{ color: '#d0f7fa' }}>展示二维码，患者现场完成电子签名</div>
                    </div>
                  </div>
                  <span style={{ color: '#a4edf5' }}>›</span>
                </button>

                <button
                  onClick={() => setShowConsent(true)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💬</span>
                    <div className="text-left">
                      <div className="font-semibold">患者不在场 — 短信链接</div>
                      <div className="text-gray-400 text-sm">发送短信至 {form.patientPhone}，患者手机签署</div>
                    </div>
                  </div>
                  <span className="text-gray-300">›</span>
                </button>

                <div className="pt-3 border-t border-gray-100">
                  <button
                    onClick={() => navigate('/primary/dashboard')}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    💾 保存草稿，等知情同意完成后再提交
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mb-4">✅</div>
                <div className="text-lg font-semibold text-green-700 mb-1">知情同意已完成</div>
                <div className="text-sm text-gray-500">患者已完成电子签名，系统已生成带时间戳PDF存档</div>
                <div className="mt-3 text-xs text-gray-400">签署时间：{new Date().toLocaleString('zh-CN')}</div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: 确认提交 */}
        {step === 4 && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">确认提交信息</h2>
            <div className="space-y-3">
              <div className="rounded-xl divide-y divide-gray-100 overflow-hidden" style={{ background: '#f9fafb' }}>
                <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                  <span className="text-xs font-semibold uppercase" style={{ color: '#0892a0' }}>患者信息</span>
                </div>
                <div className="grid grid-cols-3 gap-0">
                  {[
                    ['姓名', form.patientName],
                    ['性别', form.patientGender],
                    ['年龄', `${form.patientAge}岁`],
                    ['联系电话', form.patientPhone],
                    ['身份证号', form.patientIdCard || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="px-4 py-2.5">
                      <div className="text-xs text-gray-400">{k}</div>
                      <div className="text-sm text-gray-800 font-medium mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl divide-y divide-gray-100 overflow-hidden" style={{ background: '#f9fafb' }}>
                <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                  <span className="text-xs font-semibold uppercase" style={{ color: '#0892a0' }}>诊断及原因</span>
                </div>
                <div className="px-4 py-2.5">
                  <div className="text-xs text-gray-400">初步诊断</div>
                  <div className="text-sm font-medium text-gray-800 mt-0.5">
                    {form.diagnosis?.code} {form.diagnosis?.name}
                  </div>
                </div>
                <div className="px-4 py-2.5">
                  <div className="text-xs text-gray-400">主诉</div>
                  <div className="text-sm text-gray-800 mt-0.5 line-clamp-2">{form.chiefComplaint}</div>
                </div>
                <div className="px-4 py-2.5">
                  <div className="text-xs text-gray-400">转诊原因</div>
                  <div className="text-sm text-gray-800 mt-0.5">{form.reason}</div>
                </div>
              </div>

              <div className="rounded-xl divide-y divide-gray-100 overflow-hidden" style={{ background: '#f9fafb' }}>
                <div className="px-4 py-2" style={{ background: '#E0F6F9' }}>
                  <span className="text-xs font-semibold uppercase" style={{ color: '#0892a0' }}>接收机构</span>
                </div>
                <div className="grid grid-cols-2 gap-0">
                  <div className="px-4 py-2.5">
                    <div className="text-xs text-gray-400">机构</div>
                    <div className="text-sm font-medium text-gray-800 mt-0.5">{selectedInstitution?.name}</div>
                  </div>
                  <div className="px-4 py-2.5">
                    <div className="text-xs text-gray-400">科室</div>
                    <div className="text-sm font-medium text-gray-800 mt-0.5">{form.toDept}</div>
                  </div>
                </div>
              </div>

              {consentDone ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                  <span>✅</span>
                  <span>患者知情同意已完成（电子签名存档）</span>
                </div>
              ) : isEmergency ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm">
                  <span>⚠️</span>
                  <span className="font-medium">急诊豁免</span>
                  <span className="text-orange-700">— 知情同意待补录（需在接诊后24小时内完成）</span>
                </div>
              ) : null}

              {/* CHG-31：转诊类型确认行 */}
              {referralType === 'green_channel' && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d' }}>
                  <span>🟢</span>
                  <span>绿色通道</span>
                  {urgencyLevel && <span className="text-green-600">· {URGENCY_LEVELS.find(u => u.level === urgencyLevel)?.label}</span>}
                  <span className="font-normal text-green-600">— 提交后立即三方通知，跳过排队</span>
                </div>
              )}
              {referralType === 'emergency' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-300 rounded-xl text-orange-800 text-sm">
                  <span>🚨</span>
                  <span className="font-medium">急诊转诊</span>
                  {urgencyLevel && <span className="text-orange-600">· {URGENCY_LEVELS.find(u => u.level === urgencyLevel)?.label}</span>}
                  <span className="text-orange-700">— 提交后立即三方通知，豁免院内审核</span>
                </div>
              )}
              {referralType === 'normal' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
                  <span>📋</span>
                  <span className="font-medium">普通转诊</span>
                  <span className="text-blue-700">— 提交后进入院内审核（F-02），科主任审核通过后推送县级</span>
                </div>
              )}
              {isEmergency && (
                <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-300 rounded-xl text-orange-800 text-sm hidden">
                  <span>🚨</span>
                  <span className="font-medium">急诊转诊</span>
                  <span className="text-orange-700">— 提交后将优先推送至县级接诊队列</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="px-6 py-4 flex items-center justify-between rounded-b-xl" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/primary/dashboard')}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-white transition-colors"
          >
            {step === 0 ? '取消' : '← 上一步'}
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/primary/dashboard')}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
            >
              💾 保存草稿
            </button>

            {step < STEPS.length - 1 ? (
              <button
                disabled={!canNext}
                onClick={() => setStep(s => s + 1)}
                className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                style={canNext
                  ? { background: '#0BBECF', color: '#fff' }
                  : { background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }}
              >
                下一步 →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                ✓ 提交上转申请
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 知情同意弹窗 */}
      {showConsent && (
        <ConsentModal
          patient={{ name: form.patientName, phone: form.patientPhone }}
          onSign={() => { setConsentDone(true); setShowConsent(false) }}
          onSendSMS={() => { setConsentDone(true); setShowConsent(false) }}
          onClose={() => setShowConsent(false)}
        />
      )}
    </div>
  )
}

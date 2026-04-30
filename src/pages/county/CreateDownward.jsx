import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { INSTITUTIONS } from '../../data/mockData'
import { SYSTEM_INSTITUTION_CONFIGS } from '../../data/systemAdminConfig'
import ConsentOfflinePanel from '../../components/ConsentOfflinePanel'
import { buildConsentFileRecord, validateConsentFile } from '../../utils/consentUpload'
import { DOWNWARD_REASON_OPTIONS } from '../../constants/reasonCodes'

const STEPS = ['患者与出院资料', '康复方案与接收安排', '知情同意', '提交确认']
const EMPTY_WESTERN_MEDICATION = {
  drugName: '',
  spec: '',
  singleDose: '',
  route: '',
  frequency: '',
  duration: '',
  remark: '',
  source: 'manual',
  showMore: false,
  meta: { department: '', doctor: '', orderedAt: '', stoppedAt: '', orderType: '' },
}
const EMPTY_CHINESE_MEDICATION = {
  formulaName: '',
  linkedNames: [],
  spec: '',
  singleDose: '',
  route: '',
  frequency: '',
  dosageForm: '',
  dailyDose: '',
  administration: '',
  duration: '',
  specialInstruction: '',
  source: 'manual',
  showMore: false,
  meta: { department: '', doctor: '', orderedAt: '', stoppedAt: '', orderType: '' },
}
const DOWNWARD_MEDICAL_REASON_OPTIONS = DOWNWARD_REASON_OPTIONS.filter(option => option.code !== 'patient_preference')
const DOWNWARD_TRIGGER_OPTIONS = [
  { value: 'doctor', label: '医生医学判断' },
  { value: 'patient', label: '患者/家属主动要求' },
  { value: 'shared', label: '两者共同决定' },
]
const MEDICATION_NOTE_RECOMMENDATIONS = [
  '注意监测出血倾向',
  '晚间服用',
  '按时复诊评估',
  '避免擅自停药',
  '规律监测血压',
  '异常不适及时复诊',
]
const ARCHIVE_CHECK_ITEMS = [
  '患者基础信息',
  '出院诊断',
  '出院小结',
  '用药医嘱',
  '推荐附件',
]
const REHAB_GOAL_OPTIONS = [
  { value: 'blood_pressure', label: '血压控制' },
  { value: 'blood_glucose', label: '血糖监测' },
  { value: 'wound_care', label: '伤口护理' },
  { value: 'medication_management', label: '用药管理' },
  { value: 'functional_training', label: '功能训练' },
  { value: 'other', label: '其他' },
]
const NURSING_POINT_OPTIONS = [
  { value: 'positioning', label: '体位要求' },
  { value: 'diet', label: '饮食禁忌' },
  { value: 'activity_limit', label: '活动限制' },
  { value: 'wound_care', label: '伤口护理' },
  { value: 'infusion', label: '输液管理' },
  { value: 'other', label: '其他' },
]
const WARNING_SYMPTOM_OPTIONS = [
  { value: 'fever', label: '发热' },
  { value: 'bleeding', label: '出血' },
  { value: 'pain', label: '疼痛加剧' },
  { value: 'consciousness', label: '意识改变' },
  { value: 'dyspnea', label: '呼吸困难' },
  { value: 'blood_pressure_abnormal', label: '血压异常' },
  { value: 'other', label: '其他' },
]
const MONITOR_RECOMMENDATIONS = [
  '血压',
  '血糖',
  '体温',
  '心率',
  '呼吸情况',
  '疼痛评分',
  '睡眠情况',
  '饮食情况',
  '排便情况',
  '伤口恢复',
  '用药依从性',
  '肢体活动情况',
]
const FOLLOWUP_DAYS_BY_REASON = {
  diagnosis: 7,
  specialist_eval: 7,
  treatment: 7,
  surgery: 3,
  resource_limit: 3,
  other: 7,
}
const PROXY_RELATION_OPTIONS = [
  { value: 'spouse', label: '配偶' },
  { value: 'parent', label: '父母' },
  { value: 'child', label: '子女' },
  { value: 'sibling', label: '兄弟姐妹' },
  { value: 'guardian', label: '其他监护人' },
  { value: 'other', label: '其他' },
]
const PROXY_REASON_OPTIONS = [
  { value: 'consciousness', label: '患者意识不清' },
  { value: 'cognitive', label: '认知障碍' },
  { value: 'authorized', label: '患者授权' },
  { value: 'other', label: '其他' },
]

const SOURCE_LIBRARY = {
  healthArchive: { label: '医共体健康档案系统', desc: '患者基础信息、历史住院档案' },
  dischargeSummary: { label: '出院小结', desc: '出院诊断、诊疗经过、出院建议' },
  inpatientHome: { label: '住院病历首页', desc: '主要诊断、住院信息' },
  progressNotes: { label: '病程记录', desc: '病情变化、治疗经过、康复计划' },
  orders: { label: '用药医嘱', desc: '继续用药、护理要求、监测要求' },
  prescription: { label: '出院处方', desc: '带药清单、服药方式、疗程建议' },
  lab: { label: '检验报告', desc: '近期检验结果与指标趋势' },
  imaging: { label: '检查报告', desc: '影像、超声、心电等检查结果' },
}

const PRIMARY_RECEIVER_OPTIONS = {
  inst002: [
    { id: 'u001', name: '王医生', team: '全科团队A', isFamilyDoctor: true, seenIn90d: true, recentCount30d: 12 },
    { id: 'u009', name: '李医生', team: '慢病管理组', isFamilyDoctor: false, seenIn90d: false, recentCount30d: 7 },
  ],
  inst003: [
    { id: 'u010', name: '周医生', team: '全科团队B', isFamilyDoctor: true, seenIn90d: false, recentCount30d: 10 },
    { id: 'u011', name: '陈医生', team: '慢病管理组', isFamilyDoctor: false, seenIn90d: true, recentCount30d: 4 },
  ],
}

const MISSING_PRIMARY_COORDINATOR_NOTICE = '当前基层机构未配置基层转诊负责人，暂不支持仅指定机构接收。请改为指定接收医生，或前往系统管理配置基层转诊负责人。'

function normalizeMockInstitutionId(id) {
  const match = String(id || '').match(/^inst(\d+)$/)
  return match ? `I${match[1]}` : id
}

function getPrimaryCoordinatorConfig(institutionId) {
  const mockInstitution = INSTITUTIONS.find(item => item.id === institutionId)
  const systemInstitutionId = normalizeMockInstitutionId(institutionId)
  return SYSTEM_INSTITUTION_CONFIGS.find(item =>
    item.id === systemInstitutionId ||
    item.name === mockInstitution?.name
  )
}

function hasPrimaryReferralCoordinator(institutionId) {
  if (!institutionId) return false
  const mockInstitution = INSTITUTIONS.find(item => item.id === institutionId)
  if (mockInstitution?.referralCoordinatorUserId || mockInstitution?.referralCoordinatorName) return true
  const systemInstitution = getPrimaryCoordinatorConfig(institutionId)
  return Boolean(systemInstitution?.referralCoordinatorUserId || systemInstitution?.referralCoordinatorName)
}

const PATIENT_SEARCH_RESULTS = [
  {
    id: 'mock-downward-zhangguifang',
    archiveId: 'HA20260410001',
    inpatientNo: 'ZY2026041001',
    patientId: 'p-mock-zhangguifang',
    patientName: '张桂芳',
    patientGender: '女',
    patientAge: '67',
    patientPhone: '13800138000',
    patientIdCard: '510623195904101248',
    patientIdCardMasked: '510623********1248',
    familyDoctorInstitutionId: 'inst002',
    familyDoctorInstitutionName: 'xx市拱星镇卫生院',
    recentVisit: 'xx市人民医院心内科住院，2026/04/10 出院',
    latestDischargeAt: '2026/04/10 09:30',
    archiveUpdatedAt: '2026/04/17 10:24',
    diagnosisText: '冠状动脉粥样硬化性心脏病',
    icd10: 'I25.1',
    clinicalSummary: '患者因反复胸闷胸痛住院治疗，完善心电图、心肌酶及冠脉相关检查后，诊断为冠状动脉粥样硬化性心脏病。住院期间予以抗血小板、调脂、改善循环等治疗，当前病情平稳，建议下转基层继续康复管理与长期随访。',
    handoffSummary: '已完成急性期治疗，当前生命体征平稳，建议下转基层继续慢病管理、服药随访和复查提醒。',
    westernMedications: [
      { drugName: '阿司匹林肠溶片', spec: '100mg', singleDose: '100mg', route: '口服', frequency: 'qd 饭后', duration: '连服3个月', remark: '', source: 'health_archive', showMore: false, meta: { department: '心内科', doctor: '张医生', orderedAt: '2026/04/09', stoppedAt: '', orderType: '出院带药' } },
      { drugName: '阿托伐他汀钙片', spec: '20mg', singleDose: '20mg', route: '口服', frequency: 'qn', duration: '长期', remark: '', source: 'health_archive', showMore: false, meta: { department: '心内科', doctor: '张医生', orderedAt: '2026/04/09', stoppedAt: '', orderType: '出院带药' } },
      { drugName: '单硝酸异山梨酯缓释片', spec: '40mg', singleDose: '40mg', route: '口服', frequency: 'qd', duration: '长期', remark: '', source: 'health_archive', showMore: false, meta: { department: '心内科', doctor: '张医生', orderedAt: '2026/04/09', stoppedAt: '', orderType: '出院带药' } },
    ],
    chineseMedications: [
      {
        formulaName: '血府逐瘀方',
        linkedNames: ['当归 10g', '赤芍 10g', '柴胡 6g', '甘草 3g'],
        spec: '饮片',
        singleDose: '1剂',
        route: '水煎服',
        frequency: '每日1剂',
        dosageForm: '饮片',
        dailyDose: '1剂',
        administration: '水煎服',
        duration: '7天',
        specialInstruction: '早晚分服',
        source: 'health_archive',
        showMore: false,
        meta: { department: '中西医结合科', doctor: '赵医生', orderedAt: '2026/04/08', stoppedAt: '2026/04/15', orderType: '中药处方' },
      },
    ],
    medicationNotes: ['注意监测出血倾向', '晚间服用', '按时复诊评估'],
    reviewSuggestions: [
      { projectName: '心电图复查', specimenType: '心电图', schedule: '2周后复查1次', remark: '必要时提前复查', source: 'health_archive' },
      { projectName: '血脂复查', specimenType: '静脉血', schedule: '1个月后复查', remark: '', source: 'health_archive' },
    ],
    attachments: [
      { key: 'dischargeSummary', name: '出院小结.pdf', source: '出院小结', category: 'recommended', fromSystem: true, size: '0.8MB', selected: true },
      { key: 'ecg', name: '心电图报告.pdf', source: '检查报告', category: 'recommended', fromSystem: true, size: '0.5MB', selected: true },
      { key: 'bloodLipid', name: '血脂检验报告.pdf', source: '检验报告', category: 'recommended', fromSystem: true, size: '0.4MB', selected: false },
      { key: 'cta', name: '冠脉CTA报告.pdf', source: '检查报告', category: 'supplemental', fromSystem: true, size: '1.2MB', selected: true },
    ],
    diagnosis: { code: 'I25.1', name: '冠状动脉粥样硬化性心脏病' },
  },
  {
    id: 'mock-downward-liujianguo',
    archiveId: 'HA20260412002',
    inpatientNo: 'ZY2026041202',
    patientId: 'p-mock-liujianguo',
    patientName: '刘建国',
    patientGender: '男',
    patientAge: '58',
    patientPhone: '13900139000',
    patientIdCard: '510623196804015621',
    patientIdCardMasked: '510623********5621',
    familyDoctorInstitutionId: 'inst003',
    familyDoctorInstitutionName: 'xx市春风镇卫生院',
    recentVisit: 'xx市人民医院神经内科住院，2026/04/12 出院',
    latestDischargeAt: '2026/04/12 11:20',
    archiveUpdatedAt: '2026/04/18 09:10',
    diagnosisText: '脑梗死恢复期',
    icd10: 'I63.9',
    clinicalSummary: '患者因肢体乏力、言语含糊住院治疗，完善头颅影像及神经系统评估后，诊断为脑梗死恢复期。住院期间予以抗血小板、调脂、改善循环及康复训练等治疗，当前病情稳定，建议下转基层继续康复随访。',
    handoffSummary: '建议基层持续开展肢体功能训练、用药依从性管理与血压血脂监测。',
    westernMedications: [
      { drugName: '阿司匹林肠溶片', spec: '100mg', singleDose: '100mg', route: '口服', frequency: 'qd 饭后', duration: '长期', remark: '', source: 'health_archive', showMore: false, meta: { department: '神经内科', doctor: '刘医生', orderedAt: '2026/04/11', stoppedAt: '', orderType: '出院带药' } },
      { drugName: '阿托伐他汀钙片', spec: '20mg', singleDose: '20mg', route: '口服', frequency: 'qn', duration: '长期', remark: '', source: 'health_archive', showMore: false, meta: { department: '神经内科', doctor: '刘医生', orderedAt: '2026/04/11', stoppedAt: '', orderType: '出院带药' } },
      { drugName: '胞磷胆碱钠片', spec: '0.2g', singleDose: '0.2g', route: '口服', frequency: 'tid', duration: '4周', remark: '配合康复训练', source: 'health_archive', showMore: false, meta: { department: '神经内科', doctor: '刘医生', orderedAt: '2026/04/11', stoppedAt: '', orderType: '康复辅助用药' } },
    ],
    chineseMedications: [],
    medicationNotes: ['规律监测血压', '异常不适及时复诊'],
    reviewSuggestions: [
      { projectName: '头颅CT复查', specimenType: '头颅CT', schedule: '1个月后复查', remark: '', source: 'health_archive' },
      { projectName: '凝血功能复查', specimenType: '静脉血', schedule: '2周后复查', remark: '', source: 'health_archive' },
    ],
    attachments: [
      { key: 'dischargeSummary', name: '出院小结.pdf', source: '出院小结', category: 'recommended', fromSystem: true, size: '0.8MB', selected: true },
      { key: 'brainCt', name: '头颅CT报告.pdf', source: '检查报告', category: 'recommended', fromSystem: true, size: '0.7MB', selected: true },
      { key: 'coagulation', name: '凝血功能检验报告.pdf', source: '检验报告', category: 'recommended', fromSystem: true, size: '0.4MB', selected: true },
    ],
    diagnosis: { code: 'I63.9', name: '脑梗死恢复期' },
  },
]

function StepProgress({ steps, currentStep }) {
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, index) => (
        <div key={label} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
              style={index < currentStep
                ? { background: '#10b981', color: '#fff' }
                : index === currentStep
                  ? { background: '#0BBECF', color: '#fff', boxShadow: '0 0 0 4px #B2EEF5' }
                  : { background: '#f3f4f6', color: '#9ca3af' }}
            >
              {index < currentStep ? '✓' : index + 1}
            </div>
            <div
              className="text-xs mt-1.5 whitespace-nowrap"
              style={index === currentStep
                ? { color: '#0BBECF', fontWeight: 600 }
                : index < currentStep
                  ? { color: '#10b981' }
                  : { color: '#9ca3af' }}
            >
              {label}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className="flex-1 h-0.5 mx-2 mt-[-12px] rounded"
              style={{ background: index < currentStep ? '#67dfe9' : '#e5e7eb' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function SectionTitle({ title, desc }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      {desc && <div className="text-xs text-gray-400 mt-1">{desc}</div>}
    </div>
  )
}

function FieldLabel({ children, required = false, hint, badge }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
      {badge && <span className="text-xs font-normal ml-2" style={{ color: '#0892A0' }}>{badge}</span>}
      {hint && <span className="text-xs text-gray-400 font-normal ml-2">{hint}</span>}
    </label>
  )
}

function SummaryBlock({ title, items, onEdit }) {
  return (
    <div className="rounded-xl overflow-hidden divide-y divide-gray-100" style={{ background: '#F9FAFB' }}>
      <div className="px-4 py-2 flex items-center justify-between" style={{ background: '#E0F6F9' }}>
        <span className="text-xs font-semibold" style={{ color: '#0892A0' }}>{title}</span>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-xs font-medium" style={{ color: '#0BBECF' }}>
            返回修改
          </button>
        )}
      </div>
      <div className="grid grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className={`px-4 py-2.5 ${typeof value === 'string' && value.length > 40 ? 'col-span-2' : ''}`}>
            <div className="text-xs text-gray-400">{label}</div>
            {Array.isArray(value) ? (
              <div className="flex flex-wrap gap-2 mt-1">
                {value.length === 0 ? (
                  <span className="text-sm font-medium text-gray-800">—</span>
                ) : value.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: '#E0F6F9', color: '#0892A0' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm font-medium text-gray-800 mt-0.5 whitespace-pre-line">{value || '—'}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SourceDialog({ title, sources, meta, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[560px] max-w-[92vw] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">关闭</button>
        </div>
        <div className="p-6 space-y-3">
          {meta && (
            <div className="rounded-xl px-4 py-3" style={{ background: '#F8FDFE', border: '1px solid #DDF0F3' }}>
              {meta.archiveId && <div className="text-sm text-gray-700">档案ID：{meta.archiveId}</div>}
              {meta.updatedAt && <div className="text-xs text-gray-500 mt-1">最后更新时间：{meta.updatedAt}</div>}
              {meta.sourceLabel && <div className="text-xs text-gray-500 mt-1">数据来源：{meta.sourceLabel}</div>}
            </div>
          )}
          {sources.map(key => (
            <div key={key} className="rounded-xl px-4 py-3" style={{ background: '#F8FDFE', border: '1px solid #DDF0F3' }}>
              <div className="text-sm font-medium text-gray-800">{SOURCE_LIBRARY[key]?.label || key}</div>
              <div className="text-xs text-gray-500 mt-1">{SOURCE_LIBRARY[key]?.desc || '系统数据来源'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-[440px] max-w-[92vw] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="px-6 py-5 text-sm text-gray-600 leading-6">{message}</div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
            取消
          </button>
          <button type="button" onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: '#0BBECF' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function MultiSelectChips({ options, values, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => {
        const optionValue = option.value || option.code
        const selected = values.includes(optionValue)
        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onToggle(optionValue)}
            className="px-3 py-1.5 rounded-full text-sm border transition-colors"
            style={selected
              ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
              : { background: '#fff', color: '#4B5563', borderColor: '#E5E7EB' }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function getAgeFromIdCard(idCard) {
  const normalized = String(idCard || '').trim()
  if (!/^\d{17}[\dXx]$/.test(normalized)) return ''
  const birth = normalized.slice(6, 14)
  const year = Number(birth.slice(0, 4))
  const month = Number(birth.slice(4, 6))
  const day = Number(birth.slice(6, 8))
  if (!year || !month || !day) return ''
  const today = new Date()
  let age = today.getFullYear() - year
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1
  return age >= 0 ? String(age) : ''
}

function maskIdCard(idCard) {
  if (!idCard) return '—'
  const value = String(idCard)
  if (value.length < 8) return value
  return `${value.slice(0, 6)}********${value.slice(-4)}`
}

function buildAutoData(record) {
  return {
    patientId: record.patientId,
    patientName: record.patientName,
    patientGender: record.patientGender,
    patientAge: record.patientAge,
    patientPhone: record.patientPhone,
    patientIdCard: record.patientIdCard,
    diagnosis: record.diagnosis,
    diagnosisText: record.diagnosisText,
    icd10: record.icd10,
    clinicalSummary: record.clinicalSummary,
    handoffSummary: record.handoffSummary || '',
    westernMedications: record.westernMedications || [],
    chineseMedications: record.chineseMedications || [],
    medicationNoteTags: record.medicationNotes || [],
    medicationNoteExtra: '',
    reviewSuggestions: record.reviewSuggestions || [],
    attachments: record.attachments,
    patientDataSource: 'health_archive',
    healthArchiveId: record.archiveId,
    archiveUpdatedAt: record.archiveUpdatedAt,
    latestDischargeAt: record.latestDischargeAt || '',
    autoPulledAt: new Date().toLocaleString('zh-CN'),
  }
}

function matchesPatientSearch(record, keyword) {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return true
  return [
    record.patientName,
    record.patientIdCard,
    record.patientIdCardMasked,
    record.patientPhone,
    record.inpatientNo,
    record.recentVisit,
  ].some(value => String(value || '').toLowerCase().includes(normalized))
}

function getOptionLabel(options, value) {
  return options.find(option => (option.value || option.code) === value)?.label || value
}

function getSelectedLabels(options, values, otherText = '') {
  return values.flatMap(value => {
    if (value === 'other') return otherText.trim() ? [otherText.trim()] : []
    return [getOptionLabel(options, value)]
  })
}

function buildOtherAwareText(options, values, otherText = '') {
  const labels = getSelectedLabels(options, values, otherText)
  return labels.length > 0 ? labels.join('、') : '—'
}

function getRelationTags(doctor) {
  const tags = []
  if (doctor.isFamilyDoctor) tags.push('家庭医生关联')
  return tags
}

function getTomorrowDate() {
  const next = new Date()
  next.setDate(next.getDate() + 1)
  return next.toISOString().split('T')[0]
}

function getDefaultFollowupDate() {
  return getDateAfterDays(7)
}

function getDateAfterDays(days) {
  const next = new Date()
  next.setDate(next.getDate() + days)
  return next.toISOString().split('T')[0]
}

function getMaxFollowupDate() {
  const next = new Date()
  next.setDate(next.getDate() + 90)
  return next.toISOString().split('T')[0]
}

function buildMedicationLine(item, keys) {
  return keys.map(key => item?.[key]).filter(Boolean).join(' · ').trim()
}

export default function CreateDownward() {
  const navigate = useNavigate()
  const { createDownwardReferral } = useApp()
  const [step, setStep] = useState(0)
  const [sourceDialog, setSourceDialog] = useState(null)
  const [showRepullConfirm, setShowRepullConfirm] = useState(false)
  const [isPullingPatientData, setIsPullingPatientData] = useState(false)
  const [patientSearchQuery, setPatientSearchQuery] = useState('张桂芳')
  const [patientSearchState, setPatientSearchState] = useState('idle')
  const [patientSearchResults, setPatientSearchResults] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [pullResult, setPullResult] = useState('')
  const [customIndicatorInput, setCustomIndicatorInput] = useState('')
  const [consentFiles, setConsentFiles] = useState([])
  const [consentError, setConsentError] = useState('')
  const [consentConfirmed, setConsentConfirmed] = useState(false)
  const [signerType, setSignerType] = useState('patient')
  const [proxyRelationOther, setProxyRelationOther] = useState('')
  const [proxyReasonOther, setProxyReasonOther] = useState('')
  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    patientGender: '',
    patientAge: '',
    patientPhone: '',
    patientIdCard: '',
    patientDataSource: '',
    healthArchiveId: '',
    archiveUpdatedAt: '',
    latestDischargeAt: '',
    diagnosis: null,
    diagnosisText: '',
    icd10: '',
    clinicalSummary: '',
    handoffSummary: '',
    westernMedications: [],
    chineseMedications: [],
    medicationNoteTags: [],
    medicationNoteExtra: '',
    reviewSuggestions: [],
    attachments: [],
    autoPulledAt: '',
    downwardReason: '',
    downwardReasonOther: '',
    downwardTrigger: 'doctor',
    rehabGoals: [],
    rehabGoalsOther: '',
    followupDate: getDefaultFollowupDate(),
    monitoringIndicators: [],
    customIndicators: [],
    nursingPoints: [],
    nursingPointsOther: '',
    warningSymptoms: [],
    warningSymptomsOther: '',
    doctorRemarks: '',
    toInstitutionId: '',
    allocationMode: 'designated',
    designatedDoctorId: '',
    designatedDoctorName: '',
    consentProxyName: '',
    consentProxyRelation: '',
    consentProxyReason: '',
  })

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none'
  const patientInfoLocked = form.patientDataSource === 'health_archive' && !!selectedPatient
  const derivedAge = useMemo(() => getAgeFromIdCard(form.patientIdCard) || form.patientAge, [form.patientAge, form.patientIdCard])
  const selectedInst = useMemo(() => INSTITUTIONS.find(item => item.id === form.toInstitutionId), [form.toInstitutionId])
  const receiverOptions = useMemo(() => PRIMARY_RECEIVER_OPTIONS[form.toInstitutionId] || [], [form.toInstitutionId])
  const selectedInstitutionHasPrimaryCoordinator = useMemo(
    () => hasPrimaryReferralCoordinator(form.toInstitutionId),
    [form.toInstitutionId],
  )
  const coordinatorOptionDisabled = Boolean(form.toInstitutionId && !selectedInstitutionHasPrimaryCoordinator)
  const recommendedAttachments = form.attachments.filter(item => (item.category || 'recommended') === 'recommended')
  const supplementalAttachments = form.attachments.filter(item => item.category === 'supplemental')
  const archiveCheckStatus = {
    患者基础信息: Boolean(form.patientName && form.patientGender && (derivedAge || form.patientAge) && form.patientIdCard),
    出院诊断: Boolean(form.diagnosisText || form.icd10),
    出院小结: Boolean(form.clinicalSummary),
    用药医嘱: Boolean(form.westernMedications.length || form.chineseMedications.length),
    推荐附件: Boolean(recommendedAttachments.length),
  }
  const canEditMainSections = patientSearchState === 'manual' || patientSearchState === 'selected'
  const showProxyRelationOther = form.consentProxyRelation === 'other'
  const showProxyReasonOther = form.consentProxyReason === 'other'
  const familyDoctorInstitutionMismatch = Boolean(
    selectedPatient?.familyDoctorInstitutionId
    && form.toInstitutionId
    && selectedPatient.familyDoctorInstitutionId !== form.toInstitutionId,
  )

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function setDownwardReason(nextReason) {
    const nextDays = FOLLOWUP_DAYS_BY_REASON[nextReason] || 7
    setForm(prev => ({
      ...prev,
      downwardReason: nextReason,
      followupDate: nextReason ? getDateAfterDays(nextDays) : prev.followupDate,
    }))
  }

  function resetPatientFields(source = '') {
    setForm(prev => ({
      ...prev,
      patientId: '',
      patientName: '',
      patientGender: '',
      patientAge: '',
    patientPhone: '',
    patientIdCard: '',
    patientDataSource: source,
    healthArchiveId: '',
    archiveUpdatedAt: '',
    latestDischargeAt: '',
    diagnosis: null,
    diagnosisText: '',
    icd10: '',
    clinicalSummary: '',
    handoffSummary: '',
    westernMedications: [],
    chineseMedications: [],
    medicationNoteTags: [],
    medicationNoteExtra: '',
    reviewSuggestions: [],
    attachments: [],
    autoPulledAt: '',
  }))
}

  function applySelectedPatient(record, successMessage) {
    const autoData = buildAutoData(record)
    setForm(prev => ({
      ...prev,
      ...autoData,
    }))
    setSelectedPatient(record)
    setPatientSearchState('selected')
    setPullResult(successMessage || `已自动带出 ${record.patientName}的基本信息与出院资料`)
  }

  async function handleSearchPatients() {
    setIsPullingPatientData(true)
    const matches = PATIENT_SEARCH_RESULTS.filter(record => matchesPatientSearch(record, patientSearchQuery))
    setPatientSearchResults(matches)
    setSelectedPatient(null)
    if (matches.length === 0) {
      resetPatientFields('')
      setPatientSearchState('not_found')
      setPullResult('未检索到医共体健康档案，请先建档或新增患者后手工填写。')
      setIsPullingPatientData(false)
      return
    }
    setPatientSearchState('results')
    setPullResult('')
    setIsPullingPatientData(false)
  }

  function handleChangePatient() {
    setSelectedPatient(null)
    resetPatientFields('')
    setPatientSearchState(patientSearchResults.length > 0 ? 'results' : 'idle')
    setPullResult('')
  }

  function handleManualEntry() {
    setSelectedPatient(null)
    resetPatientFields('manual_entry')
    setPatientSearchState('manual')
    setPullResult('已切换为新增患者，请在下方手工填写患者基础信息和出院资料。')
  }

  function handleConfirmRepull() {
    if (!selectedPatient) return
    setShowRepullConfirm(false)
    applySelectedPatient(selectedPatient, `已重新带出 ${selectedPatient.patientName} 的患者与出院资料。`)
  }

  function toggleMultiValue(key, value) {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value],
    }))
  }

  function addCustomIndicator() {
    const value = customIndicatorInput.trim()
    if (!value) return
    if (form.monitoringIndicators.includes(value)) {
      setCustomIndicatorInput('')
      return
    }
    setForm(prev => ({
      ...prev,
      customIndicators: prev.customIndicators.includes(value) ? prev.customIndicators : [...prev.customIndicators, value],
      monitoringIndicators: [...prev.monitoringIndicators, value],
    }))
    setCustomIndicatorInput('')
  }

  function removeIndicator(item) {
    setForm(prev => ({
      ...prev,
      monitoringIndicators: prev.monitoringIndicators.filter(current => current !== item),
      customIndicators: prev.customIndicators.filter(current => current !== item),
    }))
  }

  function addWesternMedication() {
    setForm(prev => ({ ...prev, westernMedications: [...prev.westernMedications, { ...EMPTY_WESTERN_MEDICATION }] }))
  }

  function updateWesternMedication(index, key, value) {
    setForm(prev => ({
      ...prev,
      westernMedications: prev.westernMedications.map((item, currentIndex) => (
        currentIndex === index ? { ...item, [key]: value } : item
      )),
    }))
  }

  function updateWesternMedicationMeta(index, key, value) {
    setForm(prev => ({
      ...prev,
      westernMedications: prev.westernMedications.map((item, currentIndex) => (
        currentIndex === index ? { ...item, meta: { ...item.meta, [key]: value } } : item
      )),
    }))
  }

  function removeWesternMedication(index) {
    setForm(prev => ({ ...prev, westernMedications: prev.westernMedications.filter((_, currentIndex) => currentIndex !== index) }))
  }

  function addChineseMedication() {
    setForm(prev => ({ ...prev, chineseMedications: [...prev.chineseMedications, { ...EMPTY_CHINESE_MEDICATION }] }))
  }

  function updateChineseMedication(index, key, value) {
    setForm(prev => ({
      ...prev,
      chineseMedications: prev.chineseMedications.map((item, currentIndex) => (
        currentIndex === index ? { ...item, [key]: value } : item
      )),
    }))
  }

  function updateChineseMedicationMeta(index, key, value) {
    setForm(prev => ({
      ...prev,
      chineseMedications: prev.chineseMedications.map((item, currentIndex) => (
        currentIndex === index ? { ...item, meta: { ...item.meta, [key]: value } } : item
      )),
    }))
  }

  function removeChineseMedication(index) {
    setForm(prev => ({ ...prev, chineseMedications: prev.chineseMedications.filter((_, currentIndex) => currentIndex !== index) }))
  }

  function handleUploadAttachment(event) {
    const files = Array.from(event.target.files || [])
    const next = files.map(file => ({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      source: '手工补充',
      category: 'supplemental',
      fromSystem: false,
    }))
    setForm(prev => ({ ...prev, attachments: [...prev.attachments, ...next] }))
    event.target.value = ''
  }

  function removeAttachment(name) {
    setForm(prev => ({ ...prev, attachments: prev.attachments.filter(item => item.name !== name) }))
  }

  function handleConsentFileSelect(files) {
    const nextFiles = Array.isArray(files) ? files : [files]
    const validRecords = []

    for (const file of nextFiles) {
      if (!file) continue
      const validation = validateConsentFile(file)
      if (!validation.valid) {
        setConsentError(validation.error)
        return
      }
      validRecords.push(buildConsentFileRecord(file))
    }

    if (validRecords.length === 0) return

    setConsentFiles(prev => [...prev, ...validRecords])
    setConsentError('')
  }

  function clearConsentFile(index) {
    setConsentFiles(prev => {
      const target = prev[index]
      if (target?.fileUrl) URL.revokeObjectURL(target.fileUrl)
      return prev.filter((_, currentIndex) => currentIndex !== index)
    })
    setConsentError('')
  }

  function handleSignerTypeChange(nextType) {
    const shouldResetProxy = signerType === 'family' && nextType !== 'family'
    setSignerType(nextType)
    if (shouldResetProxy) {
      setForm(prev => ({
        ...prev,
        consentProxyName: '',
        consentProxyRelation: '',
        consentProxyReason: '',
      }))
      setProxyRelationOther('')
      setProxyReasonOther('')
    }
  }

  const stepCanNext = [
    !!form.patientName && !!form.patientGender && !!derivedAge && !!form.patientIdCard && !!form.patientPhone && !!form.diagnosisText && !!form.clinicalSummary,
    !!form.downwardReason && (form.downwardReason !== 'other' || form.downwardReasonOther.trim())
      && !!form.downwardTrigger
      && form.rehabGoals.length > 0 && (!form.rehabGoals.includes('other') || form.rehabGoalsOther.trim())
      && !!form.followupDate
      && form.monitoringIndicators.length > 0
      && !!form.toInstitutionId
      && ((form.allocationMode === 'coordinator' && !coordinatorOptionDisabled) || !!form.designatedDoctorId),
    consentFiles.length > 0 && consentConfirmed
      && (signerType !== 'family' || (
        !!form.consentProxyName.trim()
        && !!form.consentProxyRelation
        && (!showProxyRelationOther || !!proxyRelationOther.trim())
        && !!form.consentProxyReason
        && (!showProxyReasonOther || !!proxyReasonOther.trim())
      )),
    true,
  ][step]

  function getMedicationSummary() {
    const western = form.westernMedications
      .map(item => buildMedicationLine(item, ['drugName', 'spec', 'singleDose', 'route', 'frequency', 'duration']))
      .filter(Boolean)
    const chinese = form.chineseMedications
      .map(item => {
        const nameBlock = [item.formulaName, ...(item.linkedNames || [])].filter(Boolean).join(' / ')
        return buildMedicationLine(
          { ...item, formulaName: nameBlock, dosageForm: item.spec || item.dosageForm, dailyDose: item.singleDose || item.dailyDose, administration: item.route || item.administration, duration: item.frequency || item.duration },
          ['formulaName', 'dosageForm', 'dailyDose', 'administration', 'duration'],
        )
      })
      .filter(Boolean)
    const merged = [...western, ...chinese]
    return merged.length > 0 ? merged.join('；') : '—'
  }

  function handleSubmit() {
    if (consentFiles.length === 0) {
      setConsentError('请先上传已签署的知情同意书')
      return
    }
    if (!consentConfirmed) {
      setConsentError('请确认上传文件均为已签字版本')
      return
    }

    const downwardReasonText = form.downwardReason === 'other'
      ? form.downwardReasonOther.trim()
      : getOptionLabel(DOWNWARD_MEDICAL_REASON_OPTIONS, form.downwardReason)
    const rehabGoalLabels = getSelectedLabels(REHAB_GOAL_OPTIONS, form.rehabGoals, form.rehabGoalsOther)
    const nursingPointLabels = getSelectedLabels(NURSING_POINT_OPTIONS, form.nursingPoints, form.nursingPointsOther)
    const warningSymptomLabels = getSelectedLabels(WARNING_SYMPTOM_OPTIONS, form.warningSymptoms, form.warningSymptomsOther)
    const inst = INSTITUTIONS.find(item => item.id === form.toInstitutionId)

    const payload = {
      patient: {
        id: form.patientId || `p${Date.now()}`,
        name: form.patientName,
        gender: form.patientGender,
        age: parseInt(derivedAge || '0', 10),
        phone: form.patientPhone,
        idCard: form.patientIdCard,
      },
      diagnosis: form.diagnosis || { code: form.icd10 || '—', name: form.diagnosisText || '—' },
      chiefComplaint: form.clinicalSummary,
      handoffSummary: form.handoffSummary || null,
      reason: downwardReasonText,
      downwardReasonCode: form.downwardReason,
      downwardReasonText: form.downwardReason === 'other' ? form.downwardReasonOther.trim() : null,
      downwardReason: form.downwardReason,
      downwardReasonOther: form.downwardReasonOther || null,
      downwardTrigger: form.downwardTrigger,
      rehabGoals: form.rehabGoals,
      rehabGoalsOther: form.rehabGoalsOther || null,
      monitoringIndicators: form.monitoringIndicators,
      nursingPoints: form.nursingPoints,
      nursingPointsOther: form.nursingPointsOther || null,
      warningSymptoms: form.warningSymptoms,
      warningSymptomsOther: form.warningSymptomsOther || null,
      doctorRemarks: form.doctorRemarks || null,
      patientDataSource: form.patientDataSource || 'manual_entry',
      healthArchiveId: form.healthArchiveId || null,
      autoDataMeta: {
        pulledAt: form.autoPulledAt || null,
        archiveUpdatedAt: form.archiveUpdatedAt || null,
        latestDischargeAt: form.latestDischargeAt || null,
        sources: ['healthArchive', 'inpatientHome', 'dischargeSummary', 'progressNotes', 'orders', 'prescription'],
      },
      toInstitution: inst?.name,
      toDept: '',
      allocationMode: form.allocationMode,
      designatedDoctorId: form.allocationMode === 'designated' ? form.designatedDoctorId : null,
      designatedDoctorName: form.allocationMode === 'designated' ? form.designatedDoctorName : null,
      rehabPlan: {
        medications: form.westernMedications
          .filter(item => item.drugName)
          .map(item => ({
            name: item.drugName,
            spec: item.spec || '',
            usage: [item.singleDose, item.route, item.frequency, item.duration].filter(Boolean).join(' · '),
            displayText: [item.drugName, item.spec, item.singleDose, item.route, item.frequency, item.duration].filter(Boolean).join(' · '),
          })),
        chineseMedications: form.chineseMedications.filter(item => item.formulaName),
        notes: nursingPointLabels.join('、'),
        rehabSuggestion: rehabGoalLabels.join('、'),
        followupDate: form.followupDate,
        warningNotes: warningSymptomLabels.join('、'),
        supplementNote: form.doctorRemarks,
        indicators: form.monitoringIndicators,
        medicationNotes: [...form.medicationNoteTags, ...(form.medicationNoteExtra.trim() ? [form.medicationNoteExtra.trim()] : [])],
      },
      westernMedications: form.westernMedications,
      chineseMedications: form.chineseMedications,
      medicationNotes: [...form.medicationNoteTags, ...(form.medicationNoteExtra.trim() ? [form.medicationNoteExtra.trim()] : [])],
      attachments: form.attachments.map(item => ({
        name: item.name,
        size: item.size,
        source: item.source,
        category: item.category || 'recommended',
        selected: item.category === 'recommended' ? true : item.selected !== false,
      })),
      consentMethod: 'offline_upload',
      consentSigned: true,
      consentFileName: consentFiles[0]?.name,
      consentFileNames: consentFiles.map(item => item.name),
      consentFileUrl: consentFiles[0]?.fileUrl || null,
      consentFileUrls: consentFiles.map(item => item.fileUrl || null).filter(Boolean),
      consentUploadedAt: consentFiles[0]?.uploadedAt || new Date().toISOString(),
      consentSignedBy: signerType,
      consentProxyName: signerType === 'family' ? form.consentProxyName.trim() : null,
      consentProxyRelation: signerType === 'family'
        ? (form.consentProxyRelation === 'other' ? proxyRelationOther.trim() : getOptionLabel(PROXY_RELATION_OPTIONS, form.consentProxyRelation))
        : null,
      consentProxyReason: signerType === 'family'
        ? (form.consentProxyReason === 'other' ? proxyReasonOther.trim() : getOptionLabel(PROXY_REASON_OPTIONS, form.consentProxyReason))
        : null,
      structuredData: {
        title: '患者与出院资料',
        sections: [
          {
            title: '出院核心摘要',
            items: [
              { label: '出院诊断/主要诊断', value: form.diagnosisText || '—' },
              { label: 'ICD-10', value: form.icd10 || '—' },
              { label: '出院小结摘要', value: form.clinicalSummary || '—' },
              { label: '下转交接摘要', value: form.handoffSummary || '—' },
              { label: '继续用药', value: getMedicationSummary() },
            ],
          },
        ],
      },
    }

    createDownwardReferral(payload)
    navigate('/county/downward-records')
  }

  const tomorrowDate = getTomorrowDate()
  const maxFollowupDate = getMaxFollowupDate()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button onClick={() => navigate('/county/dashboard')} className="hover:underline" style={{ color: '#0BBECF' }}>工作台</button>
          <span>›</span>
          <span>发起下转</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-800">发起下转申请</h1>
      </div>

      <StepProgress steps={STEPS} currentStep={step} />

      <div className="rounded-xl overflow-hidden bg-white" style={{ border: '1px solid #DDF0F3' }}>
        {step === 0 && (
          <div className="p-6 space-y-6">
            <SectionTitle title="患者与出院资料" />

            <div className="rounded-xl px-4 py-4" style={{ background: '#F8FDFE', border: '1px solid #DDF0F3' }}>
              {patientSearchState === 'selected' && selectedPatient ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-gray-800">已选择患者：{selectedPatient.patientName}</div>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>最近一次出院记录时间：{form.latestDischargeAt || '—'}</span>
                        <span>资料更新时间：{form.archiveUpdatedAt || '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button type="button" onClick={handleChangePatient} className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-white">
                        更换患者
                      </button>
                      <button type="button" onClick={() => setShowRepullConfirm(true)} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#0BBECF' }}>
                        重新拉取资料
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    {ARCHIVE_CHECK_ITEMS.map(item => {
                      const acquired = archiveCheckStatus[item]
                      return (
                        <div key={item} className="rounded-lg border px-3 py-2 text-sm" style={{ background: '#fff', borderColor: acquired ? '#BDE7D0' : '#F3C5C5' }}>
                        <div className="text-xs text-gray-400">档案校验</div>
                          <div className="mt-1 font-medium text-gray-800">{acquired ? '✅ 已获取' : '❌ 未获取'} {item}</div>
                        </div>
                      )
                    })}
                  </div>
                  {pullResult && (
                    <div className="rounded-lg px-3 py-2 text-sm" style={{ background: '#F0FBF5', border: '1px solid #BDE7D0', color: '#0F7A45' }}>
                      {pullResult}
                    </div>
                  )}
                </div>
              ) : patientSearchState === 'manual' ? (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">新增患者</div>
                    <div className="text-xs text-gray-500 mt-1">请在下方手工填写患者基本信息和下转资料，本次录入仅生成申请副本。</div>
                  </div>
                  <button type="button" onClick={handleChangePatient} className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-white">
                    返回检索
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-sm font-semibold text-gray-800">患者资料获取</div>
                  <div className="text-sm text-gray-500 mt-1">请先检索患者，再带出患者基础信息和出院资料。</div>
                  <div className="mt-4 flex gap-3 flex-wrap">
                    <input
                      className={`${inputCls} flex-1 min-w-[280px]`}
                      value={patientSearchQuery}
                      onChange={event => setPatientSearchQuery(event.target.value)}
                      placeholder="请输入患者姓名 / 身份证号 / 住院号"
                    />
                    <button
                      type="button"
                      onClick={handleSearchPatients}
                      disabled={isPullingPatientData}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ background: '#0BBECF', opacity: isPullingPatientData ? 0.7 : 1 }}
                    >
                      {isPullingPatientData ? '检索中...' : '检索患者'}
                    </button>
                    <button
                      type="button"
                      onClick={handleManualEntry}
                      className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-white"
                    >
                      新增患者
                    </button>
                  </div>
                </>
              )}

              {patientSearchState === 'results' && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {patientSearchResults.map(patient => (
                    <div key={patient.id} className="rounded-xl px-4 py-4 bg-white border border-gray-200">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-gray-900">{patient.patientName}</div>
                          <div className="text-sm text-gray-500 mt-1">{patient.patientGender} / {patient.patientAge}岁</div>
                        </div>
                        <button type="button" onClick={() => applySelectedPatient(patient)} className="px-3 py-1.5 rounded-lg text-sm text-white" style={{ background: '#0BBECF' }}>
                          选择该患者
                        </button>
                      </div>
                      <div className="text-sm text-gray-600 mt-3">身份证号：{patient.patientIdCardMasked}</div>
                      <div className="text-sm text-gray-600 mt-1">联系电话：{patient.patientPhone}</div>
                      <div className="text-sm text-gray-600 mt-1">最近就诊：{patient.recentVisit}</div>
                    </div>
                  ))}
                </div>
              )}

              {patientSearchState === 'not_found' && (
                <div className="mt-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#FFF9ED', border: '1px solid #F6D48A', color: '#9A6700' }}>
                  <div>{pullResult}</div>
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    <button
                      type="button"
                      onClick={() => setSourceDialog({ title: '前往建档', sources: ['healthArchive'], meta: { sourceLabel: '请先在医共体健康档案系统完成建档后返回本流程' } })}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-sm"
                    >
                      前往建档
                    </button>
                    <button
                      type="button"
                      onClick={handleManualEntry}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-sm"
                    >
                      新增患者
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ opacity: canEditMainSections ? 1 : 0.55, pointerEvents: canEditMainSections ? 'auto' : 'none' }}>
              <SectionTitle title="患者基本信息" />
              <div className="rounded-xl border px-4 py-3 mb-4 text-xs text-gray-500" style={{ background: '#F8FDFE', borderColor: '#DDF0F3' }}>
                
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel required>姓名</FieldLabel>
                  <input className={`${inputCls} ${patientInfoLocked ? 'bg-gray-50 text-gray-600' : ''}`} value={form.patientName} onChange={event => setField('patientName', event.target.value)} placeholder="请输入姓名" readOnly={patientInfoLocked} />
                </div>
                <div>
                  <FieldLabel required>性别</FieldLabel>
                  <select className={`${inputCls} ${patientInfoLocked ? 'bg-gray-50 text-gray-600' : ''}`} value={form.patientGender} onChange={event => setField('patientGender', event.target.value)} disabled={patientInfoLocked}>
                    <option value="">请选择</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                <div>
                  <FieldLabel required>年龄</FieldLabel>
                  <div className={`${inputCls} bg-gray-50 text-gray-600 flex items-center`}>
                    {derivedAge ? `${derivedAge}岁` : '填写身份证号后自动计算'}
                  </div>
                </div>
                <div>
                  <FieldLabel required>身份证号</FieldLabel>
                  <input className={`${inputCls} ${patientInfoLocked ? 'bg-gray-50 text-gray-600' : ''}`} value={form.patientIdCard} onChange={event => setField('patientIdCard', event.target.value)} placeholder="请输入身份证号" readOnly={patientInfoLocked} />
                </div>
                <div className="col-span-2">
                  <FieldLabel required>联系电话</FieldLabel>
                  <input className={inputCls} value={form.patientPhone} onChange={event => setField('patientPhone', event.target.value)} placeholder="请输入联系电话" />
                </div>
              </div>
            </div>

            <div style={{ opacity: canEditMainSections ? 1 : 0.55, pointerEvents: canEditMainSections ? 'auto' : 'none' }}>
              <SectionTitle title="出院核心摘要" />
              <div className="space-y-4">
                <div className="rounded-xl border px-4 py-4" style={{ background: '#F5FAFF', borderColor: '#D7EAFE' }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>出院诊断/主要诊断</FieldLabel>
                      <input className={inputCls} value={form.diagnosisText} onChange={event => setField('diagnosisText', event.target.value)} placeholder="请输入出院诊断/主要诊断" />
                    </div>
                    <div>
                      <FieldLabel required>ICD-10</FieldLabel>
                      <input className={inputCls} value={form.icd10} onChange={event => setField('icd10', event.target.value)} placeholder="请输入 ICD-10" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border px-4 py-4" style={{ background: '#F5FAFF', borderColor: '#D7EAFE' }}>
                  <FieldLabel required>出院小结摘要</FieldLabel>
                  <textarea className={`${inputCls} resize-none`} rows={4} value={form.clinicalSummary} onChange={event => setField('clinicalSummary', event.target.value)} placeholder="请输入出院小结摘要" />
                </div>

                <div className="rounded-xl border px-4 py-4" style={{ background: '#F5FAFF', borderColor: '#D7EAFE' }}>
                  <FieldLabel>下转交接摘要</FieldLabel>
                  <textarea className={`${inputCls} resize-none`} rows={3} value={form.handoffSummary} onChange={event => setField('handoffSummary', event.target.value)} placeholder="可在自动带出内容基础上补充本次下转交接要点" />
                </div>
              </div>
            </div>

            <div style={{ opacity: canEditMainSections ? 1 : 0.55, pointerEvents: canEditMainSections ? 'auto' : 'none' }}>
              <SectionTitle title="继续用药" />
              <div className="space-y-4">
                <div className="rounded-xl border px-4 py-4" style={{ background: '#F5FAFF', borderColor: '#D7EAFE' }}>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="text-sm font-semibold text-gray-800">西药/中成药</div>
                    <button type="button" onClick={addWesternMedication} className="text-xs px-3 py-1.5 rounded-lg border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
                      + 手工新增
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white">
                    <table className="w-full min-w-[920px] text-sm">
                      <thead className="bg-[#EEF8FF] text-gray-500">
                        <tr>
                          {['药品名称', '规格', '单次剂量', '用药方法', '频次'].map(header => (
                            <th key={header} className="px-3 py-2 text-left font-medium">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      {form.westernMedications.length === 0 ? (
                        <tbody>
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-gray-400">暂无西药/中成药信息。</td>
                          </tr>
                        </tbody>
                      ) : (
                        form.westernMedications.map((item, index) => (
                          <tbody key={`western-${index}`} className="border-t border-blue-50">
                            <tr>
                              <td className="px-3 py-2 align-top">
                                <input className={inputCls} value={item.drugName} onChange={event => updateWesternMedication(index, 'drugName', event.target.value)} placeholder="药品名称" />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input className={inputCls} value={item.spec} onChange={event => updateWesternMedication(index, 'spec', event.target.value)} placeholder="规格" />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input className={inputCls} value={item.singleDose} onChange={event => updateWesternMedication(index, 'singleDose', event.target.value)} placeholder="单次剂量" />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input className={inputCls} value={item.route} onChange={event => updateWesternMedication(index, 'route', event.target.value)} placeholder="用药方法" />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input className={inputCls} value={item.frequency} onChange={event => updateWesternMedication(index, 'frequency', event.target.value)} placeholder="频次" />
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={5} className="px-3 pb-3">
                                <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-gray-500">
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <span>疗程：{item.duration || '未填写'}</span>
                                    <span>备注：{item.remark || '未填写'}</span>
                                    <span>来源：{item.source === 'health_archive' ? '健康档案带出' : '手工新增'}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => updateWesternMedication(index, 'showMore', !item.showMore)} className="text-xs text-[#0BBECF]">
                                      {item.showMore ? '收起更多信息' : '更多信息'}
                                    </button>
                                    <button type="button" onClick={() => removeWesternMedication(index)} className="text-xs text-gray-400 hover:text-red-500">
                                      删除
                                    </button>
                                  </div>
                                </div>
                                {item.showMore && (
                                  <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 mt-3">
                                    <input className={inputCls} value={item.duration} onChange={event => updateWesternMedication(index, 'duration', event.target.value)} placeholder="疗程" />
                                    <input className={inputCls} value={item.remark} onChange={event => updateWesternMedication(index, 'remark', event.target.value)} placeholder="备注" />
                                    <input className={inputCls} value={item.meta.department} onChange={event => updateWesternMedicationMeta(index, 'department', event.target.value)} placeholder="开单科室" />
                                    <input className={inputCls} value={item.meta.doctor} onChange={event => updateWesternMedicationMeta(index, 'doctor', event.target.value)} placeholder="开单医生" />
                                    <input className={inputCls} value={item.meta.orderedAt} onChange={event => updateWesternMedicationMeta(index, 'orderedAt', event.target.value)} placeholder="下嘱日期" />
                                    <input className={inputCls} value={item.meta.stoppedAt} onChange={event => updateWesternMedicationMeta(index, 'stoppedAt', event.target.value)} placeholder="停嘱日期" />
                                    <input className={`${inputCls} col-span-2`} value={item.meta.orderType} onChange={event => updateWesternMedicationMeta(index, 'orderType', event.target.value)} placeholder="医嘱类型" />
                                  </div>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        ))
                      )}
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border px-4 py-4" style={{ background: '#F5FAFF', borderColor: '#D7EAFE' }}>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="text-sm font-semibold text-gray-800">中药</div>
                    <button type="button" onClick={addChineseMedication} className="text-xs px-3 py-1.5 rounded-lg border" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
                      + 手工新增
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white">
                    <table className="w-full min-w-[920px] text-sm">
                      <thead className="bg-[#EEF8FF] text-gray-500">
                        <tr>
                          {['药品名称', '规格', '单次剂量', '用药方法', '频次'].map(header => (
                            <th key={header} className="px-3 py-2 text-left font-medium">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      {form.chineseMedications.length === 0 ? (
                        <tbody>
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-gray-400">暂无中药信息。</td>
                          </tr>
                        </tbody>
                      ) : (
                        form.chineseMedications.map((item, index) => (
                          <tbody key={`chinese-${index}`} className="border-t border-blue-50">
                            <tr>
                              <td className="px-3 py-2 align-top">
                                <div className="space-y-2">
                                  <input className={inputCls} value={item.formulaName} onChange={event => updateChineseMedication(index, 'formulaName', event.target.value)} placeholder="药品名称" />
                                  {item.linkedNames?.length > 0 && (
                                    <div className="pl-3">
                                      {item.linkedNames.map((name, linkedIndex) => (
                                        <div key={`${item.formulaName}-${name}-${linkedIndex}`} className="relative pl-5 py-1 text-sm text-[#0892A0]">
                                          <span className="absolute left-0 top-0 bottom-0 border-l" style={{ borderColor: '#76D7E2' }} />
                                          <span className="absolute left-0 top-1/2 w-3 border-t" style={{ borderColor: '#76D7E2' }} />
                                          <span>{name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input className={inputCls} value={item.spec || item.dosageForm} onChange={event => updateChineseMedication(index, 'spec', event.target.value)} placeholder="规格" />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input className={inputCls} value={item.singleDose || item.dailyDose} onChange={event => updateChineseMedication(index, 'singleDose', event.target.value)} placeholder="单次剂量" />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input className={inputCls} value={item.route || item.administration} onChange={event => updateChineseMedication(index, 'route', event.target.value)} placeholder="用药方法" />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input className={inputCls} value={item.frequency || ''} onChange={event => updateChineseMedication(index, 'frequency', event.target.value)} placeholder="频次" />
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={5} className="px-3 pb-3">
                                <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-gray-500">
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <span>疗程：{item.duration || '未填写'}</span>
                                    <span>特殊说明：{item.specialInstruction || '未填写'}</span>
                                    <span>来源：{item.source === 'health_archive' ? '健康档案带出' : '手工新增'}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => updateChineseMedication(index, 'showMore', !item.showMore)} className="text-xs text-[#0BBECF]">
                                      {item.showMore ? '收起更多信息' : '更多信息'}
                                    </button>
                                    <button type="button" onClick={() => removeChineseMedication(index)} className="text-xs text-gray-400 hover:text-red-500">
                                      删除
                                    </button>
                                  </div>
                                </div>
                                {item.showMore && (
                                  <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 mt-3">
                                    <input className={inputCls} value={item.duration} onChange={event => updateChineseMedication(index, 'duration', event.target.value)} placeholder="疗程" />
                                    <input className={inputCls} value={item.specialInstruction} onChange={event => updateChineseMedication(index, 'specialInstruction', event.target.value)} placeholder="特殊说明" />
                                    <input className={inputCls} value={item.meta.department} onChange={event => updateChineseMedicationMeta(index, 'department', event.target.value)} placeholder="开单科室" />
                                    <input className={inputCls} value={item.meta.doctor} onChange={event => updateChineseMedicationMeta(index, 'doctor', event.target.value)} placeholder="开单医生" />
                                    <input className={inputCls} value={item.meta.orderedAt} onChange={event => updateChineseMedicationMeta(index, 'orderedAt', event.target.value)} placeholder="下嘱日期" />
                                    <input className={inputCls} value={item.meta.stoppedAt} onChange={event => updateChineseMedicationMeta(index, 'stoppedAt', event.target.value)} placeholder="停嘱日期" />
                                    <input className={`${inputCls} col-span-2`} value={item.meta.orderType} onChange={event => updateChineseMedicationMeta(index, 'orderType', event.target.value)} placeholder="医嘱类型" />
                                  </div>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        ))
                      )}
                    </table>
                  </div>
                </div>
                <div className="text-xs text-gray-500"></div>
              </div>
            </div>

            <div style={{ opacity: canEditMainSections ? 1 : 0.55, pointerEvents: canEditMainSections ? 'auto' : 'none' }}>
              <SectionTitle title="用药注意事项" />
              <div className="rounded-xl border px-4 py-4" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
                <div className="text-xs text-gray-500 mb-3"></div>
                <div className="flex flex-wrap gap-2">
                  {MEDICATION_NOTE_RECOMMENDATIONS.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        medicationNoteTags: prev.medicationNoteTags.includes(item)
                          ? prev.medicationNoteTags.filter(current => current !== item)
                          : [...prev.medicationNoteTags, item],
                      }))}
                      className="px-3 py-1.5 rounded-full text-sm border transition-colors"
                      style={form.medicationNoteTags.includes(item)
                        ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                        : { background: '#fff', color: '#4B5563', borderColor: '#E5E7EB' }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <textarea className={`${inputCls} resize-none mt-4`} rows={3} value={form.medicationNoteExtra} onChange={event => setField('medicationNoteExtra', event.target.value)} placeholder="补充其他需要重点提醒的用药注意事项" />
              </div>
            </div>

            <div style={{ opacity: canEditMainSections ? 1 : 0.55, pointerEvents: canEditMainSections ? 'auto' : 'none' }}>
              <SectionTitle title="检查/检验附件资料" />
              <div className="rounded-xl border px-4 py-4" style={{ background: '#F5FAFF', borderColor: '#D7EAFE' }}>
                <div className="mb-5">
                  <div className="text-sm font-medium text-gray-700 mb-2">推荐资料包</div>
                  {recommendedAttachments.length === 0 ? (
                    <div className="rounded-lg px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200">
                      推荐资料缺失时仅提醒，不阻断提交。当前未带出推荐资料包，可继续提交，建议后续补充。
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recommendedAttachments.map(item => (
                        <div key={item.name} className="flex items-center justify-between gap-3 bg-white border border-blue-100 rounded-lg px-3 py-2.5 text-sm">
                          <div>
                            <div className="font-medium text-gray-800">{item.name}</div>
                            <div className="text-xs text-gray-400 mt-1">{item.source} · {item.size || '静态示例'}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setSourceDialog({ title: item.name, sources: [item.source || 'healthArchive'], meta: { sourceLabel: item.source || '推荐资料包' } })} className="text-xs text-[#2563EB]">
                              查看
                            </button>
                            <button type="button" onClick={() => removeAttachment(item.name)} className="text-xs text-gray-400 hover:text-red-500">
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">补充资料</div>
                  <div className="space-y-2">
                    {supplementalAttachments.length === 0 ? (
                      <div className="text-sm text-gray-400">暂无补充资料，可上传补充。</div>
                    ) : supplementalAttachments.map(item => (
                      <div key={item.name} className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
                        <div>
                          <div className="font-medium text-gray-800">{item.name}</div>
                          <div className="text-xs text-gray-400 mt-1">{item.source} · {item.size || '静态示例'}</div>
                        </div>
                        <button type="button" onClick={() => removeAttachment(item.name)} className="text-xs text-gray-400 hover:text-red-500">删除</button>
                      </div>
                    ))}
                  </div>
                  <label className="inline-flex items-center gap-2 mt-3 text-xs px-3 py-1.5 rounded-lg border cursor-pointer" style={{ color: '#0BBECF', borderColor: '#0BBECF' }}>
                    <span>+ 补充上传附件</span>
                    <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadAttachment} />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="p-6 space-y-6">
            <SectionTitle title="康复方案与接收安排" />

            <div>
              <SectionTitle title="康复方案" />
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FieldLabel required>下转原因</FieldLabel>
                  <MultiSelectChips options={DOWNWARD_MEDICAL_REASON_OPTIONS} values={form.downwardReason ? [form.downwardReason] : []} onToggle={(value) => setDownwardReason(form.downwardReason === value ? '' : value)} />
                  {form.downwardReason === 'other' && (
                    <input className={`${inputCls} mt-3`} value={form.downwardReasonOther} onChange={event => setField('downwardReasonOther', event.target.value)} placeholder="请补充下转原因" />
                  )}
                </div>

                <div className="col-span-2">
                  <FieldLabel required>下转触发方</FieldLabel>
                  <div className="flex flex-wrap gap-4">
                    {DOWNWARD_TRIGGER_OPTIONS.map(option => (
                      <label key={option.value} className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name="downwardTrigger"
                          checked={form.downwardTrigger === option.value}
                          onChange={() => setField('downwardTrigger', option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <FieldLabel required>康复目标</FieldLabel>
                  <MultiSelectChips options={REHAB_GOAL_OPTIONS} values={form.rehabGoals} onToggle={(value) => toggleMultiValue('rehabGoals', value)} />
                  {form.rehabGoals.includes('other') && (
                    <input className={`${inputCls} mt-3`} value={form.rehabGoalsOther} onChange={event => setField('rehabGoalsOther', event.target.value)} placeholder="请补充康复目标" />
                  )}
                </div>

                <div>
                  <FieldLabel required>首次随访时间</FieldLabel>
                  <input type="date" min={tomorrowDate} max={maxFollowupDate} className={inputCls} value={form.followupDate} onChange={event => setField('followupDate', event.target.value)} />
                </div>

                <div className="col-span-2">
                  <FieldLabel required>监测指标</FieldLabel>
                  <div className="rounded-xl border px-4 py-4" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
                    <div className="text-xs text-gray-500 mb-3">请选择基层随访时需要重点观察的指标，可勾选推荐项，也可补充自定义指标。</div>
                    <div className="flex flex-wrap gap-2">
                      {MONITOR_RECOMMENDATIONS.map(item => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setForm(prev => ({
                            ...prev,
                            monitoringIndicators: prev.monitoringIndicators.includes(item)
                              ? prev.monitoringIndicators.filter(current => current !== item)
                              : [...prev.monitoringIndicators, item],
                          }))}
                          className="px-3 py-1.5 rounded-full text-sm border transition-colors"
                          style={form.monitoringIndicators.includes(item)
                            ? { background: '#0BBECF', color: '#fff', borderColor: '#0BBECF' }
                            : { background: '#fff', color: '#4B5563', borderColor: '#E5E7EB' }}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 min-h-[36px]">
                      {form.monitoringIndicators.length === 0 ? (
                        <span className="text-sm text-gray-400">暂未选择监测指标</span>
                      ) : form.monitoringIndicators.map(item => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => removeIndicator(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border"
                          style={{ background: '#fff', borderColor: '#D1D5DB', color: '#374151' }}
                        >
                          <span>{item}</span>
                          <span className="text-xs">×</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <input className={inputCls} value={customIndicatorInput} onChange={event => setCustomIndicatorInput(event.target.value)} placeholder="补充其他需要随访观察的指标" />
                      <button type="button" onClick={addCustomIndicator} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#0BBECF' }}>
                        添加
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <FieldLabel>护理要点</FieldLabel>
                  <MultiSelectChips options={NURSING_POINT_OPTIONS} values={form.nursingPoints} onToggle={(value) => toggleMultiValue('nursingPoints', value)} />
                  {form.nursingPoints.includes('other') && (
                    <input className={`${inputCls} mt-3`} value={form.nursingPointsOther} onChange={event => setField('nursingPointsOther', event.target.value)} placeholder="请补充护理要点" />
                  )}
                </div>

                <div className="col-span-2">
                  <FieldLabel>预警症状</FieldLabel>
                  <MultiSelectChips options={WARNING_SYMPTOM_OPTIONS} values={form.warningSymptoms} onToggle={(value) => toggleMultiValue('warningSymptoms', value)} />
                  {form.warningSymptoms.includes('other') && (
                    <input className={`${inputCls} mt-3`} value={form.warningSymptomsOther} onChange={event => setField('warningSymptomsOther', event.target.value)} placeholder="请补充预警症状" />
                  )}
                </div>

                <div className="col-span-2">
                  <FieldLabel>补充说明</FieldLabel>
                  <textarea className={`${inputCls} resize-none`} rows={4} value={form.doctorRemarks} onChange={event => setField('doctorRemarks', event.target.value.slice(0, 500))} placeholder="请输入未结构化补充信息，最多 500 字" />
                  <div className="text-xs text-gray-400 mt-1 text-right">{form.doctorRemarks.length}/500</div>
                </div>
              </div>
            </div>

            <div>
              <SectionTitle title="接收安排" />
              <div className="space-y-4">
                <div>
                  <FieldLabel required>目标基层机构</FieldLabel>
                  <select
                    className={inputCls}
                    value={form.toInstitutionId}
                    onChange={event => {
                      const nextInstitutionId = event.target.value
                      const nextHasPrimaryCoordinator = hasPrimaryReferralCoordinator(nextInstitutionId)
                      setForm(prev => ({
                        ...prev,
                        toInstitutionId: nextInstitutionId,
                        allocationMode: nextInstitutionId && !nextHasPrimaryCoordinator ? 'designated' : prev.allocationMode,
                        designatedDoctorId: '',
                        designatedDoctorName: '',
                      }))
                    }}
                  >
                    <option value="">请选择目标基层机构</option>
                    {INSTITUTIONS.filter(item => item.type === 'primary').map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                  {familyDoctorInstitutionMismatch && (
                    <div className="mt-2 rounded-lg px-3 py-2 text-xs text-amber-700 bg-amber-50 border border-amber-200">
                      目标机构与患者家庭医生关联机构不一致，可继续提交，建议确认基层承接安排。
                    </div>
                  )}
                </div>

                <div>
                  <FieldLabel required>接收方式</FieldLabel>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label
                      className="border-2 rounded-xl p-4 cursor-pointer transition-colors"
                      style={form.allocationMode === 'designated'
                        ? { borderColor: '#0BBECF', background: '#F0FBFC' }
                        : { borderColor: '#e5e7eb', background: '#fff' }}
                    >
                      <div className="flex items-start gap-3">
                        <input type="radio" name="allocationMode" checked={form.allocationMode === 'designated'} onChange={() => setField('allocationMode', 'designated')} className="mt-1" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">指定接收医生</div>
                          <div className="text-xs text-gray-500 mt-1">直接通知指定医生，同时抄送基层负责人</div>
                        </div>
                      </div>
                    </label>
                    <label
                      className={`border-2 rounded-xl p-4 transition-colors ${coordinatorOptionDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                      style={coordinatorOptionDisabled
                        ? { borderColor: '#e5e7eb', background: '#f9fafb' }
                        : form.allocationMode === 'coordinator'
                        ? { borderColor: '#0BBECF', background: '#F0FBFC' }
                        : { borderColor: '#e5e7eb', background: '#fff' }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="allocationMode"
                          checked={form.allocationMode === 'coordinator'}
                          disabled={coordinatorOptionDisabled}
                          onChange={() => {
                            if (coordinatorOptionDisabled) return
                            setForm(prev => ({ ...prev, allocationMode: 'coordinator', designatedDoctorId: '', designatedDoctorName: '' }))
                          }}
                          className="mt-1 disabled:cursor-not-allowed"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">仅指定机构</div>
                          <div className="text-xs text-gray-500 mt-1">进入基层机构负责人待分配列表</div>
                          {coordinatorOptionDisabled && (
                            <div className="text-xs text-amber-700 mt-2 leading-relaxed">
                              {MISSING_PRIMARY_COORDINATOR_NOTICE}
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {form.allocationMode === 'designated' && (
                  <div>
                    <FieldLabel required>指定接收医生</FieldLabel>
                    <div className="space-y-3">
                      {receiverOptions.map(doctor => {
                        const relationTags = getRelationTags(doctor)
                        return (
                          <button
                            key={doctor.id}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, designatedDoctorId: doctor.id, designatedDoctorName: doctor.name }))}
                            className="w-full text-left border rounded-xl p-4 transition-all"
                            style={form.designatedDoctorId === doctor.id
                              ? { borderColor: '#0BBECF', background: '#F0FBFC', boxShadow: '0 0 0 2px #B2EEF5' }
                              : { borderColor: '#e5e7eb', background: '#fff' }}
                          >
                            <div className="flex items-start gap-3">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{doctor.name}</div>
                                {relationTags.length > 0 ? (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {relationTags.map(tag => (
                                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-6 space-y-6">
            <SectionTitle title="知情同意" />

            <ConsentOfflinePanel
              signedBy={signerType}
              onSignedByChange={handleSignerTypeChange}
              files={consentFiles}
              onSelectFiles={handleConsentFileSelect}
              onRemoveFile={clearConsentFile}
              allowMultiple
              confirmationChecked={consentConfirmed}
              onConfirmationChange={setConsentConfirmed}
              confirmationLabel="确认已核对签字文件完整性，上传文件与本次下转申请一致"
              error={consentError}
              signerLabel="签署人类型"
              signerSelectorVariant="radio"
              uploadLabel="上传签字文件"
              emptyHint="请上传一个或多个签字文件"
              showIntroTitle={false}
              introPanelStyle="plain"
              introDescriptionClassName="text-xs text-gray-500 leading-5"
              templateButtonVariant="uniform"
              middleContent={signerType === 'family' ? (
                <div className="rounded-xl border px-4 py-4 space-y-4" style={{ background: '#fff', borderColor: '#E5E7EB' }}>
                  <div className="text-sm font-semibold text-gray-800">家属代签信息</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>家属姓名</FieldLabel>
                      <input className={inputCls} value={form.consentProxyName} onChange={event => setField('consentProxyName', event.target.value)} placeholder="请输入家属姓名" />
                    </div>
                    <div>
                      <FieldLabel required>与患者关系</FieldLabel>
                      <select className={inputCls} value={form.consentProxyRelation} onChange={event => setField('consentProxyRelation', event.target.value)}>
                        <option value="">请选择</option>
                        {PROXY_RELATION_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      {showProxyRelationOther && (
                        <input className={`${inputCls} mt-3`} value={proxyRelationOther} onChange={event => setProxyRelationOther(event.target.value)} placeholder="请补充与患者关系" />
                      )}
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>代签原因</FieldLabel>
                      <select className={inputCls} value={form.consentProxyReason} onChange={event => setField('consentProxyReason', event.target.value)}>
                        <option value="">请选择</option>
                        {PROXY_REASON_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      {showProxyReasonOther && (
                        <input className={`${inputCls} mt-3`} value={proxyReasonOther} onChange={event => setProxyReasonOther(event.target.value)} placeholder="请补充代签原因" />
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            />
          </div>
        )}

        {step === 3 && (
          <div className="p-6 space-y-4">
            <SectionTitle title="提交确认" desc="请核对以下摘要信息，确认无误后提交下转申请。" />

            <SummaryBlock
              title="患者与出院资料"
              onEdit={() => setStep(0)}
              items={[
                ['姓名', form.patientName || '—'],
                ['性别', form.patientGender || '—'],
                ['年龄', derivedAge ? `${derivedAge}岁` : '—'],
                ['身份证号', maskIdCard(form.patientIdCard)],
                ['联系电话', form.patientPhone || '—'],
                ['最近一次出院记录时间', form.latestDischargeAt || '—'],
                ['资料更新时间', form.archiveUpdatedAt || '—'],
                ['出院诊断/主要诊断', form.diagnosisText || '—'],
                ['ICD-10', form.icd10 || '—'],
                ['出院小结摘要', form.clinicalSummary || '—'],
                ['下转交接摘要', form.handoffSummary || '—'],
                ['继续用药', getMedicationSummary()],
                ['用药注意事项', [...form.medicationNoteTags, ...(form.medicationNoteExtra.trim() ? [form.medicationNoteExtra.trim()] : [])]],
                ['推荐资料包', recommendedAttachments.map(item => item.name)],
                ['补充资料', supplementalAttachments.map(item => item.name)],
              ]}
            />

            <SummaryBlock
              title="康复方案与接收安排"
              onEdit={() => setStep(1)}
              items={[
                ['下转原因', form.downwardReason ? buildOtherAwareText(DOWNWARD_MEDICAL_REASON_OPTIONS, [form.downwardReason], form.downwardReasonOther) : '—'],
                ['下转触发方', getOptionLabel(DOWNWARD_TRIGGER_OPTIONS, form.downwardTrigger)],
                ['康复目标', getSelectedLabels(REHAB_GOAL_OPTIONS, form.rehabGoals, form.rehabGoalsOther)],
                ['首次随访时间', form.followupDate || '—'],
                ['监测指标', form.monitoringIndicators],
                ['护理要点', getSelectedLabels(NURSING_POINT_OPTIONS, form.nursingPoints, form.nursingPointsOther)],
                ['预警症状', getSelectedLabels(WARNING_SYMPTOM_OPTIONS, form.warningSymptoms, form.warningSymptomsOther)],
                ['补充说明', form.doctorRemarks || '—'],
                ['目标基层机构', selectedInst?.name || '—'],
                ['接收方式', form.allocationMode === 'designated' ? '指定接收医生' : '仅指定机构'],
                ['指定接收医生', form.allocationMode === 'designated' ? (form.designatedDoctorName || '—') : '—'],
              ]}
            />

            <SummaryBlock
              title="知情同意"
              onEdit={() => setStep(2)}
              items={[
                ['签署方式', '线下签字后上传'],
                ['签署人', signerType === 'family' ? '家属代签' : '患者本人'],
                ['家属姓名', signerType === 'family' ? form.consentProxyName || '—' : '—'],
                ['与患者关系', signerType === 'family' ? (form.consentProxyRelation === 'other' ? proxyRelationOther || '—' : getOptionLabel(PROXY_RELATION_OPTIONS, form.consentProxyRelation)) : '—'],
                ['代签原因', signerType === 'family' ? (form.consentProxyReason === 'other' ? proxyReasonOther || '—' : getOptionLabel(PROXY_REASON_OPTIONS, form.consentProxyReason)) : '—'],
                ['已上传文件名', consentFiles.map(item => item.name)],
                ['文件确认', consentConfirmed ? '已确认文件完整' : '待确认'],
              ]}
            />
          </div>
        )}

        <div className="px-6 py-4 flex items-center justify-between rounded-b-xl" style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}>
          <button
            onClick={() => (step > 0 ? setStep(current => current - 1) : navigate('/county/dashboard'))}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
          >
            {step === 0 ? '取消并返回工作台' : '上一步'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              title={step === 2 && !stepCanNext ? '请先上传签字文件并确认文件完整性' : ''}
              disabled={!stepCanNext}
              onClick={() => setStep(current => current + 1)}
              className="px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              style={stepCanNext
                ? { background: '#0BBECF', color: '#fff' }
                : { background: '#E5E7EB', color: '#9CA3AF', cursor: 'not-allowed' }}
            >
              下一步
            </button>
          ) : (
            <button onClick={handleSubmit} className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: '#0BBECF' }}>
              提交下转申请
            </button>
          )}
        </div>
      </div>

      {sourceDialog && (
        <SourceDialog
          title={sourceDialog.title}
          sources={sourceDialog.sources}
          meta={sourceDialog.meta}
          onClose={() => setSourceDialog(null)}
        />
      )}

      {showRepullConfirm && (
        <ConfirmDialog
          title="重新拉取资料"
          message="重新拉取可能覆盖已补充或修改的下转资料，是否继续？"
          confirmLabel="继续拉取"
          onCancel={() => setShowRepullConfirm(false)}
          onConfirm={handleConfirmRepull}
        />
      )}
    </div>
  )
}

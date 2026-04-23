/**
 * 患者转诊查询页（公开页面，无需登录）
 * P2-3：认证方式改为手机号 + 验证码（Mock 验证码固定 123456）
 * 路由：/patient-query
 */
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { UPWARD_STATUS, DOWNWARD_STATUS } from '../data/mockData'
import { getReferralDisplayStatus } from '../utils/downwardStatusPresentation'

const MOCK_CODE = '123456'

const STATUS_LABELS = {
  [UPWARD_STATUS.PENDING]:    { label: '待受理',   color: 'bg-yellow-100 text-yellow-700' },
  [UPWARD_STATUS.IN_TRANSIT]: { label: '转诊中',   color: 'bg-blue-100 text-blue-700' },
  [UPWARD_STATUS.COMPLETED]:  { label: '已完成',   color: 'bg-green-100 text-green-700' },
  [UPWARD_STATUS.REJECTED]:   { label: '已拒绝',   color: 'bg-red-100 text-red-700' },
  [UPWARD_STATUS.CANCELLED]:  { label: '已撤销',   color: 'bg-gray-100 text-gray-500' },
  [UPWARD_STATUS.CLOSED]:     { label: '已关闭',   color: 'bg-gray-100 text-gray-500' },
  [DOWNWARD_STATUS.PENDING]:  { label: '待接收',   color: 'bg-yellow-100 text-yellow-700' },
  [DOWNWARD_STATUS.IN_TRANSIT]:{ label: '转诊中',  color: 'bg-blue-100 text-blue-700' },
  [DOWNWARD_STATUS.COMPLETED]:{ label: '已完成',   color: 'bg-green-100 text-green-700' },
  [DOWNWARD_STATUS.RETURNED]: { label: '已退回',   color: 'bg-orange-100 text-orange-700' },
  [DOWNWARD_STATUS.REJECTED]: { label: '已拒绝',   color: 'bg-red-100 text-red-700' },
}

const TYPE_LABELS = {
  upward:   '上转（基层→县级）',
  downward: '下转（县级→基层）',
}

const ADMISSION_LABELS = {
  outpatient: '门诊就诊',
  inpatient:  '住院收治',
  emergency:  '急诊处置',
}

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function PatientQuery() {
  const { referrals } = useApp()

  const [phone, setPhone]       = useState('')
  const [sentCode, setSentCode] = useState(false)
  const [inputCode, setInputCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [phoneCooldown, setPhoneCooldown] = useState(0)
  const [verified, setVerified] = useState(false)

  const [results, setResults]   = useState(null)
  const [queryError, setQueryError] = useState('')

  // 发送验证码（Mock）
  function handleSendCode() {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setCodeError('请输入有效的11位手机号')
      return
    }
    setCodeError('')
    setSentCode(true)
    setPhoneCooldown(60)
    const timer = setInterval(() => {
      setPhoneCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // 验证验证码
  function handleVerify() {
    if (inputCode !== MOCK_CODE) {
      setCodeError('验证码错误，Mock 固定为 123456')
      return
    }
    setCodeError('')
    setVerified(true)

    // 按手机号查找转诊单（mock 数据中 patient.phone 字段）
    const matched = referrals.filter(r => r.patient?.phone === phone)
    if (matched.length === 0) {
      setQueryError('未找到该手机号关联的转诊记录，请确认手机号是否正确')
      setResults([])
    } else {
      setQueryError('')
      setResults(matched)
    }
  }

  // 重新查询
  function handleReset() {
    setPhone(''); setSentCode(false); setInputCode(''); setCodeError('')
    setPhoneCooldown(0); setVerified(false); setResults(null); setQueryError('')
  }

  const phoneValid = /^1[3-9]\d{9}$/.test(phone)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#EBF8FA' }}>
      {/* 顶部栏 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shadow-sm">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
          style={{ background: '#0BBECF' }}
        >转</div>
        <div>
          <div className="text-sm font-semibold text-gray-800">双向转诊平台</div>
          <div className="text-xs text-gray-400">患者转诊进度查询</div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">

          {/* 标题 */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-gray-800 mb-1">转诊进度查询</h1>
            <p className="text-sm text-gray-500">输入就诊手机号，通过验证码查询本人转诊状态</p>
          </div>

          {/* 查询表单 */}
          {!verified && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">

              {/* 手机号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  就诊手机号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={11}
                  placeholder="请输入11位手机号"
                  value={phone}
                  onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setCodeError('') }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ focusRingColor: '#0BBECF' }}
                  disabled={sentCode}
                />
              </div>

              {/* 验证码行 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  短信验证码 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6位验证码"
                    value={inputCode}
                    onChange={e => { setInputCode(e.target.value.replace(/\D/g, '')); setCodeError('') }}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleSendCode}
                    disabled={!phoneValid || phoneCooldown > 0}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: phoneValid && !phoneCooldown ? '#0BBECF' : undefined, color: phoneValid && !phoneCooldown ? '#fff' : undefined, border: '1px solid #d1d5db' }}
                  >
                    {phoneCooldown > 0 ? `${phoneCooldown}s 后重发` : sentCode ? '重新发送' : '发送验证码'}
                  </button>
                </div>
                {sentCode && !codeError && (
                  <p className="mt-1.5 text-xs text-gray-400">
                    验证码已发送至 {maskPhone(phone)}（<span className="text-amber-600">验证码固定为 123456</span>）
                  </p>
                )}
                {codeError && <p className="mt-1.5 text-xs text-red-500">{codeError}</p>}
              </div>

              <button
                onClick={handleVerify}
                disabled={!sentCode || inputCode.length < 6}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#0BBECF' }}
              >
                查询转诊记录
              </button>
            </div>
          )}

          {/* 查询结果 */}
          {verified && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  手机号 <span className="font-medium text-gray-700">{maskPhone(phone)}</span> 共找到
                  <span className="font-semibold mx-1" style={{ color: '#0BBECF' }}>{results?.length ?? 0}</span>
                  条转诊记录
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  重新查询
                </button>
              </div>

              {queryError && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                  {queryError}
                </div>
              )}

              {results?.length > 0 && results.map(ref => {
                const displayStatus = getReferralDisplayStatus(ref)
                const statusInfo = STATUS_LABELS[displayStatus] || { label: displayStatus, color: 'bg-gray-100 text-gray-500' }
                const isInTransit = ref.status === UPWARD_STATUS.IN_TRANSIT
                return (
                  <div key={ref.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* 卡片头 */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                      <div className="text-sm font-medium text-gray-700">
                        转诊单 <span className="font-mono text-gray-500 ml-1">{ref.referralCode || ref.referralNo || ref.id}</span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="px-5 py-4 space-y-3 text-sm">
                      {/* 基本信息 */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <span className="text-gray-400">转诊类型</span>
                          <div className="text-gray-700 mt-0.5">{TYPE_LABELS[ref.type] || ref.type}</div>
                        </div>
                        <div>
                          <span className="text-gray-400">诊断</span>
                          <div className="text-gray-700 mt-0.5">{ref.diagnosis?.name || '—'}</div>
                        </div>
                        <div>
                          <span className="text-gray-400">转出机构</span>
                          <div className="text-gray-700 mt-0.5">{ref.fromInstitution || '—'}</div>
                        </div>
                        <div>
                          <span className="text-gray-400">接收机构</span>
                          <div className="text-gray-700 mt-0.5">{ref.toInstitution || '—'}</div>
                        </div>
                        <div>
                          <span className="text-gray-400">申请时间</span>
                          <div className="text-gray-700 mt-0.5">{formatDate(ref.createdAt)}</div>
                        </div>
                        {ref.admissionType && (
                          <div>
                            <span className="text-gray-400">承接方式</span>
                            <div className="text-gray-700 mt-0.5">{ADMISSION_LABELS[ref.admissionType] || ref.admissionType}</div>
                          </div>
                        )}
                      </div>

                      {/* 拒绝原因 */}
                      {ref.rejectReason && (
                        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-red-700">
                          拒绝原因：{ref.rejectReason}
                        </div>
                      )}

                      {/* 转诊中 — 就诊指引 */}
                      {isInTransit && ref.appointmentCode && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 space-y-1.5">
                          <div className="font-medium text-blue-800 text-sm mb-1">到院指引</div>
                          {ref.admissionType === 'outpatient' && (
                            <p className="text-blue-700 text-xs">
                              ② 到院后前往 <strong>{ref.toDept}</strong> 挂号窗口，出示预约码 <strong className="font-mono">{ref.appointmentCode}</strong>，优先排队就诊
                            </p>
                          )}
                          {ref.admissionType === 'inpatient' && (
                            <p className="text-blue-700 text-xs">
                              ② 到院后前往住院部办理入院手续，告知持有转诊单，出示预约码 <strong className="font-mono">{ref.appointmentCode}</strong>
                            </p>
                          )}
                          {ref.admissionType === 'emergency' && (
                            <p className="text-blue-700 text-xs">
                              ② 请直接前往急诊科，出示预约码 <strong className="font-mono">{ref.appointmentCode}</strong>，告知为转诊患者
                            </p>
                          )}
                          {!ref.admissionType && (
                            <p className="text-blue-700 text-xs">
                              ② 出示预约码 <strong className="font-mono">{ref.appointmentCode}</strong> 至接收科室
                            </p>
                          )}
                          <p className="text-blue-600 text-xs">③ 到院仍需正常挂号缴费，预约码用于优先排队，不免除挂号及诊疗费用</p>
                          {ref.appointmentCodeExpireAt && (
                            <p className="text-blue-500 text-xs">预约码有效期至：{formatDate(ref.appointmentCodeExpireAt)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 底部提示 */}
          <div className="mt-6 text-center text-xs text-gray-400 space-y-1">
            <p>如有疑问请联系转诊协调中心：0838-XXXXXXX</p>
            <p>本页仅供转诊进度查询，不提供诊疗建议</p>
          </div>
        </div>
      </main>
    </div>
  )
}

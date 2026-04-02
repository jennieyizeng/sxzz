import { useState } from 'react'
import { useApp } from '../context/AppContext'

const ERROR_MESSAGES = {
  OPERATOR_ID_REQUIRED: '请输入工号后再查询',
  NOT_FOUND: '预约码不存在，请检查输入是否正确',
  USED: '该预约码已核销，患者已完成到院登记',
  EXPIRED: '预约码已过期，请联系转诊管理员处理',
  UNKNOWN: '预约码状态异常，请联系系统管理员',
}

function maskName(name) {
  if (!name) return '—'
  if (name.length === 2) return name[0] + '×'
  return name[0] + '×'.repeat(name.length - 2) + name[name.length - 1]
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const ADMISSION_TYPE_LABEL = { outpatient: '门诊就诊', inpatient: '住院收治', emergency: '急诊处置' }

export default function AppointmentVerify() {
  const { verifyAndConsumeAppointmentCode, referrals } = useApp()
  const [operatorId, setOperatorId] = useState('')
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)  // { type: 'found'|'error', data }
  const [confirmModal, setConfirmModal] = useState(false)
  const [consumed, setConsumed] = useState(false)

  const handleQuery = () => {
    if (!operatorId.trim()) {
      setResult({ type: 'error', message: '请先输入工号' })
      return
    }
    if (!code.trim()) {
      setResult({ type: 'error', message: '请输入预约码' })
      return
    }
    const referral = referrals.find(r => r.appointmentCode === code.trim().toUpperCase())
    if (!referral) {
      setResult({ type: 'error', message: ERROR_MESSAGES.NOT_FOUND })
      return
    }
    const status = referral.appointmentInfo?.status || 'reserved'
    setConsumed(false)
    setResult({ type: 'found', referral, status })
  }

  const handleConsume = () => {
    const res = verifyAndConsumeAppointmentCode(code.trim().toUpperCase(), operatorId.trim())
    if (res.success) {
      setConsumed(true)
      setConfirmModal(false)
      setResult(prev => ({ ...prev, status: 'used' }))
    }
  }

  const isExpired = result?.referral && new Date(result.referral.appointmentCodeExpireAt) < new Date()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0f9fa' }}>
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #DDF0F3' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: '#0BBECF' }}>转</div>
          <div>
            <div className="font-semibold text-gray-800 text-sm">双向转诊平台</div>
            <div className="text-xs text-gray-400">挂号员核验入口</div>
          </div>
        </div>
        <a href="/" className="text-xs" style={{ color: '#0BBECF' }}>返回登录</a>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="text-xl font-semibold text-gray-800 mb-1">转诊预约码核验</div>
            <div className="text-sm text-gray-500">凭预约码为转诊患者优先办理就诊登记</div>
          </div>

          {/* 输入区 */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4" style={{ border: '1px solid #DDF0F3' }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  工号 <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-400 font-normal ml-2">操作将以此工号记录</span>
                </label>
                <input
                  type="text"
                  value={operatorId}
                  onChange={e => setOperatorId(e.target.value)}
                  placeholder="请输入您的挂号员工号"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  style={{ '--tw-ring-color': '#0BBECF' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  预约码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleQuery()}
                  placeholder="输入6位预约码，如 ZP8831"
                  maxLength={8}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest focus:outline-none"
                />
              </div>
              <button
                onClick={handleQuery}
                className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-opacity"
                style={{ background: '#0BBECF' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                查询
              </button>
            </div>
          </div>

          {/* 结果区 */}
          {result?.type === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
              {result.message}
            </div>
          )}

          {result?.type === 'found' && (
            <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid #DDF0F3' }}>
              {/* 状态横幅 */}
              {consumed || result.status === 'used' ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 text-gray-500 text-sm mb-5">
                  <span>✓</span><span>已核销 · 患者已完成到院登记</span>
                </div>
              ) : isExpired ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm mb-5">
                  <span>⚠️</span><span>预约码已过期，请联系转诊管理员</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium mb-5" style={{ background: '#E0F6F9', color: '#0892a0' }}>
                  <span>✓</span><span>预约码有效，可办理就诊登记</span>
                </div>
              )}

              {/* 详情 */}
              <div className="space-y-3 text-sm">
                {[
                  ['患者姓名', maskName(result.referral.patient?.name)],
                  ['转诊科室', result.referral.toDept || '—'],
                  ['承接方式', ADMISSION_TYPE_LABEL[result.referral.admissionType] || '门诊就诊'],
                  ['来源机构', result.referral.fromInstitution || '—'],
                  ['预约码有效期', formatDateTime(result.referral.appointmentCodeExpireAt)],
                  ['转诊单编号', result.referral.referralNo || result.referral.id],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800">{value}</span>
                  </div>
                ))}
              </div>

              {/* 核销按钮 */}
              {result.status === 'reserved' && !isExpired && !consumed && (
                <button
                  onClick={() => setConfirmModal(true)}
                  className="mt-5 w-full py-2.5 rounded-xl text-white text-sm font-medium"
                  style={{ background: '#0BBECF' }}
                >
                  确认到院 · 核销预约码
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 确认弹窗 */}
      {confirmModal && result?.referral && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setConfirmModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <div className="text-sm font-semibold text-gray-800 mb-3">确认核销预约码</div>
              <div className="text-sm text-gray-600 leading-relaxed mb-5">
                确认患者 <span className="font-medium text-gray-800">{maskName(result.referral.patient?.name)}</span> 已到院就诊？<br />
                将以工号 <span className="font-medium text-gray-800">[{operatorId}]</span> 记录本次操作，核销后不可撤销。
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">取消</button>
                <button onClick={handleConsume} className="flex-1 py-2 rounded-xl text-white text-sm font-medium" style={{ background: '#0BBECF' }}>确认核销</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

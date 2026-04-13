/**
 * A-14 县级内部分级审核页
 *
 * Assumption: 内审流程为原型演示阶段，内审状态（pending/approved/rejected）
 *   未写入主状态机（state-machine.md），实际实施需产品确认是否作为独立状态节点。
 *
 * Assumption: 内审通过后，转诊单进入正式「待受理」队列，基层医生收到系统通知。
 *   内审拒绝后，基层医生收到拒绝通知，转诊单停留在内审拒绝状态，不进入正式审核流程。
 *
 * TODO: 实际实现时，内审操作需调用后端接口，并与主状态机同步。
 */

import React, { useState, useMemo } from 'react'

// ── Mock 数据 ──────────────────────────────────────────────────────────────
const MOCK_REVIEWS_INIT = [
  {
    id: 'IR001',
    refId: 'REF2026007',
    patient: '陈小明',
    patientAge: 55,
    patientGender: '男',
    fromInst: 'xx市拱星镇卫生院',
    diagnosis: '急性心肌梗死',
    diagCode: 'I21.9',
    createdAt: '2026-03-19 08:30',
    status: 'pending',
    reviewer: '—',
    opinion: '',
  },
  {
    id: 'IR002',
    refId: 'REF2026008',
    patient: '周女士',
    patientAge: 63,
    patientGender: '女',
    fromInst: 'xx市汉旺镇卫生院',
    diagnosis: '脑出血',
    diagCode: 'I61.9',
    createdAt: '2026-03-19 09:15',
    status: 'pending',
    reviewer: '—',
    opinion: '',
  },
  {
    id: 'IR003',
    refId: 'REF2026006',
    patient: '吴大叔',
    patientAge: 70,
    patientGender: '男',
    fromInst: 'xx市清平乡卫生院',
    diagnosis: '慢性阻塞性肺疾病急性加重',
    diagCode: 'J44.1',
    createdAt: '2026-03-18 14:20',
    status: 'approved',
    reviewer: '刘医生',
    opinion: '病情符合转入指征，同意接收',
  },
  {
    id: 'IR004',
    refId: 'REF2026005',
    patient: '郑老伯',
    patientAge: 78,
    patientGender: '男',
    fromInst: 'xx市九龙镇卫生院',
    diagnosis: '2型糖尿病酮症',
    diagCode: 'E11.1',
    createdAt: '2026-03-18 10:45',
    status: 'approved',
    reviewer: '刘医生',
    opinion: '需内分泌科进一步处理，同意',
  },
  {
    id: 'IR005',
    refId: 'REF2026004',
    patient: '冯大姐',
    patientAge: 48,
    patientGender: '女',
    fromInst: 'xx市拱星镇卫生院',
    diagnosis: '普通感冒',
    diagCode: 'J00',
    createdAt: '2026-03-17 16:30',
    status: 'rejected',
    reviewer: '刘医生',
    opinion: '不符合转入指征，建议基层继续诊治',
  },
  {
    id: 'IR006',
    refId: 'REF2026003',
    patient: '卢小姐',
    patientAge: 32,
    patientGender: '女',
    fromInst: 'xx市汉旺镇卫生院',
    diagnosis: '妊娠期高血压',
    diagCode: 'O10.0',
    createdAt: '2026-03-17 11:20',
    status: 'rejected',
    reviewer: '刘医生',
    opinion: '建议转至妇产专科医院，不在本院接诊范围',
  },
]

// 申请科室枚举（Assumption: 实际科室列表应从后端获取）
const DEPT_OPTIONS = ['全部', '心内科', '神经内科', '呼吸内科', '内分泌科', '全科', '妇产科']

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待内审' },
  { value: 'approved', label: '内审通过' },
  { value: 'rejected', label: '内审拒绝' },
]

const PAGE_SIZE = 10

// ── 样式常量 ────────────────────────────────────────────────────────────────
const TH = 'px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm'

// ── 内审状态标签 ─────────────────────────────────────────────────────────────
function ReviewStatusBadge({ status }) {
  const map = {
    pending:  { cls: 'bg-blue-100 text-blue-700',   label: '待内审' },
    approved: { cls: 'bg-green-100 text-green-700',  label: '内审通过' },
    rejected: { cls: 'bg-red-100 text-red-700',      label: '内审拒绝' },
  }
  const { cls, label } = map[status] || { cls: 'bg-gray-100 text-gray-500', label: '未知' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${cls}`}>{label}</span>
  )
}

// ── 概览卡片 ─────────────────────────────────────────────────────────────────
function SummaryCard({ label, count, colorCls, dotCls }) {
  return (
    <div className="bg-white rounded-xl px-5 py-4 flex items-center gap-4" style={{ border: '1px solid #DDF0F3' }}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorCls}`}>
        <span className={`w-3 h-3 rounded-full ${dotCls}`} />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-800 leading-tight">{count}</div>
        <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

// ── 操作弹窗 ─────────────────────────────────────────────────────────────────
function ReviewModal({ item, action, onClose, onConfirm }) {
  const [opinion, setOpinion] = useState('')
  const [opinionError, setOpinionError] = useState('')

  if (!item) return null

  const isApprove = action === 'approve'
  const title = isApprove ? '内审通过确认' : '内审拒绝确认'
  const confirmBtnStyle = isApprove
    ? { background: '#0BBECF', color: '#fff' }
    : { background: '#ef4444', color: '#fff' }

  const handleConfirm = () => {
    if (!isApprove && !opinion.trim()) {
      setOpinionError('内审拒绝时审核意见为必填项')
      return
    }
    onConfirm(item.id, action, opinion.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* 弹窗主体 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 弹窗头 */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* 弹窗内容 */}
        <div className="px-5 py-4 space-y-4">
          {/* 转诊单信息 */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 w-16 shrink-0">转诊单：</span>
              <span className="font-mono text-gray-700 font-medium">{item.refId}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 w-16 shrink-0">患者：</span>
              <span className="text-gray-700">
                {item.patient}
                <span className="text-gray-400 ml-1 text-xs">
                  {item.patientGender} · {item.patientAge}岁
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 w-16 shrink-0">申请诊断：</span>
              <span className="text-gray-700">
                <span className="font-mono text-xs mr-1" style={{ color: '#0892a0' }}>{item.diagCode}</span>
                {item.diagnosis}
              </span>
            </div>
          </div>

          {/* 审核意见 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              审核意见
              {isApprove
                ? <span className="text-gray-400 font-normal ml-1">（选填）</span>
                : <span className="text-red-500 ml-1">*</span>
              }
            </label>
            <textarea
              value={opinion}
              onChange={e => { setOpinion(e.target.value); setOpinionError('') }}
              rows={3}
              placeholder={isApprove ? '可填写备注意见…' : '请填写拒绝原因（必填）'}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none ${
                opinionError ? 'border-red-400' : 'border-gray-200 focus:border-[#0BBECF]'
              }`}
            />
            {opinionError && (
              <p className="text-xs text-red-500 mt-1">{opinionError}</p>
            )}
          </div>

          {/* Assumption 说明 */}
          <div className="text-xs text-gray-400 bg-gray-50 rounded px-3 py-2 border border-gray-100">
            {isApprove
              ? 'Assumption: 内审通过后，转诊单将进入正式待受理队列，基层医生将收到系统通知。'
              : 'Assumption: 内审拒绝后，基层医生将收到拒绝通知，转诊单停留在内审拒绝状态。'
            }
          </div>
        </div>

        {/* 弹窗底部按钮 */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg text-sm font-medium"
            style={confirmBtnStyle}
          >
            确认{isApprove ? '通过' : '拒绝'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 详情弹窗（只读） ──────────────────────────────────────────────────────────
function DetailModal({ item, onClose }) {
  if (!item) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">内审详情</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['转诊单号', item.refId],
              ['内审状态', ''],
              ['患者姓名', item.patient],
              ['性别/年龄', `${item.patientGender} / ${item.patientAge}岁`],
              ['转出机构', item.fromInst],
              ['申请时间', item.createdAt],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                {label === '内审状态'
                  ? <ReviewStatusBadge status={item.status} />
                  : <div className="text-gray-800 font-medium">{val}</div>
                }
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs text-gray-400 mb-1">申请诊断</div>
            <div className="text-gray-800">
              <span className="font-mono text-xs mr-1" style={{ color: '#0892a0' }}>{item.diagCode}</span>
              {item.diagnosis}
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs text-gray-400 mb-1">审核人</div>
            <div className="text-gray-800">{item.reviewer}</div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs text-gray-400 mb-1">审核意见</div>
            <div className="text-gray-700 bg-gray-50 rounded px-3 py-2 text-xs leading-relaxed">
              {item.opinion || '（无）'}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 成功提示 ──────────────────────────────────────────────────────────────────
function SuccessToast({ message }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-5 py-2.5 rounded-full text-sm shadow-lg pointer-events-none">
      {message}
    </div>
  )
}

// ── 主页面组件 ────────────────────────────────────────────────────────────────
export default function InternalReview() {
  const [reviews, setReviews] = useState(MOCK_REVIEWS_INIT)

  // 筛选条件
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    dept: '全部',
    keyword: '',
  })
  const [applied, setApplied] = useState({ ...filters })
  const [page, setPage] = useState(1)

  // 弹窗状态
  const [modalItem, setModalItem] = useState(null)
  const [modalAction, setModalAction] = useState(null) // 'approve' | 'reject' | 'detail'

  // 成功提示
  const [toast, setToast] = useState('')

  // ── 概览统计（始终基于全量数据）──────────────────────────────────────────────
  const summary = useMemo(() => ({
    pending:  reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
  }), [reviews])

  // ── 筛选逻辑 ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return reviews.filter(r => {
      const dateStr = r.createdAt.slice(0, 10)
      if (applied.startDate && dateStr < applied.startDate) return false
      if (applied.endDate && dateStr > applied.endDate) return false
      if (applied.status !== 'all' && r.status !== applied.status) return false
      // TODO: 当前 mock 数据无科室字段，dept 筛选暂不生效；实际对接后需补充字段
      if (applied.keyword) {
        const kw = applied.keyword.trim()
        if (!r.refId.includes(kw) && !r.patient.includes(kw)) return false
      }
      return true
    })
  }, [reviews, applied])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── 查询 / 重置 ───────────────────────────────────────────────────────────────
  const handleQuery = () => { setApplied({ ...filters }); setPage(1) }
  const handleReset = () => {
    const init = { startDate: '', endDate: '', status: 'all', dept: '全部', keyword: '' }
    setFilters(init)
    setApplied(init)
    setPage(1)
  }

  // ── 弹窗操作 ──────────────────────────────────────────────────────────────────
  const openAction = (item, action) => { setModalItem(item); setModalAction(action) }
  const closeModal = () => { setModalItem(null); setModalAction(null) }

  const handleConfirm = (id, action, opinion) => {
    const reviewer = '刘医生' // Assumption: 当前登录用户，实际从 AppContext 获取
    setReviews(prev => prev.map(r =>
      r.id === id
        ? {
            ...r,
            status: action === 'approve' ? 'approved' : 'rejected',
            reviewer,
            opinion,
          }
        : r
    ))
    closeModal()
    const msg = action === 'approve' ? '内审通过，转诊单已进入正式审核队列' : '已拒绝，基层医生将收到通知'
    setToast(msg)
    setTimeout(() => setToast(''), 1500)
  }

  return (
    <div className="p-5">
      {/* 成功提示 */}
      {toast && <SuccessToast message={toast} />}

      {/* 弹窗 */}
      {modalItem && modalAction === 'detail' && (
        <DetailModal item={modalItem} onClose={closeModal} />
      )}
      {modalItem && (modalAction === 'approve' || modalAction === 'reject') && (
        <ReviewModal
          item={modalItem}
          action={modalAction}
          onClose={closeModal}
          onConfirm={handleConfirm}
        />
      )}

      {/* 页头 */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-800">内部分级审核</h2>
        <div className="text-xs text-gray-400 mt-0.5">转入申请院内审核 · 审核通过后推进至转诊接收</div>
      </div>

      {/* Assumption 提示条 */}
      <div className="mb-4 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
        <span className="text-yellow-500 text-sm mt-0.5 shrink-0">⚠</span>
        <p className="text-xs text-yellow-700 leading-relaxed">
          <strong>Assumption：</strong>
          当前内审流程仍为独立原型逻辑，内审状态未写入主状态机，实际实施需产品确认是否作为独立状态节点。
        </p>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <SummaryCard
          label="待内审"
          count={summary.pending}
          colorCls="bg-blue-100"
          dotCls="bg-blue-500"
        />
        <SummaryCard
          label="内审通过"
          count={summary.approved}
          colorCls="bg-green-100"
          dotCls="bg-green-500"
        />
        <SummaryCard
          label="内审拒绝"
          count={summary.rejected}
          colorCls="bg-red-100"
          dotCls="bg-red-500"
        />
      </div>

      {/* 筛选区 */}
      <div className="bg-white rounded-xl p-4 mb-4 space-y-3" style={{ border: '1px solid #DDF0F3' }}>
        <div className="flex flex-wrap gap-3 items-end">
          {/* 时间范围 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">申请时间</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm h-8 focus:outline-none"
              />
              <span className="text-gray-400 text-xs">~</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm h-8 focus:outline-none"
              />
            </div>
          </div>

          {/* 内审状态 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">内审状态</label>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none bg-white"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 申请科室 TODO: 数据从后端获取 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              申请科室
              <span className="text-gray-300 ml-1">（TODO: 待对接数据）</span>
            </label>
            <select
              value={filters.dept}
              onChange={e => setFilters(f => ({ ...f, dept: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 focus:outline-none bg-white"
            >
              {DEPT_OPTIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 关键词 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">关键词</label>
            <input
              value={filters.keyword}
              onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm h-8 w-44 focus:outline-none"
              placeholder="转诊单号 / 患者姓名"
            />
          </div>

          {/* 按钮 */}
          <div className="flex items-end gap-2 ml-1">
            <button
              onClick={handleQuery}
              className="px-5 py-1.5 rounded-lg text-sm font-medium text-white h-8 flex items-center"
              style={{ background: '#0BBECF' }}
            >
              查询
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-1.5 rounded-lg text-sm border h-8 flex items-center"
              style={{ color: '#0BBECF', borderColor: '#0BBECF' }}
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#E0F6F9' }}>
                {['序号', '转诊单号', '患者', '转出机构', '申请诊断', '申请时间', '内审状态', '审核人', '操作'].map(h => (
                  <th key={h} className={TH} style={{ color: '#2D7A86', borderBottom: '1px solid #C8EEF3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="text-gray-300 text-4xl mb-2">📋</div>
                    <div className="text-gray-400 text-sm">暂无内审记录</div>
                    <div className="text-gray-300 text-xs mt-1">请调整筛选条件后重新查询</div>
                  </td>
                </tr>
              ) : (
                pageData.map((item, i) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #EEF7F9',
                      background: i % 2 === 0 ? '#fff' : '#FAFEFE',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F8FDFE' }}
                    onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFEFE' }}
                  >
                    {/* 序号 */}
                    <td className={TD}>
                      <span className="text-xs text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</span>
                    </td>

                    {/* 转诊单号 */}
                    <td className={TD}>
                      <span className="font-mono text-xs font-medium" style={{ color: '#0892a0' }}>{item.refId}</span>
                    </td>

                    {/* 患者 */}
                    <td className={TD}>
                      <span className="font-medium text-gray-800">{item.patient}</span>
                      <span className="text-xs text-gray-400 ml-1">{item.patientGender} · {item.patientAge}岁</span>
                    </td>

                    {/* 上转机构 */}
                    <td className={TD + ' text-xs text-gray-500'}>{item.fromInst}</td>

                    {/* 申请诊断 */}
                    <td className={TD + ' text-xs text-gray-600'}>
                      <span className="font-mono mr-1 text-xs" style={{ color: '#0892a0' }}>{item.diagCode}</span>
                      {item.diagnosis}
                    </td>

                    {/* 申请时间 */}
                    <td className={TD + ' text-xs text-gray-500 whitespace-nowrap'}>{item.createdAt}</td>

                    {/* 内审状态 */}
                    <td className={TD}>
                      <ReviewStatusBadge status={item.status} />
                    </td>

                    {/* 审核人 */}
                    <td className={TD + ' text-xs text-gray-500'}>{item.reviewer}</td>

                    {/* 操作列 */}
                    <td className={TD} onClick={e => e.stopPropagation()}>
                      {item.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openAction(item, 'approve')}
                            className="text-xs px-2.5 py-1 rounded font-medium text-white"
                            style={{ background: '#0BBECF' }}
                          >
                            内审通过
                          </button>
                          <button
                            onClick={() => openAction(item, 'reject')}
                            className="text-xs px-2.5 py-1 rounded font-medium text-white bg-red-500 hover:bg-red-600"
                          >
                            内审拒绝
                          </button>
                        </div>
                      )}
                      {(item.status === 'approved' || item.status === 'rejected') && (
                        <button
                          onClick={() => openAction(item, 'detail')}
                          className="text-xs font-medium hover:underline"
                          style={{ color: '#0BBECF' }}
                        >
                          查看详情
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: '1px solid #EEF7F9', background: '#F8FDFE' }}
        >
          <span className="text-xs text-gray-400">
            共 <strong className="text-gray-700">{filtered.length}</strong> 条记录，每页 {PAGE_SIZE} 条，第 {page}/{totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded text-xs border disabled:opacity-40"
              style={{ borderColor: '#e5e7eb', color: '#4b5563' }}
            >
              ‹ 上一页
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(pageNum => (
              <button
                key={`page-btn-${pageNum}`}
                onClick={() => setPage(pageNum)}
                className="w-7 h-7 rounded text-xs"
                style={page === pageNum
                  ? { background: '#0BBECF', color: '#fff' }
                  : { color: '#4b5563', border: '1px solid #e5e7eb' }}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded text-xs border disabled:opacity-40"
              style={{ borderColor: '#e5e7eb', color: '#4b5563' }}
            >
              下一页 ›
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

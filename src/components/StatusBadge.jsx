const STATUS_STYLES = {
  '草稿':   { dot: '#9ca3af', bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  '待内审': { dot: '#a855f7', bg: '#faf5ff', text: '#7c3aed', border: '#d8b4fe' }, // CHG-32 院内审核
  '待审核': { dot: '#f59e0b', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  '待接收': { dot: '#f59e0b', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  '已接收': { dot: '#0BBECF', bg: '#E0F6F9', text: '#0892a0', border: '#a4edf5' },
  '转诊中': { dot: '#0BBECF', bg: '#E0F6F9', text: '#0892a0', border: '#a4edf5' },
  '已完成': { dot: '#10b981', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  '已拒绝': { dot: '#9ca3af', bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  '已撤销': { dot: '#9ca3af', bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  '已关闭': { dot: '#9ca3af', bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  '异常':   { dot: '#ef4444', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
}

export default function StatusBadge({ status, size = 'md' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['草稿']
  const pad = size === 'sm' ? '2px 8px' : '3px 10px'
  const fs = size === 'sm' ? '12px' : '13px'

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: pad, fontSize: fs }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {status}
    </span>
  )
}

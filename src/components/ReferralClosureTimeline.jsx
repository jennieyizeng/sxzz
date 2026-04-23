function formatTime(isoStr) {
  if (!isoStr) return '待推进'
  return new Date(isoStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getArrowClipPath(index, length) {
  if (length === 1) return 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
  if (index === 0) return 'polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%)'
  if (index === length - 1) return 'polygon(10% 0, 100% 0, 100% 100%, 10% 100%, 0 50%)'
  return 'polygon(10% 0, 88% 0, 100% 50%, 88% 100%, 10% 100%, 0 50%)'
}

function getEventTheme(state) {
  switch (state) {
    case 'done':
      return {
        segment: 'linear-gradient(90deg, #70BDF5 0%, #8FD1FF 100%)',
        text: '#FFFFFF',
        subtext: 'rgba(255,255,255,0.92)',
        iconBg: '#FFFFFF',
        iconText: '#57AEEF',
        border: '#7BC5FA',
        shadow: '0 8px 18px rgba(88, 171, 239, 0.18)',
      }
    case 'active':
      return {
        segment: 'linear-gradient(90deg, #6FE29A 0%, #8BE7B0 100%)',
        text: '#115E3B',
        subtext: '#166534',
        iconBg: '#FFFFFF',
        iconText: '#22C55E',
        border: '#7AD9A0',
        shadow: '0 8px 18px rgba(34, 197, 94, 0.16)',
      }
    case 'terminal':
      return {
        segment: 'linear-gradient(90deg, #FDB4BF 0%, #FDA4AF 100%)',
        text: '#881337',
        subtext: '#9F1239',
        iconBg: '#FFFFFF',
        iconText: '#E11D48',
        border: '#FDA4AF',
        shadow: '0 8px 18px rgba(225, 29, 72, 0.12)',
      }
    default:
      return {
        segment: 'linear-gradient(90deg, #EEF6FF 0%, #F7FBFF 100%)',
        text: '#94A3B8',
        subtext: '#94A3B8',
        iconBg: '#FFFFFF',
        iconText: '#CBD5E1',
        border: '#D9E8F5',
        shadow: 'none',
      }
  }
}

export default function ReferralClosureTimeline({ events = [] }) {
  const activeIndex = events.findIndex(item => item.state === 'active')
  const terminalIndex = events.findIndex(item => item.state === 'terminal')
  const currentIndex = activeIndex >= 0 ? activeIndex : terminalIndex

  return (
    <div
      className="overflow-hidden bg-white rounded-[20px]"
      style={{ border: '1px solid #D8EEF1', boxShadow: '0 14px 30px rgba(15, 118, 110, 0.06)' }}
    >
      <div className="px-4 py-3 md:px-5 md:py-3.5" style={{ borderBottom: '1px solid #E6F3F5' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-1.5 h-4 rounded-full" style={{ background: '#0BBECF' }} />
            <span className="text-[15px] font-semibold" style={{ color: '#155E75' }}>
              流程进度
            </span>
          </div>
          <div className="text-xs font-medium text-slate-400 shrink-0">
            {Math.max(currentIndex, 0) + 1}/{events.length || 0}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-5">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          {events.map((event, index) => {
            const theme = getEventTheme(event.state)
            const isCurrent = index === currentIndex
            return (
              <div
                key={event.key}
                className="relative min-h-[58px] px-4 py-2.5 md:px-3.5 md:py-2"
                style={{
                  clipPath: getArrowClipPath(index, events.length),
                  background: theme.segment,
                  border: `1px solid ${theme.border}`,
                  boxShadow: theme.shadow,
                  marginLeft: index === 0 ? 0 : '-10px',
                  zIndex: events.length - index,
                  transform: isCurrent ? 'translateY(-1px)' : 'none',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: theme.iconBg, color: theme.iconText }}
                  >
                    {event.state === 'done' ? '✓' : event.state === 'terminal' ? '!' : index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] leading-4 font-semibold truncate" style={{ color: theme.text }}>
                      {event.label}
                    </div>
                    <div className="text-[11px] leading-4 truncate mt-0.5" style={{ color: theme.subtext }}>
                      {formatTime(event.time)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

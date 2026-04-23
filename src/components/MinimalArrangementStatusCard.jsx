export default function MinimalArrangementStatusCard({ text }) {
  const isPending = text?.includes('⏳')

  return (
    <div
      className="px-5 py-4 rounded-xl"
      style={{
        background: isPending ? '#fff7ed' : '#eff6ff',
        border: `1px solid ${isPending ? '#fdba74' : '#bfdbfe'}`,
      }}
    >
      <div className="text-sm font-medium" style={{ color: isPending ? '#c2410c' : '#1d4ed8' }}>
        {text}
      </div>
    </div>
  )
}

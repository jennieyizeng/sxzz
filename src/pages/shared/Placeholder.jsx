// 低保真占位页面
export default function Placeholder({ title, description }) {
  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4" style={{ background: '#E0F6F9' }}>🔧</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">{title || '页面建设中'}</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          {description || '此页面在 Phase 06 第二优先级，以线框图覆盖。完整交互将在后续迭代中实现。'}
        </p>
        <div className="mt-4 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg inline-block">
          <span className="text-xs text-amber-600">低保真占位 · Phase 06</span>
        </div>
      </div>
    </div>
  )
}

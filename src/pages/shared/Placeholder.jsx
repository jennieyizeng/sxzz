export default function Placeholder({ title, description }) {
  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4" style={{ background: '#E0F6F9' }}>🔧</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">{title || '页面建设中'}</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          {description || '当前页面暂未开放，请返回上一页继续操作。'}
        </p>
      </div>
    </div>
  )
}

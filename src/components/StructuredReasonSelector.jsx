export default function StructuredReasonSelector({
  options = [],
  value = '',
  textValue = '',
  onChange,
  otherCode = 'other',
  inputLabel = '补充说明',
  placeholder = '请补充说明',
  maxLength = 200,
  required = true,
}) {
  const showOtherInput = value === otherCode

  function update(code, nextText = textValue) {
    onChange?.({ reasonCode: code, reasonText: nextText })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option.code}
            type="button"
            onClick={() => update(option.code, option.code === otherCode ? textValue : '')}
            className="px-3 py-2 rounded-full border text-sm transition-colors"
            style={value === option.code
              ? {
                  borderColor: option.code === otherCode ? '#ef4444' : '#0BBECF',
                  background: option.code === otherCode ? '#fef2f2' : '#F0FBFC',
                  color: option.code === otherCode ? '#dc2626' : '#0892A0',
                }
              : {
                  borderColor: '#e5e7eb',
                  background: '#fff',
                  color: '#4b5563',
                }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {inputLabel}
          {required && showOtherInput && <span className="text-red-500 ml-1">*</span>}
          <span className="text-xs text-gray-400 font-normal ml-2">最多 {maxLength} 字</span>
        </label>
        <textarea
          value={textValue}
          onChange={(event) => update(value, event.target.value.slice(0, maxLength))}
          rows={3}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-100 resize-none"
        />
      </div>
    </div>
  )
}

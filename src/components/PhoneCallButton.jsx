import { useMemo, useState } from 'react'
import { buildPhoneCallLogEntry, getPhoneCallMode, PHONE_CALL_ACTIONS } from '../utils/phoneCall'

const VARIANT_CLASS = {
  emergency: 'bg-red-500 hover:bg-red-600 text-white border-red-500',
  normal: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500',
}

export default function PhoneCallButton({
  number,
  label,
  variant = 'normal',
  source,
  numberType,
  action = PHONE_CALL_ACTIONS.PHONE_CALL_CLICKED,
  actorId,
  actorRole,
  referralId,
  onLog,
  className = '',
  buttonText,
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const mode = useMemo(() => getPhoneCallMode(), [])
  const displayLabel = buttonText || `拨打${label ? `${label}电话` : '电话'}`
  const cleanNumber = String(number || '').trim()
  const disabled = !cleanNumber

  function recordClick() {
    if (disabled || !onLog) return
    onLog(buildPhoneCallLogEntry({
      action,
      source,
      numberType,
      actorId,
      actorRole,
      referralId,
    }))
  }

  async function copyNumber() {
    if (!cleanNumber) return
    try {
      await navigator.clipboard?.writeText(cleanNumber)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  const baseClass = `inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${VARIANT_CLASS[variant] || VARIANT_CLASS.normal} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`

  if (mode === 'dial') {
    return (
      <a
        href={disabled ? undefined : `tel:${cleanNumber}`}
        aria-disabled={disabled}
        onClick={recordClick}
        className={baseClass}
      >
        <span aria-hidden="true">📞</span>
        {displayLabel}
      </a>
    )
  }

  return (
    <span className={`relative inline-flex ${className.includes('flex-1') ? 'flex-1' : ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          recordClick()
          setOpen(prev => !prev)
        }}
        className={baseClass}
      >
        <span aria-hidden="true">📞</span>
        {displayLabel}
      </button>
      {open && !disabled && (
        <span className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-xl">
          <span className="block text-xs text-gray-500">请使用电话拨打此号码</span>
          <span className="mt-1 block font-mono text-sm font-semibold text-gray-900">{cleanNumber}</span>
          <button
            type="button"
            onClick={copyNumber}
            className="mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            {copied ? '已复制' : '复制号码'}
          </button>
        </span>
      )}
    </span>
  )
}

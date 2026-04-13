/**
 * 个人设置页（P2-4）
 * 路由：/settings
 * 新增通知渠道偏好选择区块
 */
import { useState } from 'react'
import { useApp } from '../../context/AppContext'

const CHANNEL_OPTIONS = [
  { key: 'inApp',   label: '站内通知',   desc: '在消息中心显示通知',         defaultOn: true,  required: true },
  { key: 'sms',     label: '短信通知',   desc: '关键节点发送短信至登记手机号', defaultOn: true,  required: false },
  { key: 'wechat',  label: '微信服务号', desc: '通过关联微信服务号推送',       defaultOn: false, required: false },
]

const EVENT_PREFS = [
  { key: 'newReferral',   label: '新转诊申请',     desc: '有新的转入/转出申请待处理' },
  { key: 'statusChange',  label: '转诊状态变更',   desc: '我发起或参与的转诊状态发生变化' },
  { key: 'timeout',       label: '超时预警',       desc: '转诊超时未处理提醒' },
  { key: 'followup',      label: '随访任务提醒',   desc: '随访任务到期前提醒' },
  { key: 'systemNotice',  label: '系统公告',       desc: '平台更新、维护通知等' },
]

export default function UserSettings() {
  const { currentUser } = useApp()

  // 通知渠道开关
  const [channels, setChannels] = useState(() =>
    Object.fromEntries(CHANNEL_OPTIONS.map(c => [c.key, c.defaultOn]))
  )

  // 事件订阅偏好（默认全开）
  const [eventPrefs, setEventPrefs] = useState(() =>
    Object.fromEntries(EVENT_PREFS.map(e => [e.key, true]))
  )

  const [saved, setSaved] = useState(false)

  function toggleChannel(key, required) {
    if (required) return  // 站内通知不可关闭
    setChannels(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  function toggleEvent(key) {
    setEventPrefs(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  function handleSave() {
    // Mock 保存
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">个人设置</h1>
          <p className="text-sm text-gray-400 mt-0.5">管理账号信息与通知偏好</p>
        </div>
      </div>

      {/* 基本信息（只读展示） */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">基本信息</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <div className="text-gray-400 mb-1">姓名</div>
            <div className="text-gray-800 font-medium">{currentUser.name}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">所属机构</div>
            <div className="text-gray-800">{currentUser.institution}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">角色</div>
            <div>
              <span
                className="inline-block text-xs px-2 py-0.5 rounded text-white"
                style={{ background: '#0BBECF' }}
              >
                {currentUser.roleLabel}
              </span>
            </div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">工号</div>
            <div className="text-gray-800 font-mono">{currentUser.id || 'DOC001'}</div>
          </div>
          <div className="col-span-2">
            <div className="text-gray-400 mb-1">登记手机号（短信接收）</div>
            <div className="flex items-center gap-3">
              <div className="text-gray-800 font-mono">138****8888</div>
              <button className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-500 hover:bg-gray-50">
                修改
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 通知渠道偏好 */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">通知渠道偏好</h2>
          <p className="text-xs text-gray-400 mt-0.5">选择接收系统通知的方式，站内通知不可关闭</p>
        </div>
        <div className="divide-y divide-gray-100">
          {CHANNEL_OPTIONS.map(ch => (
            <div key={ch.key} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{ch.label}</span>
                  {ch.required && (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">必选</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{ch.desc}</p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => toggleChannel(ch.key, ch.required)}
                disabled={ch.required}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  channels[ch.key] ? 'bg-[#0BBECF]' : 'bg-gray-200'
                } ${ch.required ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    channels[ch.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 通知事件订阅 */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">通知事件订阅</h2>
          <p className="text-xs text-gray-400 mt-0.5">选择需要接收提醒的业务事件类型</p>
        </div>
        <div className="divide-y divide-gray-100">
          {EVENT_PREFS.map(ev => (
            <div key={ev.key} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <div className="text-sm font-medium text-gray-700">{ev.label}</div>
                <p className="text-xs text-gray-400 mt-0.5">{ev.desc}</p>
              </div>
              <button
                onClick={() => toggleEvent(ev.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  eventPrefs[ev.key] ? 'bg-[#0BBECF]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    eventPrefs[ev.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 静默时段 */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">静默时段（短信/微信）</h2>
          <p className="text-xs text-gray-400 mt-0.5">静默时段内不发送短信和微信通知，站内通知不受影响</p>
        </div>
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">开始</label>
            <select className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700">
              {Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`).map(t=>(
                <option key={t} selected={t==='22:00'}>{t}</option>
              ))}
            </select>
          </div>
          <span className="text-gray-400">—</span>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">结束</label>
            <select className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700">
              {Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`).map(t=>(
                <option key={t} selected={t==='08:00'}>{t}</option>
              ))}
            </select>
          </div>
          <span className="text-xs text-gray-400">（急诊告警不受此规则影响）</span>
        </div>
      </section>

      {/* 保存按钮 */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            已保存
          </span>
        )}
        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ background: '#0BBECF' }}
        >
          保存设置
        </button>
      </div>
    </div>
  )
}

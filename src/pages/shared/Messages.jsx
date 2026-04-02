import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

function formatTime(isoStr) {
  const d = new Date(isoStr)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const NOTIF_ICONS = {
  upward_new: '⬆️',
  upward_accepted: '✅',
  upward_rejected: '❌',
  upward_completed: '🎉',
  downward_new: '⬇️',
  downward_accepted: '✅',
  timeout_warning: '⚠️',
}

// D-03：消息类型筛选 Tab 定义
const MSG_TABS = [
  { key: 'all', label: '全部' },
  { key: 'upward', label: '上转通知' },
  { key: 'downward', label: '下转通知' },
  { key: 'timeout', label: '超时催办' },
  { key: 'system', label: '系统通知' },
]

export default function Messages() {
  const { myNotifications, markNotificationRead, markAllRead, unreadCount } = useApp()
  const navigate = useNavigate()
  // D-03：消息类型筛选 state
  const [msgTab, setMsgTab] = useState('all')

  const handleClick = (n) => {
    markNotificationRead(n.id)
    if (n.referralId) navigate(`/referral/${n.referralId}`)
  }

  // D-03：消息过滤函数
  // Assumption: type 字段值形如 upward_new / downward_new / timeout_warning / system
  // 兜底：按标题关键字做模糊匹配
  const filterMsg = (msg) => {
    if (msgTab === 'all') return true
    if (msgTab === 'upward') {
      return msg.type?.startsWith('upward') ||
        msg.title?.includes('上转') ||
        msg.content?.includes('上转')
    }
    if (msgTab === 'downward') {
      return msg.type?.startsWith('downward') ||
        msg.title?.includes('下转') ||
        msg.content?.includes('下转')
    }
    if (msgTab === 'timeout') {
      return msg.type === 'timeout_warning' ||
        msg.title?.includes('催办') ||
        msg.title?.includes('超时') ||
        msg.title?.includes('逾期')
    }
    if (msgTab === 'system') {
      return msg.type === 'system' ||
        msg.title?.includes('系统')
    }
    return true
  }

  const filteredMsgs = myNotifications.filter(filterMsg)

  return (
    <div className="p-5 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-700">消息中心</h2>
          <div className="text-xs text-gray-400 mt-0.5">站内消息汇聚，支持已读/未读管理</div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-3 py-1.5 text-sm rounded border"
            style={{ color: '#0BBECF', borderColor: '#0BBECF' }}
          >
            全部标为已读
          </button>
        )}
      </div>

      <div className="bg-white rounded overflow-hidden" style={{ border: '1px solid #DDF0F3' }}>
        {/* D-03：消息类型筛选 Tab 栏 */}
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto px-2">
          {MSG_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setMsgTab(t.key)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                msgTab === t.key
                  ? 'border-[#0BBECF] text-[#0BBECF]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 全部消息为空时的空状态（Tab 未激活情况） */}
        {myNotifications.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="text-4xl mb-3">🔔</div>
            <div>暂无消息</div>
          </div>
        ) : filteredMsgs.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            暂无{MSG_TABS.find(t => t.key === msgTab)?.label}消息
          </div>
        ) : (
          <div>
            {filteredMsgs.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className="flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors"
                style={{
                  borderBottom: '1px solid #EEF7F9',
                  background: !n.read ? '#F5FBFC' : '#fff'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#EBF8FA'}
                onMouseLeave={e => e.currentTarget.style.background = !n.read ? '#F5FBFC' : '#fff'}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: !n.read ? '#E0F6F9' : '#f3f4f6' }}
                >
                  {NOTIF_ICONS[n.type] || '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#0BBECF' }} />}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5 leading-relaxed">{n.content}</div>
                  <div className="text-xs text-gray-400 mt-1">{formatTime(n.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

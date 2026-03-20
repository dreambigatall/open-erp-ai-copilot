import type { ChatMessage } from './types.js'

interface MessageBubbleProps {
  message: ChatMessage
  onPinToDashboard?: (msg: ChatMessage) => void
}

export function MessageBubble({ message, onPinToDashboard }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full bg-brand-500 flex items-center
          justify-center mr-2 shrink-0 mt-0.5"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="white">
            <path d="M8 1a5 5 0 0 1 5 5c0 2-1 3.5-2.5 4.5V13H5.5v-2.5C4 9.5 3 8 3 6a5 5 0 0 1 5-5z" />
          </svg>
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-brand-500 text-white rounded-tr-sm'
            : 'bg-gray-100 text-gray-800 rounded-tl-sm'
        }`}
      >
        {message.content}
        {message.streaming && (
          <span
            className="inline-block w-1.5 h-3.5 bg-current ml-0.5
            align-middle animate-pulse rounded-sm"
          />
        )}

        {/* Pin to dashboard button — shown on completed assistant messages */}
        {!isUser && !message.streaming && onPinToDashboard && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <button
              onClick={() => {
                onPinToDashboard(message)
              }}
              className="text-xs text-brand-700 hover:text-brand-900
                font-medium flex items-center gap-1 transition-colors"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="2" y="2" width="5" height="5" rx="1" />
                <rect x="9" y="2" width="5" height="5" rx="1" />
                <rect x="2" y="9" width="5" height="5" rx="1" />
                <rect x="9" y="9" width="5" height="5" rx="1" />
              </svg>
              Add to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

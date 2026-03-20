import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble.js'
import { useCopilot } from './CopilotContext.js'
import type { ChatMessage } from './types.js'

interface MessageListProps {
  onPinToDashboard?: (msg: ChatMessage) => void
}

export function MessageList({ onPinToDashboard }: MessageListProps) {
  const { messages } = useCopilot()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center
        text-center px-6 py-8"
      >
        <div
          className="w-10 h-10 rounded-xl bg-brand-50 flex items-center
          justify-center mb-3"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1D9E75"
            strokeWidth="1.75"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">Ask me anything</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Try: "What are my top 5 customers by revenue?" or "Show overdue invoices this month"
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          {...(onPinToDashboard ? { onPinToDashboard } : {})}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

import { useState } from 'react'
import { MessageList } from './MessageList.js'
import { ChatInput } from './ChatInput.js'
import { useCopilot } from './CopilotContext.js'
import { useDashboard } from '../DashboardContext.js'
import type { ChatMessage } from './types.js'

interface CopilotPanelProps {
  providerName?: string
}

export function CopilotPanel({ providerName }: CopilotPanelProps) {
  const [open, setOpen] = useState(false)
  const { clearChat } = useCopilot()
  const { addWidget } = useDashboard()

  const handlePin = async (msg: ChatMessage) => {
    // Extract a question from the message content (first sentence)
    const question = msg.content.split('.')[0]?.slice(0, 80) ?? msg.content.slice(0, 80)
    await addWidget(question, 'table', question)
  }

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={() => {
          setOpen((p) => !p)
        }}
        className="fixed bottom-6 right-6 w-12 h-12 bg-brand-500 text-white
          rounded-full flex items-center justify-center
          hover:bg-brand-700 transition-colors z-40"
        title="Toggle copilot"
      >
        {open ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Side panel */}
      {open && (
        <div
          className="fixed right-0 top-0 h-full w-80 bg-white border-l
            border-gray-200 flex flex-col z-30"
          style={{ boxShadow: '-4px 0 24px rgba(0,0,0,0.06)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3.5
            border-b border-gray-200"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">AI Copilot</p>
              {providerName && (
                <p className="text-xs text-gray-400 font-mono mt-0.5">{providerName}</p>
              )}
            </div>
            <button
              onClick={clearChat}
              className="text-xs text-gray-400 hover:text-gray-600
                transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <MessageList
            onPinToDashboard={(msg) => {
              void handlePin(msg)
            }}
          />

          {/* Input */}
          <ChatInput />
        </div>
      )}
    </>
  )
}

import { useState, type KeyboardEvent } from 'react'
import { useCopilot } from './CopilotContext.js'

export function ChatInput() {
  const { sendMessage, isStreaming } = useCopilot()
  const [input, setInput] = useState('')

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    await sendMessage(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="border-t border-gray-200 px-3 py-3">
      <div
        className="flex items-end gap-2 bg-gray-50 rounded-xl
        border border-gray-200 px-3 py-2"
      >
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          disabled={isStreaming}
          rows={1}
          className="flex-1 bg-transparent text-sm text-gray-900
            placeholder-gray-400 resize-none focus:outline-none
            max-h-28 disabled:opacity-50"
          style={{ minHeight: '20px' }}
        />
        <button
          onClick={() => {
            void handleSend()
          }}
          disabled={!input.trim() || isStreaming}
          className="w-7 h-7 rounded-lg bg-brand-500 flex items-center
            justify-center shrink-0 disabled:opacity-40
            hover:bg-brand-700 transition-colors disabled:cursor-not-allowed"
        >
          {isStreaming ? (
            <div
              className="w-3 h-3 border-2 border-white border-t-transparent
              rounded-full animate-spin"
            />
          ) : (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="white">
              <path
                d="M8 2v12M3 7l5-5 5 5"
                stroke="white"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          )}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5 text-center">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
}

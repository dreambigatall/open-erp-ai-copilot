import { useState } from 'react'
import { WidgetGrid } from './WidgetGrid.js'
import { AddWidgetModal } from './AddWidgetModal.js'

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 14.93V18h-2v-1.07A4 4 0 0 1 8 13h2a2 2 0 0 0 4 0c0-1.1-.9-2-2-2a4 4 0 0 1 0-8V2h2v1.07A4 4 0 0 1 16 7h-2a2 2 0 0 0-4 0c0 1.1.9 2 2 2a4 4 0 0 1 0 8z',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  },
  {
    id: 'hr',
    label: 'HR',
    icon: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 3H8L6 7h12l-2-4z',
  },
]

interface DashboardShellProps {
  title?: string
  provider?: string
}

export function DashboardShell({ title = 'ERP Copilot', provider }: DashboardShellProps) {
  const [activeNav, setActiveNav] = useState('dashboard')
  const [showModal, setShowModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-52' : 'w-14'} bg-white border-r
        border-gray-200 flex flex-col transition-all duration-200 shrink-0`}
      >
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100">
          <div
            className="w-7 h-7 rounded-lg bg-brand-500 flex items-center
            justify-center shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
              <rect x="1" y="1" width="6" height="6" rx="1.5" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" opacity=".5" />
              <rect x="1" y="9" width="6" height="6" rx="1.5" opacity=".5" />
              <rect x="9" y="9" width="6" height="6" rx="1.5" />
            </svg>
          </div>
          {sidebarOpen && (
            <span className="text-sm font-medium text-gray-900 truncate">{title}</span>
          )}
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveNav(item.id)
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                text-sm transition-colors ${
                  activeNav === item.id
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <path d={item.icon} />
              </svg>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        <button
          onClick={() => {
            setSidebarOpen((p) => !p)
          }}
          className="mx-2 mb-3 p-2 rounded-lg text-gray-400 hover:bg-gray-100
            hover:text-gray-600 transition-colors flex items-center justify-center"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d={sidebarOpen ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} />
          </svg>
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="bg-white border-b border-gray-200 px-6 py-3.5
          flex items-center justify-between shrink-0"
        >
          <div>
            <h1 className="text-base font-medium text-gray-900 capitalize">{activeNav}</h1>
            {provider && <p className="text-xs text-gray-400 font-mono mt-0.5">AI: {provider}</p>}
          </div>
          <button
            onClick={() => {
              setShowModal(true)
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-500 text-white
              text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
              <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            Add widget
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <WidgetGrid />
          {showModal && (
            <AddWidgetModal
              onClose={() => {
                setShowModal(false)
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WidgetCard } from './WidgetCard.js'
import { DashboardContext } from '../DashboardContext.js'
import type { Widget } from '../types.js'

const mockWidget: Widget = {
  id: 'w1',
  title: 'Test widget',
  question: 'Show me all orders',
  type: 'table',
  loading: false,
  createdAt: new Date(),
}

const mockCtx = {
  widgets: [mockWidget],
  addWidget: vi.fn(),
  removeWidget: vi.fn(),
  refreshWidget: vi.fn(),
  connector: null,
  aiCore: null,
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <DashboardContext.Provider value={mockCtx}>{children}</DashboardContext.Provider>
}

describe('WidgetCard', () => {
  it('renders widget title', () => {
    render(
      <Wrapper>
        <WidgetCard widget={mockWidget}>
          <div>content</div>
        </WidgetCard>
      </Wrapper>,
    )
    expect(screen.getByText('Test widget')).toBeInTheDocument()
  })

  it('renders question in header', () => {
    render(
      <Wrapper>
        <WidgetCard widget={mockWidget}>
          <div>content</div>
        </WidgetCard>
      </Wrapper>,
    )
    expect(screen.getByText('Show me all orders')).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    render(
      <Wrapper>
        <WidgetCard widget={{ ...mockWidget, loading: true }}>
          <div>content</div>
        </WidgetCard>
      </Wrapper>,
    )
    expect(screen.getByText('Thinking...')).toBeInTheDocument()
  })

  it('shows error message when error present', () => {
    render(
      <Wrapper>
        <WidgetCard widget={{ ...mockWidget, error: 'DB connection failed' }}>
          <div>content</div>
        </WidgetCard>
      </Wrapper>,
    )
    expect(screen.getByText('DB connection failed')).toBeInTheDocument()
  })
})

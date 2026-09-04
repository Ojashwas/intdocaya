// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { initialDocuments } from '../../src/data/mockData'

const memoryStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size
    },
  } satisfies Storage
}

Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true })

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/development-token')) return json({ accessToken: 'development-test-token' })
      if (url.endsWith('/auth/me'))
        return json({
          user: { name: 'Khalid Al Mansoori', email: 'k.mansoori@docaya.local', roles: ['quality-manager'] },
        })
      if (url.includes('/documents?')) return json({ documents: initialDocuments })
      if (url.endsWith('/workflows'))
        return json({
          workflows: [
            {
              id: 'task-1',
              document_id: 'doc-3',
              document_number: 'FOR-EVD-STD-00009',
              document_title: 'Evidence Handling Standard',
              name: 'Department Review',
              status: 'Pending',
              due_at: '2026-09-05',
            },
          ],
        })
      if (url.includes('/notifications?')) return json({ notifications: [] })
      if (url.endsWith('/admin/overview'))
        return json({
          overview: {
            users: 1,
            documents: initialDocuments.length,
            trashedDocuments: 0,
            pendingWorkflows: 1,
            generatedAt: new Date().toISOString(),
          },
        })
      if (url.includes('/workflows/task-1/decision'))
        return json({
          workflow: {
            id: 'task-1',
            document_id: 'doc-3',
            document_number: 'FOR-EVD-STD-00009',
            document_title: 'Evidence Handling Standard',
            name: 'Department Review',
            status: 'Approved',
            due_at: '2026-09-05',
          },
        })
      return json({ error: { message: `Unhandled test request: ${url}` } }, 404)
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Docaya user workflow', () => {
  it('signs in, opens the workflow inbox and approves a review', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /continue with organizational sso/i }))
    await screen.findByRole('heading', { name: /welcome, khalid/i })

    fireEvent.click(screen.getByRole('button', { name: /document center/i }))
    expect(await screen.findByRole('heading', { name: 'Document Center' })).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: /my workflow/i }))
    const approveButtons = screen.getAllByRole('button', { name: /approve/i })
    fireEvent.click(approveButtons[0])

    await waitFor(() => expect(screen.getByText(/Evidence Handling Standard: Approved/i)).toBeTruthy())
  })
})

function json(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } }),
  )
}

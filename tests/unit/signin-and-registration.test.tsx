// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SignInPage } from '../../src/features/auth/SignInPage'
import { RegisterDocumentModal } from '../../src/features/documents/RegisterDocumentModal'
import type { UserProfile } from '../../src/types'

const user: UserProfile = {
  name: 'Khalid Al Mansoori',
  email: 'k.mansoori@docaya.local',
  initials: 'KM',
  role: 'Quality & Records Manager',
  department: 'Records & Governance',
}

afterEach(() => cleanup())

describe('workspace sign-in', () => {
  it('validates the email before completing sign-in', () => {
    render(<SignInPage onSignIn={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'invalid' } })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(screen.getByRole('alert').textContent).toContain('valid organizational email')
  })

  it('supports the organizational SSO demo path', async () => {
    const onSignIn = vi.fn()
    render(<SignInPage onSignIn={onSignIn} />)
    fireEvent.click(screen.getByRole('button', { name: /continue with organizational sso/i }))
    await waitFor(() => expect(onSignIn).toHaveBeenCalledWith(user))
  })
})

describe('controlled document registration', () => {
  it('validates metadata and submits the four-step workflow', () => {
    const onSave = vi.fn()
    render(<RegisterDocumentModal user={user} onClose={vi.fn()} onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByRole('alert').textContent).toContain('required metadata')

    fireEvent.change(screen.getByPlaceholderText(/evidence handling procedure/i), {
      target: { value: 'Ministerial Records Procedure' },
    })
    fireEvent.change(screen.getByLabelText(/upload document/i), {
      target: { files: [new File(['document'], 'records-procedure.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })] },
    })
    fireEvent.change(screen.getByLabelText(/document type/i), { target: { value: 'Procedure' } })
    fireEvent.change(screen.getByLabelText(/library/i), { target: { value: 'Corporate Governance' } })
    fireEvent.change(screen.getByLabelText(/owning department/i), { target: { value: 'Policy & Strategy' } })

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit for review/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].title).toBe('Ministerial Records Procedure')
    expect(onSave.mock.calls[0][1]).toBe(true)
  })
})

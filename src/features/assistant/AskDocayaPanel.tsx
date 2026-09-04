import { Bot, Send, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { askAssistant, ApiError, type AssistantReference } from '../../services/api'

type Exchange = {
  id: string
  question: string
  answer?: string
  references?: AssistantReference[]
  error?: string
}

export function AskDocayaPanel({ onClose }: { onClose: () => void }) {
  const dialogRef = useDialogFocus(onClose)
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || busy) return
    const id = `exchange-${Date.now()}`
    setExchanges((rows) => [...rows, { id, question: trimmed }])
    setQuestion('')
    setBusy(true)
    try {
      const { answer, references } = await askAssistant(trimmed)
      setExchanges((rows) => rows.map((row) => (row.id === id ? { ...row, answer, references } : row)))
    } catch (problem) {
      const message =
        problem instanceof ApiError && problem.code === 'ASSISTANT_UNAVAILABLE'
          ? 'Ask Docaya is not configured for this environment yet. An administrator needs to connect an Azure OpenAI deployment.'
          : problem instanceof Error
            ? problem.message
            : 'Ask Docaya could not answer that question.'
      setExchanges((rows) => rows.map((row) => (row.id === id ? { ...row, error: message } : row)))
    } finally {
      setBusy(false)
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }))
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="assistant-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-docaya-title"
      >
        <header className="modal-header">
          <div>
            <p className="kicker">GOVERNANCE ASSISTANT</p>
            <h2 id="ask-docaya-title">
              <Bot size={20} /> Ask Docaya
            </h2>
            <span className="number-preview">Answers are grounded in your controlled documents</span>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close Ask Docaya">
            <X size={20} />
          </button>
        </header>
        <div className="assistant-body" ref={listRef}>
          {!exchanges.length && (
            <p className="empty-copy">
              Ask about a controlled document, its status, owner, or upcoming review — for example, “what is the
              status of the Data Protection Policy?”
            </p>
          )}
          {exchanges.map((exchange) => (
            <div className="assistant-exchange" key={exchange.id}>
              <p className="assistant-question">{exchange.question}</p>
              {exchange.error ? (
                <p className="form-message" role="alert">
                  {exchange.error}
                </p>
              ) : exchange.answer ? (
                <div className="assistant-answer">
                  <p>{exchange.answer}</p>
                  {exchange.references && exchange.references.length > 0 && (
                    <ul className="assistant-references">
                      {exchange.references.map((reference) => (
                        <li key={reference.id}>
                          <strong>{reference.number}</strong> {reference.title} · {reference.status}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="assistant-answer assistant-thinking" role="status">
                  Thinking…
                </p>
              )}
            </div>
          ))}
        </div>
        <form className="assistant-composer" onSubmit={(event) => void submit(event)}>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about a controlled document…"
            aria-label="Ask Docaya a question"
            disabled={busy}
          />
          <button type="submit" className="gold-button" disabled={busy || !question.trim()}>
            <Send size={16} /> Send
          </button>
        </form>
      </section>
    </div>
  )
}

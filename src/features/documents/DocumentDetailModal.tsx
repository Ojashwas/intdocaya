import { Archive, Check, Clock3, Download, FileText, History, ShieldCheck, X } from 'lucide-react'
import type { ControlledDocument } from '../../types'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export function DocumentDetailModal({
  document,
  onClose,
}: {
  document: ControlledDocument
  onClose: () => void
}) {
  const dialogRef = useDialogFocus(onClose)
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-title"
      >
        <header className="modal-header">
          <div>
            <p className="kicker">CONTROLLED DOCUMENT</p>
            <h2 id="document-title">
              <FileText size={21} /> {document.title}
            </h2>
            <span className="number-preview">
              {document.number} · REV {String(document.revision).padStart(2, '0')}
            </span>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close document details">
            <X size={20} />
          </button>
        </header>
        <div className="detail-body">
          <div className="document-banner">
            <span className={`document-type-icon ${document.classification.toLowerCase()}`}>
              <FileText size={28} />
            </span>
            <div>
              <h3>{document.title}</h3>
              <p>{document.summary}</p>
              <div>
                <span className={`status ${statusClass(document.status)}`}>{document.status}</span>
                <span className={`classification ${document.classification.toLowerCase()}`}>
                  {document.classification}
                </span>
              </div>
            </div>
          </div>
          <div className="detail-grid">
            <div>
              <small>Owner</small>
              <strong>{document.owner}</strong>
            </div>
            <div>
              <small>Department</small>
              <strong>{document.department}</strong>
            </div>
            <div>
              <small>Document type</small>
              <strong>{document.type}</strong>
            </div>
            <div>
              <small>Library</small>
              <strong>{document.library}</strong>
            </div>
            <div>
              <small>Next review</small>
              <strong>{formatDate(document.nextReview)}</strong>
            </div>
            <div>
              <small>Retention</small>
              <strong>{document.retention}</strong>
            </div>
          </div>
          <h3 className="subheading">
            <History size={17} /> Approval route
          </h3>
          <div className="document-timeline">
            <TimelineItem
              icon={<Check />}
              title="Document registered"
              detail={`${document.owner} · Revision ${document.revision}`}
              complete
            />
            <TimelineItem
              icon={<Check />}
              title="Department quality review"
              detail={document.reviewer}
              complete={document.workflowStep > 2}
              active={document.workflowStep === 2}
            />
            <TimelineItem
              icon={<ShieldCheck />}
              title="Final approval"
              detail={document.approver}
              complete={document.workflowStep > 3}
              active={document.workflowStep === 3}
            />
            <TimelineItem
              icon={<Archive />}
              title="Issue and controlled publication"
              detail="Records Governance Office"
              complete={document.workflowStep === 4}
            />
          </div>
        </div>
        <footer className="modal-footer">
          <span>Last updated {formatDateTime(document.updatedAt)}</span>
          <div>
            <button className="secondary-button">
              <Download size={16} /> Download
            </button>
            <button className="gold-button" onClick={onClose}>
              Done
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

function TimelineItem({
  icon,
  title,
  detail,
  complete,
  active,
}: {
  icon: React.ReactNode
  title: string
  detail: string
  complete?: boolean
  active?: boolean
}) {
  return (
    <div className={complete ? 'timeline-step complete' : active ? 'timeline-step active' : 'timeline-step'}>
      <span>{complete ? icon : active ? <Clock3 size={16} /> : icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  )
}

function statusClass(status: string) {
  return status.toLowerCase().replaceAll(' ', '-')
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T00:00:00`),
  )
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-AE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

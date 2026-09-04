import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, FileCheck2, FolderPlus, Info, ShieldCheck, X } from 'lucide-react'
import { departments, documentTypes, libraries } from '../../data/mockData'
import type { Classification, RegistrationInput, UserProfile } from '../../types'
import { useDialogFocus } from '../../hooks/useDialogFocus'

type Props = {
  user: UserProfile
  onClose: () => void
  onSave: (input: RegistrationInput, submit: boolean) => void
}

const steps = ['Document metadata', 'Classification & control', 'Approval workflow', 'Review & submit']

export function RegisterDocumentModal({ user, onClose, onSave }: Props) {
  const dialogRef = useDialogFocus(onClose)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [form, setForm] = useState<RegistrationInput>({
    title: '',
    type: '',
    library: '',
    department: '',
    language: 'Arabic / English',
    sourcePath: '',
    owner: user.name,
    classification: 'Internal',
    retention: '7 years',
    nextReview: '2027-09-03',
    summary: '',
    reviewer: 'Department Quality Lead',
    approver: 'Department Director',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const numberPreview = generateNumber(form)
  const set = <K extends keyof RegistrationInput>(key: K, value: RegistrationInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const validateStep = () => {
    if (
      step === 0 &&
      (!selectedFile || !form.title.trim() || !form.type || !form.library || !form.department)
    )
      return 'Complete all required metadata fields.'
    if (step === 1 && (!form.classification || !form.retention || !form.nextReview))
      return 'Complete the classification and control fields.'
    if (step === 2 && (!form.reviewer.trim() || !form.approver.trim()))
      return 'Specify both the reviewer and final approver.'
    return ''
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, '')
    setSelectedFile(file)
    setForm((current) => ({
      ...current,
      title: current.title || fileNameWithoutExtension,
      sourcePath: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    }))
    setError('')
  }

  const next = () => {
    const message = validateStep()
    if (message) return setError(message)
    setError('')
    setStep((current) => Math.min(3, current + 1))
  }

  const submit = (event: FormEvent, submitForReview: boolean) => {
    event.preventDefault()
    const message = validateStep()
    if (message) return setError(message)
    onSave(form, submitForReview)
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="register-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
        aria-describedby="register-guidance"
      >
        <header className="modal-header">
          <div>
            <p className="kicker">DOCUMENT CENTER</p>
            <h2 id="register-title">
              <FolderPlus size={21} /> Register controlled document
            </h2>
            <span className="number-preview">{numberPreview} · REV 0</span>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close registration">
            <X size={20} />
          </button>
        </header>

        <ol className="stepper" aria-label="Registration progress">
          {steps.map((label, index) => (
            <li
              className={index === step ? 'active' : index < step ? 'complete' : ''}
              key={label}
              aria-current={index === step ? 'step' : undefined}
            >
              <span>{index < step ? <Check size={15} /> : index + 1}</span>
              <small>{label}</small>
            </li>
          ))}
        </ol>

        <form onSubmit={(event) => submit(event, true)}>
          <div className="modal-body">
            <div className="form-guidance">
              <Info size={17} />
              <span id="register-guidance">{stepGuidance[step]}</span>
            </div>

            {step === 0 && (
              <div className="form-grid">
                <Field label="Document title" required full>
                  <input
                    autoFocus
                    value={form.title}
                    onChange={(event) => set('title', event.target.value)}
                    placeholder="e.g. Evidence Handling Procedure"
                  />
                </Field>
                <Field label="Upload document" required full>
                  <input
                    type="file"
                    accept=".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    onChange={handleFileChange}
                  />
                  {selectedFile && (
                    <small className="field-hint">
                      {selectedFile.name} · {formatFileSize(selectedFile.size)} ·{' '}
                      {selectedFile.type || 'Unknown MIME type'}
                    </small>
                  )}
                </Field>
                <Field label="Document type" required>
                  <select value={form.type} onChange={(event) => set('type', event.target.value)}>
                    <option value="">Select…</option>
                    {documentTypes.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Library" required>
                  <select value={form.library} onChange={(event) => set('library', event.target.value)}>
                    <option value="">Select…</option>
                    {libraries.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Owning department" required>
                  <select value={form.department} onChange={(event) => set('department', event.target.value)}>
                    <option value="">Select…</option>
                    {departments.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Language">
                  <select value={form.language} onChange={(event) => set('language', event.target.value)}>
                    <option>Arabic / English</option>
                    <option>Arabic</option>
                    <option>English</option>
                  </select>
                </Field>
                <Field label="Document file name" full>
                  <input value={form.sourcePath || 'Select a document to populate metadata'} readOnly />
                </Field>
                <Field label="Purpose and scope" full>
                  <textarea
                    value={form.summary}
                    onChange={(event) => set('summary', event.target.value)}
                    placeholder="Describe what this controlled document governs."
                  />
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="form-grid">
                <Field label="Security classification" required full>
                  <div className="choice-grid">
                    {(['Public', 'Internal', 'Confidential', 'Restricted'] as Classification[]).map(
                      (value) => (
                        <button
                          type="button"
                          className={form.classification === value ? 'choice-card selected' : 'choice-card'}
                          onClick={() => set('classification', value)}
                          key={value}
                        >
                          <ShieldCheck size={18} />
                          <span>
                            <strong>{value}</strong>
                            <small>{classificationHelp[value]}</small>
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                </Field>
                <Field label="Retention period" required>
                  <select value={form.retention} onChange={(event) => set('retention', event.target.value)}>
                    <option>2 years</option>
                    <option>5 years</option>
                    <option>7 years</option>
                    <option>10 years</option>
                    <option>Permanent</option>
                  </select>
                </Field>
                <Field label="Next review date" required>
                  <input
                    type="date"
                    value={form.nextReview}
                    onChange={(event) => set('nextReview', event.target.value)}
                  />
                </Field>
                <Field label="Record owner">
                  <input value={form.owner} onChange={(event) => set('owner', event.target.value)} />
                </Field>
                <Field label="Document number">
                  <input value={numberPreview} disabled />
                </Field>
                <div className="control-checklist form-full">
                  <label>
                    <input type="checkbox" defaultChecked /> Apply version control and immutable issue history
                  </label>
                  <label>
                    <input type="checkbox" defaultChecked /> Require access logging and download audit
                  </label>
                  <label>
                    <input type="checkbox" defaultChecked={form.classification === 'Restricted'} /> Prevent
                    external sharing
                  </label>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="workflow-builder">
                <div className="approval-route">
                  <RouteStep number="1" title="Document owner" person={form.owner} state="complete" />
                  <RouteStep number="2" title="Department review" person={form.reviewer} state="active" />
                  <RouteStep number="3" title="Final approval" person={form.approver} state="pending" />
                  <RouteStep
                    number="4"
                    title="Records issue"
                    person="Records Governance Office"
                    state="pending"
                  />
                </div>
                <div className="form-grid">
                  <Field label="Department reviewer" required>
                    <input value={form.reviewer} onChange={(event) => set('reviewer', event.target.value)} />
                  </Field>
                  <Field label="Final approver" required>
                    <input value={form.approver} onChange={(event) => set('approver', event.target.value)} />
                  </Field>
                  <div className="control-checklist form-full">
                    <label>
                      <input type="checkbox" defaultChecked /> Remind assignee 2 days before due date
                    </label>
                    <label>
                      <input type="checkbox" defaultChecked /> Escalate overdue tasks to the sector quality
                      lead
                    </label>
                    <label>
                      <input type="checkbox" defaultChecked /> Require approval comment for restricted
                      documents
                    </label>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="review-summary">
                <div className="review-document">
                  <FileCheck2 size={30} />
                  <div>
                    <p className="kicker">READY TO REGISTER</p>
                    <h3>{form.title}</h3>
                    <span>
                      {numberPreview} · {form.type} · Rev 0
                    </span>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>Department</dt>
                    <dd>{form.department}</dd>
                  </div>
                  <div>
                    <dt>Library</dt>
                    <dd>{form.library}</dd>
                  </div>
                  <div>
                    <dt>Classification</dt>
                    <dd>
                      <span className={`classification ${form.classification.toLowerCase()}`}>
                        {form.classification}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Retention</dt>
                    <dd>{form.retention}</dd>
                  </div>
                  <div>
                    <dt>Reviewer</dt>
                    <dd>{form.reviewer}</dd>
                  </div>
                  <div>
                    <dt>Approver</dt>
                    <dd>{form.approver}</dd>
                  </div>
                  <div>
                    <dt>Next review</dt>
                    <dd>{formatDate(form.nextReview)}</dd>
                  </div>
                  <div>
                    <dt>Language</dt>
                    <dd>{form.language}</dd>
                  </div>
                  <div>
                    <dt>File size</dt>
                    <dd>{form.sizeBytes ? formatFileSize(form.sizeBytes) : 'Not selected'}</dd>
                  </div>
                  <div>
                    <dt>File type</dt>
                    <dd>{form.mimeType || 'Not selected'}</dd>
                  </div>
                </dl>
                <div className="confirmation-note">
                  <Check size={18} />
                  <span>
                    Submitting creates an auditable workflow and assigns the first review task. Saving a draft
                    keeps the record private to its owner.
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="form-message" role="alert">
                {error}
              </p>
            )}
          </div>

          <footer className="modal-footer">
            <span>Step {step + 1} of 4</span>
            <div>
              {step > 0 && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setError('')
                    setStep((current) => current - 1)
                  }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}
              {step === 3 && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={(event) => submit(event as unknown as FormEvent, false)}
                >
                  Save draft
                </button>
              )}
              {step < 3 ? (
                <button type="button" className="gold-button" onClick={next}>
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button className="gold-button" type="submit">
                  Submit for review <ArrowRight size={16} />
                </button>
              )}
            </div>
          </footer>
        </form>
      </section>
    </div>
  )
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string
  required?: boolean
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={full ? 'form-field form-full' : 'form-field'}>
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {children}
    </label>
  )
}

function RouteStep({
  number,
  title,
  person,
  state,
}: {
  number: string
  title: string
  person: string
  state: string
}) {
  return (
    <div className={`route-step ${state}`}>
      <span>{state === 'complete' ? <Check size={16} /> : number}</span>
      <div>
        <strong>{title}</strong>
        <small>{person}</small>
      </div>
    </div>
  )
}

const stepGuidance = [
  'Identify the document. Its controlled number is generated from the owning department and document type.',
  'Apply the information classification, retention rule and review controls required by organizational governance.',
  'Confirm the accountable reviewer and approver. Docaya will track due dates, reminders and escalation.',
  'Review the controlled record before saving it as a draft or submitting the approval workflow.',
]

const classificationHelp: Record<Classification, string> = {
  Public: 'Approved for public release',
  Internal: 'Organization staff only',
  Confidential: 'Need-to-know access',
  Restricted: 'Highest operational control',
}

function generateNumber(form: Pick<RegistrationInput, 'department' | 'type'>) {
  const department = form.department
    ? form.department
        .split(/\s|&/)
        .filter(Boolean)
        .slice(0, 3)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'DOC'
  const type = form.type
    ? form.type
        .split(' ')
        .map((part) => part.slice(0, 2))
        .join('')
        .slice(0, 3)
        .toUpperCase()
    : 'GEN'
  return `${department}-${type}-2026-${String(Math.floor(40 + form.department.length + form.type.length)).padStart(3, '0')}`
}

function formatDate(value: string) {
  return value
    ? new Intl.DateTimeFormat('en-AE', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(`${value}T00:00:00`),
      )
    : 'Not set'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}

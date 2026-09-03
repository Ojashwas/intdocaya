import type { ActivityItem, ControlledDocument, WorkflowTask } from '../types'

export const departments = [
  'Policy & Strategy',
  'Civil Defence',
  'Forensic Sciences',
  'Legal & Compliance',
  'Traffic & Patrols',
  'Naturalisation & Residency',
  'Human Resources',
]

export const documentTypes = ['Policy', 'Procedure', 'Standard', 'Manual', 'Work Instruction', 'Form', 'Record']

export const libraries = [
  'Corporate Governance',
  'Operational Procedures',
  'Security & Compliance',
  'Emergency Management',
  'People & Capability',
]

export const initialDocuments: ControlledDocument[] = [
  {
    id: 'doc-1', number: 'COR-QMS-PRO-00014', title: 'Document Control Procedure', type: 'Procedure',
    library: 'Corporate Governance', department: 'Policy & Strategy', language: 'English / Arabic',
    sourcePath: 'SharePoint / QMS / Procedures', owner: 'QMS Office', classification: 'Internal',
    retention: '7 years', revision: 4, status: 'Published', nextReview: '2027-01-10',
    updatedAt: '2026-09-03T13:10:00Z', summary: 'Controls the creation, review, approval, issue and retirement of organizational documents.',
    workflowStep: 4, reviewer: 'Department Quality Lead', approver: 'Director, Policy & Strategy',
  },
  {
    id: 'doc-2', number: 'CIV-EMR-PRO-00004', title: 'Emergency Response Protocol', type: 'Procedure',
    library: 'Emergency Management', department: 'Civil Defence', language: 'Arabic / English',
    sourcePath: 'SharePoint / Civil Defence / Response', owner: 'Civil Defence', classification: 'Restricted',
    retention: 'Permanent', revision: 4, status: 'Published', nextReview: '2026-12-01',
    updatedAt: '2026-09-02T09:30:00Z', summary: 'Defines coordinated response actions for priority national emergency scenarios.',
    workflowStep: 4, reviewer: 'Emergency Planning Committee', approver: 'Commander, Civil Defence',
  },
  {
    id: 'doc-3', number: 'FOR-EVD-STD-00009', title: 'Evidence Handling Standard', type: 'Standard',
    library: 'Security & Compliance', department: 'Forensic Sciences', language: 'English',
    sourcePath: 'SharePoint / Forensics / Standards', owner: 'Forensic Sciences', classification: 'Restricted',
    retention: 'Permanent', revision: 3, status: 'Under Review', nextReview: '2026-09-05',
    updatedAt: '2026-09-03T11:15:00Z', summary: 'Sets chain-of-custody and evidence preservation controls for forensic operations.',
    workflowStep: 2, reviewer: 'Forensic Quality Committee', approver: 'Director, Forensic Sciences',
  },
  {
    id: 'doc-4', number: 'LEG-DPP-POL-00002', title: 'Data Protection Policy', type: 'Policy',
    library: 'Security & Compliance', department: 'Legal & Compliance', language: 'Arabic / English',
    sourcePath: 'SharePoint / Legal / Policies', owner: 'Legal & Compliance', classification: 'Confidential',
    retention: 'Permanent', revision: 2, status: 'Draft', nextReview: '2026-10-15',
    updatedAt: '2026-09-01T14:20:00Z', summary: 'Organization-wide policy for the lawful and secure handling of personal information.',
    workflowStep: 1, reviewer: 'Data Protection Office', approver: 'General Counsel',
  },
  {
    id: 'doc-5', number: 'TRF-SLA-WI-00021', title: 'Traffic Incident SLA Guide', type: 'Work Instruction',
    library: 'Operational Procedures', department: 'Traffic & Patrols', language: 'Arabic / English',
    sourcePath: 'SharePoint / Traffic / Work Instructions', owner: 'Traffic & Patrols', classification: 'Internal',
    retention: '5 years', revision: 1, status: 'Under Approval', nextReview: '2026-11-20',
    updatedAt: '2026-09-03T08:45:00Z', summary: 'Service-level targets and escalation path for traffic incident response.',
    workflowStep: 3, reviewer: 'Traffic Quality Lead', approver: 'Director, Traffic & Patrols',
  },
  {
    id: 'doc-6', number: 'NAT-RET-STD-00007', title: 'Records Retention Schedule', type: 'Standard',
    library: 'Corporate Governance', department: 'Naturalisation & Residency', language: 'Arabic / English',
    sourcePath: 'SharePoint / Records / Schedules', owner: 'Records Office', classification: 'Internal',
    retention: 'Permanent', revision: 2, status: 'Published', nextReview: '2026-09-30',
    updatedAt: '2026-08-29T10:00:00Z', summary: 'Approved retention and disposition schedule for organizational business records.',
    workflowStep: 4, reviewer: 'Records Governance Committee', approver: 'Chief Information Officer',
  },
  {
    id: 'doc-7', number: 'HRD-COMP-MAN-00003', title: 'Competency Framework Manual', type: 'Manual',
    library: 'People & Capability', department: 'Human Resources', language: 'English / Arabic',
    sourcePath: 'SharePoint / HR / Manuals', owner: 'Human Resources', classification: 'Internal',
    retention: '5 years', revision: 3, status: 'Superseded', nextReview: '2026-08-01',
    updatedAt: '2026-08-01T08:00:00Z', summary: 'Previous version of the organizational competency and career progression framework.',
    workflowStep: 4, reviewer: 'HR Quality Lead', approver: 'Director, Human Resources',
  },
]

export const initialTasks: WorkflowTask[] = [
  {
    id: 'task-1', documentId: 'doc-3', documentNumber: 'FOR-EVD-STD-00009',
    documentTitle: 'Evidence Handling Standard', stage: 'Department Review',
    assignee: 'Khalid Al Mansoori', requestedBy: 'Aisha Al Nuaimi', dueDate: '2026-09-05',
    priority: 'Critical', status: 'Pending',
  },
  {
    id: 'task-2', documentId: 'doc-5', documentNumber: 'TRF-SLA-WI-00021',
    documentTitle: 'Traffic Incident SLA Guide', stage: 'Final Approval',
    assignee: 'Khalid Al Mansoori', requestedBy: 'Traffic Quality Office', dueDate: '2026-09-07',
    priority: 'High', status: 'Pending',
  },
  {
    id: 'task-3', documentId: 'doc-6', documentNumber: 'NAT-RET-STD-00007',
    documentTitle: 'Records Retention Schedule', stage: 'Periodic Review',
    assignee: 'Khalid Al Mansoori', requestedBy: 'Records Office', dueDate: '2026-09-30',
    priority: 'Normal', status: 'Pending',
  },
]

export const initialActivity: ActivityItem[] = [
  { id: 'a-1', title: 'FOR-EVD-STD-00009 submitted for review', detail: 'Forensic Sciences', time: '12 min ago', tone: 'gold' },
  { id: 'a-2', title: 'CIV-EMR-PRO-00004 issued as Rev 04', detail: 'Civil Defence', time: '1 hr ago', tone: 'green' },
  { id: 'a-3', title: 'Restricted classification applied', detail: 'Evidence Handling Standard', time: '3 hrs ago', tone: 'red' },
  { id: 'a-4', title: 'Records schedule review assigned', detail: 'Naturalisation & Residency', time: 'Yesterday', tone: 'blue' },
]

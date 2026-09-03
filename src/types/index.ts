export type AppPage = 'home' | 'documents' | 'workflows' | 'notifications' | 'admin'

export type Locale = 'en' | 'ar'

export type UserProfile = {
  name: string
  email: string
  initials: string
  role: string
  department: string
}

export type DocumentStatus =
  | 'Draft'
  | 'Under Review'
  | 'Under Approval'
  | 'Published'
  | 'Superseded'
  | 'Archived'

export type Classification = 'Public' | 'Internal' | 'Confidential' | 'Restricted'

export type ControlledDocument = {
  id: string
  number: string
  title: string
  type: string
  library: string
  department: string
  language: string
  sourcePath: string
  owner: string
  classification: Classification
  retention: string
  revision: number
  status: DocumentStatus
  nextReview: string
  updatedAt: string
  summary: string
  workflowStep: number
  reviewer: string
  approver: string
}

export type WorkflowStatus = 'Pending' | 'Approved' | 'Changes requested' | 'Rejected'

export type WorkflowTask = {
  id: string
  documentId: string
  documentNumber: string
  documentTitle: string
  stage: string
  assignee: string
  requestedBy: string
  dueDate: string
  priority: 'Normal' | 'High' | 'Critical'
  status: WorkflowStatus
}

export type ActivityItem = {
  id: string
  title: string
  detail: string
  time: string
  tone: 'gold' | 'green' | 'red' | 'blue'
}

export type RegistrationInput = Omit<
  ControlledDocument,
  'id' | 'number' | 'revision' | 'status' | 'updatedAt' | 'workflowStep'
> & {
  mimeType?: string
  sizeBytes?: number
}

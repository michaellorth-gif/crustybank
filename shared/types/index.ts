// Shared types between client and server

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
}

export interface Task {
  id: string
  title: string
  description: string | null
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface Goal {
  id: string
  title: string
  description: string | null
  targetDate: string | null
  progress: number
  milestones: Milestone[]
  createdAt: string
  updatedAt: string
}

export interface Milestone {
  id: string
  title: string
  completed: boolean
}

export interface Note {
  id: string
  title: string
  content: string | null
  createdAt: string
  updatedAt: string
}

export interface Event {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  allDay: boolean
  color: string
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  tasksDueToday: number
  activeGoals: number
  eventsThisWeek: number
  recentNotes: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AuthResponse {
  user: User
  token: string
}

// Team collaboration
export interface Team {
  id: string
  name: string
  description: string | null
  ownerId: string
  memberCount?: number
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: 'admin' | 'member'
  joinedAt: string
  user?: User
}

// Document management
export interface Document {
  id: string
  title: string
  content: string | null
  category: string
  tags: string[]
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  teamId: string | null
  createdAt: string
  updatedAt: string
}

export interface DocumentTemplate {
  id: string
  name: string
  content: string
  category: string
  createdAt: string
  updatedAt: string
}

// Workflow automation
export interface WorkflowAction {
  type: string
  config: Record<string, unknown>
}

export interface Workflow {
  id: string
  name: string
  description: string | null
  trigger: 'schedule' | 'manual' | 'event'
  schedule: string | null
  actions: WorkflowAction[]
  enabled: boolean
  lastRun: string | null
  createdAt: string
  updatedAt: string
}

export interface Reminder {
  id: string
  title: string
  message: string | null
  reminderTime: string
  recurring: boolean
  recurrencePattern: 'daily' | 'weekly' | 'monthly' | 'custom' | null
  relatedTaskId: string | null
  relatedEventId: string | null
  completed: boolean
  createdAt: string
  updatedAt: string
}

// Email assistant
export interface Email {
  id: string
  subject: string
  recipient: string
  cc: string | null
  bcc: string | null
  body: string
  status: 'draft' | 'scheduled' | 'sent'
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: string
  createdAt: string
  updatedAt: string
}

// Shared items
export interface SharedItem {
  id: string
  itemType: 'task' | 'event' | 'document' | 'note'
  itemId: string
  sharedById: string
  sharedWithId: string | null
  sharedWithTeamId: string | null
  permissions: 'view' | 'edit' | 'admin'
  createdAt: string
}

// Admin dashboard
export interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalTasks: number
  totalTeams: number
  totalDocuments: number
  totalEmails: number
  recentActivity: ActivityItem[]
}

export interface ActivityItem {
  id: string
  userId: string
  userName: string
  action: string
  itemType: string
  itemTitle: string
  timestamp: string
}

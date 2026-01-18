// Shared types between client and server

export interface User {
  id: string
  email: string
  name: string
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

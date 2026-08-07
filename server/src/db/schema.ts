import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('user').notNull(), // 'admin' | 'user'
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  completed: integer('completed', { mode: 'boolean' }).default(false).notNull(),
  priority: text('priority').default('medium').notNull(),
  dueDate: text('due_date'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  targetDate: text('target_date'),
  progress: integer('progress').default(0).notNull(),
  milestones: text('milestones', { mode: 'json' }).$type<Array<{ id: string; title: string; completed: boolean }>>().default([]),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const events = sqliteTable('events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  allDay: integer('all_day', { mode: 'boolean' }).default(false).notNull(),
  color: text('color').default('#3b82f6').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type Goal = typeof goals.$inferSelect
export type NewGoal = typeof goals.$inferInsert
export type Note = typeof notes.$inferSelect
export type NewNote = typeof notes.$inferInsert
export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert

// Teams for collaboration
export const teams = sqliteTable('teams', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const teamMembers = sqliteTable('team_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  teamId: text('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').default('member').notNull(), // 'admin' | 'member'
  joinedAt: text('joined_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

// Documents management
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  teamId: text('team_id').references(() => teams.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  content: text('content'),
  category: text('category').default('general').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  fileName: text('file_name'),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const documentTemplates = sqliteTable('document_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  category: text('category').default('general').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

// Workflow automation
export const workflows = sqliteTable('workflows', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  trigger: text('trigger').notNull(), // 'schedule' | 'manual' | 'event'
  schedule: text('schedule'), // cron expression for scheduled workflows
  actions: text('actions', { mode: 'json' }).$type<Array<{ type: string; config: Record<string, unknown> }>>().default([]),
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
  lastRun: text('last_run'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  message: text('message'),
  reminderTime: text('reminder_time').notNull(),
  recurring: integer('recurring', { mode: 'boolean' }).default(false).notNull(),
  recurrencePattern: text('recurrence_pattern'), // 'daily' | 'weekly' | 'monthly' | 'custom'
  relatedTaskId: text('related_task_id').references(() => tasks.id, { onDelete: 'set null' }),
  relatedEventId: text('related_event_id').references(() => events.id, { onDelete: 'set null' }),
  completed: integer('completed', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

// Email assistant
export const emails = sqliteTable('emails', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subject: text('subject').notNull(),
  recipient: text('recipient').notNull(),
  cc: text('cc'),
  bcc: text('bcc'),
  body: text('body').notNull(),
  status: text('status').default('draft').notNull(), // 'draft' | 'scheduled' | 'sent'
  scheduledAt: text('scheduled_at'),
  sentAt: text('sent_at'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const emailTemplates = sqliteTable('email_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  category: text('category').default('general').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

// Shared items (tasks, events shared with team members)
export const sharedItems = sqliteTable('shared_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemType: text('item_type').notNull(), // 'task' | 'event' | 'document' | 'note'
  itemId: text('item_id').notNull(),
  sharedById: text('shared_by_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sharedWithId: text('shared_with_id').references(() => users.id, { onDelete: 'cascade' }),
  sharedWithTeamId: text('shared_with_team_id').references(() => teams.id, { onDelete: 'cascade' }),
  permissions: text('permissions').default('view').notNull(), // 'view' | 'edit' | 'admin'
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

// Legal intake forms feeding the automated practice-area workflows
// (.claude/skills/debt-defense, expunction, uncontested-divorce)
export const legalIntakes = sqliteTable('legal_intakes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  matterType: text('matter_type').notNull(), // 'debt-defense' | 'expunction' | 'uncontested-divorce'
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email'),
  clientPhone: text('client_phone'),
  status: text('status').default('new').notNull(), // 'new' | 'in-review' | 'accepted' | 'declined'
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  triage: text('triage', { mode: 'json' }).$type<Record<string, unknown>>(),
  reviewNotes: text('review_notes'),
  relatedTaskId: text('related_task_id').references(() => tasks.id, { onDelete: 'set null' }),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export type LegalIntake = typeof legalIntakes.$inferSelect
export type NewLegalIntake = typeof legalIntakes.$inferInsert

export type Team = typeof teams.$inferSelect
export type NewTeam = typeof teams.$inferInsert
export type TeamMember = typeof teamMembers.$inferSelect
export type NewTeamMember = typeof teamMembers.$inferInsert
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type DocumentTemplate = typeof documentTemplates.$inferSelect
export type NewDocumentTemplate = typeof documentTemplates.$inferInsert
export type Workflow = typeof workflows.$inferSelect
export type NewWorkflow = typeof workflows.$inferInsert
export type Reminder = typeof reminders.$inferSelect
export type NewReminder = typeof reminders.$inferInsert
export type Email = typeof emails.$inferSelect
export type NewEmail = typeof emails.$inferInsert
export type EmailTemplate = typeof emailTemplates.$inferSelect
export type NewEmailTemplate = typeof emailTemplates.$inferInsert
export type SharedItem = typeof sharedItems.$inferSelect
export type NewSharedItem = typeof sharedItems.$inferInsert

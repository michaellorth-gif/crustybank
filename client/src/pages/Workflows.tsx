import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Zap, Play, Pause, Trash2, Edit2, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '../services/api'

interface Workflow {
  id: string
  name: string
  description: string | null
  trigger: 'schedule' | 'manual' | 'event'
  schedule: string | null
  actions: Array<{ type: string; config: Record<string, unknown> }>
  enabled: boolean
  lastRun: string | null
  createdAt: string
}

interface Reminder {
  id: string
  title: string
  message: string | null
  reminderTime: string
  recurring: boolean
  recurrencePattern: 'daily' | 'weekly' | 'monthly' | 'custom' | null
  completed: boolean
  createdAt: string
}

interface PrioritizedTask {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  dueDate: string | null
  priorityScore: number
}

export default function Workflows() {
  const [selectedTab, setSelectedTab] = useState<'workflows' | 'reminders' | 'smart'>('workflows')
  const [showWorkflowForm, setShowWorkflowForm] = useState(false)
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const queryClient = useQueryClient()

  const { data: workflows = [], isLoading: workflowsLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await api.get('/workflows')
      return response.data as Workflow[]
    },
  })

  const { data: reminders = [], isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const response = await api.get('/workflows/reminders')
      return response.data as Reminder[]
    },
  })

  const { data: prioritizedTasks = [] } = useQuery({
    queryKey: ['smart-prioritization'],
    queryFn: async () => {
      const response = await api.get('/workflows/smart-prioritization')
      return response.data as PrioritizedTask[]
    },
  })

  // Workflow mutations
  const createWorkflow = useMutation({
    mutationFn: async (data: Partial<Workflow>) => {
      const response = await api.post('/workflows', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      setShowWorkflowForm(false)
    },
  })

  const updateWorkflow = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Workflow> & { id: string }) => {
      const response = await api.patch(`/workflows/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      setEditingWorkflow(null)
    },
  })

  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workflows/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })

  const runWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/workflows/${id}/run`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    },
  })

  // Reminder mutations
  const createReminder = useMutation({
    mutationFn: async (data: Partial<Reminder>) => {
      const response = await api.post('/workflows/reminders', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      setShowReminderForm(false)
    },
  })

  const updateReminder = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Reminder> & { id: string }) => {
      const response = await api.patch(`/workflows/reminders/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      setEditingReminder(null)
    },
  })

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workflows/reminders/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    },
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation</h1>
          <p className="text-gray-600">Workflows, reminders, and smart task prioritization</p>
        </div>
        <div className="flex gap-2">
          {selectedTab === 'workflows' && (
            <button
              onClick={() => setShowWorkflowForm(true)}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus size={20} />
              New Workflow
            </button>
          )}
          {selectedTab === 'reminders' && (
            <button
              onClick={() => setShowReminderForm(true)}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus size={20} />
              New Reminder
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['workflows', 'reminders', 'smart'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 rounded-lg capitalize ${
              selectedTab === tab
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab === 'smart' ? 'Smart Prioritization' : tab}
          </button>
        ))}
      </div>

      {/* Workflow Form Modal */}
      {(showWorkflowForm || editingWorkflow) && (
        <WorkflowForm
          workflow={editingWorkflow}
          onSubmit={(data) => {
            if (editingWorkflow) {
              updateWorkflow.mutate({ id: editingWorkflow.id, ...data })
            } else {
              createWorkflow.mutate(data)
            }
          }}
          onClose={() => {
            setShowWorkflowForm(false)
            setEditingWorkflow(null)
          }}
          isLoading={createWorkflow.isPending || updateWorkflow.isPending}
        />
      )}

      {/* Reminder Form Modal */}
      {(showReminderForm || editingReminder) && (
        <ReminderForm
          reminder={editingReminder}
          onSubmit={(data) => {
            if (editingReminder) {
              updateReminder.mutate({ id: editingReminder.id, ...data })
            } else {
              createReminder.mutate(data)
            }
          }}
          onClose={() => {
            setShowReminderForm(false)
            setEditingReminder(null)
          }}
          isLoading={createReminder.isPending || updateReminder.isPending}
        />
      )}

      {/* Workflows Tab */}
      {selectedTab === 'workflows' && (
        <>
          {workflowsLoading ? (
            <div className="text-center py-12 text-gray-500">Loading workflows...</div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No workflows yet. Create one to automate your tasks!
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="bg-white rounded-lg shadow-sm p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          workflow.enabled ? 'bg-green-100' : 'bg-gray-100'
                        }`}
                      >
                        <Zap
                          size={20}
                          className={workflow.enabled ? 'text-green-600' : 'text-gray-400'}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{workflow.name}</h3>
                        {workflow.description && (
                          <p className="text-sm text-gray-500">{workflow.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="capitalize">Trigger: {workflow.trigger}</span>
                          {workflow.schedule && <span>Schedule: {workflow.schedule}</span>}
                          {workflow.lastRun && (
                            <span>Last run: {new Date(workflow.lastRun).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {workflow.trigger === 'manual' && (
                        <button
                          onClick={() => runWorkflow.mutate(workflow.id)}
                          disabled={runWorkflow.isPending}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Run workflow"
                        >
                          <Play size={18} />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          updateWorkflow.mutate({ id: workflow.id, enabled: !workflow.enabled })
                        }
                        className={`p-2 rounded-lg transition-colors ${
                          workflow.enabled
                            ? 'text-yellow-600 hover:bg-yellow-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={workflow.enabled ? 'Disable' : 'Enable'}
                      >
                        {workflow.enabled ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <button
                        onClick={() => setEditingWorkflow(workflow)}
                        className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this workflow?')) {
                            deleteWorkflow.mutate(workflow.id)
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Reminders Tab */}
      {selectedTab === 'reminders' && (
        <>
          {remindersLoading ? (
            <div className="text-center py-12 text-gray-500">Loading reminders...</div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No reminders yet. Create one to stay on track!
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`bg-white rounded-lg shadow-sm p-4 flex items-center gap-4 ${
                    reminder.completed ? 'opacity-60' : ''
                  }`}
                >
                  <button
                    onClick={() =>
                      updateReminder.mutate({ id: reminder.id, completed: !reminder.completed })
                    }
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      reminder.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {reminder.completed && <CheckCircle size={14} />}
                  </button>
                  <div className="flex-1">
                    <h3
                      className={`font-medium ${
                        reminder.completed ? 'line-through text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      {reminder.title}
                    </h3>
                    {reminder.message && (
                      <p className="text-sm text-gray-500">{reminder.message}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(reminder.reminderTime).toLocaleString()}
                      </span>
                      {reminder.recurring && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded capitalize">
                          {reminder.recurrencePattern}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingReminder(reminder)}
                      className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteReminder.mutate(reminder.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Smart Prioritization Tab */}
      {selectedTab === 'smart' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <AlertCircle size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Smart Task Prioritization</h2>
              <p className="text-sm text-gray-500">
                Tasks ranked by urgency based on priority and due date
              </p>
            </div>
          </div>

          {prioritizedTasks.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No active tasks to prioritize.</p>
          ) : (
            <div className="space-y-3">
              {prioritizedTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0
                        ? 'bg-red-500'
                        : index < 3
                        ? 'bg-orange-500'
                        : 'bg-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          task.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="text-gray-500">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{task.priorityScore}</div>
                    <div className="text-xs text-gray-500">score</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function WorkflowForm({
  workflow,
  onSubmit,
  onClose,
  isLoading,
}: {
  workflow: Workflow | null
  onSubmit: (data: Partial<Workflow>) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [name, setName] = useState(workflow?.name || '')
  const [description, setDescription] = useState(workflow?.description || '')
  const [trigger, setTrigger] = useState<'schedule' | 'manual' | 'event'>(workflow?.trigger || 'manual')
  const [schedule, setSchedule] = useState(workflow?.schedule || '')
  const [actionType, setActionType] = useState('create_task')
  const [actionTitle, setActionTitle] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const actions = actionTitle
      ? [{ type: actionType, config: { title: actionTitle } }]
      : workflow?.actions || []
    onSubmit({
      name,
      description: description || undefined,
      trigger,
      schedule: trigger === 'schedule' ? schedule : undefined,
      actions,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {workflow ? 'Edit Workflow' : 'New Workflow'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Workflow name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="What does this workflow do?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as 'schedule' | 'manual' | 'event')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="manual">Manual</option>
              <option value="schedule">Schedule</option>
              <option value="event">Event-based</option>
            </select>
          </div>

          {trigger === 'schedule' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule (cron expression)
              </label>
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0 9 * * *"
              />
              <p className="text-xs text-gray-500 mt-1">Example: 0 9 * * * (every day at 9 AM)</p>
            </div>
          )}

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Action</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="create_task">Create Task</option>
                <option value="create_reminder">Create Reminder</option>
                <option value="create_event">Create Event</option>
              </select>
              <input
                type="text"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Title"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : workflow ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ReminderForm({
  reminder,
  onSubmit,
  onClose,
  isLoading,
}: {
  reminder: Reminder | null
  onSubmit: (data: Partial<Reminder>) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [title, setTitle] = useState(reminder?.title || '')
  const [message, setMessage] = useState(reminder?.message || '')
  const [reminderTime, setReminderTime] = useState(
    reminder?.reminderTime ? new Date(reminder.reminderTime).toISOString().slice(0, 16) : ''
  )
  const [recurring, setRecurring] = useState(reminder?.recurring || false)
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly'>(
    (reminder?.recurrencePattern as 'daily' | 'weekly' | 'monthly') || 'daily'
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title,
      message: message || undefined,
      reminderTime: new Date(reminderTime).toISOString(),
      recurring,
      recurrencePattern: recurring ? recurrencePattern : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {reminder ? 'Edit Reminder' : 'New Reminder'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="What to remember?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Additional details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Time</label>
            <input
              type="datetime-local"
              required
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recurring"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
              Recurring reminder
            </label>
          </div>

          {recurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
              <select
                value={recurrencePattern}
                onChange={(e) => setRecurrencePattern(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : reminder ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

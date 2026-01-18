import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Target, Trash2, Edit2 } from 'lucide-react'
import { api } from '../services/api'

interface Goal {
  id: string
  title: string
  description: string
  targetDate: string | null
  progress: number
  milestones: Milestone[]
  createdAt: string
}

interface Milestone {
  id: string
  title: string
  completed: boolean
}

export default function Goals() {
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const queryClient = useQueryClient()

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await api.get('/goals')
      return response.data as Goal[]
    },
  })

  const createGoal = useMutation({
    mutationFn: async (data: Partial<Goal>) => {
      const response = await api.post('/goals', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      setShowForm(false)
    },
  })

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Goal> & { id: string }) => {
      const response = await api.patch(`/goals/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      setEditingGoal(null)
    },
  })

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/goals/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })

  const toggleMilestone = useMutation({
    mutationFn: async ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) => {
      const response = await api.patch(`/goals/${goalId}/milestones/${milestoneId}/toggle`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-600">Track your personal goals and milestones</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          Add Goal
        </button>
      </div>

      {/* Goal Form Modal */}
      {(showForm || editingGoal) && (
        <GoalForm
          goal={editingGoal}
          onSubmit={(data) => {
            if (editingGoal) {
              updateGoal.mutate({ id: editingGoal.id, ...data })
            } else {
              createGoal.mutate(data)
            }
          }}
          onClose={() => {
            setShowForm(false)
            setEditingGoal(null)
          }}
          isLoading={createGoal.isPending || updateGoal.isPending}
        />
      )}

      {/* Goals Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12">
          <Target size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No goals yet. Set your first goal!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Target size={20} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                    {goal.targetDate && (
                      <p className="text-xs text-gray-500">
                        Target: {new Date(goal.targetDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingGoal(goal)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteGoal.mutate(goal.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {goal.description && (
                <p className="text-sm text-gray-600 mb-4">{goal.description}</p>
              )}

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium text-gray-900">{goal.progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>

              {/* Milestones */}
              {goal.milestones && goal.milestones.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Milestones</p>
                  <ul className="space-y-2">
                    {goal.milestones.map((milestone) => (
                      <li
                        key={milestone.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <button
                          onClick={() =>
                            toggleMilestone.mutate({
                              goalId: goal.id,
                              milestoneId: milestone.id,
                            })
                          }
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            milestone.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {milestone.completed && '✓'}
                        </button>
                        <span
                          className={
                            milestone.completed
                              ? 'line-through text-gray-400'
                              : 'text-gray-600'
                          }
                        >
                          {milestone.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GoalForm({
  goal,
  onSubmit,
  onClose,
  isLoading,
}: {
  goal: Goal | null
  onSubmit: (data: Partial<Goal>) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [title, setTitle] = useState(goal?.title || '')
  const [description, setDescription] = useState(goal?.description || '')
  const [targetDate, setTargetDate] = useState(goal?.targetDate?.split('T')[0] || '')
  const [milestones, setMilestones] = useState<string[]>(
    goal?.milestones?.map((m) => m.title) || ['']
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title,
      description,
      targetDate: targetDate || null,
      milestones: milestones
        .filter((m) => m.trim())
        .map((title, idx) => ({
          id: goal?.milestones?.[idx]?.id || `temp-${idx}`,
          title,
          completed: goal?.milestones?.[idx]?.completed || false,
        })),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {goal ? 'Edit Goal' : 'New Goal'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="What do you want to achieve?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Describe your goal..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Milestones
            </label>
            {milestones.map((milestone, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={milestone}
                  onChange={(e) => {
                    const newMilestones = [...milestones]
                    newMilestones[idx] = e.target.value
                    setMilestones(newMilestones)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={`Milestone ${idx + 1}`}
                />
                {milestones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setMilestones(milestones.filter((_, i) => i !== idx))}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMilestones([...milestones, ''])}
              className="text-sm text-primary-600 hover:underline"
            >
              + Add milestone
            </button>
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
              {isLoading ? 'Saving...' : goal ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

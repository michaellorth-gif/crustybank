import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, Trash2, Edit2, UserPlus, Crown, X } from 'lucide-react'
import { api } from '../services/api'
import { useAuthStore } from '../hooks/useAuthStore'

interface Team {
  id: string
  name: string
  description: string | null
  ownerId: string
  memberCount: number
  createdAt: string
}

interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: 'admin' | 'member'
  joinedAt: string
  user?: {
    id: string
    email: string
    name: string
  }
}

export default function Teams() {
  const [showForm, setShowForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await api.get('/teams')
      return response.data as Team[]
    },
  })

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', selectedTeam?.id],
    queryFn: async () => {
      if (!selectedTeam) return null
      const response = await api.get(`/teams/${selectedTeam.id}/members`)
      return response.data as { owner: TeamMember['user'] & { role: string }; members: TeamMember[] }
    },
    enabled: !!selectedTeam,
  })

  const createTeam = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await api.post('/teams', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setShowForm(false)
    },
  })

  const updateTeam = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string }) => {
      const response = await api.patch(`/teams/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setEditingTeam(null)
    },
  })

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/teams/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setSelectedTeam(null)
    },
  })

  const addMember = useMutation({
    mutationFn: async ({ teamId, email, role }: { teamId: string; email: string; role: 'admin' | 'member' }) => {
      const response = await api.post(`/teams/${teamId}/members`, { email, role })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', selectedTeam?.id] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setShowAddMember(false)
    },
  })

  const removeMember = useMutation({
    mutationFn: async ({ teamId, memberId }: { teamId: string; memberId: string }) => {
      await api.delete(`/teams/${teamId}/members/${memberId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', selectedTeam?.id] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-600">Collaborate with your team members</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          Create Team
        </button>
      </div>

      {/* Team Form Modal */}
      {(showForm || editingTeam) && (
        <TeamForm
          team={editingTeam}
          onSubmit={(data) => {
            if (editingTeam) {
              updateTeam.mutate({ id: editingTeam.id, ...data })
            } else {
              createTeam.mutate(data)
            }
          }}
          onClose={() => {
            setShowForm(false)
            setEditingTeam(null)
          }}
          isLoading={createTeam.isPending || updateTeam.isPending}
        />
      )}

      {/* Add Member Modal */}
      {showAddMember && selectedTeam && (
        <AddMemberForm
          onSubmit={(data) => addMember.mutate({ teamId: selectedTeam.id, ...data })}
          onClose={() => setShowAddMember(false)}
          isLoading={addMember.isPending}
          error={addMember.error?.message}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-1">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading teams...</div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No teams yet. Create your first team!
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`bg-white rounded-lg p-4 shadow-sm cursor-pointer transition-all ${
                    selectedTeam?.id === team.id ? 'ring-2 ring-primary-500' : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                        <Users size={20} className="text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{team.name}</h3>
                        <p className="text-sm text-gray-500">
                          {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    {team.ownerId === currentUser?.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingTeam(team)
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Are you sure you want to delete this team?')) {
                              deleteTeam.mutate(team.id)
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  {team.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{team.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team Details */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedTeam.name}</h2>
                  {selectedTeam.description && (
                    <p className="text-gray-500 mt-1">{selectedTeam.description}</p>
                  )}
                </div>
                {selectedTeam.ownerId === currentUser?.id && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <UserPlus size={18} />
                    Add Member
                  </button>
                )}
              </div>

              <h3 className="font-medium text-gray-900 mb-4">Team Members</h3>
              <div className="space-y-3">
                {/* Owner */}
                {teamMembers?.owner && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {teamMembers.owner.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{teamMembers.owner.name}</p>
                        <p className="text-sm text-gray-500">{teamMembers.owner.email}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      <Crown size={12} />
                      Owner
                    </span>
                  </div>
                )}

                {/* Members */}
                {teamMembers?.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {member.user?.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.user?.name}</p>
                        <p className="text-sm text-gray-500">{member.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          member.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {member.role}
                      </span>
                      {selectedTeam.ownerId === currentUser?.id && (
                        <button
                          onClick={() => removeMember.mutate({ teamId: selectedTeam.id, memberId: member.id })}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
              Select a team to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamForm({
  team,
  onSubmit,
  onClose,
  isLoading,
}: {
  team: Team | null
  onSubmit: (data: { name: string; description?: string }) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [name, setName] = useState(team?.name || '')
  const [description, setDescription] = useState(team?.description || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, description: description || undefined })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">{team ? 'Edit Team' : 'Create Team'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter team name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="What is this team about?"
            />
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
              {isLoading ? 'Saving...' : team ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddMemberForm({
  onSubmit,
  onClose,
  isLoading,
  error,
}: {
  onSubmit: (data: { email: string; role: 'admin' | 'member' }) => void
  onClose: () => void
  isLoading: boolean
  error?: string
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ email, role })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Add Team Member</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter member's email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
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
              {isLoading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

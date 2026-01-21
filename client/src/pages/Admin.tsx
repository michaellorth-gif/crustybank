import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, FileText, Mail, Users2, CheckSquare, Shield, ShieldOff, Trash2, Activity } from 'lucide-react'
import { api } from '../services/api'
import { useAuthStore } from '../hooks/useAuthStore'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalTasks: number
  totalTeams: number
  totalDocuments: number
  totalEmails: number
  recentActivity: Array<{
    id: string
    userId: string
    userName: string
    action: string
    itemType: string
    itemTitle: string
    timestamp: string
  }>
}

interface UserWithStats {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  createdAt: string
  stats: {
    tasks: number
    goals: number
    notes: number
    events: number
  }
}

export default function Admin() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'users'>('overview')
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/stats')
      return response.data as AdminStats
    },
  })

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await api.get('/admin/users')
      return response.data as UserWithStats[]
    },
  })

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => {
      const response = await api.patch(`/admin/users/${userId}/role`, { role })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/admin/users/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">You need administrator privileges to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Manage users and view system statistics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedTab('overview')}
          className={`px-4 py-2 rounded-lg ${
            selectedTab === 'overview'
              ? 'bg-primary-100 text-primary-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setSelectedTab('users')}
          className={`px-4 py-2 rounded-lg ${
            selectedTab === 'users'
              ? 'bg-primary-100 text-primary-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Users
        </button>
      </div>

      {selectedTab === 'overview' && (
        <>
          {/* Stats Grid */}
          {statsLoading ? (
            <div className="text-center py-12 text-gray-500">Loading statistics...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <StatCard icon={Users} label="Total Users" value={stats?.totalUsers || 0} color="blue" />
                <StatCard icon={CheckSquare} label="Total Tasks" value={stats?.totalTasks || 0} color="green" />
                <StatCard icon={Users2} label="Teams" value={stats?.totalTeams || 0} color="purple" />
                <StatCard icon={FileText} label="Documents" value={stats?.totalDocuments || 0} color="orange" />
                <StatCard icon={Mail} label="Emails" value={stats?.totalEmails || 0} color="pink" />
                <StatCard icon={Activity} label="Active Users" value={stats?.activeUsers || 0} color="cyan" />
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <Users size={16} className="text-primary-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">{activity.userName}</span>
                            {' '}{activity.action}{' '}
                            <span className="text-gray-500">{activity.itemTitle}</span>
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {selectedTab === 'users' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {usersLoading ? (
            <div className="text-center py-12 text-gray-500">Loading users...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">User</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Role</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Stats</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Joined</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>{user.stats.tasks} tasks</span>
                        <span>{user.stats.goals} goals</span>
                        <span>{user.stats.notes} notes</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {user.id !== currentUser?.id && (
                          <>
                            <button
                              onClick={() =>
                                updateUserRole.mutate({
                                  userId: user.id,
                                  role: user.role === 'admin' ? 'user' : 'admin',
                                })
                              }
                              className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                              title={user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                            >
                              {user.role === 'admin' ? <ShieldOff size={18} /> : <Shield size={18} />}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this user?')) {
                                  deleteUser.mutate(user.id)
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    pink: 'bg-pink-100 text-pink-600',
    cyan: 'bg-cyan-100 text-cyan-600',
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}

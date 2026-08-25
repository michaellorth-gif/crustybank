import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckSquare, Target, Calendar, FileText, TrendingUp, Clock, Scale } from 'lucide-react'
import { api } from '../services/api'
import { useAuthStore } from '../hooks/useAuthStore'

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats')
      return response.data
    },
  })

  const { data: upcomingEvents } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const response = await api.get('/events/upcoming')
      return response.data
    },
  })

  const { data: recentTasks } = useQuery({
    queryKey: ['recent-tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks?limit=5')
      return response.data
    },
  })

  const { data: legalDeadlines } = useQuery({
    queryKey: ['legal-deadlines'],
    queryFn: async () => {
      const response = await api.get('/intakes/deadlines')
      return response.data as Array<{
        intakeId: string
        clientName: string
        matterType: string
        label: string
        date: string
        daysLeft: number
      }>
    },
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-gray-600">Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={CheckSquare}
          label="Tasks Due Today"
          value={stats?.tasksDueToday || 0}
          color="blue"
          link="/tasks"
        />
        <StatCard
          icon={Target}
          label="Active Goals"
          value={stats?.activeGoals || 0}
          color="green"
          link="/goals"
        />
        <StatCard
          icon={Calendar}
          label="Events This Week"
          value={stats?.eventsThisWeek || 0}
          color="purple"
          link="/calendar"
        />
        <StatCard
          icon={FileText}
          label="Recent Notes"
          value={stats?.recentNotes || 0}
          color="orange"
          link="/notes"
        />
      </div>

      {/* Legal Deadlines */}
      {legalDeadlines && legalDeadlines.length > 0 && (
        <div className="mb-8 bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Scale size={18} className="text-primary-600" /> Legal Deadlines
            </h2>
            <Link to="/intakes" className="text-sm text-primary-600 hover:underline">
              View matters
            </Link>
          </div>
          <ul className="space-y-2">
            {legalDeadlines.slice(0, 6).map((d) => (
              <li key={`${d.intakeId}-${d.label}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    d.daysLeft < 0 ? 'bg-red-600 text-white'
                      : d.daysLeft <= 5 ? 'bg-red-100 text-red-700'
                      : d.daysLeft <= 14 ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {d.daysLeft < 0 ? `${-d.daysLeft}d PAST` : `${d.daysLeft}d`}
                </span>
                <div>
                  <p className="text-gray-800 font-medium text-sm">
                    {d.label} — {d.clientName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {d.date} · {d.matterType.replace(/-/g, ' ')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Tasks */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
            <Link to="/tasks" className="text-sm text-primary-600 hover:underline">
              View all
            </Link>
          </div>
          {recentTasks?.length > 0 ? (
            <ul className="space-y-3">
              {recentTasks.map((task: { id: string; title: string; completed: boolean; priority: string }) => (
                <li key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      task.completed ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span className={task.completed ? 'line-through text-gray-400' : 'text-gray-700'}>
                    {task.title}
                  </span>
                  <span className={`ml-auto text-xs px-2 py-1 rounded ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {task.priority}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CheckSquare} message="No tasks yet. Create your first task!" />
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <Link to="/calendar" className="text-sm text-primary-600 hover:underline">
              View calendar
            </Link>
          </div>
          {upcomingEvents?.length > 0 ? (
            <ul className="space-y-3">
              {upcomingEvents.map((event: { id: string; title: string; startTime: string }) => (
                <li key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock size={18} className="text-primary-500" />
                  <div>
                    <p className="text-gray-700 font-medium">{event.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(event.startTime).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Calendar} message="No upcoming events scheduled." />
          )}
        </div>
      </div>

      {/* Goal Progress */}
      <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Goal Progress</h2>
          <Link to="/goals" className="text-sm text-primary-600 hover:underline">
            Manage goals
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <TrendingUp size={24} className="text-green-500" />
          <p className="text-gray-600">
            Track your personal goals and measure your progress over time.
          </p>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  link,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: 'blue' | 'green' | 'purple' | 'orange'
  link: string
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <Link
      to={link}
      className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <Icon size={24} />
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-gray-500 text-sm">{label}</p>
    </Link>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
      <Icon size={32} className="mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

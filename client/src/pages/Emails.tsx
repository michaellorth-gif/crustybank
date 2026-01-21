import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Mail, Send, Clock, Trash2, Edit2, Sparkles, Copy } from 'lucide-react'
import { api } from '../services/api'

interface Email {
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
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: string
  createdAt: string
}

export default function Emails() {
  const [selectedTab, setSelectedTab] = useState<'drafts' | 'scheduled' | 'sent' | 'templates'>('drafts')
  const [showForm, setShowForm] = useState(false)
  const [editingEmail, setEditingEmail] = useState<Email | null>(null)
  const [showAiAssist, setShowAiAssist] = useState(false)
  const queryClient = useQueryClient()

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['emails', selectedTab],
    queryFn: async () => {
      const status = selectedTab === 'templates' ? 'draft' : selectedTab === 'drafts' ? 'draft' : selectedTab
      const response = await api.get(`/emails?status=${status}`)
      return response.data as Email[]
    },
    enabled: selectedTab !== 'templates',
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const response = await api.get('/emails/templates/list')
      return response.data as EmailTemplate[]
    },
    enabled: selectedTab === 'templates',
  })

  const createEmail = useMutation({
    mutationFn: async (data: Partial<Email>) => {
      const response = await api.post('/emails', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      setShowForm(false)
    },
  })

  const updateEmail = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Email> & { id: string }) => {
      const response = await api.patch(`/emails/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      setEditingEmail(null)
    },
  })

  const deleteEmail = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/emails/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    },
  })

  const generateEmail = useMutation({
    mutationFn: async (data: { prompt: string; tone: string; recipient?: string }) => {
      const response = await api.post('/emails/generate', data)
      return response.data as { subject: string; body: string }
    },
  })

  const createTemplate = useMutation({
    mutationFn: async (data: { name: string; subject: string; body: string; category: string }) => {
      const response = await api.post('/emails/templates', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
    },
  })

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/emails/templates/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
    },
  })

  const filteredEmails = selectedTab === 'templates' ? [] : emails

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Assistant</h1>
          <p className="text-gray-600">Draft, schedule, and manage your emails</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAiAssist(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Sparkles size={20} />
            AI Assist
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            New Email
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['drafts', 'scheduled', 'sent', 'templates'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 rounded-lg capitalize ${
              selectedTab === tab
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Email Form Modal */}
      {(showForm || editingEmail) && (
        <EmailForm
          email={editingEmail}
          templates={templates}
          onSubmit={(data) => {
            if (editingEmail) {
              updateEmail.mutate({ id: editingEmail.id, ...data })
            } else {
              createEmail.mutate(data)
            }
          }}
          onClose={() => {
            setShowForm(false)
            setEditingEmail(null)
          }}
          isLoading={createEmail.isPending || updateEmail.isPending}
        />
      )}

      {/* AI Assist Modal */}
      {showAiAssist && (
        <AiAssistModal
          onGenerate={(data) => generateEmail.mutate(data)}
          onUse={(subject, body) => {
            setShowAiAssist(false)
            setEditingEmail({
              id: '',
              subject,
              recipient: '',
              cc: null,
              bcc: null,
              body,
              status: 'draft',
              scheduledAt: null,
              sentAt: null,
              createdAt: new Date().toISOString(),
            })
          }}
          onClose={() => setShowAiAssist(false)}
          isLoading={generateEmail.isPending}
          generatedEmail={generateEmail.data}
        />
      )}

      {/* Templates Tab */}
      {selectedTab === 'templates' && (
        <TemplatesView
          templates={templates}
          onCreateTemplate={(data) => createTemplate.mutate(data)}
          onDeleteTemplate={(id) => deleteTemplate.mutate(id)}
          onUseTemplate={(template) => {
            setEditingEmail({
              id: '',
              subject: template.subject,
              recipient: '',
              cc: null,
              bcc: null,
              body: template.body,
              status: 'draft',
              scheduledAt: null,
              sentAt: null,
              createdAt: new Date().toISOString(),
            })
          }}
          isLoading={createTemplate.isPending}
        />
      )}

      {/* Emails List */}
      {selectedTab !== 'templates' && (
        <>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading emails...</div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No {selectedTab} emails yet.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmails.map((email) => (
                <div key={email.id} className="bg-white rounded-lg shadow-sm p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          email.status === 'sent'
                            ? 'bg-green-100'
                            : email.status === 'scheduled'
                            ? 'bg-blue-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        {email.status === 'sent' ? (
                          <Send size={20} className="text-green-600" />
                        ) : email.status === 'scheduled' ? (
                          <Clock size={20} className="text-blue-600" />
                        ) : (
                          <Mail size={20} className="text-gray-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{email.subject}</h3>
                        <p className="text-sm text-gray-500">To: {email.recipient}</p>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{email.body}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          {email.scheduledAt && (
                            <span>Scheduled: {new Date(email.scheduledAt).toLocaleString()}</span>
                          )}
                          {email.sentAt && (
                            <span>Sent: {new Date(email.sentAt).toLocaleString()}</span>
                          )}
                          <span>Created: {new Date(email.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {email.status === 'draft' && (
                        <>
                          <button
                            onClick={() =>
                              updateEmail.mutate({ id: email.id, status: 'sent' })
                            }
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Send now"
                          >
                            <Send size={18} />
                          </button>
                          <button
                            onClick={() => setEditingEmail(email)}
                            className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Delete this email?')) {
                            deleteEmail.mutate(email.id)
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
    </div>
  )
}

function EmailForm({
  email,
  templates: _templates,
  onSubmit,
  onClose,
  isLoading,
}: {
  email: Email | null
  templates: EmailTemplate[]
  onSubmit: (data: Partial<Email>) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [subject, setSubject] = useState(email?.subject || '')
  const [recipient, setRecipient] = useState(email?.recipient || '')
  const [cc, setCc] = useState(email?.cc || '')
  const [bcc, setBcc] = useState(email?.bcc || '')
  const [body, setBody] = useState(email?.body || '')
  const [status, setStatus] = useState<'draft' | 'scheduled'>(
    email?.status === 'scheduled' ? 'scheduled' : 'draft'
  )
  const [scheduledAt, setScheduledAt] = useState(
    email?.scheduledAt ? new Date(email.scheduledAt).toISOString().slice(0, 16) : ''
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      subject,
      recipient,
      cc: cc || undefined,
      bcc: bcc || undefined,
      body,
      status,
      scheduledAt: status === 'scheduled' ? new Date(scheduledAt).toISOString() : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {email?.id ? 'Edit Email' : 'New Email'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="email"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="recipient@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="cc@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BCC</label>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="bcc@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Email subject"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Write your email..."
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={status === 'draft'}
                onChange={() => setStatus('draft')}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">Save as Draft</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={status === 'scheduled'}
                onChange={() => setStatus('scheduled')}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">Schedule</span>
            </label>
          </div>

          {status === 'scheduled' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Time</label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
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
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AiAssistModal({
  onGenerate,
  onUse,
  onClose,
  isLoading,
  generatedEmail,
}: {
  onGenerate: (data: { prompt: string; tone: string; recipient?: string }) => void
  onUse: (subject: string, body: string) => void
  onClose: () => void
  isLoading: boolean
  generatedEmail?: { subject: string; body: string }
}) {
  const [prompt, setPrompt] = useState('')
  const [tone, setTone] = useState('professional')
  const [recipient, setRecipient] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Sparkles size={20} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">AI Email Assistant</h2>
            <p className="text-sm text-gray-500">Generate professional emails with AI</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What would you like to write about?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="E.g., Follow up on the meeting we had yesterday about the project timeline..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="professional">Professional</option>
                <option value="formal">Formal</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="John Doe (optional)"
              />
            </div>
          </div>

          <button
            onClick={() => onGenerate({ prompt, tone, recipient: recipient || undefined })}
            disabled={isLoading || !prompt}
            className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Generating...' : 'Generate Email'}
          </button>

          {generatedEmail && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Generated Email</h3>
              <div className="mb-2">
                <span className="text-sm text-gray-500">Subject:</span>
                <p className="font-medium">{generatedEmail.subject}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Body:</span>
                <p className="whitespace-pre-wrap text-sm mt-1">{generatedEmail.body}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => onUse(generatedEmail.subject, generatedEmail.body)}
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Use This Email
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`)
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function TemplatesView({
  templates,
  onCreateTemplate,
  onDeleteTemplate,
  onUseTemplate,
  isLoading,
}: {
  templates: EmailTemplate[]
  onCreateTemplate: (data: { name: string; subject: string; body: string; category: string }) => void
  onDeleteTemplate: (id: string) => void
  onUseTemplate: (template: EmailTemplate) => void
  isLoading: boolean
}) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category] = useState('general')

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">Save frequently used emails as templates</p>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
        >
          <Plus size={18} />
          New Template
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onCreateTemplate({ name, subject, body, category })
            setName('')
            setSubject('')
            setBody('')
            setShowCreateForm(false)
          }}
          className="mb-6 p-4 bg-white rounded-lg shadow-sm space-y-3"
        >
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Email body..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              Save Template
            </button>
          </div>
        </form>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No email templates yet. Create one to get started!
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Subject: {template.subject}</p>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{template.body}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onUseTemplate(template)}
                    className="px-3 py-1.5 text-primary-600 hover:bg-primary-50 rounded-lg text-sm"
                  >
                    Use
                  </button>
                  <button
                    onClick={() => onDeleteTemplate(template.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, Trash2, Edit2, Search, Tag, Files } from 'lucide-react'
import { api } from '../services/api'

interface Document {
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

interface DocumentTemplate {
  id: string
  name: string
  content: string
  category: string
  createdAt: string
}

const CATEGORIES = ['general', 'contracts', 'reports', 'policies', 'templates', 'other']

export default function Documents() {
  const [showForm, setShowForm] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const queryClient = useQueryClient()

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', selectedCategory],
    queryFn: async () => {
      const params = selectedCategory !== 'all' ? `?category=${selectedCategory}` : ''
      const response = await api.get(`/documents${params}`)
      return response.data as Document[]
    },
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['document-templates'],
    queryFn: async () => {
      const response = await api.get('/documents/templates/list')
      return response.data as DocumentTemplate[]
    },
  })

  const createDocument = useMutation({
    mutationFn: async (data: Partial<Document>) => {
      const response = await api.post('/documents', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setShowForm(false)
    },
  })

  const updateDocument = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Document> & { id: string }) => {
      const response = await api.patch(`/documents/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setEditingDoc(null)
    },
  })

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  const createTemplate = useMutation({
    mutationFn: async (data: { name: string; content: string; category: string }) => {
      const response = await api.post('/documents/templates', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] })
    },
  })

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/templates/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] })
    },
  })

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Organize and manage your documents</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Files size={20} />
            Templates
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={20} />
            New Document
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Document Form Modal */}
      {(showForm || editingDoc) && (
        <DocumentForm
          document={editingDoc}
          templates={templates}
          onSubmit={(data) => {
            if (editingDoc) {
              updateDocument.mutate({ id: editingDoc.id, ...data })
            } else {
              createDocument.mutate(data)
            }
          }}
          onClose={() => {
            setShowForm(false)
            setEditingDoc(null)
          }}
          isLoading={createDocument.isPending || updateDocument.isPending}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesModal
          templates={templates}
          onCreateTemplate={(data) => createTemplate.mutate(data)}
          onDeleteTemplate={(id) => deleteTemplate.mutate(id)}
          onUseTemplate={(_template) => {
            setShowTemplates(false)
            setShowForm(true)
          }}
          onClose={() => setShowTemplates(false)}
          isLoading={createTemplate.isPending}
        />
      )}

      {/* Documents Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading documents...</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? 'No documents found matching your search.' : 'No documents yet. Create your first document!'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 line-clamp-1">{doc.title}</h3>
                    <span className="text-xs text-gray-500 capitalize">{doc.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingDoc(doc)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this document?')) {
                        deleteDocument.mutate(doc.id)
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {doc.content && (
                <p className="text-sm text-gray-600 line-clamp-3 mb-3">{doc.content}</p>
              )}

              {doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {doc.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                  {doc.tags.length > 3 && (
                    <span className="text-xs text-gray-400">+{doc.tags.length - 3} more</span>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-400">
                Updated {new Date(doc.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentForm({
  document,
  templates: _templates,
  onSubmit,
  onClose,
  isLoading,
}: {
  document: Document | null
  templates: DocumentTemplate[]
  onSubmit: (data: Partial<Document>) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [title, setTitle] = useState(document?.title || '')
  const [content, setContent] = useState(document?.content || '')
  const [category, setCategory] = useState(document?.category || 'general')
  const [tagsInput, setTagsInput] = useState(document?.tags.join(', ') || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t)
    onSubmit({ title, content, category, tags })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{document ? 'Edit Document' : 'New Document'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Document title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              placeholder="Document content..."
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
              {isLoading ? 'Saving...' : document ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TemplatesModal({
  templates,
  onCreateTemplate,
  onDeleteTemplate,
  onUseTemplate,
  onClose,
  isLoading,
}: {
  templates: DocumentTemplate[]
  onCreateTemplate: (data: { name: string; content: string; category: string }) => void
  onDeleteTemplate: (id: string) => void
  onUseTemplate: (template: DocumentTemplate) => void
  onClose: () => void
  isLoading: boolean
}) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [category] = useState('general')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Document Templates</h2>
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
              onCreateTemplate({ name, content, category })
              setName('')
              setContent('')
              setShowCreateForm(false)
            }}
            className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3"
          >
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Template content..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-lg"
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
          <p className="text-center text-gray-500 py-8">No templates yet. Create one to get started!</p>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1">{template.content}</p>
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
            ))}
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

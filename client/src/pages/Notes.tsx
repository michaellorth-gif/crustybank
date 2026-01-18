import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, Trash2, Search, Clock } from 'lucide-react'
import { api } from '../services/api'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export default function Notes() {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const response = await api.get('/notes')
      return response.data as Note[]
    },
  })

  const createNote = useMutation({
    mutationFn: async (data: Partial<Note>) => {
      const response = await api.post('/notes', data)
      return response.data
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setSelectedNote(newNote)
      setIsEditing(true)
    },
  })

  const updateNote = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Note> & { id: string }) => {
      const response = await api.patch(`/notes/${id}`, data)
      return response.data
    },
    onSuccess: (updatedNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setSelectedNote(updatedNote)
    },
  })

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notes/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setSelectedNote(null)
    },
  })

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleNewNote = () => {
    createNote.mutate({
      title: 'Untitled Note',
      content: '',
    })
  }

  const handleSave = () => {
    if (selectedNote) {
      setIsEditing(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Note List */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Notes</h1>
            <button
              onClick={handleNewNote}
              disabled={createNote.isPending}
              className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading notes...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-8 text-center">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {searchQuery ? 'No notes found' : 'No notes yet'}
              </p>
            </div>
          ) : (
            <ul>
              {filteredNotes.map((note) => (
                <li key={note.id}>
                  <button
                    onClick={() => {
                      setSelectedNote(note)
                      setIsEditing(false)
                    }}
                    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedNote?.id === note.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 truncate">
                      {note.title || 'Untitled Note'}
                    </h3>
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {note.content || 'No content'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                      <Clock size={12} />
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main Content - Note Editor */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedNote ? (
          <>
            <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isEditing ? (
                  <input
                    type="text"
                    value={selectedNote.title}
                    onChange={(e) =>
                      setSelectedNote({ ...selectedNote, title: e.target.value })
                    }
                    onBlur={() =>
                      updateNote.mutate({
                        id: selectedNote.id,
                        title: selectedNote.title,
                      })
                    }
                    className="text-xl font-semibold text-gray-900 border-none focus:ring-0 p-0 bg-transparent"
                    placeholder="Note title"
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedNote.title || 'Untitled Note'}
                  </h2>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Done
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => deleteNote.mutate(selectedNote.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {isEditing ? (
                <textarea
                  value={selectedNote.content}
                  onChange={(e) =>
                    setSelectedNote({ ...selectedNote, content: e.target.value })
                  }
                  onBlur={() =>
                    updateNote.mutate({
                      id: selectedNote.id,
                      content: selectedNote.content,
                    })
                  }
                  className="w-full h-full min-h-[400px] p-4 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  placeholder="Start writing..."
                />
              ) : (
                <div className="bg-white rounded-lg p-6 shadow-sm min-h-[400px]">
                  {selectedNote.content ? (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedNote.content}
                    </p>
                  ) : (
                    <p className="text-gray-400 italic">No content. Click Edit to start writing.</p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText size={64} className="mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-medium text-gray-600">Select a note</h2>
              <p className="text-gray-400 mt-2">
                Choose a note from the sidebar or create a new one
              </p>
              <button
                onClick={handleNewNote}
                className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus size={20} />
                New Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

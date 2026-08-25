import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, UserSearch } from 'lucide-react'
import { api } from '../../services/api'

interface PartyHit {
  name: string
  role: string
  intakeId: string
  clientName: string
  matterType: string
  status: string
  createdAt: string
}

export default function ConflictsSearchModal({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')

  const { data, isFetching, error } = useQuery({
    queryKey: ['conflicts-search', query],
    queryFn: async () => (await api.get('/intakes/conflicts-search', { params: { q: query } })).data as {
      results: PartyHit[]
      disclaimer: string
    },
    enabled: query.length >= 3,
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-1">
          <UserSearch size={20} /> Conflicts Check
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Searches every party name across all intakes (clients, opposing parties, spouses, creditors).
          A first-pass scan — not a substitute for the firm conflicts procedure.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); setQuery(input.trim()) }}
          className="flex gap-2 mb-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Person or company name (min 3 characters)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={input.trim().length < 3 || isFetching}
            className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 text-sm"
          >
            <Search size={15} /> {isFetching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {error != null && <p className="text-sm text-red-700 mb-3">Search failed — please try again.</p>}

        {query.length >= 3 && data && (
          data.results.length === 0 ? (
            <p className="text-sm text-gray-600">No party named "{query}" found in any intake.</p>
          ) : (
            <ul className="space-y-2">
              {data.results.map((r, i) => (
                <li key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <span className="font-medium text-gray-900">{r.name}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                    r.role === 'adverse party' ? 'bg-red-100 text-red-700'
                      : r.role === 'client' ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}>{r.role}</span>
                  <p className="text-xs text-gray-500 mt-1">
                    In {r.clientName}'s {r.matterType.replace(/-/g, ' ')} matter ({r.status}) · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )
        )}

        <div className="flex justify-end pt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Close</button>
        </div>
      </div>
    </div>
  )
}

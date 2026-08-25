import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, CalendarCheck, AlertTriangle, ChevronRight } from 'lucide-react'
import { api } from '../../services/api'

interface Meta {
  docTypes: Record<string, Array<{ id: string; label: string }>>
  stages: Record<string, string[]>
  milestones: Record<string, Array<{ id: string; label: string }>>
}

interface GeneratedDoc {
  id: string
  title: string
  content: string
  createdAt: string
}

interface IntakeLike {
  id: string
  matterType: string
  stage: string
  keyDates: Record<string, { date: string; taskIds?: string[] }> | null
}

export default function MatterPanel({ intake }: { intake: IntakeLike }) {
  const queryClient = useQueryClient()
  const [milestoneDates, setMilestoneDates] = useState<Record<string, string>>({})
  const [editingMilestones, setEditingMilestones] = useState<Record<string, boolean>>({})
  const [warning, setWarning] = useState<string | null>(null)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<GeneratedDoc | null>(null)

  const errorMessage = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback

  const { data: meta } = useQuery({
    queryKey: ['intake-meta'],
    queryFn: async () => (await api.get('/intakes/meta')).data as Meta,
    staleTime: Infinity,
  })

  const { data: docs = [] } = useQuery({
    queryKey: ['intake-docs', intake.id],
    queryFn: async () => (await api.get(`/intakes/${intake.id}/documents`)).data as GeneratedDoc[],
  })

  const generateDoc = useMutation({
    mutationFn: async (docType: string) => (await api.post(`/intakes/${intake.id}/generate`, { docType })).data as GeneratedDoc,
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['intake-docs', intake.id] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      setPreviewDoc(doc)
      setPanelError(null)
    },
    onError: (err: unknown) => setPanelError(errorMessage(err, 'Document generation failed — please try again.')),
  })

  const recordMilestone = useMutation({
    mutationFn: async ({ milestone, date }: { milestone: string; date: string }) =>
      (await api.post(`/intakes/${intake.id}/milestone`, { milestone, date })).data as { warning: string | null },
    onSuccess: (result, vars) => {
      setWarning(result.warning)
      setPanelError(null)
      if (!result.warning) setEditingMilestones((p) => ({ ...p, [vars.milestone]: false }))
      queryClient.invalidateQueries({ queryKey: ['legal-intakes'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err: unknown) => setPanelError(errorMessage(err, 'Recording the milestone failed — please try again.')),
  })

  if (!meta) return null
  const stages = meta.stages[intake.matterType] || []
  const milestones = meta.milestones[intake.matterType] || []
  const docTypes = meta.docTypes[intake.matterType] || []
  const keyDates = intake.keyDates || {}

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-5">
      {/* Stage progress */}
      <div className="flex items-center gap-1 flex-wrap text-xs">
        {stages.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} className="text-gray-300" />}
            <span className={`px-2 py-1 rounded-full capitalize ${
              s === intake.stage ? 'bg-primary-600 text-white font-medium'
                : stages.indexOf(intake.stage) > i ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {s.replace(/-/g, ' ')}
            </span>
          </span>
        ))}
      </div>

      {(warning || panelError) && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{warning || panelError}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Milestones */}
        <div>
          <h4 className="flex items-center gap-1.5 font-medium text-gray-900 mb-2 text-sm">
            <CalendarCheck size={15} /> Milestones (recording one creates the follow-up deadline tasks)
          </h4>
          <div className="space-y-2">
            {milestones.map((m) => {
              const recorded = keyDates[m.id]
              const editing = editingMilestones[m.id]
              return (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="w-44 text-gray-700 shrink-0">{m.label}</span>
                  {recorded && !editing ? (
                    <span className="text-green-700 text-xs font-medium">
                      ✓ {recorded.date}
                      {recorded.taskIds && recorded.taskIds.length > 0 && ` · ${recorded.taskIds.length} task(s) created`}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMilestones((p) => ({ ...p, [m.id]: true }))
                          setMilestoneDates((p) => ({ ...p, [m.id]: recorded.date }))
                        }}
                        className="ml-2 text-gray-400 hover:text-primary-600 underline"
                        title="Re-record with a new date (replaces the follow-up tasks)"
                      >
                        change
                      </button>
                    </span>
                  ) : (
                    <>
                      <input
                        type="date"
                        value={milestoneDates[m.id] || ''}
                        onChange={(e) => setMilestoneDates((p) => ({ ...p, [m.id]: e.target.value }))}
                        className="px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                      <button
                        disabled={!milestoneDates[m.id] || recordMilestone.isPending}
                        onClick={() => recordMilestone.mutate({ milestone: m.id, date: milestoneDates[m.id] })}
                        className="px-2 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700 disabled:opacity-40"
                      >
                        Record
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Documents */}
        <div>
          <h4 className="flex items-center gap-1.5 font-medium text-gray-900 mb-2 text-sm">
            <FileText size={15} /> Draft documents (attorney review required before use)
          </h4>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {docTypes.map((dt) => (
              <button
                key={dt.id}
                disabled={generateDoc.isPending}
                onClick={() => generateDoc.mutate(dt.id)}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-primary-100 hover:text-primary-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
              >
                + {dt.label}
              </button>
            ))}
          </div>
          {docs.length > 0 && (
            <ul className="space-y-1 text-sm">
              {docs.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setPreviewDoc(previewDoc?.id === d.id ? null : d)}
                    className="text-primary-600 hover:underline text-left"
                  >
                    {d.title}
                  </button>
                  <span className="text-xs text-gray-400"> · {new Date(d.createdAt).toLocaleDateString()} · saved in Documents</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {previewDoc && (
        <div className="border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-t-lg">
            <span className="text-sm font-medium text-gray-800">{previewDoc.title}</span>
            <button onClick={() => setPreviewDoc(null)} className="text-xs text-gray-500 hover:text-gray-700">Close preview</button>
          </div>
          <pre className="p-4 text-xs text-gray-800 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">{previewDoc.content}</pre>
        </div>
      )}
    </div>
  )
}

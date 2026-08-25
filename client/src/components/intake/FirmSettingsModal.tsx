import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { TextField } from './fields'

interface FirmData {
  attorneyName?: string
  barNumber?: string
  firmName?: string
  address?: string
  phone?: string
  email?: string
}

export default function FirmSettingsModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FirmData | null>(null)

  const { data: saved } = useQuery({
    queryKey: ['firm-settings'],
    queryFn: async () => (await api.get('/firm-settings')).data as FirmData,
  })

  const current: FirmData = form ?? saved ?? {}
  const set = (k: keyof FirmData) => (v: string) => setForm({ ...current, [k]: v })

  const save = useMutation({
    mutationFn: async (data: FirmData) => (await api.put('/firm-settings', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firm-settings'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-1">Firm Settings</h2>
        <p className="text-sm text-gray-500 mb-4">Used in signature blocks of generated documents. Empty fields stay as [BRACKETED] placeholders.</p>
        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate(current) }}
          className="space-y-3"
        >
          <TextField label="Attorney name" value={current.attorneyName || ''} onChange={set('attorneyName')} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="State Bar number" value={current.barNumber || ''} onChange={set('barNumber')} />
            <TextField label="Phone" value={current.phone || ''} onChange={set('phone')} />
          </div>
          <TextField label="Firm name" value={current.firmName || ''} onChange={set('firmName')} />
          <TextField label="Firm address" value={current.address || ''} onChange={set('address')} />
          <TextField label="Email" value={current.email || ''} onChange={set('email')} />
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={save.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

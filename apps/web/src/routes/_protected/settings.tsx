import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Button } from '@resumetailor/ui'
import { useAuthStore } from '../../store/auth'
import { AlertCircle, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/_protected/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const [confirmText, setConfirmText] = useState('')
  const { signOut } = useAuthStore()
  const navigate = useNavigate()

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`
        }
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to delete account')
      
      return result
    },
    onSuccess: async () => {
      await signOut()
      navigate({ to: '/' })
    },
    onError: (err) => {
      alert((err as Error).message)
    }
  })

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your account preferences and data.</p>
      </div>

      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-6 space-y-6 mt-12">
        <div>
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Delete My Account
          </h2>
          <p className="text-red-600 dark:text-red-400/80 mt-2 text-sm">
            This permanently deletes your account, all resumes, and all tailored documents. This cannot be undone.
          </p>
        </div>

        <div className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-red-800 dark:text-red-300 mb-1">
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-red-300 dark:border-red-800 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              placeholder="DELETE"
            />
          </div>
          <Button
            onClick={() => deleteAccountMutation.mutate()}
            disabled={confirmText !== 'DELETE' || deleteAccountMutation.isPending}
            variant="destructive"
            className="w-full"
          >
            {deleteAccountMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
            ) : (
              'Permanently Delete Account'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

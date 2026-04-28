import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useExportMutation() {
  return useMutation({
    mutationFn: async ({ tailored_id, tailored_json }: { tailored_id: string, tailored_json: any }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const { data, error } = await supabase.functions.invoke('export-resume', {
        body: {
          id: tailored_id,
          tailored_resume_json: tailored_json,
          user_id: session.user.id
        }
      })

      if (error) throw error
      if (data && data.error) throw new Error(data.error)
      return data.url // Signed URL
    },
    onSuccess: (url: string) => {
      if (url) {
        chrome.downloads.download({
          url: url,
          filename: 'tailored-resume.pdf',
          saveAs: true
        })
      }
    },
    onError: (error: any) => {
      console.error('Export failed:', error)
      alert(`Export failed: ${error.message || 'Unknown error'}`)
    }
  })
}

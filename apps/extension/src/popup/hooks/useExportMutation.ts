import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useExportMutation() {
  return useMutation({
    mutationFn: async ({ tailored_id }: { tailored_id: string }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const { data, error } = await supabase.functions.invoke('write-docx', {
        body: {
          tailored_resume_id: tailored_id,
          user_id: session.user.id
        }
      })

      if (error) throw error
      if (data && data.error) throw new Error(data.error)
      return data.output_url // Public DOCX URL
    },
    onSuccess: (url: string) => {
      if (url) {
        chrome.downloads.download({
          url: url,
          filename: 'tailored-resume.docx',
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

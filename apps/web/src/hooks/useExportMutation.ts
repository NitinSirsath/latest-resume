import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useExportMutation() {
  return useMutation({
    mutationFn: async ({ tailored_id, user_id }: { tailored_id: string, user_id: string }) => {
      const { data, error } = await supabase.functions.invoke('write-docx', {
        body: {
          tailored_resume_id: tailored_id,
          user_id: user_id
        }
      })

      if (error) throw error
      return data.output_url
    },
    onSuccess: (url) => {
      const link = document.createElement('a')
      link.href = url
      link.download = 'tailored-resume.docx'
      link.click()
    }
  })
}

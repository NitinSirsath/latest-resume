import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useExportMutation() {
  return useMutation({
    mutationFn: async ({ tailored_id, tailored_json }: { tailored_id: string, tailored_json: any }) => {
      const { data, error } = await supabase.functions.invoke('export-resume', {
        body: {
          id: tailored_id,
          tailored_resume_json: tailored_json,
          // user_id is handled via auth on the server side if needed, 
          // but we pass it for clarity if the function expects it.
        }
      })

      if (error) throw error
      return data.url // Signed URL
    },
    onSuccess: (url) => {
      window.open(url, '_blank')
    }
  })
}

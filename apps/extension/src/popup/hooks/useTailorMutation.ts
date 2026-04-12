import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { chromeStorage } from '../../lib/chrome-storage'

export function useTailorMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const context = await chromeStorage.getContext()
      if (!context?.analysis || !context?.activeJD) {
        throw new Error('Analysis context missing')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // 1. Fetch latest base resume if not in context
      const { data: resumes } = await supabase
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!resumes || resumes.length === 0) {
        throw new Error('No base resume found')
      }

      // 2. Call the Tailor Resume Edge Function
      const { data, error } = await supabase.functions.invoke('tailor-resume', {
        body: {
          base_resume_json: resumes[0].parsed_json,
          jd_analysis: context.analysis,
          tailored_resume_id: context.analysis.id // Assuming analyze-jd returns the ID
        }
      })

      if (error) throw error
      return data
    },
    onSuccess: async (data: any) => {
      // Update local storage so UI can transition to DONE
      await chromeStorage.updateContext({ 
        gapReport: data.gapReport, // or whatever metadata we want to persist
      })
      queryClient.invalidateQueries({ queryKey: ['tailor-context'] })
    }
  })
}

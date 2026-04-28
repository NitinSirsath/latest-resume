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

      if (!context.tailoredResumeId) {
        throw new Error('Tailored resume record ID missing from context')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // 1. Fetch latest base resume
      const { data: resumes } = await supabase
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!resumes || resumes.length === 0) {
        throw new Error('No base resume found')
      }

      if (!resumes[0].parsed_json) {
        throw new Error('Base resume has not been parsed yet. Please re-upload.')
      }

      // 2. Call the Tailor Resume Edge Function with complete data
      const { data, error } = await supabase.functions.invoke('tailor-resume', {
        body: {
          base_resume_json: resumes[0].parsed_json,
          gap_report: context.gapReport,
          jd_analysis: context.analysis,
          tailored_resume_id: context.tailoredResumeId
        }
      })

      if (error) throw error
      if (data && data.error) throw new Error(data.error)
      return data
    },
    onSuccess: async (data: any) => {
      // Store tailorResult in Chrome Storage so the Dashboard transitions to COMPLETE
      await chromeStorage.updateContext({ 
        status: 'COMPLETE',
        reasoning: 'Tailoring complete!',
        tailorResult: data
      })

      // Send a notification so the user knows it's done
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon-128.png',
        title: 'Resume Ready!',
        message: `Your resume has been optimized. Click the extension to download!`,
        priority: 2
      })

      queryClient.invalidateQueries({ queryKey: ['tailor-context'] })
    }
  })
}

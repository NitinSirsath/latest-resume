import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

interface ChangeLogEntry {
  change_id: string;
  section: string;
  change_type: string;
  original: string;
  changed_to: string;
  reason: string;
  impact: string;
}

export function useExportMutation() {
  return useMutation({
    mutationFn: async ({ tailored_id }: { tailored_id: string }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Fetch the tailored resume to get the change_log
      const { data: tailored, error: fetchError } = await supabase
        .from('tailored_resumes')
        .select('diff_json')
        .eq('id', tailored_id)
        .single()

      if (fetchError) throw fetchError

      // Auto-accept all changes from the change_log
      const changeLog = ((tailored?.diff_json as Record<string, unknown>)?.log as ChangeLogEntry[]) || []
      const decisions = changeLog.map((entry: ChangeLogEntry) => ({
        change_id: entry.change_id,
        section: entry.section,
        accepted: true,
        alternative_requested: false,
        final_text: entry.changed_to
      }))

      console.log('[ResumeTailor] Calling write-docx with', decisions.length, 'decisions')

      const { data, error } = await supabase.functions.invoke('write-docx', {
        body: {
          tailored_resume_id: tailored_id,
          user_id: session.user.id,
          decisions
        }
      })

      console.log('[ResumeTailor] write-docx response:', JSON.stringify(data))

      if (error) throw error
      if (data && data.error) throw new Error(data.error)

      // Handle both wrapped and unwrapped response formats
      const outputUrl = data?.data?.output_url || data?.output_url
      if (!outputUrl) throw new Error('No output URL returned from write-docx')

      return outputUrl
    },
    onSuccess: (url: string) => {
      console.log('[ResumeTailor] Download URL:', url)
      if (url) {
        // Use chrome.downloads if available, fallback to opening URL directly
        if (chrome?.downloads?.download) {
          chrome.downloads.download({
            url: url,
            filename: 'tailored-resume.docx',
            saveAs: true
          }, (downloadId) => {
            if (chrome.runtime.lastError) {
              console.warn('[ResumeTailor] chrome.downloads failed, opening URL directly:', chrome.runtime.lastError)
              window.open(url, '_blank')
            } else {
              console.log('[ResumeTailor] Download started, id:', downloadId)
            }
          })
        } else {
          window.open(url, '_blank')
        }
      }
    },
    onError: (error: Error) => {
      console.error('[ResumeTailor] Export failed:', error)
      alert(`Export failed: ${error.message || 'Unknown error'}`)
    }
  })
}


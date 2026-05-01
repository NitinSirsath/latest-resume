import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useState } from 'react'
import { DiffReviewPanel, ReviewDecisionType, ChangeItem } from '@resumetailor/ui'
import { useAuthStore } from '../store/auth'
import { Link } from '@tanstack/react-router'
import { Button } from '@resumetailor/ui'

export const Route = createFileRoute('/review/$id')({
  component: ReviewPage,
})

function ReviewPage() {
  const { id } = Route.useParams()
  const { user } = useAuthStore()

  const [decisions, setDecisions] = useState<Record<string, ReviewDecisionType>>({})
  const [finalTexts, setFinalTexts] = useState<Record<string, string>>({})

  const { data: detail, isLoading } = useQuery({
    queryKey: ['tailored', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tailored_resumes')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    }
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      
      const decisionList = Object.entries(decisions).map(([changeId, decision]) => {
        const logEntry = detail?.diff_json?.log?.find((l: { change_id: string; section?: string; changed_to?: string }) => l.change_id === changeId)
        return {
          change_id: changeId,
          section: logEntry?.section || '',
          accepted: decision === 'accepted',
          alternative_requested: decision === 'alternative_requested',
          final_text: decision === 'accepted' ? (finalTexts[changeId] || logEntry?.changed_to || '') : ''
        }
      })

      const { data, error } = await supabase.functions.invoke('write-docx', {
        body: { tailored_resume_id: id, user_id: user.id, decisions: decisionList }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)
      
      return data?.data?.output_url || data?.output_url
    }
  })

  const handleAccept = (changeId: string) => {
    setDecisions(prev => ({ ...prev, [changeId]: 'accepted' }))
  }

  const handleReject = (changeId: string) => {
    setDecisions(prev => ({ ...prev, [changeId]: 'rejected' }))
  }

  const handleAlternative = async (changeId: string) => {
    setDecisions(prev => ({ ...prev, [changeId]: 'alternative_requested' }))

    try {
      const { data, error } = await supabase.functions.invoke('review-changes', {
        body: { change_id: changeId, tailored_resume_id: id, accepted: false, user_id: user?.id }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      if (data?.data?.alternative_text) {
        setFinalTexts(prev => ({ ...prev, [changeId]: data.data.alternative_text }))
        // Un-set decision so they can accept/reject the new text
        setDecisions(prev => {
          const next = { ...prev }
          delete next[changeId]
          return next
        })
      }
    } catch (err: unknown) {
      console.error(err)
      alert("Failed to get alternative.")
      setDecisions(prev => {
        const next = { ...prev }
        delete next[changeId]
        return next
      })
    }
  }

  if (isLoading) return <div className="p-20 text-center animate-pulse">Loading review...</div>
  if (!detail) return <div className="p-20 text-center">Resume not found.</div>

  if (exportMutation.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6">
        <h1 className="text-3xl font-bold text-green-600">Resume Finalized!</h1>
        <p className="text-gray-600">Your tailored resume is ready for download.</p>
        <div className="flex justify-center gap-4">
          <Button asChild>
            <a href={exportMutation.data} target="_blank" rel="noreferrer">
              Download DOCX
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard">View History</Link>
          </Button>
        </div>
      </div>
    )
  }

  const changes: ChangeItem[] = (detail.diff_json?.log || []).map((log: { change_id?: string; section?: string; original?: string; changed_to?: string; reason?: string; impact?: "high" | "medium" | "low" }) => ({
    changeId: log.change_id || Math.random().toString(), // fallback if missing
    section: log.section || 'Unknown',
    original: log.original || '',
    changedTo: finalTexts[log.change_id || ''] || log.changed_to || '',
    reason: log.reason || '',
    impact: log.impact || 'low'
  }))

  return (
    <div className="py-8 px-4">
      <DiffReviewPanel
        changes={changes}
        decisions={decisions}
        onAccept={handleAccept}
        onReject={handleReject}
        onRequestAlternative={handleAlternative}
        onSubmit={() => exportMutation.mutate()}
        isSubmitting={exportMutation.isPending}
      />
    </div>
  )
}

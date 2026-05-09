import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useState } from 'react'
import { DiffReviewPanel, ReviewDecisionType, ChangeItem } from '@resumetailor/ui'
import { useAuthStore } from '../../store/auth'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'
import { Link } from '@tanstack/react-router'
import { Button } from '@resumetailor/ui'

export const Route = createFileRoute('/_protected/review/$id')({
  component: ReviewPage,
})

function ReviewPage() {
  const { id } = Route.useParams()
  const { user } = useAuthStore()

  const [decisions, setDecisions] = useState<Record<string, ReviewDecisionType>>({})
  const [finalTexts, setFinalTexts] = useState<Record<string, string>>({})
  const [coverLetter, setCoverLetter] = useState<string>('')
  const [clSubject, setClSubject] = useState<string>('')

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

  const generateCoverLetterMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      const { data: sessionData } = await supabase.auth.getSession()
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`
        },
        body: JSON.stringify({ tailored_resume_id: id, user_id: user.id })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to generate cover letter')
      
      return result.cover_letter
    },
    onSuccess: (data) => {
      setCoverLetter(data.body)
      setClSubject(data.subject_line)
    },
    onError: (err) => {
      alert((err as Error).message)
    }
  })

  const handleDownloadCoverLetter = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: user?.email || 'Candidate', bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: new Date().toLocaleDateString(), size: 24 }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: clSubject, bold: true, size: 24 }),
            ],
            spacing: { after: 400 },
          }),
          ...coverLetter.split('\n').filter(Boolean).map(paragraph => 
            new Paragraph({
              children: [new TextRun({ text: paragraph, size: 24 })],
              spacing: { after: 200 }
            })
          ),
        ],
      }],
    })
    
    const blob = await Packer.toBlob(doc)
    saveAs(blob, 'Cover_Letter.docx')
  }

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

      <div className="mt-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Cover Letter</h2>
        {!coverLetter && !generateCoverLetterMutation.isPending && (
          <div className="flex flex-col items-center py-8">
            <p className="text-slate-500 mb-4">Generate a targeted cover letter based on this tailored resume.</p>
            <Button 
              onClick={() => generateCoverLetterMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Generate Cover Letter (1 Credit)
            </Button>
          </div>
        )}
        
        {generateCoverLetterMutation.isPending && (
          <div className="py-12 text-center animate-pulse text-indigo-500 font-medium">
            Generating your targeted cover letter...
          </div>
        )}

        {coverLetter && (
          <div className="space-y-4">
            <input 
              value={clSubject} 
              onChange={e => setClSubject(e.target.value)} 
              className="w-full font-bold text-lg p-2 border border-slate-300 dark:border-slate-700 rounded bg-transparent"
              placeholder="Subject Line"
            />
            <textarea 
              value={coverLetter} 
              onChange={e => setCoverLetter(e.target.value)} 
              className="w-full h-64 p-3 border border-slate-300 dark:border-slate-700 rounded bg-transparent font-sans leading-relaxed"
              placeholder="Cover letter body..."
            />
            <div className="flex justify-end pt-2">
              <Button onClick={handleDownloadCoverLetter} className="bg-emerald-600 hover:bg-emerald-700">
                Download Cover Letter (.docx)
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

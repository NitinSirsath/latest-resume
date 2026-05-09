import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/auth'
import { useState } from 'react'
import { Button } from '@resumetailor/ui'
import { Building2, Calendar, DollarSign, X } from 'lucide-react'

export const Route = createFileRoute('/_protected/tracker')({
  component: TrackerPage,
})

const COLUMNS = ['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected']

interface TrackedJob {
  id: string
  company: string
  role_title: string
  url: string | null
  status: string
  salary_range: string | null
  notes: string | null
  created_at: string
}

function TrackerPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedJob, setSelectedJob] = useState<TrackedJob | null>(null)
  const [editNotes, setEditNotes] = useState('')

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['tracked_jobs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracked_jobs')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as TrackedJob[]
    },
    enabled: !!user,
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from('tracked_jobs')
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked_jobs'] })
    }
  })

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string, notes: string }) => {
      const { error } = await supabase
        .from('tracked_jobs')
        .update({ notes })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked_jobs'] })
      setSelectedJob(null)
    }
  })

  if (isLoading) return <div className="p-8 animate-pulse">Loading tracker...</div>

  const handleJobClick = (job: TrackedJob) => {
    setSelectedJob(job)
    setEditNotes(job.notes || '')
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6 space-y-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Job Tracker</h1>
        <p className="text-sm text-slate-500">Track your applications across the hiring pipeline.</p>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 h-full min-w-max pb-4">
          {COLUMNS.map(column => {
            const columnJobs = jobs.filter(j => j.status === column)
            return (
              <div key={column} className="w-80 flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300">{column}</h3>
                  <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                    {columnJobs.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {columnJobs.map(job => (
                    <div 
                      key={job.id} 
                      className="bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative"
                      onClick={() => handleJobClick(job)}
                    >
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{job.role_title}</h4>
                      <div className="flex items-center text-sm text-slate-500 mt-1 mb-3">
                        <Building2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        <span className="line-clamp-1">{job.company}</span>
                      </div>
                      
                      {job.salary_range && (
                        <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-2 bg-emerald-50 dark:bg-emerald-950/30 w-fit px-1.5 py-0.5 rounded">
                          <DollarSign className="w-3 h-3 mr-0.5" />
                          {job.salary_range}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-xs text-slate-400 font-medium">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <select 
                          className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-none rounded py-1 pl-2 pr-6 cursor-pointer focus:ring-1 focus:ring-primary appearance-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          value={job.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation()
                            updateStatusMutation.mutate({ id: job.id, status: e.target.value })
                          }}
                        >
                          {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                  {columnJobs.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-400 font-medium">
                      No jobs
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg">{selectedJob.role_title}</h3>
                <p className="text-slate-500 text-sm">{selectedJob.company}</p>
              </div>
              <button 
                onClick={() => setSelectedJob(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {selectedJob.url && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Job URL</label>
                  <a href={selectedJob.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all">
                    {selectedJob.url}
                  </a>
                </div>
              )}
              
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Notes & Interview Details</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Add notes, interviewer names, or next steps..."
                />
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedJob(null)}>Cancel</Button>
              <Button 
                onClick={() => updateNotesMutation.mutate({ id: selectedJob.id, notes: editNotes })}
                disabled={updateNotesMutation.isPending}
              >
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

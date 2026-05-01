import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { useRef, useState } from 'react'
import { 
  Button, 
  Card, 
  CardHeader, 
  CardContent,
  Badge,
  Separator
} from '@resumetailor/ui'
import { FileText, History, ExternalLink, Calendar, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 5

  // 0. Upload Logic
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated')
      if (!file.name.endsWith('.docx')) {
        throw new Error('Please upload a .docx file. PDF files are not supported.')
      }
      setIsUploading(true)
      setUploadStatus('Uploading to vault...')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Math.random()}.${fileExt}`
      const filePath = `resumes/${fileName}`

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath)

      // 2. Insert into DB
      setUploadStatus('Saving to database...')
      const { data, error: dbError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title: file.name.replace(/\.[^/.]+$/, ""),
          file_url: publicUrl,
          content: 'Pending analysis...', 
          processing_status: 'pending'
        })
        .select()
        .single()

      if (dbError) throw dbError

      // 3. Trigger Parsing
      setUploadStatus('Processing your resume...')
      try {
        const { error: invokeError } = await supabase.functions.invoke('parse-resume', {
          body: { 
            resume_id: data.id,
            file_url: publicUrl,
            user_id: user.id
          }
        })
        if (invokeError) throw invokeError
        setUploadStatus('Ready!')
      } catch (parseError: any) {
        console.error('[ResumeTailor] Parse error:', parseError)
        setUploadStatus('Processing failed. Please ensure your file is a valid .docx')
        throw new Error('Processing failed. Please ensure your file is a valid .docx')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      setTimeout(() => {
        setIsUploading(false)
        setUploadStatus(null)
      }, 2000)
    },
    onError: (error: any) => {
      console.error('Upload failed:', error)
      setIsUploading(false)
      setUploadStatus(null)
      alert(`Upload failed: ${error.message || 'Unknown error'}`)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (resume: any) => {
      // Extract storage path from public URL
      // URL format: .../storage/v1/object/public/resumes/USER_ID/FILENAME
      const parts = resume.file_url.split('/resumes/')
      const path = parts[parts.length - 1]
      
      if (path) {
        await supabase.storage.from('resumes').remove([path])
      }
      
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resume.id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadMutation.mutate(file)
  }

  // 1. Fetch Resumes (Vault)
  const { data: resumes, isLoading: resumesLoading } = useQuery({
    queryKey: ['resumes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  // 2. Fetch Tailoring History with Pagination
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['history', user?.id, page],
    queryFn: async () => {
      const from = page * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const { data, count, error } = await supabase
        .from('tailored_resumes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)
      
      if (error) throw error
      return { data, count }
    },
    enabled: !!user,
  })

  const history = historyData?.data
  const totalCount = historyData?.count || 0
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-10">
      {/* Resume Vault */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded flex items-center justify-center text-primary border border-primary/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Resume Vault</h2>
              <p className="text-muted text-[10px] uppercase font-bold tracking-wider">Base resumes</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="sm"
            >
              {isUploading ? (uploadStatus || 'Uploading...') : 'Upload Resume (.docx only)'}
            </Button>
            <p className="text-muted text-[10px] max-w-[220px] text-right">Upload your resume as a Word document (.docx). We'll tailor it and give you back a .docx file ready to submit.</p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".docx"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {resumesLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[140px] rounded bg-slate-100 dark:bg-surface animate-pulse" />
            ))
          ) : resumes?.length === 0 ? (
            <Card className="col-span-full border-dashed py-10 text-center bg-transparent">
              <p className="text-muted text-xs">Your vault is empty.</p>
            </Card>
          ) : (
            resumes?.map((resume) => (
              <Card key={resume.id} className="group transition-all">
                <CardHeader className="p-4 pb-1.5 flex flex-row items-center justify-between space-y-0">
                  <div className="font-bold text-sm truncate max-w-[120px]">{resume.title}</div>
                  <Badge variant="secondary" className="scale-75 origin-right">Base</Badge>
                </CardHeader>
                <CardContent className="p-4 pt-1.5">
                  <div className="flex items-center gap-1.5 text-[9px] text-muted mb-4 font-bold uppercase tracking-tight">
                    <Calendar className="w-3 h-3" />
                    {new Date(resume.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1 h-7 text-[10px]" asChild>
                      <a href={resume.file_url} target="_blank" rel="noreferrer">
                        View
                      </a>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 px-2 text-red-500 hover:text-red-400"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this resume?')) {
                          deleteMutation.mutate(resume)
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <Separator className="opacity-50" />

      {/* Tailoring History */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500/10 rounded flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Tailoring History</h2>
            <p className="text-muted text-[10px] uppercase font-bold tracking-wider">AI-optimized applications</p>
          </div>
        </div>

        <div className="glass-card rounded overflow-hidden">
          {historyLoading ? (
            <div className="p-10 text-center text-muted text-xs animate-pulse">Loading history...</div>
          ) : history?.length === 0 ? (
            <div className="p-12 text-center text-muted text-xs font-medium">
              No tailored resumes yet.
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b">
                    <th className="px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-widest">Role & Company</th>
                    <th className="px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-widest text-center">Match</th>
                    <th className="px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-widest">Date</th>
                    <th className="px-4 py-2.5 text-[9px] font-bold text-muted uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                      <td className="px-4 py-3">
                        <div className="font-bold text-xs">{item.job_title}</div>
                        <div className="text-[10px] text-muted font-medium">{item.company}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={item.ats_score > 70 ? 'success' : 'secondary'} className="scale-90">
                          {item.ats_score}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-muted font-bold tracking-tighter">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link 
                          to="/tailored/$id" 
                          params={{ id: item.id }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:opacity-80 transition-opacity"
                        >
                          DIFF <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination Controls */}
              <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-white/[0.02] border-t flex items-center justify-between">
                <p className="text-[9px] text-muted font-bold uppercase tracking-tighter">
                  {page * ITEMS_PER_PAGE + 1}-{Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                </p>
                <div className="flex gap-1.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 px-2 text-[9px] font-bold uppercase"
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 px-2 text-[9px] font-bold uppercase"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

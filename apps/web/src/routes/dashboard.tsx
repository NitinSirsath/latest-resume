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
import { FileText, History, ExternalLink, Calendar } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  // 0. Upload Logic
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated')
      setIsUploading(true)

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
      const { data, error: dbError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title: file.name.replace(/\.[^/.]+$/, ""),
          file_url: publicUrl,
          content: 'Pending analysis...', // Placeholder until AI processes it
        })
        .select()
        .single()

      if (dbError) throw dbError
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      setIsUploading(false)
    },
    onError: (error: any) => {
      console.error('Upload failed:', error)
      setIsUploading(false)
      alert(`Upload failed: ${error.message || 'Unknown error'}`)
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

  // 2. Fetch Tailoring History
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tailored_resumes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  return (
    <div className="space-y-10">
      {/* Resume Vault */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Resume Vault</h2>
              <p className="text-sm text-slate-500">Manage your base resumes</p>
            </div>
          </div>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isUploading ? 'Uploading...' : 'Upload New Resume'}
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.doc,.docx"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumesLoading ? (
            <div className="col-span-full h-32 flex items-center justify-center text-slate-400 animate-pulse">
              Loading vault...
            </div>
          ) : resumes?.length === 0 ? (
            <Card className="col-span-full border-dashed border-2 py-10 text-center">
              <p className="text-slate-500">Your vault is empty. Upload your first resume to get started!</p>
            </Card>
          ) : (
            resumes?.map((resume) => (
              <Card key={resume.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between space-y-0">
                  <div className="font-semibold text-slate-900">{resume.title}</div>
                  <Badge variant="outline">Base</Badge>
                </CardHeader>
                <CardContent className="p-5 pt-2">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-4">
                    <Calendar className="w-3 h-3" />
                    {new Date(resume.created_at).toLocaleDateString()}
                  </div>
                  <Button variant="secondary" size="sm" className="w-full text-xs" asChild>
                    <a href={resume.file_url} target="_blank" rel="noreferrer">
                      View Original
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <Separator />

      {/* Tailoring History */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Tailoring History</h2>
            <p className="text-sm text-slate-500">Your AI-optimized applications</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {historyLoading ? (
            <div className="p-10 text-center text-slate-400 animate-pulse">Loading history...</div>
          ) : history?.length === 0 ? (
            <div className="p-20 text-center text-slate-500">
              No tailored resumes yet. Use the extension on LinkedIn to create your first one!
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role & Company</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">ATS Match</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{item.job_title}</div>
                      <div className="text-xs text-slate-500">{item.company}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={item.ats_score > 70 ? 'success' : 'secondary'}>
                        {item.ats_score}%
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to="/tailored/$id" 
                        params={{ id: item.id }}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        View Diff <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

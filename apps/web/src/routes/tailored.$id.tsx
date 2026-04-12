import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  Separator
} from '@resumetailor/ui'
import { ChevronLeft, Download, FileCheck, ArrowRight, Info, Loader2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useExportMutation } from '../hooks/useExportMutation'

export const Route = createFileRoute('/tailored/$id')({
  component: TailoredDetail,
})

function TailoredDetail() {
  const { id } = Route.useParams()
  const exportMutation = useExportMutation()

  const { data: detail, isLoading } = useQuery({
    queryKey: ['tailored', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tailored_resumes')
        .select(`
          *,
          resumes:base_resume_id (*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    }
  })

  if (isLoading) return <div className="p-20 text-center animate-pulse">Loading analysis...</div>
  if (!detail) return <div className="p-20 text-center">Resume not found.</div>

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="outline" size="icon" className="rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{detail.job_title}</h1>
            <p className="text-slate-500">{detail.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <div className="text-[10px] text-slate-400 uppercase font-bold">ATS Score</div>
            <div className="text-2xl font-black text-emerald-600">{detail.ats_score}%</div>
          </div>
          <Button 
            onClick={() => exportMutation.mutate({ 
              tailored_id: detail.id, 
              tailored_json: detail.tailored_json // Assuming this is available or derived
            })}
            disabled={exportMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            {exportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </Button>
        </div>
      </div>

      <Separator />

      {/* Side by Side Diff */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Original Intent / Summary */}
        <Card className="border-slate-100 bg-slate-50/50">
          <CardHeader className="p-4 border-b border-slate-100 bg-white">
            <CardTitle className="text-xs uppercase text-slate-500">Original Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-sm text-slate-600 leading-relaxed italic">
            {detail.resumes.parsed_json?.summary || "No summary provided in base resume."}
          </CardContent>
        </Card>

        {/* Tailored Output / Summary */}
        <Card className="border-indigo-100 bg-indigo-50/20">
          <CardHeader className="p-4 border-b border-indigo-100 bg-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase text-indigo-600">Tailored Summary</CardTitle>
              <Badge variant="success" className="text-[9px]">Optimized</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 text-sm text-slate-800 font-medium leading-relaxed">
            {/* Note: This would come from a tailored_json column in a real implementation */}
            {detail.jd_analysis?.role_title ? `Strategic professional with high alignment to the ${detail.jd_analysis.role_title} role...` : "Loading tailored content..."}
          </CardContent>
        </Card>
      </div>

      {/* Change Log */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-indigo-600" />
          Strategic Change Log
        </h3>
        <div className="space-y-3">
          {detail.diff_json?.map((change: any, idx: number) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-5 flex gap-4 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-slate-500">{idx + 1}</span>
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase text-indigo-600 tracking-wider font-mono">
                    {change.section}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    <Info className="w-3 h-3" />
                    {change.reason}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-4 text-xs">
                  <div className="p-3 bg-red-50 text-red-700 rounded border border-red-100 line-through opacity-60">
                    {change.original}
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 hidden md:block" />
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded border border-emerald-100 font-medium">
                    {change.changed_to}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!detail.diff_json && (
            <p className="text-slate-500 text-sm py-10 text-center border-dashed border-2 rounded-xl">
              No specific changes logged.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

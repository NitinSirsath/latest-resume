import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/auth'
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription,
  CardFooter,
  Badge,
} from '@resumetailor/ui'
import { Check, Loader2, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/_protected/billing')({
  component: BillingPage,
})

function BillingPage() {
  const { user } = useAuthStore()
  const searchParams = Route.useSearch() as { success?: string; cancelled?: string }
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  useEffect(() => {
    if (searchParams.success) {
      setToastMsg({ type: 'success', message: 'Payment successful! Your credits have been updated.' })
    } else if (searchParams.cancelled) {
      setToastMsg({ type: 'error', message: 'Checkout cancelled. No worries, you can upgrade anytime.' })
    }
  }, [searchParams])

  const { data: creditsData, isLoading: creditsLoading } = useQuery({
    queryKey: ['usage_credits', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usage_credits')
        .select('*')
        .eq('user_id', user!.id)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data || { credits_remaining: 0, plan: 'free' }
    },
    enabled: !!user
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['billing_history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tailored_resumes')
        .select('id, created_at, job_title, company')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      return data
    },
    enabled: !!user
  })

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`
        },
        body: JSON.stringify({ price_id: priceId, user_id: user!.id })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create checkout')
      
      return result.data.checkout_url
    },
    onSuccess: (url) => {
      window.location.href = url
    },
    onError: (err) => {
      setToastMsg({ type: 'error', message: (err as Error).message })
    }
  })

  const handleCheckout = (priceId: string) => {
    checkoutMutation.mutate(priceId)
  }

  // Use test prices - replace with real prices in production
  const PRICE_PRO_MONTHLY = import.meta.env.VITE_STRIPE_PRICE_PRO || 'price_12345'
  const PRICE_PAY_AS_YOU_GO = import.meta.env.VITE_STRIPE_PRICE_PAYG || 'price_67890'

  if (creditsLoading || historyLoading) return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>

  const isPro = creditsData?.plan === 'pro'
  const maxCredits = isPro ? 50 : 3
  const creditsPercentage = Math.min(100, Math.max(0, ((creditsData?.credits_remaining || 0) / maxCredits) * 100))

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {toastMsg && (
        <div className={`p-4 rounded-lg flex items-center justify-between ${toastMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          <p className="font-medium text-sm">{toastMsg.message}</p>
          <Button variant="ghost" size="sm" onClick={() => setToastMsg(null)}>Dismiss</Button>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Billing & Usage</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your subscription, credits, and view usage history.</p>
      </div>

      {/* Usage Overview */}
      <Card className="border-indigo-100 bg-indigo-50/20 dark:border-indigo-900/30 dark:bg-indigo-950/20">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1 w-full">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold dark:text-slate-50">Current Plan</h2>
              <Badge variant={isPro ? "success" : "secondary"} className="uppercase text-[10px] font-bold">
                {isPro ? "Pro" : "Free"}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
              {isPro 
                ? "You're on the Pro plan with premium features enabled." 
                : "You're on the free tier. Upgrade for more credits and features."}
            </p>
          </div>

          <div className="flex-1 w-full max-w-sm">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Credits Remaining</p>
                <p className="text-3xl font-black text-slate-900 dark:text-slate-50">
                  {creditsData?.credits_remaining || 0}
                </p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">out of {maxCredits}</p>
            </div>
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${creditsPercentage < 20 ? 'bg-red-500' : 'bg-indigo-500'}`}
                style={{ width: `${creditsPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className={!isPro ? "border-slate-300 shadow-md" : ""}>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>To try things out</CardDescription>
            <div className="mt-4 text-3xl font-bold">$0<span className="text-sm text-slate-500 font-normal">/mo</span></div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 3 Tailor Credits</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Basic DOCX Export</div>
            <div className="flex items-center gap-2 text-slate-400"><Check className="w-4 h-4 opacity-30" /> No Cover Letters</div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline" disabled>Current Plan</Button>
          </CardFooter>
        </Card>

        <Card className="border-indigo-500 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] uppercase font-bold py-1 px-3 rounded-bl-lg">
            Recommended
          </div>
          <CardHeader>
            <CardTitle className="text-indigo-600 dark:text-indigo-400">Pro Monthly</CardTitle>
            <CardDescription>For serious job seekers</CardDescription>
            <div className="mt-4 text-3xl font-bold text-indigo-950 dark:text-indigo-50">$15<span className="text-sm text-slate-500 font-normal">/mo</span></div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300 font-medium">
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-500" /> 50 Tailor Credits / mo</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-500" /> High-Fidelity DOCX & PDF</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-500" /> 1-Click Cover Letters</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-500" /> Priority Support</div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2" 
              onClick={() => handleCheckout(PRICE_PRO_MONTHLY)}
              disabled={checkoutMutation.isPending || isPro}
            >
              {checkoutMutation.isPending && checkoutMutation.variables === PRICE_PRO_MONTHLY ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {isPro ? "Active Plan" : "Upgrade to Pro"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pay As You Go</CardTitle>
            <CardDescription>Top up when you need</CardDescription>
            <div className="mt-4 text-3xl font-bold">$5<span className="text-sm text-slate-500 font-normal">/10 cr</span></div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 10 Tailor Credits</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> No Expiration</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Pro Features Unlocked</div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handleCheckout(PRICE_PAY_AS_YOU_GO)}
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending && checkoutMutation.variables === PRICE_PAY_AS_YOU_GO ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Buy 10 Credits
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Usage History */}
      <section className="space-y-4 pt-8">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Recent Usage</h3>
        {historyData && historyData.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {historyData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">Tailored Resume for {item.job_title} at {item.company}</td>
                    <td className="px-6 py-4 text-right text-red-600 dark:text-red-400 font-medium">-1 Credit</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-sm py-10 text-center border-dashed border-2 rounded-xl">
            No recent usage history. Start tailoring to see it here.
          </p>
        )}
      </section>
    </div>
  )
}

import { createRootRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../store/auth'
import { Button, ThemeProvider, ThemeToggle } from '@resumetailor/ui'
import { Sparkles, User, LogOut } from 'lucide-react'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const Route = createRootRoute({
  component: RootContent,
})

function RootContent() {
  const { session, setSession, signOut } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) setSession(s)
    })

    // 2. Manual Hash Recovery (for cases where redirect fragment isn't caught)
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      supabase.auth.onAuthStateChange((_event, s) => {
        if (s) setSession(s)
      })
    }

    // 3. Global Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => subscription.unsubscribe()
  }, [setSession])

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/login' })
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="resumetailor-theme">
      <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-border bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex h-12 items-center justify-between px-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg tracking-tight">ResumeTailor</span>
            </Link>

            <nav className="flex items-center gap-5">
              {session ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className="text-xs font-medium text-muted hover:text-primary transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/tracker" 
                    className="text-xs font-medium text-muted hover:text-primary transition-colors"
                  >
                    Tracker
                  </Link>
                  <Link 
                    to="/settings" 
                    className="text-xs font-medium text-muted hover:text-primary transition-colors"
                  >
                    Settings
                  </Link>
                  <div className="h-3 w-[1px] bg-border" />
                  <div className="flex items-center gap-2 text-muted">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-surface flex items-center justify-center border border-border">
                      <User className="w-3 h-3 text-slate-500" />
                    </div>
                    <span className="text-[10px] font-medium truncate max-w-[100px] hidden sm:inline">
                      {session.user.email}
                    </span>
                  </div>
                  <ThemeToggle />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSignOut}
                    className="h-7 gap-1.5 text-muted hover:text-red-500 dark:hover:text-red-400 text-[10px]"
                  >
                    <LogOut className="w-3 h-3" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  <Link to="/login">
                    <Button size="sm" className="h-7 text-[10px]">
                      Sign In
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8 px-6">
          <Outlet />
        </main>
      </div>
    </ThemeProvider>
  )
}

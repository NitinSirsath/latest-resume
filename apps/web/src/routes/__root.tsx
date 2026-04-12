import { createRootRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../store/auth'
import { Button } from '@resumetailor/ui'
import { Sparkles, User, LogOut } from 'lucide-react'

export const Route = createRootRoute({
  component: RootContent,
})

function RootContent() {
  const { session, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 py-3 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">ResumeTailor</span>
          </Link>

          <nav className="flex items-center gap-6">
            {session ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  Dashboard
                </Link>
                <div className="h-4 w-[1px] bg-slate-200" />
                <div className="flex items-center gap-2 text-slate-700">
                  <User className="w-4 h-4" />
                  <span className="text-xs font-medium truncate max-w-[150px]">
                    {session.user.email}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="gap-2 text-slate-600 border-slate-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-6">
        <Outlet />
      </main>
    </div>
  )
}

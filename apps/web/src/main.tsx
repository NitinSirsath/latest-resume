import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

import { routeTree } from './routeTree.gen'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/auth'

const queryClient = new QueryClient()
const router = createRouter({ 
  routeTree,
  context: {
    queryClient,
  }
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Global auth listener
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session)
})

// Initial session check
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)

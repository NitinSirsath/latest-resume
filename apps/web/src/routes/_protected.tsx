import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { useAuthStore } from '../store/auth'

export const Route = createFileRoute('/_protected')({
  beforeLoad: () => {
    const session = useAuthStore.getState().session
    if (!session) {
      throw redirect({ to: '/login' })
    }
  },
  component: ProtectedLayout,
})

function ProtectedLayout() {
  return <Outlet />
}

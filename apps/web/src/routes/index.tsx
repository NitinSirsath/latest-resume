import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="p-2">
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Welcome to Web Dashboard</h3>
    </div>
  )
}

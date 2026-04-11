import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="p-2 flex gap-2">
        <h1 className="text-xl font-bold">ResumeTailor Web</h1>
      </div>
      <hr />
      <Outlet />
    </>
  ),
})

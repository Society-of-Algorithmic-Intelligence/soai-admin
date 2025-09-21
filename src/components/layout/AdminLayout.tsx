import { NavLink, Outlet } from 'react-router-dom'
import { Separator } from '../../components/ui/separator'

export default function AdminLayout() {
  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr]">
      <aside className="border-r bg-white">
        <div className="h-14 flex items-center px-4 font-semibold">SOAI Admin</div>
        <Separator />
        <nav className="px-2 py-3 text-sm">
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) => `block rounded px-3 py-2 ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Home
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/members"
                className={({ isActive }) => `block rounded px-3 py-2 ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Members
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/news"
                className={({ isActive }) => `block rounded px-3 py-2 ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                News
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/events"
                className={({ isActive }) => `block rounded px-3 py-2 ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Events
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="min-h-screen bg-gray-50">
        <div className="h-14 border-b bg-white flex items-center px-6 text-sm text-muted-foreground">Administration</div>
        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </div>
  )
}



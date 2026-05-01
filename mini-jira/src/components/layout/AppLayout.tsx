import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import CreateTicketDialog from '@/components/ticket/CreateTicketDialog'

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-surface">
          <Outlet />
        </main>
      </div>
      <CreateTicketDialog />
    </div>
  )
}
